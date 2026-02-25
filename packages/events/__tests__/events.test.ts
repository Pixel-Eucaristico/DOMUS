import { describe, it, expect } from "vitest";
import {
  EVENT_TYPES,
  ACCOUNT_TYPES,
  TRANSACTION_TYPES,
  CATEGORY_GROUPS,
  createEvent,
  generateId,
} from "../index";
import type {
  AccountCreatedEvent,
  TransactionCreatedEvent,
  CategoryCreatedEvent,
  DomainEvent,
} from "../index";

describe("generateId", () => {
  it("returns a non-empty string", () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe("EVENT_TYPES", () => {
  it("has all required event types", () => {
    expect(EVENT_TYPES.ACCOUNT_CREATED).toBe("ACCOUNT_CREATED");
    expect(EVENT_TYPES.ACCOUNT_UPDATED).toBe("ACCOUNT_UPDATED");
    expect(EVENT_TYPES.ACCOUNT_DELETED).toBe("ACCOUNT_DELETED");
    expect(EVENT_TYPES.TRANSACTION_CREATED).toBe("TRANSACTION_CREATED");
    expect(EVENT_TYPES.TRANSACTION_UPDATED).toBe("TRANSACTION_UPDATED");
    expect(EVENT_TYPES.TRANSACTION_DELETED).toBe("TRANSACTION_DELETED");
    expect(EVENT_TYPES.CATEGORY_CREATED).toBe("CATEGORY_CREATED");
  });
});

describe("ACCOUNT_TYPES", () => {
  it("includes checking, savings, wallet, credit_card", () => {
    expect(ACCOUNT_TYPES.CHECKING).toBe("checking");
    expect(ACCOUNT_TYPES.SAVINGS).toBe("savings");
    expect(ACCOUNT_TYPES.WALLET).toBe("wallet");
    expect(ACCOUNT_TYPES.CREDIT_CARD).toBe("credit_card");
  });
});

describe("TRANSACTION_TYPES", () => {
  it("includes income, expense, transfer", () => {
    expect(TRANSACTION_TYPES.INCOME).toBe("income");
    expect(TRANSACTION_TYPES.EXPENSE).toBe("expense");
    expect(TRANSACTION_TYPES.TRANSFER).toBe("transfer");
  });
});

describe("CATEGORY_GROUPS", () => {
  it("includes needs, wants, savings (50/30/20)", () => {
    expect(CATEGORY_GROUPS.NEEDS).toBe("needs");
    expect(CATEGORY_GROUPS.WANTS).toBe("wants");
    expect(CATEGORY_GROUPS.SAVINGS).toBe("savings");
  });
});

describe("createEvent", () => {
  it("creates ACCOUNT_CREATED event with all fields", () => {
    const event = createEvent<AccountCreatedEvent>(
      EVENT_TYPES.ACCOUNT_CREATED,
      {
        id: "acc-1",
        name: "Nubank",
        type: "checking",
        balance: 1500,
      },
      "device-1",
    );

    expect(event.type).toBe("ACCOUNT_CREATED");
    expect(event.payload.id).toBe("acc-1");
    expect(event.payload.name).toBe("Nubank");
    expect(event.payload.type).toBe("checking");
    expect(event.payload.balance).toBe(1500);
    expect(event.deviceId).toBe("device-1");
    expect(event.id).toBeTruthy();
    expect(event.timestamp).toBeGreaterThan(0);
  });

  it("creates TRANSACTION_CREATED event", () => {
    const event = createEvent<TransactionCreatedEvent>(
      EVENT_TYPES.TRANSACTION_CREATED,
      {
        id: "tx-1",
        accountId: "acc-1",
        type: "expense",
        amount: 45.9,
        categoryId: "cat-food",
        date: "2026-02-14",
        description: "Supermercado",
      },
    );

    expect(event.type).toBe("TRANSACTION_CREATED");
    expect(event.payload.amount).toBe(45.9);
    expect(event.payload.type).toBe("expense");
    expect(event.deviceId).toBe("local");
  });

  it("creates CATEGORY_CREATED event", () => {
    const event = createEvent<CategoryCreatedEvent>(
      EVENT_TYPES.CATEGORY_CREATED,
      {
        id: "cat-1",
        name: "Alimentacao",
        group: "needs",
      },
    );

    expect(event.type).toBe("CATEGORY_CREATED");
    expect(event.payload.group).toBe("needs");
  });

  it("defaults deviceId to local", () => {
    const event = createEvent<AccountCreatedEvent>(
      EVENT_TYPES.ACCOUNT_CREATED,
      { id: "a", name: "X", type: "wallet", balance: 0 },
    );
    expect(event.deviceId).toBe("local");
  });

  it("signature starts empty (unsigned)", () => {
    const event = createEvent<AccountCreatedEvent>(
      EVENT_TYPES.ACCOUNT_CREATED,
      { id: "a", name: "X", type: "wallet", balance: 0 },
    );
    expect(event.signature).toBe("");
  });
});

describe("type safety", () => {
  it("DomainEvent union allows all event types", () => {
    const events: DomainEvent[] = [
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "a1",
        name: "Conta",
        type: "checking",
        balance: 0,
      }),
      createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "t1",
        accountId: "a1",
        type: "income",
        amount: 5000,
        categoryId: "c1",
        date: "2026-02-14",
      }),
      createEvent<CategoryCreatedEvent>(EVENT_TYPES.CATEGORY_CREATED, {
        id: "c1",
        name: "Salario",
        group: "needs",
      }),
    ];

    expect(events).toHaveLength(3);
    expect(events[0]!.type).toBe("ACCOUNT_CREATED");
    expect(events[1]!.type).toBe("TRANSACTION_CREATED");
    expect(events[2]!.type).toBe("CATEGORY_CREATED");
  });
});
