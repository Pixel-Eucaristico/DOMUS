import type { IAudioProvider } from "../types";
import { fetchWithTimeout, assertOk } from "../adapters/AIProviderAdapter";

/** Gemini TTS prebuilt voices */
export const GEMINI_TTS_VOICES: Record<string, string> = {
  zephyr: "Zephyr",
  puck: "Puck",
  charon: "Charon",
  kore: "Kore",
  fenrir: "Fenrir",
  leda: "Leda",
  orus: "Orus",
  aoede: "Aoede",
  callirrhoe: "Callirrhoe",
  autonoe: "Autonoe",
  enceladus: "Enceladus",
  iapetus: "Iapetus",
  umbriel: "Umbriel",
  algieba: "Algieba",
  despina: "Despina",
  erinome: "Erinome",
  gacrux: "Gacrux",
  pulcherrima: "Pulcherrima",
  achird: "Achird",
  zubenelgenubi: "Zubenelgenubi",
  vindemiatrix: "Vindemiatrix",
  sadachbia: "Sadachbia",
  sadaltager: "Sadaltager",
  sulafat: "Sulafat",
};

interface GeminiTTSResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType: string; data: string };
      }>;
    };
  }>;
}

/**
 * Build a minimal WAV header for PCM data (16-bit, mono, 24kHz).
 * Returns a base64 string with RIFF/WAV wrapper around the PCM payload.
 */
function wrapPcmInWav(pcmBase64: string): string {
  // Decode PCM base64 to bytes
  const pcmRaw = atob(pcmBase64);
  const pcmLen = pcmRaw.length;

  const sampleRate = 24000;
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const fileSize = 44 + pcmLen;

  // Build 44-byte WAV header
  const hdr = new ArrayBuffer(44);
  const dv = new DataView(hdr);
  const u8 = new Uint8Array(hdr);

  // "RIFF"
  u8[0] = 0x52; u8[1] = 0x49; u8[2] = 0x46; u8[3] = 0x46;
  dv.setUint32(4, fileSize - 8, true);
  // "WAVE"
  u8[8] = 0x57; u8[9] = 0x41; u8[10] = 0x56; u8[11] = 0x45;
  // "fmt "
  u8[12] = 0x66; u8[13] = 0x6D; u8[14] = 0x74; u8[15] = 0x20;
  dv.setUint32(16, 16, true);       // fmt chunk size
  dv.setUint16(20, 1, true);        // PCM format
  dv.setUint16(22, channels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, byteRate, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, bitsPerSample, true);
  // "data"
  u8[36] = 0x64; u8[37] = 0x61; u8[38] = 0x74; u8[39] = 0x61;
  dv.setUint32(40, pcmLen, true);

  // Concat header + PCM data and encode to base64
  let out = "";
  for (let i = 0; i < 44; i++) out += String.fromCharCode(u8[i]!);
  for (let i = 0; i < pcmLen; i++) out += pcmRaw[i];
  return btoa(out);
}

export class GeminiAudioAdapter implements IAudioProvider {
  async synthesize(
    text: string,
    apiKey: string,
    voice: string,
  ): Promise<{ base64: string; format: "mp3" }> {
    const voiceName = GEMINI_TTS_VOICES[voice.toLowerCase()] || voice || "Kore";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        }),
      },
      60_000,
    );
    await assertOk(response, "Gemini TTS");

    const json = (await response.json()) as GeminiTTSResponse;
    const part = json.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const audioBase64 = part?.data;
    const mimeType = part?.mimeType ?? "";

    if (!audioBase64) {
      throw new Error("Gemini TTS nao retornou audio. Verifique sua chave e tente novamente.");
    }

    // If already WAV/MP3, use directly
    if (mimeType.includes("wav") || mimeType.includes("mp3") || mimeType.includes("mpeg")) {
      return { base64: audioBase64, format: "mp3" };
    }

    // Raw PCM — wrap in WAV header for playback
    const wavBase64 = wrapPcmInWav(audioBase64);
    return { base64: wavBase64, format: "mp3" };
  }
}
