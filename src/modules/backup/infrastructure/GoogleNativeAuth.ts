import { getDomusGoogleAuthModule } from "@/modules/domus-google-auth";
import {
  DomusGoogleAuthErrorCodes,
  type DomusGoogleAuthNativeModule,
  type DriveAuthorizationResult,
  type GoogleSignInResult,
} from "@/modules/domus-google-auth/src/types";
import { isWeb } from "./deviceBackupKey";

// Login nativo Google (Android Credential Manager + Identity.getAuthorizationClient;
// iOS GIDSignIn). O access token para `drive.appdata` é concedido sem refresh token
// e sem client_secret no app.

export const DRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

export { DomusGoogleAuthErrorCodes };
export type { DriveAuthorizationResult, GoogleSignInResult };

type NativeModuleLoader = () => DomusGoogleAuthNativeModule | null;

const defaultNativeModuleLoader: NativeModuleLoader = () => {
  try {
    return getDomusGoogleAuthModule();
  } catch {
    return null;
  }
};

let nativeModuleLoader: NativeModuleLoader = defaultNativeModuleLoader;

/** Apenas para testes unitários (substitui ou restaura o loader padrão do módulo nativo). */
export function setDomusGoogleAuthLoaderForTests(loader: NativeModuleLoader | null): void {
  nativeModuleLoader = loader ?? defaultNativeModuleLoader;
}

function hasDriveAppDataScope(result: DriveAuthorizationResult | null): boolean {
  return Array.isArray(result?.grantedScopes) && result.grantedScopes.includes(DRIVE_APPDATA_SCOPE);
}

/** Carrega o módulo nativo local `domus-google-auth` (só nativo). Devolve null na web ou sem módulo nativo. */
export function getDomusGoogleAuth(): DomusGoogleAuthNativeModule | null {
  if (isWeb()) return null;
  return nativeModuleLoader();
}

/** Autentica a conta Google via Android Credential Manager / iOS GIDSignIn. */
export async function signInWithGoogleNative(
  webClientId: string,
): Promise<GoogleSignInResult> {
  const mod = getDomusGoogleAuth();
  if (!mod) {
    throw new Error("Google Sign-In nativo indisponível neste ambiente.");
  }
  return mod.signIn(webClientId);
}

/**
 * Solicita autorização do escopo `drive.appdata` via Android AuthorizationClient / iOS GIDSignIn.
 * Valida se o escopo `drive.appdata` foi de fato concedido (consentimento granular do Google).
 * Com `interactive = false`, devolve null sem abrir UI se precisar de consentimento ou faltar escopo.
 */
export async function authorizeDriveNative(
  accountEmail?: string | null,
  interactive = true,
): Promise<DriveAuthorizationResult | null> {
  const mod = getDomusGoogleAuth();
  if (!mod) {
    if (interactive) {
      throw new Error("Google Sign-In nativo indisponível neste ambiente.");
    }
    return null;
  }

  const result = await mod.authorizeDrive(
    [DRIVE_APPDATA_SCOPE],
    accountEmail?.trim() ? accountEmail.trim() : null,
    interactive,
  );
  if (!result) return null;

  if (!hasDriveAppDataScope(result)) {
    if (!interactive) return null;
    throw Object.assign(
      new Error(
        "Permissão do Google Drive não concedida. Marque o acesso ao Google Drive na tela de consentimento e tente novamente.",
      ),
      { code: DomusGoogleAuthErrorCodes.RESOLUTION_REQUIRED },
    );
  }

  return result;
}

/** Invalida no cache nativo um access token do Drive (best-effort; ignora ausência de módulo ou token vazio). */
export async function clearCachedGoogleAccessToken(accessToken?: string): Promise<void> {
  const trimmed = accessToken?.trim();
  if (!trimmed) return;
  const mod = getDomusGoogleAuth();
  if (!mod) return;
  await mod.clearCachedAccessToken(trimmed);
}

/**
 * Obtém silenciosamente um access token válido para o Drive (`interactive = false`).
 * Quando `staleAccessToken` é informado, limpa o cache local antes de renovar.
 */
export async function getNativeAccessToken(
  staleAccessToken?: string,
  accountEmail?: string,
): Promise<string | null> {
  const mod = getDomusGoogleAuth();
  if (!mod) return null;

  try {
    if (staleAccessToken) {
      try {
        await mod.clearCachedAccessToken(staleAccessToken);
      } catch {
        // token pode já ter saído do cache
      }
    }

    const auth = await mod.authorizeDrive(
      [DRIVE_APPDATA_SCOPE],
      accountEmail?.trim() ? accountEmail.trim() : null,
      false,
    );
    if (!auth?.accessToken || !hasDriveAppDataScope(auth)) {
      return null;
    }
    return auth.accessToken;
  } catch {
    return null;
  }
}

/** Encerra o estado de credencial nativo (Credential Manager / GIDSignIn). */
export async function signOutGoogleNative(): Promise<void> {
  const mod = getDomusGoogleAuth();
  if (!mod) return;
  await mod.signOut();
}
