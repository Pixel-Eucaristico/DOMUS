import { describe, it, expect } from "vitest";
import { calculate503020, getIdeal503020 } from "../src/budget";
import type { Transaction, Category } from "../src/types";

const CATEGORIES: Category[] = [
  { id: "rent", name: "Aluguel", group: "needs" },
  { id: "food", name: "Alimentacao", group: "needs" },
  { id: "entertainment", name: "Lazer", group: "wants" },
  { id: "shopping", name: "Compras", group: "wants" },
  { id: "investment", name: "Investimento", group: "savings" },
];

describe("calculate503020", () => {
  it("calculates budget breakdown for a month", () => {
    const transactions: Transaction[] = [
      { id: "1", accountId: "a1", type: "expense", amount: 1500, categoryId: "rent", date: new Date(2025, 0, 5) },
      { id: "2", accountId: "a1", type: "expense", amount: 500, categoryId: "food", date: new Date(2025, 0, 10) },
      { id: "3", accountId: "a1", type: "expense", amount: 600, categoryId: "entertainment", date: new Date(2025, 0, 15) },
      { id: "4", accountId: "a1", type: "expense", amount: 400, categoryId: "investment", date: new Date(2025, 0, 20) },
    ];

    const result = calculate503020(transactions, CATEGORIES, 0, 2025);
    expect(result.needs).toBe(2000);
    expect(result.wants).toBe(600);
    expect(result.savings).toBe(400);
    expect(result.needsPercent + result.wantsPercent + result.savingsPercent).toBeCloseTo(100, 0);
  });

  it("returns zeros when no expenses", () => {
    const result = calculate503020([], CATEGORIES, 0, 2025);
    expect(result.needs).toBe(0);
    expect(result.wants).toBe(0);
    expect(result.savings).toBe(0);
    expect(result.needsPercent).toBe(0);
  });

  it("ignores income transactions", () => {
    const transactions: Transaction[] = [
      { id: "1", accountId: "a1", type: "income", amount: 5000, categoryId: "rent", date: new Date(2025, 0, 5) },
      { id: "2", accountId: "a1", type: "expense", amount: 100, categoryId: "food", date: new Date(2025, 0, 10) },
    ];
    const result = calculate503020(transactions, CATEGORIES, 0, 2025);
    expect(result.needs).toBe(100);
    expect(result.wants).toBe(0);
    expect(result.savings).toBe(0);
  });

  it("assigns unknown categories to wants", () => {
    const transactions: Transaction[] = [
      { id: "1", accountId: "a1", type: "expense", amount: 300, categoryId: "unknown-cat", date: new Date(2025, 0, 5) },
    ];
    const result = calculate503020(transactions, CATEGORIES, 0, 2025);
    expect(result.wants).toBe(300);
  });

  it("filters by month and year correctly", () => {
    const transactions: Transaction[] = [
      { id: "1", accountId: "a1", type: "expense", amount: 100, categoryId: "food", date: new Date(2025, 0, 5) },
      { id: "2", accountId: "a1", type: "expense", amount: 200, categoryId: "food", date: new Date(2025, 1, 5) },
      { id: "3", accountId: "a1", type: "expense", amount: 300, categoryId: "food", date: new Date(2024, 0, 5) },
    ];
    const result = calculate503020(transactions, CATEGORIES, 0, 2025);
    expect(result.needs).toBe(100);
  });
});

describe("getIdeal503020", () => {
  it("returns ideal budget split for given income", () => {
    const result = getIdeal503020(5000);
    expect(result.needs).toBe(2500);
    expect(result.wants).toBe(1500);
    expect(result.savings).toBe(1000);
    expect(result.needsPercent).toBe(50);
    expect(result.wantsPercent).toBe(30);
    expect(result.savingsPercent).toBe(20);
  });
});
