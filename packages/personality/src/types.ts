export const ARCHETYPES = {
  EXPLORER: "EXPLORER",
  ORGANIZER: "ORGANIZER",
  PLANNER: "PLANNER",
  STRATEGIST: "STRATEGIST",
  INVESTOR: "INVESTOR",
  INDEPENDENT: "INDEPENDENT",
} as const;

export type ArchetypeType = (typeof ARCHETYPES)[keyof typeof ARCHETYPES];

export const PERSONALITY_EVENTS = {
  ARCHETYPE_UPDATED: "ARCHETYPE_UPDATED",
} as const;

export type PersonalityEventType =
  (typeof PERSONALITY_EVENTS)[keyof typeof PERSONALITY_EVENTS];

export interface ArchetypeScores {
  consistency: number;
  budgetAdherence: number;
  wishlistUsage: number;
  desireControl: number;
  monthlyPlanning: number;
}

export interface ArchetypeUpdatedPayload {
  previousArchetype: string;
  newArchetype: ArchetypeType;
  scores: ArchetypeScores;
  reason: string;
}

interface BasePersonalityEvent {
  id: string;
  type: PersonalityEventType;
  timestamp: number;
  deviceId: string;
  signature: string;
}

export interface ArchetypeUpdatedEvent extends BasePersonalityEvent {
  type: typeof PERSONALITY_EVENTS.ARCHETYPE_UPDATED;
  payload: ArchetypeUpdatedPayload;
}

export type PersonalityEvent = ArchetypeUpdatedEvent;

export type ToneStyle = "technical" | "motivational" | "strategic";

export interface ToneOutput {
  style: ToneStyle;
  messageTemplate: string;
}

export interface PersonalityState {
  currentArchetype: ArchetypeType;
  scores: ArchetypeScores;
  history: Array<{ archetype: ArchetypeType; timestamp: number }>;
}
