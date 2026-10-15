import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// Módulos nativos substituídos por stubs em memória. vi.hoisted garante que o
// estado exista antes dos vi.mock (que o vitest move para o topo do arquivo).

const mocks = vi.hoisted(() => ({
  secure: new Map<string, string>(),
  legacy: new Map<string, string>(),
  secureFails: { value: false },
  web: new Map<string, string>(),
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

import { GROUP_CODE_KEY, loadGroupCode, saveGroupCode, clearGroupCode } from "../syncStorage";

const { secure, legacy, secureFails, web } = mocks;

beforeEach(() => {
  secure.clear();
  legacy.clear();
  web.clear();
  secureFails.value = false;
  process.env.EXPO_OS = "android";
  vi.clearAllMocks();
});

describe("group code no nativo", () => {
  it("grava em SecureStore e não deixa cópia em AsyncStorage", async () => {
    await saveGroupCode("ABC234");
    expect(secure.get(GROUP_CODE_KEY)).toBe("ABC234");
    expect(legacy.has(GROUP_CODE_KEY)).toBe(false);
  });

  it("lê do SecureStore", async () => {
    secure.set(GROUP_CODE_KEY, "ABC234");
    expect(await loadGroupCode()).toBe("ABC234");
  });

  it("migra o valor legado de AsyncStorage para SecureStore", async () => {
    legacy.set(GROUP_CODE_KEY, "LEG234");
    expect(await loadGroupCode()).toBe("LEG234");
    expect(secure.get(GROUP_CODE_KEY)).toBe("LEG234");
    expect(legacy.has(GROUP_CODE_KEY)).toBe(false);
  });

  it("mantém o legado se a migração falhar", async () => {
    legacy.set(GROUP_CODE_KEY, "LEG234");
    secureFails.value = true;
    expect(await loadGroupCode()).toBe("LEG234");
    expect(legacy.get(GROUP_CODE_KEY)).toBe("LEG234");
  });

  it("devolve null quando não há group code", async () => {
    expect(await loadGroupCode()).toBeNull();
  });

  it("cai para AsyncStorage se o SecureStore falhar ao gravar", async () => {
    secureFails.value = true;
    await saveGroupCode("ABC234");
    expect(legacy.get(GROUP_CODE_KEY)).toBe("ABC234");
  });

  it("clearGroupCode remove dos dois armazenamentos", async () => {
    secure.set(GROUP_CODE_KEY, "ABC234");
    legacy.set(GROUP_CODE_KEY, "ABC234");
    await clearGroupCode();
    expect(secure.has(GROUP_CODE_KEY)).toBe(false);
    expect(legacy.has(GROUP_CODE_KEY)).toBe(false);
  });
});

describe("group code na web", () => {
  beforeEach(() => {
    process.env.EXPO_OS = "web";
  });

  it("usa webSecrets (cifrado) e nunca AsyncStorage em texto puro", async () => {
    await saveGroupCode("WEB234");
    expect(web.get(GROUP_CODE_KEY)).toBe("WEB234");
    expect(legacy.has(GROUP_CODE_KEY)).toBe(false);
    expect(secure.size).toBe(0);
    expect(await loadGroupCode()).toBe("WEB234");
  });

  it("clearGroupCode remove de webSecrets", async () => {
    web.set(GROUP_CODE_KEY, "WEB234");
    await clearGroupCode();
    expect(web.has(GROUP_CODE_KEY)).toBe(false);
  });
});
