import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DomusGoogleAuthNativeModule } from "@/modules/domus-google-auth/src/types";
import {
  DRIVE_APPDATA_SCOPE,
  DomusGoogleAuthErrorCodes,
  authorizeDriveNative,
  clearCachedGoogleAccessToken,
  getDomusGoogleAuth,
  getNativeAccessToken,
  setDomusGoogleAuthLoaderForTests,
  signInWithGoogleNative,
  signOutGoogleNative,
} from "../GoogleNativeAuth";

const mocks = vi.hoisted(() => ({
  isWeb: false,
  nativeModule: null as DomusGoogleAuthNativeModule | null,
  requireOptionalNativeModule: vi.fn((_name: string) => null as DomusGoogleAuthNativeModule | null),
}));

vi.mock("expo", () => ({
  requireOptionalNativeModule: mocks.requireOptionalNativeModule,
}));

vi.mock("../deviceBackupKey", () => ({
  isWeb: () => mocks.isWeb,
}));

function makeNativeModule(
  overrides: Partial<DomusGoogleAuthNativeModule> = {},
): DomusGoogleAuthNativeModule {
  return {
    signIn: vi.fn(async () => ({
      email: "user@example.com",
      idToken: "id-tok",
      displayName: "User",
    })),
    authorizeDrive: vi.fn(async () => ({
      accessToken: "fresh-token",
      grantedScopes: [DRIVE_APPDATA_SCOPE],
    })),
    clearCachedAccessToken: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("GoogleNativeAuth", () => {
  beforeEach(() => {
    mocks.isWeb = false;
    mocks.nativeModule = null;
    vi.clearAllMocks();
    mocks.requireOptionalNativeModule.mockReturnValue(null);
    setDomusGoogleAuthLoaderForTests(() => mocks.nativeModule);
  });

  afterEach(() => {
    setDomusGoogleAuthLoaderForTests(null);
  });

  it("loader padrão carrega modules/domus-google-auth chamando requireOptionalNativeModule('DomusGoogleAuth')", () => {
    const mod = makeNativeModule();
    mocks.requireOptionalNativeModule.mockReturnValueOnce(mod);
    setDomusGoogleAuthLoaderForTests(null);

    const loaded = getDomusGoogleAuth();

    expect(mocks.requireOptionalNativeModule).toHaveBeenCalledWith("DomusGoogleAuth");
    expect(loaded).toBe(mod);
  });

  it("getDomusGoogleAuth devolve null na web mesmo se módulo existir", () => {
    mocks.isWeb = true;
    mocks.nativeModule = makeNativeModule();
    expect(getDomusGoogleAuth()).toBeNull();
  });

  it("getDomusGoogleAuth devolve null quando módulo nativo não está disponível", () => {
    mocks.nativeModule = null;
    expect(getDomusGoogleAuth()).toBeNull();
  });

  it("getNativeAccessToken limpa cache quando staleAccessToken é informado e chama authorizeDrive com interactive=false", async () => {
    const mod = makeNativeModule();
    mocks.nativeModule = mod;

    const token = await getNativeAccessToken("stale-tok", "willian@example.com");

    expect(token).toBe("fresh-token");
    expect(mod.clearCachedAccessToken).toHaveBeenCalledWith("stale-tok");
    expect(mod.authorizeDrive).toHaveBeenCalledWith(
      [DRIVE_APPDATA_SCOPE],
      "willian@example.com",
      false,
    );
  });

  it("getNativeAccessToken devolve null sem crash quando hasResolution/authorizeDrive retorna null", async () => {
    const mod = makeNativeModule({
      authorizeDrive: vi.fn(async () => null),
    });
    mocks.nativeModule = mod;

    expect(await getNativeAccessToken(undefined, "willian@example.com")).toBeNull();
    expect(mod.clearCachedAccessToken).not.toHaveBeenCalled();
    expect(mod.authorizeDrive).toHaveBeenCalledWith(
      [DRIVE_APPDATA_SCOPE],
      "willian@example.com",
      false,
    );
  });

  it("rejeita ou devolve null quando consentimento granular omite DRIVE_APPDATA_SCOPE", async () => {
    const mod = makeNativeModule({
      authorizeDrive: vi.fn(async () => ({
        accessToken: "token-sem-escopo",
        grantedScopes: ["openid", "email"],
      })),
    });
    mocks.nativeModule = mod;

    await expect(authorizeDriveNative("willian@example.com", true)).rejects.toMatchObject({
      code: DomusGoogleAuthErrorCodes.RESOLUTION_REQUIRED,
      message: expect.stringContaining("Permissão do Google Drive não concedida"),
    });
    expect(await authorizeDriveNative("willian@example.com", false)).toBeNull();
    expect(await getNativeAccessToken(undefined, "willian@example.com")).toBeNull();
  });

  it("getNativeAccessToken continua renovando mesmo se clearCachedAccessToken falhar e devolve null se authorizeDrive lançar erro", async () => {
    const mod = makeNativeModule({
      clearCachedAccessToken: vi.fn(async () => {
        throw new Error("cache miss");
      }),
      authorizeDrive: vi.fn(async () => {
        throw new Error("network error");
      }),
    });
    mocks.nativeModule = mod;

    expect(await getNativeAccessToken("old-tok", "a@b.com")).toBeNull();
    expect(mod.authorizeDrive).toHaveBeenCalledWith([DRIVE_APPDATA_SCOPE], "a@b.com", false);
  });

  it("signInWithGoogleNative, authorizeDriveNative, clearCachedGoogleAccessToken e signOutGoogleNative delegam ao módulo nativo", async () => {
    const mod = makeNativeModule();
    mocks.nativeModule = mod;

    const signIn = await signInWithGoogleNative("web-client-id");
    expect(signIn.email).toBe("user@example.com");
    expect(mod.signIn).toHaveBeenCalledWith("web-client-id");

    const auth = await authorizeDriveNative("user@example.com", true);
    expect(auth?.accessToken).toBe("fresh-token");
    expect(mod.authorizeDrive).toHaveBeenCalledWith(
      [DRIVE_APPDATA_SCOPE],
      "user@example.com",
      true,
    );

    await clearCachedGoogleAccessToken("  tok-cache  ");
    expect(mod.clearCachedAccessToken).toHaveBeenCalledWith("tok-cache");

    await signOutGoogleNative();
    expect(mod.signOut).toHaveBeenCalledTimes(1);
  });

  it("authorizeDriveNative devolve null no modo silencioso sem módulo nativo", async () => {
    mocks.nativeModule = null;
    expect(await authorizeDriveNative("a@b.com", false)).toBeNull();
    await expect(authorizeDriveNative("a@b.com", true)).rejects.toThrow(
      "Google Sign-In nativo indisponível",
    );
  });
});
