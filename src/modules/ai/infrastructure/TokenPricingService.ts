import type { AIProvider, AIModelTier } from "@packages/ai";
import { SecureStorageService } from "@/src/modules/security/infrastructure/SecureStorageService";

// Prices in USD per 1 million tokens (average of input+output)
export const TOKEN_PRICES_USD: Record<AIProvider, Record<AIModelTier, number>> = {
  openai: { fast: 0.40, smart: 4.00 },    // gpt-5-mini / gpt-4.1
  gemini: { fast: 0.15, smart: 2.50 },     // gemini-2.5-flash / gemini-2.5-pro
  claude: { fast: 1.00, smart: 9.00 },     // haiku-4.5 / sonnet-4.6
  openrouter: { fast: 0.15, smart: 3.00 }, // varies by model
};

const CUSTOM_PRICES_KEY = "domus_ai_custom_prices";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_USD_BRL = 5.50;

export interface CostEstimate {
  costUsd: number;
  costBrl: number;
}

export interface TokenPrice {
  usdPerMillion: number;
  brlPerMillion: number;
}

type CustomPrices = Partial<Record<AIProvider, Partial<Record<AIModelTier, number>>>>;

let cachedRate: { value: number; timestamp: number } | null = null;
let cachedCustomPrices: CustomPrices | null = null;

export class TokenPricingService {
  /** Fetches USD→BRL rate. Caches for 1 hour. Falls back to 5.50. */
  static async getUsdToBrl(): Promise<number> {
    if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_TTL_MS) {
      return cachedRate.value;
    }
    try {
      const resp = await fetch(
        "https://economia.awesomeapi.com.br/json/last/USD-BRL",
      );
      const data = (await resp.json()) as { USDBRL?: { bid?: string } };
      const rate = parseFloat(data.USDBRL?.bid ?? "");
      if (isNaN(rate) || rate <= 0) throw new Error("Invalid rate");
      cachedRate = { value: rate, timestamp: Date.now() };
      return rate;
    } catch {
      cachedRate = { value: FALLBACK_USD_BRL, timestamp: Date.now() };
      return FALLBACK_USD_BRL;
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
    const prices = await TokenPricingService.loadCustomPrices();
    if (!prices[provider]) prices[provider] = {};
    if (pricePerMillionBrl > 0) {
      prices[provider]![tier] = pricePerMillionBrl;
    } else {
      delete prices[provider]![tier];
    }
    cachedCustomPrices = prices;
    await SecureStorageService.set(CUSTOM_PRICES_KEY, JSON.stringify(prices));
  }

  /** Loads custom prices from storage (cached in memory). */
  private static async loadCustomPrices(): Promise<CustomPrices> {
    if (cachedCustomPrices) return cachedCustomPrices;
    try {
      const raw = await SecureStorageService.get(CUSTOM_PRICES_KEY);
      cachedCustomPrices = raw ? (JSON.parse(raw) as CustomPrices) : {};
      return cachedCustomPrices;
    } catch {
      return {};
    }
  }
}
