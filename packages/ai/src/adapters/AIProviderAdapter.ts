import type { AdapterMessage, AdapterOptions, AdapterResult } from "../types";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface AIProviderAdapter {
  readonly provider: string;
  complete(
    messages: AdapterMessage[],
    apiKey: string,
    options: AdapterOptions,
  ): Promise<AdapterResult>;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_ADAPTER_OPTIONS: AdapterOptions = {
  temperature: 0.2,
  maxTokens: 512,
};

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/**
 * Wraps `fetch` with an AbortController timeout.
 * Throws if the request takes longer than `timeoutMs` (default 15s).
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 30_000,
): Promise<Response> {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timerId);
  }
}

/**
 * Reads the response body as text and throws a descriptive error if
 * the HTTP status is not OK.
 */
export async function assertOk(response: Response, providerName: string): Promise<void> {
  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
      // ignore
    }
    throw new Error(
      `${providerName} HTTP ${response.status}: ${body.slice(0, 300)}`,
    );
  }
}
