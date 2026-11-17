import {
  SETTINGS_EVENTS,
  createSettingChangedEvent,
  type SettingChangedEvent,
  type SettingsState,
} from "@packages/settings";
import type { SyncEvent } from "@packages/storage/src/eventStore";

export const DRIVE_BACKUP_PREF_SETTING_KEY = "domus_gdrive_backup_pref_v1" as const;

/**
 * Preferência sincronizada de backup no Google Drive.
 * Contém exclusivamente `enabled` e `email` opcional — nunca tokens OAuth.
 */
export interface DriveBackupPreference {
  enabled: boolean;
  email?: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Sanitiza um valor arbitrário pela allowlist estrita (`enabled` e `email` opcional).
 * Tokens OAuth (`accessToken`, `refreshToken`, `expiresAt`, `clientId`, etc.) e quaisquer
 * outros campos desconhecidos são sempre descartados.
 */
export function pickSyncedDriveBackupPref(
  input: unknown,
): DriveBackupPreference | undefined {
  if (!isPlainObject(input) || typeof input.enabled !== "boolean") {
    return undefined;
  }

  const result: DriveBackupPreference = {
    enabled: input.enabled,
  };

  if (typeof input.email === "string") {
    const trimmed = input.email.trim();
    if (
      trimmed.length > 0 &&
      trimmed.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    ) {
      result.email = trimmed;
    }
  }

  return result;
}

/**
 * Resolve e sanitiza a preferência de backup no Drive a partir de `SettingsState`.
 */
export function resolveDriveBackupPrefFromSettings(
  settings: SettingsState,
): DriveBackupPreference | undefined {
  return pickSyncedDriveBackupPref(
    settings.values[DRIVE_BACKUP_PREF_SETTING_KEY],
  );
}

/**
 * Indica se este aparelho deve exibir o convite para conectar o Google Drive
 * localmente (backup ativo no grupo, mas aparelho atual ainda não logado).
 */
export function shouldPromptDriveConnectOnThisDevice(
  pref: DriveBackupPreference | undefined,
  isConnectedOnThisDevice: boolean,
): boolean {
  return pref?.enabled === true && !isConnectedOnThisDevice;
}

function hasSettingChangedEvent(
  allEvents: readonly SyncEvent[],
  key: string,
): boolean {
  return allEvents.some(
    (evt) =>
      evt?.type === SETTINGS_EVENTS.SETTING_CHANGED &&
      isPlainObject(evt.payload) &&
      evt.payload.key === key &&
      pickSyncedDriveBackupPref(evt.payload.value) !== undefined,
  );
}

export interface BuildDriveBackupPrefSeedInput {
  allEvents: readonly SyncEvent[];
  deviceId: string;
  isConnected: boolean;
  email?: string | null;
}

/**
 * Gera evento inicial de seed para `domus_gdrive_backup_pref_v1` após `initialSyncReady`,
 * apenas quando o aparelho já está conectado ao Drive e ainda não existe evento no log.
 */
export function buildDriveBackupPrefSeedEvents(
  input: BuildDriveBackupPrefSeedInput,
): SettingChangedEvent[] {
  if (!input.isConnected) return [];
  if (hasSettingChangedEvent(input.allEvents, DRIVE_BACKUP_PREF_SETTING_KEY)) {
    return [];
  }

  const sanitized = pickSyncedDriveBackupPref({
    enabled: true,
    email: input.email ?? undefined,
  });
  if (!sanitized) return [];

  return [
    createSettingChangedEvent(
      DRIVE_BACKUP_PREF_SETTING_KEY,
      sanitized,
      input.deviceId || "local",
    ),
  ];
}
