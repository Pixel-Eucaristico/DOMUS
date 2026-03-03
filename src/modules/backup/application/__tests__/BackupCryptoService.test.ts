import { describe, it, expect } from "vitest";
import { BackupCryptoService } from "../BackupCryptoService";

// ─── BackupCryptoService ──────────────────────────────────────────────────────
// Uses @noble/ciphers (AES-256-GCM) + @noble/hashes (PBKDF2-SHA256) — pure JS,
// no native bridge needed. crypto.getRandomValues is available in Node 15+.

describe("BackupCryptoService.encrypt — envelope structure", () => {
  it("returns all four required fields", async () => {
    const result = await BackupCryptoService.encrypt("payload", "password");
    expect(result).toHaveProperty("salt");
    expect(result).toHaveProperty("iv");
    expect(result).toHaveProperty("ciphertext");
    expect(result).toHaveProperty("authTag");
  });

  it("all fields are non-empty base64 strings", async () => {
    const result = await BackupCryptoService.encrypt("data", "pass");
    const isBase64 = (s: string) => typeof s === "string" && s.length > 0 && /^[A-Za-z0-9+/]+=*$/.test(s);
    expect(isBase64(result.salt)).toBe(true);
    expect(isBase64(result.iv)).toBe(true);
    expect(isBase64(result.ciphertext)).toBe(true);
    expect(isBase64(result.authTag)).toBe(true);
  });

  it("salt is 32 bytes (43–44 base64 chars)", async () => {
    const result = await BackupCryptoService.encrypt("data", "pass");
    // 32 bytes → ceil(32/3)*4 = 44 base64 chars
    const decoded = atob(result.salt);
    expect(decoded.length).toBe(32);
  });

  it("IV is 12 bytes (16 base64 chars)", async () => {
    const result = await BackupCryptoService.encrypt("data", "pass");
    const decoded = atob(result.iv);
    expect(decoded.length).toBe(12);
  });

  it("authTag is 16 bytes (24 base64 chars after padding)", async () => {
    const result = await BackupCryptoService.encrypt("data", "pass");
    const decoded = atob(result.authTag);
    expect(decoded.length).toBe(16);
  });
});

describe("BackupCryptoService.encrypt — randomness", () => {
  it("generates a different salt on each call", async () => {
    const r1 = await BackupCryptoService.encrypt("data", "pass");
    const r2 = await BackupCryptoService.encrypt("data", "pass");
    expect(r1.salt).not.toBe(r2.salt);
  });

  it("generates a different IV on each call", async () => {
    const r1 = await BackupCryptoService.encrypt("data", "pass");
    const r2 = await BackupCryptoService.encrypt("data", "pass");
    expect(r1.iv).not.toBe(r2.iv);
  });

  it("produces different ciphertext with different passwords", async () => {
    const e1 = await BackupCryptoService.encrypt("same plaintext", "pass1");
    const e2 = await BackupCryptoService.encrypt("same plaintext", "pass2");
    expect(e1.ciphertext).not.toBe(e2.ciphertext);
  });
});

describe("BackupCryptoService — encrypt/decrypt round-trip", () => {
  it("decrypts simple string back to original", async () => {
    const plain = "Olá, DOMUS!";
    const enc = await BackupCryptoService.encrypt(plain, "senha123");
    const dec = await BackupCryptoService.decrypt(enc, "senha123");
    expect(dec).toBe(plain);
  });

  it("decrypts JSON payload correctly", async () => {
    const payload = JSON.stringify({
      events: [{ type: "TRANSACTION_CREATED", id: "abc", payload: {} }],
      version: "1.0.0",
      schemaVersion: 1,
    });
    const enc = await BackupCryptoService.encrypt(payload, "backup_pass");
    const dec = await BackupCryptoService.decrypt(enc, "backup_pass");
    expect(dec).toBe(payload);
  });

  it("round-trips an empty string", async () => {
    const enc = await BackupCryptoService.encrypt("", "pass");
    const dec = await BackupCryptoService.decrypt(enc, "pass");
    expect(dec).toBe("");
  });

  it("round-trips a large payload (>10k chars)", async () => {
    const large = "x".repeat(12_000);
    const enc = await BackupCryptoService.encrypt(large, "strong_pass");
    const dec = await BackupCryptoService.decrypt(enc, "strong_pass");
    expect(dec).toBe(large);
  });

  it("round-trips unicode characters", async () => {
    const unicode = "💰📊 Finanças: R$ 1.234,56 — «teste»";
    const enc = await BackupCryptoService.encrypt(unicode, "pass");
    const dec = await BackupCryptoService.decrypt(enc, "pass");
    expect(dec).toBe(unicode);
  });
});

describe("BackupCryptoService.decrypt — authentication failures", () => {
  it("throws on wrong password (AES-GCM auth tag mismatch)", async () => {
    const enc = await BackupCryptoService.encrypt("secret", "correct_password");
    await expect(BackupCryptoService.decrypt(enc, "wrong_password")).rejects.toThrow();
  });

  it("throws on tampered ciphertext", async () => {
    const enc = await BackupCryptoService.encrypt("secret", "password");
    const tampered = { ...enc, ciphertext: btoa("A".repeat(32)) };
    await expect(BackupCryptoService.decrypt(tampered, "password")).rejects.toThrow();
  });

  it("throws on tampered authTag", async () => {
    const enc = await BackupCryptoService.encrypt("secret", "password");
    const tampered = { ...enc, authTag: btoa("\x00".repeat(16)) };
    await expect(BackupCryptoService.decrypt(tampered, "password")).rejects.toThrow();
  });

  it("throws on tampered IV (produces different key stream)", async () => {
    const enc = await BackupCryptoService.encrypt("secret", "password");
    // Flip first byte of IV
    const ivBytes = Uint8Array.from(atob(enc.iv), (c) => c.charCodeAt(0));
    ivBytes[0] ^= 0xff;
    const tamperedIv = btoa(String.fromCharCode(...ivBytes));
    const tampered = { ...enc, iv: tamperedIv };
    await expect(BackupCryptoService.decrypt(tampered, "password")).rejects.toThrow();
  });
});
