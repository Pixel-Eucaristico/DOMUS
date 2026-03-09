import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ANALYTICS_SETTINGS_KEY,
  DEFAULT_ANALYTICS_SETTINGS,
  type AnalyticsSettings,
} from "../domain/AnalyticsSettings";

export async function loadAnalyticsSettings(): Promise<AnalyticsSettings> {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_ANALYTICS_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AnalyticsSettings>;
    return { ...DEFAULT_ANALYTICS_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_ANALYTICS_SETTINGS };
  }
}

export async function saveAnalyticsSettings(
  settings: AnalyticsSettings,
): Promise<void> {
  await AsyncStorage.setItem(ANALYTICS_SETTINGS_KEY, JSON.stringify(settings));
}
