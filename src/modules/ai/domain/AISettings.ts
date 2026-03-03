import type { AIProvider, AIModelTier } from "@packages/ai";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AISettings {
  provider: AIProvider;
  modelTier: AIModelTier;
  /** true when a key is present in SecureStore for the active provider */
  hasApiKey: boolean;
  /** master toggle — user must explicitly enable AI features */
  isEnabled: boolean;
  /**
   * true after the system prompt has been sent once this session.
   *
   * NOTE — Chat history is SESSION-ONLY and STATELESS:
   * - Conversation messages exist only in component/hook state (in-memory).
   * - No message history is persisted to SQLite, SecureStore, or AsyncStorage.
   * - Closing the AI chat screen discards all messages immediately.
   * - `clearHistory()` in useAIConsultant resets the in-memory array to [].
   * - There is no server-side history; each session starts fresh.
   * - This means LGPD "right to erasure" for AI chat is automatically satisfied.
   */
  systemPromptSent: boolean;
}

// ─── Defaults & Keys ─────────────────────────────────────────────────────────

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: "openai",
  modelTier: "fast",
  hasApiKey: false,
  isEnabled: false,
  systemPromptSent: false,
};

/** SecureStore key for the AISettings JSON blob */
export const AI_SETTINGS_STORE_KEY = "domus_ai_settings_v1";

/** SecureStore key prefix for encrypted API keys: {prefix}{provider} */
export const AI_KEY_PREFIX = "domus_ai_key_";

/** Daily token budget — requests are blocked when exceeded */
export const DAILY_TOKEN_BUDGET = 50_000;
