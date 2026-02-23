import { describe, it, expect } from "vitest";
import { EVENT_TYPES } from "../events/src/types";
import type { DomainEvent, AccountCreatedEvent, TransactionCreatedEvent, CategoryCreatedEvent } from "../events/src/types";
import { createEvent } from "../events/src/factory";
import { domainReducer } from "../domain/src/reducer";
import { createInitialState } from "../domain/src/state";
import { calculate503020 } from "../domain/src/transactions";
import { createXpPayload, calculateBudgetAdherenceXp } from "../gamification/src/xpEngine";
import { calculateLevel, shouldLevelUp } from "../gamification/src/levelEngine";
import { updateStreak, createInitialStreak } from "../gamification/src/streakEngine";
import { gamificationReducer, createInitialGamificationState } from "../gamification/src/reducer";
import { GAMIFICATION_EVENTS } from "../gamification/src/types";
import type { GamificationEvent } from "../gamification/src/types";
import { detectArchetype, calculateScores } from "../personality/src/profileDetector";
import { shouldEvolve, evolveArchetype } from "../personality/src/archetypeEngine";
import { getTone } from "../personality/src/toneEngine";
import { getThemeForArchetype } from "../theme/src/themeEngine";
import { createSeasonId, startSeason, evaluateSeason } from "../season/src/seasonEngine";
import { seasonReducer, createInitialSeasonState } from "../season/src/reducer";
import { SEASON_EVENTS } from "../season/src/types";
import type { SeasonEvent } from "../season/src/types";
import { onboardingReducer, createInitialOnboardingState } from "../onboarding/src/reducer";
import { ONBOARDING_EVENTS } from "../onboarding/src/types";
import type { OnboardingEvent } from "../onboarding/src/types";

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

describe("DOMUS Integration - Full User Journey", () => {
  let domainState = createInitialState();
  let gamificationState = createInitialGamificationState();
  let onboardingState = createInitialOnboardingState();
  let seasonState = createInitialSeasonState();
  const allDomainEvents: DomainEvent[] = [];
  const allGamificationEvents: GamificationEvent[] = [];
  const allOnboardingEvents: OnboardingEvent[] = [];

  it("1. starts onboarding", () => {
    const event = makeEvent(ONBOARDING_EVENTS.ONBOARDING_STARTED, {
      userId: "user-1",
      startDate: "2026-02-01",
      difficulty: "normal",
    }) as OnboardingEvent;
    allOnboardingEvents.push(event);
    onboardingState = onboardingReducer(onboardingState, event);

    expect(onboardingState.started).toBe(true);
    expect(onboardingState.difficulty).toBe("normal");
    expect(onboardingState.currentDay).toBe(1);
  });

  it("2. creates a checking account", () => {
    const event = createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
      id: "acc-1",
      name: "Conta Corrente",
      type: "checking",
      balance: 0,
    });
    allDomainEvents.push(event);
    domainState = domainReducer(domainState, event);

    expect(domainState.accounts["acc-1"]).toBeDefined();
    expect(domainState.accounts["acc-1"].name).toBe("Conta Corrente");
    expect(domainState.accounts["acc-1"].type).toBe("checking");
  });

  it("3. registers income of R$ 5000", () => {
    const event = createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
      id: "tx-income-1",
      accountId: "acc-1",
      type: "income",
      amount: 5000,
      categoryId: "cat-income",
      date: "2026-02-01",
      description: "Salario",
    });
    allDomainEvents.push(event);
    domainState = domainReducer(domainState, event);

    expect(domainState.accounts["acc-1"].balance).toBe(5000);
    expect(domainState.transactions["tx-income-1"]).toBeDefined();
  });

  it("4. registers expenses across needs, wants, savings categories", () => {
    const catNeeds = createEvent<CategoryCreatedEvent>(EVENT_TYPES.CATEGORY_CREATED, {
      id: "cat-needs",
      name: "Moradia",
      group: "needs",
    });
    const catWants = createEvent<CategoryCreatedEvent>(EVENT_TYPES.CATEGORY_CREATED, {
      id: "cat-wants",
      name: "Lazer",
      group: "wants",
    });
    const catSavings = createEvent<CategoryCreatedEvent>(EVENT_TYPES.CATEGORY_CREATED, {
      id: "cat-savings",
      name: "Investimentos",
      group: "savings",
    });
    for (const e of [catNeeds, catWants, catSavings]) {
      allDomainEvents.push(e);
      domainState = domainReducer(domainState, e);
    }

    const txNeeds = createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
      id: "tx-needs-1",
      accountId: "acc-1",
      type: "expense",
      amount: 2500,
      categoryId: "cat-needs",
      date: "2026-02-05",
      description: "Aluguel",
    });
    const txWants = createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
      id: "tx-wants-1",
      accountId: "acc-1",
      type: "expense",
      amount: 1500,
      categoryId: "cat-wants",
      date: "2026-02-06",
      description: "Restaurante",
    });
    const txSavings = createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
      id: "tx-savings-1",
      accountId: "acc-1",
      type: "expense",
      amount: 1000,
      categoryId: "cat-savings",
      date: "2026-02-07",
      description: "Investimento mensal",
    });
    for (const e of [txNeeds, txWants, txSavings]) {
      allDomainEvents.push(e);
      domainState = domainReducer(domainState, e);
    }

    expect(domainState.accounts["acc-1"].balance).toBe(0);
    expect(Object.keys(domainState.transactions).length).toBeGreaterThanOrEqual(4);
  });

  it("5. calculates 50/30/20 budget", () => {
    const transactions = Object.values(domainState.transactions);
    const categories: Record<string, { group: "needs" | "wants" | "savings" }> = {
      "cat-needs": { group: "needs" },
      "cat-wants": { group: "wants" },
      "cat-savings": { group: "savings" },
    };
    const budget = calculate503020(transactions, categories, 1, 2026);

    expect(budget.needs).toBe(2500);
    expect(budget.wants).toBe(1500);
    expect(budget.savings).toBe(1000);
    expect(budget.needsPercent).toBe(50);
    expect(budget.wantsPercent).toBe(30);
    expect(budget.savingsPercent).toBe(20);
  });

  it("6. gains XP for transaction logging", () => {
    const xpPayload = createXpPayload("transaction_logged");
    expect(xpPayload.amount).toBe(10);
    expect(xpPayload.source).toBe("transaction_logged");

    const event = makeEvent(GAMIFICATION_EVENTS.XP_GAINED, xpPayload) as GamificationEvent;
    allGamificationEvents.push(event);
    gamificationState = gamificationReducer(gamificationState, event);

    expect(gamificationState.totalXp).toBe(10);
  });

  it("7. gains XP for budget adherence and checks level", () => {
    // Mock a budget object for the test
    const mockBudget = {
      needs: 2500, wants: 1500, savings: 1000,
      needsPercent: 50, wantsPercent: 30, savingsPercent: 20,
      totalIncome: 5000, adherenceScore: 100
    };
    const adherenceXp = calculateBudgetAdherenceXp(mockBudget);
    expect(adherenceXp).toBe(60);

    const xpPayload = createXpPayload("budget_adherence", adherenceXp);
    const event = makeEvent(GAMIFICATION_EVENTS.XP_GAINED, xpPayload) as GamificationEvent;
    allGamificationEvents.push(event);
    gamificationState = gamificationReducer(gamificationState, event);

    expect(gamificationState.totalXp).toBe(70);

    const level = calculateLevel(gamificationState.totalXp);
    expect(level).toBeGreaterThanOrEqual(1);
  });

  it("8. checks level progression with shouldLevelUp", () => {
    const result = shouldLevelUp(0, gamificationState.totalXp);
    expect(result.previousLevel).toBe(1);
    expect(result.newLevel).toBeGreaterThanOrEqual(1);
  });

  it("9. updates streak for consecutive days", () => {
    let streak = createInitialStreak();

    const day1 = updateStreak(streak, "2026-02-01");
    expect(day1.currentStreak).toBe(1);
    expect(day1.broken).toBe(false);

    streak = { currentStreak: day1.currentStreak, longestStreak: day1.longestStreak, lastActiveDate: day1.lastActiveDate };
    const day2 = updateStreak(streak, "2026-02-02");
    expect(day2.currentStreak).toBe(2);
    expect(day2.broken).toBe(false);

    streak = { currentStreak: day2.currentStreak, longestStreak: day2.longestStreak, lastActiveDate: day2.lastActiveDate };
    const day3 = updateStreak(streak, "2026-02-03");
    expect(day3.currentStreak).toBe(3);
    expect(day3.longestStreak).toBe(3);

    const streakEvent = makeEvent(GAMIFICATION_EVENTS.STREAK_UPDATED, day3) as GamificationEvent;
    allGamificationEvents.push(streakEvent);
    gamificationState = gamificationReducer(gamificationState, streakEvent);

    expect(gamificationState.currentStreak).toBe(3);
  });

  it("10. detects archetype from scores", () => {
    const scores = calculateScores({
      transactionCount: 10,
      daysActive: 7,
      budgetAdherencePercent: 90,
      wishlistItemsTracked: 2,
      desiresSaved: 3,
      monthsPlanned: 1,
    });

    const archetype = detectArchetype(scores);
    expect(archetype).toBeTruthy();
    expect(typeof archetype).toBe("string");
  });

  it("11. gets theme for current archetype", () => {
    const scores = calculateScores({
      transactionCount: 10,
      daysActive: 7,
      budgetAdherencePercent: 90,
      wishlistItemsTracked: 2,
      desiresSaved: 3,
      monthsPlanned: 1,
    });
    const archetype = detectArchetype(scores);
    const theme = getThemeForArchetype(archetype.toLowerCase());

    expect(theme).toBeDefined();
    expect(theme.primaryColor).toBeTruthy();
    expect(theme.background).toBeTruthy();

    const tone = getTone(archetype);
    expect(tone).toBeDefined();
    expect(tone.style).toBeTruthy();
  });

  it("12. completes onboarding steps and finishes", () => {
    const stepEvent = makeEvent(ONBOARDING_EVENTS.ONBOARDING_STEP_COMPLETED, {
      step: "create_account",
      day: 1,
      completedAt: "2026-02-01T10:00:00Z",
    }) as OnboardingEvent;
    allOnboardingEvents.push(stepEvent);
    onboardingState = onboardingReducer(onboardingState, stepEvent);
    expect(onboardingState.completedSteps).toContain("create_account");

    const dayEvent = makeEvent(ONBOARDING_EVENTS.ONBOARDING_DAY_COMPLETED, {
      day: 1,
      completedAt: "2026-02-01T18:00:00Z",
      stepsCompleted: 1,
      totalSteps: 1,
    }) as OnboardingEvent;
    allOnboardingEvents.push(dayEvent);
    onboardingState = onboardingReducer(onboardingState, dayEvent);
    expect(onboardingState.completedDays).toContain(1);

    const finishEvent = makeEvent(ONBOARDING_EVENTS.ONBOARDING_FINISHED, {
      finishedAt: "2026-02-07T00:00:00Z",
      totalDays: 7,
      finalDifficulty: "normal",
    }) as OnboardingEvent;
    allOnboardingEvents.push(finishEvent);
    onboardingState = onboardingReducer(onboardingState, finishEvent);
    expect(onboardingState.finished).toBe(true);
  });

  it("13. starts and evaluates a season", () => {
    const seasonId = createSeasonId(2026, 2);
    expect(seasonId).toBe("2026-02");

    const seasonPayload = startSeason(2026, 2);
    expect(seasonPayload.seasonId).toBe("2026-02");
    expect(seasonPayload.year).toBe(2026);
    expect(seasonPayload.month).toBe(2);

    const startEvent = makeEvent(SEASON_EVENTS.SEASON_STARTED, seasonPayload) as SeasonEvent;
    seasonState = seasonReducer(seasonState, startEvent);

    expect(seasonState.currentSeason).not.toBeNull();
    expect(seasonState.currentSeason!.active).toBe(true);

    const evaluation = evaluateSeason("2026-02", 60, 1, 100, 3, "EXPLORER");
    expect(evaluation.seasonId).toBe("2026-02");
    expect(evaluation.totalXp).toBe(60);

    const evalEvent = makeEvent(SEASON_EVENTS.SEASON_EVALUATED, evaluation) as SeasonEvent;
    seasonState = seasonReducer(seasonState, evalEvent);

    expect(seasonState.history).toHaveLength(1);
    expect(seasonState.currentArchetype).toBe("EXPLORER");
  });

  it("14. evolves archetype after season with improved scores", () => {
    const improvedScores = calculateScores({
      transactionCount: 100,
      daysActive: 30,
      budgetAdherencePercent: 95,
      wishlistItemsTracked: 10,
      desiresSaved: 20,
      monthsPlanned: 6,
    });

    const currentArchetype = "EXPLORER";
    const canEvolve = shouldEvolve(currentArchetype, improvedScores);
    expect(canEvolve).toBe(true);

    const evolution = evolveArchetype(currentArchetype, improvedScores);
    expect(evolution.newArchetype).not.toBe("EXPLORER");
    expect(evolution.reason).toBeTruthy();

    const evolveEvent = makeEvent(SEASON_EVENTS.ARCHETYPE_EVOLVED, {
      previousArchetype: currentArchetype,
      newArchetype: evolution.newArchetype,
      reason: evolution.reason,
    }) as SeasonEvent;
    seasonState = seasonReducer(seasonState, evolveEvent);
    expect(seasonState.currentArchetype).toBe(evolution.newArchetype);
  });

  it("15. verifies full onboarding state reconstruction via replay", () => {
    const replayedState = allOnboardingEvents.reduce(
      (state, event) => onboardingReducer(state, event),
      createInitialOnboardingState(),
    );

    expect(replayedState.started).toBe(onboardingState.started);
    expect(replayedState.finished).toBe(onboardingState.finished);
    expect(replayedState.difficulty).toBe(onboardingState.difficulty);
    expect(replayedState.completedSteps).toEqual(onboardingState.completedSteps);
    expect(replayedState.completedDays).toEqual(onboardingState.completedDays);
  });

  it("16. verifies full gamification state reconstruction via replay", () => {
    const replayedState = allGamificationEvents.reduce(
      (state, event) => gamificationReducer(state, event),
      createInitialGamificationState(),
    );

    expect(replayedState.totalXp).toBe(gamificationState.totalXp);
    expect(replayedState.currentStreak).toBe(gamificationState.currentStreak);
    expect(replayedState.longestStreak).toBe(gamificationState.longestStreak);
  });

  it("17. verifies domain state has correct final account balance", () => {
    const replayedDomain = allDomainEvents.reduce(
      (state, event) => domainReducer(state, event),
      createInitialState(),
    );

    expect(replayedDomain.accounts["acc-1"].balance).toBe(domainState.accounts["acc-1"].balance);
    expect(Object.keys(replayedDomain.transactions)).toEqual(Object.keys(domainState.transactions));
  });

  it("18. theme matches evolved archetype", () => {
    const theme = getThemeForArchetype(seasonState.currentArchetype.toLowerCase());
    expect(theme).toBeDefined();
    expect(theme.primaryColor).toBeTruthy();
    expect(theme.accentColor).toBeTruthy();
  });
});
