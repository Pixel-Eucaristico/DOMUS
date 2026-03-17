import type { AIProvider, AIModelTier } from "@packages/ai";
import { SecureStorageService } from "@/src/modules/security/infrastructure/SecureStorageService";

// Prices in USD per 1 million tokens (average of input+output)
export const TOKEN_PRICES_USD: Record<AIProvider, Record<AIModelTier, number>> = {
  openai: { fast: 0.40, smart: 4.00 },    // gpt-5-mini / gpt-4.1
  gemini: { fast: 0.15, smart: 2.50 },     // gemini-2.5-flash / gemini-2.5-pro
  claude: { fast: 1.00, smart: 9.00 },     // haiku-4.5 / sonnet-4.6
  deepseek: { fast: 0.35, smart: 0.35 },   // deepseek-chat / deepseek-reasoner (same pricing)
  qwen: { fast: 0.10, smart: 0.39 },       // qwen3.5-flash / qwen3.5-plus
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

type CustomPrices = Partial<Record<AIProvider, Partial<Record<AIModelTier, number>>>>;

let cachedRate: { value: number; timestamp: number } | null = null;
let cachedCustomPrices: CustomPrices | null = null;

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
