import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AUTO_BACKUP_INTERVAL_MS,
  LAST_AUTO_BACKUP_TS,
  LAST_DRIVE_AUTO_BACKUP_TS,
  autoBackupFilePath,
  getLastAutoBackupTs,
  getLastDriveAutoBackupTs,
  runAutoBackupIfDue,
} from "../autoBackupRunner";
import type { SyncEvent } from "@packages/storage/src/eventStore";

const mocks = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  documentDirectory: "file:///docs/" as string | null,
  isWeb: false,
  saveLocal: vi.fn(async () => {}),
  isConnected: vi.fn(async () => false),
  uploadBackup: vi.fn(async () => {}),
  readFile: vi.fn(async () => "encrypted-payload"),
  getOrCreateKey: vi.fn(async () => "DEVICE-KEY-123"),
  buildExportEvents: vi.fn((events: unknown[]) => events),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => mocks.storage.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      mocks.storage.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      mocks.storage.delete(k);
    }),
  },
}));

vi.mock("expo-file-system/legacy", () => ({
  get documentDirectory() {
    return mocks.documentDirectory;
  },
}));

vi.mock("@/src/modules/backup/application/BackupExportService", () => ({
  BackupExportService: {
    saveLocal: mocks.saveLocal,
  },
}));

vi.mock("@/src/modules/backup/infrastructure/GoogleDriveService", () => ({
  GoogleDriveService: {
    isConnected: mocks.isConnected,
    uploadBackup: mocks.uploadBackup,
  },
}));

vi.mock("@/src/modules/backup/infrastructure/FileSystemService", () => ({
  FileSystemService: {
    read: mocks.readFile,
  },
}));

vi.mock("@/src/modules/backup/infrastructure/deviceBackupKey", () => ({
  getOrCreateDeviceBackupKey: mocks.getOrCreateKey,
  isWeb: () => mocks.isWeb,
}));

vi.mock("@/src/context/localEventLog", () => ({
  buildExportEvents: mocks.buildExportEvents,
}));

const SAMPLE_EVENT = {
  id: "evt-1",
  type: "TRANSACTION_CREATED",
  timestamp: 1000,
  deviceId: "dev-1",
  payload: {},
} as unknown as SyncEvent;

describe("autoBackupRunner", () => {
  beforeEach(() => {
    mocks.storage.clear();
    mocks.documentDirectory = "file:///docs/";
    mocks.isWeb = false;
    vi.clearAllMocks();
    mocks.saveLocal.mockResolvedValue(undefined);
    mocks.isConnected.mockResolvedValue(false);
    mocks.uploadBackup.mockResolvedValue(undefined);
    mocks.readFile.mockResolvedValue("encrypted-payload");
    mocks.getOrCreateKey.mockResolvedValue("DEVICE-KEY-123");
    mocks.buildExportEvents.mockImplementation((events: unknown[]) => events);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("autoBackupFilePath lança erro quando documentDirectory é indisponível", () => {
    expect(() => autoBackupFilePath(null)).toThrow("documentos indisponível");
    mocks.documentDirectory = null;
    expect(() => autoBackupFilePath()).toThrow("documentos indisponível");
    expect(autoBackupFilePath("file:///docs/")).toBe(
      "file:///docs/domus-autobackup.domusbackup",
    );
  });

  it("getLastAutoBackupTs retorna null para valores corrompidos ou não numéricos", async () => {
    mocks.storage.set(LAST_AUTO_BACKUP_TS, "abc");
    expect(await getLastAutoBackupTs()).toBeNull();

    mocks.storage.set(LAST_AUTO_BACKUP_TS, "0");
    expect(await getLastAutoBackupTs()).toBeNull();

    mocks.storage.set(LAST_AUTO_BACKUP_TS, "1700000000000");
    expect(await getLastAutoBackupTs()).toBe(1_700_000_000_000);
  });

  it("pula execução na web", async () => {
    mocks.isWeb = true;
    const res = await runAutoBackupIfDue({
      getAllEvents: () => [SAMPLE_EVENT],
      deviceId: "dev-1",
      now: 1_700_000_000_000,
    });
    expect(res).toEqual({ completed: true, localSaved: false, driveUploaded: false });
    expect(mocks.saveLocal).not.toHaveBeenCalled();
  });

  it("pula quando intervalo local e do Drive é menor que 24h", async () => {
    const now = 1_700_000_000_000;
    mocks.storage.set(LAST_AUTO_BACKUP_TS, String(now - 1000));
    mocks.storage.set(LAST_DRIVE_AUTO_BACKUP_TS, String(now - 1000));

    const res = await runAutoBackupIfDue({
      getAllEvents: () => [SAMPLE_EVENT],
      deviceId: "dev-1",
      now,
    });
    expect(res).toEqual({ completed: true, localSaved: false, driveUploaded: false });
    expect(mocks.saveLocal).not.toHaveBeenCalled();
  });

  it("não marca completed quando não há eventos exportáveis", async () => {
    const res = await runAutoBackupIfDue({
      getAllEvents: () => [],
      deviceId: "dev-1",
      now: 1_700_000_000_000,
    });
    expect(res).toEqual({ completed: false, localSaved: false, driveUploaded: false });
    expect(mocks.storage.has(LAST_AUTO_BACKUP_TS)).toBe(false);
  });

  it("não grava LAST_AUTO_BACKUP_TS se saveLocal falhar", async () => {
    mocks.saveLocal.mockRejectedValueOnce(new Error("disk full"));
    await expect(
      runAutoBackupIfDue({
        getAllEvents: () => [SAMPLE_EVENT],
        deviceId: "dev-1",
        now: 1_700_000_000_000,
      }),
    ).rejects.toThrow("disk full");
    expect(mocks.storage.has(LAST_AUTO_BACKUP_TS)).toBe(false);
  });

  it("salva backup local e faz upload ao Drive quando conectado; falha no Drive permite retry depois", async () => {
    const t1 = 1_700_000_000_000;
    mocks.isConnected.mockResolvedValue(true);
    mocks.uploadBackup.mockRejectedValueOnce(new Error("offline"));

    const res1 = await runAutoBackupIfDue({
      getAllEvents: () => [SAMPLE_EVENT],
      deviceId: "dev-1",
      now: t1,
    });
    expect(res1).toEqual({ completed: true, localSaved: true, driveUploaded: false });
    expect(await getLastAutoBackupTs()).toBe(t1);
    expect(await getLastDriveAutoBackupTs()).toBeNull();

    // Na próxima execução dentro das 24h, local pula mas Drive tenta novamente e grava timestamp
    const t2 = t1 + 60_000;
    const res2 = await runAutoBackupIfDue({
      getAllEvents: () => [SAMPLE_EVENT],
      deviceId: "dev-1",
      now: t2,
    });
    expect(res2).toEqual({ completed: true, localSaved: false, driveUploaded: true });
    expect(mocks.saveLocal).toHaveBeenCalledTimes(1);
    expect(await getLastDriveAutoBackupTs()).toBe(t2);

    // Após 24h, roda novamente
    const t3 = t2 + AUTO_BACKUP_INTERVAL_MS + 1;
    const res3 = await runAutoBackupIfDue({
      getAllEvents: () => [SAMPLE_EVENT],
      deviceId: "dev-1",
      now: t3,
    });
    expect(res3).toEqual({ completed: true, localSaved: true, driveUploaded: true });
  });

  it("salva backup local e não envia ao Drive quando sessão está desconectada ou legada (isConnected=false)", async () => {
    const now = 1_700_000_000_000;
    mocks.isConnected.mockResolvedValueOnce(false);

    const res = await runAutoBackupIfDue({
      getAllEvents: () => [SAMPLE_EVENT],
      deviceId: "dev-1",
      now,
    });

    expect(res).toEqual({ completed: true, localSaved: true, driveUploaded: false });
    expect(mocks.saveLocal).toHaveBeenCalledTimes(1);
    expect(mocks.isConnected).toHaveBeenCalledTimes(1);
    expect(mocks.readFile).not.toHaveBeenCalled();
    expect(mocks.uploadBackup).not.toHaveBeenCalled();
    expect(await getLastAutoBackupTs()).toBe(now);
    expect(await getLastDriveAutoBackupTs()).toBeNull();
  });
});
