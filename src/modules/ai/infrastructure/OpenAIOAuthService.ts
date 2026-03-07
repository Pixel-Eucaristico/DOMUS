import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as ExpoCrypto from "expo-crypto";
import { SecureStorageService } from "@/src/modules/security/infrastructure/SecureStorageService";

// ─── Constants from Codex CLI (public, open-source) ────────────────────────────

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const ISSUER = "https://auth.openai.com";
const SCOPES = "openid profile email offline_access";

const AUTH_ENDPOINT = `${ISSUER}/oauth/authorize`;
const TOKEN_ENDPOINT = `${ISSUER}/oauth/token`;

/** ChatGPT backend API base — used instead of api.openai.com/v1 */
export const CHATGPT_API_BASE = "https://chatgpt.com/backend-api";

const STORE_KEY = "domus_openai_oauth_tokens";

// ─── Token types ───────────────────────────────────────────────────────────────

export interface OpenAIOAuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number; // timestamp ms
}

// ─── Service ───────────────────────────────────────────────────────────────────

WebBrowser.maybeCompleteAuthSession();

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: AUTH_ENDPOINT,
  tokenEndpoint: TOKEN_ENDPOINT,
};

export class OpenAIOAuthService {
  /**
   * Starts the OAuth 2 PKCE flow.
   * Opens the browser for OpenAI login, returns tokens on success.
   */
  static async login(): Promise<OpenAIOAuthTokens | null> {
    const redirectUri = AuthSession.makeRedirectUri({ scheme: "domus" });

    const request = new AuthSession.AuthRequest({
      clientId: CLIENT_ID,
      scopes: SCOPES.split(" "),
      redirectUri,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
      extraParams: {
        codex_cli_simplified_flow: "true",
        id_token_add_organizations: "true",
      },
    });

    const result = await request.promptAsync(discovery);

    if (result.type !== "success" || !result.params.code) {
      return null;
    }

    // Exchange code for tokens
    const tokenResult = await AuthSession.exchangeCodeAsync(
      {
        clientId: CLIENT_ID,
        code: result.params.code,
        redirectUri,
        extraParams: {
          code_verifier: request.codeVerifier!,
        },
      },
      discovery,
    );

    const tokens: OpenAIOAuthTokens = {
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken ?? "",
      idToken: tokenResult.idToken ?? "",
      expiresAt: tokenResult.issuedAt
        ? (tokenResult.issuedAt + (tokenResult.expiresIn ?? 3600)) * 1000
        : Date.now() + 3600_000,
    };

    await OpenAIOAuthService.saveTokens(tokens);
    return tokens;
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * Returns updated tokens or null if refresh fails.
   */
  static async refresh(): Promise<OpenAIOAuthTokens | null> {
    const stored = await OpenAIOAuthService.getTokens();
    if (!stored?.refreshToken) return null;

    try {
      const tokenResult = await AuthSession.refreshAsync(
        {
          clientId: CLIENT_ID,
          refreshToken: stored.refreshToken,
        },
        discovery,
      );

      const tokens: OpenAIOAuthTokens = {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken ?? stored.refreshToken,
        idToken: tokenResult.idToken ?? stored.idToken,
        expiresAt: tokenResult.issuedAt
          ? (tokenResult.issuedAt + (tokenResult.expiresIn ?? 3600)) * 1000
          : Date.now() + 3600_000,
      };

      await OpenAIOAuthService.saveTokens(tokens);
      return tokens;
    } catch {
      return null;
    }
  }

  /**
   * Returns a valid access token, refreshing if needed.
   * Returns null if no OAuth session exists or refresh fails.
   */
  static async getValidAccessToken(): Promise<string | null> {
    const tokens = await OpenAIOAuthService.getTokens();
    if (!tokens) return null;

    // Refresh if expires within 5 minutes
    if (Date.now() > tokens.expiresAt - 5 * 60_000) {
      const refreshed = await OpenAIOAuthService.refresh();
      return refreshed?.accessToken ?? null;
    }

    return tokens.accessToken;
  }

  /** Check if we have stored OAuth tokens */
  static async hasSession(): Promise<boolean> {
    const tokens = await OpenAIOAuthService.getTokens();
    return tokens !== null && tokens.refreshToken.length > 0;
  }

  /** Clear stored tokens (logout) */
  static async logout(): Promise<void> {
    await SecureStorageService.delete(STORE_KEY);
  }

  // ─── Storage ─────────────────────────────────────────────────────────────────

  private static async saveTokens(tokens: OpenAIOAuthTokens): Promise<void> {
    await SecureStorageService.set(STORE_KEY, JSON.stringify(tokens));
  }

  static async getTokens(): Promise<OpenAIOAuthTokens | null> {
    try {
      const raw = await SecureStorageService.get(STORE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as OpenAIOAuthTokens;
    } catch {
      return null;
    }
  }
}
