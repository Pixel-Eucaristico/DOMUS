import { BiometricService } from "@/src/modules/security/application/BiometricService";

// ─── BiometricGate ────────────────────────────────────────────────────────────

export class BiometricGate {
  /**
   * Prompts biometric authentication for AI key access.
   * Returns `true` if authenticated or if biometric is unavailable (key is
   * still encrypted at rest, so skipping the gate is acceptable).
   * Returns `false` if the user explicitly cancels or fails authentication.
   */
  static async authenticate(): Promise<boolean> {
    const available = await BiometricService.isAvailable();
    if (!available) {
      // No biometric hardware / not enrolled — allow without gate.
      // The key is still encrypted with AES-256-GCM in SecureStore.
      return true;
    }

    const result = await BiometricService.authenticate();
    return result.success;
  }

  static async isAvailable(): Promise<boolean> {
    return BiometricService.isAvailable();
  }
}
