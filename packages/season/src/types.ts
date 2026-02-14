export const SEASON_EVENTS = {
  SEASON_STARTED: "SEASON_STARTED",
  SEASON_ENDED: "SEASON_ENDED",
  SEASON_EVALUATED: "SEASON_EVALUATED",
  ARCHETYPE_EVOLVED: "ARCHETYPE_EVOLVED",
  SEASON_BADGE_EARNED: "SEASON_BADGE_EARNED",
} as const;

export type SeasonEventType =
  (typeof SEASON_EVENTS)[keyof typeof SEASON_EVENTS];

export interface SeasonStartedPayload {
  seasonId: string;
  year: number;
  month: number;
  startDate: string;
}

export interface SeasonEndedPayload {
  seasonId: string;
  endDate: string;
}

export interface SeasonEvaluatedPayload {
  seasonId: string;
  totalXp: number;
  level: number;
  budgetScore: number;
  streakDays: number;
  archetype: string;
}

export interface ArchetypeEvolvedPayload {
  previousArchetype: string;
  newArchetype: string;
  reason: string;
}

export interface SeasonBadgeEarnedPayload {
  badgeId: string;
  name: string;
  description: string;
  seasonId: string;
}

interface BaseSeasonEvent {
  id: string;
  type: SeasonEventType;
  timestamp: number;
  deviceId: string;
  signature: string;
}

export interface SeasonStartedEvent extends BaseSeasonEvent {
  type: typeof SEASON_EVENTS.SEASON_STARTED;
  payload: SeasonStartedPayload;
}

export interface SeasonEndedEvent extends BaseSeasonEvent {
  type: typeof SEASON_EVENTS.SEASON_ENDED;
  payload: SeasonEndedPayload;
}

export interface SeasonEvaluatedEvent extends BaseSeasonEvent {
  type: typeof SEASON_EVENTS.SEASON_EVALUATED;
  payload: SeasonEvaluatedPayload;
}

export interface ArchetypeEvolvedEvent extends BaseSeasonEvent {
  type: typeof SEASON_EVENTS.ARCHETYPE_EVOLVED;
  payload: ArchetypeEvolvedPayload;
}

export interface SeasonBadgeEarnedEvent extends BaseSeasonEvent {
  type: typeof SEASON_EVENTS.SEASON_BADGE_EARNED;
  payload: SeasonBadgeEarnedPayload;
}

export type SeasonEvent =
  | SeasonStartedEvent
  | SeasonEndedEvent
  | SeasonEvaluatedEvent
  | ArchetypeEvolvedEvent
  | SeasonBadgeEarnedEvent;

export interface SeasonState {
  currentSeason: {
    seasonId: string;
    year: number;
    month: number;
    startDate: string;
    active: boolean;
  } | null;
  history: SeasonEvaluatedPayload[];
  badges: SeasonBadgeEarnedPayload[];
  currentArchetype: string;
}
