import { createEvent } from "@packages/events/src/factory";

export const SETTINGS_EVENTS = {
  SETTING_CHANGED: "SETTING_CHANGED",
} as const;

export type SettingsEventType =
  (typeof SETTINGS_EVENTS)[keyof typeof SETTINGS_EVENTS];

export const CURRENT_SETTING_SCHEMA_VERSION = 1;

/**
 * Allowlist canônica das chaves classificadas como `vira evento` em
 * `docs/inventario-dados.md`.
 */
export const ALLOWED_SETTING_KEYS = [
  "domus_theme_mode_v1",
  "domus_sound_enabled_v1",
  "domus_support_modes_v2",
  "domus_notification_settings_v1",
  "@domus:ocr_config",
  "domus_ai_settings_v1",
  "domus_ai_custom_prices",
  "domus_gdrive_backup_pref_v1",
  "domus_is_catholic_v1",
] as const;

export type AllowedSettingKey = (typeof ALLOWED_SETTING_KEYS)[number];

const ALLOWED_SETTING_KEY_SET: ReadonlySet<string> = new Set(ALLOWED_SETTING_KEYS);

export function isAllowedSettingKey(key: string): key is AllowedSettingKey {
  return ALLOWED_SETTING_KEY_SET.has(key);
}

export interface SettingChangedPayload {
  key: string;
  value: unknown;
  schemaVersion?: number;
}

export interface SettingChangedEvent {
  id: string;
  type: typeof SETTINGS_EVENTS.SETTING_CHANGED;
  payload: SettingChangedPayload;
  timestamp: number;
  deviceId: string;
  signature: string;
}

export type SettingsEvent = SettingChangedEvent;

export interface SettingsState {
  values: Partial<Record<AllowedSettingKey, unknown>>;
}

export function createSettingChangedEvent(
  key: AllowedSettingKey,
  value: unknown,
  deviceId: string = "local",
): SettingChangedEvent {
  if (!isAllowedSettingKey(key)) {
    throw new Error(`Chave de preferência não permitida: ${String(key)}`);
  }
  return createEvent<SettingChangedEvent>(
    SETTINGS_EVENTS.SETTING_CHANGED,
    {
      key,
      value,
      schemaVersion: CURRENT_SETTING_SCHEMA_VERSION,
    },
    deviceId,
  );
}
