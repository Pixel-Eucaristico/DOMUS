import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";
import type { AIProvider } from "@packages/ai";
import type { OpenAIVoiceId } from "@packages/../packages/ai/src/adapters/OpenAIAdapter";
import { OpenAIAdapter } from "@packages/../packages/ai/src/adapters/OpenAIAdapter";

class VoiceOutputService {
  private player: AudioPlayer | null = null;
  private _isSpeaking = false;

  get isSpeaking() {
    return this._isSpeaking;
  }

  async speak(
    text: string,
    provider: AIProvider,
    apiKey?: string,
    voice: OpenAIVoiceId = "nova",
  ): Promise<void> {
    await this.stop();

    if (provider === "openai" && apiKey && Platform.OS !== "web") {
      await this._speakOpenAI(text, apiKey, voice);
    }
    // For other providers: no TTS without expo-speech
  }

  async stop(): Promise<void> {
    this._isSpeaking = false;
    if (this.player) {
      try {
        this.player.pause();
        this.player.remove();
      } catch {
        // ignore
      }
      this.player = null;
    }
  }

  private async _speakOpenAI(
    text: string,
    apiKey: string,
    voice: OpenAIVoiceId,
  ): Promise<void> {
    const adapter = new OpenAIAdapter();
    const file = new File(Paths.cache, `domus_tts_${Date.now()}.mp3`);

    // Use tmpDir path trick: pass dir string, adapter appends filename
    const tmpDir = Paths.cache.uri;
    const raw = await adapter.synthesizeSpeech(text, apiKey, voice, tmpDir);
    const { base64 } = JSON.parse(raw) as { base64: string; path: string };

    // Write MP3 bytes from base64
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)!;
    }
    file.write(bytes);

    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });

    const player = createAudioPlayer({ uri: file.uri });
    this.player = player;
    this._isSpeaking = true;
    player.play();

    // Poll for completion
    const checkDone = setInterval(() => {
      if (!player.playing) {
        this._isSpeaking = false;
        clearInterval(checkDone);
        try {
          player.remove();
          file.delete();
        } catch {
          // ignore
        }
        if (this.player === player) this.player = null;
      }
    }, 500);
  }
}

export const voiceOutputService = new VoiceOutputService();
