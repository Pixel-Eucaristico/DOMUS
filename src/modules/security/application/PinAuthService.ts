import * as Crypto from "expo-crypto";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import type { UserSecuritySettings } from "../domain/UserSecuritySettings";
import {
  MAX_PIN_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from "../domain/UserSecuritySettings";
import { SecurityService } from "./SecurityService";

export type PinResult =
  | { success: true }
  | {
      success: false;
      reason: "wrong_pin" | "locked";
      remainingAttempts?: number;
      lockedUntilMs?: number;
    };

/** Iterações do PBKDF2 do PIN: lento contra força bruta, rápido o bastante para desbloquear. */
export const PIN_PBKDF2_ITERATIONS = 30_000;
const PBKDF2_TAG = "pbkdf2-sha256";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class PinAuthService {
  /** 16 bytes de fonte criptográfica, em hex. */
  static generateSalt(): string {
    return toHex(Crypto.getRandomBytes(16));
  }

  /** Hash PBKDF2-SHA256 no formato `pbkdf2-sha256$<iterações>$<hex>`. */
  static async hashPin(
    pin: string,
    salt: string,
    iterations: number = PIN_PBKDF2_ITERATIONS,
  ): Promise<string> {
    const enc = new TextEncoder();
    const key = await pbkdf2Async(sha256, enc.encode(pin), enc.encode(salt), {
      c: iterations,
      dkLen: 32,
    });
    return `${PBKDF2_TAG}$${iterations}$${toHex(key)}`;
  }

  /** Iterações gravadas num hash PBKDF2 (null se o formato for inválido). */
  static storedIterations(pinHash: string): number | null {
    const [tag, c, hex] = pinHash.split("$");
    const n = Number(c);
    if (tag !== PBKDF2_TAG || !Number.isInteger(n) || n <= 0 || !hex) return null;
    return n;
  }

  /** Hash antigo (SHA-256 único), mantido só para migrar PINs já salvos. */
  static async hashPinLegacy(pin: string, salt: string): Promise<string> {
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${pin}:${salt}:domus_v1`,
    );
  }

  /** Formato antigo: SHA-256 em hex, sem `$`. */
  static isLegacyHash(pinHash: string): boolean {
    return /^[0-9a-f]{64}$/.test(pinHash);
  }

  static isLocked(settings: UserSecuritySettings): boolean {
    if (!settings.lockedUntil) return false;
    return Date.now() < settings.lockedUntil;
  }

  static getRemainingLockMs(settings: UserSecuritySettings): number {
    if (!settings.lockedUntil) return 0;
    return Math.max(0, settings.lockedUntil - Date.now());
  }

  static async verifyPin(
    pin: string,
    settings: UserSecuritySettings,
  ): Promise<PinResult> {
    if (PinAuthService.isLocked(settings)) {
      return {
        success: false,
        reason: "locked",
        lockedUntilMs: settings.lockedUntil ?? undefined,
      };
    }

    if (!settings.pinHash || !settings.pinSalt) {
      return { success: false, reason: "wrong_pin", remainingAttempts: 0 };
    }

    const legacy = PinAuthService.isLegacyHash(settings.pinHash);
    const iterations = legacy ? null : PinAuthService.storedIterations(settings.pinHash);
    // Formato desconhecido nunca confere (vira tentativa errada)
    const hash = legacy
      ? await PinAuthService.hashPinLegacy(pin, settings.pinSalt)
      : iterations
        ? await PinAuthService.hashPin(pin, settings.pinSalt, iterations)
        : null;

    if (hash !== null && hash === settings.pinHash) {
      let updated: UserSecuritySettings = {
        ...settings,
        failedAttempts: 0,
        lockedUntil: null,
      };
      if (legacy || iterations !== PIN_PBKDF2_ITERATIONS) {
        // Migração (formato antigo ou iterações mudaram): regrava com salt novo, sem pedir o PIN de novo
        const salt = PinAuthService.generateSalt();
        updated = { ...updated, pinSalt: salt, pinHash: await PinAuthService.hashPin(pin, salt) };
      }
      await SecurityService.saveSettings(updated);
      return { success: true };
    }

    const newAttempts = settings.failedAttempts + 1;
    const shouldLock = newAttempts >= MAX_PIN_ATTEMPTS;
    const updated: UserSecuritySettings = {
      ...settings,
      failedAttempts: newAttempts,
      lockedUntil: shouldLock ? Date.now() + LOCKOUT_DURATION_MS : null,
    };
    await SecurityService.saveSettings(updated);

    return {
      success: false,
      reason: "wrong_pin",
      remainingAttempts: Math.max(0, MAX_PIN_ATTEMPTS - newAttempts),
    };
  }

  static async setupPin(
    pin: string,
    settings: UserSecuritySettings,
  ): Promise<UserSecuritySettings> {
    const salt = PinAuthService.generateSalt();
    const hash = await PinAuthService.hashPin(pin, salt);
    const updated: UserSecuritySettings = {
      ...settings,
      pinHash: hash,
      pinSalt: salt,
      failedAttempts: 0,
      lockedUntil: null,
    };
    await SecurityService.saveSettings(updated);
    return updated;
  }
}
