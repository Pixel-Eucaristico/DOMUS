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
    const slice = remaining.slice(0, MAX_CHUNK_CHARS);
    let breakIdx = -1;
    for (const sep of [". ", "! ", "? ", ".\n", "!\n", "?\n", ", ", "; ", "\n"]) {
      const idx = slice.lastIndexOf(sep);
      if (idx > breakIdx) breakIdx = idx + sep.length;
    }
    if (breakIdx <= 0) breakIdx = MAX_CHUNK_CHARS;
    chunks.push(remaining.slice(0, breakIdx).trim());
    remaining = remaining.slice(breakIdx).trim();
  }

  return chunks.filter((c) => c.length > 0);
}

type TTSListener = (state: { isSpeaking: boolean; isLoading: boolean }) => void;

interface PreparedChunk {
  file: File;
  player: AudioPlayer;
}

class VoiceOutputService {
  private player: AudioPlayer | null = null;
  private _isSpeaking = false;
  private _isLoading = false;
  private _cancelled = false;
  private _listeners: TTSListener[] = [];

  get isSpeaking() { return this._isSpeaking; }
  get isLoading() { return this._isLoading; }

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
      // Download ALL chunks in parallel for gapless playback
      const downloadPromises = chunks.map(async (chunk, i): Promise<PreparedChunk | null> => {
        if (this._cancelled) return null;
        try {
          const { base64 } = await adapter.synthesize(chunk, apiKey, voice);
          if (this._cancelled) return null;

          const isWav = base64.startsWith("UklGR");
          const ext = isWav ? "wav" : "mp3";
          const file = new File(Paths.cache, `domus_tts_${Date.now()}_${i}.${ext}`);

          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j)!;
          }
          file.write(bytes);

          await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
          const player = createAudioPlayer({ uri: file.uri });
          return { file, player };
        } catch (err) {
          console.warn(`[TTS] Chunk ${i} falhou:`, err);
          return null;
        }
      });

      // Wait for at least the first chunk to be ready, then start playing immediately
      const prepared: (PreparedChunk | null)[] = [];
      for (let i = 0; i < downloadPromises.length; i++) {
        const result = await downloadPromises[i];
        prepared.push(result);

        // Start playing as soon as first chunk is ready
        if (i === 0 && result && !this._cancelled) {
          this._isLoading = false;
          this._isSpeaking = true;
          this.notify();

          this.player = result.player;
          result.player.play();
          // Don't await - let downloads continue while first chunk plays
        }
      }

      // Now play each chunk in sequence (first already started)
      for (let i = 0; i < prepared.length; i++) {
        if (this._cancelled) break;
        const chunk = prepared[i];
        if (!chunk) continue;

        if (i === 0) {
          // First chunk already playing, just wait for it to finish
          await this.waitForPlayer(chunk.player);
          this.cleanupChunk(chunk);
        } else {
          // Play next chunk immediately (no gap)
          if (this._cancelled) break;
          this.player = chunk.player;
          chunk.player.play();
          await this.waitForPlayer(chunk.player);
          this.cleanupChunk(chunk);
        }
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

  private waitForPlayer(player: AudioPlayer): Promise<void> {
    return new Promise<void>((resolve) => {
      const checkDone = setInterval(() => {
        if (!player.playing || this._cancelled) {
          clearInterval(checkDone);
          resolve();
        }
      }, 100); // Check more frequently for smoother transitions
    });
  }

  private cleanupChunk(chunk: PreparedChunk) {
    try {
      chunk.player.remove();
      chunk.file.delete();
    } catch { /* ignore */ }
    if (this.player === chunk.player) this.player = null;
  }
}

export const voiceOutputService = new VoiceOutputService();
