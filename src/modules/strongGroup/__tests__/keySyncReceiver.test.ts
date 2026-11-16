import { afterEach, describe, expect, it, vi } from "vitest";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { encodeGroupSecret, generateGroupSecret } from "../groupSecret";
import { buildEncryptedKeySyncEvent } from "../keySyncPublisher";
import { applyIncomingKeySyncEvents } from "../keySyncReceiver";
import { selectEventsToImport } from "@/src/modules/syncPayload";

function makeNonKeyEvent(): SyncEvent {
  return {
    id: "tx-1",
    type: "TRANSACTION_CREATED",
    payload: { amount: 100 },
    timestamp: 1000,
    deviceId: "dev-1",
    signature: "",
  };
}

describe("keySyncReceiver", () => {
  const secret = generateGroupSecret();
  const encodedSecret = encodeGroupSecret(secret);
  const otherSecret = generateGroupSecret();
  const originalExpoOs = process.env.EXPO_OS;

  afterEach(() => {
    if (originalExpoOs === undefined) {
      delete process.env.EXPO_OS;
    } else {
      process.env.EXPO_OS = originalExpoOs;
    }
  });

  it("round-trip nativo + opt-in + Grupo forte decifra e grava chaves de IA e OCR nos locais esperados", async () => {
    const aiStore = new Map<string, string>();
    let ocrStore: string | null = null;

    const aiEvent = buildEncryptedKeySyncEvent({
      secret,
      slot: "ai:openai",
      apiKey: "sk-openai-roundtrip-123",
      deviceId: "dev-sender",
    });
    const ocrEvent = buildEncryptedKeySyncEvent({
      secret,
      slot: "ocr:cloud_vision",
      apiKey: "AIza-ocr-roundtrip-456",
      deviceId: "dev-sender",
    });

    const result = await applyIncomingKeySyncEvents({
      events: [makeNonKeyEvent(), aiEvent, ocrEvent],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      storeAIKey: async (provider, apiKey) => {
        aiStore.set(`domus_ai_key_${provider}`, apiKey);
      },
      storeOCRKey: async (apiKey) => {
        ocrStore = apiKey;
      },
    });

    expect(result).toEqual({ applied: 2, ignored: 0, rejected: 0 });
    expect(aiStore.get("domus_ai_key_openai")).toBe("sk-openai-roundtrip-123");
    expect(ocrStore).toBe("AIza-ocr-roundtrip-456");
  });

  it("aceita payload serializado como string JSON", async () => {
    const aiEvent = buildEncryptedKeySyncEvent({
      secret,
      slot: "ai:gemini",
      apiKey: "AIza-gemini-json-789",
      deviceId: "dev-sender",
    });
    const stringifiedEvent: SyncEvent = {
      ...aiEvent,
      payload: JSON.stringify(aiEvent.payload),
    };

    const storeAIKey = vi.fn(async () => undefined);
    const storeOCRKey = vi.fn(async () => undefined);

    const result = await applyIncomingKeySyncEvents({
      events: [stringifiedEvent],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      storeAIKey,
      storeOCRKey,
    });

    expect(result).toEqual({ applied: 1, ignored: 0, rejected: 0 });
    expect(storeAIKey).toHaveBeenCalledWith("gemini", "AIza-gemini-json-789");
    expect(storeOCRKey).not.toHaveBeenCalled();
  });

  it("ignora sem ler segredo nem gravar quando opt-in está desligado", async () => {
    const evt = buildEncryptedKeySyncEvent({
      secret,
      slot: "ai:openai",
      apiKey: "sk-should-not-apply",
      deviceId: "dev-sender",
    });

    const loadStrongGroupSecret = vi.fn(async () => encodedSecret);
    const storeAIKey = vi.fn(async () => undefined);
    const storeOCRKey = vi.fn(async () => undefined);

    const result = await applyIncomingKeySyncEvents({
      events: [evt],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => false,
      loadStrongGroupSecret,
      storeAIKey,
      storeOCRKey,
    });

    expect(result).toEqual({ applied: 0, ignored: 1, rejected: 0 });
    expect(loadStrongGroupSecret).not.toHaveBeenCalled();
    expect(storeAIKey).not.toHaveBeenCalled();
    expect(storeOCRKey).not.toHaveBeenCalled();
  });

  it("ignora imediatamente no navegador web (isWeb: true e EXPO_OS = 'web') mesmo com opt-in mockado true", async () => {
    const evt = buildEncryptedKeySyncEvent({
      secret,
      slot: "ocr:cloud_vision",
      apiKey: "AIza-web-blocked",
      deviceId: "dev-sender",
    });

    const getOptIn = vi.fn(async () => true);
    const loadStrongGroupSecret = vi.fn(async () => encodedSecret);
    const storeAIKey = vi.fn(async () => undefined);
    const storeOCRKey = vi.fn(async () => undefined);

    const resultFlag = await applyIncomingKeySyncEvents({
      events: [evt],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: true,
      getOptIn,
      loadStrongGroupSecret,
      storeAIKey,
      storeOCRKey,
    });

    expect(resultFlag).toEqual({ applied: 0, ignored: 1, rejected: 0 });
    expect(getOptIn).not.toHaveBeenCalled();
    expect(loadStrongGroupSecret).not.toHaveBeenCalled();
    expect(storeOCRKey).not.toHaveBeenCalled();

    process.env.EXPO_OS = "web";
    const resultEnv = await applyIncomingKeySyncEvents({
      events: [evt],
      isStrongGroup: true,
      isDemoActive: false,
      getOptIn,
      loadStrongGroupSecret,
      storeAIKey,
      storeOCRKey,
    });

    expect(resultEnv).toEqual({ applied: 0, ignored: 1, rejected: 0 });
    expect(storeOCRKey).not.toHaveBeenCalled();
  });

  it("ignora eventos do Grupo antigo (isStrongGroup: false) e selectEventsToImport também os descarta", async () => {
    const evt = buildEncryptedKeySyncEvent({
      secret,
      slot: "ai:claude",
      apiKey: "sk-ant-old-group",
      deviceId: "dev-sender",
    });

    const oldImport = selectEventsToImport([evt], new Set(), undefined, {
      isStrongGroup: false,
    });
    expect(oldImport.toAppend).toHaveLength(0);

    const getOptIn = vi.fn(async () => true);
    const loadStrongGroupSecret = vi.fn(async () => encodedSecret);
    const storeAIKey = vi.fn(async () => undefined);
    const storeOCRKey = vi.fn(async () => undefined);

    const result = await applyIncomingKeySyncEvents({
      events: [evt],
      isStrongGroup: false,
      isDemoActive: false,
      isWeb: false,
      getOptIn,
      loadStrongGroupSecret,
      storeAIKey,
      storeOCRKey,
    });

    expect(result).toEqual({ applied: 0, ignored: 1, rejected: 0 });
    expect(getOptIn).not.toHaveBeenCalled();
    expect(loadStrongGroupSecret).not.toHaveBeenCalled();
    expect(storeAIKey).not.toHaveBeenCalled();
  });

  it("ignora no modo demo (isDemoActive: true)", async () => {
    const evt = buildEncryptedKeySyncEvent({
      secret,
      slot: "ai:deepseek",
      apiKey: "sk-demo-ignored",
      deviceId: "dev-sender",
    });

    const storeAIKey = vi.fn(async () => undefined);
    const result = await applyIncomingKeySyncEvents({
      events: [evt],
      isStrongGroup: true,
      isDemoActive: true,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      storeAIKey,
      storeOCRKey: vi.fn(async () => undefined),
    });

    expect(result).toEqual({ applied: 0, ignored: 1, rejected: 0 });
    expect(storeAIKey).not.toHaveBeenCalled();
  });

  it("rejeita chave adulterada ou de outro grupo sem lançar exceção e preserva chaves locais existentes", async () => {
    const localAIKeys = new Map<string, string>([["openai", "sk-existing-local-key"]]);
    let localOCRKey = "AIza-existing-local-ocr";

    const validFromOtherGroup = buildEncryptedKeySyncEvent({
      secret: otherSecret,
      slot: "ai:openai",
      apiKey: "sk-other-group",
      deviceId: "dev-other",
    });

    const validOcr = buildEncryptedKeySyncEvent({
      secret,
      slot: "ocr:cloud_vision",
      apiKey: "AIza-tampered",
      deviceId: "dev-sender",
    });
    const payloadObj = validOcr.payload as { slot: string; ciphertext: string; schemaVersion: 1 };
    const tamperedOcr: SyncEvent = {
      ...validOcr,
      payload: {
        ...payloadObj,
        ciphertext: `${payloadObj.ciphertext.slice(0, -4)}AAAA`,
      },
    };

    const unknownSlotEvt: SyncEvent = {
      id: "bad-slot-1",
      type: "KEY_SYNC_UPDATED",
      payload: { slot: "ai:unknown", ciphertext: "domus-key-gcm-v1.AAAA", schemaVersion: 1 },
      timestamp: 2000,
      deviceId: "dev-sender",
      signature: "",
    };

    const result = await applyIncomingKeySyncEvents({
      events: [validFromOtherGroup, tamperedOcr, unknownSlotEvt],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      storeAIKey: async (provider, apiKey) => {
        localAIKeys.set(provider, apiKey);
      },
      storeOCRKey: async (apiKey) => {
        localOCRKey = apiKey;
      },
    });

    expect(result).toEqual({ applied: 0, ignored: 0, rejected: 3 });
    expect(localAIKeys.get("openai")).toBe("sk-existing-local-key");
    expect(localOCRKey).toBe("AIza-existing-local-ocr");
  });

  it("aplica múltiplos eventos para o mesmo slot na ordem determinística sortEvents e ignora mais novo adulterado", async () => {
    const localAIKeys = new Map<string, string>();

    const olderValid: SyncEvent = {
      ...buildEncryptedKeySyncEvent({
        secret,
        slot: "ai:openai",
        apiKey: "sk-older-valid",
        deviceId: "dev-a",
      }),
      id: "evt-1",
      timestamp: 1000,
    };

    const newerValid: SyncEvent = {
      ...buildEncryptedKeySyncEvent({
        secret,
        slot: "ai:openai",
        apiKey: "sk-newer-valid",
        deviceId: "dev-b",
      }),
      id: "evt-2",
      timestamp: 2000,
    };

    const newestTampered: SyncEvent = {
      id: "evt-3",
      type: "KEY_SYNC_UPDATED",
      payload: {
        slot: "ai:openai",
        ciphertext: "domus-key-gcm-v1.invalidciphertext",
        schemaVersion: 1,
      },
      timestamp: 3000,
      deviceId: "dev-c",
      signature: "",
    };

    // Passando fora de ordem propositalmente
    const result = await applyIncomingKeySyncEvents({
      events: [newestTampered, newerValid, olderValid],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      storeAIKey: async (provider, apiKey) => {
        localAIKeys.set(provider, apiKey);
      },
      storeOCRKey: async () => undefined,
    });

    expect(result).toEqual({ applied: 2, ignored: 0, rejected: 1 });
    expect(localAIKeys.get("openai")).toBe("sk-newer-valid");
  });

  it("é idempotente com handledIds e não regrava evento já aplicado", async () => {
    const handledIds = new Set<string>();
    const storeAIKey = vi.fn(async () => undefined);
    const evt = buildEncryptedKeySyncEvent({
      secret,
      slot: "ai:qwen",
      apiKey: "sk-qwen-once",
      deviceId: "dev-sender",
    });

    const first = await applyIncomingKeySyncEvents({
      events: [evt],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      storeAIKey,
      storeOCRKey: vi.fn(async () => undefined),
      handledIds,
    });

    expect(first).toEqual({ applied: 1, ignored: 0, rejected: 0 });
    expect(storeAIKey).toHaveBeenCalledTimes(1);
    expect(handledIds.has(evt.id)).toBe(true);

    const second = await applyIncomingKeySyncEvents({
      events: [evt],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      storeAIKey,
      storeOCRKey: vi.fn(async () => undefined),
      handledIds,
    });

    expect(second).toEqual({ applied: 0, ignored: 1, rejected: 0 });
    expect(storeAIKey).toHaveBeenCalledTimes(1);
  });

  it("retorna zeros imediatamente quando não há eventos KEY_SYNC_UPDATED", async () => {
    const getOptIn = vi.fn(async () => true);
    const loadStrongGroupSecret = vi.fn(async () => encodedSecret);

    const result = await applyIncomingKeySyncEvents({
      events: [makeNonKeyEvent()],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: false,
      getOptIn,
      loadStrongGroupSecret,
      storeAIKey: vi.fn(async () => undefined),
      storeOCRKey: vi.fn(async () => undefined),
    });

    expect(result).toEqual({ applied: 0, ignored: 0, rejected: 0 });
    expect(getOptIn).not.toHaveBeenCalled();
    expect(loadStrongGroupSecret).not.toHaveBeenCalled();
  });

  it("ignora sem gravar quando loadStrongGroupSecret retorna null ou segredo inválido", async () => {
    const evt = buildEncryptedKeySyncEvent({
      secret,
      slot: "ai:openai",
      apiKey: "sk-no-secret",
      deviceId: "dev-sender",
    });
    const storeAIKey = vi.fn(async () => undefined);
    const storeOCRKey = vi.fn(async () => undefined);

    const nullSecretResult = await applyIncomingKeySyncEvents({
      events: [evt],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => null,
      storeAIKey,
      storeOCRKey,
    });
    expect(nullSecretResult).toEqual({ applied: 0, ignored: 1, rejected: 0 });

    const invalidSecretResult = await applyIncomingKeySyncEvents({
      events: [evt],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => "not-a-valid-secret",
      storeAIKey,
      storeOCRKey,
    });
    expect(invalidSecretResult).toEqual({ applied: 0, ignored: 1, rejected: 0 });
    expect(storeAIKey).not.toHaveBeenCalled();
    expect(storeOCRKey).not.toHaveBeenCalled();
  });

  it("isola falha de storeAIKey/storeOCRKey em um evento sem abortar os demais nem marcar handledIds", async () => {
    const handledIds = new Set<string>();
    const aiFailEvt = buildEncryptedKeySyncEvent({
      secret,
      slot: "ai:openai",
      apiKey: "sk-fail-write",
      deviceId: "dev-sender",
    });
    const ocrSuccessEvt = buildEncryptedKeySyncEvent({
      secret,
      slot: "ocr:cloud_vision",
      apiKey: "AIza-success-write",
      deviceId: "dev-sender",
    });

    const storeAIKey = vi.fn(async () => {
      throw new Error("SecureStore unavailable");
    });
    const storeOCRKey = vi.fn(async () => undefined);

    const result = await applyIncomingKeySyncEvents({
      events: [aiFailEvt, ocrSuccessEvt],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      storeAIKey,
      storeOCRKey,
      handledIds,
    });

    expect(result).toEqual({ applied: 1, ignored: 0, rejected: 1 });
    expect(storeOCRKey).toHaveBeenCalledWith("AIza-success-write");
    expect(handledIds.has(aiFailEvt.id)).toBe(false);
    expect(handledIds.has(ocrSuccessEvt.id)).toBe(true);
  });

  it("deduplica eventos com mesmo evt.id dentro do mesmo lote", async () => {
    const handledIds = new Set<string>();
    const storeAIKey = vi.fn(async () => undefined);
    const evt = buildEncryptedKeySyncEvent({
      secret,
      slot: "ai:elevenlabs",
      apiKey: "sk-eleven-dedup",
      deviceId: "dev-sender",
    });

    const result = await applyIncomingKeySyncEvents({
      events: [evt, { ...evt }],
      isStrongGroup: true,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      storeAIKey,
      storeOCRKey: vi.fn(async () => undefined),
      handledIds,
    });

    expect(result).toEqual({ applied: 1, ignored: 1, rejected: 0 });
    expect(storeAIKey).toHaveBeenCalledTimes(1);
    expect(handledIds.has(evt.id)).toBe(true);
  });
});
