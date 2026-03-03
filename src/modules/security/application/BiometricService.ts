import * as LocalAuthentication from "expo-local-authentication";

export type BiometricAvailability =
  | "available"
  | "no_hardware"
  | "not_enrolled";

export type BiometricResult =
  | { success: true }
  | {
      success: false;
      reason: "unavailable" | "not_enrolled" | "cancelled" | "failed" | "error";
      message?: string;
    };

export class BiometricService {
  static async checkAvailability(): Promise<BiometricAvailability> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return "no_hardware";
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) return "not_enrolled";
    return "available";
  }

  static async isAvailable(): Promise<boolean> {
    return (await BiometricService.checkAvailability()) === "available";
  }

  static async getSupportedTypes(): Promise<
    LocalAuthentication.AuthenticationType[]
  > {
    return LocalAuthentication.supportedAuthenticationTypesAsync();
  }

  static async authenticate(): Promise<BiometricResult> {
    const availability = await BiometricService.checkAvailability();
    if (availability === "no_hardware") {
      return { success: false, reason: "unavailable" };
    }
    if (availability === "not_enrolled") {
      return { success: false, reason: "not_enrolled" };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentique-se para acessar o DOMUS",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });

      if (result.success) return { success: true };

      if (result.error === "user_cancel" || result.error === "system_cancel") {
        return { success: false, reason: "cancelled" };
      }

      return { success: false, reason: "failed", message: result.error };
    } catch (err) {
      return {
        success: false,
        reason: "error",
        message: err instanceof Error ? err.message : "Erro desconhecido",
      };
    }
  }
}
