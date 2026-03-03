import * as Crypto from "expo-crypto";
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

export class PinAuthService {
  static generateSalt(): string {
    // 16 cryptographically random bytes encoded as hex
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  static async hashPin(pin: string, salt: string): Promise<string> {
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${pin}:${salt}:domus_v1`,
    );
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

    const hash = await PinAuthService.hashPin(pin, settings.pinSalt);

    if (hash === settings.pinHash) {
      const updated: UserSecuritySettings = {
        ...settings,
        failedAttempts: 0,
        lockedUntil: null,
      };
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
