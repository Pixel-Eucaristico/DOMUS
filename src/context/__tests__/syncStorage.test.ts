import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GROUP_CODE_KEY,
  STRONG_GROUP_SECRET_KEY,
  SYNC_GROUP_TRACKING_KEY,
  HANDLED_REMOTE_MARKERS_STORAGE_KEY,
  loadGroupCode,
  saveGroupCode,
  clearGroupCode,
  loadStrongGroupSecret,
  saveStrongGroupSecret,
  clearStrongGroupSecret,
  loadHandledRemoteMarkers,
  saveHandledRemoteMarkers,
  _resetGroupCodeMemoryState,
} from "../syncStorage";
import { appAlert } from "@/src/services/appAlert";

vi.mock("@/src/services/appAlert", () => ({
  appAlert: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────
// Módulos nativos substituídos por stubs em memória. vi.hoisted garante que o
// estado exista antes dos vi.mock (que o vitest move para o topo do arquivo).

const mocks = vi.hoisted(() => ({
  secure: new Map<string, string>(),
  legacy: new Map<string, string>(),
  secureFails: { value: false },
  secureWriteFails: { value: false },
  web: new Map<string, string>(),
  webFails: { value: false },
  webRejects: { value: false },
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => {
    if (mocks.secureFails.value) throw new Error("keystore indisponível");
    return mocks.secure.get(key) ?? null;
  }),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    if (mocks.secureFails.value || mocks.secureWriteFails.value) {
      throw new Error("keystore indisponível");
    }
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
    get: vi.fn(async (key: string) => {
      if (mocks.webRejects.value) throw new Error("IndexedDB indisponível");
      return mocks.web.get(key) ?? null;
    }),
    set: vi.fn(async (key: string, value: string) => {
      if (mocks.webRejects.value) throw new Error("IndexedDB indisponível");
      if (mocks.webFails.value) return false;
      mocks.web.set(key, value);
      return true;
    }),
    remove: vi.fn(async (key: string) => {
      mocks.web.delete(key);
    }),
  },
}));

const { secure, legacy, secureFails, secureWriteFails, web, webFails, webRejects } = mocks;

beforeEach(() => {
  secure.clear();
  legacy.clear();
  web.clear();
  secureFails.value = false;
  secureWriteFails.value = false;
  webFails.value = false;
  webRejects.value = false;
  process.env.EXPO_OS = "android";
  _resetGroupCodeMemoryState();
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

  it("se o SecureStore falhar ao gravar, NÃO grava em AsyncStorage, mantém em memória e alerta o usuário uma vez", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    secureFails.value = true;
    await saveGroupCode("ABC234");

    // 1. AsyncStorage NUNCA recebe o código
    expect(legacy.has(GROUP_CODE_KEY)).toBe(false);

    // 2. loadGroupCode retorna a partir da memória volátil (sync continua na sessão)
    expect(await loadGroupCode()).toBe("ABC234");

    // 3. Alerta o usuário uma vez com o texto explicativo
    expect(appAlert).toHaveBeenCalledTimes(1);
    expect(appAlert).toHaveBeenCalledWith(
      "Armazenamento seguro indisponível",
      expect.stringContaining("reabrir o aplicativo")
    );

    // 4. Nova chamada na mesma sessão atualiza memória e não duplica o alerta
    await saveGroupCode("DEF567");
    expect(appAlert).toHaveBeenCalledTimes(1);
    expect(await loadGroupCode()).toBe("DEF567");
    consoleWarnSpy.mockRestore();
  });

  it("saveGroupCode rejeita código vazio ou composto apenas por espaços", async () => {
    await expect(saveGroupCode("")).rejects.toThrow("Código de grupo inválido (vazio).");
    await expect(saveGroupCode("   \n")).rejects.toThrow("Código de grupo inválido (vazio).");
  });

  it("loadGroupCode retorna valor em memória se gravação falhou mas getItemAsync retornar null sem erro (Verification Gap)", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Apenas a gravação falha; a leitura subsequente retorna null normalmente
    secureWriteFails.value = true;
    await saveGroupCode("VOLATILE123");

    // SecureStore.getItemAsync retorna null sem lançar exceção
    expect(await loadGroupCode()).toBe("VOLATILE123");
    consoleWarnSpy.mockRestore();
  });

  it("inMemoryGroupCode tem precedência sobre resíduo legado em AsyncStorage durante sessão ativa", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Simula chave legada antiga em AsyncStorage
    legacy.set(GROUP_CODE_KEY, "OLD_LEGACY");
    secureWriteFails.value = true;

    // Usuário tenta salvar novo código nesta sessão, gravação no SecureStore falha
    await saveGroupCode("NEW_SESSION");

    // A leitura deve retornar o código novo da sessão ativa, e NÃO o antigo legado
    expect(await loadGroupCode()).toBe("NEW_SESSION");
    consoleWarnSpy.mockRestore();
  });

  it("clearGroupCode remove dos armazenamentos e limpa a memória volátil", async () => {
    secure.set(GROUP_CODE_KEY, "ABC234");
    legacy.set(GROUP_CODE_KEY, "ABC234");
    await clearGroupCode();
    expect(secure.has(GROUP_CODE_KEY)).toBe(false);
    expect(legacy.has(GROUP_CODE_KEY)).toBe(false);
    expect(await loadGroupCode()).toBeNull();
  });

  it("clearGroupCode reseta a supressão de alerta permitindo alertar novamente em falha subsequente", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    secureFails.value = true;
    await saveGroupCode("FIRST_FAIL");
    expect(appAlert).toHaveBeenCalledTimes(1);

    // Limpa o código do grupo
    await clearGroupCode();

    // Nova falha deve disparar o alerta novamente
    await saveGroupCode("SECOND_FAIL");
    expect(appAlert).toHaveBeenCalledTimes(2);
    consoleWarnSpy.mockRestore();
  });
});

describe("segredo do grupo forte no nativo (Story 4.3)", () => {
  const SAMPLE_SECRET = "DOMUS1-AAAQ-EAYE-AUDA-OCAJ-BIFQ-YDIO-B4IB-CEQT-CQKR-MFYY-DENB-WHA5-DYPS-NINV-RI";

  it("grava em SecureStore e NUNCA grava em AsyncStorage", async () => {
    await saveStrongGroupSecret(SAMPLE_SECRET);
    expect(secure.get(STRONG_GROUP_SECRET_KEY)).toBe(SAMPLE_SECRET);
    expect(legacy.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
  });

  it("lê exclusivamente do SecureStore", async () => {
    secure.set(STRONG_GROUP_SECRET_KEY, SAMPLE_SECRET);
    expect(await loadStrongGroupSecret()).toBe(SAMPLE_SECRET);
  });

  it("devolve null quando não há segredo gravado", async () => {
    expect(await loadStrongGroupSecret()).toBeNull();
  });

  it("devolve null se SecureStore falhar na leitura e NÃO tenta ler de AsyncStorage", async () => {
    legacy.set(STRONG_GROUP_SECRET_KEY, SAMPLE_SECRET);
    secureFails.value = true;
    expect(await loadStrongGroupSecret()).toBeNull();
  });

  it("lança erro se SecureStore falhar ao gravar e NUNCA grava em AsyncStorage", async () => {
    secureFails.value = true;
    await expect(saveStrongGroupSecret(SAMPLE_SECRET)).rejects.toThrow("keystore indisponível");
    expect(legacy.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
  });

  it("clearStrongGroupSecret remove do SecureStore e limpa resquício de AsyncStorage", async () => {
    secure.set(STRONG_GROUP_SECRET_KEY, SAMPLE_SECRET);
    legacy.set(STRONG_GROUP_SECRET_KEY, SAMPLE_SECRET);
    await clearStrongGroupSecret();
    expect(secure.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
    expect(legacy.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
  });
});

describe("group code na web", () => {
  beforeEach(() => {
    process.env.EXPO_OS = "web";
  });

  it("define a chave correta para o rastreamento de grupos", () => {
    expect(SYNC_GROUP_TRACKING_KEY).toBe("domus_sync_group_tracking_v1");
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

  it("se webSecrets.set retornar false na web, mantém em memória e alerta o usuário uma vez (Verification Gap)", async () => {
    webFails.value = true;
    await saveGroupCode("WEB_VOLATILE");

    expect(appAlert).toHaveBeenCalledTimes(1);
    expect(appAlert).toHaveBeenCalledWith(
      "Armazenamento seguro indisponível",
      expect.stringContaining("reabrir o aplicativo")
    );

    // loadGroupCode recupera da memória
    expect(await loadGroupCode()).toBe("WEB_VOLATILE");

    // Nova chamada não duplica alerta
    await saveGroupCode("WEB_VOLATILE_2");
    expect(appAlert).toHaveBeenCalledTimes(1);
    expect(await loadGroupCode()).toBe("WEB_VOLATILE_2");
  });

  it("se webSecrets.set lançar exceção na web, mantém em memória e alerta o usuário", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    webRejects.value = true;
    await saveGroupCode("WEB_REJECTED");

    expect(appAlert).toHaveBeenCalledTimes(1);
    expect(await loadGroupCode()).toBe("WEB_REJECTED");
    consoleWarnSpy.mockRestore();
  });
});

describe("segredo do grupo forte na web (Story 4.3)", () => {
  const SAMPLE_SECRET = "DOMUS1-AAAQ-EAYE-AUDA-OCAJ-BIFQ-YDIO-B4IB-CEQT-CQKR-MFYY-DENB-WHA5-DYPS-NINV-RI";

  beforeEach(() => {
    process.env.EXPO_OS = "web";
  });

  it("grava em webSecrets e nunca toca AsyncStorage nem SecureStore", async () => {
    await saveStrongGroupSecret(SAMPLE_SECRET);
    expect(web.get(STRONG_GROUP_SECRET_KEY)).toBe(SAMPLE_SECRET);
    expect(legacy.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
    expect(secure.size).toBe(0);
  });

  it("lê de webSecrets", async () => {
    web.set(STRONG_GROUP_SECRET_KEY, SAMPLE_SECRET);
    expect(await loadStrongGroupSecret()).toBe(SAMPLE_SECRET);
  });

  it("clearStrongGroupSecret remove de webSecrets", async () => {
    web.set(STRONG_GROUP_SECRET_KEY, SAMPLE_SECRET);
    await clearStrongGroupSecret();
    expect(web.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
  });
});

describe("marcadores remotos tratados (Story 5.9)", () => {
  it("loadHandledRemoteMarkers retorna array vazio se não houver registros salvos", async () => {
    expect(await loadHandledRemoteMarkers()).toEqual([]);
  });

  it("saveHandledRemoteMarkers e loadHandledRemoteMarkers persistem e recuperam IDs", async () => {
    await saveHandledRemoteMarkers(["marker-1", "marker-2"]);
    expect(legacy.get(HANDLED_REMOTE_MARKERS_STORAGE_KEY)).toBe(
      JSON.stringify(["marker-1", "marker-2"]),
    );

    const loaded = await loadHandledRemoteMarkers();
    expect(loaded).toEqual(["marker-1", "marker-2"]);
  });

  it("saveHandledRemoteMarkers aceita ReadonlySet", async () => {
    const set = new Set(["marker-a", "marker-b"]);
    await saveHandledRemoteMarkers(set);
    expect(await loadHandledRemoteMarkers()).toEqual(["marker-a", "marker-b"]);
  });

  it("loadHandledRemoteMarkers trata payload inválido e devolve array vazio", async () => {
    legacy.set(HANDLED_REMOTE_MARKERS_STORAGE_KEY, "invalid-json{");
    expect(await loadHandledRemoteMarkers()).toEqual([]);
  });
});
