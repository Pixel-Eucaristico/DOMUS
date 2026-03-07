import { SecureStorageService } from "@/src/modules/security/infrastructure/SecureStorageService";
import type { AIProvider, DailyTokenUsage, MonthlyTokenUsage } from "@packages/ai";
import {
  getProviderBudget,
  isUnlimitedBudget,
  getBillingCycle,
  getEffectiveDailyBudget,
  isUnlimitedMonthlyBudget,
  getMonthlyBudget,
} from "../domain/AISettings";
import type { BudgetMode } from "../domain/AISettings";

// ─── TokenTracker ─────────────────────────────────────────────────────────────

const TOKEN_STORAGE_KEY = "domus_ai_tokens_v1";
const MONTHLY_STORAGE_KEY = "domus_ai_tokens_monthly_v1";

export class TokenTracker {
  private static cache: DailyTokenUsage | null = null;
  private static monthlyCache: MonthlyTokenUsage | null = null;

  /**
   * Records tokens consumed for a specific provider.
   * Persists both daily and monthly totals.
   */
  static async record(provider: AIProvider, tokens: number, billingDay?: number): Promise<void> {
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

    // Also accumulate monthly
    await TokenTracker.recordMonthly(provider, tokens, billingDay);
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

  /** Returns true when the budget for a provider has been reached or exceeded. */
  static async isOverBudget(
    provider?: AIProvider,
    customBudgets?: Partial<Record<AIProvider, number>>,
    budgetMode?: BudgetMode,
    monthlyBudgets?: Partial<Record<AIProvider, number>>,
    billingDay?: number,
  ): Promise<boolean> {
    if (budgetMode === "monthly") {
      return TokenTracker.isOverMonthlyBudget(provider, monthlyBudgets, billingDay);
    }

    // Daily mode (default)
    const usage = await TokenTracker.getToday();
    if (provider) {
      if (isUnlimitedBudget(provider, customBudgets)) return false;
      const budget = getProviderBudget(provider, customBudgets);
      const used = usage.byProvider[provider] ?? 0;
      return used >= budget;
    }
    return Object.entries(usage.byProvider).some(([p, used]) => {
      if (isUnlimitedBudget(p as AIProvider, customBudgets)) return false;
      const budget = getProviderBudget(p as AIProvider, customBudgets);
      return (used ?? 0) >= budget;
    });
  }

  /** Returns true when monthly budget or today's effective daily allowance is exceeded. */
  static async isOverMonthlyBudget(
    provider?: AIProvider,
    monthlyBudgets?: Partial<Record<AIProvider, number>>,
    billingDay?: number,
  ): Promise<boolean> {
    const monthly = await TokenTracker.getMonthlyUsage(billingDay);
    const daily = await TokenTracker.getToday();

    const checkProvider = (p: AIProvider) => {
      if (isUnlimitedMonthlyBudget(p, monthlyBudgets)) return false;
      const totalBudget = getMonthlyBudget(p, monthlyBudgets);
      const usedCycle = monthly.byProvider[p] ?? 0;
      // Over total monthly budget
      if (usedCycle >= totalBudget) return true;
      // Over today's effective daily allowance
      const dailyAllowance = getEffectiveDailyBudget(p, usedCycle, billingDay, monthlyBudgets);
      const usedToday = daily.byProvider[p] ?? 0;
      return usedToday >= dailyAllowance;
    };

    if (provider) return checkProvider(provider);

    return Object.keys(monthly.byProvider).some((p) => checkProvider(p as AIProvider));
  }

  // ─── Monthly Tracking ───────────────────────────────────────────────────────

  /** Accumulate tokens into the monthly counter. */
  private static async recordMonthly(
    provider: AIProvider,
    tokens: number,
    billingDay?: number,
  ): Promise<void> {
    const current = await TokenTracker.getMonthlyUsage(billingDay);
    const updated: MonthlyTokenUsage = {
      ...current,
      totalTokens: current.totalTokens + tokens,
      byProvider: {
        ...current.byProvider,
        [provider]: (current.byProvider[provider] ?? 0) + tokens,
      },
    };
    TokenTracker.monthlyCache = updated;
    await SecureStorageService.set(
      MONTHLY_STORAGE_KEY,
      JSON.stringify(updated),
    );
  }

  /** Returns current billing cycle usage, loading from storage if needed. */
  static async getMonthlyUsage(billingDay?: number): Promise<MonthlyTokenUsage> {
    const { start, end } = getBillingCycle(billingDay ?? 1);
    const cycleStart = TokenTracker.dateStr(start);
    const cycleEnd = TokenTracker.dateStr(end);

    if (
      TokenTracker.monthlyCache?.cycleStart === cycleStart &&
      TokenTracker.monthlyCache?.cycleEnd === cycleEnd
    ) {
      return TokenTracker.monthlyCache;
    }

    try {
      const raw = await SecureStorageService.get(MONTHLY_STORAGE_KEY);
      if (!raw) return TokenTracker.emptyMonthly(cycleStart, cycleEnd);
      const stored = JSON.parse(raw) as MonthlyTokenUsage;
      // If cycle changed, reset
      if (stored.cycleStart !== cycleStart || stored.cycleEnd !== cycleEnd) {
        return TokenTracker.emptyMonthly(cycleStart, cycleEnd);
      }
      TokenTracker.monthlyCache = stored;
      return stored;
    } catch {
      return TokenTracker.emptyMonthly(cycleStart, cycleEnd);
    }
  }

  /** Resets today's counter (for testing or manual reset). */
  static async resetToday(): Promise<void> {
    TokenTracker.cache = TokenTracker.emptyToday();
    await SecureStorageService.set(
      TOKEN_STORAGE_KEY,
      JSON.stringify(TokenTracker.cache),
    );
  }

  /** Resets the monthly counter (for testing or manual reset). */
  static async resetMonthly(billingDay?: number): Promise<void> {
    const { start, end } = getBillingCycle(billingDay ?? 1);
    TokenTracker.monthlyCache = TokenTracker.emptyMonthly(
      TokenTracker.dateStr(start),
      TokenTracker.dateStr(end),
    );
    await SecureStorageService.set(
      MONTHLY_STORAGE_KEY,
      JSON.stringify(TokenTracker.monthlyCache),
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private static todayStr(): string {
    return TokenTracker.dateStr(new Date());
  }

  private static dateStr(d: Date): string {
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

  private static emptyMonthly(cycleStart: string, cycleEnd: string): MonthlyTokenUsage {
    return {
      cycleStart,
      cycleEnd,
      totalTokens: 0,
      byProvider: {},
    };
  }
}
