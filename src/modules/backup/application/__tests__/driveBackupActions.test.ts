import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DomusGoogleAuthErrorCodes } from "@/modules/domus-google-auth/src/types";
import type { DriveTokens } from "@/src/modules/backup/infrastructure/driveTokens";
import type { DriveBackupFile } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import {
  computeNeedsLocalDriveLogin,
  fetchDriveBackups,
  formatDriveConnectError,
  loadDriveLocalState,
  loadDriveState,
  performDriveConnect,
  performDriveDisconnect,
  performDriveUpload,
} from "../driveBackupActions";

const mocks = vi.hoisted(() => ({
  isWeb: false,
  isOnline: vi.fn(async () => true),
  isConnected: vi.fn(async () => false),
  getConnectedEmail: vi.fn(async () => null as string | null),
  getLastSyncAt: vi.fn(async () => null as number | null),
  loadTokens: vi.fn(async () => null as DriveTokens | null),
  saveTokens: vi.fn(async () => {}),
  clearTokens: vi.fn(async () => {}),
  uploadBackup: vi.fn(async () => {}),
  listBackups: vi.fn(async () => [] as DriveBackupFile[]),
  signInWithGoogleWeb: vi.fn(
    async () => null as { accessToken: string; expiresIn: number } | null,
  ),
  nativeModulePresent: true,
  signInWithGoogleNative: vi.fn(async () => ({
    email: "willian@example.com",
    idToken: "id-tok-123",
    displayName: "Willian",
  })),
  authorizeDriveNative: vi.fn(
    async () =>
      ({
        accessToken: "drive-access-tok",
        grantedScopes: ["https://www.googleapis.com/auth/drive.appdata"],
      }) as { accessToken: string; grantedScopes: string[] } | null,
  ),
  clearCachedGoogleAccessToken: vi.fn(async (_token?: string) => {}),
  signOutGoogleNative: vi.fn(async () => {}),
}));

vi.mock("@/src/modules/backup/infrastructure/deviceBackupKey", () => ({
  isWeb: () => mocks.isWeb,
}));

vi.mock("@/src/modules/ai/infrastructure/ConnectivityService", () => ({
  ConnectivityService: {
    isOnline: mocks.isOnline,
  },
}));

vi.mock("@/src/modules/backup/infrastructure/GoogleDriveService", () => ({
  GoogleDriveService: {
    isConnected: mocks.isConnected,
    getConnectedEmail: mocks.getConnectedEmail,
    getLastSyncAt: mocks.getLastSyncAt,
    loadTokens: mocks.loadTokens,
    saveTokens: mocks.saveTokens,
    clearTokens: mocks.clearTokens,
    uploadBackup: mocks.uploadBackup,
    listBackups: mocks.listBackups,
  },
}));

vi.mock("@/src/modules/backup/infrastructure/GoogleOAuthWeb", () => ({
  signInWithGoogleWeb: mocks.signInWithGoogleWeb,
}));

vi.mock("@/src/modules/backup/infrastructure/GoogleNativeAuth", () => ({
  DRIVE_APPDATA_SCOPE: "https://www.googleapis.com/auth/drive.appdata",
  DomusGoogleAuthErrorCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    NO_CREDENTIAL: "NO_CREDENTIAL",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
    DEVELOPER_ERROR: "DEVELOPER_ERROR",
    RESOLUTION_REQUIRED: "RESOLUTION_REQUIRED",
    NO_ACTIVITY: "NO_ACTIVITY",
    NOT_CONFIGURED: "NOT_CONFIGURED",
    AUTH_ERROR: "AUTH_ERROR",
  },
  getDomusGoogleAuth: () => (mocks.nativeModulePresent ? {} : null),
  signInWithGoogleNative: mocks.signInWithGoogleNative,
  authorizeDriveNative: mocks.authorizeDriveNative,
  clearCachedGoogleAccessToken: mocks.clearCachedGoogleAccessToken,
  signOutGoogleNative: mocks.signOutGoogleNative,
}));

describe("driveBackupActions", () => {
  const originalExpoOs = process.env.EXPO_OS;

  beforeEach(() => {
    mocks.isWeb = false;
    mocks.nativeModulePresent = true;
    process.env.EXPO_OS = "android";
    vi.clearAllMocks();
    mocks.isOnline.mockResolvedValue(true);
    mocks.isConnected.mockResolvedValue(false);
    mocks.getConnectedEmail.mockResolvedValue(null);
    mocks.getLastSyncAt.mockResolvedValue(null);
    mocks.loadTokens.mockResolvedValue(null);
    mocks.saveTokens.mockResolvedValue(undefined);
    mocks.clearTokens.mockResolvedValue(undefined);
    mocks.uploadBackup.mockResolvedValue(undefined);
    mocks.listBackups.mockResolvedValue([]);
    mocks.signInWithGoogleWeb.mockResolvedValue(null);
    mocks.signInWithGoogleNative.mockResolvedValue({
      email: "willian@example.com",
      idToken: "id-tok-123",
      displayName: "Willian",
    });
    mocks.authorizeDriveNative.mockResolvedValue({
      accessToken: "drive-access-tok",
      grantedScopes: ["https://www.googleapis.com/auth/drive.appdata"],
    });
    mocks.clearCachedGoogleAccessToken.mockResolvedValue(undefined);
    mocks.signOutGoogleNative.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.EXPO_OS = originalExpoOs;
    vi.unstubAllGlobals();
  });

  it("computeNeedsLocalDriveLogin só ativa após isDriveStateLoaded e cede prioridade a needsLegacyReconnect", () => {
    expect(computeNeedsLocalDriveLogin(false, { enabled: true }, false)).toBe(false);
    expect(computeNeedsLocalDriveLogin(true, { enabled: true }, false)).toBe(true);
    expect(computeNeedsLocalDriveLogin(true, { enabled: true }, true)).toBe(false);
    expect(computeNeedsLocalDriveLogin(true, { enabled: false }, false)).toBe(false);
    expect(computeNeedsLocalDriveLogin(true, { enabled: true }, false, true)).toBe(false);
  });

  it("loadDriveState propaga rejeição de loadTokens para o caller tratar em try/catch", async () => {
    mocks.loadTokens.mockRejectedValueOnce(new Error("keystore failed"));
    await expect(loadDriveState()).rejects.toThrow("keystore failed");
  });

  it("loadDriveLocalState lê loadTokens() apenas 1x e detecta conexão legada preservando email/lastSyncAt", async () => {
    mocks.loadTokens.mockResolvedValueOnce({
      accessToken: "old-tok",
      refreshToken: "",
      expiresAt: Date.now() + 60_000,
      email: "legado@example.com",
      clientId: "cid",
      native: true,
    });
    mocks.getLastSyncAt.mockResolvedValueOnce(1_700_000_000_000);

    const local = await loadDriveLocalState();

    expect(local).toEqual({
      isConnected: false,
      needsLegacyReconnect: true,
      email: "legado@example.com",
      lastSyncAt: 1_700_000_000_000,
    });
    expect(mocks.loadTokens).toHaveBeenCalledTimes(1);
    expect(mocks.isConnected).not.toHaveBeenCalled();
    expect(mocks.getConnectedEmail).not.toHaveBeenCalled();
  });

  it("loadDriveState detecta conexão legada no nativo preservando email/lastSyncAt sem listar backups nem limpar tokens", async () => {
    mocks.loadTokens.mockResolvedValueOnce({
      accessToken: "old-tok",
      refreshToken: "",
      expiresAt: Date.now() + 60_000,
      email: "legado@example.com",
      clientId: "cid",
      native: true,
    });
    mocks.getLastSyncAt.mockResolvedValueOnce(1_700_000_000_000);

    const state = await loadDriveState();

    expect(state).toEqual({
      isConnected: false,
      needsLegacyReconnect: true,
      email: "legado@example.com",
      lastSyncAt: 1_700_000_000_000,
      remoteBackups: [],
      backupsLoadError: null,
    });
    expect(mocks.loadTokens).toHaveBeenCalledTimes(1);
    expect(mocks.listBackups).not.toHaveBeenCalled();
    expect(mocks.clearTokens).not.toHaveBeenCalled();
  });

  it("loadDriveState lista backups em sessão moderna conectada e nunca marca web como legada", async () => {
    const existingBackup: DriveBackupFile = {
      id: "file-1",
      name: "domus-backup.domusbackup",
      modifiedTime: "2026-11-26T19:23:00.000Z",
      size: 14_820,
    };
    mocks.loadTokens.mockResolvedValueOnce({
      accessToken: "mod-tok",
      refreshToken: "",
      expiresAt: Date.now() + 60_000,
      email: "willian@example.com",
      clientId: "cid",
      native: true,
      authProvider: "credential-manager",
    });
    mocks.getLastSyncAt.mockResolvedValueOnce(1_700_000_555_000);
    mocks.listBackups.mockResolvedValueOnce([existingBackup]);

    const state = await loadDriveState();
    expect(state).toEqual({
      isConnected: true,
      needsLegacyReconnect: false,
      email: "willian@example.com",
      lastSyncAt: 1_700_000_555_000,
      remoteBackups: [existingBackup],
      backupsLoadError: null,
    });

    // Na web sem authProvider não dispara needsLegacyReconnect
    mocks.isWeb = true;
    mocks.loadTokens.mockResolvedValueOnce({
      accessToken: "web-tok",
      refreshToken: "",
      expiresAt: Date.now() + 60_000,
      email: "web@example.com",
      clientId: "cid",
    });
    mocks.listBackups.mockResolvedValueOnce([]);

    const webState = await loadDriveState();
    expect(webState.isConnected).toBe(true);
    expect(webState.needsLegacyReconnect).toBe(false);
  });

  it("fetchDriveBackups diferencia offline, erro de autorização (401/403/Não autenticado) e erro genérico de rede", async () => {
    mocks.isOnline.mockResolvedValueOnce(false);
    expect(await fetchDriveBackups()).toEqual({
      backups: [],
      error: "Sem conexão com a internet para listar os backups agora.",
      authExpired: false,
    });

    mocks.listBackups.mockRejectedValueOnce(new Error("Google Drive: 401 Invalid Credentials"));
    expect(await fetchDriveBackups()).toEqual({
      backups: [],
      error: "A autorização do Google Drive expirou ou foi revogada. Reconecte sua conta para continuar.",
      authExpired: true,
    });

    mocks.listBackups.mockRejectedValueOnce(new Error("Google Drive: 403 Forbidden"));
    expect(await fetchDriveBackups()).toEqual({
      backups: [],
      error: "A autorização do Google Drive expirou ou foi revogada. Reconecte sua conta para continuar.",
      authExpired: true,
    });

    mocks.listBackups.mockRejectedValueOnce(new Error("Não autenticado no Google Drive."));
    expect(await fetchDriveBackups()).toEqual({
      backups: [],
      error: "A autorização do Google Drive expirou ou foi revogada. Reconecte sua conta para continuar.",
      authExpired: true,
    });

    mocks.listBackups.mockRejectedValueOnce(new Error("network timeout"));
    expect(await fetchDriveBackups()).toEqual({
      backups: [],
      error: "Não foi possível listar os backups agora. Sua conexão continua ativa.",
      authExpired: false,
    });
  });

  it("loadDriveState mantém conexão ativa sem crash quando listBackups falha ou está offline", async () => {
    mocks.loadTokens.mockResolvedValueOnce({
      accessToken: "mod-tok",
      refreshToken: "",
      expiresAt: Date.now() + 60_000,
      email: "willian@example.com",
      clientId: "cid",
      native: true,
      authProvider: "credential-manager",
    });
    mocks.getLastSyncAt.mockResolvedValueOnce(1_700_000_999_000);
    mocks.listBackups.mockRejectedValueOnce(new Error("network timeout"));

    const state = await loadDriveState();
    expect(state.isConnected).toBe(true);
    expect(state.needsLegacyReconnect).toBe(false);
    expect(state.lastSyncAt).toBe(1_700_000_999_000);
    expect(state.remoteBackups).toEqual([]);
    expect(state.backupsLoadError).toBe(
      "Não foi possível listar os backups agora. Sua conexão continua ativa.",
    );

    mocks.loadTokens.mockResolvedValueOnce({
      accessToken: "mod-tok",
      refreshToken: "",
      expiresAt: Date.now() + 60_000,
      email: "willian@example.com",
      clientId: "cid",
      native: true,
      authProvider: "credential-manager",
    });
    mocks.isOnline.mockResolvedValueOnce(false);
    const offlineState = await loadDriveState();
    expect(offlineState.isConnected).toBe(true);
    expect(offlineState.remoteBackups).toEqual([]);
    expect(offlineState.backupsLoadError).toBe(
      "Sem conexão com a internet para listar os backups agora.",
    );
  });

  it("performDriveConnect nativo autentica via Credential Manager, autoriza Drive, salva authProvider e lista backup existente", async () => {
    const existingBackup: DriveBackupFile = {
      id: "file-antigo",
      name: "domus-backup.domusbackup",
      modifiedTime: "2026-11-25T12:00:00.000Z",
      size: 20_480,
    };
    mocks.getLastSyncAt.mockResolvedValueOnce(1_700_000_111_000);
    mocks.listBackups.mockResolvedValueOnce([existingBackup]);

    const res = await performDriveConnect("web-client-id");

    expect(res).toEqual({
      ok: true,
      email: "willian@example.com",
      lastSyncAt: 1_700_000_111_000,
      remoteBackups: [existingBackup],
      backupsLoadError: null,
    });
    expect(mocks.signInWithGoogleNative).toHaveBeenCalledWith("web-client-id");
    expect(mocks.authorizeDriveNative).toHaveBeenCalledWith("willian@example.com", true);
    expect(mocks.saveTokens).toHaveBeenCalledTimes(1);
    expect(mocks.listBackups).toHaveBeenCalledTimes(1);
    expect(mocks.isOnline).toHaveBeenCalledTimes(1);

    const saved = (mocks.saveTokens.mock.calls[0] as unknown as [DriveTokens])[0];
    expect(saved.accessToken).toBe("drive-access-tok");
    expect(saved.refreshToken).toBe("");
    expect(saved.email).toBe("willian@example.com");
    expect(saved.clientId).toBe("web-client-id");
    expect(saved.native).toBe(true);
    expect(saved.authProvider).toBe("credential-manager");
  });

  it("performDriveConnect preserva lastSyncAt quando listBackups falha por erro de rede após reconectar", async () => {
    mocks.getLastSyncAt.mockResolvedValueOnce(1_700_000_222_000);
    mocks.listBackups.mockRejectedValueOnce(new Error("timeout"));

    const res = await performDriveConnect("web-client-id");
    expect(res).toEqual({
      ok: true,
      email: "willian@example.com",
      lastSyncAt: 1_700_000_222_000,
      remoteBackups: [],
      backupsLoadError: "Não foi possível listar os backups agora. Sua conexão continua ativa.",
    });
  });

  it("performDriveConnect recusa autorização quando grantedScopes omite drive.appdata", async () => {
    mocks.authorizeDriveNative.mockResolvedValueOnce({
      accessToken: "tok-sem-drive",
      grantedScopes: ["email"],
    });

    const res = await performDriveConnect("web-client-id");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.cancelled).toBe(false);
      expect(res.error).toContain("Permissão do Google Drive não concedida");
    }
    expect(mocks.saveTokens).not.toHaveBeenCalled();
  });

  it("performDriveConnect retorna cancelled quando usuário cancela o login ou consentimento", async () => {
    const cancelErr = Object.assign(new Error("Cancelado"), {
      code: DomusGoogleAuthErrorCodes.SIGN_IN_CANCELLED,
    });
    mocks.signInWithGoogleNative.mockRejectedValueOnce(cancelErr);

    const res = await performDriveConnect("web-client-id");
    expect(res).toEqual({ ok: false, cancelled: true, error: null });
    expect(mocks.saveTokens).not.toHaveBeenCalled();
  });

  it("performDriveConnect retorna cancelled se autorização interativa não devolver accessToken", async () => {
    mocks.authorizeDriveNative.mockResolvedValueOnce(null);

    const res = await performDriveConnect("web-client-id");
    expect(res).toEqual({ ok: false, cancelled: true, error: null });
    expect(mocks.saveTokens).not.toHaveBeenCalled();
  });

  it("performDriveConnect retorna mensagem pt-BR clara para DEVELOPER_ERROR / SHA-1 no Android", async () => {
    const devErr = Object.assign(new Error("[28444] Developer console is not set up correctly"), {
      code: DomusGoogleAuthErrorCodes.DEVELOPER_ERROR,
    });
    mocks.signInWithGoogleNative.mockRejectedValueOnce(devErr);

    const res = await performDriveConnect("web-client-id");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.cancelled).toBe(false);
      expect(res.error).toContain("SHA-1");
      expect(res.error).toContain("br.com.pixeleucaristico.domus");
    }
  });

  it("formatDriveConnectError cobre todos os códigos nativos em pt-BR e adapta DEVELOPER_ERROR no iOS", () => {
    expect(
      formatDriveConnectError({ code: DomusGoogleAuthErrorCodes.SIGN_IN_CANCELLED }),
    ).toBeNull();
    expect(
      formatDriveConnectError({ code: DomusGoogleAuthErrorCodes.IN_PROGRESS }),
    ).toBe("Login já em andamento.");
    expect(
      formatDriveConnectError({ code: DomusGoogleAuthErrorCodes.PLAY_SERVICES_NOT_AVAILABLE }),
    ).toBe("Google Play Services não disponível.");
    expect(
      formatDriveConnectError({ code: DomusGoogleAuthErrorCodes.NO_CREDENTIAL }),
    ).toContain("Nenhuma conta Google disponível");
    expect(
      formatDriveConnectError({
        code: DomusGoogleAuthErrorCodes.NOT_CONFIGURED,
        message: "raw english error",
      }),
    ).toContain("Configuração do login Google incompleta");
    expect(
      formatDriveConnectError({
        code: DomusGoogleAuthErrorCodes.NO_ACTIVITY,
        message: "raw english error",
      }),
    ).toContain("Não foi possível abrir a tela de login Google");
    expect(
      formatDriveConnectError({
        code: DomusGoogleAuthErrorCodes.RESOLUTION_REQUIRED,
        message: "raw english error",
      }),
    ).toContain("Permissão do Google Drive não concedida");
    expect(
      formatDriveConnectError({
        code: DomusGoogleAuthErrorCodes.AUTH_ERROR,
        message: "Call to function rejected",
      }),
    ).toBe("Não foi possível concluir a autenticação com o Google. Tente novamente.");

    process.env.EXPO_OS = "ios";
    const iosDevMsg = formatDriveConnectError({ code: DomusGoogleAuthErrorCodes.DEVELOPER_ERROR });
    expect(iosDevMsg).toContain("GIDClientID");
    expect(iosDevMsg).not.toContain("SHA-1");
  });

  it("performDriveConnect retorna erro amigável quando módulo nativo está ausente", async () => {
    mocks.nativeModulePresent = false;
    const res = await performDriveConnect("client-id");
    expect(res).toEqual({
      ok: false,
      cancelled: false,
      error: "Google Sign-In nativo indisponível neste ambiente.",
    });
  });

  it("performDriveConnect trata rejeição de ConnectivityService.isOnline()", async () => {
    mocks.isOnline.mockRejectedValueOnce(new Error("netinfo crash"));
    const res = await performDriveConnect("client-id");
    expect(res).toEqual({
      ok: false,
      cancelled: false,
      error: "netinfo crash",
    });
  });

  it("performDriveConnect na web usa TTL padrão se expiresIn for inválido e salva tokens", async () => {
    mocks.isWeb = true;
    mocks.signInWithGoogleWeb.mockResolvedValueOnce({
      accessToken: "tok-web",
      expiresIn: Number.NaN,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ email: "user@example.com" }),
      })),
    );

    const before = Date.now();
    const res = await performDriveConnect("client-id");
    expect(res).toEqual({
      ok: true,
      email: "user@example.com",
      lastSyncAt: null,
      remoteBackups: [],
      backupsLoadError: null,
    });
    expect(mocks.saveTokens).toHaveBeenCalledTimes(1);
    const saved = (mocks.saveTokens.mock.calls[0] as unknown as [{ expiresAt: number }])[0];
    expect(Number.isFinite(saved.expiresAt)).toBe(true);
    expect(saved.expiresAt).toBeGreaterThan(before + 3_000_000);
  });

  it("performDriveDisconnect invalida token em cache antes do signOut nativo, ignora falhas nativas e limpa tokens", async () => {
    const callOrder: string[] = [];
    mocks.loadTokens.mockResolvedValueOnce({
      accessToken: "tok-em-cache",
      refreshToken: "",
      expiresAt: Date.now() + 60_000,
      email: "willian@example.com",
      clientId: "cid",
      native: true,
      authProvider: "credential-manager",
    });
    mocks.clearCachedGoogleAccessToken.mockImplementationOnce(async () => {
      callOrder.push("clearCache");
    });
    mocks.signOutGoogleNative.mockImplementationOnce(async () => {
      callOrder.push("signOut");
      throw new Error("clearCredentialState failed");
    });
    mocks.clearTokens.mockImplementationOnce(async () => {
      callOrder.push("clearTokens");
    });

    const res = await performDriveDisconnect();

    expect(mocks.clearCachedGoogleAccessToken).toHaveBeenCalledWith("tok-em-cache");
    expect(callOrder).toEqual(["clearCache", "signOut", "clearTokens"]);
    expect(res).toEqual({ error: null });
  });

  it("performDriveDisconnect captura erro de clearTokens sem lançar", async () => {
    mocks.clearTokens.mockRejectedValueOnce(new Error("secure delete failed"));
    const res = await performDriveDisconnect();
    expect(res).toEqual({ error: "secure delete failed" });
  });

  it("performDriveUpload verifica conexão 1x, trata offline/falha de getLastSyncAt e retorna lastSyncAt e remoteBackups atualizados", async () => {
    mocks.isOnline.mockResolvedValueOnce(false);
    const offline = await performDriveUpload("payload");
    expect(offline.ok).toBe(false);

    mocks.isOnline.mockClear();
    const updatedBackup: DriveBackupFile = {
      id: "file-atual",
      name: "domus-backup.domusbackup",
      modifiedTime: "2026-11-26T20:00:00.000Z",
      size: 18_432,
    };
    mocks.isOnline.mockResolvedValueOnce(true);
    mocks.getLastSyncAt.mockResolvedValueOnce(1_700_000_123_000);
    mocks.listBackups.mockResolvedValueOnce([updatedBackup]);
    const ok = await performDriveUpload("payload");
    expect(ok).toEqual({
      ok: true,
      lastSyncAt: 1_700_000_123_000,
      remoteBackups: [updatedBackup],
      backupsLoadError: null,
    });
    expect(mocks.isOnline).toHaveBeenCalledTimes(1);

    // Se listBackups ou getLastSyncAt falhar após upload bem-sucedido, mantém ok: true
    mocks.isOnline.mockResolvedValueOnce(true);
    mocks.getLastSyncAt.mockRejectedValueOnce(new Error("storage error"));
    mocks.listBackups.mockRejectedValueOnce(new Error("503"));
    const partial = await performDriveUpload("payload");
    expect(partial).toEqual({
      ok: true,
      lastSyncAt: null,
      remoteBackups: null,
      backupsLoadError: "Não foi possível listar os backups agora. Sua conexão continua ativa.",
    });
  });
});
