import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DriveTokens } from "../driveTokens";
import { GoogleDriveService } from "../GoogleDriveService";

const mocks = vi.hoisted(() => ({
  isWeb: false,
  secureStore: new Map<string, string>(),
  asyncStorage: new Map<string, string>(),
  webSecretsStore: new Map<string, string>(),
  getNativeAccessToken: vi.fn(
    async (_stale?: string, _email?: string): Promise<string | null> => null,
  ),
}));

vi.mock("../deviceBackupKey", () => ({
  isWeb: () => mocks.isWeb,
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => mocks.secureStore.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, val: string) => {
    mocks.secureStore.set(key, val);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    mocks.secureStore.delete(key);
  }),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mocks.asyncStorage.get(key) ?? null),
    setItem: vi.fn(async (key: string, val: string) => {
      mocks.asyncStorage.set(key, val);
    }),
    removeItem: vi.fn(async (key: string) => {
      mocks.asyncStorage.delete(key);
    }),
  },
}));

vi.mock("@/src/modules/security/infrastructure/webSecrets", () => ({
  webSecrets: {
    get: vi.fn(async (key: string) => mocks.webSecretsStore.get(key) ?? null),
    set: vi.fn(async (key: string, val: string) => {
      mocks.webSecretsStore.set(key, val);
      return true;
    }),
    remove: vi.fn(async (key: string) => {
      mocks.webSecretsStore.delete(key);
    }),
  },
}));

vi.mock("../GoogleNativeAuth", () => ({
  getNativeAccessToken: mocks.getNativeAccessToken,
}));

function makeTokens(overrides: Partial<DriveTokens> = {}): DriveTokens {
  return {
    accessToken: "tok-inicial",
    refreshToken: "",
    expiresAt: Date.now() + 30 * 60 * 1000,
    email: "willian@example.com",
    clientId: "web-client-id",
    native: true,
    authProvider: "credential-manager",
    ...overrides,
  };
}

describe("GoogleDriveService", () => {
  beforeEach(() => {
    mocks.isWeb = false;
    mocks.secureStore.clear();
    mocks.asyncStorage.clear();
    mocks.webSecretsStore.clear();
    vi.clearAllMocks();
    mocks.getNativeAccessToken.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploadBackup renova token em HTTP 401, salva novo token e refaz upload 1x com sucesso", async () => {
    await GoogleDriveService.saveTokens(makeTokens());
    mocks.asyncStorage.set("domus_gdrive_file_id", "file-1");
    mocks.getNativeAccessToken.mockResolvedValueOnce("tok-novo-401");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Invalid Credentials",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "file-1" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await GoogleDriveService.uploadBackup("backup-payload");

    expect(mocks.getNativeAccessToken).toHaveBeenCalledTimes(1);
    expect(mocks.getNativeAccessToken).toHaveBeenCalledWith("tok-inicial", "willian@example.com");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer tok-novo-401");

    const saved = await GoogleDriveService.loadTokens();
    expect(saved?.accessToken).toBe("tok-novo-401");
    expect(saved?.authProvider).toBe("credential-manager");
    expect(await GoogleDriveService.getLastSyncAt()).not.toBeNull();
  });

  it("uploadBackup tenta renovar no máximo 1x quando 401 persiste", async () => {
    await GoogleDriveService.saveTokens(makeTokens());
    mocks.asyncStorage.set("domus_gdrive_file_id", "file-1");
    mocks.getNativeAccessToken.mockResolvedValue("tok-renovado-mas-rejeitado");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(GoogleDriveService.uploadBackup("backup-payload")).rejects.toThrow(
      "Google Drive: 401 Unauthorized",
    );
    expect(mocks.getNativeAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uploadBackup não repete após 401 quando refresh retorna null ou está na web", async () => {
    // Nativo com refresh retornando null
    await GoogleDriveService.saveTokens(makeTokens());
    mocks.asyncStorage.set("domus_gdrive_file_id", "file-1");
    mocks.getNativeAccessToken.mockResolvedValueOnce(null);

    const fetchNative = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Expired",
    });
    vi.stubGlobal("fetch", fetchNative);

    await expect(GoogleDriveService.uploadBackup("payload")).rejects.toThrow(
      "Google Drive: 401 Expired",
    );
    expect(fetchNative).toHaveBeenCalledTimes(1);

    // Web (sem refresh nativo)
    mocks.isWeb = true;
    await GoogleDriveService.saveTokens(makeTokens({ native: undefined, authProvider: undefined }));
    const fetchWeb = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Web Expired",
    });
    vi.stubGlobal("fetch", fetchWeb);

    await expect(GoogleDriveService.uploadBackup("payload")).rejects.toThrow(
      "Google Drive: 401 Web Expired",
    );
    expect(fetchWeb).toHaveBeenCalledTimes(1);
  });

  it("uploadBackup limpa FILE_ID_KEY e tenta criar novo arquivo no máximo 1x em HTTP 404", async () => {
    await GoogleDriveService.saveTokens(makeTokens());
    mocks.asyncStorage.set("domus_gdrive_file_id", "stale-file-id");

    const fetchMock = vi
      .fn()
      // 1ª tentativa: PATCH com stale-file-id -> 404
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "File not found",
      })
      // findBackupFileId na 2ª tentativa -> sem arquivo existente
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [] }),
      })
      // 2ª tentativa: POST -> 404 persistente (não deve entrar em loop infinito)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "Still not found",
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(GoogleDriveService.uploadBackup("payload")).rejects.toThrow(
      "Google Drive: 404 Still not found",
    );
    expect(mocks.asyncStorage.has("domus_gdrive_file_id")).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("clearTokens() concorrente durante refresh em voo impede ressurreição de tokens desconectados", async () => {
    await GoogleDriveService.saveTokens(makeTokens({ expiresAt: Date.now() - 1000 }));

    let resolveNative!: (token: string | null) => void;
    let notifyProviderStarted!: () => void;
    const providerStarted = new Promise<void>((resolve) => {
      notifyProviderStarted = resolve;
    });
    mocks.getNativeAccessToken.mockImplementationOnce(
      () =>
        new Promise<string | null>((resolve) => {
          resolveNative = resolve;
          notifyProviderStarted();
        }),
    );

    const refreshPromise = GoogleDriveService.getValidAccessToken();
    await providerStarted;

    // Usuário desconecta enquanto a renovação está em voo
    await GoogleDriveService.clearTokens();
    resolveNative("tok-zumbi");

    expect(await refreshPromise).toBeNull();
    expect(await GoogleDriveService.loadTokens()).toBeNull();
  });

  it("clearTokens() concorrente durante refreshAccessTokenOnUnauthorized impede gravação de token zumbi", async () => {
    await GoogleDriveService.saveTokens(makeTokens());

    let resolveNative!: (token: string | null) => void;
    let notifyProviderStarted!: () => void;
    const providerStarted = new Promise<void>((resolve) => {
      notifyProviderStarted = resolve;
    });
    mocks.getNativeAccessToken.mockImplementationOnce(
      () =>
        new Promise<string | null>((resolve) => {
          resolveNative = resolve;
          notifyProviderStarted();
        }),
    );

    const refreshPromise = GoogleDriveService.refreshAccessTokenOnUnauthorized();
    await providerStarted;

    await GoogleDriveService.clearTokens();
    resolveNative("tok-401-zumbi");

    expect(await refreshPromise).toBeNull();
    expect(await GoogleDriveService.loadTokens()).toBeNull();
  });
});
