import { BiometricService } from "@/src/modules/security/application/BiometricService";

// ─── BiometricGate ────────────────────────────────────────────────────────────

/** Session duration in ms — re-authenticate after 5 minutes of inactivity */
const SESSION_DURATION_MS = 5 * 60 * 1000;

export class BiometricGate {
  private static authenticatedAt: number | null = null;

  /**
   * Prompts biometric authentication for AI key access.
   * Caches the result for SESSION_DURATION_MS so the user is not prompted
   * on every single message.
   *
   * Returns `true` if authenticated, session still valid, or biometric
   * is unavailable (key is still encrypted at rest).
   * Returns `false` if the user explicitly cancels or fails authentication.
   */
  static async authenticate(): Promise<boolean> {
    // Session still valid — skip prompt
    if (
      BiometricGate.authenticatedAt !== null &&
      Date.now() - BiometricGate.authenticatedAt < SESSION_DURATION_MS
    ) {
      return true;
    }

    const available = await BiometricService.isAvailable();
    if (!available) {
      // No biometric hardware / not enrolled — allow without gate.
      // The key is still encrypted with AES-256-GCM in SecureStore.
      return true;
    }

    const result = await BiometricService.authenticate();
    if (result.success) {
      BiometricGate.authenticatedAt = Date.now();
    }
    return result.success;
  }

  static async isAvailable(): Promise<boolean> {
    return BiometricService.isAvailable();
  }

  /** Clears the session cache (e.g. on app background or logout). */
  static clearSession(): void {
    BiometricGate.authenticatedAt = null;
  }
}
