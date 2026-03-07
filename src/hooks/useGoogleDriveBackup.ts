import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { GoogleDriveService } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import type { DriveTokens } from "@/src/modules/backup/infrastructure/GoogleDriveService";

// ─── Google OAuth ────────────────────────────────────────────────────────────
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET ?? "";

// Native Google Sign-In (Android/iOS only)
let GoogleSignin: any = null;
let statusCodes: any = {};
if (Platform.OS !== "web") {
  const mod = require("@react-native-google-signin/google-signin");
  GoogleSignin = mod.GoogleSignin;
  statusCodes = mod.statusCodes;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    scopes: ["https://www.googleapis.com/auth/drive.appdata"],
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  });
}

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

  const exchangeCodeForTokens = useCallback(async (authCode: string, redirectUri?: string): Promise<DriveTokens | null> => {
    const body: Record<string, string> = {
      client_id: WEB_CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: authCode,
      grant_type: "authorization_code",
    };
    if (redirectUri) body.redirect_uri = redirectUri;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      setSyncError(`Erro ao obter token: ${err}`);
      return null;
    }

    const tokenData = await tokenRes.json();

    // Fetch user email
    let userEmail = "";
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        userEmail = userData.email ?? "";
      }
    } catch {}

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? "",
      expiresAt: Date.now() + (tokenData.expires_in ?? 3600) * 1000,
      email: userEmail,
      clientId: WEB_CLIENT_ID,
    };
  }, []);

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
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!response.data) return;

    const { serverAuthCode } = response.data;
    const userEmail = response.data.user.email;

    if (!serverAuthCode) {
      setSyncError("Nao foi possivel obter o codigo de autorizacao do Google.");
      return;
    }

    const tokens = await exchangeCodeForTokens(serverAuthCode);
    if (!tokens) return;

    tokens.email = userEmail;
    await GoogleDriveService.saveTokens(tokens);
    setIsConnected(true);
    setEmail(userEmail);
  }, [exchangeCodeForTokens]);

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
      if (Platform.OS === "web") {
        await connectWeb();
      } else {
        await connectNative();
      }
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
  }, [connectWeb, connectNative]);

  const disconnect = useCallback(async () => {
    if (Platform.OS !== "web") {
      try {
        await GoogleSignin.signOut();
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
