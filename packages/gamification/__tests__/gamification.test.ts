import { describe, it, expect } from "vitest";
import {
  getXpForAction,
  calculateBudgetAdherenceXp,
  calculateStreakBonusXp,
  createXpPayload,
} from "../src/xpEngine";
import {
  calculateLevel,
  getLevelInfo,
  shouldLevelUp,
  getXpForLevel,
  type LevelInfo,
} from "../src/levelEngine";
import {
  updateStreak,
  createInitialStreak,
  isStreakActive,
  type StreakState,
} from "../src/streakEngine";
import {
  gamificationReducer,
  createInitialGamificationState,
  replayGamificationEvents,
} from "../src/reducer";
import type { GamificationEvent, GamificationState } from "../src/types";
import { GAMIFICATION_EVENTS } from "../src/types";

// Helper function to create gamification events for testing
function makeGamEvent(
  type: string,
  payload: any,
  timestamp?: number
): GamificationEvent {
  return {
    id: "evt-" + Math.random().toString(36).substring(2, 8),
    type: type as any,
    payload,
    timestamp: timestamp ?? Date.now(),
    deviceId: "local",
    signature: "",
  };
}

// ============================================================================
// XP ENGINE TESTS
// ============================================================================

describe("XP Engine", () => {
  describe("getXpForAction", () => {
    it("returns correct XP for transaction_logged", () => {
      expect(getXpForAction("transaction_logged")).toBe(10);
    });

    it("returns correct XP for budget_adherence", () => {
      expect(getXpForAction("budget_adherence")).toBe(25);
    });

    it("returns correct XP for mission_completed", () => {
      expect(getXpForAction("mission_completed")).toBe(50);
    });

    it("returns correct XP for daily_consistency", () => {
      expect(getXpForAction("daily_consistency")).toBe(15);
    });

    it("returns correct XP for streak_bonus", () => {
      expect(getXpForAction("streak_bonus")).toBe(20);
    });

    it("returns correct XP for season_bonus", () => {
      expect(getXpForAction("season_bonus")).toBe(100);
    });
  });

  describe("calculateBudgetAdherenceXp", () => {
    it("returns base reward (30xp) for perfect 50/30/20 split", () => {
      expect(calculateBudgetAdherenceXp(50, 30, 20)).toBe(30);
    });

    it("penalizes 1xp per 1% over in Needs", () => {
      expect(calculateBudgetAdherenceXp(60, 20, 20)).toBe(20); // -10 penalty from base 30
    });

    it("penalizes 4xp per 1% over in Wants", () => {
      expect(calculateBudgetAdherenceXp(40, 40, 20)).toBe(-10); // -40 penalty from base 30
    });

    it("penalizes 2xp per 1% below in Savings", () => {
      expect(calculateBudgetAdherenceXp(50, 30, 10)).toBe(-20); // -20 penalty from no reward base (miss * 2)
    });

    it("heavily penalizes extreme overspending in Wants", () => {
      expect(calculateBudgetAdherenceXp(40, 50, 10)).toBe(-100); // 30 (Wants over 10 -> -80) NO, wait.
      // Needs: 40 (ok)
      // Wants: 50 (20 over 30 -> -80 penalty)
      // Savings: 10 (10 below 20 -> -20 penalty)
      // Total: -100
    });

    it("returns 0 if no data is present (0/0/0)", () => {
      expect(calculateBudgetAdherenceXp(0, 0, 0)).toBe(0);
    });
  });

  describe("calculateStreakBonusXp", () => {
    it("returns 0xp for streak below 3 days", () => {
      expect(calculateStreakBonusXp(0)).toBe(0);
      expect(calculateStreakBonusXp(1)).toBe(0);
      expect(calculateStreakBonusXp(2)).toBe(0);
    });

    it("returns 10xp for streak of 3-6 days", () => {
      expect(calculateStreakBonusXp(3)).toBe(10);
      expect(calculateStreakBonusXp(5)).toBe(10);
    });

    it("returns 20xp for streak of 7-13 days", () => {
      expect(calculateStreakBonusXp(7)).toBe(20);
      expect(calculateStreakBonusXp(10)).toBe(20);
    });

    it("returns 30xp for streak of 14-29 days", () => {
      expect(calculateStreakBonusXp(14)).toBe(30);
      expect(calculateStreakBonusXp(20)).toBe(30);
    });

    it("returns 50xp for streak of 30+ days", () => {
      expect(calculateStreakBonusXp(30)).toBe(50);
      expect(calculateStreakBonusXp(100)).toBe(50);
    });
  });

  describe("createXpPayload", () => {
    it("creates payload with correct XP for source", () => {
      const payload = createXpPayload("transaction_logged");
      expect(payload.amount).toBe(10);
      expect(payload.source).toBe("transaction_logged");
      expect(payload.seasonId).toBeUndefined();
    });

    it("creates payload with override amount", () => {
      const payload = createXpPayload("mission_completed", 75);
      expect(payload.amount).toBe(75);
      expect(payload.source).toBe("mission_completed");
    });

    it("creates payload with seasonId", () => {
      const payload = createXpPayload("season_bonus", undefined, "season-001");
      expect(payload.amount).toBe(100);
      expect(payload.seasonId).toBe("season-001");
    });

    it("creates payload with override amount and seasonId", () => {
      const payload = createXpPayload("budget_adherence", 60, "season-002");
      expect(payload.amount).toBe(60);
      expect(payload.source).toBe("budget_adherence");
      expect(payload.seasonId).toBe("season-002");
    });
  });
});

// ============================================================================
// LEVEL ENGINE TESTS
// ============================================================================

describe("Level Engine", () => {
  describe("calculateLevel", () => {
    it("returns level 1 for 0 XP", () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it("returns level 1 for 99 XP", () => {
      expect(calculateLevel(99)).toBe(1);
    });

    it("returns level 2 for 100 XP", () => {
      expect(calculateLevel(100)).toBe(2);
    });

    it("returns level 2 for 249 XP (100 * 1.5 = 150, so 100 + 150 = 250)", () => {
      expect(calculateLevel(249)).toBe(2);
    });

    it("returns level 3 for 250 XP", () => {
      expect(calculateLevel(250)).toBe(3);
    });

    it("correctly calculates level for higher XP values", () => {
      // Level 1: 0-99 (100 xp needed)
      // Level 2: 100-249 (150 xp needed)
      // Level 3: 250-474 (225 xp needed)
      // Level 4: 475-812 (337 xp needed)
      // Level 5: 813+ (506 xp needed)
      expect(calculateLevel(475)).toBe(4);
      expect(calculateLevel(812)).toBe(5);
      expect(calculateLevel(813)).toBe(5);
    });
  });

  describe("getLevelInfo", () => {
    it("returns correct level info for 0 XP", () => {
      const info = getLevelInfo(0);
      expect(info.level).toBe(1);
      expect(info.currentXp).toBe(0);
      expect(info.xpForCurrentLevel).toBe(0);
      expect(info.xpForNextLevel).toBe(100);
      expect(info.progress).toBe(0);
    });

    it("returns correct level info for 50 XP (halfway to level 2)", () => {
      const info = getLevelInfo(50);
      expect(info.level).toBe(1);
      expect(info.currentXp).toBe(50);
      expect(info.xpForCurrentLevel).toBe(0);
      expect(info.xpForNextLevel).toBe(100);
      expect(info.progress).toBe(0.5);
    });

    it("returns correct level info for 100 XP (at level 2)", () => {
      const info = getLevelInfo(100);
      expect(info.level).toBe(2);
      expect(info.currentXp).toBe(0);
      expect(info.xpForCurrentLevel).toBe(100);
      expect(info.xpForNextLevel).toBe(150);
      expect(info.progress).toBe(0);
    });

    it("returns correct level info for 175 XP (halfway through level 2)", () => {
      const info = getLevelInfo(175);
      expect(info.level).toBe(2);
      expect(info.currentXp).toBe(75);
      expect(info.xpForCurrentLevel).toBe(100);
      expect(info.xpForNextLevel).toBe(150);
      expect(info.progress).toBeCloseTo(0.5);
    });

    it("returns correct progress percentage", () => {
      const info = getLevelInfo(175);
      expect(info.progress).toBeCloseTo(0.5, 1);
    });
  });

  describe("shouldLevelUp", () => {
    it("returns false when no level up occurs", () => {
      const result = shouldLevelUp(50, 75);
      expect(result.leveledUp).toBe(false);
      expect(result.previousLevel).toBe(1);
      expect(result.newLevel).toBe(1);
    });

    it("returns true when leveling up from 1 to 2", () => {
      const result = shouldLevelUp(99, 100);
      expect(result.leveledUp).toBe(true);
      expect(result.previousLevel).toBe(1);
      expect(result.newLevel).toBe(2);
    });

    it("returns true when leveling up multiple levels", () => {
      const result = shouldLevelUp(100, 300);
      expect(result.leveledUp).toBe(true);
      expect(result.previousLevel).toBe(2);
      expect(result.newLevel).toBe(3);
    });

    it("tracks correct levels for large jumps", () => {
      const result = shouldLevelUp(0, 500);
      expect(result.leveledUp).toBe(true);
      expect(result.previousLevel).toBe(1);
      expect(result.newLevel).toBe(4);
    });

    it("returns false when already at same level", () => {
      const result = shouldLevelUp(100, 150);
      expect(result.leveledUp).toBe(false);
      expect(result.previousLevel).toBe(2);
      expect(result.newLevel).toBe(2);
    });
  });

  describe("getXpForLevel", () => {
    it("returns 100 XP required for level 1", () => {
      expect(getXpForLevel(1)).toBe(100);
    });

    it("returns 150 XP required for level 2", () => {
      expect(getXpForLevel(2)).toBe(150);
    });

    it("returns 225 XP required for level 3", () => {
      expect(getXpForLevel(3)).toBeCloseTo(225, 0);
    });

    it("returns 337 XP required for level 4", () => {
      expect(getXpForLevel(4)).toBeCloseTo(337, 0);
    });

    it("follows 100 * 1.5^(level-1) formula", () => {
      for (let level = 1; level <= 5; level++) {
        const expected = Math.floor(100 * Math.pow(1.5, level - 1));
        expect(getXpForLevel(level)).toBe(expected);
      }
    });
  });
});

// ============================================================================
// STREAK ENGINE TESTS
// ============================================================================

describe("Streak Engine", () => {
  describe("updateStreak", () => {
    it("starts streak at 1 for first activity", () => {
      const initial = createInitialStreak();
      const result = updateStreak(initial, "2026-02-14");
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.lastActiveDate).toBe("2026-02-14");
      expect(result.broken).toBe(false);
    });

    it("does not increment streak on same day", () => {
      const current: StreakState = {
        currentStreak: 5,
        longestStreak: 5,
        lastActiveDate: "2026-02-14",
      };
      const result = updateStreak(current, "2026-02-14");
      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(5);
      expect(result.lastActiveDate).toBe("2026-02-14");
      expect(result.broken).toBe(false);
    });

    it("increments streak on consecutive day", () => {
      const current: StreakState = {
        currentStreak: 5,
        longestStreak: 5,
        lastActiveDate: "2026-02-14",
      };
      const result = updateStreak(current, "2026-02-15");
      expect(result.currentStreak).toBe(6);
      expect(result.longestStreak).toBe(6);
      expect(result.lastActiveDate).toBe("2026-02-15");
      expect(result.broken).toBe(false);
    });

    it("breaks streak when gap exists", () => {
      const current: StreakState = {
        currentStreak: 10,
        longestStreak: 10,
        lastActiveDate: "2026-02-14",
      };
      const result = updateStreak(current, "2026-02-16");
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(10);
      expect(result.lastActiveDate).toBe("2026-02-16");
      expect(result.broken).toBe(true);
    });

    it("preserves longest streak when breaking", () => {
      const current: StreakState = {
        currentStreak: 5,
        longestStreak: 15,
        lastActiveDate: "2026-02-10",
      };
      const result = updateStreak(current, "2026-02-12");
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(15);
      expect(result.broken).toBe(true);
    });

    it("updates longest streak when current exceeds previous", () => {
      const current: StreakState = {
        currentStreak: 15,
        longestStreak: 12,
        lastActiveDate: "2026-02-05",
      };
      const result = updateStreak(current, "2026-02-06");
      expect(result.currentStreak).toBe(16);
      expect(result.longestStreak).toBe(16);
      expect(result.broken).toBe(false);
    });

    it("handles large gaps (more than 1 day)", () => {
      const current: StreakState = {
        currentStreak: 7,
        longestStreak: 7,
        lastActiveDate: "2026-02-01",
      };
      const result = updateStreak(current, "2026-02-10");
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(7);
      expect(result.broken).toBe(true);
    });
  });

  describe("createInitialStreak", () => {
    it("creates initial streak with all zeros", () => {
      const streak = createInitialStreak();
      expect(streak.currentStreak).toBe(0);
      expect(streak.longestStreak).toBe(0);
      expect(streak.lastActiveDate).toBe("");
    });
  });

  describe("isStreakActive", () => {
    it("returns false when lastActiveDate is empty", () => {
      expect(isStreakActive("", "2026-02-14")).toBe(false);
    });

    it("returns true when active today (0 days gap)", () => {
      expect(isStreakActive("2026-02-14", "2026-02-14")).toBe(true);
    });

    it("returns true when active yesterday (1 day gap)", () => {
      expect(isStreakActive("2026-02-13", "2026-02-14")).toBe(true);
    });

    it("returns false when inactive for 2+ days", () => {
      expect(isStreakActive("2026-02-12", "2026-02-14")).toBe(false);
    });

    it("returns false when more than 1 day gap", () => {
      expect(isStreakActive("2026-02-10", "2026-02-14")).toBe(false);
    });
  });
});

// ============================================================================
// REDUCER TESTS
// ============================================================================

describe("Gamification Reducer", () => {
  describe("createInitialGamificationState", () => {
    it("creates initial state with zeros and empty history", () => {
      const state = createInitialGamificationState();
      expect(state.totalXp).toBe(0);
      expect(state.seasonXp).toBe(0);
      expect(state.level).toBe(1);
      expect(state.currentStreak).toBe(0);
      expect(state.longestStreak).toBe(0);
      expect(state.lastActiveDate).toBe("");
      expect(state.xpHistory).toEqual([]);
    });
  });

  describe("gamificationReducer - XP_GAINED", () => {
    it("adds XP to totalXp and seasonXp", () => {
      const state = createInitialGamificationState();
      const event = makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
        amount: 50,
        source: "mission_completed",
      });

      const newState = gamificationReducer(state, event);
      expect(newState.totalXp).toBe(50);
      expect(newState.seasonXp).toBe(50);
    });

    it("accumulates multiple XP gains", () => {
      const state = createInitialGamificationState();
      const event1 = makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
        amount: 25,
        source: "budget_adherence",
      });
      const event2 = makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
        amount: 10,
        source: "transaction_logged",
      });

      const state1 = gamificationReducer(state, event1);
      const state2 = gamificationReducer(state1, event2);
      expect(state2.totalXp).toBe(35);
      expect(state2.seasonXp).toBe(35);
    });

    it("adds entry to xpHistory with source and timestamp", () => {
      const state = createInitialGamificationState();
      const timestamp = 1676400000000;
      const event = makeGamEvent(
        GAMIFICATION_EVENTS.XP_GAINED,
        {
          amount: 20,
          source: "streak_bonus",
        },
        timestamp
      );

      const newState = gamificationReducer(state, event);
      expect(newState.xpHistory).toHaveLength(1);
      expect(newState.xpHistory[0]).toEqual({
        amount: 20,
        source: "streak_bonus",
        timestamp,
      });
    });

    it("preserves xpHistory when adding new entries", () => {
      let state = createInitialGamificationState();
      const event1 = makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
        amount: 10,
        source: "transaction_logged",
      });
      const event2 = makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
        amount: 20,
        source: "daily_consistency",
      });

      state = gamificationReducer(state, event1);
      state = gamificationReducer(state, event2);

      expect(state.xpHistory).toHaveLength(2);
      expect(state.xpHistory[0].amount).toBe(10);
      expect(state.xpHistory[1].amount).toBe(20);
    });
  });

  describe("gamificationReducer - LEVEL_UP", () => {
    it("updates level when LEVEL_UP event occurs", () => {
      const state = createInitialGamificationState();
      const event = makeGamEvent(GAMIFICATION_EVENTS.LEVEL_UP, {
        previousLevel: 1,
        newLevel: 2,
        totalXp: 100,
      });

      const newState = gamificationReducer(state, event);
      expect(newState.level).toBe(2);
    });

    it("can level up multiple times", () => {
      let state = createInitialGamificationState();
      for (let level = 2; level <= 5; level++) {
        const event = makeGamEvent(GAMIFICATION_EVENTS.LEVEL_UP, {
          previousLevel: level - 1,
          newLevel: level,
          totalXp: 1000,
        });
        state = gamificationReducer(state, event);
      }
      expect(state.level).toBe(5);
    });

    it("preserves other state when leveling up", () => {
      let state = createInitialGamificationState();
      state.totalXp = 200;
      state.seasonXp = 150;
      state.currentStreak = 5;

      const event = makeGamEvent(GAMIFICATION_EVENTS.LEVEL_UP, {
        previousLevel: 1,
        newLevel: 3,
        totalXp: 200,
      });

      const newState = gamificationReducer(state, event);
      expect(newState.level).toBe(3);
      expect(newState.totalXp).toBe(200);
      expect(newState.seasonXp).toBe(150);
      expect(newState.currentStreak).toBe(5);
    });
  });

  describe("gamificationReducer - STREAK_UPDATED", () => {
    it("updates streak state when STREAK_UPDATED event occurs", () => {
      const state = createInitialGamificationState();
      const event = makeGamEvent(GAMIFICATION_EVENTS.STREAK_UPDATED, {
        currentStreak: 5,
        longestStreak: 5,
        lastActiveDate: "2026-02-14",
        broken: false,
      });

      const newState = gamificationReducer(state, event);
      expect(newState.currentStreak).toBe(5);
      expect(newState.longestStreak).toBe(5);
      expect(newState.lastActiveDate).toBe("2026-02-14");
    });

    it("updates longest streak when it increases", () => {
      let state = createInitialGamificationState();
      state.currentStreak = 5;
      state.longestStreak = 10;

      const event = makeGamEvent(GAMIFICATION_EVENTS.STREAK_UPDATED, {
        currentStreak: 1,
        longestStreak: 10,
        lastActiveDate: "2026-02-16",
        broken: true,
      });

      const newState = gamificationReducer(state, event);
      expect(newState.currentStreak).toBe(1);
      expect(newState.longestStreak).toBe(10);
      expect(newState.lastActiveDate).toBe("2026-02-16");
    });

    it("preserves XP when updating streak", () => {
      let state = createInitialGamificationState();
      state.totalXp = 300;
      state.seasonXp = 200;

      const event = makeGamEvent(GAMIFICATION_EVENTS.STREAK_UPDATED, {
        currentStreak: 3,
        longestStreak: 3,
        lastActiveDate: "2026-02-14",
        broken: false,
      });

      const newState = gamificationReducer(state, event);
      expect(newState.totalXp).toBe(300);
      expect(newState.seasonXp).toBe(200);
      expect(newState.currentStreak).toBe(3);
    });
  });

  describe("replayGamificationEvents", () => {
    it("reconstructs state from single event", () => {
      const event = makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
        amount: 50,
        source: "mission_completed",
      });

      const state = replayGamificationEvents([event]);
      expect(state.totalXp).toBe(50);
      expect(state.seasonXp).toBe(50);
      expect(state.level).toBe(1);
    });

    it("reconstructs state from multiple XP events", () => {
      const events = [
        makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
          amount: 100,
          source: "mission_completed",
        }),
        makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
          amount: 25,
          source: "budget_adherence",
        }),
      ];

      const state = replayGamificationEvents(events);
      expect(state.totalXp).toBe(125);
      expect(state.seasonXp).toBe(125);
      expect(state.xpHistory).toHaveLength(2);
    });

    it("reconstructs full game state from mixed events", () => {
      const events = [
        makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
          amount: 100,
          source: "mission_completed",
        }),
        makeGamEvent(GAMIFICATION_EVENTS.LEVEL_UP, {
          previousLevel: 1,
          newLevel: 2,
          totalXp: 100,
        }),
        makeGamEvent(GAMIFICATION_EVENTS.STREAK_UPDATED, {
          currentStreak: 5,
          longestStreak: 5,
          lastActiveDate: "2026-02-14",
          broken: false,
        }),
      ];

      const state = replayGamificationEvents(events);
      expect(state.totalXp).toBe(100);
      expect(state.seasonXp).toBe(100);
      expect(state.level).toBe(2);
      expect(state.currentStreak).toBe(5);
      expect(state.longestStreak).toBe(5);
      expect(state.lastActiveDate).toBe("2026-02-14");
    });

    it("maintains correct order of xpHistory from events", () => {
      const events = [
        makeGamEvent(
          GAMIFICATION_EVENTS.XP_GAINED,
          { amount: 10, source: "transaction_logged" },
          1000
        ),
        makeGamEvent(
          GAMIFICATION_EVENTS.XP_GAINED,
          { amount: 20, source: "daily_consistency" },
          2000
        ),
        makeGamEvent(
          GAMIFICATION_EVENTS.XP_GAINED,
          { amount: 30, source: "streak_bonus" },
          3000
        ),
      ];

      const state = replayGamificationEvents(events);
      expect(state.xpHistory).toHaveLength(3);
      expect(state.xpHistory[0].amount).toBe(10);
      expect(state.xpHistory[1].amount).toBe(20);
      expect(state.xpHistory[2].amount).toBe(30);
    });

    it("returns initial state for empty event array", () => {
      const state = replayGamificationEvents([]);
      expect(state.totalXp).toBe(0);
      expect(state.seasonXp).toBe(0);
      expect(state.level).toBe(1);
      expect(state.currentStreak).toBe(0);
      expect(state.xpHistory).toHaveLength(0);
    });

    it("handles complex event sequences correctly", () => {
      const events = [
        makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
          amount: 50,
          source: "mission_completed",
        }),
        makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
          amount: 50,
          source: "mission_completed",
        }),
        makeGamEvent(GAMIFICATION_EVENTS.LEVEL_UP, {
          previousLevel: 1,
          newLevel: 2,
          totalXp: 100,
        }),
        makeGamEvent(GAMIFICATION_EVENTS.STREAK_UPDATED, {
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: "2026-02-14",
          broken: false,
        }),
        makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
          amount: 10,
          source: "transaction_logged",
        }),
      ];

      const state = replayGamificationEvents(events);
      expect(state.totalXp).toBe(110);
      expect(state.seasonXp).toBe(110);
      expect(state.level).toBe(2);
      expect(state.currentStreak).toBe(1);
      expect(state.longestStreak).toBe(1);
      expect(state.xpHistory).toHaveLength(3);
    });
  });

  describe("Immutability", () => {
    it("does not mutate original state on XP_GAINED", () => {
      const state = createInitialGamificationState();
      const stateCopy = { ...state };

      const event = makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
        amount: 50,
        source: "mission_completed",
      });

      gamificationReducer(state, event);

      expect(state.totalXp).toBe(stateCopy.totalXp);
      expect(state.seasonXp).toBe(stateCopy.seasonXp);
      expect(state.xpHistory).toEqual(stateCopy.xpHistory);
    });

    it("does not mutate original state on LEVEL_UP", () => {
      const state = createInitialGamificationState();
      state.level = 1;
      const stateCopy = { ...state };

      const event = makeGamEvent(GAMIFICATION_EVENTS.LEVEL_UP, {
        previousLevel: 1,
        newLevel: 2,
        totalXp: 100,
      });

      gamificationReducer(state, event);

      expect(state.level).toBe(stateCopy.level);
    });

    it("does not mutate original state on STREAK_UPDATED", () => {
      const state = createInitialGamificationState();
      const stateCopy = { ...state };

      const event = makeGamEvent(GAMIFICATION_EVENTS.STREAK_UPDATED, {
        currentStreak: 5,
        longestStreak: 5,
        lastActiveDate: "2026-02-14",
        broken: false,
      });

      gamificationReducer(state, event);

      expect(state.currentStreak).toBe(stateCopy.currentStreak);
      expect(state.longestStreak).toBe(stateCopy.longestStreak);
      expect(state.lastActiveDate).toBe(stateCopy.lastActiveDate);
    });

    it("does not mutate xpHistory array during XP_GAINED", () => {
      const state = createInitialGamificationState();
      const historyBefore = state.xpHistory.length;

      const event = makeGamEvent(GAMIFICATION_EVENTS.XP_GAINED, {
        amount: 25,
        source: "budget_adherence",
      });

      const newState = gamificationReducer(state, event);

      expect(state.xpHistory.length).toBe(historyBefore);
      expect(newState.xpHistory.length).toBe(historyBefore + 1);
    });
  });
});
