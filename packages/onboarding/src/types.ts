export const ONBOARDING_EVENTS = {
  ONBOARDING_STARTED: "ONBOARDING_STARTED",
  ONBOARDING_STEP_COMPLETED: "ONBOARDING_STEP_COMPLETED",
  ONBOARDING_DAY_COMPLETED: "ONBOARDING_DAY_COMPLETED",
  ONBOARDING_ADJUSTED: "ONBOARDING_ADJUSTED",
  ONBOARDING_FINISHED: "ONBOARDING_FINISHED",
} as const;

export type OnboardingEventType =
  (typeof ONBOARDING_EVENTS)[keyof typeof ONBOARDING_EVENTS];

export const ONBOARDING_STEPS = {
  CREATE_ACCOUNT: "create_account",
  SET_INCOME: "set_income",
  LOG_EXPENSE: "log_expense",
  REVIEW_BUDGET: "review_budget",
  SET_GOAL: "set_goal",
  LOG_3_TRANSACTIONS: "log_3_transactions",
  CHECK_503020: "check_503020",
} as const;

export type OnboardingStep =
  (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

export type DifficultyLevel = "easy" | "normal" | "challenging";

export interface OnboardingStartedPayload {
  userId: string;
  startDate: string;
  difficulty: DifficultyLevel;
}

export interface OnboardingStepCompletedPayload {
  step: OnboardingStep;
  day: number;
  completedAt: string;
}

export interface OnboardingDayCompletedPayload {
  day: number;
  completedAt: string;
  stepsCompleted: number;
  totalSteps: number;
}

export interface OnboardingAdjustedPayload {
  previousDifficulty: DifficultyLevel;
  newDifficulty: DifficultyLevel;
  reason: string;
  day: number;
}

export interface OnboardingFinishedPayload {
  finishedAt: string;
  totalDays: number;
  finalDifficulty: DifficultyLevel;
}

interface BaseOnboardingEvent {
  id: string;
  type: OnboardingEventType;
  timestamp: number;
  deviceId: string;
  signature: string;
}

export interface OnboardingStartedEvent extends BaseOnboardingEvent {
  type: typeof ONBOARDING_EVENTS.ONBOARDING_STARTED;
  payload: OnboardingStartedPayload;
}

export interface OnboardingStepCompletedEvent extends BaseOnboardingEvent {
  type: typeof ONBOARDING_EVENTS.ONBOARDING_STEP_COMPLETED;
  payload: OnboardingStepCompletedPayload;
}

export interface OnboardingDayCompletedEvent extends BaseOnboardingEvent {
  type: typeof ONBOARDING_EVENTS.ONBOARDING_DAY_COMPLETED;
  payload: OnboardingDayCompletedPayload;
}

export interface OnboardingAdjustedEvent extends BaseOnboardingEvent {
  type: typeof ONBOARDING_EVENTS.ONBOARDING_ADJUSTED;
  payload: OnboardingAdjustedPayload;
}

export interface OnboardingFinishedEvent extends BaseOnboardingEvent {
  type: typeof ONBOARDING_EVENTS.ONBOARDING_FINISHED;
  payload: OnboardingFinishedPayload;
}

export type OnboardingEvent =
  | OnboardingStartedEvent
  | OnboardingStepCompletedEvent
  | OnboardingDayCompletedEvent
  | OnboardingAdjustedEvent
  | OnboardingFinishedEvent;

export interface DayMission {
  day: number;
  steps: OnboardingStep[];
  description: string;
}

export interface OnboardingState {
  started: boolean;
  finished: boolean;
  startDate: string;
  currentDay: number;
  difficulty: DifficultyLevel;
  completedSteps: OnboardingStep[];
  completedDays: number[];
  adjustments: number;
}
