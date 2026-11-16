import { describe, expect, it } from "vitest";
import {
  SETTINGS_EVENTS,
  createInitialSettingsState,
  createSettingChangedEvent,
  type SettingsState,
} from "@packages/settings";
import { appendGenerated } from "@/src/context/localEventLog";
import { replayAllEvents } from "@/src/context/replay";
import {
  SOUND_ENABLED_SETTING_KEY,
  SUPPORT_MODES_SETTING_KEY,
  THEME_MODE_SETTING_KEY,
  buildSettingsSeedEvents,
  resolveSoundEnabledFromSettings,
  resolveSupportModesFromSettings,
  resolveThemeModeFromSettings,
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

  it("domus_is_catholic_v1 nunca é emitido no seed inicial", () => {
    const seed = buildSettingsSeedEvents({
      allEvents: [],
      deviceId: "dev-a",
      themeMode: null,
      soundEnabled: null,
      supportModes: null,
    });

    expect(seed.every((e) => e.type === SETTINGS_EVENTS.SETTING_CHANGED)).toBe(true);
    expect(seed.some((e) => e.payload.key === "domus_is_catholic_v1")).toBe(false);
    expect(seed.map((e) => e.payload.value)).toEqual(["system", true, ["links"]]);
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
});
