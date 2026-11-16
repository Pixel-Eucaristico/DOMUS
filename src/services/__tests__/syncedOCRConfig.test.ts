import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SETTINGS_EVENTS,
  createInitialSettingsState,
  createSettingChangedEvent,
  type SettingsState,
} from "@packages/settings";
import { replayAllEvents } from "@/src/context/replay";
import {
  OCR_CONFIG_SETTING_KEY,
  buildOCRConfigSeedEvents,
  hasSyncedOCRConfigChanged,
  pickSyncedOCRConfig,
  resolveOCRConfigFromSettings,
} from "../syncedOCRConfig";
import {
  OCRConfigService,
  OCR_API_KEY_SECURE_KEY,
  OCR_CONFIG_KEY,
} from "../ocrConfigService";

// ─── Mocks de armazenamento para testes de OCRConfigService ──────────────────

const mocks = vi.hoisted(() => ({
  secure: new Map<string, string>(),
  asyncStorage: new Map<string, string>(),
  web: new Map<string, string>(),
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => mocks.secure.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    mocks.secure.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    mocks.secure.delete(key);
  }),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mocks.asyncStorage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      mocks.asyncStorage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      mocks.asyncStorage.delete(key);
    }),
  },
}));

vi.mock("@/src/modules/security/infrastructure/webSecrets", () => ({
  webSecrets: {
    get: vi.fn(async (key: string) => mocks.web.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      mocks.web.set(key, value);
      return true;
    }),
    remove: vi.fn(async (key: string) => {
      mocks.web.delete(key);
    }),
  },
}));

function settingsWith(values: SettingsState["values"]): SettingsState {
  return { values };
}

function assertNoKeyFields(obj: unknown): void {
  const serialized = JSON.stringify(obj) ?? "";
  expect(serialized).not.toMatch(/cloudVisionApiKey/i);
  expect(serialized).not.toMatch(/apiKey/i);
  expect(serialized).not.toMatch(/secret/i);
  if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
    for (const key of Object.keys(obj)) {
      expect(key).not.toMatch(/key/i);
    }
  }
}

describe("syncedOCRConfig — sanitização estrita por allowlist", () => {
  it("pickSyncedOCRConfig inclui apenas preferredProvider, cloudVisionEndpoint e visionAIProvider e descarta chaves", () => {
    const input = {
      preferredProvider: "cloudvision",
      cloudVisionEndpoint: "https://vision.example.com",
      visionAIProvider: "gemini",
      cloudVisionApiKey: "AIzaSecret",
      apiKey: "x",
      secretToken: "y",
      extraField: true,
    };

    const picked = pickSyncedOCRConfig(input);

    expect(picked).toEqual({
      preferredProvider: "cloudvision",
      cloudVisionEndpoint: "https://vision.example.com",
      visionAIProvider: "gemini",
    });
    assertNoKeyFields(picked);
  });

  it("descarta valores inválidos ou entradas não-objeto", () => {
    expect(pickSyncedOCRConfig(null)).toEqual({});
    expect(pickSyncedOCRConfig("cloudvision")).toEqual({});
    expect(
      pickSyncedOCRConfig({
        preferredProvider: "invalido",
        visionAIProvider: "outro",
        cloudVisionEndpoint: "   ",
        cloudVisionApiKey: "AIzaSecret",
      }),
    ).toEqual({});
  });

  it("hasSyncedOCRConfigChanged retorna false para alterações exclusivas de chave", () => {
    expect(hasSyncedOCRConfigChanged({ cloudVisionApiKey: "AIzaSecret" })).toBe(false);
    expect(hasSyncedOCRConfigChanged({ apiKey: "abc" })).toBe(false);
    expect(hasSyncedOCRConfigChanged({ preferredProvider: "tesseract" })).toBe(true);
    expect(
      hasSyncedOCRConfigChanged({
        preferredProvider: "cloudvision",
        cloudVisionApiKey: "AIzaSecret",
      }),
    ).toBe(true);
  });

  it("resolveOCRConfigFromSettings extrai configuração sanitizada e ignora chaves injetadas", () => {
    const settings = settingsWith({
      [OCR_CONFIG_SETTING_KEY]: {
        preferredProvider: "vision_ai",
        visionAIProvider: "claude",
        cloudVisionApiKey: "AIzaInjected",
      },
    });

    const resolved = resolveOCRConfigFromSettings(settings);
    expect(resolved).toEqual({
      preferredProvider: "vision_ai",
      visionAIProvider: "claude",
    });
    assertNoKeyFields(resolved);
  });

  it("resolveOCRConfigFromSettings retorna undefined quando ausente ou inválido", () => {
    expect(resolveOCRConfigFromSettings(createInitialSettingsState())).toBeUndefined();
    expect(
      resolveOCRConfigFromSettings(settingsWith({ [OCR_CONFIG_SETTING_KEY]: "bad" })),
    ).toBeUndefined();
  });
});

describe("syncedOCRConfig — seed inicial pós-initialSyncReady", () => {
  it("buildOCRConfigSeedEvents gera 1 evento SETTING_CHANGED sem cloudVisionApiKey", () => {
    const seed = buildOCRConfigSeedEvents({
      allEvents: [],
      deviceId: "dev-a",
      ocrConfig: {
        preferredProvider: "cloudvision",
        cloudVisionEndpoint: "https://vision.example.com",
        cloudVisionApiKey: "AIzaSecret",
      },
    });

    expect(seed).toHaveLength(1);
    expect(seed[0].type).toBe(SETTINGS_EVENTS.SETTING_CHANGED);
    expect(seed[0].payload.key).toBe(OCR_CONFIG_SETTING_KEY);
    expect(seed[0].payload.value).toEqual({
      preferredProvider: "cloudvision",
      cloudVisionEndpoint: "https://vision.example.com",
    });
    assertNoKeyFields(seed[0].payload.value);
  });

  it("não duplica evento quando @domus:ocr_config já existe no log", () => {
    const existing = {
      ...createSettingChangedEvent(
        OCR_CONFIG_SETTING_KEY,
        { preferredProvider: "tesseract" },
        "dev-remote",
      ),
      timestamp: 1000,
    };

    const seed = buildOCRConfigSeedEvents({
      allEvents: [existing],
      deviceId: "dev-a",
      ocrConfig: {
        preferredProvider: "cloudvision",
        cloudVisionApiKey: "AIzaSecret",
      },
    });

    expect(seed).toEqual([]);
  });
});

describe("syncedOCRConfig — convergência FR-16 via replayAllEvents", () => {
  it("converge dois aparelhos para o último timestamp sem vazar cloudVisionApiKey", () => {
    const evtA = {
      ...createSettingChangedEvent(
        OCR_CONFIG_SETTING_KEY,
        pickSyncedOCRConfig({
          preferredProvider: "tesseract",
          cloudVisionApiKey: "AIzaSecretA",
        }),
        "dev-a",
      ),
      timestamp: 1000,
    };
    const evtB = {
      ...createSettingChangedEvent(
        OCR_CONFIG_SETTING_KEY,
        pickSyncedOCRConfig({
          preferredProvider: "vision_ai",
          visionAIProvider: "claude",
          cloudVisionApiKey: "AIzaSecretB",
        }),
        "dev-b",
      ),
      timestamp: 2000,
    };

    assertNoKeyFields(evtA.payload.value);
    assertNoKeyFields(evtB.payload.value);

    const replayAB = replayAllEvents([evtA, evtB]);
    const replayBA = replayAllEvents([evtB, evtA]);

    expect(replayAB.quarantine).toEqual([]);
    expect(replayBA.quarantine).toEqual([]);

    const resolvedAB = resolveOCRConfigFromSettings(replayAB.settings);
    const resolvedBA = resolveOCRConfigFromSettings(replayBA.settings);

    expect(resolvedAB).toEqual({
      preferredProvider: "vision_ai",
      visionAIProvider: "claude",
    });
    expect(resolvedBA).toEqual(resolvedAB);
  });
});

describe("OCRConfigService — integração com sync listener, cache e preservação de chave", () => {
  beforeEach(async () => {
    mocks.secure.clear();
    mocks.asyncStorage.clear();
    mocks.web.clear();
    process.env.EXPO_OS = "android";
    await OCRConfigService.resetLocalOCRConfig();
    vi.clearAllMocks();
  });

  it("alteração exclusiva da chave não dispara registerOCRConfigSyncListener", async () => {
    const listener = vi.fn();
    const unsub = OCRConfigService.registerOCRConfigSyncListener(listener);

    try {
      await OCRConfigService.setCloudVisionApiKey("AIzaSecretOnly");
      await OCRConfigService.saveConfig({ cloudVisionApiKey: "AIzaUpdated" });
      await OCRConfigService.clearCloudVisionApiKey();

      expect(listener).not.toHaveBeenCalled();
    } finally {
      unsub();
    }
  });

  it("alteração mista de provedor + chave emite apenas campos permitidos sem cloudVisionApiKey", async () => {
    const listener = vi.fn();
    const unsub = OCRConfigService.registerOCRConfigSyncListener(listener);

    try {
      await OCRConfigService.saveConfig({
        preferredProvider: "cloudvision",
        cloudVisionEndpoint: "https://vision.example.com",
        cloudVisionApiKey: "AIzaSecretMixed",
      });

      expect(listener).toHaveBeenCalledTimes(1);
      const emitted = listener.mock.calls[0][0];
      expect(emitted).toEqual({
        preferredProvider: "cloudvision",
        cloudVisionEndpoint: "https://vision.example.com",
      });
      assertNoKeyFields(emitted);
      expect(mocks.secure.get(OCR_API_KEY_SECURE_KEY)).toBe("AIzaSecretMixed");
    } finally {
      unsub();
    }
  });

  it("applySyncedOCRConfig atualiza loadConfig preservando cloudVisionApiKey local e sem disparar listener", async () => {
    mocks.secure.set(OCR_API_KEY_SECURE_KEY, "AIzaLocalKeyPreserved");
    const listener = vi.fn();
    const unsub = OCRConfigService.registerOCRConfigSyncListener(listener);

    try {
      await OCRConfigService.applySyncedOCRConfig({
        preferredProvider: "vision_ai",
        visionAIProvider: "claude",
      });

      expect(listener).not.toHaveBeenCalled();

      const loaded = await OCRConfigService.loadConfig();
      expect(loaded).toEqual({
        preferredProvider: "vision_ai",
        visionAIProvider: "claude",
        cloudVisionApiKey: "AIzaLocalKeyPreserved",
      });
      expect(mocks.secure.get(OCR_API_KEY_SECURE_KEY)).toBe("AIzaLocalKeyPreserved");

      const storedRaw = mocks.asyncStorage.get(OCR_CONFIG_KEY);
      expect(storedRaw).toBeDefined();
      assertNoKeyFields(JSON.parse(storedRaw!));

      // Segunda aplicação idêntica é no-op
      const setItemCallsBefore = vi.mocked(
        (await import("@react-native-async-storage/async-storage")).default.setItem,
      ).mock.calls.length;
      await OCRConfigService.applySyncedOCRConfig({
        preferredProvider: "vision_ai",
        visionAIProvider: "claude",
      });
      const setItemCallsAfter = vi.mocked(
        (await import("@react-native-async-storage/async-storage")).default.setItem,
      ).mock.calls.length;
      expect(setItemCallsAfter).toBe(setItemCallsBefore);
    } finally {
      unsub();
    }
  });

  it("applySyncedOCRConfig com persist=false (modo demo) usa cache em memória sem gravar no AsyncStorage", async () => {
    mocks.asyncStorage.set(
      OCR_CONFIG_KEY,
      JSON.stringify({ preferredProvider: "mlkit" }),
    );

    await OCRConfigService.applySyncedOCRConfig(
      { preferredProvider: "tesseract" },
      false,
    );

    const demoLoaded = await OCRConfigService.loadConfig();
    expect(demoLoaded.preferredProvider).toBe("tesseract");
    expect(JSON.parse(mocks.asyncStorage.get(OCR_CONFIG_KEY)!)).toEqual({
      preferredProvider: "mlkit",
    });

    OCRConfigService.invalidateSyncedOCRConfigCache();
    const restoredLoaded = await OCRConfigService.loadConfig();
    expect(restoredLoaded.preferredProvider).toBe("mlkit");
  });

  it("getSyncedOCRConfigSnapshot nunca inclui cloudVisionApiKey e retorna null se não salvo", async () => {
    expect(await OCRConfigService.getSyncedOCRConfigSnapshot()).toBeNull();

    mocks.secure.set(OCR_API_KEY_SECURE_KEY, "AIzaSnapshotSecret");
    mocks.asyncStorage.set(
      OCR_CONFIG_KEY,
      JSON.stringify({
        preferredProvider: "cloudvision",
        cloudVisionEndpoint: "https://vision.example.com",
      }),
    );

    const snapshot = await OCRConfigService.getSyncedOCRConfigSnapshot();
    expect(snapshot).toEqual({
      preferredProvider: "cloudvision",
      cloudVisionEndpoint: "https://vision.example.com",
    });
    assertNoKeyFields(snapshot);

    expect(buildOCRConfigSeedEvents({ allEvents: [], deviceId: "dev-a", ocrConfig: null })).toEqual([]);
    expect(buildOCRConfigSeedEvents({ allEvents: [], deviceId: "dev-a", ocrConfig: {} })).toEqual([]);
  });

  it("saveConfig após applySyncedOCRConfig atualiza cache e loadConfig, e limpar endpoint/visionAIProvider emite evento", async () => {
    await OCRConfigService.applySyncedOCRConfig({
      preferredProvider: "cloudvision",
      cloudVisionEndpoint: "https://vision.example.com",
    });

    const listener = vi.fn();
    const unsub = OCRConfigService.registerOCRConfigSyncListener(listener);
    try {
      await OCRConfigService.saveConfig({ cloudVisionEndpoint: "" });
      expect(listener).toHaveBeenCalledWith({ preferredProvider: "cloudvision" });
      expect((await OCRConfigService.loadConfig()).cloudVisionEndpoint).toBeUndefined();
      expect(await OCRConfigService.getSyncedOCRConfigSnapshot()).toEqual({
        preferredProvider: "cloudvision",
      });
    } finally {
      unsub();
    }
  });

  it("applySyncedOCRConfig(persist=true) após persist=false grava no AsyncStorage e migra chave legada antes de sobrescrever", async () => {
    mocks.asyncStorage.set(
      OCR_CONFIG_KEY,
      JSON.stringify({ preferredProvider: "mlkit", cloudVisionApiKey: "AIzaLegacyBeforeSync" }),
    );

    await OCRConfigService.applySyncedOCRConfig({ preferredProvider: "tesseract" }, false);
    // Agora ao sair do modo demo com mesma config e persist=true, deve gravar no AsyncStorage
    await OCRConfigService.applySyncedOCRConfig({ preferredProvider: "tesseract" }, true);
    expect(JSON.parse(mocks.asyncStorage.get(OCR_CONFIG_KEY)!)).toEqual({
      preferredProvider: "tesseract",
    });

    // Testar migração de chave legada quando cache começa vazio (boot direto com sync)
    OCRConfigService.invalidateSyncedOCRConfigCache();
    mocks.secure.clear();
    mocks.asyncStorage.set(
      OCR_CONFIG_KEY,
      JSON.stringify({ preferredProvider: "mlkit", cloudVisionApiKey: "AIzaLegacyDirectBoot" }),
    );
    await OCRConfigService.applySyncedOCRConfig({ preferredProvider: "vision_ai", visionAIProvider: "gemini" }, true);
    expect(mocks.secure.get(OCR_API_KEY_SECURE_KEY)).toBe("AIzaLegacyDirectBoot");
    expect((await OCRConfigService.loadConfig()).cloudVisionApiKey).toBe("AIzaLegacyDirectBoot");
  });

  it("resetLocalOCRConfig remove OCR_CONFIG_KEY do AsyncStorage sem disparar listener", async () => {
    mocks.asyncStorage.set(OCR_CONFIG_KEY, JSON.stringify({ preferredProvider: "tesseract" }));
    const listener = vi.fn();
    const unsub = OCRConfigService.registerOCRConfigSyncListener(listener);
    try {
      await OCRConfigService.resetLocalOCRConfig();
      expect(mocks.asyncStorage.has(OCR_CONFIG_KEY)).toBe(false);
      expect(listener).not.toHaveBeenCalled();
      expect((await OCRConfigService.loadConfig()).preferredProvider).toBe("mlkit");
    } finally {
      unsub();
    }
  });
});
