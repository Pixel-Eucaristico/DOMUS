// Cifra autenticada dos lotes do Grupo forte (Story 4.2): AES-256-GCM do
// `@noble/ciphers` (o Hermes não tem `crypto.subtle`), nonce aleatório de 96
// bits a cada cifragem e formato próprio, versionado:
//
//   domus-gcm-v1.<base64( nonce(12) ‖ cifra(n) ‖ tag(16) )>
//
// O dado associado (AAD) é `utf8("domus-gcm-v1|" + nostrPublicKey)`: liga o
// texto cifrado ao formato e ao grupo, para um lote não ser movido de um grupo
// para outro.
//
// Módulo puro: sem `react-native` nem `expo`. Nada aqui registra o texto
// claro, o texto cifrado, a chave ou o nonce, e nenhuma mensagem de erro ou
// motivo de recusa repete a entrada nem a mensagem da biblioteca.
//
// Limites conhecidos (ver a spec da 4.2):
// - Repetição: o GCM autentica, mas não impede reentregar um texto cifrado
//   antigo e válido; quem protege é a importação idempotente por `id` (AD-2),
//   e a volta de evento apagado por reset é do marcador de reset (FR-10).
// - Não é "key-committing": um texto cifrado pode ser montado para decifrar
//   sob duas chaves escolhidas pelo atacante; no DOMUS a chave é secreta e o
//   AAD inclui a chave pública do grupo.
// - Metadados do evento Nostr (tamanho, tags, `created_at`) ficam em claro.

import { gcm } from "@noble/ciphers/aes.js";
import { bytesToUtf8, concatBytes, utf8ToBytes } from "@noble/ciphers/utils.js";
import { randomBytes } from "@noble/hashes/utils.js";
import { decodeBase64, encodeBase64 } from "./base64";
import type { StrongGroupKeys } from "./groupSecret";

/** Marcador e versão do formato; faz parte do AAD. */
export const STRONG_CIPHER_MARKER = "domus-gcm-v1";
export const STRONG_NONCE_BYTES = 12;
export const STRONG_TAG_BYTES = 16;
export const STRONG_KEY_BYTES = 32;
/** D-6: teto do texto claro (UTF-8) por chamada. */
export const STRONG_MAX_PLAINTEXT_BYTES = 32 * 1024;

/** Começo do `content` do formato v1: marcador + separador `.`. */
const CONTENT_PREFIX = `${STRONG_CIPHER_MARKER}.`;
/** Qualquer versão deste formato (`domus-gcm-v1`, `domus-gcm-v2`, …). */
const VERSIONED_PREFIX = "domus-gcm-v";
/** Separador do AAD entre o marcador e a chave pública do grupo. */
const AAD_SEPARATOR = "|";
/** Formato `hex(nonce):hex(cifra)` do `encryptPayload` do Grupo antigo. */
const LEGACY_XOR_PATTERN = /^[0-9a-f]+:[0-9a-f]+$/;
const NOSTR_PUBLIC_KEY_PATTERN = /^[0-9a-f]{64}$/;
const MIN_PACKED_BYTES = STRONG_NONCE_BYTES + STRONG_TAG_BYTES;

/** Teto do conteúdo recebido, conferido antes de decodificar. */
export const STRONG_MAX_CONTENT_CHARS =
  CONTENT_PREFIX.length + 4 * Math.ceil((STRONG_NONCE_BYTES + STRONG_MAX_PLAINTEXT_BYTES + STRONG_TAG_BYTES) / 3);

export type StrongCipherKeys = Pick<StrongGroupKeys, "encryptionKey" | "nostrPublicKey">;

export type StrongDecryptError =
  | "unknown-format"
  | "legacy-xor"
  | "unsupported-version"
  | "too-large"
  | "malformed"
  | "auth-failed";

export type StrongDecryptResult =
  | { ok: true; plaintext: string }
  | { ok: false; reason: StrongDecryptError };

/** Tamanho em bytes UTF-8, para a 4.5 dividir o lote antes de cifrar. */
export function strongPlaintextBytes(plaintext: string): number {
  // Conta sem alocar: 1 byte até U+007F, 2 até U+07FF, 4 para par substituto
  // válido e 3 para o resto (substituto solto vira U+FFFD, 3 bytes, como no
  // `TextEncoder`).
  let total = 0;
  for (let i = 0; i < plaintext.length; i++) {
    const code = plaintext.charCodeAt(i);
    if (code < 0x80) total += 1;
    else if (code < 0x800) total += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < plaintext.length) {
      const next = plaintext.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        total += 4;
        i++;
      } else total += 3;
    } else total += 3;
  }
  return total;
}

function isValidKeys(keys: StrongCipherKeys | null | undefined): boolean {
  return (
    !!keys &&
    keys.encryptionKey instanceof Uint8Array &&
    keys.encryptionKey.length === STRONG_KEY_BYTES &&
    typeof keys.nostrPublicKey === "string" &&
    NOSTR_PUBLIC_KEY_PATTERN.test(keys.nostrPublicKey)
  );
}

function aadFor(nostrPublicKey: string): Uint8Array {
  return utf8ToBytes(STRONG_CIPHER_MARKER + AAD_SEPARATOR + nostrPublicKey);
}

/**
 * Cifra um texto (o JSON de um lote) para o `content` do evento do Grupo
 * forte. O nonce sai de `globalThis.crypto.getRandomValues` (ou do gerador
 * injetado nos testes); sem gerador, lança erro e nunca cai para gerador não
 * criptográfico. Lança também para chave de tamanho errado, chave pública
 * inválida ou texto acima de `STRONG_MAX_PLAINTEXT_BYTES` (D-6): todos erros
 * de programação, nunca dado do relay.
 */
export function encryptStrongPayload(
  plaintext: string,
  keys: StrongCipherKeys,
  rng: (n: number) => Uint8Array = randomBytes,
): string {
  if (typeof plaintext !== "string") throw new Error("O texto a cifrar precisa ser uma string.");
  if (!isValidKeys(keys)) throw new Error("Chaves do Grupo forte inválidas para a cifra.");
  if (strongPlaintextBytes(plaintext) > STRONG_MAX_PLAINTEXT_BYTES) {
    throw new Error("Texto grande demais para um lote cifrado; divida o lote antes de cifrar.");
  }

  const generated = rng(STRONG_NONCE_BYTES);
  if (!(generated instanceof Uint8Array) || generated.length !== STRONG_NONCE_BYTES) {
    throw new Error("O gerador aleatório devolveu um tamanho inesperado.");
  }
  const nonce = Uint8Array.from(generated);
  const data = utf8ToBytes(plaintext);
  try {
    // Uma instância por chamada: o nonce nunca é reaproveitado.
    const sealed = gcm(keys.encryptionKey, nonce, aadFor(keys.nostrPublicKey)).encrypt(data);
    return CONTENT_PREFIX + encodeBase64(concatBytes(nonce, sealed));
  } finally {
    data.fill(0);
  }
}

/**
 * Decifra o `content` de um evento do Grupo forte. Nunca lança para entrada do
 * relay: devolve o texto original ou um motivo fixo de recusa. Tudo ou nada:
 * se a tag não confere, nenhum byte do texto é devolvido. `auth-failed` não
 * distingue chave errada, grupo errado, corte ou adulteração.
 */
export function decryptStrongPayload(content: unknown, keys: StrongCipherKeys): StrongDecryptResult {
  if (typeof content !== "string" || content.length === 0) return { ok: false, reason: "unknown-format" };
  if (!content.startsWith(CONTENT_PREFIX)) {
    if (LEGACY_XOR_PATTERN.test(content)) return { ok: false, reason: "legacy-xor" };
    if (content.startsWith(VERSIONED_PREFIX)) return { ok: false, reason: "unsupported-version" };
    return { ok: false, reason: "unknown-format" };
  }
  if (content.length > STRONG_MAX_CONTENT_CHARS) return { ok: false, reason: "too-large" };

  const packed = decodeBase64(content.slice(CONTENT_PREFIX.length));
  if (!packed || packed.length < MIN_PACKED_BYTES) return { ok: false, reason: "malformed" };
  if (!isValidKeys(keys)) return { ok: false, reason: "auth-failed" };

  const nonce = packed.subarray(0, STRONG_NONCE_BYTES);
  const sealed = packed.subarray(STRONG_NONCE_BYTES);
  let data: Uint8Array;
  try {
    data = gcm(keys.encryptionKey, nonce, aadFor(keys.nostrPublicKey)).decrypt(sealed);
  } catch {
    // Tag errada, chave errada ou outro grupo: motivo fixo, sem a mensagem da biblioteca.
    return { ok: false, reason: "auth-failed" };
  }
  // A tag conferiu: o texto veio de quem tem a chave. Bytes que não são UTF-8
  // (só um cliente defeituoso os cifraria) viram U+FFFD, como no `TextDecoder`.
  const plaintext = bytesToUtf8(data);
  data.fill(0);
  return { ok: true, plaintext };
}
