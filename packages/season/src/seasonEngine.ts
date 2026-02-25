import type {
  SeasonStartedPayload,
  SeasonEndedPayload,
  SeasonEvaluatedPayload,
  SeasonState,
} from "./types";

export function createSeasonId(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, "0")}`;
}

export function startSeason(year: number, month: number): SeasonStartedPayload {
  const seasonId = createSeasonId(year, month);
  const startDate = new Date(year, month - 1, 1).toISOString();
  return { seasonId, year, month, startDate };
}

export function endSeason(seasonId: string): SeasonEndedPayload {
  return { seasonId, endDate: new Date().toISOString() };
}

export function evaluateSeason(
  seasonId: string,
  totalXp: number,
  level: number,
  budgetScore: number,
  streakDays: number,
  archetype: string,
): SeasonEvaluatedPayload {
  return { seasonId, totalXp, level, budgetScore, streakDays, archetype };
}

export function isSeasonActive(state: SeasonState): boolean {
  return state.currentSeason !== null && state.currentSeason.active;
}

export function getSeasonMonth(date: string): { year: number; month: number } {
  const d = new Date(date);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function shouldEndSeason(
  currentDate: string,
  seasonMonth: number,
  seasonYear: number,
): boolean {
  const { year, month } = getSeasonMonth(currentDate);
  return year !== seasonYear || month !== seasonMonth;
}
