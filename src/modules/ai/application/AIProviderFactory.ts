import {
  OpenAIAdapter,
  GeminiAdapter,
  ClaudeAdapter,
  DeepSeekAdapter,
  QwenAdapter,
  AI_MODELS,
} from "@packages/ai";
import type { AIProviderAdapter, AIProvider, AIModelTier } from "@packages/ai";

// ─── AIProviderFactory ────────────────────────────────────────────────────────

export class AIProviderFactory {
  /** Creates the concrete adapter for the given provider. */
  static create(provider: AIProvider): AIProviderAdapter {
    switch (provider) {
      case "openai":
        return new OpenAIAdapter();
      case "gemini":
        return new GeminiAdapter();
      case "claude":
        return new ClaudeAdapter();
      case "deepseek":
        return new DeepSeekAdapter();
      case "qwen":
        return new QwenAdapter();
      default: {
        // Exhaustive check — TypeScript ensures this is unreachable,
        // but at runtime unknown values fall back to OpenAI.
        const _: never = provider;
        void _;
        return new OpenAIAdapter();
      }
    }
  }

  /** Resolves the model ID string for a provider + tier combination. */
  static getModelId(provider: AIProvider, tier: AIModelTier): string {
    return AI_MODELS[provider][tier];
  }
}
