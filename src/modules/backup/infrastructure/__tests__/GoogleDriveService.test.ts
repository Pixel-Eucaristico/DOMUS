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

  it("isConnected() retorna false em sessão nativa legada sem apagar tokens, email, lastSyncAt nem FILE_ID_KEY", async () => {
    await GoogleDriveService.saveTokens(
      makeTokens({ native: true, authProvider: undefined, email: "legado@example.com" }),
    );
    mocks.asyncStorage.set("domus_gdrive_last_sync", "1700000000000");
    mocks.asyncStorage.set("domus_gdrive_file_id", "legacy-file-id");

    expect(await GoogleDriveService.isConnected()).toBe(false);
    expect(await GoogleDriveService.getValidAccessToken()).toBeNull();
    expect(await GoogleDriveService.getConnectedEmail()).toBe("legado@example.com");
    expect(await GoogleDriveService.getLastSyncAt()).toBe(1700000000000);
    expect(mocks.asyncStorage.get("domus_gdrive_file_id")).toBe("legacy-file-id");
    expect(await GoogleDriveService.loadTokens()).not.toBeNull();
  });

  it("isConnected() continua true na web (nunca trata web como sessão legada) e em sessão moderna", async () => {
    // Sessão moderna no nativo
    await GoogleDriveService.saveTokens(makeTokens({ native: true, authProvider: "credential-manager" }));
    expect(await GoogleDriveService.isConnected()).toBe(true);

    // Web implícito sem authProvider
    mocks.isWeb = true;
    await GoogleDriveService.saveTokens(
      makeTokens({
        native: undefined,
        refreshToken: "",
        authProvider: undefined,
        expiresAt: Date.now() + 60_000,
      }),
    );
    expect(await GoogleDriveService.isConnected()).toBe(true);
  });

  it("listBackups() lista arquivos em appDataFolder ordenados por modifiedTime desc e sincroniza FILE_ID_KEY", async () => {
    await GoogleDriveService.saveTokens(makeTokens());
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        files: [
          {
            id: "file-newer",
            name: "domus-backup.domusbackup",
            modifiedTime: "2026-11-26T19:23:00.000Z",
            size: "14820",
          },
          {
            id: "file-other",
            name: "antigo.domusbackup",
            modifiedTime: "2026-10-01T10:00:00.000Z",
            size: 5120,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const files = await GoogleDriveService.listBackups();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("spaces=appDataFolder");
    expect(url).toContain("orderBy=modifiedTime%20desc");
    expect(url).toContain("fields=files(id%2Cname%2CmodifiedTime%2Csize)");
    expect(init.headers.Authorization).toBe("Bearer tok-inicial");

    expect(files).toEqual([
      {
        id: "file-newer",
        name: "domus-backup.domusbackup",
        modifiedTime: "2026-11-26T19:23:00.000Z",
        size: 14820,
      },
      {
        id: "file-other",
        name: "antigo.domusbackup",
        modifiedTime: "2026-10-01T10:00:00.000Z",
        size: 5120,
      },
    ]);
    expect(mocks.asyncStorage.get("domus_gdrive_file_id")).toBe("file-newer");
  });

  it("listBackups() faz retry único em HTTP 401 via refreshAccessTokenOnUnauthorized", async () => {
    await GoogleDriveService.saveTokens(makeTokens());
    mocks.getNativeAccessToken.mockResolvedValueOnce("tok-list-renovado");

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
        json: async () => ({
          files: [
            {
              id: "file-1",
              name: "domus-backup.domusbackup",
              modifiedTime: "2026-11-26T19:23:00.000Z",
              size: "2048",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const files = await GoogleDriveService.listBackups();

    expect(mocks.getNativeAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer tok-list-renovado");
    expect(files).toHaveLength(1);
    expect(files[0].id).toBe("file-1");
    expect(mocks.asyncStorage.get("domus_gdrive_file_id")).toBe("file-1");
  });

  it("listBackups() não entra em loop em 401 persistente e propaga erro", async () => {
    await GoogleDriveService.saveTokens(makeTokens());
    mocks.getNativeAccessToken.mockResolvedValue("tok-rejeitado");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(GoogleDriveService.listBackups()).rejects.toThrow(
      "Google Drive: 401 Unauthorized",
    );
    expect(mocks.getNativeAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("listBackups() limpa FILE_ID_KEY quando appDataFolder não possui o arquivo principal e não há paginação", async () => {
    await GoogleDriveService.saveTokens(makeTokens());
    mocks.asyncStorage.set("domus_gdrive_file_id", "stale-id");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [] }),
      }),
    );

    const files = await GoogleDriveService.listBackups();
    expect(files).toEqual([]);
    expect(mocks.asyncStorage.has("domus_gdrive_file_id")).toBe(false);
  });

  it("listBackups() preserva FILE_ID_KEY quando nextPageToken indica mais páginas", async () => {
    await GoogleDriveService.saveTokens(makeTokens());
    mocks.asyncStorage.set("domus_gdrive_file_id", "cached-primary-id");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          nextPageToken: "page-2-token",
          files: [{ id: "other-1", name: "outro.domusbackup", size: "100" }],
        }),
      }),
    );

    const files = await GoogleDriveService.listBackups();
    expect(files).toHaveLength(1);
    expect(mocks.asyncStorage.get("domus_gdrive_file_id")).toBe("cached-primary-id");
  });

  it("listBackups() não grava FILE_ID_KEY se clearTokens() ocorrer durante a requisição", async () => {
    await GoogleDriveService.saveTokens(makeTokens());

    let resolveFetch!: (res: unknown) => void;
    let notifyFetchStarted!: () => void;
    const fetchStarted = new Promise<void>((resolve) => {
      notifyFetchStarted = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
            notifyFetchStarted();
          }),
      ),
    );

    const listPromise = GoogleDriveService.listBackups();
    await fetchStarted;
    await GoogleDriveService.clearTokens();

    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({
        files: [{ id: "file-zumbi", name: "domus-backup.domusbackup", size: "500" }],
      }),
    });

    await listPromise;
    expect(mocks.asyncStorage.has("domus_gdrive_file_id")).toBe(false);
  });

  it("listBackups() sanitiza payloads malformados (non-array files, itens inválidos e size inválido)", async () => {
    await GoogleDriveService.saveTokens(makeTokens());
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: "not-an-array" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          files: [
            null,
            { id: "", name: "sem-id" },
            { id: "sem-nome", name: "" },
            { id: "f1", name: "a.domusbackup", modifiedTime: "   ", size: "-5" },
            { id: "f2", name: "b.domusbackup", modifiedTime: "2026-11-26T10:00:00Z", size: "NaN" },
            { id: "f3", name: "c.domusbackup", size: "" },
            { id: "f4", name: "d.domusbackup", size: 0 },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    expect(await GoogleDriveService.listBackups()).toEqual([]);
    expect(await GoogleDriveService.listBackups()).toEqual([
      { id: "f1", name: "a.domusbackup", modifiedTime: null, size: null },
      { id: "f2", name: "b.domusbackup", modifiedTime: "2026-11-26T10:00:00Z", size: null },
      { id: "f3", name: "c.domusbackup", modifiedTime: null, size: null },
      { id: "f4", name: "d.domusbackup", modifiedTime: null, size: 0 },
    ]);
  });

  it("listBackups() não repete após HTTP 401 quando refresh nativo retorna null ou na web", async () => {
    // Nativo com refresh retornando null
    await GoogleDriveService.saveTokens(makeTokens());
    mocks.getNativeAccessToken.mockResolvedValueOnce(null);
    const fetchNative = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Expired",
    });
    vi.stubGlobal("fetch", fetchNative);

    await expect(GoogleDriveService.listBackups()).rejects.toThrow("Google Drive: 401 Expired");
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

    await expect(GoogleDriveService.listBackups()).rejects.toThrow("Google Drive: 401 Web Expired");
    expect(fetchWeb).toHaveBeenCalledTimes(1);
  });

  it("listBackups() aborta requisição após timeout de 15s", async () => {
    vi.useFakeTimers();
    try {
      await GoogleDriveService.saveTokens(makeTokens());
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementationOnce(
          (_url: string, init?: { signal?: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => {
                reject(new Error("aborted"));
              });
            }),
        ),
      );

      const promise = GoogleDriveService.listBackups();
      const caught = promise.catch((err: unknown) => err);
      await vi.advanceTimersByTimeAsync(15_000);
      const err = await caught;
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe("aborted");
    } finally {
      vi.useRealTimers();
    }
  });

  it("saveTokens() limpa LAST_SYNC_KEY e FILE_ID_KEY e invalida epoch ao trocar de conta, mas preserva na mesma conta", async () => {
    await GoogleDriveService.saveTokens(makeTokens({ email: "Willian@Example.com" }));
    mocks.asyncStorage.set("domus_gdrive_last_sync", "1700000000000");
    mocks.asyncStorage.set("domus_gdrive_file_id", "file-conta-1");

    // Mesma conta (case/espaços diferentes) preserva metadados
    await GoogleDriveService.saveTokens(makeTokens({ email: "  willian@example.com  ", accessToken: "tok-2" }));
    expect(mocks.asyncStorage.get("domus_gdrive_last_sync")).toBe("1700000000000");
    expect(mocks.asyncStorage.get("domus_gdrive_file_id")).toBe("file-conta-1");

    // Troca de conta durante listBackups em voo limpa metadados e invalida epoch
    let resolveFetch!: (res: unknown) => void;
    let notifyFetchStarted!: () => void;
    const fetchStarted = new Promise<void>((resolve) => {
      notifyFetchStarted = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
            notifyFetchStarted();
          }),
      ),
    );

    const staleList = GoogleDriveService.listBackups();
    await fetchStarted;

    await GoogleDriveService.saveTokens(makeTokens({ email: "outra@example.com", accessToken: "tok-outra" }));
    expect(mocks.asyncStorage.has("domus_gdrive_last_sync")).toBe(false);
    expect(mocks.asyncStorage.has("domus_gdrive_file_id")).toBe(false);

    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({
        files: [{ id: "file-conta-antiga", name: "domus-backup.domusbackup", size: "200" }],
      }),
    });
    await staleList;
    expect(mocks.asyncStorage.has("domus_gdrive_file_id")).toBe(false);
  });

  it("getLastSyncAt() rejeita valores corrompidos, zero e negativos", async () => {
    mocks.asyncStorage.set("domus_gdrive_last_sync", "1700000123000");
    expect(await GoogleDriveService.getLastSyncAt()).toBe(1700000123000);

    for (const invalid of ["0", "-50", "NaN", "corrompido", "123abc", "   "]) {
      mocks.asyncStorage.set("domus_gdrive_last_sync", invalid);
      expect(await GoogleDriveService.getLastSyncAt(), `valor "${invalid}"`).toBeNull();
    }
  });
});
