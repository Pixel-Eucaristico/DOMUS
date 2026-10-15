import { describe, it, expect, beforeEach } from "vitest";
import {
  createWebSecretStore,
  type KeyVault,
  type SecretStorage,
} from "../infrastructure/webSecretStore";

// Node tem WebCrypto real (globalThis.crypto); o cofre da chave e o storage são em memória.

function memoryStorage(): SecretStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      data.set(k, v);
    },
    removeItem: async (k) => {
      data.delete(k);
    },
  };
}

function memoryVault(): KeyVault & { key: CryptoKey | null } {
  const vault = {
    key: null as CryptoKey | null,
    load: async () => vault.key,
    save: async (k: CryptoKey) => {
      vault.key = k;
    },
  };
  return vault;
}

let storage: ReturnType<typeof memoryStorage>;
let vault: ReturnType<typeof memoryVault>;

const make = (overrides: Partial<Parameters<typeof createWebSecretStore>[0]> = {}) =>
  createWebSecretStore({ vault, storage, getCrypto: () => globalThis.crypto, ...overrides });

beforeEach(() => {
  storage = memoryStorage();
  vault = memoryVault();
});

describe("webSecretStore", () => {
  it("grava cifrado: o storage não contém o texto puro", async () => {
    const store = make();
    expect(await store.set("k", "ABC234")).toBe(true);

    const raw = storage.data.get("k")!;
    expect(raw.startsWith("v1:")).toBe(true);
    expect(raw).not.toContain("ABC234");
  });

  it("devolve o valor após reiniciar (nova instância, mesma chave)", async () => {
    await make().set("k", "ABC234");
    expect(await make().get("k")).toBe("ABC234");
  });

  it("usa IV novo a cada gravação", async () => {
    const store = make();
    await store.set("a", "mesmo");
    await store.set("b", "mesmo");
    expect(storage.data.get("a")).not.toBe(storage.data.get("b"));
  });

  it("a chave gerada não é extraível", async () => {
    await make().set("k", "x");
    expect(vault.key?.extractable).toBe(false);
  });

  it("migra valor legado em texto puro para a forma cifrada", async () => {
    storage.data.set("k", "LEG234");
    expect(await make().get("k")).toBe("LEG234");
    expect(storage.data.get("k")!.startsWith("v1:")).toBe(true);
    expect(storage.data.get("k")).not.toContain("LEG234");
  });

  it("devolve null para texto cifrado adulterado", async () => {
    const store = make();
    await store.set("k", "ABC234");
    const raw = storage.data.get("k")!;
    storage.data.set("k", raw.slice(0, -4) + "AAAA");
    expect(await make().get("k")).toBeNull();
  });

  it("devolve null se a chave do cofre mudou", async () => {
    await make().set("k", "ABC234");
    vault.key = null; // cofre limpo: outra chave será gerada
    expect(await make().get("k")).toBeNull();
  });

  it("remove apaga de memória e do storage", async () => {
    const store = make();
    await store.set("k", "ABC234");
    await store.remove("k");
    expect(await store.get("k")).toBeNull();
    expect(storage.data.has("k")).toBe(false);
  });
});

describe("webSecretStore sem WebCrypto ou cofre", () => {
  it("sem WebCrypto: não persiste texto puro e mantém em memória", async () => {
    const store = make({ getCrypto: () => undefined });
    expect(await store.set("k", "ABC234")).toBe(false);
    expect(storage.data.has("k")).toBe(false);
    expect(await store.get("k")).toBe("ABC234");
  });

  it("sem WebCrypto: apaga o legado em texto puro do storage", async () => {
    storage.data.set("k", "LEG234");
    const store = make({ getCrypto: () => undefined });
    expect(await store.get("k")).toBe("LEG234");
    expect(storage.data.has("k")).toBe(false);
  });

  it("cofre que falha ao salvar a chave: não persiste nada", async () => {
    const failing: KeyVault = {
      load: async () => null,
      save: async () => {
        throw new Error("IndexedDB indisponível");
      },
    };
    const store = make({ vault: failing });
    expect(await store.set("k", "ABC234")).toBe(false);
    expect(storage.data.has("k")).toBe(false);
  });
});
