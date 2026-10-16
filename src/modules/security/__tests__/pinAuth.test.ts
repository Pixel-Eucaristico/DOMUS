import { describe, it, expect, vi } from "vitest";
import { PinAuthService, PIN_PBKDF2_ITERATIONS } from "../application/PinAuthService";
import { SecurityService } from "../application/SecurityService";
import { createHash, pbkdf2Sync } from "node:crypto";
import { MAX_PIN_ATTEMPTS, LOCKOUT_DURATION_MS } from "../domain/UserSecuritySettings";
import type { UserSecuritySettings } from "../domain/UserSecuritySettings";

// ─── Mock expo-crypto ─────────────────────────────────────────────────────────
// expo-crypto é nativo; no teste usamos o crypto do Node com o mesmo contrato
// (SHA-256 real em hex minúsculo e bytes de fonte criptográfica).

vi.mock("expo-crypto", async () => {
  const { createHash, randomBytes } = await import("node:crypto");
  return {
    digestStringAsync: async (_algorithm: string, input: string): Promise<string> =>
      createHash("sha256").update(input, "utf8").digest("hex"),
    CryptoDigestAlgorithm: { SHA256: "SHA-256" },
    getRandomBytes: (n: number): Uint8Array => new Uint8Array(randomBytes(n)),
  };
});

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
  it("usa PBKDF2-SHA256 com prefixo de versão e 32 bytes em hex", async () => {
    const hash = await PinAuthService.hashPin("123456", "abcdef01234567890abcdef012345678");
    expect(hash.startsWith(`pbkdf2-sha256$${PIN_PBKDF2_ITERATIONS}$`)).toBe(true);
    expect(hash.split("$")[2]).toMatch(/^[0-9a-f]{64}$/);
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

describe("PinAuthService — vetores conhecidos", () => {
  it("hashPin bate com PBKDF2-SHA256 de referência (pin e salt em UTF-8, 32 bytes)", async () => {
    const salt = "00112233445566778899aabbccddeeff";
    const expected = pbkdf2Sync("1234", salt, PIN_PBKDF2_ITERATIONS, 32, "sha256").toString("hex");
    expect(await PinAuthService.hashPin("1234", salt)).toBe(`pbkdf2-sha256$${PIN_PBKDF2_ITERATIONS}$${expected}`);
  });

  it("hashPinLegacy bate com o SHA-256 do formato antigo", async () => {
    const expected = createHash("sha256").update("1234:abc:domus_v1").digest("hex");
    expect(await PinAuthService.hashPinLegacy("1234", "abc")).toBe(expected);
  });
});

describe("PinAuthService — iterações gravadas", () => {
  it("verifica com as iterações do hash salvo e regrava com as atuais", async () => {
    const save = vi.mocked(SecurityService.saveSettings);
    save.mockClear();
    const salt = PinAuthService.generateSalt();
    const pinHash = await PinAuthService.hashPin("1234", salt, 1_000);
    const result = await PinAuthService.verifyPin("1234", makeSettings({ pinHash, pinSalt: salt }));
    expect(result.success).toBe(true);
    const saved = save.mock.calls.at(-1)![0];
    expect(PinAuthService.storedIterations(saved.pinHash!)).toBe(PIN_PBKDF2_ITERATIONS);
  });

  it("formato desconhecido nunca confere", async () => {
    const result = await PinAuthService.verifyPin("1234", makeSettings({ pinHash: "bcrypt$10$xyz", pinSalt: "s" }));
    expect(result.success).toBe(false);
  });
});

describe("PinAuthService — migração do formato antigo (D8)", () => {
  it("o salt não usa Math.random", () => {
    const spy = vi.spyOn(Math, "random");
    PinAuthService.generateSalt();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("desbloqueia com PIN antigo e regrava no formato novo com salt novo", async () => {
    const save = vi.mocked(SecurityService.saveSettings);
    save.mockClear();
    const oldSalt = "legacy_salt_000000000000000000000";
    const pinHash = await PinAuthService.hashPinLegacy("1234", oldSalt);
    const result = await PinAuthService.verifyPin(
      "1234",
      makeSettings({ pinHash, pinSalt: oldSalt, failedAttempts: 2, lockedUntil: Date.now() - 1 }),
    );

    expect(result.success).toBe(true);
    const saved = save.mock.calls.at(-1)![0];
    expect(saved.failedAttempts).toBe(0);
    expect(saved.lockedUntil).toBeNull();
    expect(PinAuthService.isLegacyHash(saved.pinHash!)).toBe(false);
    expect(saved.pinSalt).not.toBe(oldSalt);
    expect(await PinAuthService.hashPin("1234", saved.pinSalt!)).toBe(saved.pinHash);
  });

  it("PIN errado no formato antigo não migra e conta a tentativa", async () => {
    const save = vi.mocked(SecurityService.saveSettings);
    save.mockClear();
    const oldSalt = "legacy_salt_000000000000000000000";
    const pinHash = await PinAuthService.hashPinLegacy("1234", oldSalt);
    const result = await PinAuthService.verifyPin("9999", makeSettings({ pinHash, pinSalt: oldSalt }));

    expect(result.success).toBe(false);
    const saved = save.mock.calls.at(-1)![0];
    expect(saved.pinHash).toBe(pinHash);
    expect(saved.failedAttempts).toBe(1);
  });

  it("PIN já no formato novo não é regravado com outro salt", async () => {
    const save = vi.mocked(SecurityService.saveSettings);
    save.mockClear();
    const salt = PinAuthService.generateSalt();
    const pinHash = await PinAuthService.hashPin("1234", salt);
    await PinAuthService.verifyPin("1234", makeSettings({ pinHash, pinSalt: salt }));
    expect(save.mock.calls.at(-1)![0].pinSalt).toBe(salt);
  });
});
