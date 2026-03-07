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

interface GeminiSafetySetting {
  category: string;
  threshold: string;
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: GeminiSystemInstruction;
  safetySettings?: GeminiSafetySetting[];
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
  };
}

interface GeminiCandidate {
  content?: { parts: GeminiPart[] };
  finishReason: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  promptFeedback?: {
    blockReason?: string;
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
      safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
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

    // Handle blocked prompts
    if (!json.candidates || json.candidates.length === 0) {
      const blockReason = json.promptFeedback?.blockReason ?? "UNKNOWN";
      throw new Error(
        `Gemini bloqueou a requisicao (blockReason: ${blockReason}). Tente reformular sua pergunta.`,
      );
    }

    const candidate = json.candidates[0]!;

    // Handle safety-filtered responses
    if (candidate.finishReason === "SAFETY") {
      throw new Error(
        "Gemini filtrou a resposta por motivos de seguranca. Tente reformular sua pergunta.",
      );
    }

    const content = candidate.content?.parts[0]?.text ?? "";
    const tokensUsed = json.usageMetadata?.totalTokenCount ?? 0;

    return { content, tokensUsed };
  }
}
