import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  currentSchemaVersion,
  shouldStampSchemaVersion,
} from "@packages/events/src/schemaVersion";
import {
  ALLOWED_SETTING_KEYS,
  CURRENT_SETTING_SCHEMA_VERSION,
  SETTINGS_EVENTS,
  createInitialSettingsState,
  createSettingChangedEvent,
  isAllowedSettingKey,
  settingsReducer,
  type SettingChangedEvent,
} from "../index";
import { replayAllEvents } from "@/src/context/replay";
import type { SyncEvent } from "@packages/storage/src/eventStore";

function makeSettingEvent(
  overrides: Partial<Omit<SettingChangedEvent, "payload">> & {
    payload?: Record<string, unknown>;
  },
): SyncEvent {
  return {
    id: overrides.id ?? "evt-1",
    type: overrides.type ?? SETTINGS_EVENTS.SETTING_CHANGED,
    payload: overrides.payload ?? {
      key: "domus_theme_mode_v1",
      value: "dark",
      schemaVersion: 1,
    },
    timestamp: overrides.timestamp ?? 1_700_000_000_000,
    deviceId: overrides.deviceId ?? "dev-a",
    signature: overrides.signature ?? "",
  };
}

describe("packages/settings — allowlist e criação de evento", () => {
  it("contém exatamente as 7 chaves canônicas de docs/inventario-dados.md", () => {
    expect(ALLOWED_SETTING_KEYS).toEqual([
      "domus_theme_mode_v1",
      "domus_sound_enabled_v1",
      "domus_support_modes_v2",
      "domus_notification_settings_v1",
      "@domus:ocr_config",
      "domus_ai_settings_v1",
      "domus_ai_custom_prices",
    ]);

    for (const key of ALLOWED_SETTING_KEYS) {
      expect(isAllowedSettingKey(key)).toBe(true);
    }
    expect(isAllowedSettingKey("domus_support_mode_v1")).toBe(false);
    expect(isAllowedSettingKey("chave_desconhecida_futuro")).toBe(false);
  });

  it("createSettingChangedEvent carimba schemaVersion = 1 e integra com SCHEMA_REGISTRY", () => {
    const evt = createSettingChangedEvent("domus_theme_mode_v1", "dark", "dev-1");
    expect(evt.type).toBe("SETTING_CHANGED");
    expect(evt.deviceId).toBe("dev-1");
    expect(evt.payload).toEqual({
      key: "domus_theme_mode_v1",
      value: "dark",
      schemaVersion: CURRENT_SETTING_SCHEMA_VERSION,
    });
    expect(currentSchemaVersion("SETTING_CHANGED")).toBe(1);
    expect(shouldStampSchemaVersion("SETTING_CHANGED")).toBe(true);
  });
});

describe("settingsReducer — comportamento puro", () => {
  it("aplica chaves permitidas inclusive valores falsy (false, 0, null, '')", () => {
    let state = createInitialSettingsState();
    state = settingsReducer(
      state,
      createSettingChangedEvent("domus_sound_enabled_v1", false),
    );
    state = settingsReducer(
      state,
      createSettingChangedEvent("domus_ai_custom_prices", {}),
    );
    state = settingsReducer(
      state,
      createSettingChangedEvent("@domus:ocr_config", null),
    );
    state = settingsReducer(
      state,
      createSettingChangedEvent("domus_ai_settings_v1", 0),
    );
    state = settingsReducer(
      state,
      createSettingChangedEvent("domus_theme_mode_v1", ""),
    );

    expect(state.values).toEqual({
      domus_sound_enabled_v1: false,
      domus_ai_custom_prices: {},
      "@domus:ocr_config": null,
      domus_ai_settings_v1: 0,
      domus_theme_mode_v1: "",
    });
  });

  it("createSettingChangedEvent rejeita chave fora da allowlist", () => {
    expect(() =>
      createSettingChangedEvent("chave_desconhecida_futuro" as never, 123),
    ).toThrow(/não permitida/);
  });

  it("ignora chave desconhecida sem lançar erro nem alterar state.values", () => {
    const initial = settingsReducer(
      createInitialSettingsState(),
      createSettingChangedEvent("domus_theme_mode_v1", "light"),
    );

    const unknownEvt: SettingChangedEvent = {
      id: "evt-unknown-key",
      type: SETTINGS_EVENTS.SETTING_CHANGED,
      payload: {
        key: "chave_desconhecida_futuro",
        value: 123,
        schemaVersion: CURRENT_SETTING_SCHEMA_VERSION,
      },
      timestamp: 200,
      deviceId: "dev-future",
      signature: "sig-unknown",
    };

    const next = settingsReducer(initial, unknownEvt);

    expect(next).toBe(initial);
    expect(next.values).toEqual({ domus_theme_mode_v1: "light" });
  });

  it("ignora payload sem value (undefined) sem gravar chave indefinida", () => {
    const initial = createInitialSettingsState();
    const missingValueEvt: SettingChangedEvent = {
      id: "evt-missing-value",
      type: SETTINGS_EVENTS.SETTING_CHANGED,
      payload: {
        key: "domus_theme_mode_v1",
        value: undefined,
        schemaVersion: CURRENT_SETTING_SCHEMA_VERSION,
      },
      timestamp: 200,
      deviceId: "dev-1",
      signature: "sig-missing",
    };

    const next = settingsReducer(initial, missingValueEvt);
    expect(next).toBe(initial);
    expect("domus_theme_mode_v1" in next.values).toBe(false);
  });

  it("ignora schemaVersion futura (> 1) sem falha e retorna state inalterado", () => {
    const initial = settingsReducer(
      createInitialSettingsState(),
      createSettingChangedEvent("domus_theme_mode_v1", "light"),
    );

    const futureEvt: SettingChangedEvent = {
      id: "evt-future",
      type: SETTINGS_EVENTS.SETTING_CHANGED,
      payload: {
        key: "domus_theme_mode_v1",
        value: "dark",
        schemaVersion: 99,
      },
      timestamp: 1_700_000_000_000,
      deviceId: "dev-fut",
      signature: "",
    };

    const next = settingsReducer(initial, futureEvt);
    expect(next).toBe(initial);
    expect(next.values.domus_theme_mode_v1).toBe("light");
  });

  it("aceita payload sem schemaVersion (v1 implícito) e rejeita versões inválidas", () => {
    const initial = createInitialSettingsState();

    const implicitV1 = settingsReducer(initial, {
      id: "evt-v1",
      type: SETTINGS_EVENTS.SETTING_CHANGED,
      payload: { key: "domus_theme_mode_v1", value: "system" },
      timestamp: 1000,
      deviceId: "dev-a",
      signature: "",
    });
    expect(implicitV1.values.domus_theme_mode_v1).toBe("system");

    const invalidVersion = settingsReducer(implicitV1, {
      id: "evt-bad",
      type: SETTINGS_EVENTS.SETTING_CHANGED,
      payload: { key: "domus_theme_mode_v1", value: "dark", schemaVersion: 0 },
      timestamp: 2000,
      deviceId: "dev-a",
      signature: "",
    });
    expect(invalidVersion).toBe(implicitV1);
  });
});

describe("replayAllEvents — integração com SETTING_CHANGED (FR-16 e Quarentena)", () => {
  it("último evento vence pela ordem total (timestamp, deviceId, id) mesmo em chegada invertida", () => {
    const t1 = 1_700_000_001_000;
    const t2 = 1_700_000_002_000;

    // Chegada invertida: t2 antes de t1
    const replayedInverted = replayAllEvents([
      makeSettingEvent({
        id: "id-2",
        timestamp: t2,
        deviceId: "dev-a",
        payload: { key: "domus_theme_mode_v1", value: "dark", schemaVersion: 1 },
      }),
      makeSettingEvent({
        id: "id-1",
        timestamp: t1,
        deviceId: "dev-b",
        payload: { key: "domus_theme_mode_v1", value: "light", schemaVersion: 1 },
      }),
    ]);

    expect(replayedInverted.quarantine).toEqual([]);
    expect(replayedInverted.settings.values.domus_theme_mode_v1).toBe("dark");

    // Empate de timestamp resolvido por deviceId ("dev-b" > "dev-a")
    const replayedDeviceTie = replayAllEvents([
      makeSettingEvent({
        id: "id-9",
        timestamp: t1,
        deviceId: "dev-b",
        payload: { key: "domus_theme_mode_v1", value: "dark", schemaVersion: 1 },
      }),
      makeSettingEvent({
        id: "id-10",
        timestamp: t1,
        deviceId: "dev-a",
        payload: { key: "domus_theme_mode_v1", value: "light", schemaVersion: 1 },
      }),
    ]);

    expect(replayedDeviceTie.quarantine).toEqual([]);
    expect(replayedDeviceTie.settings.values.domus_theme_mode_v1).toBe("dark");

    // Empate de timestamp e deviceId resolvido por id ("id-b" > "id-a")
    const replayedIdTie = replayAllEvents([
      makeSettingEvent({
        id: "id-b",
        timestamp: t1,
        deviceId: "dev-a",
        payload: { key: "domus_sound_enabled_v1", value: false, schemaVersion: 1 },
      }),
      makeSettingEvent({
        id: "id-a",
        timestamp: t1,
        deviceId: "dev-a",
        payload: { key: "domus_sound_enabled_v1", value: true, schemaVersion: 1 },
      }),
    ]);

    expect(replayedIdTie.quarantine).toEqual([]);
    expect(replayedIdTie.settings.values.domus_sound_enabled_v1).toBe(false);
  });

  it("chave desconhecida é ignorada sem alterar settings.values e sem ir para a Quarentena", () => {
    const replayed = replayAllEvents([
      makeSettingEvent({
        id: "id-1",
        timestamp: 1_700_000_001_000,
        payload: { key: "chave_desconhecida_futuro", value: 123, schemaVersion: 1 },
      }),
    ]);

    expect(replayed.quarantine).toEqual([]);
    expect(replayed.settings.values).toEqual({});
  });

  it("schemaVersion futura (> 1) vai para quarantine como future_schema_version sem quebrar o replay", () => {
    const replayed = replayAllEvents([
      makeSettingEvent({
        id: "id-valid",
        timestamp: 1_700_000_001_000,
        payload: { key: "domus_theme_mode_v1", value: "light", schemaVersion: 1 },
      }),
      makeSettingEvent({
        id: "id-future",
        timestamp: 1_700_000_002_000,
        payload: { key: "domus_theme_mode_v1", value: "dark", schemaVersion: 99 },
      }),
    ]);

    expect(replayed.settings.values.domus_theme_mode_v1).toBe("light");
    expect(replayed.quarantine).toEqual([
      expect.objectContaining({
        id: "id-future",
        type: "SETTING_CHANGED",
        kind: "future_schema_version",
      }),
    ]);
  });
});

describe("packages/settings — pureza do pacote", () => {
  it("nenhum arquivo de packages/settings importa react, react-native ou expo", () => {
    const pkgDir = path.resolve(__dirname, "..");
    const files: string[] = [];

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          files.push(full);
        }
      }
    }

    walk(pkgDir);
    expect(files.length).toBeGreaterThanOrEqual(4);

    const forbidden = /from\s+["'](react|react-native|expo[^"']*)["']|require\(\s*["'](react|react-native|expo[^"']*)["']\s*\)/;
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      expect(content, `Import proibido encontrado em ${file}`).not.toMatch(forbidden);
    }
  });
});
