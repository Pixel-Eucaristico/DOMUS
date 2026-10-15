import { Platform } from "react-native";

// Google Sign-In nativo (Android/iOS). O access token vem do Play Services via
// `getTokens()`: não há refresh token nem troca de código, então nenhum client secret
// precisa existir no app.

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

type GoogleSignInModule = typeof import("@react-native-google-signin/google-signin");

let configured = false;

/** Carrega e configura o Google Sign-In (só nativo). Devolve null na web. */
export function getGoogleSignIn(): GoogleSignInModule | null {
  if (Platform.OS === "web") return null;
  // require tardio: o módulo nativo não existe no bundle web
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@react-native-google-signin/google-signin") as GoogleSignInModule;
  if (!configured) {
    mod.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, scopes: [DRIVE_SCOPE] });
    configured = true;
  }
  return mod;
}

/** Access token novo para o Drive, ou null se não houver sessão do Google. */
export async function getNativeAccessToken(staleAccessToken?: string): Promise<string | null> {
  const mod = getGoogleSignIn();
  if (!mod) return null;
  const { GoogleSignin } = mod;

  try {
    if (staleAccessToken) {
      try {
        await GoogleSignin.clearCachedAccessToken(staleAccessToken);
      } catch {
        // token pode já ter saído do cache
      }
    }

    try {
      return (await GoogleSignin.getTokens()).accessToken;
    } catch {
      // sem sessão em memória: tenta restaurar sem interação
    }

    const silent = await GoogleSignin.signInSilently();
    if (silent.type !== "success") return null;
    return (await GoogleSignin.getTokens()).accessToken;
  } catch {
    return null;
  }
}
