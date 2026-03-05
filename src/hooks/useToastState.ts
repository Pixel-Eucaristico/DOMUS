import { useState, useCallback } from "react";
import type { AchievementUnlockedPayload, MonthlyTrophyCompletedPayload, SeasonalTrophyCompletedPayload } from "@packages/gamification/src/types";

export interface ToastState {
  pendingToast: AchievementUnlockedPayload | null;
  setPendingToast: (toast: AchievementUnlockedPayload | null) => void;
  clearPendingToast: () => void;
  pendingMonthlyToast: MonthlyTrophyCompletedPayload | null;
  setPendingMonthlyToast: (toast: MonthlyTrophyCompletedPayload | null) => void;
  clearPendingMonthlyToast: () => void;
  pendingSeasonalToast: SeasonalTrophyCompletedPayload | null;
  setPendingSeasonalToast: (toast: SeasonalTrophyCompletedPayload | null) => void;
  clearPendingSeasonalToast: () => void;
}

export function useToastState(): ToastState {
  const [pendingToast, setPendingToast] = useState<AchievementUnlockedPayload | null>(null);
  const [pendingMonthlyToast, setPendingMonthlyToast] = useState<MonthlyTrophyCompletedPayload | null>(null);
  const [pendingSeasonalToast, setPendingSeasonalToast] = useState<SeasonalTrophyCompletedPayload | null>(null);

  const clearPendingToast = useCallback(() => setPendingToast(null), []);
  const clearPendingMonthlyToast = useCallback(() => setPendingMonthlyToast(null), []);
  const clearPendingSeasonalToast = useCallback(() => setPendingSeasonalToast(null), []);

  return {
    pendingToast,
    setPendingToast,
    clearPendingToast,
    pendingMonthlyToast,
    setPendingMonthlyToast,
    clearPendingMonthlyToast,
    pendingSeasonalToast,
    setPendingSeasonalToast,
    clearPendingSeasonalToast,
  };
}
