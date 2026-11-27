import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStateOptional } from "@/src/context/AppStateProvider";
import {
  fetchDriveBackups,
  loadDriveLocalState,
  performDriveConnect,
  performDriveDisconnect,
  performDriveUpload,
} from "@/src/modules/backup/application/driveBackupActions";
import {
  INITIAL_DRIVE_BACKUP_STATE,
  createDriveBackupController,
  deriveDriveBackupFlags,
  type DriveBackupController,
} from "@/src/modules/backup/application/driveBackupState";

// ─── Google OAuth ────────────────────────────────────────────────────────────
// Android: Credential Manager + AuthorizationClient; iOS: GIDSignIn (modules/domus-google-auth, sem client secret).
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useGoogleDriveBackup() {
  const appState = useAppStateOptional();
  const driveBackupPref = appState?.driveBackupPref;
  const setDriveBackupPref = appState?.setDriveBackupPref;
  const setDriveBackupPrefRef = useRef(setDriveBackupPref);

  useEffect(() => {
    setDriveBackupPrefRef.current = setDriveBackupPref;
  }, [setDriveBackupPref]);

  const [controller] = useState<DriveBackupController>(() =>
    createDriveBackupController({
      webClientId: WEB_CLIENT_ID,
      loadDriveLocalState,
      fetchDriveBackups,
      performDriveConnect,
      performDriveDisconnect,
      performDriveUpload,
      setDriveBackupPref: (pref) => setDriveBackupPrefRef.current?.(pref),
    }),
  );

  const [state, setState] = useState(() => INITIAL_DRIVE_BACKUP_STATE);

  useEffect(() => {
    const unsubscribe = controller.subscribe(setState);
    void controller.mount();
    return () => {
      unsubscribe();
      controller.unmount();
    };
  }, [controller]);

  const connect = useCallback(() => controller.connect(), [controller]);
  const disconnect = useCallback(() => controller.disconnect(), [controller]);
  const refreshBackups = useCallback(() => controller.refreshBackups(), [controller]);
  const uploadContent = useCallback(
    (content: string) => controller.uploadContent(content),
    [controller],
  );

  const flags = deriveDriveBackupFlags(state, driveBackupPref, WEB_CLIENT_ID);

  return {
    isConnected: state.isConnected,
    isConfigured: flags.isConfigured,
    email: state.email,
    lastSyncAt: state.lastSyncAt,
    isSyncing: state.isSyncing,
    isConnecting: state.isConnecting,
    syncError: state.syncError,
    needsLegacyReconnect: state.needsLegacyReconnect,
    needsLocalDriveLogin: flags.needsLocalDriveLogin,
    syncedAccountEmail: flags.syncedAccountEmail,
    remoteBackups: state.remoteBackups,
    isLoadingBackups: state.isLoadingBackups,
    backupsLoadError: state.backupsLoadError,
    authExpired: state.authExpired,
    connect,
    disconnect,
    uploadContent,
    refreshBackups,
    canConnect: flags.canConnect,
  };
}
