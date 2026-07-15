import { gcm } from "@noble/ciphers/aes.js";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import type { EncryptedBackup } from "../domain/BackupMetadata";
import { PBKDF2_ITERATIONS } from "../domain/BackupMetadata";

// ─── base64 helpers (sem btoa/atob spread que estoura stack em arrays grandes) ─

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── public service ──────────────────────────────────────────────────────────

export const BackupCryptoService = {
  /**
   * Criptografa `plaintext` com AES-256-GCM.
   * Chave derivada via PBKDF2-SHA256 (100 k iterações) de `password` + salt aleatório.
   * Retorna envelope com salt, IV, ciphertext e authTag separados (todos em base64).
   *
   * Usa @noble/ciphers + @noble/hashes (pure-JS, sem depender de crypto.subtle).
   */
  async encrypt(plaintext: string, password: string): Promise<EncryptedBackup> {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recomendado para AES-GCM

    const enc = new TextEncoder();
    // pbkdf2Async divide o trabalho em microtasks para não bloquear a UI
    const key = await pbkdf2Async(sha256, enc.encode(password), salt, {
      c: PBKDF2_ITERATIONS,
      dkLen: 32,
    });

    // gcm.encrypt retorna ciphertext + 16-byte auth tag no final
    const cipher = gcm(key, iv);
    const full = cipher.encrypt(enc.encode(plaintext));

    const ciphertext = full.slice(0, -16);
    const authTag = full.slice(-16);

    return {
      salt: toBase64(salt),
      iv: toBase64(iv),
      ciphertext: toBase64(ciphertext),
      authTag: toBase64(authTag),
    };
  },

  /**
   * Decripta um envelope `EncryptedBackup` usando `password`.
   * Lança erro nativo se a senha estiver errada (authTag inválida → gcm.decrypt falha).
   */
  async decrypt(encrypted: EncryptedBackup, password: string): Promise<string> {
    const salt = fromBase64(encrypted.salt);
    const iv = fromBase64(encrypted.iv);
    const ciphertext = fromBase64(encrypted.ciphertext);
    const authTag = fromBase64(encrypted.authTag);

    const enc = new TextEncoder();
    const key = await pbkdf2Async(sha256, enc.encode(password), salt, {
      c: PBKDF2_ITERATIONS,
      dkLen: 32,
    });

    // Reconstrói buffer completo: ciphertext + authTag
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext);
    combined.set(authTag, ciphertext.length);

    const cipher = gcm(key, iv);
    const plaintext = cipher.decrypt(combined);
    return new TextDecoder().decode(plaintext);
  },
};
