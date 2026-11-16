import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockAsyncData, mockAsyncStorage } = vi.hoisted(() => {
  const data = new Map<string, string>();
  return {
    mockAsyncData: data,
    mockAsyncStorage: {
      getItem: vi.fn(async (key: string) => data.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        data.set(key, value);
      }),
    },
  };
});

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: mockAsyncStorage,
}));

import {
  KEY_SYNC_OPT_IN_KEY,
  canShowKeySyncOption,
  getKeySyncOptIn,
  resetKeySyncOptInCache,
  setKeySyncOptIn,
  subscribeKeySyncOptIn,
  type KeyValueStorage,
} from "../keySyncOptIn";

function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage & {
  data: Map<string, string>;
  getItemSpy: ReturnType<typeof vi.fn>;
  setItemSpy: ReturnType<typeof vi.fn>;
} {
  const data = new Map<string, string>(Object.entries(initial));
  const getItemSpy = vi.fn(async (key: string) => data.get(key) ?? null);
  const setItemSpy = vi.fn(async (key: string, value: string) => {
    data.set(key, value);
  });
  return {
    data,
    getItemSpy,
    setItemSpy,
    getItem: getItemSpy,
    setItem: setItemSpy,
  };
}

describe("keySyncOptIn (Story 10.3)", () => {
  const originalExpoOs = process.env.EXPO_OS;

  beforeEach(() => {
    process.env.EXPO_OS = "android";
    resetKeySyncOptInCache();
    mockAsyncData.clear();
    mockAsyncStorage.getItem.mockClear();
    mockAsyncStorage.setItem.mockClear();
  });

  afterEach(() => {
    resetKeySyncOptInCache();
    if (originalExpoOs === undefined) {
      delete process.env.EXPO_OS;
    } else {
      process.env.EXPO_OS = originalExpoOs;
    }
  });

  describe("canShowKeySyncOption", () => {
    it("cobre todas as combinações de isStrongGroup e isWeb", () => {
      expect(canShowKeySyncOption({ isStrongGroup: true, isWeb: false })).toBe(true);
      expect(canShowKeySyncOption({ isStrongGroup: false, isWeb: false })).toBe(false);
      expect(canShowKeySyncOption({ isStrongGroup: true, isWeb: true })).toBe(false);
      expect(canShowKeySyncOption({ isStrongGroup: false, isWeb: true })).toBe(false);
    });

    it("usa process.env.EXPO_OS quando isWeb não é informado", () => {
      process.env.EXPO_OS = "ios";
      expect(canShowKeySyncOption({ isStrongGroup: true })).toBe(true);

      process.env.EXPO_OS = "web";
      expect(canShowKeySyncOption({ isStrongGroup: true })).toBe(false);
    });
  });

  describe("estado inicial e leitura", () => {
    it("retorna false por padrão quando não há valor salvo", async () => {
      const storage = createMemoryStorage();
      await expect(getKeySyncOptIn({ storage, isWeb: false })).resolves.toBe(false);
    });

    it("retorna false sem lançar erro quando storage.getItem falha", async () => {
      const storage: KeyValueStorage = {
        getItem: vi.fn().mockRejectedValue(new Error("read failed")),
        setItem: vi.fn(),
      };
      await expect(getKeySyncOptIn({ storage, isWeb: false })).resolves.toBe(false);
    });

    it.each(["yes", "{invalid json", "TRUE", "1", "", "false"])(
      "trata valor %j como desligado (apenas 'true' ativa)",
      async (raw) => {
        const storage = createMemoryStorage({ [KEY_SYNC_OPT_IN_KEY]: raw });
        await expect(getKeySyncOptIn({ storage, isWeb: false })).resolves.toBe(false);
      },
    );

    it("retorna true quando o valor salvo é exatamente 'true'", async () => {
      const storage = createMemoryStorage({ [KEY_SYNC_OPT_IN_KEY]: "true" });
      await expect(getKeySyncOptIn({ storage, isWeb: false })).resolves.toBe(true);
    });
  });

  describe("toggle em aparelho nativo", () => {
    it("grava 'true' e depois 'false' e notifica assinantes", async () => {
      const storage = createMemoryStorage();
      const listener = vi.fn();
      const unsubscribe = subscribeKeySyncOptIn(listener);

      await expect(setKeySyncOptIn(true, { storage, isWeb: false })).resolves.toBe(true);
      expect(storage.data.get(KEY_SYNC_OPT_IN_KEY)).toBe("true");
      await expect(getKeySyncOptIn({ storage, isWeb: false })).resolves.toBe(true);

      await expect(setKeySyncOptIn(false, { storage, isWeb: false })).resolves.toBe(false);
      expect(storage.data.get(KEY_SYNC_OPT_IN_KEY)).toBe("false");
      await expect(getKeySyncOptIn({ storage, isWeb: false })).resolves.toBe(false);

      expect(listener).toHaveBeenNthCalledWith(1, true);
      expect(listener).toHaveBeenNthCalledWith(2, false);
      unsubscribe();

      await setKeySyncOptIn(true, { storage, isWeb: false });
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("não notifica assinantes nem altera storage em caso de erro de escrita", async () => {
      const listener = vi.fn();
      subscribeKeySyncOptIn(listener);
      const storage: KeyValueStorage = {
        getItem: vi.fn().mockResolvedValue("false"),
        setItem: vi.fn().mockRejectedValue(new Error("write failed")),
      };

      await expect(setKeySyncOptIn(true, { storage, isWeb: false })).rejects.toThrow(
        "write failed",
      );
      expect(listener).not.toHaveBeenCalled();
      await expect(getKeySyncOptIn({ storage, isWeb: false })).resolves.toBe(false);
    });
  });

  describe("bloqueio na web", () => {
    it("retorna false e não toca no storage quando isWeb é true", async () => {
      const storage = createMemoryStorage({ [KEY_SYNC_OPT_IN_KEY]: "true" });
      const listener = vi.fn();
      subscribeKeySyncOptIn(listener);

      await expect(getKeySyncOptIn({ storage, isWeb: true })).resolves.toBe(false);
      await expect(setKeySyncOptIn(true, { storage, isWeb: true })).resolves.toBe(false);

      expect(storage.getItemSpy).not.toHaveBeenCalled();
      expect(storage.setItemSpy).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
    });

    it("retorna false e não toca no storage quando process.env.EXPO_OS === 'web'", async () => {
      process.env.EXPO_OS = "web";
      const storage = createMemoryStorage({ [KEY_SYNC_OPT_IN_KEY]: "true" });
      const listener = vi.fn();
      subscribeKeySyncOptIn(listener);

      await expect(getKeySyncOptIn({ storage })).resolves.toBe(false);
      await expect(setKeySyncOptIn(true, { storage })).resolves.toBe(false);

      expect(storage.getItemSpy).not.toHaveBeenCalled();
      expect(storage.setItemSpy).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("defaultStorage, cache, pending e isolamento de assinantes", () => {
    it("usa cache em memória após a primeira leitura sem options.storage", async () => {
      mockAsyncData.set(KEY_SYNC_OPT_IN_KEY, "true");

      await expect(getKeySyncOptIn()).resolves.toBe(true);
      await expect(getKeySyncOptIn()).resolves.toBe(true);

      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });

    it("deduplica leituras concorrentes enquanto pending está em voo", async () => {
      let resolveRead!: (value: string | null) => void;
      mockAsyncStorage.getItem.mockImplementationOnce(
        () =>
          new Promise<string | null>((resolve) => {
            resolveRead = resolve;
          }),
      );

      const p1 = getKeySyncOptIn();
      const p2 = getKeySyncOptIn();
      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(1);

      resolveRead("true");
      await expect(Promise.all([p1, p2])).resolves.toEqual([true, true]);
    });

    it("atualiza o cache ao gravar via setKeySyncOptIn sem options.storage", async () => {
      await expect(getKeySyncOptIn()).resolves.toBe(false);
      await expect(setKeySyncOptIn(true)).resolves.toBe(true);
      await expect(getKeySyncOptIn()).resolves.toBe(true);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(KEY_SYNC_OPT_IN_KEY, "true");
      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });

    it("gravação durante leitura em voo prevalece sobre o valor lido", async () => {
      let resolveRead!: (value: string | null) => void;
      mockAsyncStorage.getItem.mockImplementationOnce(
        () =>
          new Promise<string | null>((resolve) => {
            resolveRead = resolve;
          }),
      );

      const inFlightRead = getKeySyncOptIn();
      await expect(setKeySyncOptIn(true)).resolves.toBe(true);

      resolveRead("false");
      await expect(inFlightRead).resolves.toBe(true);
      await expect(getKeySyncOptIn()).resolves.toBe(true);
    });

    it("isola assinante que lança erro para não bloquear os demais nem rejeitar setKeySyncOptIn", async () => {
      const badListener = vi.fn(() => {
        throw new Error("listener boom");
      });
      const goodListener = vi.fn();
      subscribeKeySyncOptIn(badListener);
      subscribeKeySyncOptIn(goodListener);

      await expect(setKeySyncOptIn(true)).resolves.toBe(true);
      expect(badListener).toHaveBeenCalledWith(true);
      expect(goodListener).toHaveBeenCalledWith(true);
    });
  });
});
