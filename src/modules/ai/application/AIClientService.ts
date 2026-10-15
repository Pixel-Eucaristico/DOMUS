import * as ExpoCrypto from "expo-crypto";
import { CircuitBreaker, CacheService } from "@packages/ai";
import type { AIProvider, AIModelTier, AdapterMessage } from "@packages/ai";
import { SecureKeyService } from "../infrastructure/SecureKeyService";
import { ConnectivityService } from "../infrastructure/ConnectivityService";
import { TokenTracker } from "./TokenTracker";
import { AIProviderFactory } from "./AIProviderFactory";
import type { BudgetMode } from "../domain/AISettings";
import type { GeminiAudioAttachment } from "@packages/../packages/ai/src/adapters/GeminiAdapter";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientRequestOptions {
  provider: AIProvider;
  modelTier: AIModelTier;
  messages: AdapterMessage[];
  /** Pre-computed SHA256 cache key. If provided, response is cached. */
  cacheKey?: string;
  /** User-defined daily budgets per provider */
  customBudgets?: Partial<Record<AIProvider, number>>;
  /** "daily" or "monthly" budget mode */
  budgetMode?: BudgetMode;
  /** Monthly token budgets per provider */
  monthlyBudgets?: Partial<Record<AIProvider, number>>;
  /** Day of month when billing cycle resets (1-31) */
  billingDay?: number;
  /** Audio attachment for Gemini multimodal voice input */
  audioAttachment?: GeminiAudioAttachment;
}

export interface ClientResult {
  content: string;
  tokensUsed: number;
  fromCache: boolean;
}

// Named error codes for use-case error handling
export type AIClientErrorCode =
  | "OFFLINE"
  | "TOKEN_BUDGET_EXCEEDED"
  | "CIRCUIT_OPEN"
  | "NO_API_KEY"
  | "REQUEST_FAILED";

export class AIClientError extends Error {
  constructor(
    public readonly code: AIClientErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AIClientError";
  }
}

// ─── AIClientService ──────────────────────────────────────────────────────────

export class AIClientService {
  private static readonly breakers = new Map<AIProvider, CircuitBreaker>();

  private static getBreaker(provider: AIProvider): CircuitBreaker {
    if (!AIClientService.breakers.has(provider)) {
      AIClientService.breakers.set(
        provider,
        new CircuitBreaker({
          failureThreshold: 5,
          resetTimeoutMs: 15_000,
          monitorWindowMs: 120_000,
        }),
      );
    }
    return AIClientService.breakers.get(provider)!;
  }

  /**
   * Orchestrates: cache → connectivity → budget → circuit breaker
   * → biometric gate → key decrypt → send (retry once on failure)
   * → record tokens → cache result.
   *
   * Throws `AIClientError` with a code so use-cases can decide how to react.
   * Never logs the API key.
   */
  static async complete(options: ClientRequestOptions): Promise<ClientResult> {
    const { provider, modelTier, messages, cacheKey } = options;

    // 1. Cache hit
    if (cacheKey) {
      const cached = CacheService.get<ClientResult>(cacheKey);
      if (cached) return { ...cached, fromCache: true };
    }

    // 2. Connectivity
    const online = await ConnectivityService.isOnline();
    if (!online) {
      throw new AIClientError("OFFLINE", "Sem conexão à internet");
    }

    // 3. Token budget (per-provider, daily or monthly)
    const overBudget = await TokenTracker.isOverBudget(
      provider,
      options.customBudgets,
      options.budgetMode,
      options.monthlyBudgets,
      options.billingDay,
    );
    if (overBudget) {
      const modeLabel = options.budgetMode === "monthly" ? "mensal" : "diário";
      throw new AIClientError(
        "TOKEN_BUDGET_EXCEEDED",
        `Limite ${modeLabel} de tokens atingido para ${provider}`,
      );
    }

    // 4. Circuit breaker
    const breaker = AIClientService.getBreaker(provider);
    if (!breaker.canAttempt()) {
      throw new AIClientError(
        "CIRCUIT_OPEN",
        `Provedor ${provider} temporariamente indisponível (circuit breaker aberto)`,
      );
    }

    // 5. API key
    const apiKey = await SecureKeyService.retrieveKey(provider);
    if (!apiKey) {
      throw new AIClientError("NO_API_KEY", `Chave de API não encontrada para ${provider}`);
    }

    const adapter = AIProviderFactory.create(provider);
    const modelId = AIProviderFactory.getModelId(provider, modelTier);
    const adapterOptions = {
      model: modelId,
      temperature: 0.2,
      maxTokens: AIClientService.dynamicMaxTokens(messages),
    };

    // 7. Send request (retry once on failure)
    let content = "";
    let tokensUsed = 0;
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await (adapter as any).complete(messages, apiKey, adapterOptions, options.audioAttachment);
        content = result.content;
        tokensUsed = result.tokensUsed;
        breaker.recordSuccess();
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        breaker.recordFailure();
        if (attempt === 0) continue; // retry
      }
    }

    if (lastError !== undefined) {
      throw new AIClientError(
        "REQUEST_FAILED",
        lastError instanceof Error ? lastError.message : "Falha na requisição à IA",
      );
    }

    // 8. Record token usage
    await TokenTracker.record(provider, tokensUsed, options.billingDay);

    const clientResult: ClientResult = {
      content,
      tokensUsed,
      fromCache: false,
    };

    // 9. Cache the response
    if (cacheKey) {
      CacheService.set(cacheKey, clientResult);
    }

    return clientResult;
  }

  /**
   * Computes a SHA256 cache key from the messages array.
   * Uses expo-crypto (Expo layer — not in packages/ai).
   */
  static async computeCacheKey(messages: AdapterMessage[]): Promise<string> {
    return ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(messages),
    );
  }

  /** Estimates a sensible max_tokens based on total input size. */
  private static dynamicMaxTokens(messages: AdapterMessage[]): number {
    const totalChars = messages.reduce((s, m) => s + m.content.length, 0);
    if (totalChars < 500) return 512;
    if (totalChars < 1500) return 1024;
    return 1536;
  }

  /** Resets the circuit breaker for a provider (call after key change). */
  static resetBreaker(provider: AIProvider): void {
    AIClientService.breakers.get(provider)?.reset();
  }
}
