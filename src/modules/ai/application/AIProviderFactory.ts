import {
  OpenAIAdapter,
  GeminiAdapter,
  ClaudeAdapter,
  OpenRouterAdapter,
  ChatGPTOAuthAdapter,
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
      case "openrouter":
        return new OpenRouterAdapter();
      default: {
        // Exhaustive check — TypeScript ensures this is unreachable,
        // but at runtime unknown values fall back to OpenAI.
        const _: never = provider;
        void _;
        return new OpenAIAdapter();
      }
    }
  }

  /** Creates the ChatGPT OAuth adapter (uses ChatGPT subscription, not API credits). */
  static createChatGPTOAuth(): AIProviderAdapter {
    return new ChatGPTOAuthAdapter();
  }

  /** Resolves the model ID string for a provider + tier combination. */
  static getModelId(provider: AIProvider, tier: AIModelTier): string {
    return AI_MODELS[provider][tier];
  }
}
