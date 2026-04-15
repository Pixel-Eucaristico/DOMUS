import AsyncStorage from "@react-native-async-storage/async-storage";

export type SupportMode = "links" | "banners" | "daily_ad" | "native_ad" | "app_open";

const STORAGE_KEY_SUPPORT_MODES = "domus_support_modes_v2";
const STORAGE_KEY_DAILY_AD_LAST = "domus_daily_ad_last_v1";
const STORAGE_KEY_SUPPORT_MODE_LEGACY = "domus_support_mode_v1";

const DEFAULT_SUPPORT_MODE: SupportMode = "links";

export const ALL_SUPPORT_MODES: SupportMode[] = ["links", "banners", "daily_ad", "native_ad", "app_open"];

export async function loadSupportModes(): Promise<SupportMode[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_SUPPORT_MODES);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter((m) => ALL_SUPPORT_MODES.includes(m)) as SupportMode[];
      }
    }
    const legacy = await AsyncStorage.getItem(STORAGE_KEY_SUPPORT_MODE_LEGACY);
    if (legacy && ALL_SUPPORT_MODES.includes(legacy as SupportMode)) {
      return [legacy as SupportMode];
    }
    return [DEFAULT_SUPPORT_MODE];
  } catch {
    return [DEFAULT_SUPPORT_MODE];
  }
}

export async function saveSupportModes(modes: SupportMode[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_SUPPORT_MODES, JSON.stringify(modes));
  } catch {
    // best-effort
  }
}

export async function loadLastDailyAdDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_DAILY_AD_LAST);
  } catch {
    return null;
  }
}

export async function saveLastDailyAdDate(date: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_DAILY_AD_LAST, date);
  } catch {
    // best-effort
  }
}
