import { GoogleDriveService } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import type {
  DriveBackupFile,
  DriveTokens,
} from "@/src/modules/backup/infrastructure/GoogleDriveService";
import { ConnectivityService } from "@/src/modules/ai/infrastructure/ConnectivityService";
import {
  DomusGoogleAuthErrorCodes,
  authorizeDriveNative,
  clearCachedGoogleAccessToken,
  getDomusGoogleAuth,
  signInWithGoogleNative,
  signOutGoogleNative,
} from "@/src/modules/backup/infrastructure/GoogleNativeAuth";
import {
  NATIVE_TOKEN_TTL_MS,
  isDriveConnected,
  isLegacyDriveConnection,
} from "@/src/modules/backup/infrastructure/driveTokens";
import { DRIVE_RECONNECT_COPY } from "@/src/modules/backup/domain/driveReconnectCopy";
import { isWeb } from "@/src/modules/backup/infrastructure/deviceBackupKey";

export { computeNeedsLocalDriveLogin } from "./driveBackupState";

const USERINFO_TIMEOUT_MS = 10_000;
const DEFAULT_WEB_TOKEN_TTL_SEC = 3600;

export interface LoadedDriveLocalState {
  isConnected: boolean;
  needsLegacyReconnect: boolean;
  email: string | null;
  lastSyncAt: number | null;
}

export interface DriveBackupsFetchResult {
  backups: DriveBackupFile[];
  error: string | null;
  authExpired: boolean;
}

export type PerformDriveConnectResult =
  | {
      ok: true;
      email: string | null;
      lastSyncAt: number | null;
      remoteBackups: DriveBackupFile[];
      backupsLoadError: string | null;
    }
  | { ok: false; cancelled: boolean; error: string | null };

export type PerformDriveUploadResult =
  | {
      ok: true;
      lastSyncAt: number | null;
      remoteBackups: DriveBackupFile[] | null;
      backupsLoadError: string | null;
    }
  | { ok: false; error: string };

function isDriveAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    /Google Drive:\s*(401|403)\b/.test(msg) || /N[aã]o autenticado/i.test(msg)
  );
}

export async function fetchDriveBackups(options?: {
  skipConnectivityCheck?: boolean;
}): Promise<DriveBackupsFetchResult> {
  try {
    if (!options?.skipConnectivityCheck) {
      const online = await ConnectivityService.isOnline();
      if (!online) {
        return {
          backups: [],
          error: DRIVE_RECONNECT_COPY.backupsLoadOffline,
          authExpired: false,
        };
      }
    }
    const backups = await GoogleDriveService.listBackups();
    return { backups, error: null, authExpired: false };
  } catch (err) {
    if (isDriveAuthError(err)) {
      return {
        backups: [],
        error: DRIVE_RECONNECT_COPY.backupsLoadAuthError,
        authExpired: true,
      };
    }
    return {
      backups: [],
      error: DRIVE_RECONNECT_COPY.backupsLoadError,
      authExpired: false,
    };
  }
}

export async function loadDriveLocalState(): Promise<LoadedDriveLocalState> {
  const [tokens, lastSyncAt] = await Promise.all([
    GoogleDriveService.loadTokens(),
    GoogleDriveService.getLastSyncAt(),
  ]);

  const web = isWeb();
  const needsLegacyReconnect = isLegacyDriveConnection(tokens, web);
  const isConnected = !needsLegacyReconnect && isDriveConnected(tokens);
  const email = tokens?.email?.trim() || null;

  return {
    isConnected,
    needsLegacyReconnect,
    email,
    lastSyncAt,
  };
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
): Promise<PerformDriveConnectResult> {
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

    const [lastSyncAt, listResult] = await Promise.all([
      GoogleDriveService.getLastSyncAt().catch(() => null),
      fetchDriveBackups({ skipConnectivityCheck: true }),
    ]);

    return {
      ok: true,
      email: connected.email,
      lastSyncAt,
      remoteBackups: listResult.backups,
      backupsLoadError: listResult.error,
    };
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
): Promise<PerformDriveUploadResult> {
  try {
    const online = await ConnectivityService.isOnline();
    if (!online) {
      return {
        ok: false,
        error: "Sem conexão com a internet. Verifique sua conexão e tente novamente.",
      };
    }

    await GoogleDriveService.uploadBackup(content);
    const [lastSyncAt, listResult] = await Promise.all([
      GoogleDriveService.getLastSyncAt().catch(() => null),
      fetchDriveBackups({ skipConnectivityCheck: true }),
    ]);
    return {
      ok: true,
      lastSyncAt,
      remoteBackups: listResult.error ? null : listResult.backups,
      backupsLoadError: listResult.error,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao sincronizar com o Drive.",
    };
  }
}
