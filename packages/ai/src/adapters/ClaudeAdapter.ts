import type { AdapterMessage, AdapterOptions, AdapterResult } from "../types";
import type { AIProviderAdapter } from "./AIProviderAdapter";
import { fetchWithTimeout, assertOk } from "./AIProviderAdapter";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicRequestBody {
  model: string;
  max_tokens: number;
  temperature: number;
  messages: AnthropicMessage[];
  system?: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class ClaudeAdapter implements AIProviderAdapter {
  readonly provider = "claude";

  async complete(
    messages: AdapterMessage[],
    apiKey: string,
    options: AdapterOptions,
  ): Promise<AdapterResult> {
    const systemMessages = messages.filter((m) => m.role === "system");
    const otherMessages = messages.filter((m) => m.role !== "system");

    // Anthropic requires strict alternating user/assistant turns.
    // Merge consecutive same-role messages.
    const anthropicMessages: AnthropicMessage[] =
      ClaudeAdapter.mergeConsecutive(
        otherMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      );

    // Ensure first message is always "user"
    if (anthropicMessages.length > 0 && anthropicMessages[0]!.role !== "user") {
      anthropicMessages.unshift({ role: "user", content: "" });
    }

    const body: AnthropicRequestBody = {
      model: options.model,
      max_tokens: options.maxTokens ?? 512,
      temperature: options.temperature ?? 0.2,
      messages: anthropicMessages,
    };

    if (systemMessages.length > 0) {
      body.system = systemMessages.map((m) => m.content).join("\n");
    }

    const response = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      },
    );

    await assertOk(response, "Claude");

    const json = (await response.json()) as AnthropicResponse;
    const content =
      json.content.find((c) => c.type === "text")?.text ?? "";
    const tokensUsed =
      (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0);

    return { content, tokensUsed };
  }

  /** Merge consecutive messages with the same role into one. */
  private static mergeConsecutive(
    messages: AnthropicMessage[],
  ): AnthropicMessage[] {
    const result: AnthropicMessage[] = [];
    for (const msg of messages) {
      const last = result[result.length - 1];
      if (last && last.role === msg.role) {
        last.content += `\n\n${msg.content}`;
      } else {
        result.push({ ...msg });
      }
    }
    return result;
  }
}
