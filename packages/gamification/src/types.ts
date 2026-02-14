export const GAMIFICATION_EVENTS = {
  XP_GAINED: "XP_GAINED",
  LEVEL_UP: "LEVEL_UP",
  STREAK_UPDATED: "STREAK_UPDATED",
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

export type GamificationEvent =
  | XpGainedEvent
  | LevelUpEvent
  | StreakUpdatedEvent;

export interface GamificationState {
  totalXp: number;
  seasonXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  xpHistory: Array<{ amount: number; source: XpSource; timestamp: number }>;
}
