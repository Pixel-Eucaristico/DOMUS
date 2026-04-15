import type { AppState } from "../../../domain/src/state";
import type { BudgetBreakdown } from "../../../domain/src/transactions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeasonalTier = 1 | 2 | 3;

export interface SeasonalTrophyProgress {
  current: number;
  target: number;
  unit: string;
}

export interface SeasonalTrophy {
  id: string;
  /** Calendar month this trophy belongs to (1–12) */
  month: number;
  name: string;
  /** Brief description of the real-world event */
  eventSummary: string;
  /** Financial goal description */
  description: string;
  /** XP awarded on completion — same regardless of tier */
  baseXp: number;
  icon: string;
  difficulty: "fácil" | "médio" | "difícil";
  check: (domain: AppState, budget: BudgetBreakdown, monthKey: string) => boolean;
  progress: (domain: AppState, budget: BudgetBreakdown, monthKey: string) => SeasonalTrophyProgress;
}

// ─── Domain Helpers (used by trophy data check/progress functions) ────────────

export function txsInMonth(domain: AppState, monthKey: string) {
  return Object.values(domain.transactions).filter(tx => tx.date?.startsWith(monthKey));
}

export function incomeInMonth(domain: AppState, monthKey: string) {
  return txsInMonth(domain, monthKey).filter(tx => tx.type === "income");
}

export function expenseInMonth(domain: AppState, monthKey: string) {
  return txsInMonth(domain, monthKey).filter(tx => tx.type === "expense");
}

export function categoriesUsedInMonth(domain: AppState, monthKey: string): number {
  const cats = new Set(
    txsInMonth(domain, monthKey)
      .filter(tx => tx.categoryId)
      .map(tx => tx.categoryId as string),
  );
  return cats.size;
}

export function hasIncomeBeforeDay(domain: AppState, monthKey: string, day: number): boolean {
  return incomeInMonth(domain, monthKey).some(tx => {
    const d = parseInt(tx.date.slice(8, 10), 10);
    return d <= day;
  });
}

export function wishlistItemCount(domain: AppState): number {
  const items = (domain as any).wishlistItems ?? {};
  return Object.keys(items).length;
}

export function hasDizimoInMonth(domain: AppState, monthKey: string): boolean {
  return txsInMonth(domain, monthKey).some(tx => tx.categoryId === "dizimo");
}

// ─── XP with tier ─────────────────────────────────────────────────────────────

/** Returns the fixed XP reward — tier affects visual display only, not the amount. */
export function getSeasonalXp(baseXp: number, _tier: SeasonalTier): number {
  return baseXp;
}

export function getTierLabel(tier: SeasonalTier): string {
  if (tier === 3) return "Ouro";
  if (tier === 2) return "Prata";
  return "Bronze";
}

export function getTierColor(tier: SeasonalTier): string {
  if (tier === 3) return "#FFC107";
  if (tier === 2) return "#9E9E9E";
  return "#CD7F32";
}

// ─── Selection: deterministic random per user+month ──────────────────────────

function simpleHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h;
}

/**
 * Picks one seasonal trophy for the given user+month.
 * Same user always gets the same trophy for a given month, across app restarts.
 */
export function pickSeasonalTrophy(
  deviceId: string,
  monthKey: string,
  allTrophies: SeasonalTrophy[],
): SeasonalTrophy | null {
  const month = parseInt(monthKey.split("-")[1] ?? "1", 10);
  const candidates = allTrophies.filter(t => t.month === month);
  if (candidates.length === 0) return null;
  const idx = simpleHash(`${deviceId}-${monthKey}`) % candidates.length;
  return candidates[idx] ?? null;
}

/**
 * Returns how many times the user has previously completed this seasonal trophy.
 * Used to compute current tier.
 */
export function getSeasonalTier(
  trophyId: string,
  completedSeasonalTrophies: Array<{ id: string; monthKey: string }>,
  currentMonthKey: string,
): SeasonalTier {
  const prior = completedSeasonalTrophies.filter(
    c => c.id === trophyId && c.monthKey !== currentMonthKey,
  ).length;
  if (prior >= 2) return 3;
  if (prior >= 1) return 2;
  return 1;
}
