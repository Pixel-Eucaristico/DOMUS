import { GAMIFICATION_EVENTS } from "./types";
import type { GamificationEvent, GamificationState } from "./types";

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
  };
}

export function gamificationReducer(
  state: GamificationState,
  event: GamificationEvent,
): GamificationState {
  switch (event.type) {
    case GAMIFICATION_EVENTS.XP_GAINED: {
      const { amount, source } = event.payload;
      return {
        ...state,
        totalXp: Math.max(0, state.totalXp + amount),
        seasonXp: Math.max(0, state.seasonXp + amount),
        xpHistory: [
          ...state.xpHistory,
          { amount, source, timestamp: event.timestamp },
        ],
      };
    }

    case GAMIFICATION_EVENTS.LEVEL_UP: {
      return {
        ...state,
        level: event.payload.newLevel,
      };
    }

    case GAMIFICATION_EVENTS.STREAK_UPDATED: {
      return {
        ...state,
        currentStreak: event.payload.currentStreak,
        longestStreak: event.payload.longestStreak,
        lastActiveDate: event.payload.lastActiveDate,
      };
    }

    case GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED: {
      const { achievementId, rarity, xpReward } = event.payload;
      return {
        ...state,
        totalXp: state.totalXp + xpReward,
        seasonXp: state.seasonXp + xpReward,
        unlockedAchievements: [
          ...state.unlockedAchievements,
          { id: achievementId, unlockedAt: event.timestamp, rarity },
        ],
      };
    }

    case GAMIFICATION_EVENTS.MONTHLY_TROPHY_COMPLETED: {
      const { trophyId, monthKey, xpReward } = event.payload;
      const existing = state.completedMonthlyTrophies ?? [];
      // Avoid duplicate for same trophy+month
      const alreadyDone = existing.some(c => c.id === trophyId && c.monthKey === monthKey);
      if (alreadyDone) return state;
      return {
        ...state,
        totalXp: state.totalXp + xpReward,
        seasonXp: state.seasonXp + xpReward,
        completedMonthlyTrophies: [
          ...existing,
          { id: trophyId, monthKey, completedAt: event.timestamp },
        ],
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
      };
    }

    case GAMIFICATION_EVENTS.SEASONAL_TROPHY_COMPLETED: {
      const { trophyId, monthKey, tier, xpReward } = event.payload;
      const existing = state.completedSeasonalTrophies ?? [];
      // Avoid duplicate
      const alreadyDone = existing.some(c => c.trophyId === trophyId && c.monthKey === monthKey);
      if (alreadyDone) return state;
      return {
        ...state,
        totalXp: state.totalXp + xpReward,
        seasonXp: state.seasonXp + xpReward,
        completedSeasonalTrophies: [
          ...existing,
          { trophyId, monthKey, tier, completedAt: event.timestamp },
        ],
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
