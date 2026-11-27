import { describe, it, expect, vi } from "vitest";
import type { DriveBackupFile } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import { DRIVE_RECONNECT_COPY } from "@/src/modules/backup/domain/driveReconnectCopy";
import {
  INITIAL_DRIVE_BACKUP_STATE,
  createDriveBackupController,
  deriveDriveBackupFlags,
  type DriveBackupControllerDeps,
} from "../driveBackupState";

const BACKUP_A: DriveBackupFile = {
  id: "file-a",
  name: "domus-backup.domusbackup",
  modifiedTime: "2026-11-26T16:23:00.000Z",
  size: 8600,
};

const BACKUP_B: DriveBackupFile = {
  id: "file-b",
  name: "domus-backup.domusbackup",
  modifiedTime: "2026-11-26T18:38:00.000Z",
  size: 9200,
};

function makeDeps(
  overrides: Partial<DriveBackupControllerDeps> = {},
): DriveBackupControllerDeps {
  return {
    webClientId: "web-client-id",
    loadDriveLocalState: vi.fn(async () => ({
      isConnected: false,
      needsLegacyReconnect: false,
      email: null,
      lastSyncAt: null,
    })),
    fetchDriveBackups: vi.fn(async () => ({
      backups: [],
      error: null,
      authExpired: false,
    })),
    performDriveConnect: vi.fn(async () => ({
      ok: true as const,
      email: "willian@example.com",
      lastSyncAt: 1_700_000_000_000,
      remoteBackups: [BACKUP_A],
      backupsLoadError: null,
    })),
    performDriveDisconnect: vi.fn(async () => ({ error: null })),
    performDriveUpload: vi.fn(async () => ({
      ok: true as const,
      lastSyncAt: 1_700_000_999_000,
      remoteBackups: [BACKUP_B],
      backupsLoadError: null,
    })),
    setDriveBackupPref: vi.fn(),
    ...overrides,
  };
}

describe("driveBackupState (controller & transitions)", () => {
  it("hidrata estado local imediatamente no mount sem piscar tela desconectada e exibe isLoadingBackups", async () => {
    let resolveRemote!: (val: {
      backups: DriveBackupFile[];
      error: string | null;
      authExpired: boolean;
    }) => void;
    const remotePromise = new Promise<{
      backups: DriveBackupFile[];
      error: string | null;
      authExpired: boolean;
    }>((resolve) => {
      resolveRemote = resolve;
    });

    const deps = makeDeps({
      loadDriveLocalState: vi.fn(async () => ({
        isConnected: true,
        needsLegacyReconnect: false,
        email: "willian@example.com",
        lastSyncAt: 1_700_000_100_000,
      })),
      fetchDriveBackups: vi.fn(() => remotePromise),
    });

    const controller = createDriveBackupController(deps);
    expect(controller.getState()).toEqual(INITIAL_DRIVE_BACKUP_STATE);

    const mountPromise = controller.mount();
    // Aguarda microtask do loadDriveLocalState concluir enquanto fetchDriveBackups segue pendente
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.getState()).toMatchObject({
      isDriveStateLoaded: true,
      isConnected: true,
      needsLegacyReconnect: false,
      email: "willian@example.com",
      lastSyncAt: 1_700_000_100_000,
      isLoadingBackups: true,
      remoteBackups: [],
    });

    resolveRemote({ backups: [BACKUP_A], error: null, authExpired: false });
    await mountPromise;

    expect(controller.getState()).toMatchObject({
      isConnected: true,
      isLoadingBackups: false,
      remoteBackups: [BACKUP_A],
      backupsLoadError: null,
    });
  });

  it("connect() descarta resultado se disconnect() ocorrer durante await performDriveConnect()", async () => {
    let resolveConnect!: (res: Awaited<ReturnType<DriveBackupControllerDeps["performDriveConnect"]>>) => void;
    const deps = makeDeps({
      performDriveConnect: vi.fn(
        () =>
          new Promise<
            Awaited<ReturnType<DriveBackupControllerDeps["performDriveConnect"]>>
          >((resolve) => {
            resolveConnect = resolve;
          }),
      ),
    });

    const controller = createDriveBackupController(deps);
    const connectPromise = controller.connect();
    expect(controller.getState().isConnecting).toBe(true);

    // Usuário desconecta enquanto login estava em voo
    await controller.disconnect();
    expect(controller.getState().isConnected).toBe(false);
    expect(controller.getState().isConnecting).toBe(false);

    // Login antigo resolve depois
    resolveConnect({
      ok: true,
      email: "zumbi@example.com",
      lastSyncAt: 1_700_000_000_000,
      remoteBackups: [BACKUP_A],
      backupsLoadError: null,
    });
    await connectPromise;

    expect(controller.getState().isConnected).toBe(false);
    expect(controller.getState().email).toBeNull();
    expect(controller.getState().isConnecting).toBe(false);
    expect(deps.setDriveBackupPref).toHaveBeenCalledTimes(1);
    expect(deps.setDriveBackupPref).toHaveBeenCalledWith({ enabled: false });
  });

  it("connect() sobrescreve lastSyncAt incondicionalmente (limpa timestamp antigo ao trocar de conta)", async () => {
    const deps = makeDeps({
      loadDriveLocalState: vi.fn(async () => ({
        isConnected: false,
        needsLegacyReconnect: true,
        email: "antiga@example.com",
        lastSyncAt: 1_700_000_555_000,
      })),
      performDriveConnect: vi.fn(async () => ({
        ok: true as const,
        email: "nova@example.com",
        lastSyncAt: null,
        remoteBackups: [],
        backupsLoadError: null,
      })),
    });

    const controller = createDriveBackupController(deps);
    await controller.mount();
    expect(controller.getState().lastSyncAt).toBe(1_700_000_555_000);

    await controller.connect();
    expect(controller.getState()).toMatchObject({
      isConnected: true,
      needsLegacyReconnect: false,
      email: "nova@example.com",
      lastSyncAt: null,
      remoteBackups: [],
    });
  });

  it("disconnect() marca isDriveStateLoaded=true e só desabilita driveBackupPref quando não há erro", async () => {
    const depsWithError = makeDeps({
      performDriveDisconnect: vi.fn(async () => ({ error: "falha no keystore" })),
    });
    const cErr = createDriveBackupController(depsWithError);
    await cErr.disconnect();

    expect(cErr.getState().isDriveStateLoaded).toBe(true);
    expect(cErr.getState().syncError).toBe("falha no keystore");
    expect(depsWithError.setDriveBackupPref).not.toHaveBeenCalled();

    const depsOk = makeDeps({
      performDriveDisconnect: vi.fn(async () => ({ error: null })),
    });
    const cOk = createDriveBackupController(depsOk);
    await cOk.disconnect();

    expect(cOk.getState().isDriveStateLoaded).toBe(true);
    expect(cOk.getState().syncError).toBeNull();
    expect(depsOk.setDriveBackupPref).toHaveBeenCalledWith({ enabled: false });
  });

  it("refreshBackups() sincroniza estado desconectado/legado e preserva cache de remoteBackups quando fetch falha", async () => {
    let localState = {
      isConnected: true,
      needsLegacyReconnect: false,
      email: "willian@example.com" as string | null,
      lastSyncAt: 1_700_000_100_000 as number | null,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ backups: [BACKUP_A], error: null, authExpired: false })
      .mockResolvedValueOnce({
        backups: [],
        error: DRIVE_RECONNECT_COPY.backupsLoadOffline,
        authExpired: false,
      });

    const controller = createDriveBackupController(
      makeDeps({
        loadDriveLocalState: vi.fn(async () => localState),
        fetchDriveBackups: fetchMock,
      }),
    );

    await controller.mount();
    expect(controller.getState().remoteBackups).toEqual([BACKUP_A]);

    // Falha de rede preserva remoteBackups em cache e exibe backupsLoadError
    await controller.refreshBackups();
    expect(controller.getState().remoteBackups).toEqual([BACKUP_A]);
    expect(controller.getState().backupsLoadError).toBe(
      DRIVE_RECONNECT_COPY.backupsLoadOffline,
    );

    // Se estado local mudou para legado/desconectado, refreshBackups sincroniza estado local
    localState = {
      isConnected: false,
      needsLegacyReconnect: true,
      email: "willian@example.com",
      lastSyncAt: 1_700_000_100_000,
    };
    await controller.refreshBackups();
    expect(controller.getState()).toMatchObject({
      isConnected: false,
      needsLegacyReconnect: true,
      remoteBackups: [],
      isLoadingBackups: false,
      backupsLoadError: null,
    });
  });

  it("uploadContent() invalida refreshBackups() mais antigo em voo via backupsReqId", async () => {
    let resolveStaleRefresh!: (val: {
      backups: DriveBackupFile[];
      error: string | null;
      authExpired: boolean;
    }) => void;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ backups: [BACKUP_A], error: null, authExpired: false })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStaleRefresh = resolve;
          }),
      );

    const controller = createDriveBackupController(
      makeDeps({
        loadDriveLocalState: vi.fn(async () => ({
          isConnected: true,
          needsLegacyReconnect: false,
          email: "willian@example.com",
          lastSyncAt: 1_700_000_100_000,
        })),
        fetchDriveBackups: fetchMock,
        performDriveUpload: vi.fn(async () => ({
          ok: true as const,
          lastSyncAt: 1_700_000_999_000,
          remoteBackups: [BACKUP_B],
          backupsLoadError: null,
        })),
      }),
    );

    await controller.mount();

    const refreshPromise = controller.refreshBackups();
    await Promise.resolve();
    await Promise.resolve();

    const uploaded = await controller.uploadContent("payload");
    expect(uploaded).toBe(true);
    expect(controller.getState().remoteBackups).toEqual([BACKUP_B]);

    // Refresh antigo resolve depois do upload — NÃO deve sobrescrever BACKUP_B por BACKUP_A
    resolveStaleRefresh({ backups: [BACKUP_A], error: null, authExpired: false });
    await refreshPromise;

    expect(controller.getState().remoteBackups).toEqual([BACKUP_B]);
  });

  it("unmount() bloqueia atualizações de estado e callbacks assíncronos em voo", async () => {
    let resolveConnect!: (res: Awaited<ReturnType<DriveBackupControllerDeps["performDriveConnect"]>>) => void;
    const listener = vi.fn();
    const deps = makeDeps({
      performDriveConnect: vi.fn(
        () =>
          new Promise<
            Awaited<ReturnType<DriveBackupControllerDeps["performDriveConnect"]>>
          >((resolve) => {
            resolveConnect = resolve;
          }),
      ),
    });

    const controller = createDriveBackupController(deps);
    controller.subscribe(listener);

    const connectPromise = controller.connect();
    listener.mockClear();

    controller.unmount();

    resolveConnect({
      ok: true,
      email: "willian@example.com",
      lastSyncAt: 1_700_000_000_000,
      remoteBackups: [BACKUP_A],
      backupsLoadError: null,
    });
    await connectPromise;

    expect(listener).not.toHaveBeenCalled();
    expect(deps.setDriveBackupPref).not.toHaveBeenCalled();
  });

  it("deriveDriveBackupFlags prioriza needsLegacyReconnect sobre needsLocalDriveLogin", () => {
    const legacyFlags = deriveDriveBackupFlags(
      { isDriveStateLoaded: true, isConnected: false, needsLegacyReconnect: true },
      { enabled: true, email: "grupo@example.com" },
      "web-cid",
    );
    expect(legacyFlags).toEqual({
      isConfigured: true,
      canConnect: true,
      needsLocalDriveLogin: false,
      syncedAccountEmail: "grupo@example.com",
    });

    const localLoginFlags = deriveDriveBackupFlags(
      { isDriveStateLoaded: true, isConnected: false, needsLegacyReconnect: false },
      { enabled: true, email: "grupo@example.com" },
      "web-cid",
    );
    expect(localLoginFlags.needsLocalDriveLogin).toBe(true);
  });
});
