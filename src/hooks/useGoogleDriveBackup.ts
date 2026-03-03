import { useState, useEffect, useCallback } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleDriveService } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import type { DriveTokens } from "@/src/modules/backup/infrastructure/GoogleDriveService";

// ─── Expo OAuth Browser redirect ─────────────────────────────────────────────
WebBrowser.maybeCompleteAuthSession();

// ─── Google OAuth Client IDs (configurar em .env) ────────────────────────────
// Crie um projeto no Google Cloud Console, ative a Google Drive API e gere:
//   - EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID → cliente "Android"
//       Pacote: br.com.pixeleucaristico.domus
//       SHA-1:  5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
//   - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     → cliente "iOS"
//       Bundle: br.com.pixeleucaristico.domus
//   - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     → cliente "Web" (para autenticação cruzada/id token)
// Ver: https://docs.expo.dev/guides/google-authentication/

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useGoogleDriveBackup() {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // expo-auth-session Google provider
  // O redirectUri é gerenciado automaticamente pelo provider:
  //   - Em builds nativas: br.com.pixeleucaristico.domus:/oauthredirect
  //   - Requer cliente Android/iOS no Google Cloud Console (não "Web" ou "Instalado")
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: WEB_CLIENT_ID || undefined,
    iosClientId: IOS_CLIENT_ID || undefined,
    androidClientId: ANDROID_CLIENT_ID || undefined,
    scopes: ["https://www.googleapis.com/auth/drive.file", "email"],
  });

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

  // ── Handle OAuth response ─────────────────────────────────────────────────

  useEffect(() => {
    if (response?.type !== "success") {
      if (response?.type === "error" || response?.type === "dismiss") {
        setIsConnecting(false);
      }
      return;
    }

    setIsConnecting(false);
    const { authentication } = response;
    if (!authentication?.accessToken) return;

    (async () => {
      try {
        const userEmail = await GoogleDriveService.fetchUserEmail(authentication.accessToken);

        // Determina o clientId usado (preferência: nativo > web)
        const clientId = IOS_CLIENT_ID || ANDROID_CLIENT_ID || WEB_CLIENT_ID;

        const tokens: DriveTokens = {
          accessToken: authentication.accessToken,
          refreshToken: authentication.refreshToken ?? "",
          expiresAt: Date.now() + (authentication.expiresIn ?? 3600) * 1000,
          email: userEmail,
          clientId,
        };
        await GoogleDriveService.saveTokens(tokens);

        setIsConnected(true);
        setEmail(userEmail);
      } catch {
        setSyncError("Não foi possível salvar as credenciais do Google.");
      }
    })();
  }, [response]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!WEB_CLIENT_ID && !IOS_CLIENT_ID && !ANDROID_CLIENT_ID) {
      setSyncError(
        "Google Client ID não configurado. Adicione EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no .env",
      );
      return;
    }
    setSyncError(null);
    setIsConnecting(true);
    await promptAsync();
  }, [promptAsync]);

  const disconnect = useCallback(async () => {
    await GoogleDriveService.clearTokens();
    setIsConnected(false);
    setEmail(null);
    setLastSyncAt(null);
    setSyncError(null);
  }, []);

  /**
   * Faz upload de um conteúdo (string) para o Google Drive.
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

  const isConfigured = !!(WEB_CLIENT_ID || IOS_CLIENT_ID || ANDROID_CLIENT_ID);

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
    canConnect: !!request && isConfigured,
  };
}
