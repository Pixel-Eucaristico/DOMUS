import type {
  TransactionPayload,
  AccountPayload,
  CategoryPayload,
} from "../../../events/src/types";
import type { UserProfile, FinancialSnapshot, RiskTolerance } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Number of months to look back for profile computation */
const PROFILE_WINDOW_MONTHS = 3;

/** Max amount (BRL) to classify a transaction as "impulse" purchase */
const IMPULSE_AMOUNT_THRESHOLD = 150;

// ─── ProfileCalculator ────────────────────────────────────────────────────────

export class ProfileCalculator {
  /**
   * Computes a UserProfile from the last N months of transactions.
   * AI never calls or overrides this.
   */
  static compute(
    transactions: TransactionPayload[],
    accounts: AccountPayload[],
    referenceDate?: Date,
  ): UserProfile {
    const ref = referenceDate ?? new Date();
    const window = ProfileCalculator.filterWindow(transactions, ref, PROFILE_WINDOW_MONTHS);

    const expenses = window.filter(
      (t) => t.type === "expense" && t.status !== "pending",
    );

    const savingsRateAverage = ProfileCalculator.calcAvgSavingsRate(window, ref);
    const volatilityScore = ProfileCalculator.calcVolatility(expenses, ref);
    const impulseScore = ProfileCalculator.calcImpulseScore(expenses);
    const consistencyScore = ProfileCalculator.calcConsistency(window, ref);
    const riskTolerance = ProfileCalculator.deriveRiskTolerance(
      volatilityScore,
      impulseScore,
      savingsRateAverage,
    );

    return {
      savingsRateAverage,
      volatilityScore,
      impulseScore,
      consistencyScore,
      riskTolerance,
    };
  }

  /**
   * Builds a FinancialSnapshot safe to send to AI (no PII).
   * Aggregates categories by name, computes spending trend.
   */
  static buildSnapshot(
    transactions: TransactionPayload[],
    accounts: AccountPayload[],
    categories: Record<string, CategoryPayload>,
    referenceDate?: Date,
  ): FinancialSnapshot {
    const ref = referenceDate ?? new Date();
    const currentMonth = ProfileCalculator.monthKey(ref);
    const prevDate = new Date(ref);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonth = ProfileCalculator.monthKey(prevDate);

    const currentTxs = transactions.filter(
      (t) => t.type === "expense" && t.status !== "pending" && t.date?.startsWith(currentMonth),
    );
    const prevTxs = transactions.filter(
      (t) => t.type === "expense" && t.status !== "pending" && t.date?.startsWith(prevMonth),
    );

    const incomeTxs = transactions.filter(
      (t) => t.type === "income" && t.status !== "pending" && t.date?.startsWith(currentMonth),
    );

    const monthlyIncome = incomeTxs.reduce((s, t) => s + t.amount, 0);
    const monthlyExpenses = currentTxs.reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevTxs.reduce((s, t) => s + t.amount, 0);

    const savingsRate =
      monthlyIncome > 0
        ? Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
        : 0;

    const totalBalance = accounts
      .filter((a) => a.type !== "credit_card")
      .reduce((s, a) => s + a.balance, 0);

    const spendingTrend = ProfileCalculator.computeTrend(prevExpenses, monthlyExpenses);
    const topCategories = ProfileCalculator.buildTopCategories(currentTxs, categories);
    const profile = ProfileCalculator.compute(transactions, accounts, ref);

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      savingsRate,
      topCategories,
      spendingTrend,
      riskProfile: profile.riskTolerance,
      volatilityScore: profile.volatilityScore,
      impulseScore: profile.impulseScore,
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private static filterWindow(
    transactions: TransactionPayload[],
    ref: Date,
    months: number,
  ): TransactionPayload[] {
    const cutoff = new Date(ref);
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().split("T")[0]!;
    return transactions.filter((t) => t.date >= cutoffStr);
  }

  private static calcAvgSavingsRate(
    transactions: TransactionPayload[],
    ref: Date,
  ): number {
    const rates: number[] = [];

    for (let offset = 0; offset < PROFILE_WINDOW_MONTHS; offset++) {
      const d = new Date(ref);
      d.setMonth(d.getMonth() - offset);
      const key = ProfileCalculator.monthKey(d);

      const income = transactions
        .filter(
          (t) =>
            t.type === "income" &&
            t.status !== "pending" &&
            t.date?.startsWith(key),
        )
        .reduce((s, t) => s + t.amount, 0);

      const expenses = transactions
        .filter(
          (t) =>
            t.type === "expense" &&
            t.status !== "pending" &&
            t.date?.startsWith(key),
        )
        .reduce((s, t) => s + t.amount, 0);

      if (income > 0) {
        rates.push(Math.max(0, ((income - expenses) / income) * 100));
      }
    }

    if (rates.length === 0) return 0;
    return rates.reduce((s, r) => s + r, 0) / rates.length;
  }

  /**
   * Coefficient of variation of weekly spending × 100.
   * 0 = perfectly stable, 100 = very erratic.
   */
  private static calcVolatility(
    expenses: TransactionPayload[],
    ref: Date,
  ): number {
    if (expenses.length === 0) return 0;

    // Group into ISO weeks
    const byWeek = new Map<string, number>();
    for (const tx of expenses) {
      const weekKey = ProfileCalculator.weekKey(tx.date);
      byWeek.set(weekKey, (byWeek.get(weekKey) ?? 0) + tx.amount);
    }

    const values = Array.from(byWeek.values());
    if (values.length < 2) return 0;

    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    if (mean === 0) return 0;

    const variance =
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const cv = Math.sqrt(variance) / mean;

    return Math.min(100, Math.round(cv * 100));
  }

  /**
   * Impulse score: % of expense transactions ≤ IMPULSE_AMOUNT_THRESHOLD
   * (small, likely impulsive purchases) × 100.
   */
  private static calcImpulseScore(expenses: TransactionPayload[]): number {
    if (expenses.length === 0) return 0;
    const impulsive = expenses.filter(
      (t) => t.amount <= IMPULSE_AMOUNT_THRESHOLD,
    ).length;
    return Math.round((impulsive / expenses.length) * 100);
  }

  /**
   * Consistency score: % of months in the window that have ≥1 confirmed income.
   */
  private static calcConsistency(
    transactions: TransactionPayload[],
    ref: Date,
  ): number {
    let hit = 0;
    for (let offset = 0; offset < PROFILE_WINDOW_MONTHS; offset++) {
      const d = new Date(ref);
      d.setMonth(d.getMonth() - offset);
      const key = ProfileCalculator.monthKey(d);
      const hasIncome = transactions.some(
        (t) =>
          t.type === "income" &&
          t.status !== "pending" &&
          t.date?.startsWith(key),
      );
      if (hasIncome) hit++;
    }
    return Math.round((hit / PROFILE_WINDOW_MONTHS) * 100);
  }

  private static deriveRiskTolerance(
    volatility: number,
    impulse: number,
    savingsRate: number,
  ): RiskTolerance {
    if (volatility > 60 || impulse > 60) return "Conservative";
    if (volatility < 20 && impulse < 20 && savingsRate > 25) return "Aggressive";
    return "Moderate";
  }

  private static computeTrend(prev: number, current: number): string {
    if (prev === 0) return "+0%";
    const pct = ((current - prev) / prev) * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${Math.round(pct)}%`;
  }

  private static buildTopCategories(
    expenses: TransactionPayload[],
    categories: Record<string, CategoryPayload>,
  ): Array<{ category: string; amount: number; percentage: number }> {
    const byName = new Map<string, number>();
    const total = expenses.reduce((s, t) => s + t.amount, 0);

    for (const tx of expenses) {
      const cat = categories[tx.categoryId];
      const name = cat?.name ?? "Outros";
      byName.set(name, (byName.get(name) ?? 0) + tx.amount);
    }

    return Array.from(byName.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }));
  }

  private static monthKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  private static weekKey(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
    const thursday = new Date(date);
    thursday.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const firstThursday = new Date(thursday.getFullYear(), 0, 4);
    const weekNum =
      1 +
      Math.round(
        (thursday.getTime() - firstThursday.getTime()) / 604_800_000,
      );
    return `${thursday.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  }
}
