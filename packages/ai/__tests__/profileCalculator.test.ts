import { describe, it, expect } from "vitest";
import { ProfileCalculator } from "../src/profile/ProfileCalculator";
import type {
  TransactionPayload,
  AccountPayload,
} from "../../events/src/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeExpense(
  amount: number,
  date: string,
  id = `exp_${Math.random()}`,
): TransactionPayload {
  return {
    id,
    type: "expense",
    amount,
    date,
    description: "Test expense",
    categoryId: "lazer",
    accountId: "acc1",
    status: "confirmed",
    recurrence: "once",
  };
}

function makeIncome(
  amount: number,
  date: string,
  id = `inc_${Math.random()}`,
): TransactionPayload {
  return {
    id,
    type: "income",
    amount,
    date,
    description: "Salary",
    categoryId: "salario",
    accountId: "acc1",
    status: "confirmed",
    recurrence: "monthly",
  };
}

function makeAccount(balance: number, id = "acc1"): AccountPayload {
  return {
    id,
    name: "Conta Principal",
    type: "checking",
    balance,
    color: "#000",
  };
}

// Reference date: 2026-03-03
const REF = new Date("2026-03-03");

// ─── ProfileCalculator.compute ────────────────────────────────────────────────

describe("ProfileCalculator.compute", () => {
  it("returns zero scores for empty transactions", () => {
    const profile = ProfileCalculator.compute([], [makeAccount(0)], REF);

    expect(profile.savingsRateAverage).toBe(0);
    expect(profile.volatilityScore).toBe(0);
    expect(profile.impulseScore).toBe(0);
    expect(profile.consistencyScore).toBe(0);
    expect(profile.riskTolerance).toBe("Moderate");
  });

  it("computes savings rate when income > expenses", () => {
    const transactions = [
      makeIncome(3000, "2026-03-01"),
      makeExpense(1500, "2026-03-05"),
    ];

    const profile = ProfileCalculator.compute(transactions, [], REF);

    // savings = (3000 - 1500) / 3000 * 100 = 50%
    expect(profile.savingsRateAverage).toBeCloseTo(50, 0);
  });

  it("clamps savings rate to 0 when expenses > income", () => {
    const transactions = [
      makeIncome(1000, "2026-03-01"),
      makeExpense(2000, "2026-03-05"),
    ];

    const profile = ProfileCalculator.compute(transactions, [], REF);
    expect(profile.savingsRateAverage).toBe(0);
  });

  it("computes impulse score correctly", () => {
    // 3 impulse (≤150) out of 4 → 75%
    const transactions = [
      makeExpense(100, "2026-03-01"), // impulse
      makeExpense(50, "2026-03-02"),  // impulse
      makeExpense(120, "2026-03-03"), // impulse
      makeExpense(500, "2026-03-04"), // not impulse
    ];

    const profile = ProfileCalculator.compute(transactions, [], REF);
    expect(profile.impulseScore).toBe(75);
  });

  it("returns Conservative risk for high volatility", () => {
    // Create many small varying expenses to drive volatility > 60
    const transactions = [
      makeExpense(10, "2026-01-01"),
      makeExpense(2000, "2026-01-08"),
      makeExpense(5, "2026-01-15"),
      makeExpense(3000, "2026-01-22"),
    ];

    const profile = ProfileCalculator.compute(transactions, [], REF);
    expect(profile.riskTolerance).toBe("Conservative");
  });

  it("returns Aggressive risk for stable, high-saving profile", () => {
    // Low volatility (consistent expenses), low impulse, high savings
    const transactions = [
      makeIncome(10000, "2026-01-01"),
      makeExpense(600, "2026-01-05"),
      makeExpense(600, "2026-01-12"),
      makeExpense(600, "2026-01-19"),
      makeExpense(600, "2026-01-26"),
      makeIncome(10000, "2026-02-01"),
      makeExpense(600, "2026-02-05"),
      makeExpense(600, "2026-02-12"),
      makeExpense(600, "2026-02-19"),
      makeExpense(600, "2026-02-26"),
      makeIncome(10000, "2026-03-01"),
      makeExpense(600, "2026-03-03"),
    ];

    const profile = ProfileCalculator.compute(transactions, [], REF);
    expect(profile.savingsRateAverage).toBeGreaterThan(25);
    expect(profile.riskTolerance).toBe("Aggressive");
  });

  it("does not include pending transactions", () => {
    const pending: TransactionPayload = {
      ...makeExpense(5000, "2026-03-01"),
      status: "pending",
    };
    const confirmed = makeIncome(3000, "2026-03-01");

    const profile = ProfileCalculator.compute([pending, confirmed], [], REF);
    // pending expense doesn't reduce savings
    expect(profile.savingsRateAverage).toBeGreaterThan(0);
  });
});

// ─── ProfileCalculator.buildSnapshot ─────────────────────────────────────────

describe("ProfileCalculator.buildSnapshot", () => {
  it("returns zero snapshot for no transactions", () => {
    const snapshot = ProfileCalculator.buildSnapshot([], [], {}, REF);

    expect(snapshot.totalBalance).toBe(0);
    expect(snapshot.monthlyIncome).toBe(0);
    expect(snapshot.monthlyExpenses).toBe(0);
    expect(snapshot.savingsRate).toBe(0);
    expect(snapshot.topCategories).toHaveLength(0);
    expect(snapshot.spendingTrend).toBe("+0%");
  });

  it("computes total balance from non-credit accounts", () => {
    const accounts = [
      makeAccount(2000, "acc1"),
      makeAccount(3000, "acc2"),
      { ...makeAccount(5000, "acc3"), type: "credit_card" as const },
    ];

    const snapshot = ProfileCalculator.buildSnapshot([], accounts, {}, REF);
    // credit_card excluded
    expect(snapshot.totalBalance).toBe(5000);
  });

  it("computes savings rate for current month", () => {
    const transactions = [
      makeIncome(4000, "2026-03-01"),
      makeExpense(1000, "2026-03-05"),
    ];

    const snapshot = ProfileCalculator.buildSnapshot(transactions, [], {}, REF);
    // (4000 - 1000) / 4000 * 100 = 75%
    expect(snapshot.savingsRate).toBeCloseTo(75, 0);
  });

  it("has correct FinancialSnapshot shape", () => {
    const snapshot = ProfileCalculator.buildSnapshot([], [makeAccount(1000)], {}, REF);

    expect(snapshot).toHaveProperty("totalBalance");
    expect(snapshot).toHaveProperty("monthlyIncome");
    expect(snapshot).toHaveProperty("monthlyExpenses");
    expect(snapshot).toHaveProperty("savingsRate");
    expect(snapshot).toHaveProperty("topCategories");
    expect(snapshot).toHaveProperty("spendingTrend");
    expect(snapshot).toHaveProperty("riskProfile");
    expect(snapshot).toHaveProperty("volatilityScore");
    expect(snapshot).toHaveProperty("impulseScore");
  });

  it("computes positive spending trend when expenses increased", () => {
    const transactions = [
      makeExpense(500, "2026-02-05"), // previous month
      makeExpense(1000, "2026-03-05"), // current month (doubled)
    ];

    const snapshot = ProfileCalculator.buildSnapshot(transactions, [], {}, REF);
    // +100%
    expect(snapshot.spendingTrend).toBe("+100%");
  });
});
