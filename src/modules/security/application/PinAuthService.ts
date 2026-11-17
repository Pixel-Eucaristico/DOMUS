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
      reason: "wrong_pin" | "locked" | "not_configured";
      remainingAttempts?: number;
      lockedUntilMs?: number;
    };

/** Iterações do PBKDF2 do PIN: lento contra força bruta, rápido o bastante para desbloquear. */
export const PIN_PBKDF2_ITERATIONS = 30_000;
const MIN_PBKDF2_ITERATIONS = 1_000;
const MAX_PBKDF2_ITERATIONS = 500_000;
const PBKDF2_TAG = "pbkdf2-sha256";
const PIN_FORMAT_RE = /^\d{4,8}$/;

let pinOperationQueue: Promise<unknown> = Promise.resolve();

function withPinLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = pinOperationQueue.then(fn, fn);
  pinOperationQueue = next.catch(() => {});
  return next;
}

function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

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
    if (!salt) {
      throw new Error("Salt do PIN não pode ser vazio.");
    }
    if (!Number.isInteger(iterations) || iterations <= 0 || iterations > MAX_PBKDF2_ITERATIONS) {
      throw new Error("Contagem de iterações PBKDF2 inválida.");
    }
    const enc = new TextEncoder();
    const key = await pbkdf2Async(sha256, enc.encode(pin), enc.encode(salt), {
      c: iterations,
      dkLen: 32,
    });
    return `${PBKDF2_TAG}$${iterations}$${toHex(key)}`;
  }

  /** Iterações gravadas num hash PBKDF2 (null se o formato for inválido). */
  static storedIterations(pinHash: string): number | null {
    const parts = pinHash.split("$");
    if (parts.length !== 3) return null;
    const [tag, c, hex] = parts;
    if (tag !== PBKDF2_TAG || !/^[1-9]\d*$/.test(c) || !/^[0-9a-f]{64}$/i.test(hex)) {
      return null;
    }
    const n = Number(c);
    if (!Number.isInteger(n) || n < MIN_PBKDF2_ITERATIONS || n > MAX_PBKDF2_ITERATIONS) {
      return null;
    }
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
    return /^[0-9a-f]{64}$/i.test(pinHash);
  }

  static isLocked(settings: UserSecuritySettings): boolean {
    if (!settings.lockedUntil) return false;
    return Date.now() < settings.lockedUntil;
  }

  static getRemainingLockMs(settings: UserSecuritySettings): number {
    if (!settings.lockedUntil) return 0;
    const remaining = settings.lockedUntil - Date.now();
    return Math.min(LOCKOUT_DURATION_MS, Math.max(0, remaining));
  }

  static async verifyPin(
    pin: string,
    settings: UserSecuritySettings,
  ): Promise<PinResult> {
    return withPinLock(async () => {
      const persisted = await SecurityService.loadSettings().catch(() => null);
      const current = persisted ?? settings;

      if (PinAuthService.isLocked(current)) {
        return {
          success: false,
          reason: "locked",
          lockedUntilMs: current.lockedUntil ?? undefined,
        };
      }

      if (!current.pinHash || !current.pinSalt) {
        return { success: false, reason: "not_configured" };
      }

      const legacy = PinAuthService.isLegacyHash(current.pinHash);
      const iterations = legacy ? null : PinAuthService.storedIterations(current.pinHash);
      // Formato desconhecido nunca confere (vira tentativa errada)
      const hash = legacy
        ? await PinAuthService.hashPinLegacy(pin, current.pinSalt)
        : iterations
          ? await PinAuthService.hashPin(pin, current.pinSalt, iterations)
          : null;

      const expectedHash = legacy ? current.pinHash.toLowerCase() : current.pinHash;
      const candidateHash = legacy && hash !== null ? hash.toLowerCase() : hash;

      if (candidateHash !== null && constantTimeEqual(candidateHash, expectedHash)) {
        let updated: UserSecuritySettings = {
          ...current,
          failedAttempts: 0,
          lockedUntil: null,
        };
        if (legacy || iterations !== PIN_PBKDF2_ITERATIONS) {
          // Migração (formato antigo ou iterações mudaram): regrava com salt novo, sem pedir o PIN de novo
          const salt = PinAuthService.generateSalt();
          updated = { ...updated, pinSalt: salt, pinHash: await PinAuthService.hashPin(pin, salt) };
        }
        try {
          await SecurityService.saveSettings(updated);
        } catch {
          // Falha de persistência na migração não bloqueia um desbloqueio válido; tentará novamente no próximo login
        }
        return { success: true };
      }

      const safeAttempts = Number.isFinite(current.failedAttempts)
        ? current.failedAttempts
        : 0;
      const baseAttempts =
        current.lockedUntil !== null && Date.now() >= current.lockedUntil
          ? 0
          : safeAttempts;
      const newAttempts = baseAttempts + 1;
      const shouldLock = newAttempts >= MAX_PIN_ATTEMPTS;
      const updated: UserSecuritySettings = {
        ...current,
        failedAttempts: newAttempts,
        lockedUntil: shouldLock ? Date.now() + LOCKOUT_DURATION_MS : null,
      };
      await SecurityService.saveSettings(updated);

      return {
        success: false,
        reason: "wrong_pin",
        remainingAttempts: Math.max(0, MAX_PIN_ATTEMPTS - newAttempts),
      };
    });
  }

  static async setupPin(
    pin: string,
    settings: UserSecuritySettings,
  ): Promise<UserSecuritySettings> {
    if (!PIN_FORMAT_RE.test(pin)) {
      throw new Error("Formato de PIN inválido.");
    }
    return withPinLock(async () => {
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
    });
  }
}
