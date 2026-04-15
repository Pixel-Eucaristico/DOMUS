export const GAMIFICATION_EVENTS = {
  XP_GAINED: "XP_GAINED",
  LEVEL_UP: "LEVEL_UP",
  STREAK_UPDATED: "STREAK_UPDATED",
  ACHIEVEMENT_UNLOCKED: "ACHIEVEMENT_UNLOCKED",
  MONTHLY_TROPHY_COMPLETED: "MONTHLY_TROPHY_COMPLETED",
  SEASONAL_TROPHY_SELECTED: "SEASONAL_TROPHY_SELECTED",
  SEASONAL_TROPHY_COMPLETED: "SEASONAL_TROPHY_COMPLETED",
} as const;

export type GamificationEventType =
  (typeof GAMIFICATION_EVENTS)[keyof typeof GAMIFICATION_EVENTS];

export type XpSource =
  | "transaction_logged"
  | "budget_adherence"
  | "mission_completed"
  | "daily_consistency"
  | "streak_bonus"
  | "season_bonus";

export interface XpGainedPayload {
  amount: number;
  source: XpSource;
  description?: string;
  seasonId?: string;
}

export interface LevelUpPayload {
  previousLevel: number;
  newLevel: number;
  totalXp: number;
}

export interface StreakUpdatedPayload {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  broken: boolean;
}

export interface AchievementUnlockedPayload {
  achievementId: string;
  name: string;
  description: string;
  rarity: "silver" | "gold" | "diamond";
  xpReward: number;
}

export interface MonthlyTrophyCompletedPayload {
  trophyId: string;
  monthKey: string; // "YYYY-MM"
  name: string;
  description: string;
  xpReward: number;
}

export interface SeasonalTrophySelectedPayload {
  trophyId: string;
  monthKey: string; // "YYYY-MM"
  tier: 1 | 2 | 3;
}

export interface SeasonalTrophyCompletedPayload {
  trophyId: string;
  monthKey: string; // "YYYY-MM"
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  xpReward: number; // already tier-adjusted
}

interface BaseGamificationEvent {
  id: string;
  type: GamificationEventType;
  timestamp: number;
  deviceId: string;
  signature: string;
}

export interface XpGainedEvent extends BaseGamificationEvent {
  type: typeof GAMIFICATION_EVENTS.XP_GAINED;
  payload: XpGainedPayload;
}

export interface LevelUpEvent extends BaseGamificationEvent {
  type: typeof GAMIFICATION_EVENTS.LEVEL_UP;
  payload: LevelUpPayload;
}

export interface StreakUpdatedEvent extends BaseGamificationEvent {
  type: typeof GAMIFICATION_EVENTS.STREAK_UPDATED;
  payload: StreakUpdatedPayload;
}

export interface AchievementUnlockedEvent extends BaseGamificationEvent {
  type: typeof GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED;
  payload: AchievementUnlockedPayload;
}

export interface MonthlyTrophyCompletedEvent extends BaseGamificationEvent {
  type: typeof GAMIFICATION_EVENTS.MONTHLY_TROPHY_COMPLETED;
  payload: MonthlyTrophyCompletedPayload;
}

export interface SeasonalTrophySelectedEvent extends BaseGamificationEvent {
  type: typeof GAMIFICATION_EVENTS.SEASONAL_TROPHY_SELECTED;
  payload: SeasonalTrophySelectedPayload;
}

export interface SeasonalTrophyCompletedEvent extends BaseGamificationEvent {
  type: typeof GAMIFICATION_EVENTS.SEASONAL_TROPHY_COMPLETED;
  payload: SeasonalTrophyCompletedPayload;
}

export type GamificationEvent =
  | XpGainedEvent
  | LevelUpEvent
  | StreakUpdatedEvent
  | AchievementUnlockedEvent
  | MonthlyTrophyCompletedEvent
  | SeasonalTrophySelectedEvent
  | SeasonalTrophyCompletedEvent;

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
  rarity: "silver" | "gold" | "diamond";
}

export interface CompletedMonthlyTrophy {
  id: string;
  monthKey: string; // "YYYY-MM"
  completedAt: number;
}

export interface SelectedSeasonalTrophy {
  trophyId: string;
  monthKey: string; // "YYYY-MM"
  tier: 1 | 2 | 3;
}

export interface CompletedSeasonalTrophy {
  trophyId: string;
  monthKey: string; // "YYYY-MM"
  tier: 1 | 2 | 3;
  completedAt: number;
}

export interface GamificationState {
  totalXp: number;
  seasonXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  xpHistory: Array<{ amount: number; source: XpSource; timestamp: number }>;
  unlockedAchievements: UnlockedAchievement[];
  completedMonthlyTrophies: CompletedMonthlyTrophy[];
  selectedSeasonalTrophies: SelectedSeasonalTrophy[];
  completedSeasonalTrophies: CompletedSeasonalTrophy[];
  completionCounts: Record<string, number>;
}
