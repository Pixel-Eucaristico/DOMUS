import { describe, it, expect } from "vitest";
import { replayEvents, replayEventsSince } from "../src/replay";
import { createInitialState } from "../src/state";
import { domainReducer } from "../src/reducer";
import { createEvent } from "../../events/src/factory";
import { EVENT_TYPES } from "../../events/src/types";
import type {
  AccountCreatedEvent,
  TransactionCreatedEvent,
  CategoryCreatedEvent,
  DomainEvent,
} from "../../events/src/types";

describe("replayEvents", () => {
  it("reconstructs state from empty events", () => {
    const state = replayEvents([]);
    expect(Object.keys(state.accounts)).toHaveLength(0);
    expect(Object.keys(state.transactions)).toHaveLength(0);
    expect(Object.keys(state.categories)).toHaveLength(0);
  });

  it("reconstructs full state from event sequence", () => {
    const events: DomainEvent[] = [
      createEvent<CategoryCreatedEvent>(EVENT_TYPES.CATEGORY_CREATED, {
        id: "cat-1",
        name: "Alimentacao",
        group: "needs",
      }),
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-1",
        name: "Nubank",
        type: "checking",
        balance: 5000,
      }),
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-2",
        name: "Poupanca",
        type: "savings",
        balance: 0,
      }),
      createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "tx-1",
        accountId: "acc-1",
        type: "expense",
        amount: 200,
        categoryId: "cat-1",
        date: "2026-02-14",
      }),
      createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "tx-2",
        accountId: "acc-1",
        type: "transfer",
        amount: 1000,
        categoryId: "cat-1",
        date: "2026-02-14",
        targetAccountId: "acc-2",
      }),
    ];

    const state = replayEvents(events);

    expect(Object.keys(state.accounts)).toHaveLength(2);
    expect(Object.keys(state.transactions)).toHaveLength(2);
    expect(Object.keys(state.categories)).toHaveLength(1);

    expect(state.accounts["acc-1"]!.balance).toBe(3800);
    expect(state.accounts["acc-2"]!.balance).toBe(1000);
  });

  it("produces same state regardless of how many times replayed", () => {
    const events: DomainEvent[] = [
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-1",
        name: "Conta",
        type: "checking",
        balance: 1000,
      }),
      createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "tx-1",
        accountId: "acc-1",
        type: "expense",
        amount: 100,
        categoryId: "cat-1",
        date: "2026-02-14",
      }),
    ];

    const state1 = replayEvents(events);
    const state2 = replayEvents(events);
    const state3 = replayEvents(events);

    expect(state1).toEqual(state2);
    expect(state2).toEqual(state3);
  });

  it("state is never saved - always reconstructed", () => {
    const events: DomainEvent[] = [
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-1",
        name: "Conta",
        type: "checking",
        balance: 1000,
      }),
    ];

    const state = replayEvents(events);
    expect(state.accounts["acc-1"]!.balance).toBe(1000);

    const freshState = replayEvents(events);
    expect(freshState.accounts["acc-1"]!.balance).toBe(1000);
    expect(state).toEqual(freshState);
  });
});

describe("replayEventsSince", () => {
  it("applies new events to existing state", () => {
    const initialEvents: DomainEvent[] = [
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-1",
        name: "Conta",
        type: "checking",
        balance: 2000,
      }),
    ];

    const baseState = replayEvents(initialEvents);

    const newEvents: DomainEvent[] = [
      createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "tx-1",
        accountId: "acc-1",
        type: "expense",
        amount: 500,
        categoryId: "cat-1",
        date: "2026-02-14",
      }),
    ];

    const updatedState = replayEventsSince(baseState, newEvents);
    expect(updatedState.accounts["acc-1"]!.balance).toBe(1500);
  });

  it("preserves existing state when no new events", () => {
    const baseState = replayEvents([
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-1",
        name: "Conta",
        type: "checking",
        balance: 1000,
      }),
    ]);

    const result = replayEventsSince(baseState, []);
    expect(result).toEqual(baseState);
  });
});

describe("integration with SQLiteEventStore pattern", () => {
  it("simulates eventStore.replayEvents using domainReducer", () => {
    const events: DomainEvent[] = [
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-1",
        name: "Conta Corrente",
        type: "checking",
        balance: 3000,
      }),
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "cc-1",
        name: "Nubank Roxo",
        type: "credit_card",
        balance: 0,
        creditLimit: 5000,
      }),
      createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "tx-1",
        accountId: "acc-1",
        type: "expense",
        amount: 150,
        categoryId: "cat-1",
        date: "2026-02-14",
      }),
      createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "tx-2",
        accountId: "cc-1",
        type: "expense",
        amount: 500,
        categoryId: "cat-2",
        date: "2026-02-14",
      }),
    ];

    let state = createInitialState();
    for (const event of events) {
      state = domainReducer(state, event);
    }

    expect(state.accounts["acc-1"]!.balance).toBe(2850);
    expect(state.accounts["cc-1"]!.balance).toBe(0);
    expect(Object.keys(state.transactions)).toHaveLength(2);
  });
});
