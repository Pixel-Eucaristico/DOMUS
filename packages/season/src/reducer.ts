import { SEASON_EVENTS } from "./types";
import type { SeasonEvent, SeasonState } from "./types";

export function createInitialSeasonState(): SeasonState {
  return {
    currentSeason: null,
    history: [],
    badges: [],
    currentArchetype: "",
  };
}

export function seasonReducer(state: SeasonState, event: SeasonEvent): SeasonState {
  switch (event.type) {
    case SEASON_EVENTS.SEASON_STARTED:
      return {
        ...state,
        currentSeason: {
          seasonId: event.payload.seasonId,
          year: event.payload.year,
          month: event.payload.month,
          startDate: event.payload.startDate,
          active: true,
        },
      };

    case SEASON_EVENTS.SEASON_ENDED:
      return {
        ...state,
        currentSeason: state.currentSeason
          ? { ...state.currentSeason, active: false }
          : null,
      };

    case SEASON_EVENTS.SEASON_EVALUATED:
      return {
        ...state,
        history: [...state.history, event.payload],
        currentArchetype: event.payload.archetype,
      };

    case SEASON_EVENTS.ARCHETYPE_EVOLVED:
      return {
        ...state,
        currentArchetype: event.payload.newArchetype,
      };

    case SEASON_EVENTS.SEASON_BADGE_EARNED:
      return {
        ...state,
        badges: [...state.badges, event.payload],
      };

    default:
      return state;
  }
}

export function replaySeasonEvents(events: SeasonEvent[]): SeasonState {
  return events.reduce(seasonReducer, createInitialSeasonState());
}
