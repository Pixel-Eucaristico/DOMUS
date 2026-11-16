import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { encodeGroupSecret, generateGroupSecret } from "../groupSecret";
import {
  KEY_SYNC_DISABLE_NOTICE,
  KEY_SYNC_OPT_IN_KEY,
  disableKeySyncOptIn,
  getKeySyncOptIn,
  resetKeySyncOptInCache,
  setKeySyncOptIn,
  toggleKeySyncOptIn,
  type KeyValueStorage,
} from "../keySyncOptIn";
import {
  buildEncryptedKeySyncEvent,
  publishAllLocalKeysIfOptedIn,
  publishEncryptedKeyIfOptedIn,
} from "../keySyncPublisher";
import { applyIncomingKeySyncEvents } from "../keySyncReceiver";

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

describe("desligar o sync de chaves (Story 10.6)", () => {
  const originalExpoOs = process.env.EXPO_OS;
  const secret = generateGroupSecret();
  const encodedSecret = encodeGroupSecret(secret);

  beforeEach(() => {
    process.env.EXPO_OS = "android";
    resetKeySyncOptInCache();
  });

  afterEach(() => {
    resetKeySyncOptInCache();
    if (originalExpoOs === undefined) {
      delete process.env.EXPO_OS;
    } else {
      process.env.EXPO_OS = originalExpoOs;
    }
  });

  it("desliga em aparelho nativo, persiste 'false', emite aviso em pt-BR, interrompe envio/recebimento e preserva o SecureStore", async () => {
    const storage = createMemoryStorage();
    const secureStore = new Map<string, string>([
      ["domus_ai_key_openai", "sk-openai-local-123"],
      ["domus_ocr_cloud_vision_api_key", "AIza-ocr-local-456"],
    ]);
    const dispatch = vi.fn<(event: SyncEvent) => void>();
    const onNotice = vi.fn();

    // 1. Liga o opt-in e publica com sucesso enquanto ligado
    await expect(setKeySyncOptIn(true, { storage, isWeb: false })).resolves.toBe(true);

    const publishedWhileEnabled = await publishEncryptedKeyIfOptedIn({
      slot: "ai:openai",
      apiKey: secureStore.get("domus_ai_key_openai")!,
      deviceId: "dev-1",
      isDemoActive: false,
      isWeb: false,
      getOptIn: () => getKeySyncOptIn({ storage, isWeb: false }),
      loadStrongGroupSecret: async () => encodedSecret,
      dispatch,
    });
    expect(publishedWhileEnabled).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);

    // 2. Desliga o sync de chaves
    const disableResult = await disableKeySyncOptIn({
      storage,
      isWeb: false,
      onNotice,
    });

    expect(disableResult).toEqual({ disabled: true });
    expect(storage.data.get(KEY_SYNC_OPT_IN_KEY)).toBe("false");
    await expect(getKeySyncOptIn({ storage, isWeb: false })).resolves.toBe(false);

    // Aviso obrigatório em pt-BR mencionando relays, troca no provedor e preservação local
    expect(onNotice).toHaveBeenCalledTimes(1);
    expect(onNotice).toHaveBeenCalledWith(KEY_SYNC_DISABLE_NOTICE);
    const notice = onNotice.mock.calls[0][0];
    expect(notice.title).toMatch(/desligada/i);
    expect(notice.message).toMatch(/relays/i);
    expect(notice.message).toMatch(/troque a chave no provedor/i);
    expect(notice.message).toMatch(/armazenamento seguro/i);

    // 3. Envios subsequentes são bloqueados sem chamar dispatch
    dispatch.mockClear();
    const singlePublishAfterDisable = await publishEncryptedKeyIfOptedIn({
      slot: "ai:openai",
      apiKey: "sk-openai-nova-789",
      deviceId: "dev-1",
      isDemoActive: false,
      isWeb: false,
      getOptIn: () => getKeySyncOptIn({ storage, isWeb: false }),
      loadStrongGroupSecret: async () => encodedSecret,
      dispatch,
    });
    expect(singlePublishAfterDisable).toBe(false);

    const bulkPublishAfterDisable = await publishAllLocalKeysIfOptedIn({
      deviceId: "dev-1",
      isDemoActive: false,
      isWeb: false,
      getOptIn: () => getKeySyncOptIn({ storage, isWeb: false }),
      loadStrongGroupSecret: async () => encodedSecret,
      retrieveAIKey: async (provider) => secureStore.get(`domus_ai_key_${provider}`) ?? null,
      loadOCRKey: async () => secureStore.get("domus_ocr_cloud_vision_api_key") ?? null,
      dispatch,
    });
    expect(bulkPublishAfterDisable).toBe(0);
    expect(dispatch).not.toHaveBeenCalled();

    // 4. Recebimento subsequente é ignorado sem decifrar nem sobrescrever o SecureStore
    const incomingEvent = buildEncryptedKeySyncEvent({
      secret,
      slot: "ai:openai",
      apiKey: "sk-openai-remota-999",
      deviceId: "dev-remoto",
    });
    const loadStrongGroupSecret = vi.fn(async () => encodedSecret);
    const storeAIKey = vi.fn(async (provider: string, apiKey: string) => {
      secureStore.set(`domus_ai_key_${provider}`, apiKey);
    });
    const storeOCRKey = vi.fn(async (apiKey: string) => {
      secureStore.set("domus_ocr_cloud_vision_api_key", apiKey);
    });

    const receiveResult = await applyIncomingKeySyncEvents({
      events: [incomingEvent],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: false,
      getOptIn: () => getKeySyncOptIn({ storage, isWeb: false }),
      loadStrongGroupSecret,
      storeAIKey,
      storeOCRKey,
    });

    expect(receiveResult).toEqual({ applied: 0, ignored: 1, rejected: 0 });
    expect(loadStrongGroupSecret).not.toHaveBeenCalled();
    expect(storeAIKey).not.toHaveBeenCalled();
    expect(storeOCRKey).not.toHaveBeenCalled();

    // 5. Chaves pré-existentes no SecureStore permanecem intactas
    expect(secureStore.get("domus_ai_key_openai")).toBe("sk-openai-local-123");
    expect(secureStore.get("domus_ocr_cloud_vision_api_key")).toBe("AIza-ocr-local-456");
  });

  it("rejeita e não chama onNotice quando storage.setItem falha ao desligar", async () => {
    const onNotice = vi.fn();
    const storage: KeyValueStorage = {
      getItem: vi.fn().mockResolvedValue("true"),
      setItem: vi.fn().mockRejectedValue(new Error("disk full")),
    };

    await expect(
      disableKeySyncOptIn({
        storage,
        isWeb: false,
        onNotice,
      }),
    ).rejects.toThrow("disk full");

    expect(onNotice).not.toHaveBeenCalled();
    await expect(getKeySyncOptIn({ storage, isWeb: false })).resolves.toBe(true);
  });

  it("é no-op na web (isWeb: true e EXPO_OS === 'web') sem tocar no storage nem chamar onNotice", async () => {
    const storage = createMemoryStorage({ [KEY_SYNC_OPT_IN_KEY]: "true" });
    const onNotice = vi.fn();

    await expect(
      disableKeySyncOptIn({
        storage,
        isWeb: true,
        onNotice,
      }),
    ).resolves.toEqual({ disabled: false });

    expect(storage.setItemSpy).not.toHaveBeenCalled();
    expect(onNotice).not.toHaveBeenCalled();
    expect(storage.data.get(KEY_SYNC_OPT_IN_KEY)).toBe("true");

    process.env.EXPO_OS = "web";
    await expect(
      disableKeySyncOptIn({
        storage,
        onNotice,
      }),
    ).resolves.toEqual({ disabled: false });

    expect(storage.setItemSpy).not.toHaveBeenCalled();
    expect(onNotice).not.toHaveBeenCalled();
  });

  it("funciona sem onNotice, quando já estava desligado, isola erro no callback e permite religar", async () => {
    const storage = createMemoryStorage();

    await expect(disableKeySyncOptIn({ storage, isWeb: false })).resolves.toEqual({
      disabled: true,
    });
    expect(storage.data.get(KEY_SYNC_OPT_IN_KEY)).toBe("false");

    const throwingNotice = vi.fn(() => {
      throw new Error("ui alert failed");
    });
    await expect(
      disableKeySyncOptIn({
        storage,
        isWeb: false,
        onNotice: throwingNotice,
      }),
    ).resolves.toEqual({ disabled: true });
    expect(throwingNotice).toHaveBeenCalledTimes(1);

    await expect(setKeySyncOptIn(true, { storage, isWeb: false })).resolves.toBe(true);
    await expect(getKeySyncOptIn({ storage, isWeb: false })).resolves.toBe(true);
  });

  describe("toggleKeySyncOptIn", () => {
    it("ativa quando nextValue é true e aciona onEnabled", async () => {
      const storage = createMemoryStorage();
      const setEnabled = vi.fn();
      const onEnabled = vi.fn();
      const onNotice = vi.fn();
      const onError = vi.fn();

      await toggleKeySyncOptIn({
        nextValue: true,
        previousValue: false,
        setEnabled,
        onEnabled,
        onNotice,
        onError,
        storage,
        isWeb: false,
      });

      expect(storage.data.get(KEY_SYNC_OPT_IN_KEY)).toBe("true");
      expect(setEnabled).toHaveBeenCalledWith(true);
      expect(onEnabled).toHaveBeenCalledTimes(1);
      expect(onNotice).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it("desativa quando nextValue é false, chama disableKeySyncOptIn e emite onNotice", async () => {
      const storage = createMemoryStorage({ [KEY_SYNC_OPT_IN_KEY]: "true" });
      const setEnabled = vi.fn();
      const onEnabled = vi.fn();
      const onNotice = vi.fn();
      const onError = vi.fn();

      await toggleKeySyncOptIn({
        nextValue: false,
        previousValue: true,
        setEnabled,
        onEnabled,
        onNotice,
        onError,
        storage,
        isWeb: false,
      });

      expect(storage.data.get(KEY_SYNC_OPT_IN_KEY)).toBe("false");
      expect(setEnabled).toHaveBeenCalledWith(false);
      expect(onNotice).toHaveBeenCalledWith(KEY_SYNC_DISABLE_NOTICE);
      expect(onEnabled).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it("faz rollback para previousValue e chama onError quando a gravação falha", async () => {
      const storage: KeyValueStorage = {
        getItem: vi.fn().mockResolvedValue("true"),
        setItem: vi.fn().mockRejectedValue(new Error("write failed")),
      };
      const setEnabled = vi.fn();
      const onNotice = vi.fn();
      const onError = vi.fn();

      await toggleKeySyncOptIn({
        nextValue: false,
        previousValue: true,
        setEnabled,
        onNotice,
        onError,
        storage,
        isWeb: false,
      });

      expect(setEnabled).toHaveBeenCalledWith(true);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onNotice).not.toHaveBeenCalled();
    });
  });
});
