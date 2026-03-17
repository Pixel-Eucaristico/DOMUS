// ─── Literals ────────────────────────────────────────────────────────────────

export type RiskTolerance = "Conservative" | "Moderate" | "Aggressive";

export type AIProvider = "openai" | "gemini" | "claude" | "deepseek" | "qwen";

export type AIModelTier = "fast" | "smart";

export type AIIntent =
  | "classify_transaction"
  | "monthly_summary"
  | "purchase_advice"
  | "unknown";

export type ConsultationDecision = "Buy" | "Delay" | "Avoid";

export type ConsultationRisk = "Low" | "Medium" | "High";

export type CircuitState = "closed" | "open" | "half_open";

// ─── Model Registry ───────────────────────────────────────────────────────────

export const AI_MODELS: Record<AIProvider, Record<AIModelTier, string>> = {
  openai: {
    fast: "gpt-5-mini",
    smart: "gpt-5.4",
  },
  gemini: {
    fast: "gemini-2.5-flash",
    smart: "gemini-2.5-pro",
  },
  claude: {
    fast: "claude-haiku-4-5-20251001",
    smart: "claude-sonnet-4-6",
  },
  deepseek: {
    fast: "deepseek-chat",
    smart: "deepseek-reasoner",
  },
  qwen: {
    fast: "qwen-turbo-latest",
    smart: "qwen-plus-latest",
  },
} as const;

/** Gemini TTS model options */
export const GEMINI_TTS_MODELS = {
  fast: "gemini-2.5-flash-preview-tts",
  quality: "gemini-2.5-pro-preview-tts",
} as const;

/**
 * Models available on the ChatGPT backend (chatgpt.com/backend-api/codex).
 * These are different from the standard API models and are required when
 * using ChatGPT OAuth (subscription-based access).
 * Source: Codex CLI bundled models.json catalog.
 */
export const CHATGPT_OAUTH_MODELS: Record<AIModelTier, string> = {
  fast: "gpt-5.1-codex-mini",
  smart: "gpt-5.4",
} as const;

// ─── Domain Shapes ────────────────────────────────────────────────────────────

export interface FinancialSnapshot {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  /** e.g. "+12%" or "-5%" */
  spendingTrend: string;
  riskProfile: RiskTolerance;
  /** 0–100 */
  volatilityScore: number;
  /** 0–100 */
  impulseScore: number;
}

export interface UserProfile {
  /** percentage 0–100 */
  savingsRateAverage: number;
  /** 0–100 */
  volatilityScore: number;
  /** 0–100 */
  impulseScore: number;
  /** 0–100 */
  consistencyScore: number;
  riskTolerance: RiskTolerance;
}

export interface ConsultationResult {
  decision: ConsultationDecision;
  risk: ConsultationRisk;
  recommendation: string;
  behaviorInsight: string;
  /** 0.0–1.0 */
  confidence: number;
  isLocalFallback: boolean;
  tokensUsed: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  tokensUsed?: number;
  isLocalFallback?: boolean;
  /** Provider that generated this message (for showing correct icon in history) */
  provider?: AIProvider;
}

export interface TransactionClassification {
  transactionId: string;
  suggestedCategoryId: string;
  /** 0.0–1.0 */
  confidence: number;
  isLocalFallback: boolean;
}

export interface MonthlySummary {
  /** "YYYY-MM" */
  month: string;
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
  topExpenseCategories: Array<{ name: string; amount: number }>;
  /** 0–100 */
  budgetAdherence: number;
  insights: string[];
  isLocalFallback: boolean;
}

// ─── Adapter Contract ─────────────────────────────────────────────────────────

// ─── Multimodal Content ──────────────────────────────────────────────────────

export interface TextContentPart {
  type: "text";
  text: string;
}

export interface ImageUrlContentPart {
  type: "image_url";
  image_url: { url: string };
}

export type MultimodalContent = Array<TextContentPart | ImageUrlContentPart>;

// ─── Audio Provider ──────────────────────────────────────────────────────────

export type AudioProvider = "openai" | "elevenlabs" | "gemini";

export interface IAudioProvider {
  /** Synthesize text to audio, returns base64-encoded audio */
  synthesize(
    text: string,
    apiKey: string,
    voice: string,
  ): Promise<{ base64: string; format: "mp3" }>;
}

// ─── Adapter Contract ────────────────────────────────────────────────────────

export interface AdapterMessage {
  role: "user" | "assistant" | "system";
  content: string;
  /** Multimodal content for vision requests (overrides string content when present) */
  multimodal?: MultimodalContent;
  /** Base64 image for vision OCR (provider-agnostic, adapters convert to their format) */
  imageBase64?: string;
  imageMimeType?: string;
}

export interface AdapterOptions {
  model?: string;
  /** default: 0.2 */
  temperature?: number;
  /** default: 512 */
  maxTokens?: number;
}

export interface AdapterResult {
  content: string;
  tokensUsed: number;
}

// ─── Circuit Breaker ──────────────────────────────────────────────────────────

export interface CircuitBreakerConfig {
  /** default: 3 */
  failureThreshold: number;
  /** ms — default: 30_000 */
  resetTimeoutMs: number;
  /** ms window in which failures are counted — default: 60_000 */
  monitorWindowMs: number;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// ─── Token Tracking ───────────────────────────────────────────────────────────

export interface DailyTokenUsage {
  /** "YYYY-MM-DD" */
  date: string;
  totalTokens: number;
  byProvider: Partial<Record<AIProvider, number>>;
  /** TTS characters used today, keyed by audio provider name */
  ttsCharsByProvider?: Record<string, number>;
}

export interface MonthlyTokenUsage {
  /** Billing cycle identifier: "YYYY-MM-DD" of cycle start */
  cycleStart: string;
  /** "YYYY-MM-DD" of cycle end (exclusive) */
  cycleEnd: string;
  totalTokens: number;
  byProvider: Partial<Record<AIProvider, number>>;
}

// ─── AI Client Result ─────────────────────────────────────────────────────────

export interface AIClientResult {
  content: string;
  tokensUsed: number;
  fromCache: boolean;
  isLocalFallback: boolean;
}

// ─── TOON ─────────────────────────────────────────────────────────────────────

export class TOONParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TOONParseError";
  }
}
