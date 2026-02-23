import type { BudgetBreakdown } from "../../domain/src/transactions";
import type { XpSource, XpGainedPayload } from "./types";

const XP_TABLE: Record<XpSource, number> = {
  transaction_logged: 10,
  budget_adherence: 25,
  mission_completed: 50,
  daily_consistency: 15,
  streak_bonus: 20,
  season_bonus: 100,
};

export function getXpForAction(source: XpSource): number {
  return XP_TABLE[source] ?? 0;
}

export function calculateBudgetAdherenceXp(budget: BudgetBreakdown): number {
  const { needsPercent, wantsPercent, savingsPercent, totalIncome } = budget;

  // If no transactions at all, no XP.
  if (budget.needs === 0 && budget.wants === 0 && budget.savings === 0 && totalIncome === 0) {
    return 0;
  }

  let xp = 0;

  // 1. Financial Health Bonus: If user is within BOTH spending limits, give a bonus.
  // We give this if they have transactions but haven't exceeded limits.
  // If income is 0, any expense makes percent 100%, so bonus is only possible with income or 0 expenses.
  if (needsPercent <= 50 && wantsPercent <= 30) {
    // If they have income, they get the full bonus.
    // If they don't have income yet, they only get it if they haven't spent anything (which is handled by the 0 check above).
    // Actually, let's give a small "Day Start" bonus if they have no income but are registered.
    xp += 20;
  }

  // 2. Reward for Savings (Goal is >= 20%)
  if (savingsPercent >= 20) {
    const extra = savingsPercent - 20;
    xp += 40; 
    xp += extra * 3; 
  } else if (budget.savings > 0) {
    // Bonus for ANY categorized savings
    xp += 15;
  }

  // 3. Penalties - ONLY apply if income has been recorded AND is greater than 0.
  // This avoids penalizing the user at the start of the month when they only have expenses.
  if (totalIncome > 0) {
    // Penalty for overspending in Needs (> 50%) - Smaller penalty
    if (needsPercent > 50) {
      const diff = needsPercent - 50;
      xp -= diff * 1; 
    }

    // Penalty for overspending in Wants (> 30%) - Larger penalty
    if (wantsPercent > 30) {
      const diff = wantsPercent - 30;
      xp -= diff * 4; 
    }
  }

  return Math.round(xp);
}

export function calculateStreakBonusXp(currentStreak: number): number {
  if (currentStreak >= 30) return 50;
  if (currentStreak >= 14) return 30;
  if (currentStreak >= 7) return 20;
  if (currentStreak >= 3) return 10;
  return 0;
}

export function createXpPayload(
  source: XpSource,
  overrideAmount?: number,
  seasonId?: string,
): XpGainedPayload {
  return {
    amount: overrideAmount ?? getXpForAction(source),
    source,
    seasonId,
  };
}
