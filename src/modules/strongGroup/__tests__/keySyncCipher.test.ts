import { describe, expect, it } from "vitest";
import { gcm } from "@noble/ciphers/aes.js";
import { concatBytes, equalBytes, utf8ToBytes } from "@noble/ciphers/utils.js";
import { encodeBase64 } from "../base64";
import {
  deriveKeySyncKey,
  deriveStrongGroupKeys,
  generateGroupSecret,
  STRONG_GROUP_LABELS,
} from "../groupSecret";
import {
  decryptSyncedKey,
  encryptSyncedKey,
  KEY_SYNC_CIPHER_MARKER,
  SYNCED_KEY_SLOTS,
} from "../keySyncCipher";

describe("keySyncCipher", () => {
  it("deriva chave de sync distinta de encryptionKey e nostrPrivateKey usando rótulo próprio", () => {
    expect(STRONG_GROUP_LABELS.keySyncInfo).toBe("domus/strong-group/v1/key-sync");

    const secret = generateGroupSecret();
    const groupKeys = deriveStrongGroupKeys(secret);
    const keySyncKey = deriveKeySyncKey(secret);
    const keySyncKeyAgain = deriveKeySyncKey(secret);

    expect(keySyncKey).toBeInstanceOf(Uint8Array);
    expect(keySyncKey.length).toBe(32);
    expect(equalBytes(keySyncKey, keySyncKeyAgain)).toBe(true);
    expect(equalBytes(keySyncKey, groupKeys.encryptionKey)).toBe(false);
    expect(equalBytes(keySyncKey, groupKeys.nostrPrivateKey)).toBe(false);

    const otherSecret = generateGroupSecret();
    expect(equalBytes(keySyncKey, deriveKeySyncKey(otherSecret))).toBe(false);
  });

  it("cifra e decifra chaves para todos os slots suportados sem expor texto puro", () => {
    const secret = generateGroupSecret();
    const apiKey = "sk-secret-test-123";

    for (const slot of SYNCED_KEY_SLOTS) {
      const ciphertext = encryptSyncedKey({ secret, slot, apiKey });
      expect(ciphertext.startsWith(`${KEY_SYNC_CIPHER_MARKER}.`)).toBe(true);
      expect(ciphertext).not.toContain(apiKey);
      expect(JSON.stringify({ slot, ciphertext, schemaVersion: 1 })).not.toContain(apiKey);

      const decrypted = decryptSyncedKey({ secret, slot, ciphertext });
      expect(decrypted).toEqual({ ok: true, apiKey });
    }
  });

  it("lança erro ao tentar cifrar chave vazia ou só com espaços", () => {
    const secret = generateGroupSecret();
    expect(() =>
      encryptSyncedKey({ secret, slot: "ai:openai", apiKey: "" }),
    ).toThrow();
    expect(() =>
      encryptSyncedKey({ secret, slot: "ai:openai", apiKey: "   " }),
    ).toThrow();
  });

  it("falha na decifragem sem lançar exceção quando o slot ou o grupo é trocado", () => {
    const secretA = generateGroupSecret();
    const secretB = generateGroupSecret();
    const ciphertext = encryptSyncedKey({
      secret: secretA,
      slot: "ai:openai",
      apiKey: "sk-openai-only",
    });

    expect(
      decryptSyncedKey({
        secret: secretA,
        slot: "ocr:cloud_vision",
        ciphertext,
      }),
    ).toEqual({ ok: false, error: "auth-failed" });

    expect(
      decryptSyncedKey({
        secret: secretB,
        slot: "ai:openai",
        ciphertext,
      }),
    ).toEqual({ ok: false, error: "auth-failed" });
  });

  it("retorna erro estruturado sem lançar exceção para ciphertexts inválidos ou adulterados", () => {
    const secret = generateGroupSecret();
    const ciphertext = encryptSyncedKey({
      secret,
      slot: "ai:gemini",
      apiKey: "AIza-test-key",
    });
    const tampered = ciphertext.slice(0, -4) + "AAAA";

    expect(decryptSyncedKey({ secret, slot: "ai:gemini", ciphertext: tampered })).toEqual({
      ok: false,
      error: "auth-failed",
    });
    expect(decryptSyncedKey({ secret, slot: "ai:gemini", ciphertext: "" })).toEqual({
      ok: false,
      error: "unknown-format",
    });
    expect(decryptSyncedKey({ secret, slot: "ai:gemini", ciphertext: "domus-gcm-v1.abc" })).toEqual({
      ok: false,
      error: "unknown-format",
    });
    expect(decryptSyncedKey({ secret, slot: "ai:gemini", ciphertext: `${KEY_SYNC_CIPHER_MARKER}.!!!` })).toEqual({
      ok: false,
      error: "malformed",
    });
  });

  it("rejeita com malformed quando o plaintext decifrado é UTF-8 inválido ou só espaços", () => {
    const secret = generateGroupSecret();
    const keySyncKey = deriveKeySyncKey(secret);
    const { nostrPublicKey } = deriveStrongGroupKeys(secret);
    const aad = utf8ToBytes(`${KEY_SYNC_CIPHER_MARKER}|ai:openai|${nostrPublicKey}`);

    const nonce1 = new Uint8Array(12).fill(1);
    const invalidUtf8Ciphertext = `${KEY_SYNC_CIPHER_MARKER}.${encodeBase64(
      concatBytes(nonce1, gcm(keySyncKey, nonce1, aad).encrypt(new Uint8Array([0xff, 0xfe]))),
    )}`;
    expect(
      decryptSyncedKey({ secret, slot: "ai:openai", ciphertext: invalidUtf8Ciphertext }),
    ).toEqual({ ok: false, error: "malformed" });

    const nonce2 = new Uint8Array(12).fill(2);
    const whitespaceCiphertext = `${KEY_SYNC_CIPHER_MARKER}.${encodeBase64(
      concatBytes(nonce2, gcm(keySyncKey, nonce2, aad).encrypt(utf8ToBytes("   \t\n "))),
    )}`;
    expect(
      decryptSyncedKey({ secret, slot: "ai:openai", ciphertext: whitespaceCiphertext }),
    ).toEqual({ ok: false, error: "malformed" });
  });
});
