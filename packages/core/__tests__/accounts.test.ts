import { describe, it, expect } from "vitest";
import { createAccount, applyToBalance, applyTransfer, getAvailableCredit } from "../src/accounts";
import type { Account } from "../src/types";

describe("createAccount", () => {
  it("creates a checking account with default balance 0", () => {
    const account = createAccount({ name: "Nubank", type: "checking" });
    expect(account.id).toBeTruthy();
    expect(account.name).toBe("Nubank");
    expect(account.type).toBe("checking");
    expect(account.balance).toBe(0);
  });

  it("creates a credit account with limit", () => {
    const account = createAccount({
      name: "Visa",
      type: "credit",
      creditLimit: 5000,
      closingDay: 15,
      dueDay: 25,
    });
    expect(account.type).toBe("credit");
    expect(account.creditLimit).toBe(5000);
    expect(account.closingDay).toBe(15);
    expect(account.dueDay).toBe(25);
  });

  it("creates a savings account with initial balance", () => {
    const account = createAccount({
      name: "Poupanca",
      type: "savings",
      balance: 1000,
    });
    expect(account.balance).toBe(1000);
  });
});

describe("applyToBalance", () => {
  it("adds positive amount to checking account", () => {
    const account: Account = {
      id: "1",
      name: "Conta",
      type: "checking",
      balance: 1000,
    };
    const updated = applyToBalance(account, 500);
    expect(updated.balance).toBe(1500);
  });

  it("subtracts negative amount from checking account", () => {
    const account: Account = {
      id: "1",
      name: "Conta",
      type: "checking",
      balance: 1000,
    };
    const updated = applyToBalance(account, -300);
    expect(updated.balance).toBe(700);
  });

  it("does NOT alter balance for credit card", () => {
    const account: Account = {
      id: "1",
      name: "Visa",
      type: "credit",
      balance: 0,
      creditLimit: 5000,
    };
    const updated = applyToBalance(account, -500);
    expect(updated.balance).toBe(0);
  });
});

describe("applyTransfer", () => {
  it("transfers between two checking accounts", () => {
    const source: Account = { id: "1", name: "A", type: "checking", balance: 1000 };
    const target: Account = { id: "2", name: "B", type: "checking", balance: 500 };
    const result = applyTransfer(source, target, 300);
    expect(result.source.balance).toBe(700);
    expect(result.target.balance).toBe(800);
  });

  it("throws on negative amount", () => {
    const source: Account = { id: "1", name: "A", type: "checking", balance: 1000 };
    const target: Account = { id: "2", name: "B", type: "checking", balance: 500 };
    expect(() => applyTransfer(source, target, -100)).toThrow("Transfer amount must be positive");
  });

  it("does not deduct from credit card source", () => {
    const source: Account = { id: "1", name: "Visa", type: "credit", balance: 0, creditLimit: 5000 };
    const target: Account = { id: "2", name: "B", type: "checking", balance: 500 };
    const result = applyTransfer(source, target, 300);
    expect(result.source.balance).toBe(0);
    expect(result.target.balance).toBe(800);
  });
});

describe("getAvailableCredit", () => {
  it("returns available credit for credit card", () => {
    const account: Account = { id: "1", name: "Visa", type: "credit", balance: 0, creditLimit: 5000 };
    expect(getAvailableCredit(account, 1200)).toBe(3800);
  });

  it("returns 0 for non-credit accounts", () => {
    const account: Account = { id: "1", name: "Conta", type: "checking", balance: 1000 };
    expect(getAvailableCredit(account, 500)).toBe(0);
  });
});
