// Armazenamento de segredos na web (onde não existe expo-secure-store).
// Cifra com AES-GCM; a chave é uma CryptoKey NÃO extraível guardada no IndexedDB:
// quem copiar o localStorage não consegue decifrar fora deste navegador.
// Não protege de XSS (o script ainda pode usar a chave). Sem WebCrypto/IndexedDB o segredo
// fica só em memória — nunca cai para texto puro (AD-6).
//
// Lógica sem react-native: as dependências são injetadas, então roda no vitest.

export interface SecretStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface KeyVault {
  load(): Promise<CryptoKey | null>;
  save(key: CryptoKey): Promise<void>;
}

export interface WebSecretStoreDeps {
  vault: KeyVault;
  storage: SecretStorage;
  /** Lazy: em React Native `globalThis.crypto` não existe e o módulo é importado mesmo assim. */
  getCrypto: () => Pick<Crypto, "subtle" | "getRandomValues"> | undefined;
}

export interface WebSecretStore {
  get(key: string): Promise<string | null>;
  /** true se o segredo foi persistido cifrado; false se ficou só em memória. */
  set(key: string, value: string): Promise<boolean>;
  remove(key: string): Promise<void>;
}

const PREFIX = "v1:";
const IV_BYTES = 12;

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function createWebSecretStore(deps: WebSecretStoreDeps): WebSecretStore {
  const memory = new Map<string, string>();
  let keyPromise: Promise<CryptoKey | null> | null = null;

  const getKey = (): Promise<CryptoKey | null> => {
    keyPromise ??= (async () => {
      try {
        const subtle = deps.getCrypto()?.subtle;
        if (!subtle) return null;
        const existing = await deps.vault.load();
        if (existing) return existing;
        const key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
          "encrypt",
          "decrypt",
        ]);
        // Se não der para guardar a chave, o texto cifrado ficaria ilegível depois: não use.
        await deps.vault.save(key);
        return key;
      } catch {
        return null;
      }
    })();
    return keyPromise;
  };

  async function encrypt(key: CryptoKey, plain: string): Promise<string> {
    const c = deps.getCrypto()!;
    const iv = c.getRandomValues(new Uint8Array(IV_BYTES));
    const data = new TextEncoder().encode(plain);
    const cipher = new Uint8Array(await c.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
    const out = new Uint8Array(IV_BYTES + cipher.length);
    out.set(iv, 0);
    out.set(cipher, IV_BYTES);
    return PREFIX + toBase64(out);
  }

  async function decrypt(key: CryptoKey, stored: string): Promise<string | null> {
    try {
      const raw = fromBase64(stored.slice(PREFIX.length));
      const iv = raw.slice(0, IV_BYTES);
      const cipher = raw.slice(IV_BYTES);
      const plain = await deps.getCrypto()!.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
      return new TextDecoder().decode(plain);
    } catch {
      return null;
    }
  }

  async function set(key: string, value: string): Promise<boolean> {
    memory.set(key, value);
    const cryptoKey = await getKey();
    if (!cryptoKey) {
      // Não deixa texto puro no disco (inclui valor legado).
      await deps.storage.removeItem(key);
      return false;
    }
    await deps.storage.setItem(key, await encrypt(cryptoKey, value));
    return true;
  }

  async function get(key: string): Promise<string | null> {
    const cached = memory.get(key);
    if (cached !== undefined) return cached;

    const stored = await deps.storage.getItem(key);
    if (stored === null) return null;

    if (!stored.startsWith(PREFIX)) {
      // Valor legado em texto puro: migra para a forma cifrada.
      await set(key, stored);
      return stored;
    }

    const cryptoKey = await getKey();
    if (!cryptoKey) return null;
    const plain = await decrypt(cryptoKey, stored);
    if (plain !== null) memory.set(key, plain);
    return plain;
  }

  async function remove(key: string): Promise<void> {
    memory.delete(key);
    await deps.storage.removeItem(key);
  }

  return { get, set, remove };
}
