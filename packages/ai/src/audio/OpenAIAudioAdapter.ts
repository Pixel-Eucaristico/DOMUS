import type { IAudioProvider } from "../types";
import { fetchWithTimeout, assertOk } from "../adapters/AIProviderAdapter";

export class OpenAIAudioAdapter implements IAudioProvider {
  async synthesize(
    text: string,
    apiKey: string,
    voice: string,
  ): Promise<{ base64: string; format: "mp3" }> {
    const response = await fetchWithTimeout(
      "https://api.openai.com/v1/audio/speech",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          input: text,
          voice: voice || "nova",
        }),
      },
      30_000,
    );
    await assertOk(response, "OpenAI TTS");

    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]!);
    const base64 = btoa(binary);

    return { base64, format: "mp3" };
  }
}
