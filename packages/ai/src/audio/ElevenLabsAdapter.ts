import type { IAudioProvider } from "../types";
import { fetchWithTimeout, assertOk } from "../adapters/AIProviderAdapter";

/** Default voice ID for ElevenLabs (Sarah - current premade) */
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

/** Current premade voices (free tier compatible) */
export const ELEVENLABS_VOICES: Record<string, string> = {
  sarah: "EXAVITQu4vr4xnSDxMaL",
  roger: "CwhRBWXzGAHq8TQ4Fs17",
  laura: "FGY2WhTYpPnrIDTdsKH5",
  charlie: "IKne3meq5aSn9XLyUdCD",
  george: "JBFqnCBsd6RMkjVDRZzb",
  callum: "N2lVS1w4EtoT3dr4eOWO",
  river: "SAz9YHcvj6GT2YYXdXww",
  harry: "SOYHLrjzK2X1ezoPC6cr",
  liam: "TX3LPaxmHKxFdv7VOQHJ",
  alice: "Xb7hH8MSUJpSbSDYk0k2",
  matilda: "XrExE9yKIg1WjnnlVkGX",
  will: "bIHbv24MWmeRgasZH58o",
  jessica: "cgSgspJ2msm6clMCkdW9",
  eric: "cjVigY5qzO86Huf0OWal",
  bella: "hpp4J3VqNfWAUOO0d1Us",
  chris: "iP95p4xoKVk53GoZ742B",
  brian: "nPczCjzI2devNBz1zQrb",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  lily: "pFZP5JQG7iQjIQuC4Bku",
  adam: "pNInz6obpgDQGcFmaJgB",
  bill: "pqHfZKP75CvOlQylNhV4",
};

export class ElevenLabsAdapter implements IAudioProvider {
  async synthesize(
    text: string,
    apiKey: string,
    voice: string,
  ): Promise<{ base64: string; format: "mp3" }> {
    // voice can be a name (key in ELEVENLABS_VOICES) or a raw voice ID
    const voiceId = ELEVENLABS_VOICES[voice.toLowerCase()] || voice || DEFAULT_VOICE_ID;

    const response = await fetchWithTimeout(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          language_code: "pt",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      },
      30_000,
    );
    if (response.status === 402) {
      throw new Error("ElevenLabs requer plano pago para uso via API. Troque o provedor de audio para OpenAI, Gemini ou Qwen nas configuracoes.");
    }
    await assertOk(response, "ElevenLabs");

    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]!);
    const base64 = btoa(binary);

    return { base64, format: "mp3" };
  }

  /** Transcribe audio via ElevenLabs Scribe STT. audioUri = local file path */
  async transcribeAudio(audioUri: string, apiKey: string): Promise<string> {
    const formData = new FormData();
    formData.append("file", {
      uri: audioUri,
      type: "audio/m4a",
      name: "recording.m4a",
    } as unknown as Blob);
    formData.append("model_id", "scribe_v1");
    formData.append("language_code", "pt");

    const response = await fetchWithTimeout(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: formData,
      },
      30_000,
    );
    if (response.status === 402) {
      throw new Error("ElevenLabs STT requer plano pago.");
    }
    await assertOk(response, "ElevenLabs STT");
    const json = (await response.json()) as { text?: string };
    return json.text ?? "";
  }
}
