/**
 * Google OAuth 2.0 implicit flow for web using popup window.
 * Returns an access token directly (no server-side exchange needed).
 *
 * Requires "http://localhost:8081" (or your web origin) to be added as an
 * authorized redirect URI in the Google Cloud Console under the Web Client ID.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = "https://www.googleapis.com/auth/drive.appdata email profile";

export interface GoogleWebAuthResult {
  accessToken: string;
  expiresIn: number;
  email: string;
}

export async function signInWithGoogleWeb(clientId: string): Promise<GoogleWebAuthResult | null> {
  return new Promise((resolve) => {
    const redirectUri = window.location.origin;
    const state = Math.random().toString(36).slice(2);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "token",
      scope: SCOPES,
      state,
      include_granted_scopes: "true",
    });

    const url = `${GOOGLE_AUTH_URL}?${params.toString()}`;
    const popup = window.open(url, "google-auth", "width=500,height=600,menubar=no,toolbar=no");

    if (!popup) {
      resolve(null);
      return;
    }

    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          resolve(null);
          return;
        }

        const popupUrl = popup.location.href;
        if (popupUrl.startsWith(redirectUri)) {
          clearInterval(timer);

          // Token is in the URL hash fragment (after #)
          const hash = popup.location.hash.substring(1);
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get("access_token");
          const expiresIn = parseInt(hashParams.get("expires_in") ?? "3600", 10);
          const returnedState = hashParams.get("state");
          popup.close();

          if (accessToken && returnedState === state) {
            resolve({ accessToken, expiresIn, email: "" });
          } else {
            resolve(null);
          }
        }
      } catch {
        // Cross-origin — popup still on Google's domain, keep polling
      }
    }, 200);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(timer);
      if (!popup.closed) popup.close();
      resolve(null);
    }, 5 * 60 * 1000);
  });
}
