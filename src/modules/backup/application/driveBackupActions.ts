import { GoogleDriveService } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import type { DriveTokens } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import { ConnectivityService } from "@/src/modules/ai/infrastructure/ConnectivityService";
import {
  DRIVE_APPDATA_SCOPE,
  DomusGoogleAuthErrorCodes,
  authorizeDriveNative,
  clearCachedGoogleAccessToken,
  getDomusGoogleAuth,
  signInWithGoogleNative,
  signOutGoogleNative,
} from "@/src/modules/backup/infrastructure/GoogleNativeAuth";
import { NATIVE_TOKEN_TTL_MS } from "@/src/modules/backup/infrastructure/driveTokens";
import {
  shouldPromptDriveConnectOnThisDevice,
  type DriveBackupPreference,
} from "@/src/modules/backup/domain/syncedDriveBackupPref";
import { isWeb } from "@/src/modules/backup/infrastructure/deviceBackupKey";

const USERINFO_TIMEOUT_MS = 10_000;
const DEFAULT_WEB_TOKEN_TTL_SEC = 3600;

export interface LoadedDriveState {
  isConnected: boolean;
  email: string | null;
  lastSyncAt: number | null;
}

export async function loadDriveState(): Promise<LoadedDriveState> {
  const [isConnected, email, lastSyncAt] = await Promise.all([
    GoogleDriveService.isConnected(),
    GoogleDriveService.getConnectedEmail(),
    GoogleDriveService.getLastSyncAt(),
  ]);
  return { isConnected, email, lastSyncAt };
}

export function computeNeedsLocalDriveLogin(
  isDriveStateLoaded: boolean,
  driveBackupPref: DriveBackupPreference | undefined,
  isConnected: boolean,
): boolean {
  return (
    isDriveStateLoaded &&
    shouldPromptDriveConnectOnThisDevice(driveBackupPref, isConnected)
  );
}

export async function connectDriveWeb(
  webClientId: string,
): Promise<{ email: string | null } | null> {
  const { signInWithGoogleWeb } = await import(
    "@/src/modules/backup/infrastructure/GoogleOAuthWeb"
  );
  const result = await signInWithGoogleWeb(webClientId);
  if (!result) return null;

  let userEmail = "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), USERINFO_TIMEOUT_MS);
  try {
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${result.accessToken}` },
      signal: controller.signal,
    });
    if (userRes.ok) {
      const userData = (await userRes.json()) as { email?: unknown };
      if (typeof userData.email === "string") {
        userEmail = userData.email;
      }
    }
  } catch {
    // userinfo é opcional; segue sem e-mail se falhar ou expirar timeout
  } finally {
    clearTimeout(timer);
  }

  const expiresInSec =
    typeof result.expiresIn === "number" &&
    Number.isFinite(result.expiresIn) &&
    result.expiresIn > 0
      ? result.expiresIn
      : DEFAULT_WEB_TOKEN_TTL_SEC;

  const tokens: DriveTokens = {
    accessToken: result.accessToken,
    refreshToken: "",
    expiresAt: Date.now() + expiresInSec * 1000,
    email: userEmail,
    clientId: webClientId,
  };

  await GoogleDriveService.saveTokens(tokens);
  return { email: userEmail || null };
}

export async function connectDriveNative(
  webClientId: string,
): Promise<{ email: string | null } | null> {
  if (!getDomusGoogleAuth()) {
    throw new Error("Google Sign-In nativo indisponível neste ambiente.");
  }

  const signInResult = await signInWithGoogleNative(webClientId);
  const userEmail = signInResult.email;

  const authorization = await authorizeDriveNative(userEmail, true);
  if (!authorization?.accessToken) {
    return null;
  }

  if (
    !Array.isArray(authorization.grantedScopes) ||
    !authorization.grantedScopes.includes(DRIVE_APPDATA_SCOPE)
  ) {
    throw Object.assign(
      new Error(
        "Permissão do Google Drive não concedida. Marque o acesso ao Google Drive na tela de consentimento e tente novamente.",
      ),
      { code: DomusGoogleAuthErrorCodes.RESOLUTION_REQUIRED },
    );
  }

  const tokens: DriveTokens = {
    accessToken: authorization.accessToken,
    refreshToken: "",
    expiresAt: Date.now() + NATIVE_TOKEN_TTL_MS,
    email: userEmail,
    clientId: webClientId,
    native: true,
    authProvider: "credential-manager",
  };

  await GoogleDriveService.saveTokens(tokens);
  return { email: userEmail || null };
}

export function formatDriveConnectError(err: unknown): string | null {
  const e = err as { code?: unknown; message?: unknown } | null;
  const code = e?.code;
  const message = String(e?.message ?? "");

  if (code === DomusGoogleAuthErrorCodes.SIGN_IN_CANCELLED) {
    return null;
  }
  if (code === DomusGoogleAuthErrorCodes.IN_PROGRESS) {
    return "Login já em andamento.";
  }
  if (code === DomusGoogleAuthErrorCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return "Google Play Services não disponível.";
  }
  if (code === DomusGoogleAuthErrorCodes.NO_CREDENTIAL) {
    return "Nenhuma conta Google disponível neste aparelho. Adicione uma conta Google nas configurações do dispositivo e tente novamente.";
  }
  if (code === DomusGoogleAuthErrorCodes.NOT_CONFIGURED) {
    return "Configuração do login Google incompleta neste build. Verifique as credenciais OAuth do aplicativo.";
  }
  if (code === DomusGoogleAuthErrorCodes.NO_ACTIVITY) {
    return "Não foi possível abrir a tela de login Google agora. Volte ao aplicativo e tente novamente.";
  }
  if (code === DomusGoogleAuthErrorCodes.RESOLUTION_REQUIRED) {
    return "Permissão do Google Drive não concedida. Autorize o acesso ao Drive e tente novamente.";
  }
  if (
    code === DomusGoogleAuthErrorCodes.DEVELOPER_ERROR ||
    code === 10 ||
    /DEVELOPER_ERROR|28444/.test(message)
  ) {
    if (process.env.EXPO_OS === "ios") {
      return "Configuração OAuth inválida (DEVELOPER_ERROR): verifique o GIDClientID e o esquema de URL em GoogleService-Info.plist.";
    }
    return "Configuração OAuth inválida (DEVELOPER_ERROR): o SHA-1 do certificado deste build não está registrado no Google Cloud Console para o pacote br.com.pixeleucaristico.domus.";
  }
  if (code === DomusGoogleAuthErrorCodes.AUTH_ERROR) {
    return "Não foi possível concluir a autenticação com o Google. Tente novamente.";
  }
  return err instanceof Error ? err.message : "Erro ao conectar com o Google.";
}

export async function performDriveConnect(
  webClientId: string,
): Promise<
  | { ok: true; email: string | null }
  | { ok: false; cancelled: boolean; error: string | null }
> {
  if (!webClientId) {
    return {
      ok: false,
      cancelled: false,
      error:
        "Google Client ID não configurado. Adicione EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no .env",
    };
  }

  try {
    const online = await ConnectivityService.isOnline();
    if (!online) {
      return {
        ok: false,
        cancelled: false,
        error: "Sem conexão com a internet. Verifique sua conexão e tente novamente.",
      };
    }

    const connected = isWeb()
      ? await connectDriveWeb(webClientId)
      : await connectDriveNative(webClientId);

    if (!connected) {
      return { ok: false, cancelled: true, error: null };
    }
    return { ok: true, email: connected.email };
  } catch (err) {
    const formatted = formatDriveConnectError(err);
    if (formatted === null) {
      return { ok: false, cancelled: true, error: null };
    }
    return { ok: false, cancelled: false, error: formatted };
  }
}

export async function performDriveDisconnect(): Promise<{ error: string | null }> {
  if (!isWeb()) {
    try {
      const existing = await GoogleDriveService.loadTokens();
      if (existing?.accessToken) {
        await clearCachedGoogleAccessToken(existing.accessToken);
      }
    } catch {
      // Ignora erro ao invalidar token em cache no Play Services / iOS
    }

    try {
      await signOutGoogleNative();
    } catch {
      // Ignora erro ao encerrar credencial nativa
    }
  }

  try {
    await GoogleDriveService.clearTokens();
    return { error: null };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Erro ao remover tokens do Google Drive.",
    };
  }
}

export async function performDriveUpload(
  content: string,
): Promise<{ ok: true; lastSyncAt: number | null } | { ok: false; error: string }> {
  try {
    const online = await ConnectivityService.isOnline();
    if (!online) {
      return {
        ok: false,
        error: "Sem conexão com a internet. Verifique sua conexão e tente novamente.",
      };
    }

    await GoogleDriveService.uploadBackup(content);
    const lastSyncAt = await GoogleDriveService.getLastSyncAt();
    return { ok: true, lastSyncAt };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao sincronizar com o Drive.",
    };
  }
}
