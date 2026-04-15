import type { AdapterMessage, AdapterOptions, AdapterResult } from "../types";
import type { AIProviderAdapter } from "./AIProviderAdapter";
import { fetchWithTimeout, assertOk } from "./AIProviderAdapter";

export type OpenAIVoiceId = "alloy" | "ash" | "ballad" | "coral" | "echo" | "fable" | "nova" | "onyx" | "sage" | "shimmer" | "verse" | "marin" | "cedar";

interface OpenAIResponse {
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

export class OpenAIAdapter implements AIProviderAdapter {
  readonly provider = "openai";

  /** Transcreve áudio via Whisper. audioUri = caminho local do arquivo .m4a */
  async transcribeAudio(audioUri: string, apiKey: string): Promise<string> {
    const formData = new FormData();
    formData.append("file", {
      uri: audioUri,
      type: "audio/m4a",
      name: "recording.m4a",
    } as unknown as Blob);
    formData.append("model", "gpt-4o-mini-transcribe");
    formData.append("language", "pt");

    const response = await fetchWithTimeout(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      },
      30_000,
    );
    await assertOk(response, "OpenAI Whisper");
    const json = (await response.json()) as { text: string };
    return json.text ?? "";
  }

  async complete(
    messages: AdapterMessage[],
    apiKey: string,
    options: AdapterOptions,
  ): Promise<AdapterResult> {
    const response = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: options.model,
          messages: messages.map((m) => {
            // Vision: if message has imageBase64, build multimodal content array
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
          // o-series and reasoning models don't support temperature; gpt-5.x may also reject it
          ...(/^(o[0-9]|gpt-5)/.test(options.model ?? "") ? {} : { temperature: Number(options.temperature ?? 0.2) }),
          max_completion_tokens: options.maxTokens ?? 4096,
        }),
      },
    );

    await assertOk(response, "OpenAI");

    const json = (await response.json()) as OpenAIResponse;
    const content = json.choices[0]?.message?.content ?? "";
    const tokensUsed = json.usage?.total_tokens ?? 0;

    return { content, tokensUsed };
  }
}
