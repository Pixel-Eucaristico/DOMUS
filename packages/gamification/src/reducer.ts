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
        totalXp: state.totalXp + amount,
        seasonXp: state.seasonXp + amount,
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
