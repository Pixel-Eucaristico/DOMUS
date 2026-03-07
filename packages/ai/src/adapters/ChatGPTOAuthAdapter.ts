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
    };

    // System prompt goes in `instructions` field
    if (systemMsg) {
      body.instructions = systemMsg.content;
    }

    const response = await fetchWithTimeout(
      CHATGPT_RESPONSES_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
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
