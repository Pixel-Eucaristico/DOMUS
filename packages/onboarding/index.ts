export type {
  OnboardingEvent,
  OnboardingEventType,
  OnboardingState,
  OnboardingStartedEvent,
  OnboardingStepCompletedEvent,
  OnboardingDayCompletedEvent,
  OnboardingAdjustedEvent,
  OnboardingFinishedEvent,
  OnboardingStartedPayload,
  OnboardingStepCompletedPayload,
  OnboardingDayCompletedPayload,
  OnboardingAdjustedPayload,
  OnboardingFinishedPayload,
  DayMission,
  OnboardingStep,
  DifficultyLevel,
} from "./src/types";
export { ONBOARDING_EVENTS, ONBOARDING_STEPS } from "./src/types";

export {
  getMissionsForDifficulty,
  getMissionForDay,
  getCurrentDay,
  isOnboardingComplete,
  getDayProgress,
  getOverallProgress,
} from "./src/onboardingEngine";

export {
  evaluatePerformance,
  shouldNeverPunish,
  getEncouragementMessage,
} from "./src/adaptiveMissionEngine";
export type { AdaptiveResult } from "./src/adaptiveMissionEngine";

export {
  onboardingReducer,
  createInitialOnboardingState,
  replayOnboardingEvents,
} from "./src/reducer";
