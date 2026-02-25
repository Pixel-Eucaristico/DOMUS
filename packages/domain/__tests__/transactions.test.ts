import { describe, it, expect } from "vitest";
import {
  createTransactionEvent,
  updateTransactionEvent,
  deleteTransactionEvent,
  calculate503020,
  getIdeal503020,
} from "../src/transactions";
import { EVENT_TYPES, TRANSACTION_TYPES } from "../../events/src/types";

describe("createTransactionEvent", () => {
  it("creates a single expense event", () => {
    const events = createTransactionEvent({
      accountId: "acc-1",
      type: TRANSACTION_TYPES.EXPENSE,
      amount: 45.9,
      categoryId: "cat-food",
      date: "2026-02-14",
      description: "Supermercado",
    });

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe(EVENT_TYPES.TRANSACTION_CREATED);
    expect(events[0]!.payload.amount).toBe(45.9);
    expect(events[0]!.payload.description).toBe("Supermercado");
    expect(events[0]!.payload.installments).toBe(1);
  });

  it("creates a single income event", () => {
    const events = createTransactionEvent({
      accountId: "acc-1",
      type: TRANSACTION_TYPES.INCOME,
      amount: 5000,
      categoryId: "cat-salary",
      date: "2026-02-14",
    });

    expect(events).toHaveLength(1);
    expect(events[0]!.payload.type).toBe("income");
  });

  it("creates installment events (3x)", () => {
    const events = createTransactionEvent({
      accountId: "acc-1",
      type: TRANSACTION_TYPES.EXPENSE,
      amount: 300,
      categoryId: "cat-shop",
      date: "2026-02-14",
      description: "Roupa",
      installments: 3,
    });

    expect(events).toHaveLength(3);

    const parentId = events[0]!.payload.id;
    for (let i = 0; i < 3; i++) {
      expect(events[i]!.payload.installmentInfo!.current).toBe(i + 1);
      expect(events[i]!.payload.installmentInfo!.total).toBe(3);
      expect(events[i]!.payload.installmentInfo!.parentTransactionId).toBe(
        parentId,
      );
    }

    const total = events.reduce((s, e) => s + e.payload.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(300);
  });

  it("distributes installment remainder to last installment", () => {
    const events = createTransactionEvent({
      accountId: "acc-1",
      type: TRANSACTION_TYPES.EXPENSE,
      amount: 100,
      categoryId: "cat-1",
      date: "2026-02-14",
      installments: 3,
    });

    expect(events[0]!.payload.amount).toBeCloseTo(33.33, 2);
    expect(events[1]!.payload.amount).toBeCloseTo(33.33, 2);
    expect(events[2]!.payload.amount).toBeCloseTo(33.34, 2);
  });

  it("installments have sequential dates", () => {
    const events = createTransactionEvent({
      accountId: "acc-1",
      type: TRANSACTION_TYPES.EXPENSE,
      amount: 600,
      categoryId: "cat-1",
      date: "2026-01-15",
      installments: 3,
    });

    expect(events[0]!.payload.date).toBe("2026-01-15");
    expect(events[1]!.payload.date).toBe("2026-02-15");
    expect(events[2]!.payload.date).toBe("2026-03-15");
  });

  it("installments have description with index", () => {
    const events = createTransactionEvent({
      accountId: "acc-1",
      type: TRANSACTION_TYPES.EXPENSE,
      amount: 600,
      categoryId: "cat-1",
      date: "2026-01-15",
      description: "TV",
      installments: 3,
    });

    expect(events[0]!.payload.description).toBe("TV (1/3)");
    expect(events[1]!.payload.description).toBe("TV (2/3)");
    expect(events[2]!.payload.description).toBe("TV (3/3)");
  });

  it("generates default description for installments without description", () => {
    const events = createTransactionEvent({
      accountId: "acc-1",
      type: TRANSACTION_TYPES.EXPENSE,
      amount: 600,
      categoryId: "cat-1",
      date: "2026-01-15",
      installments: 2,
    });

    expect(events[0]!.payload.description).toBe("Parcela 1/2");
    expect(events[1]!.payload.description).toBe("Parcela 2/2");
  });

  it("creates transfer event with targetAccountId", () => {
    const events = createTransactionEvent({
      accountId: "acc-1",
      type: TRANSACTION_TYPES.TRANSFER,
      amount: 500,
      categoryId: "cat-transfer",
      date: "2026-02-14",
      targetAccountId: "acc-2",
    });

    expect(events).toHaveLength(1);
    expect(events[0]!.payload.targetAccountId).toBe("acc-2");
  });

  it("uses custom deviceId", () => {
    const events = createTransactionEvent(
      {
        accountId: "acc-1",
        type: TRANSACTION_TYPES.EXPENSE,
        amount: 50,
        categoryId: "cat-1",
        date: "2026-02-14",
      },
      "device-xyz",
    );

    expect(events[0]!.deviceId).toBe("device-xyz");
  });
});

describe("updateTransactionEvent", () => {
  it("creates an update event", () => {
    const event = updateTransactionEvent("tx-1", { amount: 500 });
    expect(event.type).toBe(EVENT_TYPES.TRANSACTION_UPDATED);
    expect(event.payload.id).toBe("tx-1");
    expect(event.payload.amount).toBe(500);
  });
});

describe("deleteTransactionEvent", () => {
  it("creates a delete event", () => {
    const event = deleteTransactionEvent("tx-1");
    expect(event.type).toBe(EVENT_TYPES.TRANSACTION_DELETED);
    expect(event.payload.id).toBe("tx-1");
  });
});

describe("calculate503020", () => {
  const categories = {
    "cat-food": { group: "needs" as const },
    "cat-rent": { group: "needs" as const },
    "cat-fun": { group: "wants" as const },
    "cat-invest": { group: "savings" as const },
  };

  it("calculates 50/30/20 breakdown for a month", () => {
    const transactions = [
      {
        id: "t1",
        accountId: "a1",
        type: "expense" as const,
        amount: 500,
        categoryId: "cat-food",
        date: "2026-02-10",
      },
      {
        id: "t2",
        accountId: "a1",
        type: "expense" as const,
        amount: 300,
        categoryId: "cat-fun",
        date: "2026-02-15",
      },
      {
        id: "t3",
        accountId: "a1",
        type: "expense" as const,
        amount: 200,
        categoryId: "cat-invest",
        date: "2026-02-20",
      },
    ];

    const result = calculate503020(transactions, categories, 1, 2026);
    expect(result.needs).toBe(500);
    expect(result.wants).toBe(300);
    expect(result.savings).toBe(200);
    expect(result.needsPercent).toBe(50);
    expect(result.wantsPercent).toBe(30);
    expect(result.savingsPercent).toBe(20);
  });

  it("ignores income transactions", () => {
    const transactions = [
      {
        id: "t1",
        accountId: "a1",
        type: "income" as const,
        amount: 5000,
        categoryId: "cat-food",
        date: "2026-02-10",
      },
    ];

    const result = calculate503020(transactions, categories, 1, 2026);
    expect(result.needs).toBe(0);
    expect(result.wants).toBe(0);
    expect(result.savings).toBe(0);
  });

  it("ignores transactions from other months", () => {
    const transactions = [
      {
        id: "t1",
        accountId: "a1",
        type: "expense" as const,
        amount: 100,
        categoryId: "cat-food",
        date: "2026-03-10",
      },
    ];

    const result = calculate503020(transactions, categories, 1, 2026);
    expect(result.needs).toBe(0);
  });

  it("defaults unknown categories to wants", () => {
    const transactions = [
      {
        id: "t1",
        accountId: "a1",
        type: "expense" as const,
        amount: 100,
        categoryId: "unknown-cat",
        date: "2026-02-10",
      },
    ];

    const result = calculate503020(transactions, categories, 1, 2026);
    expect(result.wants).toBe(100);
  });

  it("calculates percentages based on total income when present", () => {
    const transactions = [
      {
        id: "t1",
        accountId: "a1",
        type: "income" as const,
        amount: 4000,
        categoryId: "cat-salary",
        date: "2026-02-01",
      },
      {
        id: "t2",
        accountId: "a1",
        type: "expense" as const,
        amount: 1000,
        categoryId: "cat-food",
        date: "2026-02-10",
      },
      {
        id: "t3",
        accountId: "a1",
        type: "expense" as const,
        amount: 600,
        categoryId: "cat-fun",
        date: "2026-02-15",
      },
      {
        id: "t4",
        accountId: "a1",
        type: "expense" as const,
        amount: 400,
        categoryId: "cat-invest",
        date: "2026-02-20",
      },
    ];

    const result = calculate503020(transactions, categories, 1, 2026);
    expect(result.needs).toBe(1000);
    expect(result.wants).toBe(600);
    expect(result.savings).toBe(400);
    expect(result.totalIncome).toBe(4000);
    // 1000 / 4000 = 25%
    expect(result.needsPercent).toBe(25);
    // 600 / 4000 = 15%
    expect(result.wantsPercent).toBe(15);
    // 400 / 4000 = 10%
    expect(result.savingsPercent).toBe(10);
  });

  it("strictly categorizes savings (does not include unspent income)", () => {
    const transactions = [
      {
        id: "t1",
        accountId: "a1",
        type: "income" as const,
        amount: 5000,
        categoryId: "cat-salary",
        date: "2026-02-01",
      },
      {
        id: "t2",
        accountId: "a1",
        type: "expense" as const,
        amount: 2500,
        categoryId: "cat-food",
        date: "2026-02-10",
      },
    ];

    const result = calculate503020(transactions, categories, 1, 2026);
    expect(result.needs).toBe(2500);
    expect(result.savings).toBe(0); // No savings transactions registered
    expect(result.savingsPercent).toBe(0);
    expect(result.totalIncome).toBe(5000);
  });

  it("handles empty transactions", () => {
    const result = calculate503020([], categories, 1, 2026);
    expect(result.needsPercent).toBe(0);
    expect(result.wantsPercent).toBe(0);
    expect(result.savingsPercent).toBe(0);
  });
});

describe("getIdeal503020", () => {
  it("returns ideal split for income", () => {
    const result = getIdeal503020(5000);
    expect(result.needs).toBe(2500);
    expect(result.wants).toBe(1500);
    expect(result.savings).toBe(1000);
    expect(result.needsPercent).toBe(50);
    expect(result.wantsPercent).toBe(30);
    expect(result.savingsPercent).toBe(20);
  });

  it("handles zero income", () => {
    const result = getIdeal503020(0);
    expect(result.needs).toBe(0);
    expect(result.wants).toBe(0);
    expect(result.savings).toBe(0);
  });
});
