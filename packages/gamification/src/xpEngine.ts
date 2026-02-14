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
  const needsDiff = Math.abs(needsPercent - 50);
  const wantsDiff = Math.abs(wantsPercent - 30);
  const savingsDiff = Math.abs(savingsPercent - 20);
  const totalDiff = needsDiff + wantsDiff + savingsDiff;

  if (totalDiff <= 5) return 50;
  if (totalDiff <= 10) return 35;
  if (totalDiff <= 20) return 25;
  if (totalDiff <= 30) return 15;
  return 5;
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
