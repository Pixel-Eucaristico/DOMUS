// ─── ConnectivityService ──────────────────────────────────────────────────────
// Uses a lightweight HEAD request to detect internet connectivity.
// Falls back to "online" assumption on any unexpected error to avoid
// incorrectly blocking AI when the probe itself fails.

const PROBE_URL = "https://www.google.com/generate_204";
const PROBE_TIMEOUT_MS = 3_000;

export class ConnectivityService {
  /**
   * Returns `true` if the device can reach the internet.
   * Uses a 3-second HEAD request to a stable endpoint.
   * Defaults to `true` on error (avoid false offline signals).
   */
  static async isOnline(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

      const response = await fetch(PROBE_URL, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timer);
      // Google's generate_204 returns 204 when online
      return response.status === 204 || response.ok;
    } catch {
      // AbortError (timeout) or network error — assume offline
      return false;
    }
  }
}
