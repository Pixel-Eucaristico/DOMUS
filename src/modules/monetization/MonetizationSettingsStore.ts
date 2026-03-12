import AsyncStorage from "@react-native-async-storage/async-storage";

export type SupportMode = "links" | "banners" | "daily_ad" | "native_ad" | "app_open";

const SUPPORT_MODES_KEY = "domus_support_modes_v2";
const DAILY_AD_LAST_KEY = "domus_daily_ad_last_v1";

const ALL_MODES: SupportMode[] = ["links", "banners", "daily_ad", "native_ad", "app_open"];

export async function loadSupportModes(): Promise<SupportMode[]> {
  try {
    const val = await AsyncStorage.getItem(SUPPORT_MODES_KEY);
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.filter((m) => ALL_MODES.includes(m)) as SupportMode[];
      }
    }
    // Legacy single-value key migration
    const legacy = await AsyncStorage.getItem("domus_support_mode_v1");
    if (legacy && ALL_MODES.includes(legacy as SupportMode)) {
      return [legacy as SupportMode];
    }
    return ["links"];
  } catch {
    return ["links"];
  }
}

export async function saveSupportModes(modes: SupportMode[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SUPPORT_MODES_KEY, JSON.stringify(modes));
  } catch {
    // best-effort
  }
}

export async function loadLastDailyAdDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DAILY_AD_LAST_KEY);
  } catch {
    return null;
  }
}

export async function saveLastDailyAdDate(date: string): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_AD_LAST_KEY, date);
  } catch {
    // best-effort
  }
}
