export type LockMethod = "pin" | "biometric";

export interface UserSecuritySettings {
  enabled: boolean;
  method: LockMethod;
  pinHash: string | null;
  pinSalt: string | null;
  failedAttempts: number;
  /** Unix timestamp (ms) until which PIN entry is blocked */
  lockedUntil: number | null;
}

export const DEFAULT_SECURITY_SETTINGS: UserSecuritySettings = {
  enabled: false,
  method: "biometric",
  pinHash: null,
  pinSalt: null,
  failedAttempts: 0,
  lockedUntil: null,
};

export const MAX_PIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 30_000;
export const PIN_LENGTH = 6;
