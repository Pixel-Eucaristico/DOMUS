import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStateOptional } from "@/src/context/AppStateProvider";
import {
  computeNeedsLocalDriveLogin,
  loadDriveState,
  performDriveConnect,
  performDriveDisconnect,
  performDriveUpload,
} from "@/src/modules/backup/application/driveBackupActions";

// ─── Google OAuth ────────────────────────────────────────────────────────────
// Android/iOS: Google Sign-In nativo, access token via Play Services (sem client secret).
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useGoogleDriveBackup() {
  const appState = useAppStateOptional();
  const driveBackupPref = appState?.driveBackupPref;
  const setDriveBackupPref = appState?.setDriveBackupPref;

  const [isConnected, setIsConnected] = useState(false);
  const [isDriveStateLoaded, setIsDriveStateLoaded] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const isConnectedRef = useRef(false);
  const isConnectingRef = useRef(false);
  const activeUploadsRef = useRef(0);
  const sessionEpochRef = useRef(0);

  // ── Load saved state on mount ────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const state = await loadDriveState();
        if (!mounted) return;
        isConnectedRef.current = state.isConnected;
        setIsConnected(state.isConnected);
        setEmail(state.email);
        setLastSyncAt(state.lastSyncAt);
      } catch (err) {
        if (!mounted) return;
        isConnectedRef.current = false;
        setIsConnected(false);
        setSyncError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar estado do Google Drive.",
        );
      } finally {
        if (mounted) setIsDriveStateLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    setSyncError(null);
    setIsConnecting(true);

    try {
      const result = await performDriveConnect(WEB_CLIENT_ID);
      if (result.ok) {
        isConnectedRef.current = true;
        setIsConnected(true);
        setEmail(result.email);
        setDriveBackupPref?.({
          enabled: true,
          email: result.email ?? undefined,
        });
      } else if (result.error) {
        setSyncError(result.error);
      }
    } finally {
      isConnectingRef.current = false;
      setIsConnecting(false);
    }
  }, [setDriveBackupPref]);

  const disconnect = useCallback(async () => {
    sessionEpochRef.current += 1;
    isConnectedRef.current = false;
    setIsConnected(false);
    setEmail(null);
    setLastSyncAt(null);

    const { error } = await performDriveDisconnect();
    setSyncError(error);
    setDriveBackupPref?.({ enabled: false });
  }, [setDriveBackupPref]);

  /**
   * Faz upload de um conteudo (string) para o Google Drive.
   * Pode ser chamado externamente (ex: useAutoBackup).
   */
  const uploadContent = useCallback(async (content: string): Promise<boolean> => {
    if (!isConnectedRef.current) return false;

    const uploadEpoch = sessionEpochRef.current;
    activeUploadsRef.current += 1;
    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await performDriveUpload(content);
      if (sessionEpochRef.current !== uploadEpoch) {
        return false;
      }
      if (result.ok) {
        setLastSyncAt(result.lastSyncAt);
        return true;
      }
      setSyncError(result.error);
      return false;
    } finally {
      activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
      if (activeUploadsRef.current === 0) {
        setIsSyncing(false);
      }
    }
  }, []);

  const isConfigured = !!WEB_CLIENT_ID;
  const needsLocalDriveLogin = computeNeedsLocalDriveLogin(
    isDriveStateLoaded,
    driveBackupPref,
    isConnected,
  );
  const syncedAccountEmail = driveBackupPref?.email ?? null;

  return {
    isConnected,
    isConfigured,
    email,
    lastSyncAt,
    isSyncing,
    isConnecting,
    syncError,
    needsLocalDriveLogin,
    syncedAccountEmail,
    connect,
    disconnect,
    uploadContent,
    canConnect: isConfigured,
  };
}
