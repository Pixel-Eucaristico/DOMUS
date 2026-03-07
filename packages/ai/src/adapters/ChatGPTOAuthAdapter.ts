import type { AdapterMessage, AdapterOptions, AdapterResult } from "../types";
import type { AIProviderAdapter } from "./AIProviderAdapter";
import { fetchWithTimeout, assertOk } from "./AIProviderAdapter";

/**
 * Adapter that uses the ChatGPT backend API with an OAuth access token
 * (instead of a paid API key). Same response format as OpenAI API.
 *
 * The access token comes from the OpenAI OAuth PKCE flow (same as Codex CLI).
 * This uses the user's ChatGPT subscription (Plus/Team) — no API credits needed.
 */

interface ChatGPTResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const CHATGPT_COMPLETIONS_URL =
  "https://chatgpt.com/backend-api/codex/chat/completions";

export class ChatGPTOAuthAdapter implements AIProviderAdapter {
  readonly provider = "openai";

  async complete(
    messages: AdapterMessage[],
    accessToken: string,
    options: AdapterOptions,
  ): Promise<AdapterResult> {
    const response = await fetchWithTimeout(
      CHATGPT_COMPLETIONS_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          model: options.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 512,
        }),
      },
    );

    await assertOk(response, "ChatGPT");

    const json = (await response.json()) as ChatGPTResponse;
    const content = json.choices[0]?.message?.content ?? "";
    const tokensUsed = json.usage?.total_tokens ?? 0;

    return { content, tokensUsed };
  }
}
