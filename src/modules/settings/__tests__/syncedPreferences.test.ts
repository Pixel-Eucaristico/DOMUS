import { describe, expect, it, vi } from "vitest";
import {
  SETTINGS_EVENTS,
  createInitialSettingsState,
  createSettingChangedEvent,
  type SettingsState,
} from "@packages/settings";
import { appendGenerated } from "@/src/context/localEventLog";
import { replayAllEvents } from "@/src/context/replay";
import {
  IS_CATHOLIC_SETTING_KEY,
  SOUND_ENABLED_SETTING_KEY,
  SUPPORT_MODES_SETTING_KEY,
  THEME_MODE_SETTING_KEY,
  buildSettingsSeedEvents,
  resolveIsCatholicFromSettings,
  resolveSoundEnabledFromSettings,
  resolveSupportModesFromSettings,
  resolveThemeModeFromSettings,
  syncIsCatholicIfStrongGroup,
} from "../syncedPreferences";

function settingsWith(values: SettingsState["values"]): SettingsState {
  return { values };
}

describe("syncedPreferences — resolvers", () => {
  it("resolveThemeModeFromSettings aceita apenas system | light | dark", () => {
    expect(resolveThemeModeFromSettings(settingsWith({ domus_theme_mode_v1: "system" }))).toBe("system");
    expect(resolveThemeModeFromSettings(settingsWith({ domus_theme_mode_v1: "light" }))).toBe("light");
    expect(resolveThemeModeFromSettings(settingsWith({ domus_theme_mode_v1: "dark" }))).toBe("dark");

    expect(resolveThemeModeFromSettings(settingsWith({ domus_theme_mode_v1: "neon" }))).toBeUndefined();
    expect(resolveThemeModeFromSettings(settingsWith({ domus_theme_mode_v1: 123 }))).toBeUndefined();
    expect(resolveThemeModeFromSettings(createInitialSettingsState())).toBeUndefined();
  });

  it("resolveSoundEnabledFromSettings aceita booleano e strings 'true'/'false' legadas", () => {
    expect(resolveSoundEnabledFromSettings(settingsWith({ domus_sound_enabled_v1: true }))).toBe(true);
    expect(resolveSoundEnabledFromSettings(settingsWith({ domus_sound_enabled_v1: false }))).toBe(false);
    expect(resolveSoundEnabledFromSettings(settingsWith({ domus_sound_enabled_v1: "true" }))).toBe(true);
    expect(resolveSoundEnabledFromSettings(settingsWith({ domus_sound_enabled_v1: "false" }))).toBe(false);

    expect(resolveSoundEnabledFromSettings(settingsWith({ domus_sound_enabled_v1: "sim" }))).toBeUndefined();
    expect(resolveSoundEnabledFromSettings(settingsWith({ domus_sound_enabled_v1: 0 }))).toBeUndefined();
    expect(resolveSoundEnabledFromSettings(createInitialSettingsState())).toBeUndefined();
  });

  it("resolveSupportModesFromSettings filtra modos válidos e faz fallback seguro para ['links']", () => {
    expect(
      resolveSupportModesFromSettings(
        settingsWith({ domus_support_modes_v2: ["banners", "invalido", "daily_ad", "banners"] }),
      ),
    ).toEqual(["banners", "daily_ad"]);

    expect(resolveSupportModesFromSettings(settingsWith({ domus_support_modes_v2: [] }))).toEqual(["links"]);
    expect(resolveSupportModesFromSettings(settingsWith({ domus_support_modes_v2: ["invalido"] }))).toEqual([
      "links",
    ]);

    expect(resolveSupportModesFromSettings(settingsWith({ domus_support_modes_v2: "banners" }))).toBeUndefined();
    expect(resolveSupportModesFromSettings(settingsWith({ domus_support_modes_v2: null }))).toBeUndefined();
    expect(resolveSupportModesFromSettings(createInitialSettingsState())).toBeUndefined();
  });

  it("resolveIsCatholicFromSettings aceita booleano e strings 'true'/'false', retornando undefined para inválidos", () => {
    expect(resolveIsCatholicFromSettings(settingsWith({ domus_is_catholic_v1: true }))).toBe(true);
    expect(resolveIsCatholicFromSettings(settingsWith({ domus_is_catholic_v1: false }))).toBe(false);
    expect(resolveIsCatholicFromSettings(settingsWith({ domus_is_catholic_v1: "true" }))).toBe(true);
    expect(resolveIsCatholicFromSettings(settingsWith({ domus_is_catholic_v1: "false" }))).toBe(false);

    expect(resolveIsCatholicFromSettings(settingsWith({ domus_is_catholic_v1: "sim" }))).toBeUndefined();
    expect(resolveIsCatholicFromSettings(settingsWith({ domus_is_catholic_v1: 1 }))).toBeUndefined();
    expect(resolveIsCatholicFromSettings(settingsWith({ domus_is_catholic_v1: null }))).toBeUndefined();
    expect(resolveIsCatholicFromSettings(createInitialSettingsState())).toBeUndefined();
  });
});

describe("syncedPreferences — seed inicial e isolamento", () => {
  it("primeira abertura sem eventos gera exatamente 3 eventos SETTING_CHANGED com os valores locais", () => {
    const seed = buildSettingsSeedEvents({
      allEvents: [],
      deviceId: "dev-a",
      themeMode: "dark",
      soundEnabled: false,
      supportModes: ["banners"],
    });

    expect(seed).toHaveLength(3);
    expect(seed.map((e) => e.payload.key)).toEqual([
      THEME_MODE_SETTING_KEY,
      SOUND_ENABLED_SETTING_KEY,
      SUPPORT_MODES_SETTING_KEY,
    ]);
    expect(seed.map((e) => e.payload.value)).toEqual(["dark", false, ["banners"]]);

    const { events: withSeed, added } = appendGenerated([], seed, "dev-a");
    expect(added).toHaveLength(3);

    // Nova execução com o log já populado não gera duplicatas
    const secondRun = buildSettingsSeedEvents({
      allEvents: withSeed,
      deviceId: "dev-a",
      themeMode: "light",
      soundEnabled: true,
      supportModes: ["daily_ad"],
    });
    expect(secondRun).toEqual([]);
  });

  it("aparelho novo entrando em grupo existente não sobrescreve tema já presente no log", () => {
    const remoteThemeEvent = {
      ...createSettingChangedEvent(THEME_MODE_SETTING_KEY, "light", "dev-remote"),
      timestamp: 1_700_000_000_000,
    };

    const seed = buildSettingsSeedEvents({
      allEvents: [remoteThemeEvent],
      deviceId: "dev-new",
      themeMode: "dark",
      soundEnabled: false,
      supportModes: ["banners"],
    });

    expect(seed.map((e) => e.payload.key)).toEqual([
      SOUND_ENABLED_SETTING_KEY,
      SUPPORT_MODES_SETTING_KEY,
    ]);

    const { events: combined } = appendGenerated([remoteThemeEvent], seed, "dev-new");
    const replayed = replayAllEvents(combined, { currentDeviceId: "dev-new", now: 1_800_000_000_000 });
    expect(resolveThemeModeFromSettings(replayed.settings)).toBe("light");
    expect(resolveSoundEnabledFromSettings(replayed.settings)).toBe(false);
    expect(resolveSupportModesFromSettings(replayed.settings)).toEqual(["banners"]);
  });

  it("domus_is_catholic_v1 não é emitido no seed inicial sem Grupo forte, mas é emitido quando isStrongGroup: true e valor definido", () => {
    const seedWithoutStrongGroup = buildSettingsSeedEvents({
      allEvents: [],
      deviceId: "dev-a",
      themeMode: null,
      soundEnabled: null,
      supportModes: null,
      isCatholic: true,
      isStrongGroup: false,
    });

    expect(seedWithoutStrongGroup.every((e) => e.type === SETTINGS_EVENTS.SETTING_CHANGED)).toBe(true);
    expect(seedWithoutStrongGroup.some((e) => e.payload.key === IS_CATHOLIC_SETTING_KEY)).toBe(false);
    expect(seedWithoutStrongGroup.map((e) => e.payload.value)).toEqual(["system", true, ["links"]]);

    const seedWithStrongGroupAndNull = buildSettingsSeedEvents({
      allEvents: [],
      deviceId: "dev-a",
      isCatholic: null,
      isStrongGroup: true,
    });
    expect(seedWithStrongGroupAndNull.some((e) => e.payload.key === IS_CATHOLIC_SETTING_KEY)).toBe(false);

    const seedWithStrongGroup = buildSettingsSeedEvents({
      allEvents: [],
      deviceId: "dev-a",
      themeMode: "dark",
      soundEnabled: true,
      supportModes: ["links"],
      isCatholic: true,
      isStrongGroup: true,
    });
    const catholicEvent = seedWithStrongGroup.find((e) => e.payload.key === IS_CATHOLIC_SETTING_KEY);
    expect(catholicEvent).toBeDefined();
    expect(catholicEvent?.payload.value).toBe(true);
  });
});

describe("syncedPreferences — propagação entre dois aparelhos via replayAllEvents", () => {
  it("alterações de tema, som e modo de apoio convergem entre aparelho A e B pela ordem FR-16", () => {
    const t1 = 1_700_000_001_000;
    const t2 = 1_700_000_002_000;

    const evtThemeA = {
      ...createSettingChangedEvent(THEME_MODE_SETTING_KEY, "light", "dev-a"),
      id: "theme-1",
      timestamp: t1,
    };
    const evtThemeB = {
      ...createSettingChangedEvent(THEME_MODE_SETTING_KEY, "dark", "dev-b"),
      id: "theme-2",
      timestamp: t2,
    };
    const evtSoundA = {
      ...createSettingChangedEvent(SOUND_ENABLED_SETTING_KEY, false, "dev-a"),
      id: "sound-1",
      timestamp: t2,
    };
    const evtSupportB = {
      ...createSettingChangedEvent(SUPPORT_MODES_SETTING_KEY, ["banners", "daily_ad"], "dev-b"),
      id: "support-1",
      timestamp: t2,
    };

    // Ordem invertida no aparelho B após sync
    const replayedB = replayAllEvents([evtSupportB, evtThemeB, evtSoundA, evtThemeA], {
      currentDeviceId: "dev-b",
      now: t2 + 1_000,
    });
    const replayedA = replayAllEvents([evtThemeA, evtThemeB, evtSoundA, evtSupportB], {
      currentDeviceId: "dev-a",
      now: t2 + 1_000,
    });

    expect(replayedA.quarantine).toEqual([]);
    expect(replayedB.quarantine).toEqual([]);

    expect(resolveThemeModeFromSettings(replayedB.settings)).toBe("dark");
    expect(resolveSoundEnabledFromSettings(replayedB.settings)).toBe(false);
    expect(resolveSupportModesFromSettings(replayedB.settings)).toEqual(["banners", "daily_ad"]);

    expect(replayedA.settings).toEqual(replayedB.settings);
  });

  it("domus_is_catholic_v1 converge entre aparelhos pela ordem FR-16", () => {
    const t1 = 1_700_000_001_000;
    const t2 = 1_700_000_002_000;

    const evtFalse = {
      ...createSettingChangedEvent(IS_CATHOLIC_SETTING_KEY, false, "dev-a"),
      id: "catholic-1",
      timestamp: t1,
    };
    const evtTrue = {
      ...createSettingChangedEvent(IS_CATHOLIC_SETTING_KEY, true, "dev-b"),
      id: "catholic-2",
      timestamp: t2,
    };

    const replayed = replayAllEvents([evtTrue, evtFalse], {
      currentDeviceId: "dev-a",
      now: t2 + 1_000,
    });
    expect(replayed.quarantine).toEqual([]);
    expect(resolveIsCatholicFromSettings(replayed.settings)).toBe(true);
  });
});

describe("syncIsCatholicIfStrongGroup — guarda de Grupo forte (Story 10.2)", () => {
  it("não lê segredo nem despacha quando modo demo está ativo", async () => {
    const loadStrongGroupSecret = vi.fn(async () => "strong-secret");
    const isStrongGroupSecretValid = vi.fn(() => true);
    const dispatch = vi.fn();

    const result = await syncIsCatholicIfStrongGroup({
      value: true,
      deviceId: "dev-a",
      isDemoActive: true,
      loadStrongGroupSecret,
      isStrongGroupSecretValid,
      dispatch,
    });

    expect(result).toBe(false);
    expect(loadStrongGroupSecret).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("não despacha quando não há segredo de Grupo forte ou ele é inválido", async () => {
    const dispatch = vi.fn();

    const missingResult = await syncIsCatholicIfStrongGroup({
      value: true,
      deviceId: "dev-a",
      isDemoActive: false,
      loadStrongGroupSecret: async () => null,
      isStrongGroupSecretValid: () => true,
      dispatch,
    });
    expect(missingResult).toBe(false);

    const invalidResult = await syncIsCatholicIfStrongGroup({
      value: false,
      deviceId: "dev-a",
      isDemoActive: false,
      loadStrongGroupSecret: async () => "invalid",
      isStrongGroupSecretValid: () => false,
      dispatch,
    });
    expect(invalidResult).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("captura rejeição de loadStrongGroupSecret sem propagar erro e sem despachar", async () => {
    const dispatch = vi.fn();

    const result = await syncIsCatholicIfStrongGroup({
      value: true,
      deviceId: "dev-a",
      isDemoActive: false,
      loadStrongGroupSecret: async () => {
        throw new Error("keystore unavailable");
      },
      isStrongGroupSecretValid: () => true,
      dispatch,
    });

    expect(result).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("despacha SETTING_CHANGED para domus_is_catholic_v1 quando Grupo forte é válido", async () => {
    const dispatch = vi.fn();

    const result = await syncIsCatholicIfStrongGroup({
      value: false,
      deviceId: "dev-a",
      isDemoActive: false,
      loadStrongGroupSecret: async () => "strong-secret",
      isStrongGroupSecretValid: (secret) => secret === "strong-secret",
      dispatch,
    });

    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    const dispatched = dispatch.mock.calls[0]?.[0];
    expect(dispatched?.type).toBe(SETTINGS_EVENTS.SETTING_CHANGED);
    expect(dispatched?.payload.key).toBe(IS_CATHOLIC_SETTING_KEY);
    expect(dispatched?.payload.value).toBe(false);
  });
});
