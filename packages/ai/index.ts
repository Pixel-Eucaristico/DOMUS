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
  MonthlyTokenUsage,
  AudioProvider,
  IAudioProvider,
  TextContentPart,
  ImageUrlContentPart,
  MultimodalContent,
} from "./src/types";
export { AI_MODELS } from "./src/types";

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
export { DeepSeekAdapter } from "./src/adapters/DeepSeekAdapter";
export { QwenAdapter } from "./src/adapters/QwenAdapter";

// ─── Audio Adapters ──────────────────────────────────────────────────────────
export { OpenAIAudioAdapter } from "./src/audio/OpenAIAudioAdapter";
export { ElevenLabsAdapter, ELEVENLABS_VOICES } from "./src/audio/ElevenLabsAdapter";
export { QwenAudioAdapter, QWEN_TTS_VOICES } from "./src/audio/QwenAudioAdapter";
export { GeminiAudioAdapter, GEMINI_TTS_VOICES } from "./src/audio/GeminiAudioAdapter";
export { AudioProviderFactory } from "./src/audio/AudioProviderFactory";

// ─── Vision OCR ──────────────────────────────────────────────────────────────
export { VisionOCRService } from "./src/vision/VisionOCRService";
export { InvoiceOCRSchema, PayslipOCRSchema, getOCRSchema } from "./src/vision/ocrSchema";
export type { InvoiceOCRResult, PayslipOCRResult, OCRDocumentType } from "./src/vision/ocrSchema";
