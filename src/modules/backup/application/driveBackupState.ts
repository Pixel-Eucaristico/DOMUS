import type { DriveBackupFile } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import {
  shouldPromptDriveConnectOnThisDevice,
  type DriveBackupPreference,
} from "@/src/modules/backup/domain/syncedDriveBackupPref";
import { DRIVE_RECONNECT_COPY } from "@/src/modules/backup/domain/driveReconnectCopy";
import type {
  DriveBackupsFetchResult,
  LoadedDriveLocalState,
  PerformDriveConnectResult,
  PerformDriveUploadResult,
} from "./driveBackupActions";

export function computeNeedsLocalDriveLogin(
  isDriveStateLoaded: boolean,
  driveBackupPref: DriveBackupPreference | undefined,
  isConnected: boolean,
  needsLegacyReconnect: boolean = false,
): boolean {
  if (needsLegacyReconnect) return false;
  return (
    isDriveStateLoaded &&
    shouldPromptDriveConnectOnThisDevice(driveBackupPref, isConnected)
  );
}

export interface DriveBackupState {
  isConnected: boolean;
  needsLegacyReconnect: boolean;
  isDriveStateLoaded: boolean;
  email: string | null;
  lastSyncAt: number | null;
  remoteBackups: DriveBackupFile[];
  isLoadingBackups: boolean;
  backupsLoadError: string | null;
  authExpired: boolean;
  isSyncing: boolean;
  syncError: string | null;
  isConnecting: boolean;
}

export const INITIAL_DRIVE_BACKUP_STATE: DriveBackupState = {
  isConnected: false,
  needsLegacyReconnect: false,
  isDriveStateLoaded: false,
  email: null,
  lastSyncAt: null,
  remoteBackups: [],
  isLoadingBackups: false,
  backupsLoadError: null,
  authExpired: false,
  isSyncing: false,
  syncError: null,
  isConnecting: false,
};

export type DriveBackupAction =
  | { type: "LOCAL_LOAD_SUCCESS"; payload: LoadedDriveLocalState }
  | { type: "LOCAL_LOAD_ERROR"; error: string }
  | { type: "BACKUPS_FETCH_START" }
  | { type: "BACKUPS_FETCH_SUCCESS"; backups: DriveBackupFile[] }
  | { type: "BACKUPS_FETCH_ERROR"; error: string; authExpired: boolean }
  | { type: "CONNECT_START" }
  | {
      type: "CONNECT_SUCCESS";
      email: string | null;
      lastSyncAt: number | null;
      remoteBackups: DriveBackupFile[];
      backupsLoadError: string | null;
    }
  | { type: "CONNECT_FAILURE"; error: string | null }
  | { type: "CONNECT_SETTLE" }
  | { type: "DISCONNECT_START" }
  | {
      type: "DISCONNECT_DONE";
      error: string | null;
      rehydrated?: LoadedDriveLocalState;
    }
  | { type: "UPLOAD_START" }
  | {
      type: "UPLOAD_SUCCESS";
      lastSyncAt: number | null;
      remoteBackups: DriveBackupFile[] | null;
      backupsLoadError: string | null;
    }
  | { type: "UPLOAD_ERROR"; error: string }
  | { type: "UPLOAD_END" };

export function driveBackupReducer(
  state: DriveBackupState,
  action: DriveBackupAction,
): DriveBackupState {
  switch (action.type) {
    case "LOCAL_LOAD_SUCCESS":
      return {
        ...state,
        isDriveStateLoaded: true,
        isConnected: action.payload.isConnected,
        needsLegacyReconnect: action.payload.needsLegacyReconnect,
        email: action.payload.email,
        lastSyncAt: action.payload.lastSyncAt,
        isLoadingBackups: action.payload.isConnected,
        remoteBackups: action.payload.isConnected ? state.remoteBackups : [],
        backupsLoadError: null,
        authExpired: false,
      };
    case "LOCAL_LOAD_ERROR":
      return {
        ...state,
        isDriveStateLoaded: true,
        isConnected: false,
        needsLegacyReconnect: false,
        remoteBackups: [],
        isLoadingBackups: false,
        backupsLoadError: null,
        authExpired: false,
        syncError: action.error,
      };
    case "BACKUPS_FETCH_START":
      return {
        ...state,
        isLoadingBackups: true,
        backupsLoadError: null,
      };
    case "BACKUPS_FETCH_SUCCESS":
      return {
        ...state,
        isLoadingBackups: false,
        remoteBackups: action.backups,
        backupsLoadError: null,
        authExpired: false,
      };
    case "BACKUPS_FETCH_ERROR":
      return {
        ...state,
        isLoadingBackups: false,
        backupsLoadError: action.error,
        authExpired: action.authExpired,
      };
    case "CONNECT_START":
      return {
        ...state,
        isConnecting: true,
        syncError: null,
        backupsLoadError: null,
      };
    case "CONNECT_SUCCESS":
      return {
        ...state,
        isConnecting: false,
        isDriveStateLoaded: true,
        isConnected: true,
        needsLegacyReconnect: false,
        isLoadingBackups: false,
        email: action.email,
        lastSyncAt: action.lastSyncAt,
        remoteBackups: action.remoteBackups,
        backupsLoadError: action.backupsLoadError,
        authExpired: false,
        syncError: null,
      };
    case "CONNECT_FAILURE":
      return {
        ...state,
        isConnecting: false,
        syncError: action.error,
      };
    case "CONNECT_SETTLE":
      return state.isConnecting ? { ...state, isConnecting: false } : state;
    case "DISCONNECT_START":
      return {
        ...state,
        isDriveStateLoaded: true,
        isConnected: false,
        needsLegacyReconnect: false,
        isConnecting: false,
        isLoadingBackups: false,
        email: null,
        lastSyncAt: null,
        remoteBackups: [],
        backupsLoadError: null,
        authExpired: false,
        syncError: null,
      };
    case "DISCONNECT_DONE":
      if (action.rehydrated) {
        return {
          ...state,
          isDriveStateLoaded: true,
          isConnected: action.rehydrated.isConnected,
          needsLegacyReconnect: action.rehydrated.needsLegacyReconnect,
          email: action.rehydrated.email,
          lastSyncAt: action.rehydrated.lastSyncAt,
          isLoadingBackups: false,
          syncError: action.error,
        };
      }
      return {
        ...state,
        syncError: action.error,
      };
    case "UPLOAD_START":
      return {
        ...state,
        isSyncing: true,
        syncError: null,
      };
    case "UPLOAD_SUCCESS":
      return {
        ...state,
        isLoadingBackups: false,
        lastSyncAt: action.lastSyncAt ?? state.lastSyncAt,
        remoteBackups:
          action.remoteBackups !== null
            ? action.remoteBackups
            : state.remoteBackups,
        backupsLoadError: action.backupsLoadError,
        authExpired: action.backupsLoadError ? state.authExpired : false,
      };
    case "UPLOAD_ERROR":
      return {
        ...state,
        syncError: action.error,
      };
    case "UPLOAD_END":
      return {
        ...state,
        isSyncing: false,
      };
  }
}

export function deriveDriveBackupFlags(
  state: Pick<
    DriveBackupState,
    "isDriveStateLoaded" | "isConnected" | "needsLegacyReconnect"
  >,
  driveBackupPref: DriveBackupPreference | undefined,
  webClientId: string,
) {
  const isConfigured = !!webClientId;
  const needsLocalDriveLogin = computeNeedsLocalDriveLogin(
    state.isDriveStateLoaded,
    driveBackupPref,
    state.isConnected,
    state.needsLegacyReconnect,
  );
  const syncedAccountEmail = driveBackupPref?.email ?? null;
  return {
    isConfigured,
    canConnect: isConfigured,
    needsLocalDriveLogin,
    syncedAccountEmail,
  };
}

export interface DriveBackupControllerDeps {
  webClientId: string;
  loadDriveLocalState: () => Promise<LoadedDriveLocalState>;
  fetchDriveBackups: () => Promise<DriveBackupsFetchResult>;
  performDriveConnect: (webClientId: string) => Promise<PerformDriveConnectResult>;
  performDriveDisconnect: () => Promise<{ error: string | null }>;
  performDriveUpload: (content: string) => Promise<PerformDriveUploadResult>;
  setDriveBackupPref?: (pref: DriveBackupPreference) => void;
}

export interface DriveBackupController {
  getState: () => DriveBackupState;
  subscribe: (listener: (state: DriveBackupState) => void) => () => void;
  mount: () => Promise<void>;
  unmount: () => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBackups: () => Promise<void>;
  uploadContent: (content: string) => Promise<boolean>;
}

/**
 * Controlador puro de estado e concorrência do Google Drive (sem dependência de react-native).
 * Garante hidratação local imediata, proteção contra unmount e ordenação de requisições em voo.
 */
export function createDriveBackupController(
  deps: DriveBackupControllerDeps,
): DriveBackupController {
  let state: DriveBackupState = INITIAL_DRIVE_BACKUP_STATE;
  const listeners = new Set<(next: DriveBackupState) => void>();

  let mounted = true;
  let isConnected = false;
  let isConnecting = false;
  let activeUploads = 0;
  let sessionEpoch = 0;
  let backupsReqId = 0;
  let connectReqId = 0;

  const dispatch = (action: DriveBackupAction) => {
    if (!mounted) return;
    const next = driveBackupReducer(state, action);
    if (next === state) return;
    state = next;
    for (const listener of listeners) {
      listener(state);
    }
  };

  const mount = async (): Promise<void> => {
    mounted = true;
    const loadEpoch = sessionEpoch;
    try {
      const local = await deps.loadDriveLocalState();
      if (!mounted || sessionEpoch !== loadEpoch) return;

      isConnected = local.isConnected;
      dispatch({ type: "LOCAL_LOAD_SUCCESS", payload: local });

      if (!local.isConnected) return;

      const reqId = ++backupsReqId;
      const remote = await deps.fetchDriveBackups();
      if (!mounted || sessionEpoch !== loadEpoch || backupsReqId !== reqId) {
        return;
      }
      if (remote.error) {
        dispatch({
          type: "BACKUPS_FETCH_ERROR",
          error: remote.error,
          authExpired: remote.authExpired,
        });
      } else {
        dispatch({ type: "BACKUPS_FETCH_SUCCESS", backups: remote.backups });
      }
    } catch (err) {
      if (!mounted || sessionEpoch !== loadEpoch) return;
      isConnected = false;
      dispatch({
        type: "LOCAL_LOAD_ERROR",
        error:
          err instanceof Error
            ? err.message
            : "Erro ao carregar estado do Google Drive.",
      });
    }
  };

  const unmount = (): void => {
    mounted = false;
    sessionEpoch += 1;
    backupsReqId += 1;
    connectReqId += 1;
    isConnecting = false;
  };

  const connect = async (): Promise<void> => {
    if (isConnecting) return;
    isConnecting = true;
    const myConnectId = ++connectReqId;
    const connectEpoch = sessionEpoch;
    dispatch({ type: "CONNECT_START" });

    try {
      const result = await deps.performDriveConnect(deps.webClientId);
      if (!mounted || sessionEpoch !== connectEpoch) return;

      if (result.ok) {
        sessionEpoch += 1;
        backupsReqId += 1;
        isConnected = true;
        dispatch({
          type: "CONNECT_SUCCESS",
          email: result.email,
          lastSyncAt: result.lastSyncAt,
          remoteBackups: result.remoteBackups,
          backupsLoadError: result.backupsLoadError,
        });
        deps.setDriveBackupPref?.({
          enabled: true,
          email: result.email ?? undefined,
        });
      } else {
        dispatch({ type: "CONNECT_FAILURE", error: result.error });
      }
    } finally {
      if (connectReqId === myConnectId) {
        isConnecting = false;
        dispatch({ type: "CONNECT_SETTLE" });
      }
    }
  };

  const disconnect = async (): Promise<void> => {
    sessionEpoch += 1;
    backupsReqId += 1;
    connectReqId += 1;
    isConnected = false;
    isConnecting = false;
    const disconnectEpoch = sessionEpoch;
    dispatch({ type: "DISCONNECT_START" });

    const { error } = await deps.performDriveDisconnect();
    if (!mounted || sessionEpoch !== disconnectEpoch) return;

    if (!error) {
      dispatch({ type: "DISCONNECT_DONE", error: null });
      deps.setDriveBackupPref?.({ enabled: false });
      return;
    }

    let rehydrated: LoadedDriveLocalState | undefined;
    try {
      const local = await deps.loadDriveLocalState();
      if (!mounted || sessionEpoch !== disconnectEpoch) return;
      isConnected = local.isConnected;
      rehydrated = local;
    } catch {
      if (!mounted || sessionEpoch !== disconnectEpoch) return;
    }
    dispatch({ type: "DISCONNECT_DONE", error, rehydrated });
  };

  const refreshBackups = async (): Promise<void> => {
    if (!isConnected) return;
    const epoch = sessionEpoch;
    const reqId = ++backupsReqId;
    dispatch({ type: "BACKUPS_FETCH_START" });

    try {
      const local = await deps.loadDriveLocalState();
      if (!mounted || sessionEpoch !== epoch || backupsReqId !== reqId) return;

      if (!local.isConnected) {
        isConnected = false;
        dispatch({ type: "LOCAL_LOAD_SUCCESS", payload: local });
        return;
      }

      const remote = await deps.fetchDriveBackups();
      if (!mounted || sessionEpoch !== epoch || backupsReqId !== reqId) return;

      if (remote.error) {
        dispatch({
          type: "BACKUPS_FETCH_ERROR",
          error: remote.error,
          authExpired: remote.authExpired,
        });
      } else {
        dispatch({ type: "BACKUPS_FETCH_SUCCESS", backups: remote.backups });
      }
    } catch {
      if (!mounted || sessionEpoch !== epoch || backupsReqId !== reqId) return;
      dispatch({
        type: "BACKUPS_FETCH_ERROR",
        error: DRIVE_RECONNECT_COPY.backupsLoadError,
        authExpired: false,
      });
    }
  };

  const uploadContent = async (content: string): Promise<boolean> => {
    if (!isConnected) return false;

    const uploadEpoch = sessionEpoch;
    activeUploads += 1;
    dispatch({ type: "UPLOAD_START" });

    try {
      const result = await deps.performDriveUpload(content);
      if (!mounted || sessionEpoch !== uploadEpoch) {
        return false;
      }
      if (result.ok) {
        backupsReqId += 1;
        dispatch({
          type: "UPLOAD_SUCCESS",
          lastSyncAt: result.lastSyncAt,
          remoteBackups: result.remoteBackups,
          backupsLoadError: result.backupsLoadError,
        });
        return true;
      }
      dispatch({ type: "UPLOAD_ERROR", error: result.error });
      return false;
    } finally {
      activeUploads = Math.max(0, activeUploads - 1);
      if (activeUploads === 0) {
        dispatch({ type: "UPLOAD_END" });
      }
    }
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    mount,
    unmount,
    connect,
    disconnect,
    refreshBackups,
    uploadContent,
  };
}
