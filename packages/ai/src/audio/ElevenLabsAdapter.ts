import type { IAudioProvider } from "../types";
import { fetchWithTimeout, assertOk } from "../adapters/AIProviderAdapter";

/** Default voice ID for ElevenLabs (Rachel - multilingual) */
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export const ELEVENLABS_VOICES: Record<string, string> = {
  rachel: "21m00Tcm4TlvDq8ikWAM",
  drew: "29vD33N1CtxCmqQRPOHJ",
  clyde: "2EiwWnXFnvU5JabPnv8n",
  paul: "5Q0t7uMcjvnagumLfvZi",
  domi: "AZnzlk1XvdvUeBnXmlld",
  dave: "CYw49thpadSPcbBxqMGG",
  fin: "D38z5RcWu1voky8WS1ja",
  sarah: "EXAVITQu4vr4xnSDxMaL",
  antoni: "ErXwobaYiN019PkySvjV",
  thomas: "GBv7mTt0atIp3Br8iCZE",
  charlie: "IKne3meq5aSn9XLyUdCD",
  emily: "LcfcDJNUP1GQjkzn1xUU",
  elli: "MF3mGyEYCl7XYWbV9V6O",
  callum: "N2lVS1w4EtoT3dr4eOWO",
  patrick: "ODq5zmih8GrVes37Dizd",
  harry: "SOYHLrjzK2X1ezoPC6cr",
  liam: "TX3LPaxmHKxFdv7VOQHJ",
  dorothy: "ThT5KcBeYPX3keUQqHPh",
  josh: "TxGEqnHWrfWFTfGW9XjX",
  arnold: "VR6AewLTigWG4xSOukaG",
  charlotte: "XB0fDUnXU5powFXDhCwa",
  matilda: "XrExE9yKIg1WjnnlVkGX",
  james: "ZQe5CZNOzWyzPSCn5a3c",
  jessica: "cgSgspJ2msm6clMCkdW9",
  lily: "pFZP5JQG7iQjIQuC4Bku",
  serena: "pMsXgVXv3BLzUgSXRplE",
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
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      },
      30_000,
    );
    await assertOk(response, "ElevenLabs");

    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]!);
    const base64 = btoa(binary);

    return { base64, format: "mp3" };
  }
}
