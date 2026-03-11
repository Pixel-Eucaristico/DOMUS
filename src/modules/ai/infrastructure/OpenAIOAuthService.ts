import * as WebBrowser from "expo-web-browser";
import { SecureStorageService } from "@/src/modules/security/infrastructure/SecureStorageService";
import { ConnectivityService } from "./ConnectivityService";

// ─── Constants from Codex CLI (public, open-source) ────────────────────────────

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const ISSUER = "https://auth.openai.com";
const API_BASE = `${ISSUER}/api/accounts`;
const DEVICE_VERIFY_URL = `${ISSUER}/codex/device`;

/** ChatGPT backend API base — used instead of api.openai.com/v1 */
export const CHATGPT_API_BASE = "https://chatgpt.com/backend-api";

const STORE_KEY = "domus_openai_oauth_tokens";
const POLL_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

// ─── Token types ───────────────────────────────────────────────────────────────

export interface OpenAIOAuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number; // timestamp ms
}

interface DeviceCodeResponse {
  device_auth_id: string;
  user_code: string;
  interval: string | number;
}

interface DeviceTokenResponse {
  authorization_code: string;
  code_verifier: string;
  code_challenge: string;
}

interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in?: number;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class OpenAIOAuthService {
  /**
   * Device Code login flow (same as Codex CLI).
   * 1. Request device code
   * 2. Open browser for user to enter code
   * 3. Poll until approved
   * 4. Exchange for tokens
   *
   * Returns tokens on success, null on cancel/timeout.
   * Calls onCode(userCode) so the UI can show the code to the user.
   */
  static async loginWithDeviceCode(
    onCode: (code: string, verifyUrl: string) => void,
    signal?: AbortSignal,
  ): Promise<OpenAIOAuthTokens | null> {
    const online = await ConnectivityService.isOnline();
    if (!online) {
      throw new Error("Sem conexão com a internet. Verifique sua conexão e tente novamente.");
    }

    // Step 1: Request user code
    const deviceResp = await fetch(`${API_BASE}/deviceauth/usercode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID }),
    });

    if (!deviceResp.ok) {
      const text = await deviceResp.text();
      throw new Error(`Device code request failed (${deviceResp.status}): ${text}`);
    }

    const device = (await deviceResp.json()) as DeviceCodeResponse;
    const interval = typeof device.interval === "string"
      ? parseInt(device.interval, 10) || 5
      : device.interval || 5;

    // Step 2: Notify UI of the code (UI handles browser opening)
    onCode(device.user_code, DEVICE_VERIFY_URL);

    // Step 3: Poll for authorization
    const pollResult = await OpenAIOAuthService.pollForToken(
      device.device_auth_id,
      device.user_code,
      interval,
      signal,
    );

    if (!pollResult) return null;

    // Step 4: Exchange authorization code for OAuth tokens
    const redirectUri = `${ISSUER}/deviceauth/callback`;
    const body =
      `grant_type=authorization_code` +
      `&code=${encodeURIComponent(pollResult.authorization_code)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&code_verifier=${encodeURIComponent(pollResult.code_verifier)}`;

    const tokenResp = await fetch(`${ISSUER}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!tokenResp.ok) {
      const text = await tokenResp.text();
      throw new Error(`Token exchange failed (${tokenResp.status}): ${text}`);
    }

    const tokenData = (await tokenResp.json()) as OAuthTokenResponse;

    const tokens: OpenAIOAuthTokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      idToken: tokenData.id_token,
      expiresAt: Date.now() + (tokenData.expires_in ?? 3600) * 1000,
    };

    await OpenAIOAuthService.saveTokens(tokens);
    return tokens;
  }

  /**
   * Poll the device auth token endpoint until the user completes login.
   * Returns null on timeout or cancellation.
   */
  private static async pollForToken(
    deviceAuthId: string,
    userCode: string,
    intervalSec: number,
    signal?: AbortSignal,
  ): Promise<DeviceTokenResponse | null> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      if (signal?.aborted) return null;

      const resp = await fetch(`${API_BASE}/deviceauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_auth_id: deviceAuthId,
          user_code: userCode,
        }),
      });

      if (resp.ok) {
        return (await resp.json()) as DeviceTokenResponse;
      }

      // 403 = pending, 404 = pending → keep polling
      if (resp.status === 403 || resp.status === 404) {
        await new Promise((r) => setTimeout(r, intervalSec * 1000));
        continue;
      }

      // Other error = abort
      const text = await resp.text();
      throw new Error(`Device auth polling failed (${resp.status}): ${text}`);
    }

    return null; // timeout
  }

  /**
   * Refreshes the access token using the stored refresh token.
   */
  static async refresh(): Promise<OpenAIOAuthTokens | null> {
    const stored = await OpenAIOAuthService.getTokens();
    if (!stored?.refreshToken) return null;

    try {
      const body =
        `grant_type=refresh_token` +
        `&client_id=${encodeURIComponent(CLIENT_ID)}` +
        `&refresh_token=${encodeURIComponent(stored.refreshToken)}`;

      const resp = await fetch(`${ISSUER}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!resp.ok) return null;

      const data = (await resp.json()) as OAuthTokenResponse;

      const tokens: OpenAIOAuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || stored.refreshToken,
        idToken: data.id_token || stored.idToken,
        expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      };

      await OpenAIOAuthService.saveTokens(tokens);
      return tokens;
    } catch {
      return null;
    }
  }

  /**
   * Returns a valid access token, refreshing if needed.
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
