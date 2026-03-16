import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";
import type { AudioProvider } from "@packages/ai";
import { AudioProviderFactory } from "@packages/../packages/ai/src/audio/AudioProviderFactory";

/** Max chars per TTS chunk to avoid API limits and keep latency low */
const MAX_CHUNK_CHARS = 500;

/** Split text into chunks at sentence boundaries */
function splitIntoChunks(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHUNK_CHARS) {
      chunks.push(remaining);
      break;
    }
    // Find last sentence break within limit
    const slice = remaining.slice(0, MAX_CHUNK_CHARS);
    let breakIdx = -1;
    for (const sep of [". ", "! ", "? ", ".\n", "!\n", "?\n", ", ", "; ", "\n"]) {
      const idx = slice.lastIndexOf(sep);
      if (idx > breakIdx) breakIdx = idx + sep.length;
    }
    if (breakIdx <= 0) breakIdx = MAX_CHUNK_CHARS; // force split
    chunks.push(remaining.slice(0, breakIdx).trim());
    remaining = remaining.slice(breakIdx).trim();
  }

  return chunks.filter((c) => c.length > 0);
}

type TTSListener = (state: { isSpeaking: boolean; isLoading: boolean }) => void;

class VoiceOutputService {
  private player: AudioPlayer | null = null;
  private _isSpeaking = false;
  private _isLoading = false;
  private _cancelled = false;
  private _listeners: TTSListener[] = [];

  get isSpeaking() { return this._isSpeaking; }
  get isLoading() { return this._isLoading; }

  /** Subscribe to state changes (loading/speaking) */
  subscribe(listener: TTSListener): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const state = { isSpeaking: this._isSpeaking, isLoading: this._isLoading };
    for (const l of this._listeners) l(state);
  }

  async speak(
    text: string,
    apiKey: string,
    audioProvider: AudioProvider = "openai",
    voice: string = "nova",
  ): Promise<void> {
    await this.stop();
    if (Platform.OS === "web" || !apiKey || !text.trim()) return;

    this._cancelled = false;
    this._isLoading = true;
    this.notify();

    const adapter = AudioProviderFactory.create(audioProvider);
    const chunks = splitIntoChunks(text);

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (this._cancelled) break;

        // Synthesize chunk
        const { base64 } = await adapter.synthesize(chunks[i]!, apiKey, voice);
        if (this._cancelled) break;

        // First chunk: stop loading, start speaking
        if (i === 0) {
          this._isLoading = false;
          this._isSpeaking = true;
          this.notify();
        }

        // Write and play
        await this.playBase64(base64);
        if (this._cancelled) break;
      }
    } catch (err) {
      console.error("[TTS] Erro:", err);
    } finally {
      this._isLoading = false;
      this._isSpeaking = false;
      this.notify();
    }
  }

  async stop(): Promise<void> {
    this._cancelled = true;
    this._isSpeaking = false;
    this._isLoading = false;
    this.notify();
    if (this.player) {
      try {
        this.player.pause();
        this.player.remove();
      } catch { /* ignore */ }
      this.player = null;
    }
  }

  private async playBase64(base64: string): Promise<void> {
    const isWav = base64.startsWith("UklGR");
    const ext = isWav ? "wav" : "mp3";
    const file = new File(Paths.cache, `domus_tts_${Date.now()}.${ext}`);

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)!;
    }
    file.write(bytes);

    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });

    const player = createAudioPlayer({ uri: file.uri });
    this.player = player;
    player.play();

    // Wait for playback to finish
    await new Promise<void>((resolve) => {
      const checkDone = setInterval(() => {
        if (!player.playing || this._cancelled) {
          clearInterval(checkDone);
          try {
            player.remove();
            file.delete();
          } catch { /* ignore */ }
          if (this.player === player) this.player = null;
          resolve();
        }
      }, 300);
    });
  }
}

export const voiceOutputService = new VoiceOutputService();
