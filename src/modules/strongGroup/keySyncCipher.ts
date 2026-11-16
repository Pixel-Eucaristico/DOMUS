// Cifra autenticada das chaves de IA e OCR sincronizadas no Grupo forte (Story 10.4):
// AES-256-GCM do `@noble/ciphers`, nonce aleatório de 96 bits a cada cifragem e
// formato próprio, versionado:
//
//   domus-key-gcm-v1.<base64( nonce(12) ‖ cifra(n) ‖ tag(16) )>
//
// O dado associado (AAD) é `utf8("domus-key-gcm-v1|" + slot + "|" + nostrPublicKey)`:
// vincula o texto cifrado à versão do formato, ao slot da chave e ao grupo.
//
// Módulo puro: sem `react-native` nem `expo`. Nada aqui registra a chave, o
// segredo ou o texto cifrado, e nenhuma mensagem de erro repete entradas.

import { gcm } from "@noble/ciphers/aes.js";
import { bytesToUtf8, concatBytes, utf8ToBytes } from "@noble/ciphers/utils.js";
import { randomBytes } from "@noble/hashes/utils.js";
import { decodeBase64, encodeBase64 } from "./base64";
import { deriveKeySyncKey, deriveStrongGroupKeys } from "./groupSecret";

export const KEY_SYNC_EVENT_TYPE = "KEY_SYNC_UPDATED" as const;

export const SYNCED_KEY_SLOTS = [
  "ai:openai",
  "ai:gemini",
  "ai:claude",
  "ai:deepseek",
  "ai:qwen",
  "ai:elevenlabs",
  "ocr:cloud_vision",
] as const;

export type SyncedKeySlot = (typeof SYNCED_KEY_SLOTS)[number];

export interface KeySyncPayload {
  slot: SyncedKeySlot;
  ciphertext: string;
  schemaVersion: 1;
}

export const KEY_SYNC_CIPHER_MARKER = "domus-key-gcm-v1";
export const KEY_SYNC_NONCE_BYTES = 12;
export const KEY_SYNC_TAG_BYTES = 16;

const CONTENT_PREFIX = `${KEY_SYNC_CIPHER_MARKER}.`;
const AAD_SEPARATOR = "|";
const MIN_PACKED_BYTES = KEY_SYNC_NONCE_BYTES + KEY_SYNC_TAG_BYTES;
const MAX_KEY_BYTES = 4096;
const MAX_CIPHERTEXT_CHARS =
  CONTENT_PREFIX.length +
  4 * Math.ceil((KEY_SYNC_NONCE_BYTES + MAX_KEY_BYTES + KEY_SYNC_TAG_BYTES) / 3);

export interface EncryptSyncedKeyParams {
  secret: Uint8Array;
  slot: SyncedKeySlot;
  apiKey: string;
  rng?: (n: number) => Uint8Array;
}

export interface DecryptSyncedKeyParams {
  secret: Uint8Array;
  slot: SyncedKeySlot;
  ciphertext: unknown;
}

export type KeySyncDecryptError =
  | "invalid-input"
  | "unknown-format"
  | "malformed"
  | "auth-failed";

export type KeySyncDecryptResult =
  | { ok: true; apiKey: string }
  | { ok: false; error: KeySyncDecryptError };

export function isSyncedKeySlot(value: unknown): value is SyncedKeySlot {
  return typeof value === "string" && (SYNCED_KEY_SLOTS as readonly string[]).includes(value);
}

function aadFor(slot: SyncedKeySlot, nostrPublicKey: string): Uint8Array {
  return utf8ToBytes(
    `${KEY_SYNC_CIPHER_MARKER}${AAD_SEPARATOR}${slot}${AAD_SEPARATOR}${nostrPublicKey}`,
  );
}

/**
 * Cifra uma chave de IA ou OCR usando chave derivada via HKDF (`domus/strong-group/v1/key-sync`)
 * e AES-256-GCM autenticado com AAD vinculando versão, `slot` e `nostrPublicKey` do grupo.
 */
export function encryptSyncedKey(params: EncryptSyncedKeyParams): string {
  const { secret, slot, apiKey, rng = randomBytes } = params;
  if (!isSyncedKeySlot(slot)) {
    throw new Error("Slot de chave inválido para sincronização.");
  }
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error("Chave vazia não pode ser cifrada para sincronização.");
  }

  const data = utf8ToBytes(apiKey);
  let keySyncKey: Uint8Array | null = null;
  let groupKeys: ReturnType<typeof deriveStrongGroupKeys> | null = null;

  try {
    if (data.length > MAX_KEY_BYTES) {
      throw new Error("Chave excede o limite máximo suportado para sincronização.");
    }

    const generated = rng(KEY_SYNC_NONCE_BYTES);
    if (!(generated instanceof Uint8Array) || generated.length !== KEY_SYNC_NONCE_BYTES) {
      throw new Error("O gerador aleatório devolveu um tamanho inesperado.");
    }

    const nonce = Uint8Array.from(generated);
    keySyncKey = deriveKeySyncKey(secret);
    groupKeys = deriveStrongGroupKeys(secret);

    const sealed = gcm(keySyncKey, nonce, aadFor(slot, groupKeys.nostrPublicKey)).encrypt(data);
    return CONTENT_PREFIX + encodeBase64(concatBytes(nonce, sealed));
  } finally {
    data.fill(0);
    keySyncKey?.fill(0);
    groupKeys?.nostrPrivateKey.fill(0);
    groupKeys?.encryptionKey.fill(0);
  }
}

/**
 * Decifra o `ciphertext` de um evento `KEY_SYNC_UPDATED`.
 * Nunca lança exceção para entradas externas/adulteradas.
 */
export function decryptSyncedKey(params: DecryptSyncedKeyParams): KeySyncDecryptResult {
  const { secret, slot, ciphertext } = params;
  if (!isSyncedKeySlot(slot) || !(secret instanceof Uint8Array)) {
    return { ok: false, error: "invalid-input" };
  }
  if (typeof ciphertext !== "string" || ciphertext.length === 0) {
    return { ok: false, error: "unknown-format" };
  }
  if (!ciphertext.startsWith(CONTENT_PREFIX)) {
    return { ok: false, error: "unknown-format" };
  }
  if (ciphertext.length > MAX_CIPHERTEXT_CHARS) {
    return { ok: false, error: "malformed" };
  }

  const packed = decodeBase64(ciphertext.slice(CONTENT_PREFIX.length));
  if (!packed || packed.length < MIN_PACKED_BYTES) {
    return { ok: false, error: "malformed" };
  }

  let keySyncKey: Uint8Array | null = null;
  let groupKeys: ReturnType<typeof deriveStrongGroupKeys> | null = null;
  try {
    keySyncKey = deriveKeySyncKey(secret);
    groupKeys = deriveStrongGroupKeys(secret);
  } catch {
    keySyncKey?.fill(0);
    groupKeys?.nostrPrivateKey.fill(0);
    groupKeys?.encryptionKey.fill(0);
    return { ok: false, error: "invalid-input" };
  }

  const nonce = packed.subarray(0, KEY_SYNC_NONCE_BYTES);
  const sealed = packed.subarray(KEY_SYNC_NONCE_BYTES);
  let data: Uint8Array;
  try {
    data = gcm(keySyncKey, nonce, aadFor(slot, groupKeys.nostrPublicKey)).decrypt(sealed);
  } catch {
    return { ok: false, error: "auth-failed" };
  } finally {
    keySyncKey.fill(0);
    groupKeys.nostrPrivateKey.fill(0);
    groupKeys.encryptionKey.fill(0);
  }

  try {
    const apiKey =
      typeof TextDecoder !== "undefined"
        ? new TextDecoder("utf-8", { fatal: true }).decode(data)
        : bytesToUtf8(data);
    if (apiKey.trim().length === 0) {
      return { ok: false, error: "malformed" };
    }
    return { ok: true, apiKey };
  } catch {
    return { ok: false, error: "malformed" };
  } finally {
    data.fill(0);
  }
}
