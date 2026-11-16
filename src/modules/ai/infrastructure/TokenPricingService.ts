import type { AIProvider, AIModelTier } from "@packages/ai";
import { SecureStorageService } from "@/src/modules/security/infrastructure/SecureStorageService";
import {
  sanitizeCustomPrices,
  type CustomPrices,
} from "@/src/modules/ai/domain/syncedAISettings";

// Prices in USD per 1 million tokens (average of input+output)
// Atualizado em 2026-07-15 conforme as tabelas oficiais dos provedores.
export const TOKEN_PRICES_USD: Record<AIProvider, Record<AIModelTier, number>> = {
  openai: { fast: 3.50, smart: 8.75 },     // gpt-5.6-luna ($1/$6) / gpt-5.6-terra ($2.5/$15)
  gemini: { fast: 0.90, smart: 5.25 },     // gemini-3.1-flash-lite ($0.25/$1.50) / gemini-3.5-flash ($1.50/$9)
  claude: { fast: 3.00, smart: 9.00 },     // claude-haiku-4-5 ($1/$5) / claude-sonnet-5 ($3/$15)
  deepseek: { fast: 0.21, smart: 0.65 },   // deepseek-v4-flash ($0.14/$0.28) / deepseek-v4-pro ($0.435/$0.87)
  qwen: { fast: 0.10, smart: 0.39 },       // qwen-turbo-latest / qwen-plus-latest
};

const CUSTOM_PRICES_KEY = "domus_ai_custom_prices";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FALLBACK_USD_BRL = 5.50;

export interface CostEstimate {
  costUsd: number;
  costBrl: number;
}

export interface TokenPrice {
  usdPerMillion: number;
  brlPerMillion: number;
}

export type { CustomPrices };

let cachedRate: { value: number; timestamp: number } | null = null;
let cachedCustomPrices: CustomPrices | null = null;
let cachedCustomPricesPersisted = false;
const customPricesSyncListeners = new Set<(prices: CustomPrices) => void>();

function cloneCustomPrices(prices: CustomPrices): CustomPrices {
  const copy: CustomPrices = {};
  for (const [provider, tiers] of Object.entries(prices) as [
    AIProvider,
    Partial<Record<AIModelTier, number>> | undefined,
  ][]) {
    if (tiers && Object.keys(tiers).length > 0) {
      copy[provider] = { ...tiers };
    }
  }
  return copy;
}

function areCustomPricesEqual(a: CustomPrices | null, b: CustomPrices): boolean {
  if (!a) return false;
  const keysA = Object.keys(a) as AIProvider[];
  const keysB = Object.keys(b) as AIProvider[];
  if (keysA.length !== keysB.length) return false;
  for (const provider of keysA) {
    const tiersA = a[provider];
    const tiersB = b[provider];
    if (!tiersA || !tiersB) return false;
    const tierKeysA = Object.keys(tiersA) as AIModelTier[];
    const tierKeysB = Object.keys(tiersB) as AIModelTier[];
    if (tierKeysA.length !== tierKeysB.length) return false;
    for (const tier of tierKeysA) {
      if (tiersA[tier] !== tiersB[tier]) return false;
    }
  }
  return true;
}

/** Creates an AbortSignal with timeout, compatible with Hermes/RN */
function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  return controller.signal;
}

export class TokenPricingService {
  /** Fetches USD→BRL rate with 3 API fallbacks. Caches for 30 min. */
  static async getUsdToBrl(): Promise<number> {
    if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_TTL_MS) {
      return cachedRate.value;
    }

    const rate =
      (await TokenPricingService.fetchAwesomeApi()) ??
      (await TokenPricingService.fetchDolarApi()) ??
      (await TokenPricingService.fetchExchangeRateApi()) ??
      FALLBACK_USD_BRL;

    cachedRate = { value: rate, timestamp: Date.now() };
    return rate;
  }

  /** AwesomeAPI: economia.awesomeapi.com.br */
  private static async fetchAwesomeApi(): Promise<number | null> {
    try {
      const resp = await fetch(
        "https://economia.awesomeapi.com.br/json/last/USD-BRL",
        { signal: timeoutSignal(5000) },
      );
      const data = (await resp.json()) as { USDBRL?: { bid?: string } };
      const rate = parseFloat(data.USDBRL?.bid ?? "");
      return isNaN(rate) || rate <= 0 ? null : rate;
    } catch {
      return null;
    }
  }

  /** DolarAPI Brasil: br.dolarapi.com */
  private static async fetchDolarApi(): Promise<number | null> {
    try {
      const resp = await fetch(
        "https://br.dolarapi.com/v1/cotacoes/usd",
        { signal: timeoutSignal(5000) },
      );
      const data = (await resp.json()) as { compra?: number; venda?: number };
      const rate = data.venda ?? data.compra;
      return rate && rate > 0 ? rate : null;
    } catch {
      return null;
    }
  }

  /** ExchangeRate-API (free, no key): open.er-api.com */
  private static async fetchExchangeRateApi(): Promise<number | null> {
    try {
      const resp = await fetch(
        "https://open.er-api.com/v6/latest/USD",
        { signal: timeoutSignal(5000) },
      );
      const data = (await resp.json()) as { rates?: { BRL?: number } };
      const rate = data.rates?.BRL;
      return rate && rate > 0 ? rate : null;
    } catch {
      return null;
    }
  }

  /** Estimates cost for a given number of tokens. */
  static async estimateCost(
    provider: AIProvider,
    tier: AIModelTier,
    tokens: number,
  ): Promise<CostEstimate> {
    const price = await TokenPricingService.getTokenPrice(provider, tier);
    const costUsd = (tokens / 1_000_000) * price.usdPerMillion;
    const costBrl = (tokens / 1_000_000) * price.brlPerMillion;
    return { costUsd, costBrl };
  }

  /** TTS cost per character in USD, by audio provider */
  private static readonly TTS_COST_PER_CHAR_USD: Record<string, number> = {
    elevenlabs: 0.000167,  // Starter: $5 / 30k chars
    openai: 0.000015,      // ~$15 / 1M chars
    gemini: 0.000004,      // very cheap
    qwen: 0.000010,        // similar to openai
  };

  /** Estimates TTS cost for a given number of characters. */
  static async estimateTTSCost(
    audioProvider: string,
    characters: number,
  ): Promise<CostEstimate> {
    const costPerChar = TokenPricingService.TTS_COST_PER_CHAR_USD[audioProvider] ?? 0.000015;
    const exchangeRate = await TokenPricingService.getUsdToBrl();
    const costUsd = characters * costPerChar;
    const costBrl = costUsd * exchangeRate;
    return { costUsd, costBrl };
  }

  /** Returns price per 1M tokens, respecting custom overrides. */
  static async getTokenPrice(
    provider: AIProvider,
    tier: AIModelTier,
  ): Promise<TokenPrice> {
    const custom = await TokenPricingService.loadCustomPrices();
    const customBrl = custom[provider]?.[tier];

    const exchangeRate = await TokenPricingService.getUsdToBrl();

    if (customBrl !== undefined && customBrl > 0) {
      return {
        usdPerMillion: customBrl / exchangeRate,
        brlPerMillion: customBrl,
      };
    }

    const usdPerMillion = TOKEN_PRICES_USD[provider][tier];
    return {
      usdPerMillion,
      brlPerMillion: usdPerMillion * exchangeRate,
    };
  }

  /** Saves a user-defined price (BRL per 1M tokens). Pass 0 to remove override. */
  static async setCustomPrice(
    provider: AIProvider,
    tier: AIModelTier,
    pricePerMillionBrl: number,
  ): Promise<void> {
    const prices = cloneCustomPrices(await TokenPricingService.loadCustomPrices());
    if (pricePerMillionBrl > 0 && Number.isFinite(pricePerMillionBrl)) {
      if (!prices[provider]) prices[provider] = {};
      prices[provider]![tier] = pricePerMillionBrl;
    } else if (prices[provider]) {
      delete prices[provider]![tier];
      if (Object.keys(prices[provider]!).length === 0) {
        delete prices[provider];
      }
    }
    cachedCustomPrices = prices;
    cachedCustomPricesPersisted = true;
    await SecureStorageService.set(CUSTOM_PRICES_KEY, JSON.stringify(prices));
    const snapshot = cloneCustomPrices(prices);
    customPricesSyncListeners.forEach((listener) => listener(snapshot));
  }

  /** Registra ouvinte para emitir `SETTING_CHANGED` quando o usuário altera preços locais. */
  static registerCustomPricesSyncListener(
    listener: (prices: CustomPrices) => void,
  ): () => void {
    customPricesSyncListeners.add(listener);
    return () => {
      customPricesSyncListeners.delete(listener);
    };
  }

  /** Retorna um snapshot sanitizado dos preços personalizados atuais. */
  static async getCustomPricesSnapshot(): Promise<CustomPrices> {
    const prices = await TokenPricingService.loadCustomPrices();
    return sanitizeCustomPrices(prices) ?? {};
  }

  /**
   * Aplica preços personalizados vindos do log de eventos sincronizado.
   * Só atualiza cache e armazenamento quando houver mudança real, sem disparar
   * o ouvinte de emissão de eventos (evita loops).
   */
  static async applySyncedCustomPrices(
    prices: CustomPrices,
    persist: boolean = true,
  ): Promise<void> {
    const sanitized = sanitizeCustomPrices(prices) ?? {};
    if (
      areCustomPricesEqual(cachedCustomPrices, sanitized) &&
      (!persist || cachedCustomPricesPersisted)
    ) {
      return;
    }
    cachedCustomPrices = cloneCustomPrices(sanitized);
    if (!persist) {
      cachedCustomPricesPersisted = false;
      return;
    }
    cachedCustomPricesPersisted = true;
    await SecureStorageService.set(CUSTOM_PRICES_KEY, JSON.stringify(sanitized));
  }

  /** Invalida o cache em memória para forçar releitura do armazenamento local (ex.: ao sair do modo demo). */
  static invalidateCustomPricesCache(): void {
    cachedCustomPrices = null;
    cachedCustomPricesPersisted = false;
  }

  /** Limpa os preços personalizados locais no reset do app sem emitir evento. */
  static async resetLocalCustomPrices(): Promise<void> {
    cachedCustomPrices = {};
    cachedCustomPricesPersisted = true;
    await SecureStorageService.delete(CUSTOM_PRICES_KEY);
  }

  /** Loads custom prices from storage (cached in memory). */
  private static async loadCustomPrices(): Promise<CustomPrices> {
    if (cachedCustomPrices) return cachedCustomPrices;
    try {
      const raw = await SecureStorageService.get(CUSTOM_PRICES_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : {};
      cachedCustomPrices = sanitizeCustomPrices(parsed) ?? {};
      return cachedCustomPrices;
    } catch {
      return {};
    }
  }
}
