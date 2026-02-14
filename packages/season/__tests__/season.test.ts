import { describe, it, expect } from "vitest";
import {
  SEASON_EVENTS,
  createSeasonId,
  startSeason,
  endSeason,
  evaluateSeason,
  isSeasonActive,
  getSeasonMonth,
  shouldEndSeason,
  createInitialSeasonState,
  seasonReducer,
  replaySeasonEvents,
} from "../index";
import type {
  SeasonEvent,
  SeasonState,
  SeasonStartedPayload,
  SeasonEndedPayload,
  SeasonEvaluatedPayload,
  ArchetypeEvolvedPayload,
  SeasonBadgeEarnedPayload,
} from "../index";

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

describe("seasonEngine", () => {
  describe("createSeasonId", () => {
    it("should format year and month correctly", () => {
      expect(createSeasonId(2026, 2)).toBe("2026-02");
    });

    it("should pad single digit months", () => {
      expect(createSeasonId(2026, 1)).toBe("2026-01");
      expect(createSeasonId(2026, 9)).toBe("2026-09");
    });

    it("should not pad double digit months", () => {
      expect(createSeasonId(2026, 12)).toBe("2026-12");
      expect(createSeasonId(2026, 10)).toBe("2026-10");
    });
  });

  describe("startSeason", () => {
    it("should return a valid SeasonStartedPayload", () => {
      const result = startSeason(2026, 2);
      expect(result.seasonId).toBe("2026-02");
      expect(result.year).toBe(2026);
      expect(result.month).toBe(2);
      expect(result.startDate).toBeDefined();
    });

    it("should set startDate to the first of the month", () => {
      const result = startSeason(2026, 3);
      const d = new Date(result.startDate);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(2);
      expect(d.getDate()).toBe(1);
    });
  });

  describe("endSeason", () => {
    it("should return a valid SeasonEndedPayload", () => {
      const result = endSeason("2026-02");
      expect(result.seasonId).toBe("2026-02");
      expect(result.endDate).toBeDefined();
    });

    it("should set endDate to current time", () => {
      const before = Date.now();
      const result = endSeason("2026-02");
      const after = Date.now();
      const endTime = new Date(result.endDate).getTime();
      expect(endTime).toBeGreaterThanOrEqual(before);
      expect(endTime).toBeLessThanOrEqual(after);
    });
  });

  describe("evaluateSeason", () => {
    it("should return a valid SeasonEvaluatedPayload", () => {
      const result = evaluateSeason("2026-02", 500, 5, 85, 20, "saver");
      expect(result).toEqual({
        seasonId: "2026-02",
        totalXp: 500,
        level: 5,
        budgetScore: 85,
        streakDays: 20,
        archetype: "saver",
      });
    });
  });

  describe("isSeasonActive", () => {
    it("should return false for initial state", () => {
      expect(isSeasonActive(createInitialSeasonState())).toBe(false);
    });

    it("should return true when season is active", () => {
      const state: SeasonState = {
        ...createInitialSeasonState(),
        currentSeason: {
          seasonId: "2026-02",
          year: 2026,
          month: 2,
          startDate: "2026-02-01T00:00:00.000Z",
          active: true,
        },
      };
      expect(isSeasonActive(state)).toBe(true);
    });

    it("should return false when season is inactive", () => {
      const state: SeasonState = {
        ...createInitialSeasonState(),
        currentSeason: {
          seasonId: "2026-02",
          year: 2026,
          month: 2,
          startDate: "2026-02-01T00:00:00.000Z",
          active: false,
        },
      };
      expect(isSeasonActive(state)).toBe(false);
    });
  });

  describe("getSeasonMonth", () => {
    it("should extract year and month from date string", () => {
      const result = getSeasonMonth("2026-02-14T00:00:00.000Z");
      expect(result.year).toBe(2026);
      expect(result.month).toBe(2);
    });

    it("should handle different date formats", () => {
      const result = getSeasonMonth("2026-12-25");
      expect(result.year).toBe(2026);
      expect(result.month).toBe(12);
    });
  });

  describe("shouldEndSeason", () => {
    it("should return false when same month and year", () => {
      expect(shouldEndSeason("2026-02-14T00:00:00.000Z", 2, 2026)).toBe(false);
    });

    it("should return true when different month", () => {
      expect(shouldEndSeason("2026-03-01T00:00:00.000Z", 2, 2026)).toBe(true);
    });

    it("should return true when different year", () => {
      expect(shouldEndSeason("2027-02-01T00:00:00.000Z", 2, 2026)).toBe(true);
    });

    it("should return true when both year and month differ", () => {
      expect(shouldEndSeason("2027-05-15T00:00:00.000Z", 2, 2026)).toBe(true);
    });
  });
});

describe("seasonReducer", () => {
  it("should handle SEASON_STARTED", () => {
    const state = createInitialSeasonState();
    const event = makeEvent(SEASON_EVENTS.SEASON_STARTED, {
      seasonId: "2026-02",
      year: 2026,
      month: 2,
      startDate: "2026-02-01T00:00:00.000Z",
    }) as SeasonEvent;

    const next = seasonReducer(state, event);
    expect(next.currentSeason).toEqual({
      seasonId: "2026-02",
      year: 2026,
      month: 2,
      startDate: "2026-02-01T00:00:00.000Z",
      active: true,
    });
  });

  it("should handle SEASON_ENDED", () => {
    const state: SeasonState = {
      ...createInitialSeasonState(),
      currentSeason: {
        seasonId: "2026-02",
        year: 2026,
        month: 2,
        startDate: "2026-02-01T00:00:00.000Z",
        active: true,
      },
    };
    const event = makeEvent(SEASON_EVENTS.SEASON_ENDED, {
      seasonId: "2026-02",
      endDate: "2026-02-28T23:59:59.000Z",
    }) as SeasonEvent;

    const next = seasonReducer(state, event);
    expect(next.currentSeason?.active).toBe(false);
  });

  it("should handle SEASON_ENDED when no current season", () => {
    const state = createInitialSeasonState();
    const event = makeEvent(SEASON_EVENTS.SEASON_ENDED, {
      seasonId: "2026-02",
      endDate: "2026-02-28T23:59:59.000Z",
    }) as SeasonEvent;

    const next = seasonReducer(state, event);
    expect(next.currentSeason).toBeNull();
  });

  it("should handle SEASON_EVALUATED", () => {
    const state = createInitialSeasonState();
    const payload: SeasonEvaluatedPayload = {
      seasonId: "2026-02",
      totalXp: 1200,
      level: 8,
      budgetScore: 92,
      streakDays: 25,
      archetype: "investor",
    };
    const event = makeEvent(SEASON_EVENTS.SEASON_EVALUATED, payload) as SeasonEvent;

    const next = seasonReducer(state, event);
    expect(next.history).toHaveLength(1);
    expect(next.history[0]).toEqual(payload);
    expect(next.currentArchetype).toBe("investor");
  });

  it("should handle ARCHETYPE_EVOLVED", () => {
    const state: SeasonState = {
      ...createInitialSeasonState(),
      currentArchetype: "saver",
    };
    const event = makeEvent(SEASON_EVENTS.ARCHETYPE_EVOLVED, {
      previousArchetype: "saver",
      newArchetype: "investor",
      reason: "Consistent investment behavior",
    }) as SeasonEvent;

    const next = seasonReducer(state, event);
    expect(next.currentArchetype).toBe("investor");
  });

  it("should handle SEASON_BADGE_EARNED", () => {
    const state = createInitialSeasonState();
    const badge: SeasonBadgeEarnedPayload = {
      badgeId: "badge-1",
      name: "Budget Master",
      description: "Maintained 90%+ budget score",
      seasonId: "2026-02",
    };
    const event = makeEvent(SEASON_EVENTS.SEASON_BADGE_EARNED, badge) as SeasonEvent;

    const next = seasonReducer(state, event);
    expect(next.badges).toHaveLength(1);
    expect(next.badges[0]).toEqual(badge);
  });

  it("should accumulate multiple badges", () => {
    let state = createInitialSeasonState();
    const badge1 = makeEvent(SEASON_EVENTS.SEASON_BADGE_EARNED, {
      badgeId: "badge-1",
      name: "Budget Master",
      description: "90%+ budget score",
      seasonId: "2026-02",
    }) as SeasonEvent;
    const badge2 = makeEvent(SEASON_EVENTS.SEASON_BADGE_EARNED, {
      badgeId: "badge-2",
      name: "Streak King",
      description: "30 day streak",
      seasonId: "2026-02",
    }) as SeasonEvent;

    state = seasonReducer(state, badge1);
    state = seasonReducer(state, badge2);
    expect(state.badges).toHaveLength(2);
  });

  it("should accumulate history from multiple evaluations", () => {
    let state = createInitialSeasonState();
    const eval1 = makeEvent(SEASON_EVENTS.SEASON_EVALUATED, {
      seasonId: "2026-01",
      totalXp: 500,
      level: 3,
      budgetScore: 70,
      streakDays: 10,
      archetype: "saver",
    }) as SeasonEvent;
    const eval2 = makeEvent(SEASON_EVENTS.SEASON_EVALUATED, {
      seasonId: "2026-02",
      totalXp: 800,
      level: 5,
      budgetScore: 85,
      streakDays: 20,
      archetype: "investor",
    }) as SeasonEvent;

    state = seasonReducer(state, eval1);
    state = seasonReducer(state, eval2);
    expect(state.history).toHaveLength(2);
    expect(state.currentArchetype).toBe("investor");
  });

  it("should return same state for unknown event type", () => {
    const state = createInitialSeasonState();
    const event = makeEvent("UNKNOWN_EVENT", {}) as SeasonEvent;
    const next = seasonReducer(state, event);
    expect(next).toBe(state);
  });

  it("should not mutate original state on SEASON_STARTED", () => {
    const state = createInitialSeasonState();
    const event = makeEvent(SEASON_EVENTS.SEASON_STARTED, {
      seasonId: "2026-02",
      year: 2026,
      month: 2,
      startDate: "2026-02-01T00:00:00.000Z",
    }) as SeasonEvent;

    const next = seasonReducer(state, event);
    expect(state.currentSeason).toBeNull();
    expect(next.currentSeason).not.toBeNull();
  });

  it("should not mutate original state on SEASON_BADGE_EARNED", () => {
    const state = createInitialSeasonState();
    const event = makeEvent(SEASON_EVENTS.SEASON_BADGE_EARNED, {
      badgeId: "badge-1",
      name: "Test",
      description: "Test badge",
      seasonId: "2026-02",
    }) as SeasonEvent;

    const next = seasonReducer(state, event);
    expect(state.badges).toHaveLength(0);
    expect(next.badges).toHaveLength(1);
  });

  it("should not mutate original state on SEASON_EVALUATED", () => {
    const state = createInitialSeasonState();
    const event = makeEvent(SEASON_EVENTS.SEASON_EVALUATED, {
      seasonId: "2026-02",
      totalXp: 100,
      level: 1,
      budgetScore: 50,
      streakDays: 5,
      archetype: "beginner",
    }) as SeasonEvent;

    const next = seasonReducer(state, event);
    expect(state.history).toHaveLength(0);
    expect(state.currentArchetype).toBe("");
    expect(next.history).toHaveLength(1);
    expect(next.currentArchetype).toBe("beginner");
  });
});

describe("replaySeasonEvents", () => {
  it("should return initial state for empty events", () => {
    const state = replaySeasonEvents([]);
    expect(state).toEqual(createInitialSeasonState());
  });

  it("should reconstruct state from event sequence", () => {
    const events: SeasonEvent[] = [
      makeEvent(SEASON_EVENTS.SEASON_STARTED, {
        seasonId: "2026-02",
        year: 2026,
        month: 2,
        startDate: "2026-02-01T00:00:00.000Z",
      }),
      makeEvent(SEASON_EVENTS.SEASON_BADGE_EARNED, {
        badgeId: "badge-1",
        name: "First Season",
        description: "Started first season",
        seasonId: "2026-02",
      }),
      makeEvent(SEASON_EVENTS.SEASON_EVALUATED, {
        seasonId: "2026-02",
        totalXp: 1000,
        level: 5,
        budgetScore: 88,
        streakDays: 28,
        archetype: "saver",
      }),
      makeEvent(SEASON_EVENTS.SEASON_ENDED, {
        seasonId: "2026-02",
        endDate: "2026-02-28T23:59:59.000Z",
      }),
    ] as SeasonEvent[];

    const state = replaySeasonEvents(events);
    expect(state.currentSeason?.active).toBe(false);
    expect(state.history).toHaveLength(1);
    expect(state.badges).toHaveLength(1);
    expect(state.currentArchetype).toBe("saver");
  });

  it("should handle full lifecycle: start -> evaluate -> end -> start new", () => {
    const events: SeasonEvent[] = [
      makeEvent(SEASON_EVENTS.SEASON_STARTED, {
        seasonId: "2026-01",
        year: 2026,
        month: 1,
        startDate: "2026-01-01T00:00:00.000Z",
      }),
      makeEvent(SEASON_EVENTS.SEASON_EVALUATED, {
        seasonId: "2026-01",
        totalXp: 500,
        level: 3,
        budgetScore: 75,
        streakDays: 15,
        archetype: "saver",
      }),
      makeEvent(SEASON_EVENTS.SEASON_ENDED, {
        seasonId: "2026-01",
        endDate: "2026-01-31T23:59:59.000Z",
      }),
      makeEvent(SEASON_EVENTS.SEASON_STARTED, {
        seasonId: "2026-02",
        year: 2026,
        month: 2,
        startDate: "2026-02-01T00:00:00.000Z",
      }),
    ] as SeasonEvent[];

    const state = replaySeasonEvents(events);
    expect(state.currentSeason?.seasonId).toBe("2026-02");
    expect(state.currentSeason?.active).toBe(true);
    expect(state.history).toHaveLength(1);
    expect(state.history[0].seasonId).toBe("2026-01");
  });

  it("should track archetype evolution across seasons", () => {
    const events: SeasonEvent[] = [
      makeEvent(SEASON_EVENTS.SEASON_STARTED, {
        seasonId: "2026-01",
        year: 2026,
        month: 1,
        startDate: "2026-01-01T00:00:00.000Z",
      }),
      makeEvent(SEASON_EVENTS.SEASON_EVALUATED, {
        seasonId: "2026-01",
        totalXp: 500,
        level: 3,
        budgetScore: 75,
        streakDays: 15,
        archetype: "saver",
      }),
      makeEvent(SEASON_EVENTS.ARCHETYPE_EVOLVED, {
        previousArchetype: "saver",
        newArchetype: "investor",
        reason: "Increased investment activity",
      }),
      makeEvent(SEASON_EVENTS.ARCHETYPE_EVOLVED, {
        previousArchetype: "investor",
        newArchetype: "strategist",
        reason: "Diversified portfolio",
      }),
    ] as SeasonEvent[];

    const state = replaySeasonEvents(events);
    expect(state.currentArchetype).toBe("strategist");
  });

  it("should accumulate badges across multiple seasons", () => {
    const events: SeasonEvent[] = [
      makeEvent(SEASON_EVENTS.SEASON_BADGE_EARNED, {
        badgeId: "b1",
        name: "Badge 1",
        description: "First badge",
        seasonId: "2026-01",
      }),
      makeEvent(SEASON_EVENTS.SEASON_BADGE_EARNED, {
        badgeId: "b2",
        name: "Badge 2",
        description: "Second badge",
        seasonId: "2026-01",
      }),
      makeEvent(SEASON_EVENTS.SEASON_BADGE_EARNED, {
        badgeId: "b3",
        name: "Badge 3",
        description: "Third badge",
        seasonId: "2026-02",
      }),
    ] as SeasonEvent[];

    const state = replaySeasonEvents(events);
    expect(state.badges).toHaveLength(3);
  });
});

describe("SEASON_EVENTS constants", () => {
  it("should have all expected event types", () => {
    expect(SEASON_EVENTS.SEASON_STARTED).toBe("SEASON_STARTED");
    expect(SEASON_EVENTS.SEASON_ENDED).toBe("SEASON_ENDED");
    expect(SEASON_EVENTS.SEASON_EVALUATED).toBe("SEASON_EVALUATED");
    expect(SEASON_EVENTS.ARCHETYPE_EVOLVED).toBe("ARCHETYPE_EVOLVED");
    expect(SEASON_EVENTS.SEASON_BADGE_EARNED).toBe("SEASON_BADGE_EARNED");
  });

  it("should have exactly 5 event types", () => {
    expect(Object.keys(SEASON_EVENTS)).toHaveLength(5);
  });
});
