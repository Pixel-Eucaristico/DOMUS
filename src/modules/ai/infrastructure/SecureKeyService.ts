import * as ExpoCrypto from "expo-crypto";
import { gcm } from "@noble/ciphers/aes";
import { pbkdf2 } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha2";
import { SecureStorageService } from "@/src/modules/security/infrastructure/SecureStorageService";
import type { AIProvider } from "@packages/ai";
import { AI_KEY_PREFIX } from "../domain/AISettings";

// ─── Encryption Constants ─────────────────────────────────────────────────────

const DEVICE_SECRET = "domus_ai_device_secret_v1";
const APP_SALT = new TextEncoder().encode("domus_ai_pbkdf2_salt_v1");
const PBKDF2_ITERATIONS = 10_000;
const KEY_LENGTH = 32; // 256-bit AES key

interface KeyEnvelope {
  iv: string;
  ciphertext: string;
}

// ─── SecureKeyService ─────────────────────────────────────────────────────────

export class SecureKeyService {
  /**
   * Encrypts `apiKey` with AES-256-GCM and stores it in expo-secure-store.
   * Never logs the key.
   */
  static async storeKey(provider: AIProvider, apiKey: string): Promise<void> {
    const deviceKey = await SecureKeyService.deriveDeviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const cipher = gcm(deviceKey, iv);
    const enc = new TextEncoder();
    const encrypted = cipher.encrypt(enc.encode(apiKey));

    const envelope: KeyEnvelope = {
      iv: SecureKeyService.toBase64(iv),
      ciphertext: SecureKeyService.toBase64(encrypted),
    };

    await SecureStorageService.set(
      `${AI_KEY_PREFIX}${provider}`,
      JSON.stringify(envelope),
    );
  }

  /**
   * Decrypts and returns the API key for the given provider.
   * Returns `null` if no key is stored or decryption fails.
   * Caller must zero out the returned string reference after use.
   */
  static async retrieveKey(provider: AIProvider): Promise<string | null> {
    try {
      const raw = await SecureStorageService.get(`${AI_KEY_PREFIX}${provider}`);
      if (!raw) return null;

      const envelope = JSON.parse(raw) as KeyEnvelope;
      const deviceKey = await SecureKeyService.deriveDeviceKey();
      const iv = SecureKeyService.fromBase64(envelope.iv);
      const ciphertext = SecureKeyService.fromBase64(envelope.ciphertext);

      const cipher = gcm(deviceKey, iv);
      const decrypted = cipher.decrypt(ciphertext);
      return new TextDecoder().decode(decrypted);
    } catch {
      return null;
    }
  }

  static async deleteKey(provider: AIProvider): Promise<void> {
    await SecureStorageService.delete(`${AI_KEY_PREFIX}${provider}`);
  }

  static async hasKey(provider: AIProvider): Promise<boolean> {
    const raw = await SecureStorageService.get(`${AI_KEY_PREFIX}${provider}`);
    return raw !== null;
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  /**
   * Derives a deterministic device-bound 32-byte AES key.
   * Uses a SHA-256 hash of a stable device secret as the PBKDF2 password.
   */
  private static async deriveDeviceKey(): Promise<Uint8Array> {
    const deviceHash = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      DEVICE_SECRET,
    );
    const enc = new TextEncoder();
    return pbkdf2(sha256, enc.encode(deviceHash), APP_SALT, {
      c: PBKDF2_ITERATIONS,
      dkLen: KEY_LENGTH,
    });
  }

  private static toBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }

  private static fromBase64(b64: string): Uint8Array {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
