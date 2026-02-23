import type { BudgetBreakdown } from "../../domain/src/transactions";
import type { XpSource, XpGainedPayload } from "./types";

const XP_TABLE: Record<XpSource, number> = {
  transaction_logged: 5,
  budget_adherence: 10,
  mission_completed: 30,
  daily_consistency: 10,
  streak_bonus: 15,
  season_bonus: 50,
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

  // 1. Financial Health Bonus: If user is within BOTH spending limits, give a small bonus.
  if (needsPercent <= 50 && wantsPercent <= 30) {
    xp += 5; // Balanced bonus for staying in control
  }

  // 2. Reward for Savings (Goal is >= 20%)
  if (savingsPercent >= 20) {
    const extra = savingsPercent - 20;
    xp += 10; // Base reward for meeting the goal
    xp += Math.floor(extra / 2); // 1 XP for every 2% extra saved
  } else if (budget.savings > 0) {
    // Small bonus for ANY categorized savings
    xp += 3;
  }

  // 3. Penalties - ONLY apply if income has been recorded AND is greater than 0.
  if (totalIncome > 0) {
    // Penalty for overspending in Needs (> 50%)
    if (needsPercent > 50) {
      const diff = needsPercent - 50;
      xp -= diff * 1; 
    }

    // Penalty for overspending in Wants (> 30%)
    if (wantsPercent > 30) {
      const diff = wantsPercent - 30;
      xp -= diff * 2; // Reduced from 4 to 2 for better balance
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
