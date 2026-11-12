import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  OCRConfigService,
  OCR_CONFIG_KEY,
  OCR_API_KEY_SECURE_KEY,
  loadSecureApiKey,
  saveSecureApiKey,
  deleteSecureApiKey,
  isWeb,
} from "../ocrConfigService";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  secure: new Map<string, string>(),
  legacy: new Map<string, string>(),
  secureFails: { value: false },
  web: new Map<string, string>(),
  webFails: { value: false },
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => {
    if (mocks.secureFails.value) throw new Error("keystore indisponível");
    return mocks.secure.get(key) ?? null;
  }),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    if (mocks.secureFails.value) throw new Error("keystore indisponível");
    mocks.secure.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    if (mocks.secureFails.value) throw new Error("keystore indisponível");
    mocks.secure.delete(key);
  }),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mocks.legacy.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      mocks.legacy.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      mocks.legacy.delete(key);
    }),
  },
}));

vi.mock("@/src/modules/security/infrastructure/webSecrets", () => ({
  webSecrets: {
    get: vi.fn(async (key: string) => {
      if (mocks.webFails.value) throw new Error("IndexedDB indisponível");
      return mocks.web.get(key) ?? null;
    }),
    set: vi.fn(async (key: string, value: string) => {
      if (mocks.webFails.value) return false;
      mocks.web.set(key, value);
      return true;
    }),
    remove: vi.fn(async (key: string) => {
      mocks.web.delete(key);
    }),
  },
}));

const { secure, legacy, secureFails, web, webFails } = mocks;

beforeEach(() => {
  secure.clear();
  legacy.clear();
  web.clear();
  secureFails.value = false;
  webFails.value = false;
  process.env.EXPO_OS = "android";
  vi.clearAllMocks();
});

describe("OCRConfigService no ambiente nativo (Android/iOS)", () => {
  it("leitura sem chave prévia retorna default com cloudVisionApiKey undefined", async () => {
    legacy.set(OCR_CONFIG_KEY, JSON.stringify({ preferredProvider: "mlkit" }));

    const config = await OCRConfigService.loadConfig();

    expect(config.preferredProvider).toBe("mlkit");
    expect(config.cloudVisionApiKey).toBeUndefined();
    expect(secure.size).toBe(0);
  });

  it("leitura sem qualquer registro no AsyncStorage retorna DEFAULT_CONFIG", async () => {
    const config = await OCRConfigService.loadConfig();

    expect(config.preferredProvider).toBe("mlkit");
    expect(config.cloudVisionApiKey).toBeUndefined();
  });

  it("migra automaticamente a chave legada de AsyncStorage para o SecureStore", async () => {
    const legacyKey = "AIzaSyTestLegacy123456";
    legacy.set(
      OCR_CONFIG_KEY,
      JSON.stringify({
        preferredProvider: "cloudvision",
        cloudVisionApiKey: legacyKey,
        cloudVisionEndpoint: "https://vision.googleapis.com",
      })
    );

    const config = await OCRConfigService.loadConfig();

    // 1. Config carregado tem a chave preservada
    expect(config.cloudVisionApiKey).toBe(legacyKey);
    expect(config.preferredProvider).toBe("cloudvision");
    expect(config.cloudVisionEndpoint).toBe("https://vision.googleapis.com");

    // 2. Chave foi salva com segurança no SecureStore
    expect(secure.get(OCR_API_KEY_SECURE_KEY)).toBe(legacyKey);

    // 3. AsyncStorage foi regravado SEM a chave cloudVisionApiKey
    const storedJson = legacy.get(OCR_CONFIG_KEY);
    expect(storedJson).toBeDefined();
    const storedParsed = JSON.parse(storedJson!);
    expect(storedParsed.cloudVisionApiKey).toBeUndefined();
    expect(storedParsed.preferredProvider).toBe("cloudvision");
    expect(storedParsed.cloudVisionEndpoint).toBe("https://vision.googleapis.com");
    expect(storedJson).not.toContain(legacyKey);
  });

  it("não apaga a chave legada do AsyncStorage se a gravação no SecureStore falhar", async () => {
    const legacyKey = "AIzaSyMustNotBeLost";
    legacy.set(
      OCR_CONFIG_KEY,
      JSON.stringify({
        preferredProvider: "cloudvision",
        cloudVisionApiKey: legacyKey,
      })
    );
    secureFails.value = true;

    const config = await OCRConfigService.loadConfig();

    // Chave ainda é devolvida para não deixar o usuário na mão
    expect(config.cloudVisionApiKey).toBe(legacyKey);
    // Chave NÃO foi apagada do AsyncStorage já que o SecureStore falhou
    const storedJson = legacy.get(OCR_CONFIG_KEY);
    const storedParsed = JSON.parse(storedJson!);
    expect(storedParsed.cloudVisionApiKey).toBe(legacyKey);
  });

  it("leitura após migração lê do SecureStore e mantém AsyncStorage limpo", async () => {
    secure.set(OCR_API_KEY_SECURE_KEY, "AIzaSySecureKeyAfterMigration");
    legacy.set(OCR_CONFIG_KEY, JSON.stringify({ preferredProvider: "cloudvision" }));

    const config = await OCRConfigService.loadConfig();

    expect(config.cloudVisionApiKey).toBe("AIzaSySecureKeyAfterMigration");
    expect(config.preferredProvider).toBe("cloudvision");

    const storedJson = legacy.get(OCR_CONFIG_KEY);
    expect(storedJson).not.toContain("AIzaSySecureKeyAfterMigration");
    const storedParsed = JSON.parse(storedJson!);
    expect(storedParsed.cloudVisionApiKey).toBeUndefined();
  });

  it("setCloudVisionApiKey grava no SecureStore e nunca no AsyncStorage", async () => {
    const newKey = "AIzaSyNewKeyFromUser";
    await OCRConfigService.setCloudVisionApiKey(newKey);

    expect(secure.get(OCR_API_KEY_SECURE_KEY)).toBe(newKey);

    const storedJson = legacy.get(OCR_CONFIG_KEY);
    expect(storedJson).toBeDefined();
    expect(storedJson).not.toContain(newKey);
    const storedParsed = JSON.parse(storedJson!);
    expect(storedParsed.cloudVisionApiKey).toBeUndefined();

    const loaded = await OCRConfigService.loadConfig();
    expect(loaded.cloudVisionApiKey).toBe(newKey);
  });

  it("setCloudVisionApiKey propaga erro se o SecureStore falhar", async () => {
    secureFails.value = true;
    await expect(
      OCRConfigService.setCloudVisionApiKey("AIzaSyFailKey")
    ).rejects.toThrow("keystore indisponível");

    // Não deve ter gravado chave sensível em texto puro no AsyncStorage
    const storedJson = legacy.get(OCR_CONFIG_KEY);
    if (storedJson) {
      expect(storedJson).not.toContain("AIzaSyFailKey");
    }
  });

  it("clearCloudVisionApiKey remove a chave do SecureStore e do AsyncStorage de forma idempotente", async () => {
    secure.set(OCR_API_KEY_SECURE_KEY, "AIzaSyToClear");
    legacy.set(
      OCR_CONFIG_KEY,
      JSON.stringify({
        preferredProvider: "cloudvision",
        cloudVisionApiKey: "legacyResidual",
      })
    );

    await OCRConfigService.clearCloudVisionApiKey();

    expect(secure.has(OCR_API_KEY_SECURE_KEY)).toBe(false);

    const storedJson = legacy.get(OCR_CONFIG_KEY);
    const storedParsed = JSON.parse(storedJson!);
    expect(storedParsed.cloudVisionApiKey).toBeUndefined();

    const loaded = await OCRConfigService.loadConfig();
    expect(loaded.cloudVisionApiKey).toBeUndefined();

    // Segunda chamada idempotente não falha
    await expect(OCRConfigService.clearCloudVisionApiKey()).resolves.toBeUndefined();
  });

  it("setPreferredProvider atualiza AsyncStorage e preserva chave no SecureStore intacta", async () => {
    secure.set(OCR_API_KEY_SECURE_KEY, "AIzaSyPreservedKey");
    legacy.set(OCR_CONFIG_KEY, JSON.stringify({ preferredProvider: "mlkit" }));

    await OCRConfigService.setPreferredProvider("cloudvision");

    expect(secure.get(OCR_API_KEY_SECURE_KEY)).toBe("AIzaSyPreservedKey");
    const storedParsed = JSON.parse(legacy.get(OCR_CONFIG_KEY)!);
    expect(storedParsed.preferredProvider).toBe("cloudvision");
    expect(storedParsed.cloudVisionApiKey).toBeUndefined();

    const loaded = await OCRConfigService.loadConfig();
    expect(loaded.preferredProvider).toBe("cloudvision");
    expect(loaded.cloudVisionApiKey).toBe("AIzaSyPreservedKey");
  });

  it("saveConfig sanitiza cloudVisionApiKey fora do JSON de AsyncStorage", async () => {
    await OCRConfigService.saveConfig({
      preferredProvider: "vision_ai",
      visionAIProvider: "gemini",
      cloudVisionApiKey: "AIzaSyViaSaveConfig",
      cloudVisionEndpoint: "https://custom.endpoint",
    });

    expect(secure.get(OCR_API_KEY_SECURE_KEY)).toBe("AIzaSyViaSaveConfig");

    const storedJson = legacy.get(OCR_CONFIG_KEY)!;
    expect(storedJson).not.toContain("AIzaSyViaSaveConfig");

    const storedParsed = JSON.parse(storedJson);
    expect(storedParsed.preferredProvider).toBe("vision_ai");
    expect(storedParsed.visionAIProvider).toBe("gemini");
    expect(storedParsed.cloudVisionEndpoint).toBe("https://custom.endpoint");
    expect(storedParsed.cloudVisionApiKey).toBeUndefined();
  });

  it("remove espaços em branco (trim) ao salvar a chave", async () => {
    await OCRConfigService.setCloudVisionApiKey("   AIzaSyWithSpaces   \n");
    expect(secure.get(OCR_API_KEY_SECURE_KEY)).toBe("AIzaSyWithSpaces");

    const loaded = await OCRConfigService.loadConfig();
    expect(loaded.cloudVisionApiKey).toBe("AIzaSyWithSpaces");
  });

  it("isCloudVisionConfigured retorna false se a chave for somente espaços em branco", async () => {
    secure.set(OCR_API_KEY_SECURE_KEY, "   ");
    expect(await OCRConfigService.isCloudVisionConfigured()).toBe(false);
    expect(await OCRConfigService.getCloudVisionConfig()).toBeUndefined();
  });

  it("preserva temporariamente a chave legada se saveConfig parcial rodar com SecureStore inacessível", async () => {
    legacy.set(
      OCR_CONFIG_KEY,
      JSON.stringify({
        preferredProvider: "mlkit",
        cloudVisionApiKey: "AIzaSyLegacySurvives",
      })
    );
    // SecureStore falha
    secureFails.value = true;

    // Atualiza apenas o provedor sem alterar a chave
    await OCRConfigService.saveConfig({ preferredProvider: "cloudvision" });

    // A chave ainda permanece no AsyncStorage para não perder os dados
    const stored = JSON.parse(legacy.get(OCR_CONFIG_KEY)!);
    expect(stored.preferredProvider).toBe("cloudvision");
    expect(stored.cloudVisionApiKey).toBe("AIzaSyLegacySurvives");
  });

  it("loadConfig retorna clone de DEFAULT_CONFIG e protege contra mutação acidental", async () => {
    const config1 = await OCRConfigService.loadConfig();
    (config1 as { preferredProvider: string }).preferredProvider = "vision_ai";

    const config2 = await OCRConfigService.loadConfig();
    expect(config2.preferredProvider).toBe("mlkit");
  });

  it("isCloudVisionConfigured retorna true somente quando há chave segura", async () => {
    expect(await OCRConfigService.isCloudVisionConfigured()).toBe(false);

    secure.set(OCR_API_KEY_SECURE_KEY, "AIzaSyActive");
    expect(await OCRConfigService.isCloudVisionConfigured()).toBe(true);

    secure.delete(OCR_API_KEY_SECURE_KEY);
    expect(await OCRConfigService.isCloudVisionConfigured()).toBe(false);
  });

  it("getCloudVisionConfig retorna chave e endpoint correspondentes", async () => {
    legacy.set(
      OCR_CONFIG_KEY,
      JSON.stringify({ cloudVisionEndpoint: "https://vision.example.com" })
    );

    expect(await OCRConfigService.getCloudVisionConfig()).toBeUndefined();

    secure.set(OCR_API_KEY_SECURE_KEY, "AIzaSyEndpointTest");

    const cvConfig = await OCRConfigService.getCloudVisionConfig();
    expect(cvConfig).toEqual({
      apiKey: "AIzaSyEndpointTest",
      endpoint: "https://vision.example.com",
    });
  });

  it("helpers puros interagem diretamente com o SecureStore no nativo", async () => {
    expect(await loadSecureApiKey()).toBeNull();

    await saveSecureApiKey("keyNative123");
    expect(secure.get(OCR_API_KEY_SECURE_KEY)).toBe("keyNative123");
    expect(await loadSecureApiKey()).toBe("keyNative123");

    await deleteSecureApiKey();
    expect(secure.has(OCR_API_KEY_SECURE_KEY)).toBe(false);
    expect(await loadSecureApiKey()).toBeNull();
  });
});

describe("OCRConfigService no ambiente Web (webSecrets)", () => {
  beforeEach(() => {
    process.env.EXPO_OS = "web";
  });

  it("isWeb identifica a plataforma web corretamente", () => {
    expect(isWeb()).toBe(true);
  });

  it("grava em webSecrets e nunca toca o SecureStore nem AsyncStorage em texto puro", async () => {
    const webKey = "AIzaSyWebKeySecret";
    await OCRConfigService.setCloudVisionApiKey(webKey);

    // Chave salva em webSecrets
    expect(web.get(OCR_API_KEY_SECURE_KEY)).toBe(webKey);
    // SecureStore nativo NUNCA foi tocado
    expect(secure.size).toBe(0);

    // AsyncStorage NUNCA gravou a chave em texto puro
    const storedJson = legacy.get(OCR_CONFIG_KEY);
    expect(storedJson).toBeDefined();
    expect(storedJson).not.toContain(webKey);
    const storedParsed = JSON.parse(storedJson!);
    expect(storedParsed.cloudVisionApiKey).toBeUndefined();

    // Carregamento transparente
    const loaded = await OCRConfigService.loadConfig();
    expect(loaded.cloudVisionApiKey).toBe(webKey);
  });

  it("migra automaticamente a chave legada de AsyncStorage para webSecrets na web", async () => {
    const legacyKey = "AIzaSyLegacyOnWeb";
    legacy.set(
      OCR_CONFIG_KEY,
      JSON.stringify({
        preferredProvider: "cloudvision",
        cloudVisionApiKey: legacyKey,
      })
    );

    const config = await OCRConfigService.loadConfig();

    expect(config.cloudVisionApiKey).toBe(legacyKey);
    expect(web.get(OCR_API_KEY_SECURE_KEY)).toBe(legacyKey);
    expect(secure.size).toBe(0);

    const storedJson = legacy.get(OCR_CONFIG_KEY)!;
    expect(storedJson).not.toContain(legacyKey);
    const storedParsed = JSON.parse(storedJson);
    expect(storedParsed.cloudVisionApiKey).toBeUndefined();
  });

  it("lança exceção se webSecrets.set falhar e não apaga a chave legada", async () => {
    webFails.value = true;

    // saveSecureApiKey direto
    await expect(saveSecureApiKey("AIzaSyFailWeb")).rejects.toThrow(
      "Falha ao salvar chave do OCR em webSecrets."
    );

    // Migração em loadConfig com falha em webSecrets
    legacy.set(
      OCR_CONFIG_KEY,
      JSON.stringify({
        preferredProvider: "cloudvision",
        cloudVisionApiKey: "AIzaSyKeepWeb",
      })
    );

    const loaded = await OCRConfigService.loadConfig();
    expect(loaded.cloudVisionApiKey).toBe("AIzaSyKeepWeb");

    // Não removeu do AsyncStorage porque falhou a gravação
    const storedJson = legacy.get(OCR_CONFIG_KEY)!;
    expect(storedJson).toContain("AIzaSyKeepWeb");
  });

  it("clearCloudVisionApiKey remove de webSecrets de forma idempotente", async () => {
    web.set(OCR_API_KEY_SECURE_KEY, "AIzaSyWebToRemove");

    await OCRConfigService.clearCloudVisionApiKey();

    expect(web.has(OCR_API_KEY_SECURE_KEY)).toBe(false);
    expect(await OCRConfigService.loadConfig()).toMatchObject({
      cloudVisionApiKey: undefined,
    });

    await expect(OCRConfigService.clearCloudVisionApiKey()).resolves.toBeUndefined();
  });

  it("helpers puros interagem diretamente com webSecrets na web", async () => {
    expect(await loadSecureApiKey()).toBeNull();

    await saveSecureApiKey("keyWeb123");
    expect(web.get(OCR_API_KEY_SECURE_KEY)).toBe("keyWeb123");
    expect(await loadSecureApiKey()).toBe("keyWeb123");

    await deleteSecureApiKey();
    expect(web.has(OCR_API_KEY_SECURE_KEY)).toBe(false);
    expect(await loadSecureApiKey()).toBeNull();
  });

  it("loadSecureApiKey captura falhas de leitura em webSecrets e retorna null sem crashar", async () => {
    webFails.value = true;
    expect(await loadSecureApiKey()).toBeNull();
  });
});
