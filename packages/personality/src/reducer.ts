import {
  ARCHETYPES,
  PERSONALITY_EVENTS,
  type PersonalityEvent,
  type PersonalityState,
} from "./types";

export function createInitialPersonalityState(): PersonalityState {
  return {
    currentArchetype: ARCHETYPES.EXPLORER,
    scores: {
      consistency: 0,
      budgetAdherence: 0,
      wishlistUsage: 0,
      desireControl: 0,
      monthlyPlanning: 0,
    },
    history: [],
  };
}

export function personalityReducer(
  state: PersonalityState,
  event: PersonalityEvent,
): PersonalityState {
  switch (event.type) {
    case PERSONALITY_EVENTS.ARCHETYPE_UPDATED:
      return {
        ...state,
        currentArchetype: event.payload.newArchetype,
        scores: { ...event.payload.scores },
        history: [
          ...state.history,
          {
            archetype: event.payload.newArchetype,
            timestamp: event.timestamp,
          },
        ],
      };
    default:
      return state;
  }
}

export function replayPersonalityEvents(
  events: PersonalityEvent[],
): PersonalityState {
  return events.reduce(personalityReducer, createInitialPersonalityState());
}
