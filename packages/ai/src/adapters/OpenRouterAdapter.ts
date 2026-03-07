import type { AdapterMessage, AdapterOptions, AdapterResult } from "../types";
import type { AIProviderAdapter } from "./AIProviderAdapter";
import { fetchWithTimeout, assertOk } from "./AIProviderAdapter";

interface OpenRouterResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterAdapter implements AIProviderAdapter {
  readonly provider = "openrouter";

  async complete(
    messages: AdapterMessage[],
    apiKey: string,
    options: AdapterOptions,
  ): Promise<AdapterResult> {
    const response = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://domus.app",
          "X-OpenRouter-Title": "DOMUS",
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

    await assertOk(response, "OpenRouter");

    const json = (await response.json()) as OpenRouterResponse;
    const content = json.choices[0]?.message?.content ?? "";
    const tokensUsed = json.usage?.total_tokens ?? 0;

    return { content, tokensUsed };
  }
}
