import { ARCHETYPES, type ArchetypeScores, type ArchetypeType } from "./types";

export function detectArchetype(scores: ArchetypeScores): ArchetypeType {
  const { consistency, budgetAdherence, wishlistUsage, desireControl, monthlyPlanning } = scores;

  if (
    consistency >= 80 &&
    budgetAdherence >= 80 &&
    wishlistUsage >= 80 &&
    desireControl >= 80 &&
    monthlyPlanning >= 80
  ) {
    return ARCHETYPES.INDEPENDENT;
  }

  if (budgetAdherence >= 80 && monthlyPlanning >= 70) {
    return ARCHETYPES.INVESTOR;
  }

  if (monthlyPlanning >= 70 && desireControl >= 70) {
    return ARCHETYPES.STRATEGIST;
  }

  if (monthlyPlanning >= 60 && consistency >= 50) {
    return ARCHETYPES.PLANNER;
  }

  if (consistency >= 60 && budgetAdherence >= 50) {
    return ARCHETYPES.ORGANIZER;
  }

  return ARCHETYPES.EXPLORER;
}

export interface RawMetrics {
  transactionCount: number;
  daysActive: number;
  budgetAdherencePercent: number;
  wishlistItemsTracked: number;
  desiresSaved: number;
  monthsPlanned: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateScores(params: RawMetrics): ArchetypeScores {
  const consistency = clamp(Math.round((params.daysActive / 30) * 100), 0, 100);
  const budgetAdherence = clamp(Math.round(params.budgetAdherencePercent), 0, 100);
  const wishlistUsage = clamp(Math.round((params.wishlistItemsTracked / 10) * 100), 0, 100);
  const desireControl = clamp(Math.round((params.desiresSaved / 20) * 100), 0, 100);
  const monthlyPlanning = clamp(Math.round((params.monthsPlanned / 6) * 100), 0, 100);

  return {
    consistency,
    budgetAdherence,
    wishlistUsage,
    desireControl,
    monthlyPlanning,
  };
}
