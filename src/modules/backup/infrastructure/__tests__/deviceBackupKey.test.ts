import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEVICE_KEY_STORAGE,
  isWeb,
  loadSecureDeviceKey,
  saveSecureDeviceKey,
  deleteSecureDeviceKey,
  generateDeviceBackupKey,
  getDeviceBackupKey,
  getOrCreateDeviceBackupKey,
  clearDeviceBackupKey,
} from "../deviceBackupKey";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  secure: new Map<string, string>(),
  legacy: new Map<string, string>(),
  secureFails: { value: false },
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

// Na web, webSecrets armazena dados cifrados (com prefixo v1:) no próprio AsyncStorage
vi.mock("@/src/modules/security/infrastructure/webSecrets", () => ({
  webSecrets: {
    get: vi.fn(async (key: string) => {
      if (mocks.webFails.value) throw new Error("IndexedDB indisponível");
      const stored = mocks.legacy.get(key);
      if (!stored) return null;
      if (stored.startsWith("v1:")) {
        return stored.slice(3); // Simula decifragem
      }
      // Valor legado em texto puro: migra automaticamente para a forma cifrada
      mocks.legacy.set(key, `v1:${stored}`);
      return stored;
    }),
    set: vi.fn(async (key: string, value: string) => {
      if (mocks.webFails.value) return false;
      mocks.legacy.set(key, `v1:${value}`); // Persiste cifrado no AsyncStorage
      return true;
    }),
    remove: vi.fn(async (key: string) => {
      mocks.legacy.delete(key);
    }),
  },
}));

const { secure, legacy, secureFails, webFails } = mocks;

beforeEach(() => {
  secure.clear();
  legacy.clear();
  secureFails.value = false;
  webFails.value = false;
  process.env.EXPO_OS = "android";
  vi.clearAllMocks();
});

describe("deviceBackupKey no ambiente nativo (Android/iOS)", () => {
  it("getDeviceBackupKey retorna null quando nenhum armazenamento possui a chave", async () => {
    const key = await getDeviceBackupKey();
    expect(key).toBeNull();
    expect(secure.size).toBe(0);
    expect(legacy.size).toBe(0);
  });

  it("getDeviceBackupKey lê do SecureStore e limpa resíduo de AsyncStorage se existir", async () => {
    secure.set(DEVICE_KEY_STORAGE, "ABCDEF-GHJKLM-NPQRST-UVWXYZ");
    legacy.set(DEVICE_KEY_STORAGE, "resíduo_antigo");

    const key = await getDeviceBackupKey();
    expect(key).toBe("ABCDEF-GHJKLM-NPQRST-UVWXYZ");

    // Limpou resíduo de AsyncStorage no nativo
    expect(legacy.has(DEVICE_KEY_STORAGE)).toBe(false);
  });

  it("migra automaticamente a chave legada de AsyncStorage para o SecureStore mantendo valor idêntico", async () => {
    const legacyKey = "ABCDEF-GHJKLM-NPQRST-UVWXYZ";
    legacy.set(DEVICE_KEY_STORAGE, legacyKey);

    const key = await getDeviceBackupKey();

    // 1. Valor retornado é estritamente o mesmo (garante restauração de backups pré-existentes)
    expect(key).toBe(legacyKey);

    // 2. Chave foi salva em SecureStore
    expect(secure.get(DEVICE_KEY_STORAGE)).toBe(legacyKey);

    // 3. Chave foi removida do AsyncStorage
    expect(legacy.has(DEVICE_KEY_STORAGE)).toBe(false);
  });

  it("não apaga a chave legada de AsyncStorage se a gravação no SecureStore falhar durante a migração", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const legacyKey = "IMPORTANT-LEGACY-KEY-DO-NOT-LOSE";
    legacy.set(DEVICE_KEY_STORAGE, legacyKey);
    secureFails.value = true;

    const key = await getDeviceBackupKey();

    // Retorna a chave para não deixar o backup órfão
    expect(key).toBe(legacyKey);

    // AsyncStorage ainda preserva a chave para retentar no próximo boot
    expect(legacy.get(DEVICE_KEY_STORAGE)).toBe(legacyKey);
    consoleErrorSpy.mockRestore();
  });

  it("cai para a chave legada se a leitura do SecureStore lançar erro e existir chave legada", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const legacyKey = "FALLBACK-KEY-123456";
    legacy.set(DEVICE_KEY_STORAGE, legacyKey);
    secureFails.value = true;

    const key = await getDeviceBackupKey();
    expect(key).toBe(legacyKey);
    consoleErrorSpy.mockRestore();
  });

  it("getOrCreateDeviceBackupKey migra chave legada de AsyncStorage sem gerar nova chave (Verification Gap)", async () => {
    const legacyKey = "LEGACY-SAVED-KEY-987654";
    legacy.set(DEVICE_KEY_STORAGE, legacyKey);

    const key = await getOrCreateDeviceBackupKey();

    // Retorna a chave legada exata
    expect(key).toBe(legacyKey);

    // Gravou no SecureStore
    expect(secure.get(DEVICE_KEY_STORAGE)).toBe(legacyKey);

    // Expurga o texto puro do AsyncStorage
    expect(legacy.has(DEVICE_KEY_STORAGE)).toBe(false);
  });

  it("getOrCreateDeviceBackupKey retorna chave pré-existente sem gerar nova", async () => {
    secure.set(DEVICE_KEY_STORAGE, "ALREADY-EXISTS-KEY-123456");

    const key = await getOrCreateDeviceBackupKey();
    expect(key).toBe("ALREADY-EXISTS-KEY-123456");
  });

  it("getOrCreateDeviceBackupKey falha e não sobrescreve a chave se a leitura do SecureStore lançar erro", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    secure.set(DEVICE_KEY_STORAGE, "EXISTING-SECURE-KEY");
    // SecureStore lança erro transitório na leitura
    secureFails.value = true;

    // Deve propagar erro e NÃO gerar uma chave nova por engano
    await expect(getOrCreateDeviceBackupKey()).rejects.toThrow("keystore indisponível");

    // A chave pré-existente não foi destruída
    expect(secure.get(DEVICE_KEY_STORAGE)).toBe("EXISTING-SECURE-KEY");
    consoleErrorSpy.mockRestore();
  });

  it("chamadas simultâneas a getOrCreateDeviceBackupKey geram apenas uma chave e retornam o mesmo valor", async () => {
    const [key1, key2] = await Promise.all([
      getOrCreateDeviceBackupKey(),
      getOrCreateDeviceBackupKey(),
    ]);

    expect(key1).toBe(key2);
    expect(secure.get(DEVICE_KEY_STORAGE)).toBe(key1);
  });

  it("getOrCreateDeviceBackupKey gera nova chave de 24 caracteres e salva exclusivamente no SecureStore", async () => {
    const key = await getOrCreateDeviceBackupKey();

    // Formato: 24 caracteres alfanuméricos divididos por 3 hífens (4 blocos de 6)
    expect(key).toMatch(/^[A-Z2-9]{6}-[A-Z2-9]{6}-[A-Z2-9]{6}-[A-Z2-9]{6}$/);

    // Salva no SecureStore
    expect(secure.get(DEVICE_KEY_STORAGE)).toBe(key);

    // NUNCA salva no AsyncStorage
    expect(legacy.has(DEVICE_KEY_STORAGE)).toBe(false);

    // Próxima chamada retorna a mesma chave gerada
    const secondCall = await getOrCreateDeviceBackupKey();
    expect(secondCall).toBe(key);
  });

  it("generateDeviceBackupKey gera chave com formato esperado e caracteres válidos", () => {
    const key = generateDeviceBackupKey();
    expect(key.length).toBe(27); // 24 chars + 3 hífens
    expect(key.split("-")).toHaveLength(4);
    for (const block of key.split("-")) {
      expect(block.length).toBe(6);
      expect(block).not.toMatch(/[0O1I]/); // Sem ambiguidades
    }
  });

  it("saveSecureDeviceKey rejeita chaves vazias ou com apenas espaços", async () => {
    await expect(saveSecureDeviceKey("")).rejects.toThrow("Chave de dispositivo inválida (vazia).");
    await expect(saveSecureDeviceKey("   ")).rejects.toThrow("Chave de dispositivo inválida (vazia).");
  });

  it("saveSecureDeviceKey remove espaços e grava no SecureStore", async () => {
    await saveSecureDeviceKey("   TRIMMED-KEY-123456   \n");
    expect(secure.get(DEVICE_KEY_STORAGE)).toBe("TRIMMED-KEY-123456");
    expect(await loadSecureDeviceKey()).toBe("TRIMMED-KEY-123456");

    await deleteSecureDeviceKey();
    expect(secure.has(DEVICE_KEY_STORAGE)).toBe(false);
    expect(await loadSecureDeviceKey()).toBeNull();
  });

  it("clearDeviceBackupKey remove do SecureStore e do AsyncStorage de forma idempotente", async () => {
    secure.set(DEVICE_KEY_STORAGE, "TO-DELETE");
    legacy.set(DEVICE_KEY_STORAGE, "TO-DELETE-LEGACY");

    await clearDeviceBackupKey();

    expect(secure.has(DEVICE_KEY_STORAGE)).toBe(false);
    expect(legacy.has(DEVICE_KEY_STORAGE)).toBe(false);
    expect(await getDeviceBackupKey()).toBeNull();

    // Segunda chamada idempotente não lança erro
    await expect(clearDeviceBackupKey()).resolves.toBeUndefined();
  });
});

describe("deviceBackupKey no ambiente Web (webSecrets)", () => {
  beforeEach(() => {
    process.env.EXPO_OS = "web";
  });

  it("isWeb identifica a plataforma web", () => {
    expect(isWeb()).toBe(true);
  });

  it("grava em webSecrets cifrado no AsyncStorage e NUNCA apaga o ciphertext", async () => {
    const key = await getOrCreateDeviceBackupKey();

    // webSecrets gravou o ciphertext (prefixado com v1:) no AsyncStorage
    expect(legacy.get(DEVICE_KEY_STORAGE)).toBe(`v1:${key}`);

    // SecureStore nativo NUNCA foi tocado
    expect(secure.size).toBe(0);

    // Leitura transparente descriptografa corretamente
    expect(await getDeviceBackupKey()).toBe(key);

    // Certifica que nova leitura NÃO deletou o ciphertext de AsyncStorage
    expect(legacy.get(DEVICE_KEY_STORAGE)).toBe(`v1:${key}`);
  });

  it("migra chave legada em texto puro de AsyncStorage para webSecrets cifrado", async () => {
    const legacyKey = "WEB-LEGACY-KEY-123456";
    // Salva em texto puro antigo no AsyncStorage
    legacy.set(DEVICE_KEY_STORAGE, legacyKey);

    const key = await getDeviceBackupKey();

    // Valor decifrado é idêntico
    expect(key).toBe(legacyKey);

    // No AsyncStorage, agora está cifrado com v1:
    expect(legacy.get(DEVICE_KEY_STORAGE)).toBe(`v1:${legacyKey}`);

    // SecureStore nativo NUNCA foi tocado
    expect(secure.size).toBe(0);
  });

  it("getOrCreateDeviceBackupKey na web preserva e migra chave legada", async () => {
    const legacyKey = "WEB-LEGACY-FOR-GET-OR-CREATE";
    legacy.set(DEVICE_KEY_STORAGE, legacyKey);

    const key = await getOrCreateDeviceBackupKey();

    expect(key).toBe(legacyKey);
    expect(legacy.get(DEVICE_KEY_STORAGE)).toBe(`v1:${legacyKey}`);
  });

  it("saveSecureDeviceKey lança erro na web se webSecrets.set retornar false", async () => {
    webFails.value = true;
    await expect(saveSecureDeviceKey("FAIL-WEB-KEY")).rejects.toThrow(
      "Falha ao salvar chave do dispositivo em webSecrets."
    );
  });

  it("loadSecureDeviceKey propaga falha de webSecrets", async () => {
    webFails.value = true;
    await expect(loadSecureDeviceKey()).rejects.toThrow("IndexedDB indisponível");
  });

  it("clearDeviceBackupKey remove de webSecrets de forma idempotente", async () => {
    legacy.set(DEVICE_KEY_STORAGE, "v1:WEB-KEY-TO-CLEAR");
    await clearDeviceBackupKey();

    expect(legacy.has(DEVICE_KEY_STORAGE)).toBe(false);
    expect(await getDeviceBackupKey()).toBeNull();
  });

  it("getDeviceBackupKey ignora legado só com espaços no fallback do SecureStore", async () => {
    process.env.EXPO_OS = "android";
    mocks.secureFails.value = true;
    legacy.set(DEVICE_KEY_STORAGE, "   \n  ");

    await expect(getDeviceBackupKey()).rejects.toThrow("keystore indisponível");
  });

  it("clearDeviceBackupKey cancela geração concorrente de getOrCreateDeviceBackupKey", async () => {
    process.env.EXPO_OS = "android";
    const p1 = getOrCreateDeviceBackupKey();
    const p2 = clearDeviceBackupKey();

    await Promise.allSettled([p1, p2]);
    expect(secure.has(DEVICE_KEY_STORAGE)).toBe(false);
    expect(legacy.has(DEVICE_KEY_STORAGE)).toBe(false);
  });
});
