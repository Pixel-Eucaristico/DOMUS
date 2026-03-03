import type { UserSecuritySettings } from "../domain/UserSecuritySettings";
import { DEFAULT_SECURITY_SETTINGS } from "../domain/UserSecuritySettings";
import { SecureStorageService } from "../infrastructure/SecureStorageService";

const SETTINGS_KEY = "domus_security_settings_v1";

export class SecurityService {
  static async loadSettings(): Promise<UserSecuritySettings> {
    try {
      const raw = await SecureStorageService.get(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SECURITY_SETTINGS };
      return JSON.parse(raw) as UserSecuritySettings;
    } catch {
      return { ...DEFAULT_SECURITY_SETTINGS };
    }
  }

  static async saveSettings(settings: UserSecuritySettings): Promise<void> {
    await SecureStorageService.set(SETTINGS_KEY, JSON.stringify(settings));
  }

  static async disableLock(): Promise<void> {
    await SecurityService.saveSettings({ ...DEFAULT_SECURITY_SETTINGS });
  }

  static async isLockEnabled(): Promise<boolean> {
    const s = await SecurityService.loadSettings();
    return s.enabled;
  }
}
