// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  RiskTolerance,
  AIProvider,
  AIModelTier,
  AIIntent,
  ConsultationDecision,
  ConsultationRisk,
  CircuitState,
  FinancialSnapshot,
  UserProfile,
  ConsultationResult,
  ChatMessage,
  TransactionClassification,
  MonthlySummary,
  AdapterMessage,
  AdapterOptions,
  AdapterResult,
  CircuitBreakerConfig,
  CacheEntry,
  DailyTokenUsage,
} from "./src/types";
export { AI_MODELS, CHATGPT_OAUTH_MODELS } from "./src/types";

// ─── TOON ─────────────────────────────────────────────────────────────────────
export { TOONSerializer } from "./src/toon/TOONSerializer";
export type { ConsultationRequestInput, ClassificationRequestInput } from "./src/toon/TOONSerializer";
export { TOONParser, TOONParseError } from "./src/toon/TOONParser";

// ─── Profile ──────────────────────────────────────────────────────────────────
export { ProfileCalculator } from "./src/profile/ProfileCalculator";

// ─── Analysis ─────────────────────────────────────────────────────────────────
export { FinancialAnalysisEngine } from "./src/analysis/FinancialAnalysisEngine";

// ─── Intent ───────────────────────────────────────────────────────────────────
export { IntentClassifier } from "./src/intent/IntentClassifier";

// ─── Cache ────────────────────────────────────────────────────────────────────
export { CacheService } from "./src/cache/CacheService";

// ─── Circuit Breaker ──────────────────────────────────────────────────────────
export { CircuitBreaker } from "./src/circuit/CircuitBreaker";

// ─── Adapters ─────────────────────────────────────────────────────────────────
export type { AIProviderAdapter } from "./src/adapters/AIProviderAdapter";
export { fetchWithTimeout } from "./src/adapters/AIProviderAdapter";
export { OpenAIAdapter } from "./src/adapters/OpenAIAdapter";
export { GeminiAdapter } from "./src/adapters/GeminiAdapter";
export { ClaudeAdapter } from "./src/adapters/ClaudeAdapter";
export { OpenRouterAdapter } from "./src/adapters/OpenRouterAdapter";
export { ChatGPTOAuthAdapter } from "./src/adapters/ChatGPTOAuthAdapter";

