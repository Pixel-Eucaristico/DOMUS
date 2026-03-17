import { calculate503020 } from "../../../domain/src/transactions";
import type { AppState } from "../../../domain/src/state";
import type { BudgetBreakdown } from "../../../domain/src/transactions";
import type { GamificationState } from "../types";
import { ALL_ACHIEVEMENTS, MONTHLY_TROPHIES } from "./achievementData";
import type { Achievement, MonthlyTrophy } from "./achievementData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns how many consecutive months (going back from last month) satisfy checkFn.
 * Stops at the first month that fails or has no income.
 */
export function getConsecutiveMonthsCompliant(
  domain: AppState,
  checkFn: (b: BudgetBreakdown) => boolean,
): number {
  const now = new Date();
  let count = 0;
  for (let i = 1; i <= 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const b = calculate503020(
      Object.values(domain.transactions),
      domain.categories,
      d.getMonth(),
      d.getFullYear(),
    );
    if (b.totalIncome === 0) break;
    if (!checkFn(b)) break;
    count++;
  }
  return count;
}

function isUnlocked(
  id: string,
  domain: AppState,
  gamification: GamificationState,
  budget: BudgetBreakdown,
): boolean {
  const txList = Object.values(domain.transactions);

  switch (id) {
    // ── Original 8 ────────────────────────────────────────────────────────
    case "first_transaction":
      return txList.length >= 1;

    case "ten_transactions":
      return txList.length >= 10;

    case "first_dizimo":
      return txList.some((tx) => tx.categoryId === "dizimo");

    case "streak_7":
      return gamification.currentStreak >= 7 || gamification.longestStreak >= 7;

    case "streak_30":
      return gamification.currentStreak >= 30 || gamification.longestStreak >= 30;

    case "budget_ok":
      return (
        budget.totalIncome > 0 &&
        budget.needsPercent <= 50 &&
        budget.wantsPercent <= 30
      );

    case "level_5":
      return gamification.level >= 5;

    case "level_10":
      return gamification.level >= 10;

    // ── Grupo A — Transações ──────────────────────────────────────────────
    case "tx_50":  return txList.length >= 50;
    case "tx_100": return txList.length >= 100;
    case "tx_500": return txList.length >= 500;

    // ── Grupo B — Streak ──────────────────────────────────────────────────
    case "streak_3":
      return gamification.currentStreak >= 3 || gamification.longestStreak >= 3;
    case "streak_14":
      return gamification.currentStreak >= 14 || gamification.longestStreak >= 14;
    case "streak_90":
      return gamification.currentStreak >= 90 || gamification.longestStreak >= 90;
    case "streak_365":
      return gamification.currentStreak >= 365 || gamification.longestStreak >= 365;

    // ── Grupo C — 50/30/20 por meses ─────────────────────────────────────
    case "budget_3mo":
      return getConsecutiveMonthsCompliant(
        domain,
        (b) => b.needsPercent <= 50 && b.wantsPercent <= 30 && b.totalIncome > 0,
      ) >= 3;
    case "budget_6mo":
      return getConsecutiveMonthsCompliant(
        domain,
        (b) => b.needsPercent <= 50 && b.wantsPercent <= 30 && b.totalIncome > 0,
      ) >= 6;
    case "budget_12mo":
      return getConsecutiveMonthsCompliant(
        domain,
        (b) => b.needsPercent <= 50 && b.wantsPercent <= 30 && b.totalIncome > 0,
      ) >= 12;

    // ── Grupo D — Poupança ────────────────────────────────────────────────
    case "savings_1mo":
      return budget.savingsPercent >= 20 && budget.totalIncome > 0;
    case "savings_3mo":
      return getConsecutiveMonthsCompliant(
        domain,
        (b) => b.savingsPercent >= 20 && b.totalIncome > 0,
      ) >= 3;
    case "savings_elite":
      return (
        (budget.savingsPercent >= 30 && budget.totalIncome > 0) ||
        getConsecutiveMonthsCompliant(
          domain,
          (b) => b.savingsPercent >= 30 && b.totalIncome > 0,
        ) >= 1
      );

    // ── Grupo E — Desejos ─────────────────────────────────────────────────
    case "wants_1mo":
      return budget.wantsPercent <= 30 && budget.totalIncome > 0;
    case "wants_3mo":
      return getConsecutiveMonthsCompliant(
        domain,
        (b) => b.wantsPercent <= 30 && b.totalIncome > 0,
      ) >= 3;

    // ── Grupo F — Nível ───────────────────────────────────────────────────
    case "level_20": return gamification.level >= 20;
    case "level_50": return gamification.level >= 50;

    // ── Grupo G — Uso completo ────────────────────────────────────────────
    case "first_income":
      return txList.some((tx) => tx.type === "income");

    case "five_categories_month": {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const cats = new Set(
        txList
          .filter((tx) => tx.date?.startsWith(ym) && tx.categoryId)
          .map((tx) => tx.categoryId as string),
      );
      return cats.size >= 5;
    }

    case "positive_balance": {
      const accounts = (domain as any).accounts ?? {};
      const totalBal = Object.values(accounts).reduce(
        (s: number, a: any) => s + (a.balance ?? 0),
        0,
      );
      return totalBal > 0 && txList.length >= 5;
    }

    case "dizimo_3mo": {
      const months = new Set(
        txList
          .filter((tx) => tx.categoryId === "dizimo")
          .map((tx) => tx.date.slice(0, 7)),
      );
      return months.size >= 3;
    }

    default:
      return false;
  }
}

export function checkNewAchievements(
  domain: AppState,
  gamification: GamificationState,
  budget: BudgetBreakdown,
  alreadyUnlocked: Set<string>,
): Achievement[] {
  return ALL_ACHIEVEMENTS.filter(
    (ach) =>
      !alreadyUnlocked.has(ach.id) &&
      isUnlocked(ach.id, domain, gamification, budget),
  );
}

/**
 * Returns which monthly trophies are newly completed this month
 * but haven't been recorded yet.
 */
export function checkNewMonthlyTrophies(
  domain: AppState,
  budget: BudgetBreakdown,
  alreadyCompleted: Array<{ id: string; monthKey: string }>,
): MonthlyTrophy[] {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const doneSet = new Set(alreadyCompleted.map(c => `${c.id}:${c.monthKey}`));

  return MONTHLY_TROPHIES.filter(trophy => {
    if (doneSet.has(`${trophy.id}:${monthKey}`)) return false;
    return trophy.check(domain, budget, monthKey);
  });
}
