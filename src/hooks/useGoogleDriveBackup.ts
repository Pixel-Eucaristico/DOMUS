import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { GoogleDriveService } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import type { DriveTokens } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import { ConnectivityService } from "@/src/modules/ai/infrastructure/ConnectivityService";
import { getGoogleSignIn } from "@/src/modules/backup/infrastructure/GoogleNativeAuth";
import { NATIVE_TOKEN_TTL_MS } from "@/src/modules/backup/infrastructure/driveTokens";

// ─── Google OAuth ────────────────────────────────────────────────────────────
// Android/iOS: Google Sign-In nativo, access token via Play Services (sem client secret).
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

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

  const connectWeb = useCallback(async () => {
    const { signInWithGoogleWeb } = await import("@/src/modules/backup/infrastructure/GoogleOAuthWeb");
    const result = await signInWithGoogleWeb(WEB_CLIENT_ID);
    if (!result) return;

    // Fetch user email with the access token
    let userEmail = "";
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${result.accessToken}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        userEmail = userData.email ?? "";
      }
    } catch {}

    const tokens: DriveTokens = {
      accessToken: result.accessToken,
      refreshToken: "", // implicit flow doesn't provide refresh token
      expiresAt: Date.now() + result.expiresIn * 1000,
      email: userEmail,
      clientId: WEB_CLIENT_ID,
    };

    await GoogleDriveService.saveTokens(tokens);
    setIsConnected(true);
    setEmail(userEmail);
  }, []);

  const connectNative = useCallback(async () => {
    const mod = getGoogleSignIn();
    if (!mod) return;
    const { GoogleSignin } = mod;

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (response.type !== "success") return;

    const userEmail = response.data.user.email;
    const { accessToken } = await GoogleSignin.getTokens();

    const tokens: DriveTokens = {
      accessToken,
      refreshToken: "", // renovado pelo Play Services via getTokens(); não há refresh token
      expiresAt: Date.now() + NATIVE_TOKEN_TTL_MS,
      email: userEmail,
      clientId: WEB_CLIENT_ID,
      native: true,
    };

    await GoogleDriveService.saveTokens(tokens);
    setIsConnected(true);
    setEmail(userEmail);
  }, []);

  const connect = useCallback(async () => {
    if (!WEB_CLIENT_ID) {
      setSyncError(
        "Google Client ID nao configurado. Adicione EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no .env",
      );
      return;
    }
    setSyncError(null);
    setIsConnecting(true);

    const online = await ConnectivityService.isOnline();
    if (!online) {
      setSyncError("Sem conexão com a internet. Verifique sua conexão e tente novamente.");
      setIsConnecting(false);
      return;
    }

    try {
      if (Platform.OS === "web") {
        await connectWeb();
      } else {
        await connectNative();
      }
    } catch (e: any) {
      const statusCodes = getGoogleSignIn()?.statusCodes;
      if (statusCodes && e?.code === statusCodes.SIGN_IN_CANCELLED) {
        // Usuário cancelou — não exibir erro
      } else if (statusCodes && e?.code === statusCodes.IN_PROGRESS) {
        setSyncError("Login ja em andamento.");
      } else if (statusCodes && e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setSyncError("Google Play Services nao disponivel.");
      } else if (e?.code === "DEVELOPER_ERROR" || e?.code === 10 || /DEVELOPER_ERROR/.test(String(e?.message ?? ""))) {
        // Erro de configuracao OAuth: o SHA-1 do certificado que assinou este
        // build (EAS keystore ou chave do Play App Signing) nao esta registrado
        // como cliente OAuth Android no Google Cloud Console.
        setSyncError(
          "Configuracao OAuth invalida (DEVELOPER_ERROR): o SHA-1 do certificado deste build nao esta registrado no Google Cloud Console para o pacote br.com.pixeleucaristico.domus.",
        );
      } else {
        setSyncError(e instanceof Error ? e.message : "Erro ao conectar com o Google.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [connectWeb, connectNative]);

  const disconnect = useCallback(async () => {
    if (Platform.OS !== "web") {
      try {
        await getGoogleSignIn()?.GoogleSignin.signOut();
      } catch {
        // Ignora erro ao deslogar do Google Sign-In
      }
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
    const online = await ConnectivityService.isOnline();
    if (!online) {
      setSyncError("Sem conexão com a internet. Verifique sua conexão e tente novamente.");
      return false;
    }
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
