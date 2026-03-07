import type { AdapterMessage, AdapterOptions, AdapterResult } from "../types";
import type { AIProviderAdapter } from "./AIProviderAdapter";
import { fetchWithTimeout, assertOk } from "./AIProviderAdapter";

/**
 * Adapter that uses the ChatGPT backend API with an OAuth access token
 * (instead of a paid API key). Uses the Responses API format (same as Codex CLI).
 *
 * The access token comes from the OpenAI Device Code OAuth flow.
 * This uses the user's ChatGPT subscription (Plus/Team) — no API credits needed.
 *
 * Endpoint: https://chatgpt.com/backend-api/codex/responses
 * Format: OpenAI Responses API with SSE streaming (stream: true is required)
 *
 * Required headers (from Codex CLI source):
 * - Authorization: Bearer <access_token>
 * - ChatGPT-Account-ID: <account_id> (extracted from JWT)
 */

const CHATGPT_RESPONSES_URL =
  "https://chatgpt.com/backend-api/codex/responses";

/**
 * Decodes a JWT payload without signature verification.
 * We only need to read claims (account_id) from the access token.
 */
function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split(".");
  if (parts.length < 2) return {};
  try {
    let base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) base64 += "=";
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Extracts the ChatGPT account ID from an OAuth access token JWT.
 * The Codex CLI sends this as the `ChatGPT-Account-ID` header.
 */
function extractAccountId(accessToken: string): string | null {
  const payload = decodeJwtPayload(accessToken);
  return (
    (payload["https://api.openai.com/auth"] as Record<string, string>)?.["account_id"] ??
    (payload["account_id"] as string) ??
    (payload["org_id"] as string) ??
    null
  );
}

/**
 * Parses an SSE stream and collects all text deltas + usage from Responses API events.
 *
 * Key SSE event types:
 * - response.output_text.delta  → { delta: "text chunk" }
 * - response.completed          → { response: { usage: {...} } }
 * - response.failed             → { response: { error: {...} } }
 */
async function consumeSSEStream(
  response: Response,
): Promise<{ content: string; tokensUsed: number }> {
  const body = response.body;
  if (!body) throw new Error("ChatGPT: response body is null");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let tokensUsed = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      const lines = buffer.split("\n");
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        let event: Record<string, unknown>;
        try {
          event = JSON.parse(data) as Record<string, unknown>;
        } catch {
          continue;
        }

        const type = event.type as string;

        if (type === "response.output_text.delta") {
          const delta = event.delta as string;
          if (delta) content += delta;
        } else if (type === "response.completed") {
          const resp = event.response as Record<string, unknown> | undefined;
          const usage = resp?.usage as Record<string, number> | undefined;
          if (usage?.total_tokens) {
            tokensUsed = usage.total_tokens;
          }
        } else if (type === "response.failed") {
          const resp = event.response as Record<string, unknown> | undefined;
          const error = resp?.error as Record<string, string> | undefined;
          throw new Error(
            `ChatGPT API error: ${error?.message ?? "unknown error"} (${error?.code ?? "unknown"})`,
          );
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { content, tokensUsed };
}

export class ChatGPTOAuthAdapter implements AIProviderAdapter {
  readonly provider = "openai";

  async complete(
    messages: AdapterMessage[],
    accessToken: string,
    options: AdapterOptions,
  ): Promise<AdapterResult> {
    // Separate system instruction from conversation messages
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystemMsgs = messages.filter((m) => m.role !== "system");

    // Build Responses API input array
    const input = nonSystemMsgs.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Only send parameters the Codex CLI backend accepts.
    // temperature, max_output_tokens etc. are NOT supported.
    const body: Record<string, unknown> = {
      model: options.model,
      input,
      stream: true,
      store: true,
    };

    if (systemMsg) {
      body.instructions = systemMsg.content;
    }

    // Build headers matching Codex CLI requirements
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Accept: "text/event-stream",
    };

    const accountId = extractAccountId(accessToken);
    if (accountId) {
      headers["ChatGPT-Account-ID"] = accountId;
    }

    const response = await fetchWithTimeout(
      CHATGPT_RESPONSES_URL,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      },
      60_000, // Streaming needs longer timeout
    );

    await assertOk(response, "ChatGPT");

    // Parse SSE stream and collect full response
    const { content, tokensUsed } = await consumeSSEStream(response);

    return { content, tokensUsed };
  }
}
