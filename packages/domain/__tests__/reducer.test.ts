import { describe, it, expect } from "vitest";
import { domainReducer } from "../src/reducer";
import { createInitialState } from "../src/state";
import type { AppState } from "../src/state";
import { createEvent } from "../../events/src/factory";
import { EVENT_TYPES } from "../../events/src/types";
import type {
  AccountCreatedEvent,
  AccountUpdatedEvent,
  AccountDeletedEvent,
  TransactionCreatedEvent,
  TransactionUpdatedEvent,
  TransactionDeletedEvent,
  CategoryCreatedEvent,
} from "../../events/src/types";

function emptyState(): AppState {
  return createInitialState();
}

describe("domainReducer", () => {
  describe("ACCOUNT_CREATED", () => {
    it("adds a checking account", () => {
      const event = createEvent<AccountCreatedEvent>(
        EVENT_TYPES.ACCOUNT_CREATED,
        { id: "acc-1", name: "Nubank", type: "checking", balance: 1500 },
      );

      const state = domainReducer(emptyState(), event);
      expect(Object.keys(state.accounts)).toHaveLength(1);
      expect(state.accounts["acc-1"]!.name).toBe("Nubank");
      expect(state.accounts["acc-1"]!.type).toBe("checking");
      expect(state.accounts["acc-1"]!.balance).toBe(1500);
    });

    it("adds a savings account", () => {
      const event = createEvent<AccountCreatedEvent>(
        EVENT_TYPES.ACCOUNT_CREATED,
        { id: "acc-2", name: "Poupanca", type: "savings", balance: 5000 },
      );

      const state = domainReducer(emptyState(), event);
      expect(state.accounts["acc-2"]!.type).toBe("savings");
    });

    it("adds a wallet account", () => {
      const event = createEvent<AccountCreatedEvent>(
        EVENT_TYPES.ACCOUNT_CREATED,
        { id: "acc-3", name: "Carteira", type: "wallet", balance: 200 },
      );

      const state = domainReducer(emptyState(), event);
      expect(state.accounts["acc-3"]!.type).toBe("wallet");
    });

    it("adds a credit card account with limit", () => {
      const event = createEvent<AccountCreatedEvent>(
        EVENT_TYPES.ACCOUNT_CREATED,
        {
          id: "acc-4",
          name: "Nubank Roxo",
          type: "credit_card",
          balance: 0,
          creditLimit: 5000,
          closingDay: 20,
          dueDay: 27,
        },
      );

      const state = domainReducer(emptyState(), event);
      expect(state.accounts["acc-4"]!.type).toBe("credit_card");
      expect(state.accounts["acc-4"]!.creditLimit).toBe(5000);
      expect(state.accounts["acc-4"]!.closingDay).toBe(20);
      expect(state.accounts["acc-4"]!.dueDay).toBe(27);
    });

    it("adds multiple accounts", () => {
      let state = emptyState();
      state = domainReducer(
        state,
        createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
          id: "a1",
          name: "Conta 1",
          type: "checking",
          balance: 100,
        }),
      );
      state = domainReducer(
        state,
        createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
          id: "a2",
          name: "Conta 2",
          type: "savings",
          balance: 200,
        }),
      );
      expect(Object.keys(state.accounts)).toHaveLength(2);
    });
  });

  describe("ACCOUNT_UPDATED", () => {
    it("updates account name", () => {
      let state = domainReducer(
        emptyState(),
        createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
          id: "acc-1",
          name: "Old Name",
          type: "checking",
          balance: 100,
        }),
      );

      state = domainReducer(
        state,
        createEvent<AccountUpdatedEvent>(EVENT_TYPES.ACCOUNT_UPDATED, {
          id: "acc-1",
          name: "New Name",
        }),
      );

      expect(state.accounts["acc-1"]!.name).toBe("New Name");
      expect(state.accounts["acc-1"]!.balance).toBe(100);
    });

    it("ignores update for non-existing account", () => {
      const state = domainReducer(
        emptyState(),
        createEvent<AccountUpdatedEvent>(EVENT_TYPES.ACCOUNT_UPDATED, {
          id: "nonexistent",
          name: "New",
        }),
      );

      expect(Object.keys(state.accounts)).toHaveLength(0);
    });
  });

  describe("ACCOUNT_DELETED", () => {
    it("removes an account", () => {
      let state = domainReducer(
        emptyState(),
        createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
          id: "acc-1",
          name: "ToDelete",
          type: "checking",
          balance: 0,
        }),
      );

      state = domainReducer(
        state,
        createEvent<AccountDeletedEvent>(EVENT_TYPES.ACCOUNT_DELETED, {
          id: "acc-1",
        }),
      );

      expect(Object.keys(state.accounts)).toHaveLength(0);
    });

    it("ignores deletion of non-existing account", () => {
      const state = domainReducer(
        emptyState(),
        createEvent<AccountDeletedEvent>(EVENT_TYPES.ACCOUNT_DELETED, {
          id: "nonexistent",
        }),
      );

      expect(Object.keys(state.accounts)).toHaveLength(0);
    });
  });

  describe("TRANSACTION_CREATED", () => {
    it("creates an income transaction and updates checking balance", () => {
      let state = domainReducer(
        emptyState(),
        createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
          id: "acc-1",
          name: "Nubank",
          type: "checking",
          balance: 1000,
        }),
      );

      state = domainReducer(
        state,
        createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
          id: "tx-1",
          accountId: "acc-1",
          type: "income",
          amount: 5000,
          categoryId: "cat-salary",
          date: "2026-02-14",
          description: "Salario",
        }),
      );

      expect(Object.keys(state.transactions)).toHaveLength(1);
      expect(state.accounts["acc-1"]!.balance).toBe(6000);
    });

    it("creates an expense and reduces checking balance", () => {
      let state = domainReducer(
        emptyState(),
        createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
          id: "acc-1",
          name: "Nubank",
          type: "checking",
          balance: 1000,
        }),
      );

      state = domainReducer(
        state,
        createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
          id: "tx-1",
          accountId: "acc-1",
          type: "expense",
          amount: 200,
          categoryId: "cat-food",
          date: "2026-02-14",
        }),
      );

      expect(state.accounts["acc-1"]!.balance).toBe(800);
    });

    it("credit card expense does NOT change balance", () => {
      let state = domainReducer(
        emptyState(),
        createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
          id: "cc-1",
          name: "Nubank Roxo",
          type: "credit_card",
          balance: 0,
          creditLimit: 5000,
        }),
      );

      state = domainReducer(
        state,
        createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
          id: "tx-1",
          accountId: "cc-1",
          type: "expense",
          amount: 300,
          categoryId: "cat-food",
          date: "2026-02-14",
        }),
      );

      expect(state.accounts["cc-1"]!.balance).toBe(0);
      expect(Object.keys(state.transactions)).toHaveLength(1);
    });

    it("transfer moves money between accounts", () => {
      let state = emptyState();
      state = domainReducer(
        state,
        createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
          id: "acc-1",
          name: "Conta",
          type: "checking",
          balance: 2000,
        }),
      );
      state = domainReducer(
        state,
        createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
          id: "acc-2",
          name: "Poupanca",
          type: "savings",
          balance: 500,
        }),
      );

      state = domainReducer(
        state,
        createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
          id: "tx-1",
          accountId: "acc-1",
          type: "transfer",
          amount: 1000,
          categoryId: "cat-transfer",
          date: "2026-02-14",
          targetAccountId: "acc-2",
        }),
      );

      expect(state.accounts["acc-1"]!.balance).toBe(1000);
      expect(state.accounts["acc-2"]!.balance).toBe(1500);
    });

    it("wallet income updates balance", () => {
      let state = domainReducer(
        emptyState(),
        createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
          id: "w-1",
          name: "Carteira",
          type: "wallet",
          balance: 50,
        }),
      );

      state = domainReducer(
        state,
        createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
          id: "tx-1",
          accountId: "w-1",
          type: "income",
          amount: 100,
          categoryId: "cat-misc",
          date: "2026-02-14",
        }),
      );

      expect(state.accounts["w-1"]!.balance).toBe(150);
    });
  });

  describe("TRANSACTION_UPDATED", () => {
    it("reverses old transaction and applies new values", () => {
      let state = domainReducer(
        emptyState(),
        createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
          id: "acc-1",
          name: "Nubank",
          type: "checking",
          balance: 1000,
        }),
      );
      state = domainReducer(
        state,
        createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
          id: "tx-1",
          accountId: "acc-1",
          type: "expense",
          amount: 200,
          categoryId: "cat-1",
          date: "2026-02-14",
        }),
      );

      expect(state.accounts["acc-1"]!.balance).toBe(800);

      state = domainReducer(
        state,
        createEvent<TransactionUpdatedEvent>(EVENT_TYPES.TRANSACTION_UPDATED, {
          id: "tx-1",
          amount: 300,
        }),
      );

      expect(state.accounts["acc-1"]!.balance).toBe(700);
      expect(state.transactions["tx-1"]!.amount).toBe(300);
    });

    it("ignores update for non-existing transaction", () => {
      const state = domainReducer(
        emptyState(),
        createEvent<TransactionUpdatedEvent>(EVENT_TYPES.TRANSACTION_UPDATED, {
          id: "nonexistent",
          amount: 500,
        }),
      );

      expect(Object.keys(state.transactions)).toHaveLength(0);
    });
  });

  describe("TRANSACTION_DELETED", () => {
    it("removes transaction and reverses balance", () => {
      let state = domainReducer(
        emptyState(),
        createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
          id: "acc-1",
          name: "Conta",
          type: "checking",
          balance: 1000,
        }),
      );
      state = domainReducer(
        state,
        createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
          id: "tx-1",
          accountId: "acc-1",
          type: "expense",
          amount: 300,
          categoryId: "cat-1",
          date: "2026-02-14",
        }),
      );

      expect(state.accounts["acc-1"]!.balance).toBe(700);

      state = domainReducer(
        state,
        createEvent<TransactionDeletedEvent>(EVENT_TYPES.TRANSACTION_DELETED, {
          id: "tx-1",
        }),
      );

      expect(state.accounts["acc-1"]!.balance).toBe(1000);
      expect(Object.keys(state.transactions)).toHaveLength(0);
    });
  });

  describe("CATEGORY_CREATED", () => {
    it("adds a category", () => {
      const state = domainReducer(
        emptyState(),
        createEvent<CategoryCreatedEvent>(EVENT_TYPES.CATEGORY_CREATED, {
          id: "cat-1",
          name: "Alimentacao",
          group: "needs",
        }),
      );

      expect(state.categories["cat-1"]!.name).toBe("Alimentacao");
      expect(state.categories["cat-1"]!.group).toBe("needs");
    });
  });

  describe("unknown events", () => {
    it("returns state unchanged for unknown event type", () => {
      const state = emptyState();
      const event = {
        id: "e1",
        type: "UNKNOWN_EVENT" as "ACCOUNT_CREATED",
        payload: {},
        timestamp: Date.now(),
        deviceId: "local",
        signature: "",
      };

      const newState = domainReducer(state, event as any);
      expect(newState).toEqual(state);
    });
  });

  describe("immutability", () => {
    it("never mutates the original state", () => {
      const original = emptyState();
      const frozen = JSON.parse(JSON.stringify(original));

      domainReducer(
        original,
        createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
          id: "a1",
          name: "Test",
          type: "checking",
          balance: 100,
        }),
      );

      expect(original).toEqual(frozen);
    });
  });
});
