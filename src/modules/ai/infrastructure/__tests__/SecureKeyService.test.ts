import { describe, it, expect, vi, beforeEach } from "vitest";
import { SecureKeyService } from "../SecureKeyService";

// ─── Mock expo-crypto ─────────────────────────────────────────────────────────
// Native module — replaced with a deterministic pure-JS stub.

vi.mock("expo-crypto", () => ({
  digestStringAsync: async (_alg: string, input: string): Promise<string> => {
    // djb2 hash → 64-char hex string (deterministic, repeatable)
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(64, "0");
  },
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
}));

// ─── Mock SecureStorageService (in-memory) ────────────────────────────────────

const memStore = new Map<string, string>();

vi.mock("@/src/modules/security/infrastructure/SecureStorageService", () => ({
  SecureStorageService: {
    set: vi.fn(async (key: string, value: string) => { memStore.set(key, value); }),
    get: vi.fn(async (key: string) => memStore.get(key) ?? null),
    delete: vi.fn(async (key: string) => { memStore.delete(key); }),
  },
}));

beforeEach(() => {
  memStore.clear();
  vi.clearAllMocks();
});

// ─── storeKey / retrieveKey round-trip ───────────────────────────────────────

describe("SecureKeyService.storeKey / retrieveKey", () => {
  it("round-trips a short API key", async () => {
    await SecureKeyService.storeKey("openai", "sk-test-abc123");
    const result = await SecureKeyService.retrieveKey("openai");
    expect(result).toBe("sk-test-abc123");
  });

  it("round-trips a long API key (64 chars)", async () => {
    const longKey = "sk-" + "a".repeat(61);
    await SecureKeyService.storeKey("openai", longKey);
    expect(await SecureKeyService.retrieveKey("openai")).toBe(longKey);
  });

  it("stores different keys per provider without collision", async () => {
    await SecureKeyService.storeKey("openai", "openai-key-value");
    await SecureKeyService.storeKey("claude", "anthropic-key-value");
    expect(await SecureKeyService.retrieveKey("openai")).toBe("openai-key-value");
    expect(await SecureKeyService.retrieveKey("claude")).toBe("anthropic-key-value");
  });

  it("overwrites old key when storeKey is called again for same provider", async () => {
    await SecureKeyService.storeKey("openai", "old-key");
    await SecureKeyService.storeKey("openai", "new-key");
    expect(await SecureKeyService.retrieveKey("openai")).toBe("new-key");
  });

  it("returns null when no key has been stored", async () => {
    expect(await SecureKeyService.retrieveKey("openai")).toBeNull();
  });

  it("returns null for a different provider than stored", async () => {
    await SecureKeyService.storeKey("openai", "openai-key");
    expect(await SecureKeyService.retrieveKey("claude")).toBeNull();
  });
});

// ─── hasKey ──────────────────────────────────────────────────────────────────

describe("SecureKeyService.hasKey", () => {
  it("returns false before any key is stored", async () => {
    expect(await SecureKeyService.hasKey("openai")).toBe(false);
  });

  it("returns true after storing a key", async () => {
    await SecureKeyService.storeKey("openai", "sk-test");
    expect(await SecureKeyService.hasKey("openai")).toBe(true);
  });

  it("returns false for a different provider", async () => {
    await SecureKeyService.storeKey("openai", "sk-test");
    expect(await SecureKeyService.hasKey("claude")).toBe(false);
  });
});

// ─── deleteKey ───────────────────────────────────────────────────────────────

describe("SecureKeyService.deleteKey", () => {
  it("removes the key so retrieveKey returns null", async () => {
    await SecureKeyService.storeKey("openai", "sk-test");
    await SecureKeyService.deleteKey("openai");
    expect(await SecureKeyService.retrieveKey("openai")).toBeNull();
  });

  it("sets hasKey to false after deletion", async () => {
    await SecureKeyService.storeKey("openai", "sk-test");
    await SecureKeyService.deleteKey("openai");
    expect(await SecureKeyService.hasKey("openai")).toBe(false);
  });

  it("does not affect a different provider's key", async () => {
    await SecureKeyService.storeKey("openai", "openai-key");
    await SecureKeyService.storeKey("claude", "anthropic-key");
    await SecureKeyService.deleteKey("openai");
    expect(await SecureKeyService.retrieveKey("claude")).toBe("anthropic-key");
  });

  it("does not throw when key does not exist", async () => {
    await expect(SecureKeyService.deleteKey("openai")).resolves.not.toThrow();
  });
});

// ─── Ciphertext integrity ─────────────────────────────────────────────────────

describe("SecureKeyService — ciphertext integrity", () => {
  it("each storeKey call produces a different IV (random per encryption)", async () => {
    await SecureKeyService.storeKey("openai", "sk-same-key");
    const raw1 = memStore.get("domus_ai_key_openai")!;

    memStore.clear();
    await SecureKeyService.storeKey("openai", "sk-same-key");
    const raw2 = memStore.get("domus_ai_key_openai")!;

    expect(JSON.parse(raw1).iv).not.toBe(JSON.parse(raw2).iv);
  });

  it("stored value is a JSON envelope with iv + ciphertext fields", async () => {
    await SecureKeyService.storeKey("openai", "sk-test");
    const raw = memStore.get("domus_ai_key_openai")!;
    const envelope = JSON.parse(raw);
    expect(envelope).toHaveProperty("iv");
    expect(envelope).toHaveProperty("ciphertext");
    expect(typeof envelope.iv).toBe("string");
    expect(typeof envelope.ciphertext).toBe("string");
  });

  it("stored ciphertext is not the plaintext key", async () => {
    const key = "sk-super-secret";
    await SecureKeyService.storeKey("openai", key);
    const raw = memStore.get("domus_ai_key_openai")!;
    expect(raw).not.toContain(key);
  });

  it("returns null gracefully when stored ciphertext is tampered", async () => {
    await SecureKeyService.storeKey("openai", "sk-test");
    const raw = memStore.get("domus_ai_key_openai")!;
    const envelope = JSON.parse(raw);
    // Corrupt the ciphertext
    envelope.ciphertext = btoa("A".repeat(32));
    memStore.set("domus_ai_key_openai", JSON.stringify(envelope));

    const result = await SecureKeyService.retrieveKey("openai");
    // Must return null, not throw (graceful failure)
    expect(result).toBeNull();
  });
});
