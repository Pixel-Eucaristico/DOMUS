export type {
  GamificationEvent,
  GamificationEventType,
  GamificationState,
  XpGainedEvent,
  LevelUpEvent,
  StreakUpdatedEvent,
  XpGainedPayload,
  LevelUpPayload,
  StreakUpdatedPayload,
  XpSource,
} from "./src/types";
export { GAMIFICATION_EVENTS } from "./src/types";

export {
  getXpForAction,
  calculateBudgetAdherenceXp,
  calculateStreakBonusXp,
  createXpPayload,
} from "./src/xpEngine";

export {
  calculateLevel,
  getLevelInfo,
  shouldLevelUp,
  getXpForLevel,
} from "./src/levelEngine";
export type { LevelInfo } from "./src/levelEngine";

export {
  updateStreak,
  createInitialStreak,
  isStreakActive,
} from "./src/streakEngine";
export type { StreakState } from "./src/streakEngine";

export {
  gamificationReducer,
  createInitialGamificationState,
  replayGamificationEvents,
} from "./src/reducer";
