import type { AdapterMessage, AdapterOptions, AdapterResult } from "../types";
import type { AIProviderAdapter } from "./AIProviderAdapter";
import { fetchWithTimeout, assertOk } from "./AIProviderAdapter";

interface QwenResponse {
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

export class QwenAdapter implements AIProviderAdapter {
  readonly provider = "qwen";

  async complete(
    messages: AdapterMessage[],
    apiKey: string,
    options: AdapterOptions,
  ): Promise<AdapterResult> {
    const response = await fetchWithTimeout(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: options.model,
          messages: messages.map((m) => {
            // Vision: Qwen VL supports OpenAI-compatible multimodal format
            if (m.imageBase64) {
              return {
                role: m.role,
                content: [
                  { type: "text" as const, text: m.content },
                  {
                    type: "image_url" as const,
                    image_url: {
                      url: `data:${m.imageMimeType || "image/jpeg"};base64,${m.imageBase64}`,
                    },
                  },
                ],
              };
            }
            return { role: m.role, content: m.content };
          }),
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 4096,
        }),
      },
    );

    await assertOk(response, "Qwen");

    const json = (await response.json()) as QwenResponse;
    const content = json.choices[0]?.message?.content ?? "";
    const tokensUsed = json.usage?.total_tokens ?? 0;

    return { content, tokensUsed };
  }

}
