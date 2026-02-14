import { describe, it, expect } from "vitest";
import {
  ARCHETYPES,
  PERSONALITY_EVENTS,
  type ArchetypeScores,
  type ArchetypeType,
  type PersonalityEvent,
} from "../src/types";
import { detectArchetype, calculateScores } from "../src/profileDetector";
import { shouldEvolve, evolveArchetype, getArchetypeDescription } from "../src/archetypeEngine";
import { getTone } from "../src/toneEngine";
import {
  createInitialPersonalityState,
  personalityReducer,
  replayPersonalityEvents,
} from "../src/reducer";

function makeEvent(type: string, payload: any, timestamp?: number): PersonalityEvent {
  return {
    id: "e-" + Math.random().toString(36).substring(2, 8),
    type,
    payload,
    timestamp: timestamp ?? Date.now(),
    deviceId: "local",
    signature: "",
  } as PersonalityEvent;
}

function makeScores(overrides: Partial<ArchetypeScores> = {}): ArchetypeScores {
  return {
    consistency: 0,
    budgetAdherence: 0,
    wishlistUsage: 0,
    desireControl: 0,
    monthlyPlanning: 0,
    ...overrides,
  };
}

describe("profileDetector", () => {
  describe("detectArchetype", () => {
    it("returns EXPLORER for all zeros", () => {
      expect(detectArchetype(makeScores())).toBe(ARCHETYPES.EXPLORER);
    });

    it("returns EXPLORER for low scores", () => {
      expect(detectArchetype(makeScores({ consistency: 30, budgetAdherence: 20 }))).toBe(ARCHETYPES.EXPLORER);
    });

    it("returns ORGANIZER when consistency >= 60 and budgetAdherence >= 50", () => {
      expect(detectArchetype(makeScores({ consistency: 60, budgetAdherence: 50 }))).toBe(ARCHETYPES.ORGANIZER);
    });

    it("returns PLANNER when monthlyPlanning >= 60 and consistency >= 50", () => {
      expect(detectArchetype(makeScores({ monthlyPlanning: 60, consistency: 50 }))).toBe(ARCHETYPES.PLANNER);
    });

    it("returns STRATEGIST when monthlyPlanning >= 70 and desireControl >= 70", () => {
      expect(detectArchetype(makeScores({ monthlyPlanning: 70, desireControl: 70 }))).toBe(ARCHETYPES.STRATEGIST);
    });

    it("returns INVESTOR when budgetAdherence >= 80 and monthlyPlanning >= 70", () => {
      expect(detectArchetype(makeScores({ budgetAdherence: 80, monthlyPlanning: 70 }))).toBe(ARCHETYPES.INVESTOR);
    });

    it("returns INDEPENDENT when all scores >= 80", () => {
      expect(
        detectArchetype(makeScores({
          consistency: 80,
          budgetAdherence: 80,
          wishlistUsage: 80,
          desireControl: 80,
          monthlyPlanning: 80,
        })),
      ).toBe(ARCHETYPES.INDEPENDENT);
    });

    it("returns INDEPENDENT when all scores are 100", () => {
      expect(
        detectArchetype(makeScores({
          consistency: 100,
          budgetAdherence: 100,
          wishlistUsage: 100,
          desireControl: 100,
          monthlyPlanning: 100,
        })),
      ).toBe(ARCHETYPES.INDEPENDENT);
    });

    it("INDEPENDENT takes priority over INVESTOR", () => {
      expect(
        detectArchetype(makeScores({
          consistency: 90,
          budgetAdherence: 90,
          wishlistUsage: 90,
          desireControl: 90,
          monthlyPlanning: 90,
        })),
      ).toBe(ARCHETYPES.INDEPENDENT);
    });

    it("INVESTOR takes priority over STRATEGIST when both match", () => {
      expect(
        detectArchetype(makeScores({
          budgetAdherence: 85,
          monthlyPlanning: 75,
          desireControl: 75,
        })),
      ).toBe(ARCHETYPES.INVESTOR);
    });

    it("PLANNER takes priority over ORGANIZER when both match", () => {
      expect(
        detectArchetype(makeScores({
          monthlyPlanning: 65,
          consistency: 65,
          budgetAdherence: 55,
        })),
      ).toBe(ARCHETYPES.PLANNER);
    });

    it("returns EXPLORER when scores are just below ORGANIZER threshold", () => {
      expect(detectArchetype(makeScores({ consistency: 59, budgetAdherence: 50 }))).toBe(ARCHETYPES.EXPLORER);
    });

    it("returns EXPLORER when only one score is high", () => {
      expect(detectArchetype(makeScores({ monthlyPlanning: 90 }))).toBe(ARCHETYPES.EXPLORER);
    });
  });

  describe("calculateScores", () => {
    it("returns all zeros for zero metrics", () => {
      const scores = calculateScores({
        transactionCount: 0,
        daysActive: 0,
        budgetAdherencePercent: 0,
        wishlistItemsTracked: 0,
        desiresSaved: 0,
        monthsPlanned: 0,
      });
      expect(scores.consistency).toBe(0);
      expect(scores.budgetAdherence).toBe(0);
      expect(scores.wishlistUsage).toBe(0);
      expect(scores.desireControl).toBe(0);
      expect(scores.monthlyPlanning).toBe(0);
    });

    it("caps scores at 100", () => {
      const scores = calculateScores({
        transactionCount: 1000,
        daysActive: 60,
        budgetAdherencePercent: 150,
        wishlistItemsTracked: 50,
        desiresSaved: 100,
        monthsPlanned: 12,
      });
      expect(scores.consistency).toBeLessThanOrEqual(100);
      expect(scores.budgetAdherence).toBeLessThanOrEqual(100);
      expect(scores.wishlistUsage).toBeLessThanOrEqual(100);
      expect(scores.desireControl).toBeLessThanOrEqual(100);
      expect(scores.monthlyPlanning).toBeLessThanOrEqual(100);
    });

    it("maps reasonable metrics to mid-range scores", () => {
      const scores = calculateScores({
        transactionCount: 50,
        daysActive: 15,
        budgetAdherencePercent: 70,
        wishlistItemsTracked: 5,
        desiresSaved: 10,
        monthsPlanned: 3,
      });
      expect(scores.consistency).toBe(50);
      expect(scores.budgetAdherence).toBe(70);
      expect(scores.wishlistUsage).toBe(50);
      expect(scores.desireControl).toBe(50);
      expect(scores.monthlyPlanning).toBe(50);
    });

    it("never returns negative scores", () => {
      const scores = calculateScores({
        transactionCount: -5,
        daysActive: -1,
        budgetAdherencePercent: -10,
        wishlistItemsTracked: -2,
        desiresSaved: -3,
        monthsPlanned: -1,
      });
      expect(scores.consistency).toBeGreaterThanOrEqual(0);
      expect(scores.budgetAdherence).toBeGreaterThanOrEqual(0);
      expect(scores.wishlistUsage).toBeGreaterThanOrEqual(0);
      expect(scores.desireControl).toBeGreaterThanOrEqual(0);
      expect(scores.monthlyPlanning).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("archetypeEngine", () => {
  describe("shouldEvolve", () => {
    it("returns false when archetype matches current", () => {
      expect(shouldEvolve(ARCHETYPES.EXPLORER, makeScores())).toBe(false);
    });

    it("returns true when scores indicate a different archetype", () => {
      expect(
        shouldEvolve(ARCHETYPES.EXPLORER, makeScores({ consistency: 70, budgetAdherence: 60 })),
      ).toBe(true);
    });

    it("returns false when current matches detected for ORGANIZER", () => {
      expect(
        shouldEvolve(ARCHETYPES.ORGANIZER, makeScores({ consistency: 65, budgetAdherence: 55 })),
      ).toBe(false);
    });

    it("returns true when ORGANIZER should become PLANNER", () => {
      expect(
        shouldEvolve(ARCHETYPES.ORGANIZER, makeScores({ monthlyPlanning: 65, consistency: 55 })),
      ).toBe(true);
    });
  });

  describe("evolveArchetype", () => {
    it("returns new archetype and reason", () => {
      const result = evolveArchetype(
        ARCHETYPES.EXPLORER,
        makeScores({ consistency: 70, budgetAdherence: 60 }),
      );
      expect(result.newArchetype).toBe(ARCHETYPES.ORGANIZER);
      expect(result.reason).toBeTruthy();
      expect(typeof result.reason).toBe("string");
    });

    it("returns INDEPENDENT with reason for max scores", () => {
      const result = evolveArchetype(
        ARCHETYPES.EXPLORER,
        makeScores({
          consistency: 90,
          budgetAdherence: 90,
          wishlistUsage: 90,
          desireControl: 90,
          monthlyPlanning: 90,
        }),
      );
      expect(result.newArchetype).toBe(ARCHETYPES.INDEPENDENT);
      expect(result.reason.length).toBeGreaterThan(0);
    });
  });

  describe("getArchetypeDescription", () => {
    it("returns name and description for EXPLORER", () => {
      const desc = getArchetypeDescription(ARCHETYPES.EXPLORER);
      expect(desc.name).toBe("Explorador");
      expect(desc.description).toBeTruthy();
    });

    it("returns name and description for INDEPENDENT", () => {
      const desc = getArchetypeDescription(ARCHETYPES.INDEPENDENT);
      expect(desc.name).toBe("Independente");
      expect(desc.description).toBeTruthy();
    });

    it("returns descriptions for all archetypes", () => {
      const archetypes = Object.values(ARCHETYPES) as ArchetypeType[];
      for (const archetype of archetypes) {
        const desc = getArchetypeDescription(archetype);
        expect(desc.name).toBeTruthy();
        expect(desc.description).toBeTruthy();
      }
    });
  });
});

describe("toneEngine", () => {
  it("returns motivational tone for EXPLORER", () => {
    const tone = getTone(ARCHETYPES.EXPLORER);
    expect(tone.style).toBe("motivational");
    expect(tone.messageTemplate).toBeTruthy();
  });

  it("returns motivational tone for ORGANIZER", () => {
    const tone = getTone(ARCHETYPES.ORGANIZER);
    expect(tone.style).toBe("motivational");
  });

  it("returns technical tone for PLANNER", () => {
    const tone = getTone(ARCHETYPES.PLANNER);
    expect(tone.style).toBe("technical");
  });

  it("returns technical tone for STRATEGIST", () => {
    const tone = getTone(ARCHETYPES.STRATEGIST);
    expect(tone.style).toBe("technical");
  });

  it("returns strategic tone for INVESTOR", () => {
    const tone = getTone(ARCHETYPES.INVESTOR);
    expect(tone.style).toBe("strategic");
  });

  it("returns strategic tone for INDEPENDENT", () => {
    const tone = getTone(ARCHETYPES.INDEPENDENT);
    expect(tone.style).toBe("strategic");
  });

  it("all tones have PT-BR message templates", () => {
    const archetypes = Object.values(ARCHETYPES) as ArchetypeType[];
    for (const archetype of archetypes) {
      const tone = getTone(archetype);
      expect(tone.messageTemplate.length).toBeGreaterThan(10);
    }
  });
});

describe("reducer", () => {
  it("creates initial state with EXPLORER and zero scores", () => {
    const state = createInitialPersonalityState();
    expect(state.currentArchetype).toBe(ARCHETYPES.EXPLORER);
    expect(state.scores.consistency).toBe(0);
    expect(state.scores.budgetAdherence).toBe(0);
    expect(state.scores.wishlistUsage).toBe(0);
    expect(state.scores.desireControl).toBe(0);
    expect(state.scores.monthlyPlanning).toBe(0);
    expect(state.history).toEqual([]);
  });

  it("processes ARCHETYPE_UPDATED event", () => {
    const state = createInitialPersonalityState();
    const scores = makeScores({ consistency: 70, budgetAdherence: 60 });
    const event = makeEvent(PERSONALITY_EVENTS.ARCHETYPE_UPDATED, {
      previousArchetype: ARCHETYPES.EXPLORER,
      newArchetype: ARCHETYPES.ORGANIZER,
      scores,
      reason: "Evolved",
    }, 1000);

    const newState = personalityReducer(state, event);
    expect(newState.currentArchetype).toBe(ARCHETYPES.ORGANIZER);
    expect(newState.scores).toEqual(scores);
    expect(newState.history).toHaveLength(1);
    expect(newState.history[0].archetype).toBe(ARCHETYPES.ORGANIZER);
    expect(newState.history[0].timestamp).toBe(1000);
  });

  it("preserves immutability - original state unchanged", () => {
    const state = createInitialPersonalityState();
    const scores = makeScores({ consistency: 70, budgetAdherence: 60 });
    const event = makeEvent(PERSONALITY_EVENTS.ARCHETYPE_UPDATED, {
      previousArchetype: ARCHETYPES.EXPLORER,
      newArchetype: ARCHETYPES.ORGANIZER,
      scores,
      reason: "Evolved",
    });

    const newState = personalityReducer(state, event);
    expect(state.currentArchetype).toBe(ARCHETYPES.EXPLORER);
    expect(state.history).toHaveLength(0);
    expect(newState).not.toBe(state);
  });

  it("replays multiple events in sequence", () => {
    const events: PersonalityEvent[] = [
      makeEvent(PERSONALITY_EVENTS.ARCHETYPE_UPDATED, {
        previousArchetype: ARCHETYPES.EXPLORER,
        newArchetype: ARCHETYPES.ORGANIZER,
        scores: makeScores({ consistency: 65, budgetAdherence: 55 }),
        reason: "First evolution",
      }, 1000),
      makeEvent(PERSONALITY_EVENTS.ARCHETYPE_UPDATED, {
        previousArchetype: ARCHETYPES.ORGANIZER,
        newArchetype: ARCHETYPES.PLANNER,
        scores: makeScores({ monthlyPlanning: 65, consistency: 55 }),
        reason: "Second evolution",
      }, 2000),
      makeEvent(PERSONALITY_EVENTS.ARCHETYPE_UPDATED, {
        previousArchetype: ARCHETYPES.PLANNER,
        newArchetype: ARCHETYPES.STRATEGIST,
        scores: makeScores({ monthlyPlanning: 75, desireControl: 75 }),
        reason: "Third evolution",
      }, 3000),
    ];

    const state = replayPersonalityEvents(events);
    expect(state.currentArchetype).toBe(ARCHETYPES.STRATEGIST);
    expect(state.history).toHaveLength(3);
    expect(state.history[0].archetype).toBe(ARCHETYPES.ORGANIZER);
    expect(state.history[1].archetype).toBe(ARCHETYPES.PLANNER);
    expect(state.history[2].archetype).toBe(ARCHETYPES.STRATEGIST);
  });

  it("replay with empty events returns initial state", () => {
    const state = replayPersonalityEvents([]);
    expect(state.currentArchetype).toBe(ARCHETYPES.EXPLORER);
    expect(state.history).toEqual([]);
  });

  it("scores in state are copies, not references", () => {
    const scores = makeScores({ consistency: 70, budgetAdherence: 60 });
    const event = makeEvent(PERSONALITY_EVENTS.ARCHETYPE_UPDATED, {
      previousArchetype: ARCHETYPES.EXPLORER,
      newArchetype: ARCHETYPES.ORGANIZER,
      scores,
      reason: "Test",
    });

    const state = personalityReducer(createInitialPersonalityState(), event);
    scores.consistency = 999;
    expect(state.scores.consistency).toBe(70);
  });
});
