import type { IAudioProvider } from "../types";
import { fetchWithTimeout, assertOk } from "../adapters/AIProviderAdapter";

/** Qwen TTS voices (multilingual) */
export const QWEN_TTS_VOICES: Record<string, string> = {
  cherry: "Cherry",
  serena: "Serena",
  ethan: "Ethan",
  moon: "Moon",
  kai: "Kai",
  neil: "Neil",
  bella: "Bella",
  jennifer: "Jennifer",
  ryan: "Ryan",
};

export class QwenAudioAdapter implements IAudioProvider {
  async synthesize(
    text: string,
    apiKey: string,
    voice: string,
  ): Promise<{ base64: string; format: "mp3" }> {
    const voiceName = QWEN_TTS_VOICES[voice.toLowerCase()] || voice || "Cherry";

    const response = await fetchWithTimeout(
      "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "qwen3-tts-flash",
          input: {
            text,
            voice: voiceName,
          },
        }),
      },
      30_000,
    );
    await assertOk(response, "Qwen TTS");

    // Qwen TTS returns JSON with audio data
    const json = (await response.json()) as {
      output?: { audio?: string };
    };

    const base64 = json.output?.audio ?? "";
    if (!base64) {
      throw new Error("Qwen TTS nao retornou audio. Verifique sua chave e tente novamente.");
    }

    return { base64, format: "mp3" };
  }
}
