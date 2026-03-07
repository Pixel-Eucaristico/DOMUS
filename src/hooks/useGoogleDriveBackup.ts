import { useState, useEffect, useCallback } from "react";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { GoogleDriveService } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import type { DriveTokens } from "@/src/modules/backup/infrastructure/GoogleDriveService";

// ─── Google OAuth ────────────────────────────────────────────────────────────
// Usa Google Sign-In nativo (não browser). Requer no Google Cloud Console:
//   - Client ID "Android" com package br.com.pixeleucaristico.domus + SHA-1
//   - Client ID "Web" para obter serverAuthCode (usado para trocar por tokens)
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET ?? "";

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  scopes: ["https://www.googleapis.com/auth/drive.appdata"],
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useGoogleDriveBackup() {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // ── Load saved state on mount ────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const [connected, connEmail, lastSync] = await Promise.all([
        GoogleDriveService.isConnected(),
        GoogleDriveService.getConnectedEmail(),
        GoogleDriveService.getLastSyncAt(),
      ]);
      setIsConnected(connected);
      setEmail(connEmail);
      setLastSyncAt(lastSync);
    })();
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!WEB_CLIENT_ID) {
      setSyncError(
        "Google Client ID nao configurado. Adicione EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no .env",
      );
      return;
    }
    setSyncError(null);
    setIsConnecting(true);

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!response.data) {
        setIsConnecting(false);
        return;
      }

      const { serverAuthCode } = response.data;
      const userEmail = response.data.user.email;

      if (!serverAuthCode) {
        setSyncError("Nao foi possivel obter o codigo de autorizacao do Google.");
        setIsConnecting(false);
        return;
      }

      // Trocar o serverAuthCode por access + refresh tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: WEB_CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code: serverAuthCode,
          grant_type: "authorization_code",
        }).toString(),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        setSyncError(`Erro ao obter token: ${err}`);
        setIsConnecting(false);
        return;
      }

      const tokenData = await tokenRes.json();

      const tokens: DriveTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? "",
        expiresAt: Date.now() + (tokenData.expires_in ?? 3600) * 1000,
        email: userEmail,
        clientId: WEB_CLIENT_ID,
      };
      await GoogleDriveService.saveTokens(tokens);

      setIsConnected(true);
      setEmail(userEmail);
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
        // Usuário cancelou — não exibir erro
      } else if (e?.code === statusCodes.IN_PROGRESS) {
        setSyncError("Login ja em andamento.");
      } else if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setSyncError("Google Play Services nao disponivel.");
      } else {
        setSyncError(e instanceof Error ? e.message : "Erro ao conectar com o Google.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignora erro ao deslogar do Google Sign-In
    }
    await GoogleDriveService.clearTokens();
    setIsConnected(false);
    setEmail(null);
    setLastSyncAt(null);
    setSyncError(null);
  }, []);

  /**
   * Faz upload de um conteudo (string) para o Google Drive.
   * Pode ser chamado externamente (ex: useAutoBackup).
   */
  const uploadContent = useCallback(async (content: string): Promise<boolean> => {
    if (!isConnected) return false;
    setIsSyncing(true);
    setSyncError(null);
    try {
      await GoogleDriveService.uploadBackup(content);
      const ts = await GoogleDriveService.getLastSyncAt();
      setLastSyncAt(ts);
      return true;
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Erro ao sincronizar com o Drive.");
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isConnected]);

  const isConfigured = !!WEB_CLIENT_ID;

  return {
    isConnected,
    isConfigured,
    email,
    lastSyncAt,
    isSyncing,
    isConnecting,
    syncError,
    connect,
    disconnect,
    uploadContent,
    canConnect: isConfigured,
  };
}
