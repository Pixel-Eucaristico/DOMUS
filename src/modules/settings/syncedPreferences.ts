import {
  SETTINGS_EVENTS,
  createSettingChangedEvent,
  type SettingsState,
  type SettingChangedEvent,
} from "@packages/settings";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import type { ThemeMode } from "@packages/theme";
import type { SupportMode } from "@/src/modules/monetization/MonetizationSettingsStore";

export const THEME_MODE_SETTING_KEY = "domus_theme_mode_v1" as const;
export const SOUND_ENABLED_SETTING_KEY = "domus_sound_enabled_v1" as const;
export const SUPPORT_MODES_SETTING_KEY = "domus_support_modes_v2" as const;

const VALID_THEME_MODES: readonly ThemeMode[] = ["system", "light", "dark"];
const VALID_SUPPORT_MODES: readonly SupportMode[] = [
  "links",
  "banners",
  "daily_ad",
  "native_ad",
  "app_open",
];
const DEFAULT_SUPPORT_MODES: SupportMode[] = ["links"];

export function resolveThemeModeFromSettings(settings: SettingsState): ThemeMode | undefined {
  const raw = settings.values[THEME_MODE_SETTING_KEY];
  if (typeof raw === "string" && (VALID_THEME_MODES as readonly string[]).includes(raw)) {
    return raw as ThemeMode;
  }
  return undefined;
}

export function resolveSoundEnabledFromSettings(settings: SettingsState): boolean | undefined {
  const raw = settings.values[SOUND_ENABLED_SETTING_KEY];
  if (typeof raw === "boolean") {
    return raw;
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

export function normalizeSupportModes(modes: readonly unknown[]): SupportMode[] {
  const filtered: SupportMode[] = [];
  for (const item of modes) {
    if (
      typeof item === "string" &&
      (VALID_SUPPORT_MODES as readonly string[]).includes(item) &&
      !filtered.includes(item as SupportMode)
    ) {
      filtered.push(item as SupportMode);
    }
  }
  return filtered.length > 0 ? filtered : [...DEFAULT_SUPPORT_MODES];
}

export function resolveSupportModesFromSettings(settings: SettingsState): SupportMode[] | undefined {
  const raw = settings.values[SUPPORT_MODES_SETTING_KEY];
  if (!Array.isArray(raw)) {
    return undefined;
  }
  return normalizeSupportModes(raw);
}

function hasSettingChangedEvent(allEvents: readonly SyncEvent[], key: string): boolean {
  return allEvents.some(
    (evt) =>
      evt?.type === SETTINGS_EVENTS.SETTING_CHANGED &&
      typeof evt.payload === "object" &&
      evt.payload !== null &&
      (evt.payload as { key?: unknown }).key === key,
  );
}

function normalizeThemeModeForSeed(raw: unknown): ThemeMode {
  if (typeof raw === "string" && (VALID_THEME_MODES as readonly string[]).includes(raw)) {
    return raw as ThemeMode;
  }
  return "system";
}

function normalizeSoundEnabledForSeed(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return true;
}

export interface BuildSettingsSeedInput {
  allEvents: readonly SyncEvent[];
  deviceId: string;
  themeMode?: ThemeMode | string | null;
  soundEnabled?: boolean | string | null;
  supportModes?: readonly SupportMode[] | null;
}

/**
 * Gera eventos `SETTING_CHANGED` iniciais para tema, som e modos de apoio quando
 * o log ainda não possui nenhum evento para cada chave correspondente.
 *
 * Nunca emite evento para `domus_is_catholic_v1` (escopo estritamente local).
 */
export function buildSettingsSeedEvents(input: BuildSettingsSeedInput): SettingChangedEvent[] {
  const events: SettingChangedEvent[] = [];

  if (!hasSettingChangedEvent(input.allEvents, THEME_MODE_SETTING_KEY)) {
    events.push(
      createSettingChangedEvent(
        THEME_MODE_SETTING_KEY,
        normalizeThemeModeForSeed(input.themeMode),
        input.deviceId,
      ),
    );
  }

  if (!hasSettingChangedEvent(input.allEvents, SOUND_ENABLED_SETTING_KEY)) {
    events.push(
      createSettingChangedEvent(
        SOUND_ENABLED_SETTING_KEY,
        normalizeSoundEnabledForSeed(input.soundEnabled),
        input.deviceId,
      ),
    );
  }

  if (!hasSettingChangedEvent(input.allEvents, SUPPORT_MODES_SETTING_KEY)) {
    const normalizedModes = Array.isArray(input.supportModes)
      ? normalizeSupportModes(input.supportModes)
      : [...DEFAULT_SUPPORT_MODES];
    events.push(
      createSettingChangedEvent(
        SUPPORT_MODES_SETTING_KEY,
        normalizedModes,
        input.deviceId,
      ),
    );
  }

  return events;
}
