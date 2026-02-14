import { describe, it, expect } from "vitest";
import {
  createAccountEvent,
  updateAccountEvent,
  deleteAccountEvent,
  getCreditUsage,
  getAvailableCredit,
} from "../src/accounts";
import { ACCOUNT_TYPES, EVENT_TYPES } from "../../events/src/types";

describe("createAccountEvent", () => {
  it("creates a checking account event", () => {
    const event = createAccountEvent({
      name: "Nubank",
      type: ACCOUNT_TYPES.CHECKING,
      balance: 1500,
    });

    expect(event.type).toBe(EVENT_TYPES.ACCOUNT_CREATED);
    expect(event.payload.name).toBe("Nubank");
    expect(event.payload.type).toBe("checking");
    expect(event.payload.balance).toBe(1500);
    expect(event.payload.id).toBeTruthy();
  });

  it("creates a savings account event", () => {
    const event = createAccountEvent({
      name: "Poupanca Inter",
      type: ACCOUNT_TYPES.SAVINGS,
    });

    expect(event.payload.type).toBe("savings");
    expect(event.payload.balance).toBe(0);
  });

  it("creates a wallet account event", () => {
    const event = createAccountEvent({
      name: "Carteira",
      type: ACCOUNT_TYPES.WALLET,
      balance: 200,
    });

    expect(event.payload.type).toBe("wallet");
    expect(event.payload.balance).toBe(200);
  });

  it("creates a credit card account event with limit and days", () => {
    const event = createAccountEvent({
      name: "Nubank Roxo",
      type: ACCOUNT_TYPES.CREDIT_CARD,
      creditLimit: 5000,
      closingDay: 20,
      dueDay: 27,
    });

    expect(event.payload.type).toBe("credit_card");
    expect(event.payload.creditLimit).toBe(5000);
    expect(event.payload.closingDay).toBe(20);
    expect(event.payload.dueDay).toBe(27);
    expect(event.payload.balance).toBe(0);
  });

  it("accepts custom deviceId", () => {
    const event = createAccountEvent(
      { name: "Test", type: ACCOUNT_TYPES.CHECKING },
      "device-abc",
    );
    expect(event.deviceId).toBe("device-abc");
  });

  it("accepts optional color", () => {
    const event = createAccountEvent({
      name: "Conta Roxa",
      type: ACCOUNT_TYPES.CHECKING,
      color: "#8B5CF6",
    });
    expect(event.payload.color).toBe("#8B5CF6");
  });
});

describe("updateAccountEvent", () => {
  it("creates an update event with partial changes", () => {
    const event = updateAccountEvent("acc-1", { name: "New Name" });
    expect(event.type).toBe(EVENT_TYPES.ACCOUNT_UPDATED);
    expect(event.payload.id).toBe("acc-1");
    expect(event.payload.name).toBe("New Name");
  });
});

describe("deleteAccountEvent", () => {
  it("creates a delete event", () => {
    const event = deleteAccountEvent("acc-1");
    expect(event.type).toBe(EVENT_TYPES.ACCOUNT_DELETED);
    expect(event.payload.id).toBe("acc-1");
  });
});

describe("getCreditUsage", () => {
  it("sums expense transactions for credit card", () => {
    const account = {
      id: "cc-1",
      name: "Cartao",
      type: "credit_card" as const,
      balance: 0,
      creditLimit: 5000,
    };

    const txs = [
      { accountId: "cc-1", type: "expense", amount: 200 },
      { accountId: "cc-1", type: "expense", amount: 300 },
      { accountId: "cc-1", type: "income", amount: 100 },
      { accountId: "other", type: "expense", amount: 500 },
    ];

    expect(getCreditUsage(account, txs)).toBe(500);
  });

  it("returns 0 for non-credit accounts", () => {
    const account = {
      id: "acc-1",
      name: "Conta",
      type: "checking" as const,
      balance: 0,
    };
    expect(getCreditUsage(account, [])).toBe(0);
  });
});

describe("getAvailableCredit", () => {
  it("calculates available credit", () => {
    const account = {
      id: "cc-1",
      name: "Cartao",
      type: "credit_card" as const,
      balance: 0,
      creditLimit: 5000,
    };

    const txs = [{ accountId: "cc-1", type: "expense", amount: 1200 }];

    expect(getAvailableCredit(account, txs)).toBe(3800);
  });

  it("returns 0 for non-credit accounts", () => {
    const account = {
      id: "acc-1",
      name: "Conta",
      type: "checking" as const,
      balance: 0,
    };
    expect(getAvailableCredit(account, [])).toBe(0);
  });

  it("returns 0 when no credit limit defined", () => {
    const account = {
      id: "cc-1",
      name: "Cartao",
      type: "credit_card" as const,
      balance: 0,
    };
    expect(getAvailableCredit(account, [])).toBe(0);
  });
});
