import type { AppState } from "../../../domain/src/state";
import type { BudgetBreakdown } from "../../../domain/src/transactions";
import type { SeasonalTrophyProgress } from "../seasonalTrophies";

/** Same shape as SeasonalTrophy — fully interchangeable in pickSeasonalTrophy. */
export interface LiturgicalTrophy {
  id: string;
  month: number; // 1-12 (base/most common month for movable feasts)
  name: string;
  eventSummary: string;
  description: string;
  baseXp: number;
  icon: string;
  difficulty: "fácil" | "médio" | "difícil";
  check: (domain: AppState, budget: BudgetBreakdown, monthKey: string) => boolean;
  progress: (domain: AppState, budget: BudgetBreakdown, monthKey: string) => SeasonalTrophyProgress;
}
