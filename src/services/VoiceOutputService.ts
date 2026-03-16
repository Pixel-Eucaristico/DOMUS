import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";
import type { AudioProvider } from "@packages/ai";
import { AudioProviderFactory } from "@packages/../packages/ai/src/audio/AudioProviderFactory";

class VoiceOutputService {
  private player: AudioPlayer | null = null;
  private _isSpeaking = false;

  get isSpeaking() {
    return this._isSpeaking;
  }

  async speak(
    text: string,
    apiKey: string,
    audioProvider: AudioProvider = "openai",
    voice: string = "nova",
  ): Promise<void> {
    await this.stop();

    if (Platform.OS === "web" || !apiKey) return;

    const adapter = AudioProviderFactory.create(audioProvider);
    const { base64 } = await adapter.synthesize(text, apiKey, voice);

    // Detect WAV header (starts with "RIFF") to use correct extension
    const isWav = base64.startsWith("UklGR"); // "RIFF" in base64
    const ext = isWav ? "wav" : "mp3";
    const file = new File(Paths.cache, `domus_tts_${Date.now()}.${ext}`);

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
}

export const voiceOutputService = new VoiceOutputService();
