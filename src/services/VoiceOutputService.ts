import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";
import type { AudioProvider } from "@packages/ai";
import { AudioProviderFactory } from "@packages/../packages/ai/src/audio/AudioProviderFactory";
import { TokenTracker } from "@/src/modules/ai/application/TokenTracker";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_CHUNK_CHARS = 500;

// ─── Text chunking ────────────────────────────────────────────────────────────

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

// ─── Audio concatenation ──────────────────────────────────────────────────────

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)!;
  return bytes;
}

function isWavBytes(bytes: Uint8Array): boolean {
  // WAV starts with "RIFF" magic
  return (
    bytes[0] === 0x52 && bytes[1] === 0x49 &&
    bytes[2] === 0x46 && bytes[3] === 0x46
  );
}

/**
 * Find the offset of the "data" sub-chunk in a WAV buffer.
 * Returns { offset, size } where offset points to the "data" ID (not the audio data itself).
 */
function findWavDataChunk(buf: Uint8Array): { offset: number; size: number } | null {
  let off = 12; // skip RIFF header (4 + 4 + 4)
  while (off + 8 <= buf.length) {
    const id =
      String.fromCharCode(buf[off]!, buf[off + 1]!, buf[off + 2]!, buf[off + 3]!);
    const size =
      buf[off + 4]! |
      (buf[off + 5]! << 8) |
      (buf[off + 6]! << 16) |
      (buf[off + 7]! << 24);
    if (id === "data") return { offset: off, size };
    off += 8 + size + (size % 2); // sub-chunks are word-aligned
  }
  return null;
}

function concatWav(parts: Uint8Array[]): Uint8Array {
  if (parts.length === 1) return parts[0]!;

  const first = parts[0]!;
  const firstData = findWavDataChunk(first);
  if (!firstData) return concatMp3(parts); // fallback

  // Header = everything up to (but not including) the data audio bytes
  const headerEnd = firstData.offset + 8; // "data" id (4) + size field (4)
  const header = first.slice(0, headerEnd);

  // Collect raw PCM data from each part
  const dataParts: Uint8Array[] = [];
  let totalDataSize = 0;

  for (const buf of parts) {
    const d = findWavDataChunk(buf);
    if (!d) continue;
    const audio = buf.slice(d.offset + 8, d.offset + 8 + d.size);
    dataParts.push(audio);
    totalDataSize += d.size;
  }

  const result = new Uint8Array(headerEnd + totalDataSize);
  result.set(header, 0);

  // Fix RIFF chunk size: total file size - 8 bytes (RIFF id + size field)
  const riffSize = headerEnd - 8 + totalDataSize;
  result[4] = riffSize & 0xff;
  result[5] = (riffSize >> 8) & 0xff;
  result[6] = (riffSize >> 16) & 0xff;
  result[7] = (riffSize >> 24) & 0xff;

  // Fix data chunk size
  const dataOff = firstData.offset;
  result[dataOff + 4] = totalDataSize & 0xff;
  result[dataOff + 5] = (totalDataSize >> 8) & 0xff;
  result[dataOff + 6] = (totalDataSize >> 16) & 0xff;
  result[dataOff + 7] = (totalDataSize >> 24) & 0xff;

  // Write audio data
  let writeAt = headerEnd;
  for (const part of dataParts) {
    result.set(part, writeAt);
    writeAt += part.length;
  }

  return result;
}

function concatMp3(parts: Uint8Array[]): Uint8Array {
  // MP3 is a stream of independent frames — raw concatenation is valid
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// ─── Service ─────────────────────────────────────────────────────────────────

type TTSListener = (state: { isSpeaking: boolean; isLoading: boolean; error?: string }) => void;

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
    return () => { this._listeners = this._listeners.filter((l) => l !== listener); };
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

    let tmpFile: File | null = null;

    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });

      // ── Download all chunks in parallel ───────────────────────────────────
      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const { base64 } = await adapter.synthesize(chunk, apiKey, voice);
          TokenTracker.recordTTSChars(audioProvider, chunk.length).catch(() => {});
          return base64ToBytes(base64);
        }),
      );

      if (this._cancelled) return;

      // ── Concatenate into single file ──────────────────────────────────────
      const isWav = results[0] && isWavBytes(results[0]);
      const merged = isWav ? concatWav(results) : concatMp3(results);
      const ext = isWav ? "wav" : "mp3";

      tmpFile = new File(Paths.cache, `domus_tts_${Date.now()}.${ext}`);
      tmpFile.write(merged);

      if (this._cancelled) return;

      // ── Play single file ──────────────────────────────────────────────────
      this._isLoading = false;
      this._isSpeaking = true;
      this.notify();

      const player = createAudioPlayer({ uri: tmpFile.uri });
      this.player = player;
      player.play();
      await this.waitForPlayer(player);

      try { player.remove(); } catch { /* ignore */ }
      if (this.player === player) this.player = null;

    } catch (err) {
      console.error("[TTS] Erro:", err);

      // ── Fallback: sequential playback if concat failed ────────────────────
      if (!this._cancelled) {
        await this.fallbackSequential(chunks, adapter, apiKey, voice, audioProvider);
        return;
      }
    } finally {
      if (tmpFile) { try { tmpFile.delete(); } catch { /* ignore */ } }
      this._isLoading = false;
      this._isSpeaking = false;
      this.notify();
    }
  }

  /** Sequential fallback: play parts one by one with await (no overlap) */
  private async fallbackSequential(
    chunks: string[],
    adapter: any,
    apiKey: string,
    voice: string,
    audioProvider: AudioProvider,
  ): Promise<void> {
    this._isLoading = false;
    this._isSpeaking = true;
    this.notify();

    for (let i = 0; i < chunks.length; i++) {
      if (this._cancelled) break;
      let tmpFile: File | null = null;
      try {
        const { base64 } = await adapter.synthesize(chunks[i]!, apiKey, voice);
        TokenTracker.recordTTSChars(audioProvider, chunks[i]!.length).catch(() => {});
        if (this._cancelled) break;

        const bytes = base64ToBytes(base64);
        const ext = isWavBytes(bytes) ? "wav" : "mp3";
        tmpFile = new File(Paths.cache, `domus_tts_fb_${Date.now()}_${i}.${ext}`);
        tmpFile.write(bytes);

        const player = createAudioPlayer({ uri: tmpFile.uri });
        this.player = player;
        player.play();
        // Brief delay so player.playing becomes true before we start polling
        await new Promise((r) => setTimeout(r, 80));
        await this.waitForPlayer(player);
        try { player.remove(); } catch { /* ignore */ }
        if (this.player === player) this.player = null;
      } catch (err) {
        console.warn(`[TTS] Fallback chunk ${i} falhou:`, err);
      } finally {
        if (tmpFile) { try { tmpFile.delete(); } catch { /* ignore */ } }
      }
    }

    this._isSpeaking = false;
    this.notify();
  }

  async stop(): Promise<void> {
    this._cancelled = true;
    this._isSpeaking = false;
    this._isLoading = false;
    this.notify();
    if (this.player) {
      try { this.player.pause(); this.player.remove(); } catch { /* ignore */ }
      this.player = null;
    }
  }

  private waitForPlayer(player: AudioPlayer): Promise<void> {
    return new Promise<void>((resolve) => {
      // Initial delay so player.playing transitions to true before polling
      setTimeout(() => {
        const check = setInterval(() => {
          if (!player.playing || this._cancelled) {
            clearInterval(check);
            resolve();
          }
        }, 80);
      }, 120);
    });
  }
}

export const voiceOutputService = new VoiceOutputService();
