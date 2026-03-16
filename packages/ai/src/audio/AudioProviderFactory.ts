import type { AudioProvider, IAudioProvider } from "../types";
import { OpenAIAudioAdapter } from "./OpenAIAudioAdapter";
import { ElevenLabsAdapter } from "./ElevenLabsAdapter";
import { QwenAudioAdapter } from "./QwenAudioAdapter";
import { GeminiAudioAdapter } from "./GeminiAudioAdapter";

export class AudioProviderFactory {
  static create(provider: AudioProvider): IAudioProvider {
    switch (provider) {
      case "openai":
        return new OpenAIAudioAdapter();
      case "elevenlabs":
        return new ElevenLabsAdapter();
      case "qwen":
        return new QwenAudioAdapter();
      case "gemini":
        return new GeminiAudioAdapter();
      default:
        return new OpenAIAudioAdapter();
    }
  }
}
