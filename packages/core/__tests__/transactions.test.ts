import { describe, it, expect } from "vitest";
import { createTransaction, getCreditCardBill } from "../src/transactions";
import type { Account } from "../src/types";

function makeAccounts(): Account[] {
  return [
    { id: "checking1", name: "Nubank", type: "checking", balance: 5000 },
    { id: "savings1", name: "Poupanca", type: "savings", balance: 10000 },
    { id: "credit1", name: "Visa", type: "credit", balance: 0, creditLimit: 5000, closingDay: 15, dueDay: 25 },
  ];
}

describe("createTransaction - income", () => {
  it("adds income to checking account balance", () => {
    const accounts = makeAccounts();
    const result = createTransaction(
      {
        accountId: "checking1",
        type: "income",
        amount: 3000,
        categoryId: "salary",
        date: new Date(2025, 0, 15),
      },
      accounts,
    );
    expect(result.transaction.amount).toBe(3000);
    const updated = result.updatedAccounts.find((a) => a.id === "checking1");
    expect(updated?.balance).toBe(8000);
  });
});

describe("createTransaction - expense", () => {
  it("deducts from checking account", () => {
    const accounts = makeAccounts();
    const result = createTransaction(
      {
        accountId: "checking1",
        type: "expense",
        amount: 200,
        categoryId: "food",
        date: new Date(2025, 0, 10),
      },
      accounts,
    );
    const updated = result.updatedAccounts.find((a) => a.id === "checking1");
    expect(updated?.balance).toBe(4800);
  });

  it("does NOT alter credit card balance on expense", () => {
    const accounts = makeAccounts();
    const result = createTransaction(
      {
        accountId: "credit1",
        type: "expense",
        amount: 500,
        categoryId: "shopping",
        date: new Date(2025, 0, 10),
      },
      accounts,
    );
    const updated = result.updatedAccounts.find((a) => a.id === "credit1");
    expect(updated?.balance).toBe(0);
  });
});

describe("createTransaction - transfer", () => {
  it("moves money between two accounts", () => {
    const accounts = makeAccounts();
    const result = createTransaction(
      {
        accountId: "checking1",
        type: "transfer",
        amount: 2000,
        categoryId: "transfer",
        date: new Date(2025, 0, 10),
        targetAccountId: "savings1",
      },
      accounts,
    );
    const src = result.updatedAccounts.find((a) => a.id === "checking1");
    const tgt = result.updatedAccounts.find((a) => a.id === "savings1");
    expect(src?.balance).toBe(3000);
    expect(tgt?.balance).toBe(12000);
  });

  it("throws without target account", () => {
    const accounts = makeAccounts();
    expect(() =>
      createTransaction(
        {
          accountId: "checking1",
          type: "transfer",
          amount: 500,
          categoryId: "transfer",
          date: new Date(2025, 0, 10),
        },
        accounts,
      ),
    ).toThrow("Transfer requires a target account");
  });
});

describe("createTransaction - installments", () => {
  it("generates multiple installments when installments > 1", () => {
    const accounts = makeAccounts();
    const result = createTransaction(
      {
        accountId: "credit1",
        type: "expense",
        amount: 1200,
        categoryId: "electronics",
        date: new Date(2025, 0, 10),
        installments: 3,
      },
      accounts,
    );
    expect(result.installments).toHaveLength(3);
    expect(result.installments[0]?.installmentNumber).toBe(1);
    expect(result.installments[0]?.paid).toBe(true);
    expect(result.installments[1]?.installmentNumber).toBe(2);
    expect(result.installments[1]?.paid).toBe(false);
    expect(result.installments[2]?.installmentNumber).toBe(3);
    expect(result.installments[2]?.paid).toBe(false);

    const totalInstallmentAmount = result.installments.reduce((s, i) => s + i.amount, 0);
    expect(totalInstallmentAmount).toBe(1200);
  });

  it("sets first installment as paid", () => {
    const accounts = makeAccounts();
    const result = createTransaction(
      {
        accountId: "checking1",
        type: "expense",
        amount: 600,
        categoryId: "food",
        date: new Date(2025, 0, 10),
        installments: 2,
      },
      accounts,
    );
    expect(result.installments[0]?.paid).toBe(true);
    expect(result.installments[1]?.paid).toBe(false);
  });

  it("creates child transactions for future installments", () => {
    const accounts = makeAccounts();
    const result = createTransaction(
      {
        accountId: "checking1",
        type: "expense",
        amount: 900,
        categoryId: "food",
        date: new Date(2025, 0, 10),
        installments: 3,
      },
      accounts,
    );
    expect(result.transaction.installments).toBe(3);
  });
});

describe("createTransaction - validation", () => {
  it("throws on zero amount", () => {
    const accounts = makeAccounts();
    expect(() =>
      createTransaction(
        { accountId: "checking1", type: "expense", amount: 0, categoryId: "food", date: new Date() },
        accounts,
      ),
    ).toThrow("Transaction amount must be positive");
  });

  it("throws on negative amount", () => {
    const accounts = makeAccounts();
    expect(() =>
      createTransaction(
        { accountId: "checking1", type: "expense", amount: -100, categoryId: "food", date: new Date() },
        accounts,
      ),
    ).toThrow("Transaction amount must be positive");
  });

  it("throws for unknown account", () => {
    const accounts = makeAccounts();
    expect(() =>
      createTransaction(
        { accountId: "unknown", type: "expense", amount: 100, categoryId: "food", date: new Date() },
        accounts,
      ),
    ).toThrow("Account unknown not found");
  });
});

describe("getCreditCardBill", () => {
  it("sums credit card expenses for a given month", () => {
    const account: Account = { id: "credit1", name: "Visa", type: "credit", balance: 0, creditLimit: 5000 };
    const transactions = [
      { id: "t1", accountId: "credit1", type: "expense" as const, amount: 100, categoryId: "food", date: new Date(2025, 0, 5) },
      { id: "t2", accountId: "credit1", type: "expense" as const, amount: 250, categoryId: "shop", date: new Date(2025, 0, 20) },
      { id: "t3", accountId: "credit1", type: "expense" as const, amount: 50, categoryId: "food", date: new Date(2025, 1, 3) },
    ];
    const bill = getCreditCardBill(transactions, account, 0, 2025);
    expect(bill).toBe(350);
  });

  it("returns 0 for non-credit accounts", () => {
    const account: Account = { id: "checking1", name: "Conta", type: "checking", balance: 1000 };
    const bill = getCreditCardBill([], account, 0, 2025);
    expect(bill).toBe(0);
  });
});
