import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  computeNeedsLocalDriveLogin,
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
  saveTokens: vi.fn(async () => {}),
  clearTokens: vi.fn(async () => {}),
  uploadBackup: vi.fn(async () => {}),
  signInWithGoogleWeb: vi.fn(async () => null as { accessToken: string; expiresIn: number } | null),
  googleSignInMod: null as null | {
    GoogleSignin: {
      hasPlayServices: ReturnType<typeof vi.fn>;
      signIn: ReturnType<typeof vi.fn>;
      getTokens: ReturnType<typeof vi.fn>;
      signOut: ReturnType<typeof vi.fn>;
    };
    statusCodes: {
      SIGN_IN_CANCELLED: string;
      IN_PROGRESS: string;
      PLAY_SERVICES_NOT_AVAILABLE: string;
    };
  },
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
    saveTokens: mocks.saveTokens,
    clearTokens: mocks.clearTokens,
    uploadBackup: mocks.uploadBackup,
  },
}));

vi.mock("@/src/modules/backup/infrastructure/GoogleOAuthWeb", () => ({
  signInWithGoogleWeb: mocks.signInWithGoogleWeb,
}));

vi.mock("@/src/modules/backup/infrastructure/GoogleNativeAuth", () => ({
  getGoogleSignIn: () => mocks.googleSignInMod,
}));

describe("driveBackupActions", () => {
  beforeEach(() => {
    mocks.isWeb = false;
    mocks.googleSignInMod = null;
    vi.clearAllMocks();
    mocks.isOnline.mockResolvedValue(true);
    mocks.isConnected.mockResolvedValue(false);
    mocks.getConnectedEmail.mockResolvedValue(null);
    mocks.getLastSyncAt.mockResolvedValue(null);
    mocks.saveTokens.mockResolvedValue(undefined);
    mocks.clearTokens.mockResolvedValue(undefined);
    mocks.uploadBackup.mockResolvedValue(undefined);
    mocks.signInWithGoogleWeb.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("computeNeedsLocalDriveLogin só ativa após isDriveStateLoaded", () => {
    expect(computeNeedsLocalDriveLogin(false, { enabled: true }, false)).toBe(false);
    expect(computeNeedsLocalDriveLogin(true, { enabled: true }, false)).toBe(true);
    expect(computeNeedsLocalDriveLogin(true, { enabled: true }, true)).toBe(false);
    expect(computeNeedsLocalDriveLogin(true, { enabled: false }, false)).toBe(false);
  });

  it("loadDriveState propaga rejeição para o caller tratar em try/catch", async () => {
    mocks.isConnected.mockRejectedValueOnce(new Error("keystore failed"));
    await expect(loadDriveState()).rejects.toThrow("keystore failed");
  });

  it("performDriveConnect retorna erro amigável quando módulo nativo está ausente", async () => {
    mocks.googleSignInMod = null;
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
    expect(res).toEqual({ ok: true, email: "user@example.com" });
    expect(mocks.saveTokens).toHaveBeenCalledTimes(1);
    const saved = (mocks.saveTokens.mock.calls[0] as unknown as [{ expiresAt: number }])[0];
    expect(Number.isFinite(saved.expiresAt)).toBe(true);
    expect(saved.expiresAt).toBeGreaterThan(before + 3_000_000);
  });

  it("performDriveDisconnect captura erro de clearTokens sem lançar", async () => {
    mocks.clearTokens.mockRejectedValueOnce(new Error("secure delete failed"));
    const res = await performDriveDisconnect();
    expect(res).toEqual({ error: "secure delete failed" });
  });

  it("performDriveUpload verifica conexão, trata offline e retorna lastSyncAt", async () => {
    mocks.isOnline.mockResolvedValueOnce(false);
    const offline = await performDriveUpload("payload");
    expect(offline.ok).toBe(false);

    mocks.isOnline.mockResolvedValueOnce(true);
    mocks.getLastSyncAt.mockResolvedValueOnce(1_700_000_123_000);
    const ok = await performDriveUpload("payload");
    expect(ok).toEqual({ ok: true, lastSyncAt: 1_700_000_123_000 });
  });
});
