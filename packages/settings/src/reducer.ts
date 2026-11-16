import {
  CURRENT_SETTING_SCHEMA_VERSION,
  isAllowedSettingKey,
  SETTINGS_EVENTS,
  type SettingsEvent,
  type SettingsState,
} from "./types";

export function createInitialSettingsState(): SettingsState {
  return {
    values: {},
  };
}

/**
 * Reducer puro de preferências do usuário.
 *
 * Assume que os eventos chegam ordenados pela ordem total `(timestamp, deviceId, id)` (FR-16),
 * aplicando "último evento vence" por chave. Chaves fora da allowlist e versões de schema
 * futuras ou inválidas são ignoradas sem lançar erro.
 */
export function settingsReducer(
  state: SettingsState,
  event: SettingsEvent,
): SettingsState {
  if (event.type !== SETTINGS_EVENTS.SETTING_CHANGED) {
    return state;
  }

  const payload = event.payload;
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.key !== "string" ||
    payload.value === undefined
  ) {
    return state;
  }

  const version = payload.schemaVersion;
  if (
    version !== undefined &&
    (typeof version !== "number" ||
      !Number.isSafeInteger(version) ||
      version < 1 ||
      version > CURRENT_SETTING_SCHEMA_VERSION)
  ) {
    return state;
  }

  if (!isAllowedSettingKey(payload.key)) {
    return state;
  }

  return {
    ...state,
    values: {
      ...state.values,
      [payload.key]: payload.value,
    },
  };
}
