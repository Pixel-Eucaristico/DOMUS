import { describe, expect, it, vi } from "vitest";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { encodeGroupSecret, generateGroupSecret } from "../groupSecret";
import { decryptSyncedKey, KEY_SYNC_EVENT_TYPE } from "../keySyncCipher";
import {
  AI_SYNCED_PROVIDERS,
  buildEncryptedKeySyncEvent,
  collectLocalKeysForSync,
  publishAllLocalKeysIfOptedIn,
  publishEncryptedKeyIfOptedIn,
  slotForAIProvider,
} from "../keySyncPublisher";
import {
  partitionOldGroupEvents,
  selectEventsToImport,
  selectOldGroupPushEvents,
  selectStrongGroupPushEvents,
} from "@/src/modules/syncPayload";
import { appendDispatched, buildExportEvents } from "@/src/context/localEventLog";
import { replayAllEvents } from "@/src/context/replay";
import { BackupExportService } from "@/src/modules/backup/application/BackupExportService";
import { FileSystemService } from "@/src/modules/backup/infrastructure/FileSystemService";

vi.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: vi.fn(async (_alg: string, data: string) => `sha256:${data.length}`),
}));

vi.mock("@/src/modules/backup/infrastructure/FileSystemService", () => ({
  FileSystemService: {
    writeTemp: vi.fn(async (_name: string, content: string) => content),
    deleteFile: vi.fn(async () => undefined),
  },
}));

vi.mock("@/src/modules/backup/infrastructure/ShareService", () => ({
  ShareService: {
    share: vi.fn(async () => undefined),
  },
}));

describe("keySyncPublisher", () => {
  const secret = generateGroupSecret();
  const encodedSecret = encodeGroupSecret(secret);

  it("não publica quando opt-in está desligado, na web ou no modo demo", async () => {
    const dispatch = vi.fn();

    expect(
      await publishEncryptedKeyIfOptedIn({
        slot: "ai:openai",
        apiKey: "sk-secret-test-123",
        deviceId: "dev-1",
        isDemoActive: false,
        isWeb: false,
        getOptIn: async () => false,
        loadStrongGroupSecret: async () => encodedSecret,
        dispatch,
      }),
    ).toBe(false);

    expect(
      await publishEncryptedKeyIfOptedIn({
        slot: "ai:openai",
        apiKey: "sk-secret-test-123",
        deviceId: "dev-1",
        isDemoActive: false,
        isWeb: true,
        getOptIn: async () => true,
        loadStrongGroupSecret: async () => encodedSecret,
        dispatch,
      }),
    ).toBe(false);

    expect(
      await publishEncryptedKeyIfOptedIn({
        slot: "ai:openai",
        apiKey: "sk-secret-test-123",
        deviceId: "dev-1",
        isDemoActive: true,
        isWeb: false,
        getOptIn: async () => true,
        loadStrongGroupSecret: async () => encodedSecret,
        dispatch,
      }),
    ).toBe(false);

    expect(
      await publishAllLocalKeysIfOptedIn({
        deviceId: "dev-1",
        isDemoActive: false,
        isWeb: true,
        getOptIn: async () => true,
        loadStrongGroupSecret: async () => encodedSecret,
        retrieveAIKey: async () => "sk-secret-test-123",
        loadOCRKey: async () => "AIza-ocr-test",
        dispatch,
      }),
    ).toBe(0);

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("não publica sem Grupo forte válido ou quando loadStrongGroupSecret rejeita", async () => {
    const dispatch = vi.fn();

    for (const badSecret of [null, "", "ABC234", "DOMUS1-INVALID"]) {
      expect(
        await publishEncryptedKeyIfOptedIn({
          slot: "ai:openai",
          apiKey: "sk-secret-test-123",
          deviceId: "dev-1",
          isDemoActive: false,
          isWeb: false,
          getOptIn: async () => true,
          loadStrongGroupSecret: async () => badSecret,
          dispatch,
        }),
      ).toBe(false);
    }

    expect(
      await publishEncryptedKeyIfOptedIn({
        slot: "ai:openai",
        apiKey: "sk-secret-test-123",
        deviceId: "dev-1",
        isDemoActive: false,
        isWeb: false,
        getOptIn: async () => true,
        loadStrongGroupSecret: async () => {
          throw new Error("SecureStore unavailable");
        },
        dispatch,
      }),
    ).toBe(false);

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("publica evento cifrado e garante ausência de texto puro no log local, backup e push", async () => {
    const secretKeyPlain = "sk-secret-test-123";
    const dispatched: SyncEvent[] = [];

    const ok = await publishEncryptedKeyIfOptedIn({
      slot: "ai:openai",
      apiKey: secretKeyPlain,
      deviceId: "dev-1",
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      dispatch: (evt) => dispatched.push(evt),
    });

    expect(ok).toBe(true);
    expect(dispatched).toHaveLength(1);
    const evt = dispatched[0]!;
    expect(evt.type).toBe(KEY_SYNC_EVENT_TYPE);
    expect(evt.payload).toMatchObject({
      slot: "ai:openai",
      schemaVersion: 1,
    });

    // Nenhuma ocorrência da chave em texto puro no evento
    expect(JSON.stringify(evt)).not.toContain(secretKeyPlain);

    // Log local / persistência
    const logResult = appendDispatched([], evt, "dev-1");
    expect(JSON.stringify(logResult.events)).not.toContain(secretKeyPlain);

    // Backup (buildExportEvents + BackupExportService.exportPlain)
    const exportEvents = buildExportEvents(logResult.events, "dev-1");
    expect(JSON.stringify(exportEvents)).not.toContain(secretKeyPlain);

    await BackupExportService.exportPlain(exportEvents, "dev-1", () => undefined);
    const writtenBackup = vi.mocked(FileSystemService.writeTemp).mock.calls[0]?.[1];
    expect(writtenBackup).toBeDefined();
    expect(writtenBackup).not.toContain(secretKeyPlain);

    // Payload de push do Grupo forte
    const strongPush = selectStrongGroupPushEvents(logResult.events, "dev-1");
    expect(strongPush).toHaveLength(1);
    expect(JSON.stringify(strongPush)).not.toContain(secretKeyPlain);

    // Decifragem confirma integridade
    expect(
      decryptSyncedKey({
        secret,
        slot: "ai:openai",
        ciphertext: (evt.payload as { ciphertext: string }).ciphertext,
      }),
    ).toEqual({ ok: true, apiKey: secretKeyPlain });
  });

  it("coleta e publica todas as chaves locais salvas ao ativar opt-in", async () => {
    const dispatched: SyncEvent[] = [];
    const collected = await collectLocalKeysForSync({
      retrieveAIKey: async (provider) => {
        if (provider === "openai") return "sk-openai-1";
        if (provider === "claude") throw new Error("read fail");
        if (provider === "elevenlabs") return "el-key-2";
        return null;
      },
      loadOCRKey: async () => "AIza-ocr-3",
    });

    expect(collected).toEqual([
      { slot: "ai:openai", apiKey: "sk-openai-1" },
      { slot: "ai:elevenlabs", apiKey: "el-key-2" },
      { slot: "ocr:cloud_vision", apiKey: "AIza-ocr-3" },
    ]);

    const count = await publishAllLocalKeysIfOptedIn({
      deviceId: "dev-1",
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      retrieveAIKey: async (provider) => (provider === "gemini" ? "AIza-gemini-9" : null),
      loadOCRKey: async () => "AIza-ocr-3",
      dispatch: (evt) => dispatched.push(evt),
    });

    expect(count).toBe(2);
    expect(dispatched.map((e) => (e.payload as { slot: string }).slot)).toEqual([
      "ai:gemini",
      "ocr:cloud_vision",
    ]);
  });

  it("isola falha de uma chave inválida e continua publicando as demais em publishAllLocalKeysIfOptedIn", async () => {
    const dispatched: SyncEvent[] = [];
    const oversizedKey = "x".repeat(5000);

    const count = await publishAllLocalKeysIfOptedIn({
      deviceId: "dev-1",
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      retrieveAIKey: async (provider) => {
        if (provider === "openai") return oversizedKey;
        if (provider === "gemini") return "AIza-gemini-ok";
        return null;
      },
      loadOCRKey: async () => "AIza-ocr-ok",
      dispatch: (evt) => dispatched.push(evt),
    });

    expect(count).toBe(2);
    expect(dispatched.map((e) => (e.payload as { slot: string }).slot)).toEqual([
      "ai:gemini",
      "ocr:cloud_vision",
    ]);
  });

  it("aborta publishAllLocalKeysIfOptedIn sem despachar se o opt-in for desligado no meio da execução", async () => {
    const dispatched: SyncEvent[] = [];
    const getOptIn = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const count = await publishAllLocalKeysIfOptedIn({
      deviceId: "dev-1",
      isDemoActive: false,
      isWeb: false,
      getOptIn,
      loadStrongGroupSecret: async () => encodedSecret,
      retrieveAIKey: async (provider) => (provider === "openai" ? "sk-openai-1" : null),
      loadOCRKey: async () => "AIza-ocr-ok",
      dispatch: (evt) => dispatched.push(evt),
    });

    expect(getOptIn).toHaveBeenCalledTimes(2);
    expect(count).toBe(0);
    expect(dispatched).toHaveLength(0);
  });

  it("exclui KEY_SYNC_UPDATED do Grupo antigo e mantém no Grupo forte", () => {
    const keySyncEvent = buildEncryptedKeySyncEvent({
      secret,
      slot: "ocr:cloud_vision",
      apiKey: "AIza-ocr-secret",
      deviceId: "dev-1",
    });

    const partitioned = partitionOldGroupEvents([keySyncEvent]);
    expect(partitioned.allowed).toEqual([]);
    expect(partitioned.excluded).toEqual([keySyncEvent]);

    expect(selectOldGroupPushEvents([keySyncEvent], "dev-1")).toEqual([]);
    expect(selectStrongGroupPushEvents([keySyncEvent], "dev-1")).toEqual([keySyncEvent]);

    const oldImport = selectEventsToImport([keySyncEvent], new Set(), () => undefined, {
      isStrongGroup: false,
    });
    expect(oldImport.toAppend).toEqual([]);
    expect(oldImport.excluded).toBe(1);

    const strongImport = selectEventsToImport([keySyncEvent], new Set(), () => undefined, {
      isStrongGroup: true,
    });
    expect(strongImport.toAppend).toEqual([keySyncEvent]);
    expect(strongImport.excluded).toBe(0);
  });

  it("valida KEY_SYNC_UPDATED no replayAllEvents sem quarentena e isola payload inválido", () => {
    const validEvent = buildEncryptedKeySyncEvent({
      secret,
      slot: "ai:deepseek",
      apiKey: "sk-deepseek-123",
      deviceId: "dev-1",
    });

    const okReplay = replayAllEvents([validEvent]);
    expect(okReplay.quarantine).toEqual([]);

    const emptyCipherEvent: SyncEvent = {
      ...validEvent,
      id: "bad-cipher",
      payload: { slot: "ai:deepseek", ciphertext: "", schemaVersion: 1 },
    };
    const unknownSlotEvent: SyncEvent = {
      ...validEvent,
      id: "bad-slot",
      payload: { slot: "ai:unknown", ciphertext: "domus-key-gcm-v1.abc", schemaVersion: 1 },
    };

    const badReplay = replayAllEvents([emptyCipherEvent, unknownSlotEvent]);
    expect(badReplay.quarantine).toHaveLength(2);
    expect(badReplay.quarantine.map((q) => q.kind)).toEqual([
      "invalid_payload",
      "invalid_payload",
    ]);
  });

  it("slotForAIProvider mapeia todos os provedores suportados e rejeita desconhecidos", () => {
    for (const provider of AI_SYNCED_PROVIDERS) {
      expect(slotForAIProvider(provider)).toBe(`ai:${provider}`);
    }
    expect(slotForAIProvider("unknown")).toBeNull();
    expect(slotForAIProvider("")).toBeNull();
    expect(slotForAIProvider("cloud_vision")).toBeNull();
  });
});
