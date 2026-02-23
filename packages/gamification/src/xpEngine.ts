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

export function calculateBudgetAdherenceXp(
  needsPercent: number,
  wantsPercent: number,
  savingsPercent: number,
): number {
  // If all percentages are zero, there's no data to evaluate.
  if (needsPercent === 0 && wantsPercent === 0 && savingsPercent === 0) {
    return 0;
  }

  let xp = 0;

  // 1. Penalty for overspending in Needs (> 50%) - Smaller penalty
  if (needsPercent > 50) {
    const diff = needsPercent - 50;
    xp -= diff * 1; // 1 XP per 1% overspent
  }

  // 2. Penalty for overspending in Wants (> 30%) - Larger penalty
  if (wantsPercent > 30) {
    const diff = wantsPercent - 30;
    xp -= diff * 4; // 4 XP per 1% overspent
  }

  // 3. Reward primarily for Savings (Goal is >= 20%)
  // "somente poupança que gratifica"
  if (savingsPercent >= 20) {
    const extra = savingsPercent - 20;
    xp += 30; // Base reward for meeting the goal
    xp += extra * 2; // Extra reward for saving more
  } else {
    // Penalty for not meeting the savings goal
    const miss = 20 - savingsPercent;
    xp -= miss * 2; // 2 XP per 1% missing
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
