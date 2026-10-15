import { describe, it, expect, vi } from "vitest";
import { PinAuthService } from "../application/PinAuthService";
import { MAX_PIN_ATTEMPTS, LOCKOUT_DURATION_MS } from "../domain/UserSecuritySettings";
import type { UserSecuritySettings } from "../domain/UserSecuritySettings";

// ─── Mock expo-crypto ─────────────────────────────────────────────────────────
// expo-crypto is a native module, so we provide a deterministic mock.

vi.mock("expo-crypto", () => ({
  digestStringAsync: async (
    _algorithm: string,
    input: string,
  ): Promise<string> => {
    // Simple deterministic mock: encode input as hex-like string
    // Real SHA-256 is not available in Vitest without native bridge.
    // We use a repeatable stub so tests remain deterministic.
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    // Return a 64-char hex string (padded)
    return Math.abs(hash).toString(16).padStart(64, "0");
  },
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
}));

// ─── Mock SecurityService (save/load settings) ────────────────────────────────

vi.mock("../application/SecurityService", () => ({
  SecurityService: {
    saveSettings: vi.fn().mockResolvedValue(undefined),
    loadSettings: vi.fn().mockResolvedValue(null),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSettings(overrides: Partial<UserSecuritySettings> = {}): UserSecuritySettings {
  return {
    enabled: true,
    method: "pin",
    pinHash: null,
    pinSalt: null,
    failedAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PinAuthService.generateSalt", () => {
  it("returns a 32-character hex string", () => {
    const salt = PinAuthService.generateSalt();
    expect(salt).toHaveLength(32);
    expect(/^[0-9a-f]+$/.test(salt)).toBe(true);
  });

  it("generates different salts each call", () => {
    const s1 = PinAuthService.generateSalt();
    const s2 = PinAuthService.generateSalt();
    // Extremely unlikely to be equal
    expect(s1).not.toBe(s2);
  });
});

describe("PinAuthService.hashPin", () => {
  it("returns a 64-character hex string", async () => {
    const hash = await PinAuthService.hashPin("123456", "abcdef01234567890abcdef012345678");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("is deterministic for same inputs", async () => {
    const salt = "test_salt_0000000000000000000000";
    const h1 = await PinAuthService.hashPin("123456", salt);
    const h2 = await PinAuthService.hashPin("123456", salt);
    expect(h1).toBe(h2);
  });

  it("produces different hash for different PINs", async () => {
    const salt = "test_salt_0000000000000000000000";
    const h1 = await PinAuthService.hashPin("123456", salt);
    const h2 = await PinAuthService.hashPin("654321", salt);
    expect(h1).not.toBe(h2);
  });

  it("produces different hash for different salts", async () => {
    const h1 = await PinAuthService.hashPin("123456", "salt_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const h2 = await PinAuthService.hashPin("123456", "salt_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(h1).not.toBe(h2);
  });
});

describe("PinAuthService.isLocked", () => {
  it("returns false when lockedUntil is null", () => {
    expect(PinAuthService.isLocked(makeSettings({ lockedUntil: null }))).toBe(false);
  });

  it("returns true when lockedUntil is in the future", () => {
    const future = Date.now() + 30_000;
    expect(PinAuthService.isLocked(makeSettings({ lockedUntil: future }))).toBe(true);
  });

  it("returns false when lockedUntil has passed", () => {
    const past = Date.now() - 1000;
    expect(PinAuthService.isLocked(makeSettings({ lockedUntil: past }))).toBe(false);
  });
});

describe("PinAuthService.verifyPin", () => {
  it("returns success: true for correct PIN", async () => {
    const salt = PinAuthService.generateSalt();
    const pinHash = await PinAuthService.hashPin("123456", salt);
    const settings = makeSettings({ pinHash, pinSalt: salt });

    const result = await PinAuthService.verifyPin("123456", settings);
    expect(result.success).toBe(true);
  });

  it("returns success: false for wrong PIN", async () => {
    const salt = PinAuthService.generateSalt();
    const pinHash = await PinAuthService.hashPin("123456", salt);
    const settings = makeSettings({ pinHash, pinSalt: salt });

    const result = await PinAuthService.verifyPin("000000", settings);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("wrong_pin");
    }
  });

  it("returns remainingAttempts correctly after wrong PIN", async () => {
    const salt = PinAuthService.generateSalt();
    const pinHash = await PinAuthService.hashPin("123456", salt);
    const settings = makeSettings({ pinHash, pinSalt: salt, failedAttempts: 0 });

    const result = await PinAuthService.verifyPin("000000", settings);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.remainingAttempts).toBe(MAX_PIN_ATTEMPTS - 1);
    }
  });

  it("locks after MAX_PIN_ATTEMPTS wrong attempts", async () => {
    const salt = PinAuthService.generateSalt();
    const pinHash = await PinAuthService.hashPin("123456", salt);
    // Already at MAX_PIN_ATTEMPTS - 1 failed attempts
    const settings = makeSettings({
      pinHash,
      pinSalt: salt,
      failedAttempts: MAX_PIN_ATTEMPTS - 1,
    });

    const result = await PinAuthService.verifyPin("000000", settings);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("wrong_pin");
      expect(result.remainingAttempts).toBe(0);
    }
  });

  it("returns locked reason when account is locked", async () => {
    const salt = PinAuthService.generateSalt();
    const pinHash = await PinAuthService.hashPin("123456", salt);
    const lockedSettings = makeSettings({
      pinHash,
      pinSalt: salt,
      failedAttempts: MAX_PIN_ATTEMPTS,
      lockedUntil: Date.now() + LOCKOUT_DURATION_MS,
    });

    const result = await PinAuthService.verifyPin("123456", lockedSettings);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("locked");
      expect(result.lockedUntilMs).toBeGreaterThan(Date.now());
    }
  });

  it("returns failure when pinHash is null", async () => {
    const settings = makeSettings({ pinHash: null, pinSalt: null });
    const result = await PinAuthService.verifyPin("123456", settings);
    expect(result.success).toBe(false);
  });
});
