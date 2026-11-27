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

  it("marca authExpired=true em mount() e refreshBackups() e limpa em CONNECT_SUCCESS, BACKUPS_FETCH_SUCCESS, DISCONNECT_START e UPLOAD_SUCCESS", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        backups: [],
        error: DRIVE_RECONNECT_COPY.backupsLoadAuthError,
        authExpired: true,
      })
      .mockResolvedValueOnce({
        backups: [BACKUP_A],
        error: null,
        authExpired: false,
      })
      .mockResolvedValueOnce({
        backups: [],
        error: DRIVE_RECONNECT_COPY.backupsLoadAuthError,
        authExpired: true,
      });

    const uploadMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true as const,
        lastSyncAt: 1_700_000_999_000,
        remoteBackups: null,
        backupsLoadError: DRIVE_RECONNECT_COPY.backupsLoadError,
      })
      .mockResolvedValueOnce({
        ok: true as const,
        lastSyncAt: 1_700_001_000_000,
        remoteBackups: [BACKUP_B],
        backupsLoadError: null,
      });

    const controller = createDriveBackupController(
      makeDeps({
        loadDriveLocalState: vi.fn(async () => ({
          isConnected: true,
          needsLegacyReconnect: false,
          email: "willian@example.com",
          lastSyncAt: 1_700_000_100_000,
        })),
        fetchDriveBackups: fetchMock,
        performDriveUpload: uploadMock,
      }),
    );

    // 1) mount() com authExpired=true
    await controller.mount();
    expect(controller.getState().authExpired).toBe(true);
    expect(controller.getState().backupsLoadError).toBe(
      DRIVE_RECONNECT_COPY.backupsLoadAuthError,
    );

    // 2) refreshBackups() bem-sucedido limpa authExpired
    await controller.refreshBackups();
    expect(controller.getState().authExpired).toBe(false);

    // 3) refreshBackups() com authExpired=true liga novamente
    await controller.refreshBackups();
    expect(controller.getState().authExpired).toBe(true);

    // 4) UPLOAD_SUCCESS com backupsLoadError preserva authExpired=true
    await controller.uploadContent("payload-1");
    expect(controller.getState().authExpired).toBe(true);

    // 5) UPLOAD_SUCCESS sem backupsLoadError limpa authExpired=false
    await controller.uploadContent("payload-2");
    expect(controller.getState().authExpired).toBe(false);

    // 6) CONNECT_SUCCESS limpa authExpired=false
    fetchMock.mockResolvedValueOnce({
      backups: [],
      error: DRIVE_RECONNECT_COPY.backupsLoadAuthError,
      authExpired: true,
    });
    await controller.refreshBackups();
    expect(controller.getState().authExpired).toBe(true);
    await controller.connect();
    expect(controller.getState().authExpired).toBe(false);

    // 7) DISCONNECT_START limpa authExpired=false
    fetchMock.mockResolvedValueOnce({
      backups: [],
      error: DRIVE_RECONNECT_COPY.backupsLoadAuthError,
      authExpired: true,
    });
    await controller.refreshBackups();
    expect(controller.getState().authExpired).toBe(true);
    await controller.disconnect();
    expect(controller.getState().authExpired).toBe(false);
  });

  it("unmount() incrementa epochs para que um remount descarte requisições antigas em voo", async () => {
    let resolveOldLocal!: (val: {
      isConnected: boolean;
      needsLegacyReconnect: boolean;
      email: string | null;
      lastSyncAt: number | null;
    }) => void;

    const loadMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOldLocal = resolve;
          }),
      )
      .mockResolvedValueOnce({
        isConnected: true,
        needsLegacyReconnect: false,
        email: "atual@example.com",
        lastSyncAt: 1_700_000_200_000,
      });

    const controller = createDriveBackupController(
      makeDeps({
        loadDriveLocalState: loadMock,
        fetchDriveBackups: vi.fn(async () => ({
          backups: [BACKUP_B],
          error: null,
          authExpired: false,
        })),
      }),
    );

    const firstMount = controller.mount();
    controller.unmount();

    const remount = controller.mount();
    await remount;

    // Requisição antiga de antes do unmount resolve depois do remount
    resolveOldLocal({
      isConnected: false,
      needsLegacyReconnect: true,
      email: "antigo@example.com",
      lastSyncAt: 1_700_000_000_000,
    });
    await firstMount;

    expect(controller.getState()).toMatchObject({
      isConnected: true,
      needsLegacyReconnect: false,
      email: "atual@example.com",
      remoteBackups: [BACKUP_B],
    });
  });

  it("disconnect() interrompe connect() em voo e libera isConnecting imediatamente para nova tentativa", async () => {
    let resolveFirstConnect!: (
      res: Awaited<ReturnType<DriveBackupControllerDeps["performDriveConnect"]>>,
    ) => void;
    let resolveSecondConnect!: (
      res: Awaited<ReturnType<DriveBackupControllerDeps["performDriveConnect"]>>,
    ) => void;

    const performConnect = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstConnect = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondConnect = resolve;
          }),
      );

    const controller = createDriveBackupController(
      makeDeps({ performDriveConnect: performConnect }),
    );

    const firstConnect = controller.connect();
    expect(controller.getState().isConnecting).toBe(true);

    await controller.disconnect();
    expect(controller.getState().isConnecting).toBe(false);

    // Nova tentativa de connect() deve iniciar imediatamente mesmo antes da 1ª resolver
    const secondConnect = controller.connect();
    expect(performConnect).toHaveBeenCalledTimes(2);
    expect(controller.getState().isConnecting).toBe(true);

    // 1ª tentativa antiga resolve depois e NÃO deve derrubar isConnecting da 2ª
    resolveFirstConnect({
      ok: true,
      email: "antigo@example.com",
      lastSyncAt: 1_700_000_000_000,
      remoteBackups: [BACKUP_A],
      backupsLoadError: null,
    });
    await firstConnect;
    expect(controller.getState().isConnecting).toBe(true);
    expect(controller.getState().isConnected).toBe(false);

    resolveSecondConnect({
      ok: true,
      email: "novo@example.com",
      lastSyncAt: 1_700_000_500_000,
      remoteBackups: [BACKUP_B],
      backupsLoadError: null,
    });
    await secondConnect;
    expect(controller.getState()).toMatchObject({
      isConnecting: false,
      isConnected: true,
      email: "novo@example.com",
      remoteBackups: [BACKUP_B],
    });
  });

  it("disconnect() reidrata estado local quando performDriveDisconnect retorna erro", async () => {
    const loadMock = vi.fn(async () => ({
      isConnected: true,
      needsLegacyReconnect: false,
      email: "willian@example.com",
      lastSyncAt: 1_700_000_100_000,
    }));

    const deps = makeDeps({
      loadDriveLocalState: loadMock,
      fetchDriveBackups: vi.fn(async () => ({
        backups: [BACKUP_A],
        error: null,
        authExpired: false,
      })),
      performDriveDisconnect: vi.fn(async () => ({ error: "falha no SecureStore" })),
    });

    const controller = createDriveBackupController(deps);
    await controller.mount();
    expect(controller.getState().isConnected).toBe(true);

    await controller.disconnect();
    expect(controller.getState()).toMatchObject({
      isDriveStateLoaded: true,
      isConnected: true,
      email: "willian@example.com",
      lastSyncAt: 1_700_000_100_000,
      isLoadingBackups: false,
      syncError: "falha no SecureStore",
    });
    expect(deps.setDriveBackupPref).not.toHaveBeenCalled();
  });

  it("UPLOAD_SUCCESS limpa isLoadingBackups e preserva lastSyncAt anterior quando action.lastSyncAt é null", async () => {
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
          lastSyncAt: 1_700_000_777_000,
        })),
        fetchDriveBackups: fetchMock,
        performDriveUpload: vi.fn(async () => ({
          ok: true as const,
          lastSyncAt: null,
          remoteBackups: [BACKUP_B],
          backupsLoadError: null,
        })),
      }),
    );

    await controller.mount();
    const refreshPromise = controller.refreshBackups();
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.getState().isLoadingBackups).toBe(true);

    const uploaded = await controller.uploadContent("payload");
    expect(uploaded).toBe(true);
    expect(controller.getState()).toMatchObject({
      isLoadingBackups: false,
      lastSyncAt: 1_700_000_777_000,
      remoteBackups: [BACKUP_B],
      backupsLoadError: null,
    });

    resolveStaleRefresh({ backups: [BACKUP_A], error: null, authExpired: false });
    await refreshPromise;
  });
});
