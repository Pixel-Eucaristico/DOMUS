import { SecureStorageService } from "@/src/modules/security/infrastructure/SecureStorageService";
import type { AIProvider, DailyTokenUsage } from "@packages/ai";
import { getProviderBudget } from "../domain/AISettings";

// ─── TokenTracker ─────────────────────────────────────────────────────────────

const TOKEN_STORAGE_KEY = "domus_ai_tokens_v1";

export class TokenTracker {
  private static cache: DailyTokenUsage | null = null;

  /**
   * Records tokens consumed for a specific provider.
   * Persists the daily total to SecureStore.
   */
  static async record(provider: AIProvider, tokens: number): Promise<void> {
    const today = TokenTracker.todayStr();
    const current = await TokenTracker.getToday();

    const updated: DailyTokenUsage = {
      date: today,
      totalTokens: current.totalTokens + tokens,
      byProvider: {
        ...current.byProvider,
        [provider]: (current.byProvider[provider] ?? 0) + tokens,
      },
    };

    TokenTracker.cache = updated;
    await SecureStorageService.set(
      TOKEN_STORAGE_KEY,
      JSON.stringify(updated),
    );
  }

  /** Returns today's usage, loading from storage if needed. */
  static async getToday(): Promise<DailyTokenUsage> {
    const today = TokenTracker.todayStr();

    if (TokenTracker.cache?.date === today) {
      return TokenTracker.cache;
    }

    try {
      const raw = await SecureStorageService.get(TOKEN_STORAGE_KEY);
      if (!raw) return TokenTracker.emptyToday();
      const stored = JSON.parse(raw) as DailyTokenUsage;
      if (stored.date !== today) return TokenTracker.emptyToday();
      TokenTracker.cache = stored;
      return stored;
    } catch {
      return TokenTracker.emptyToday();
    }
  }

  /** Returns true when the daily budget for a provider has been reached or exceeded. */
  static async isOverBudget(provider?: AIProvider): Promise<boolean> {
    const usage = await TokenTracker.getToday();
    if (provider) {
      const budget = getProviderBudget(provider);
      const used = usage.byProvider[provider] ?? 0;
      return used >= budget;
    }
    // Fallback: check total across all providers
    return Object.entries(usage.byProvider).some(([p, used]) => {
      const budget = getProviderBudget(p as AIProvider);
      return (used ?? 0) >= budget;
    });
  }

  /** Resets today's counter (for testing or manual reset). */
  static async resetToday(): Promise<void> {
    TokenTracker.cache = TokenTracker.emptyToday();
    await SecureStorageService.set(
      TOKEN_STORAGE_KEY,
      JSON.stringify(TokenTracker.cache),
    );
  }

  private static todayStr(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  private static emptyToday(): DailyTokenUsage {
    return {
      date: TokenTracker.todayStr(),
      totalTokens: 0,
      byProvider: {},
    };
  }
}
