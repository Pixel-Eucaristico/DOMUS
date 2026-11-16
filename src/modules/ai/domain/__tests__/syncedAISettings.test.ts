import { describe, expect, it } from "vitest";
import {
  SETTINGS_EVENTS,
  createInitialSettingsState,
  createSettingChangedEvent,
  type SettingsState,
} from "@packages/settings";
import { appendGenerated } from "@/src/context/localEventLog";
import { replayAllEvents } from "@/src/context/replay";
import { DEFAULT_AI_DATA_PERMISSIONS, type AISettings } from "../AISettings";
import {
  AI_CUSTOM_PRICES_SETTING_KEY,
  AI_SETTINGS_SETTING_KEY,
  buildAISettingsSeedEvents,
  hasSyncedAISettingsChanged,
  mergeSyncedAISettings,
  pickSyncedAISettings,
  resolveAISettingsFromSettings,
  resolveCustomPricesFromSettings,
} from "../syncedAISettings";

function settingsWith(values: SettingsState["values"]): SettingsState {
  return { values };
}

describe("syncedAISettings — sanitização por allowlist", () => {
  it("pickSyncedAISettings inclui apenas campos permitidos e remove dataPermissions, chaves e systemPromptSent", () => {
    const fullSettings: AISettings & Record<string, unknown> = {
      provider: "claude",
      modelTier: "smart",
      voiceEnabled: true,
      openaiVoice: "nova",
      audioProvider: "openai",
      audioVoice: "alloy",
      autoPlayTTS: true,
      tooltipsEnabled: false,
      visionOCREnabled: true,
      budgetMode: "monthly",
      customBudgets: { openai: 50_000, claude: 0 },
      monthlyBudgets: { gemini: 1_500_000 },
      billingDay: 15,
      isEnabled: true,
      dataPermissions: {
        transactions: true,
        accounts: true,
        categories: true,
        invoices: true,
        wishlist: true,
        gamification: true,
        sync: true,
      },
      apiKeyStatus: { claude: true, openai: true },
      elevenLabsKeyStatus: true,
      systemPromptSent: true,
      oauthToken: "secret-oauth",
      domus_ai_key_claude: "sk-ant-secret",
      tokensUsed: 9999,
    };

    const picked = pickSyncedAISettings(fullSettings);

    expect(picked).toEqual({
      provider: "claude",
      modelTier: "smart",
      voiceEnabled: true,
      openaiVoice: "nova",
      audioProvider: "openai",
      audioVoice: "alloy",
      autoPlayTTS: true,
      tooltipsEnabled: false,
      visionOCREnabled: true,
      budgetMode: "monthly",
      customBudgets: { openai: 50_000, claude: 0 },
      monthlyBudgets: { gemini: 1_500_000 },
      billingDay: 15,
    });

    expect(picked).not.toHaveProperty("dataPermissions");
    expect(picked).not.toHaveProperty("apiKeyStatus");
    expect(picked).not.toHaveProperty("elevenLabsKeyStatus");
    expect(picked).not.toHaveProperty("systemPromptSent");
    expect(picked).not.toHaveProperty("isEnabled");
    expect(picked).not.toHaveProperty("oauthToken");
    expect(picked).not.toHaveProperty("domus_ai_key_claude");
    expect(picked).not.toHaveProperty("tokensUsed");
  });

  it("hasSyncedAISettingsChanged ignora alterações exclusivas em dataPermissions ou systemPromptSent", () => {
    expect(
      hasSyncedAISettingsChanged({
        dataPermissions: { ...DEFAULT_AI_DATA_PERMISSIONS, transactions: true },
      }),
    ).toBe(false);
    expect(hasSyncedAISettingsChanged({ systemPromptSent: true })).toBe(false);
    expect(hasSyncedAISettingsChanged({ isEnabled: true })).toBe(false);

    expect(hasSyncedAISettingsChanged({ provider: "gemini" })).toBe(true);
    expect(hasSyncedAISettingsChanged({ modelTier: "smart" })).toBe(true);
    expect(hasSyncedAISettingsChanged({ autoPlayTTS: true })).toBe(true);
  });
});

describe("syncedAISettings — resolvers e merge", () => {
  it("resolveAISettingsFromSettings descarta campos inválidos e nunca repassa dataPermissions", () => {
    const state = settingsWith({
      [AI_SETTINGS_SETTING_KEY]: {
        provider: "invalido",
        modelTier: "smart",
        billingDay: 40,
        dataPermissions: { transactions: true },
        apiKeyStatus: { openai: true },
      },
    });

    const resolved = resolveAISettingsFromSettings(state);
    expect(resolved).toEqual({ modelTier: "smart" });
    expect(resolved).not.toHaveProperty("provider");
    expect(resolved).not.toHaveProperty("billingDay");
    expect(resolved).not.toHaveProperty("dataPermissions");
    expect(resolved).not.toHaveProperty("apiKeyStatus");

    expect(resolveAISettingsFromSettings(settingsWith({ [AI_SETTINGS_SETTING_KEY]: "invalido" }))).toBeUndefined();
    expect(resolveAISettingsFromSettings(settingsWith({ [AI_SETTINGS_SETTING_KEY]: null }))).toBeUndefined();
    expect(resolveAISettingsFromSettings(createInitialSettingsState())).toBeUndefined();
  });

  it("resolveCustomPricesFromSettings mantém apenas provedores/tiers válidos e valores finitos > 0", () => {
    const state = settingsWith({
      [AI_CUSTOM_PRICES_SETTING_KEY]: {
        openai: { fast: 12.5, smart: -1 },
        invalido: { fast: 10 },
        gemini: { fast: Number.NaN, smart: 0 },
      },
    });

    expect(resolveCustomPricesFromSettings(state)).toEqual({
      openai: { fast: 12.5 },
    });

    expect(
      resolveCustomPricesFromSettings(settingsWith({ [AI_CUSTOM_PRICES_SETTING_KEY]: "invalido" })),
    ).toBeUndefined();
    expect(
      resolveCustomPricesFromSettings(settingsWith({ [AI_CUSTOM_PRICES_SETTING_KEY]: ["openai"] })),
    ).toBeUndefined();
    expect(resolveCustomPricesFromSettings(createInitialSettingsState())).toBeUndefined();
  });

  it("mergeSyncedAISettings preserva dataPermissions, apiKeyStatus, elevenLabsKeyStatus, systemPromptSent e isEnabled locais", () => {
    const localSettings: AISettings = {
      provider: "openai",
      modelTier: "fast",
      apiKeyStatus: { gemini: true },
      elevenLabsKeyStatus: true,
      isEnabled: true,
      dataPermissions: { ...DEFAULT_AI_DATA_PERMISSIONS, transactions: true },
      systemPromptSent: true,
    };

    const merged = mergeSyncedAISettings(localSettings, {
      provider: "gemini",
      modelTier: "smart",
      voiceEnabled: true,
    });

    expect(merged).toEqual({
      provider: "gemini",
      modelTier: "smart",
      voiceEnabled: true,
      apiKeyStatus: { gemini: true },
      elevenLabsKeyStatus: true,
      isEnabled: true,
      dataPermissions: { ...DEFAULT_AI_DATA_PERMISSIONS, transactions: true },
      systemPromptSent: true,
    });
  });
});

describe("syncedAISettings — seed inicial e convergência FR-16", () => {
  it("buildAISettingsSeedEvents gera eventos sanitizados sem dataPermissions nem duplicação", () => {
    const localAI: AISettings = {
      provider: "claude",
      modelTier: "smart",
      apiKeyStatus: { claude: true },
      elevenLabsKeyStatus: true,
      isEnabled: true,
      dataPermissions: { ...DEFAULT_AI_DATA_PERMISSIONS, transactions: true, accounts: true },
      systemPromptSent: true,
      voiceEnabled: true,
    };

    const seed = buildAISettingsSeedEvents({
      allEvents: [],
      deviceId: "dev-a",
      aiSettings: localAI,
      customPrices: { openai: { fast: 14.2 } },
    });

    expect(seed).toHaveLength(2);
    expect(seed.every((e) => e.type === SETTINGS_EVENTS.SETTING_CHANGED)).toBe(true);
    expect(seed.map((e) => e.payload.key)).toEqual([
      AI_SETTINGS_SETTING_KEY,
      AI_CUSTOM_PRICES_SETTING_KEY,
    ]);

    const aiPayloadValue = seed[0].payload.value as Record<string, unknown>;
    expect(aiPayloadValue).toEqual({
      provider: "claude",
      modelTier: "smart",
      voiceEnabled: true,
    });
    expect(aiPayloadValue).not.toHaveProperty("dataPermissions");
    expect(aiPayloadValue).not.toHaveProperty("apiKeyStatus");
    expect(aiPayloadValue).not.toHaveProperty("elevenLabsKeyStatus");
    expect(aiPayloadValue).not.toHaveProperty("systemPromptSent");

    expect(seed[1].payload.value).toEqual({ openai: { fast: 14.2 } });

    const { events: withSeed, added } = appendGenerated([], seed, "dev-a");
    expect(added).toHaveLength(2);

    const secondRun = buildAISettingsSeedEvents({
      allEvents: withSeed,
      deviceId: "dev-a",
      aiSettings: localAI,
      customPrices: { openai: { fast: 14.2 } },
    });
    expect(secondRun).toEqual([]);
  });

  it("converge preferências de IA e preços personalizados entre dois aparelhos via replayAllEvents sem vazar consentimento", () => {
    const t1 = 1_700_000_001_000;
    const t2 = 1_700_000_002_000;

    const evtA = {
      ...createSettingChangedEvent(
        AI_SETTINGS_SETTING_KEY,
        pickSyncedAISettings({
          provider: "gemini",
          modelTier: "fast",
          dataPermissions: { ...DEFAULT_AI_DATA_PERMISSIONS, transactions: true },
        }),
        "dev-a",
      ),
      id: "ai-1",
      timestamp: t1,
    };

    const evtB = {
      ...createSettingChangedEvent(
        AI_SETTINGS_SETTING_KEY,
        pickSyncedAISettings({
          provider: "claude",
          modelTier: "smart",
          apiKeyStatus: { claude: true },
        }),
        "dev-b",
      ),
      id: "ai-2",
      timestamp: t2,
    };

    const evtPricesB = {
      ...createSettingChangedEvent(
        AI_CUSTOM_PRICES_SETTING_KEY,
        { claude: { smart: 48.5 } },
        "dev-b",
      ),
      id: "prices-1",
      timestamp: t2,
    };

    for (const evt of [evtA, evtB, evtPricesB]) {
      const serialized = JSON.stringify(evt);
      expect(serialized).not.toContain("dataPermissions");
      expect(serialized).not.toContain("apiKeyStatus");
      expect(serialized).not.toContain("elevenLabsKeyStatus");
      expect(serialized).not.toContain("systemPromptSent");
    }

    const replayedA = replayAllEvents([evtA, evtB, evtPricesB], {
      currentDeviceId: "dev-a",
      now: t2 + 1_000,
    });
    const replayedB = replayAllEvents([evtPricesB, evtB, evtA], {
      currentDeviceId: "dev-b",
      now: t2 + 1_000,
    });

    expect(replayedA.quarantine).toEqual([]);
    expect(replayedB.quarantine).toEqual([]);

    expect(resolveAISettingsFromSettings(replayedA.settings)).toEqual({
      provider: "claude",
      modelTier: "smart",
    });
    expect(resolveCustomPricesFromSettings(replayedA.settings)).toEqual({
      claude: { smart: 48.5 },
    });
    expect(replayedA.settings).toEqual(replayedB.settings);
  });
});
