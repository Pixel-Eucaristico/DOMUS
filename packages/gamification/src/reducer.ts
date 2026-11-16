import { GAMIFICATION_EVENTS } from "./types";
import type { GamificationEvent, GamificationState } from "./types";
import { calculateLevel } from "./levelEngine";

export const XP_RECOVERY_EVENT_ID = "xp-recovery:v1";
export const LEGACY_XP_RECOVERY_ID_PREFIX = "xp-recovery-";
export const XP_RECOVERY_MARKER = "xp-recovery";

export function isXpRecoveryGamificationEvent(event: GamificationEvent): boolean {
  if (event.type !== GAMIFICATION_EVENTS.XP_GAINED) return false;
  if (event.id === XP_RECOVERY_EVENT_ID) return true;
  if (typeof event.id === "string" && event.id.startsWith(LEGACY_XP_RECOVERY_ID_PREFIX)) return true;
  const payload = event.payload as { recovery?: unknown } | undefined;
  return payload?.recovery === XP_RECOVERY_MARKER;
}

export function createInitialGamificationState(): GamificationState {
  return {
    totalXp: 0,
    seasonXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: "",
    xpHistory: [],
    unlockedAchievements: [],
    completedMonthlyTrophies: [],
    selectedSeasonalTrophies: [],
    completedSeasonalTrophies: [],
    completionCounts: {},
    processedEventIds: [],
    processedTransactionIds: [],
    xpRecoveryApplied: false,
  };
}

export function gamificationReducer(
  state: GamificationState,
  event: GamificationEvent,
): GamificationState {
  const processedEventIds = state.processedEventIds ?? [];
  const processedTransactionIds = state.processedTransactionIds ?? [];

  // Idempotência estrita por event.id
  if (event.id && processedEventIds.includes(event.id)) {
    return state;
  }

  // Idempotência por transactionId em XP_GAINED
  if (
    event.type === GAMIFICATION_EVENTS.XP_GAINED &&
    event.payload.transactionId &&
    processedTransactionIds.includes(event.payload.transactionId)
  ) {
    return state;
  }

  // Story 7.5: a recuperação de XP vale uma vez só, mesmo com ids diferentes
  // (ids antigos aleatórios `xp-recovery-*`, ou a marca no payload).
  const isRecovery = isXpRecoveryGamificationEvent(event);
  if (isRecovery && state.xpRecoveryApplied) {
    return state;
  }

  const nextProcessedEventIds = event.id
    ? [...processedEventIds.slice(-999), event.id]
    : processedEventIds;

  switch (event.type) {
    case GAMIFICATION_EVENTS.XP_GAINED: {
      const { amount, source, transactionId } = event.payload;
      const nextTotalXp = Math.max(0, state.totalXp + amount);
      const nextTransactionIds = transactionId
        ? [...processedTransactionIds.slice(-999), transactionId]
        : processedTransactionIds;

      return {
        ...state,
        totalXp: nextTotalXp,
        seasonXp: Math.max(0, state.seasonXp + amount),
        level: calculateLevel(nextTotalXp),
        xpHistory: [
          ...state.xpHistory,
          { amount, source, timestamp: event.timestamp },
        ],
        processedEventIds: nextProcessedEventIds,
        processedTransactionIds: nextTransactionIds,
        xpRecoveryApplied: state.xpRecoveryApplied || isRecovery,
      };
    }

    case GAMIFICATION_EVENTS.LEVEL_UP: {
      return {
        ...state,
        level: calculateLevel(state.totalXp),
        processedEventIds: nextProcessedEventIds,
      };
    }

    case GAMIFICATION_EVENTS.STREAK_UPDATED: {
      // Story 7.9: streak é derivado das transações no replay; ignora payload legado sem sobrescrever estado.
      return {
        ...state,
        processedEventIds: nextProcessedEventIds,
      };
    }

    case GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED: {
      const { achievementId, rarity, xpReward } = event.payload;
      // Previne desbloquear a mesma conquista repetida se já estiver desbloqueada
      const existingAchs = state.unlockedAchievements ?? [];
      if (existingAchs.some((a) => a.id === achievementId)) return state;
      const nextTotalXp = state.totalXp + xpReward;

      return {
        ...state,
        totalXp: nextTotalXp,
        seasonXp: state.seasonXp + xpReward,
        level: calculateLevel(nextTotalXp),
        unlockedAchievements: [
          ...existingAchs,
          { id: achievementId, unlockedAt: event.timestamp, rarity },
        ],
        completionCounts: {
          ...state.completionCounts,
          [achievementId]: (state.completionCounts[achievementId] ?? 0) + 1,
        },
        processedEventIds: nextProcessedEventIds,
      };
    }

    case GAMIFICATION_EVENTS.MONTHLY_TROPHY_COMPLETED: {
      const { trophyId, monthKey, xpReward } = event.payload;
      const existing = state.completedMonthlyTrophies ?? [];
      // Avoid duplicate for same trophy+month
      const alreadyDone = existing.some(c => c.id === trophyId && c.monthKey === monthKey);
      if (alreadyDone) return state;
      const nextTotalXp = state.totalXp + xpReward;

      return {
        ...state,
        totalXp: nextTotalXp,
        seasonXp: state.seasonXp + xpReward,
        level: calculateLevel(nextTotalXp),
        completedMonthlyTrophies: [
          ...existing,
          { id: trophyId, monthKey, completedAt: event.timestamp },
        ],
        completionCounts: {
          ...state.completionCounts,
          [trophyId]: (state.completionCounts[trophyId] ?? 0) + 1,
        },
        processedEventIds: nextProcessedEventIds,
      };
    }

    case GAMIFICATION_EVENTS.SEASONAL_TROPHY_SELECTED: {
      const { trophyId, monthKey, tier } = event.payload;
      const existing = state.selectedSeasonalTrophies ?? [];
      // Only record if not already selected for this month
      const alreadySelected = existing.some(s => s.monthKey === monthKey);
      if (alreadySelected) return state;
      return {
        ...state,
        selectedSeasonalTrophies: [...existing, { trophyId, monthKey, tier }],
        processedEventIds: nextProcessedEventIds,
      };
    }

    case GAMIFICATION_EVENTS.SEASONAL_TROPHY_COMPLETED: {
      const { trophyId, monthKey, tier, xpReward } = event.payload;
      const existing = state.completedSeasonalTrophies ?? [];
      // Avoid duplicate
      const alreadyDone = existing.some(c => c.trophyId === trophyId && c.monthKey === monthKey);
      if (alreadyDone) return state;
      const nextTotalXp = state.totalXp + xpReward;

      return {
        ...state,
        totalXp: nextTotalXp,
        seasonXp: state.seasonXp + xpReward,
        level: calculateLevel(nextTotalXp),
        completedSeasonalTrophies: [
          ...existing,
          { trophyId, monthKey, tier, completedAt: event.timestamp },
        ],
        completionCounts: {
          ...state.completionCounts,
          [trophyId]: (state.completionCounts[trophyId] ?? 0) + 1,
        },
        processedEventIds: nextProcessedEventIds,
      };
    }

    default:
      return state;
  }
}

export function replayGamificationEvents(
  events: GamificationEvent[],
): GamificationState {
  let state = createInitialGamificationState();
  for (const event of events) {
    state = gamificationReducer(state, event);
  }
  return state;
}
