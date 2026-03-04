export type {
  GamificationEvent,
  GamificationEventType,
  GamificationState,
  XpGainedEvent,
  LevelUpEvent,
  StreakUpdatedEvent,
  AchievementUnlockedEvent,
  MonthlyTrophyCompletedEvent,
  SeasonalTrophySelectedEvent,
  SeasonalTrophyCompletedEvent,
  XpGainedPayload,
  LevelUpPayload,
  StreakUpdatedPayload,
  AchievementUnlockedPayload,
  MonthlyTrophyCompletedPayload,
  SeasonalTrophySelectedPayload,
  SeasonalTrophyCompletedPayload,
  UnlockedAchievement,
  CompletedMonthlyTrophy,
  SelectedSeasonalTrophy,
  CompletedSeasonalTrophy,
  XpSource,
} from "./src/types";
export { GAMIFICATION_EVENTS } from "./src/types";

export type { SeasonalTrophy, SeasonalTier, SeasonalTrophyProgress } from "./src/seasonalTrophies";
export {
  ALL_SEASONAL_TROPHIES,
  pickSeasonalTrophy,
  getSeasonalTier,
  getSeasonalXp,
  getTierLabel,
  getTierColor,
} from "./src/seasonalTrophies";

export type { Achievement, AchievementRarity, AchievementSeries, MonthlyTrophy, MonthlyTrophyProgress } from "./src/achievements";
export {
  ALL_ACHIEVEMENTS,
  ACHIEVEMENT_SERIES,
  checkNewAchievements,
  getNextSeriesTarget,
  getConsecutiveMonthsCompliant,
  MONTHLY_TROPHIES,
  checkNewMonthlyTrophies,
} from "./src/achievements";

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

export type { LiturgicalTrophy } from "./src/liturgicalTrophies";
export { ALL_LITURGICAL_TROPHIES } from "./src/liturgicalTrophies";
