import { ONBOARDING_EVENTS } from "./types";
import type { OnboardingEvent, OnboardingState } from "./types";

export function createInitialOnboardingState(): OnboardingState {
  return {
    started: false,
    finished: false,
    startDate: "",
    currentDay: 0,
    difficulty: "normal",
    completedSteps: [],
    completedDays: [],
    adjustments: 0,
  };
}

export function onboardingReducer(
  state: OnboardingState,
  event: OnboardingEvent,
): OnboardingState {
  switch (event.type) {
    case ONBOARDING_EVENTS.ONBOARDING_STARTED:
      return {
        ...state,
        started: true,
        startDate: event.payload.startDate,
        currentDay: 1,
        difficulty: event.payload.difficulty,
      };

    case ONBOARDING_EVENTS.ONBOARDING_STEP_COMPLETED: {
      const newSteps = state.completedSteps.includes(event.payload.step)
        ? state.completedSteps
        : [...state.completedSteps, event.payload.step];
      return {
        ...state,
        completedSteps: newSteps,
        currentDay: Math.max(state.currentDay, event.payload.day),
      };
    }

    case ONBOARDING_EVENTS.ONBOARDING_DAY_COMPLETED: {
      const newDays = state.completedDays.includes(event.payload.day)
        ? state.completedDays
        : [...state.completedDays, event.payload.day];
      return {
        ...state,
        completedDays: newDays,
        currentDay: Math.max(state.currentDay, event.payload.day),
      };
    }

    case ONBOARDING_EVENTS.ONBOARDING_ADJUSTED:
      return {
        ...state,
        difficulty: event.payload.newDifficulty,
        adjustments: state.adjustments + 1,
      };

    case ONBOARDING_EVENTS.ONBOARDING_FINISHED:
      return {
        ...state,
        finished: true,
      };

    default:
      return state;
  }
}

export function replayOnboardingEvents(
  events: OnboardingEvent[],
): OnboardingState {
  let state = createInitialOnboardingState();
  for (const event of events) {
    state = onboardingReducer(state, event);
  }
  return state;
}
