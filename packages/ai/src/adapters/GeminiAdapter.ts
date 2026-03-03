import type { AdapterMessage, AdapterOptions, AdapterResult } from "../types";
import type { AIProviderAdapter } from "./AIProviderAdapter";
import { fetchWithTimeout, assertOk } from "./AIProviderAdapter";

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiSystemInstruction {
  parts: GeminiPart[];
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: GeminiSystemInstruction;
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: { parts: GeminiPart[] };
    finishReason: string;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiAdapter implements AIProviderAdapter {
  readonly provider = "gemini";

  async complete(
    messages: AdapterMessage[],
    apiKey: string,
    options: AdapterOptions,
  ): Promise<AdapterResult> {
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const systemInstruction: GeminiSystemInstruction | undefined =
      systemMessages.length > 0
        ? {
            parts: [
              { text: systemMessages.map((m) => m.content).join("\n") },
            ],
          }
        : undefined;

    const contents: GeminiContent[] = conversationMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${apiKey}`;

    const body: GeminiRequestBody = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 512,
      },
    };
    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    await assertOk(response, "Gemini");

    const json = (await response.json()) as GeminiResponse;
    const content = json.candidates[0]?.content.parts[0]?.text ?? "";
    const tokensUsed = json.usageMetadata?.totalTokenCount ?? 0;

    return { content, tokensUsed };
  }
}
