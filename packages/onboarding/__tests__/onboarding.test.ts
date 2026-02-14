import { describe, it, expect } from "vitest";
import {
  getMissionsForDifficulty,
  getMissionForDay,
  getCurrentDay,
  isOnboardingComplete,
  getDayProgress,
  getOverallProgress,
} from "../src/onboardingEngine";
import {
  evaluatePerformance,
  shouldNeverPunish,
  getEncouragementMessage,
} from "../src/adaptiveMissionEngine";
import {
  createInitialOnboardingState,
  onboardingReducer,
  replayOnboardingEvents,
} from "../src/reducer";
import { ONBOARDING_EVENTS, ONBOARDING_STEPS } from "../src/types";
import type { OnboardingState, OnboardingEvent } from "../src/types";

function makeEvent(type: string, payload: any, timestamp?: number) {
  return {
    id: "e-" + Math.random().toString(36).substring(2, 8),
    type,
    payload,
    timestamp: timestamp ?? Date.now(),
    deviceId: "local",
    signature: "",
  };
}

describe("onboardingEngine", () => {
  describe("getMissionsForDifficulty", () => {
    it("returns 7 missions for easy difficulty", () => {
      const missions = getMissionsForDifficulty("easy");
      expect(missions).toHaveLength(7);
    });

    it("returns 7 missions for normal difficulty", () => {
      const missions = getMissionsForDifficulty("normal");
      expect(missions).toHaveLength(7);
    });

    it("returns 7 missions for challenging difficulty", () => {
      const missions = getMissionsForDifficulty("challenging");
      expect(missions).toHaveLength(7);
    });

    it("each mission has day, steps, and description", () => {
      const missions = getMissionsForDifficulty("normal");
      for (const m of missions) {
        expect(m).toHaveProperty("day");
        expect(m).toHaveProperty("steps");
        expect(m).toHaveProperty("description");
        expect(m.steps.length).toBeGreaterThan(0);
      }
    });

    it("missions cover days 1 through 7", () => {
      const missions = getMissionsForDifficulty("normal");
      const days = missions.map((m) => m.day);
      expect(days).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe("getMissionForDay", () => {
    it("returns correct mission for day 1 normal", () => {
      const mission = getMissionForDay(1, "normal");
      expect(mission).not.toBeNull();
      expect(mission!.day).toBe(1);
      expect(mission!.steps).toContain(ONBOARDING_STEPS.CREATE_ACCOUNT);
    });

    it("returns null for day 0", () => {
      expect(getMissionForDay(0, "normal")).toBeNull();
    });

    it("returns null for day 8", () => {
      expect(getMissionForDay(8, "normal")).toBeNull();
    });

    it("returns null for negative day", () => {
      expect(getMissionForDay(-1, "easy")).toBeNull();
    });

    it("returns mission for day 7 challenging", () => {
      const mission = getMissionForDay(7, "challenging");
      expect(mission).not.toBeNull();
      expect(mission!.day).toBe(7);
    });
  });

  describe("getCurrentDay", () => {
    it("returns 1 on the same day", () => {
      expect(getCurrentDay("2026-01-10", "2026-01-10")).toBe(1);
    });

    it("returns 2 on the next day", () => {
      expect(getCurrentDay("2026-01-10", "2026-01-11")).toBe(2);
    });

    it("returns 7 at max for 6 days later", () => {
      expect(getCurrentDay("2026-01-10", "2026-01-16")).toBe(7);
    });

    it("caps at 7 for dates beyond 7 days", () => {
      expect(getCurrentDay("2026-01-01", "2026-01-20")).toBe(7);
    });

    it("returns 1 when today is before start date", () => {
      expect(getCurrentDay("2026-01-10", "2026-01-09")).toBe(1);
    });
  });

  describe("isOnboardingComplete", () => {
    it("returns true when finished is true", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        finished: true,
      };
      expect(isOnboardingComplete(state)).toBe(true);
    });

    it("returns true when 7 days completed", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        completedDays: [1, 2, 3, 4, 5, 6, 7],
      };
      expect(isOnboardingComplete(state)).toBe(true);
    });

    it("returns false when not finished and less than 7 days", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        completedDays: [1, 2, 3],
      };
      expect(isOnboardingComplete(state)).toBe(false);
    });
  });

  describe("getDayProgress", () => {
    it("returns correct progress when step is completed", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        difficulty: "normal",
        completedSteps: [ONBOARDING_STEPS.CREATE_ACCOUNT],
      };
      const progress = getDayProgress(state, 1);
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(1);
      expect(progress.percent).toBe(100);
    });

    it("returns zero progress for uncompleted day", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        difficulty: "normal",
        completedSteps: [],
      };
      const progress = getDayProgress(state, 1);
      expect(progress.completed).toBe(0);
      expect(progress.total).toBe(1);
      expect(progress.percent).toBe(0);
    });

    it("returns zero for invalid day", () => {
      const state = createInitialOnboardingState();
      const progress = getDayProgress(state, 99);
      expect(progress.completed).toBe(0);
      expect(progress.total).toBe(0);
      expect(progress.percent).toBe(0);
    });
  });

  describe("getOverallProgress", () => {
    it("returns 0 when no days completed", () => {
      const state = createInitialOnboardingState();
      expect(getOverallProgress(state)).toBe(0);
    });

    it("returns 100 when all 7 days completed", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        completedDays: [1, 2, 3, 4, 5, 6, 7],
      };
      expect(getOverallProgress(state)).toBe(100);
    });

    it("returns approximate percentage for partial completion", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        completedDays: [1, 2, 3],
      };
      expect(getOverallProgress(state)).toBe(43);
    });
  });
});

describe("adaptiveMissionEngine", () => {
  describe("evaluatePerformance", () => {
    it("does not adjust before day 3", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        started: true,
        currentDay: 2,
        difficulty: "normal",
        completedDays: [],
      };
      const result = evaluatePerformance(state);
      expect(result.shouldAdjust).toBe(false);
    });

    it("adjusts to easy when completion rate < 40% and not already easy", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        started: true,
        currentDay: 5,
        difficulty: "normal",
        completedDays: [1],
      };
      const result = evaluatePerformance(state);
      expect(result.shouldAdjust).toBe(true);
      expect(result.newDifficulty).toBe("easy");
    });

    it("does not adjust to easy when already easy", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        started: true,
        currentDay: 5,
        difficulty: "easy",
        completedDays: [1],
      };
      const result = evaluatePerformance(state);
      expect(result.shouldAdjust).toBe(false);
    });

    it("adjusts challenging down to normal when rate < 60%", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        started: true,
        currentDay: 5,
        difficulty: "challenging",
        completedDays: [1, 2],
      };
      const result = evaluatePerformance(state);
      expect(result.shouldAdjust).toBe(true);
      expect(result.newDifficulty).toBe("normal");
    });

    it("upgrades easy to normal when rate >= 90% and day >= 4", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        started: true,
        currentDay: 4,
        difficulty: "easy",
        completedDays: [1, 2, 3],
      };
      const result = evaluatePerformance(state);
      expect(result.shouldAdjust).toBe(true);
      expect(result.newDifficulty).toBe("normal");
    });

    it("upgrades normal to challenging when rate >= 95% and day >= 5", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        started: true,
        currentDay: 5,
        difficulty: "normal",
        completedDays: [1, 2, 3, 4],
      };
      const result = evaluatePerformance(state);
      expect(result.shouldAdjust).toBe(true);
      expect(result.newDifficulty).toBe("challenging");
    });

    it("does not upgrade when day is too early", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        started: true,
        currentDay: 3,
        difficulty: "easy",
        completedDays: [1, 2],
      };
      const result = evaluatePerformance(state);
      expect(result.shouldAdjust).toBe(false);
    });
  });

  describe("shouldNeverPunish", () => {
    it("always returns true", () => {
      expect(shouldNeverPunish()).toBe(true);
    });
  });

  describe("getEncouragementMessage", () => {
    it("returns fantastic message for rate >= 0.9", () => {
      const msg = getEncouragementMessage(0.95, "normal");
      expect(msg).toContain("Fantastico");
    });

    it("returns good message for rate >= 0.7", () => {
      const msg = getEncouragementMessage(0.75, "normal");
      expect(msg).toContain("Muito bem");
    });

    it("returns progress message for rate >= 0.5", () => {
      const msg = getEncouragementMessage(0.55, "normal");
      expect(msg).toContain("Bom progresso");
    });

    it("returns no rush message for rate >= 0.3", () => {
      const msg = getEncouragementMessage(0.35, "normal");
      expect(msg).toContain("Sem pressa");
    });

    it("returns help message for rate < 0.3", () => {
      const msg = getEncouragementMessage(0.1, "easy");
      expect(msg).toContain("Estamos aqui");
    });
  });
});

describe("reducer", () => {
  describe("createInitialOnboardingState", () => {
    it("returns correct defaults", () => {
      const state = createInitialOnboardingState();
      expect(state.started).toBe(false);
      expect(state.finished).toBe(false);
      expect(state.startDate).toBe("");
      expect(state.currentDay).toBe(0);
      expect(state.difficulty).toBe("normal");
      expect(state.completedSteps).toEqual([]);
      expect(state.completedDays).toEqual([]);
      expect(state.adjustments).toBe(0);
    });
  });

  describe("ONBOARDING_STARTED", () => {
    it("sets started, startDate, difficulty", () => {
      const state = createInitialOnboardingState();
      const event = makeEvent(ONBOARDING_EVENTS.ONBOARDING_STARTED, {
        userId: "u1",
        startDate: "2026-01-10",
        difficulty: "easy",
      }) as OnboardingEvent;

      const next = onboardingReducer(state, event);
      expect(next.started).toBe(true);
      expect(next.startDate).toBe("2026-01-10");
      expect(next.difficulty).toBe("easy");
      expect(next.currentDay).toBe(1);
    });
  });

  describe("ONBOARDING_STEP_COMPLETED", () => {
    it("adds step to completedSteps", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        started: true,
        currentDay: 1,
      };
      const event = makeEvent(ONBOARDING_EVENTS.ONBOARDING_STEP_COMPLETED, {
        step: ONBOARDING_STEPS.CREATE_ACCOUNT,
        day: 1,
        completedAt: new Date().toISOString(),
      }) as OnboardingEvent;

      const next = onboardingReducer(state, event);
      expect(next.completedSteps).toContain(ONBOARDING_STEPS.CREATE_ACCOUNT);
    });

    it("deduplicates steps", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        started: true,
        currentDay: 1,
        completedSteps: [ONBOARDING_STEPS.CREATE_ACCOUNT],
      };
      const event = makeEvent(ONBOARDING_EVENTS.ONBOARDING_STEP_COMPLETED, {
        step: ONBOARDING_STEPS.CREATE_ACCOUNT,
        day: 1,
        completedAt: new Date().toISOString(),
      }) as OnboardingEvent;

      const next = onboardingReducer(state, event);
      expect(next.completedSteps.filter((s) => s === ONBOARDING_STEPS.CREATE_ACCOUNT)).toHaveLength(1);
    });
  });

  describe("ONBOARDING_DAY_COMPLETED", () => {
    it("adds day to completedDays", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        started: true,
        currentDay: 1,
      };
      const event = makeEvent(ONBOARDING_EVENTS.ONBOARDING_DAY_COMPLETED, {
        day: 1,
        completedAt: new Date().toISOString(),
        stepsCompleted: 1,
        totalSteps: 1,
      }) as OnboardingEvent;

      const next = onboardingReducer(state, event);
      expect(next.completedDays).toContain(1);
    });

    it("deduplicates days", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        started: true,
        currentDay: 1,
        completedDays: [1],
      };
      const event = makeEvent(ONBOARDING_EVENTS.ONBOARDING_DAY_COMPLETED, {
        day: 1,
        completedAt: new Date().toISOString(),
        stepsCompleted: 1,
        totalSteps: 1,
      }) as OnboardingEvent;

      const next = onboardingReducer(state, event);
      expect(next.completedDays.filter((d) => d === 1)).toHaveLength(1);
    });
  });

  describe("ONBOARDING_ADJUSTED", () => {
    it("updates difficulty and increments adjustments", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        started: true,
        currentDay: 3,
        difficulty: "normal",
        adjustments: 0,
      };
      const event = makeEvent(ONBOARDING_EVENTS.ONBOARDING_ADJUSTED, {
        previousDifficulty: "normal",
        newDifficulty: "easy",
        reason: "too hard",
        day: 3,
      }) as OnboardingEvent;

      const next = onboardingReducer(state, event);
      expect(next.difficulty).toBe("easy");
      expect(next.adjustments).toBe(1);
    });
  });

  describe("ONBOARDING_FINISHED", () => {
    it("sets finished to true", () => {
      const state: OnboardingState = {
        ...createInitialOnboardingState(),
        started: true,
        currentDay: 7,
      };
      const event = makeEvent(ONBOARDING_EVENTS.ONBOARDING_FINISHED, {
        finishedAt: new Date().toISOString(),
        totalDays: 7,
        finalDifficulty: "normal",
      }) as OnboardingEvent;

      const next = onboardingReducer(state, event);
      expect(next.finished).toBe(true);
    });
  });

  describe("replayOnboardingEvents", () => {
    it("reconstructs state from event sequence", () => {
      const events = [
        makeEvent(ONBOARDING_EVENTS.ONBOARDING_STARTED, {
          userId: "u1",
          startDate: "2026-01-10",
          difficulty: "normal",
        }),
        makeEvent(ONBOARDING_EVENTS.ONBOARDING_STEP_COMPLETED, {
          step: ONBOARDING_STEPS.CREATE_ACCOUNT,
          day: 1,
          completedAt: "2026-01-10T10:00:00Z",
        }),
        makeEvent(ONBOARDING_EVENTS.ONBOARDING_DAY_COMPLETED, {
          day: 1,
          completedAt: "2026-01-10T18:00:00Z",
          stepsCompleted: 1,
          totalSteps: 1,
        }),
        makeEvent(ONBOARDING_EVENTS.ONBOARDING_ADJUSTED, {
          previousDifficulty: "normal",
          newDifficulty: "easy",
          reason: "test",
          day: 3,
        }),
        makeEvent(ONBOARDING_EVENTS.ONBOARDING_FINISHED, {
          finishedAt: "2026-01-17T00:00:00Z",
          totalDays: 7,
          finalDifficulty: "easy",
        }),
      ] as OnboardingEvent[];

      const state = replayOnboardingEvents(events);
      expect(state.started).toBe(true);
      expect(state.finished).toBe(true);
      expect(state.difficulty).toBe("easy");
      expect(state.completedSteps).toContain(ONBOARDING_STEPS.CREATE_ACCOUNT);
      expect(state.completedDays).toContain(1);
      expect(state.adjustments).toBe(1);
    });
  });

  describe("immutability", () => {
    it("does not mutate the original state", () => {
      const state = createInitialOnboardingState();
      const original = { ...state, completedSteps: [...state.completedSteps], completedDays: [...state.completedDays] };

      const event = makeEvent(ONBOARDING_EVENTS.ONBOARDING_STARTED, {
        userId: "u1",
        startDate: "2026-01-10",
        difficulty: "challenging",
      }) as OnboardingEvent;

      onboardingReducer(state, event);
      expect(state.started).toBe(original.started);
      expect(state.difficulty).toBe(original.difficulty);
      expect(state.startDate).toBe(original.startDate);
    });
  });
});
