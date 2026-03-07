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
 * Format: OpenAI Responses API (NOT Chat Completions)
 *
 * Required headers (from Codex CLI source):
 * - Authorization: Bearer <access_token>
 * - ChatGPT-Account-ID: <account_id> (extracted from JWT)
 */

/** Responses API response shape */
interface ResponsesAPIResponse {
  id: string;
  output: Array<{
    type: string;
    role?: string;
    content?: Array<{
      type: string;
      text?: string;
    }>;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    code: string;
  };
}

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
    // JWT uses base64url encoding — convert to standard base64
    let base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    // Pad to multiple of 4
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
  // Try common claim names used by OpenAI
  return (
    (payload["https://api.openai.com/auth"]  as Record<string, string>)?.["account_id"] ??
    (payload["account_id"] as string) ??
    (payload["org_id"] as string) ??
    null
  );
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

    const body: Record<string, unknown> = {
      model: options.model,
      input,
      max_output_tokens: options.maxTokens ?? 512,
      temperature: options.temperature ?? 0.2,
      stream: false,
      store: false,
    };

    // System prompt goes in `instructions` field
    if (systemMsg) {
      body.instructions = systemMsg.content;
    }

    // Build headers matching Codex CLI requirements
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };

    // Extract and add ChatGPT-Account-ID from JWT (required by backend)
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
    );

    await assertOk(response, "ChatGPT");

    const json = (await response.json()) as ResponsesAPIResponse;

    if (json.error) {
      throw new Error(`ChatGPT API error: ${json.error.message}`);
    }

    // Extract text from Responses API output
    let content = "";
    for (const item of json.output ?? []) {
      if (item.type === "message" && item.content) {
        for (const block of item.content) {
          if (block.type === "output_text" && block.text) {
            content += block.text;
          }
        }
      }
    }

    const tokensUsed = json.usage?.total_tokens ?? 0;

    return { content, tokensUsed };
  }
}
