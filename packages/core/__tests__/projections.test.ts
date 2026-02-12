import { describe, it, expect } from "vitest";
import { projectFutureBalance } from "../src/projections";
import type { Account, Transaction, Installment } from "../src/types";

describe("projectFutureBalance", () => {
  it("returns projections for given months ahead", () => {
    const account: Account = { id: "a1", name: "Conta", type: "checking", balance: 5000 };
    const projections = projectFutureBalance(account, [], [], 3);
    expect(projections).toHaveLength(4);
    expect(projections[0]?.balance).toBe(5000);
  });

  it("accounts for unpaid installments in future months", () => {
    const now = new Date();
    const account: Account = { id: "a1", name: "Conta", type: "checking", balance: 5000 };
    const parentTx: Transaction = {
      id: "t1",
      accountId: "a1",
      type: "expense",
      amount: 300,
      categoryId: "food",
      date: now,
      installments: 3,
    };

    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const twoMonths = new Date(now);
    twoMonths.setMonth(twoMonths.getMonth() + 2);

    const installments: Installment[] = [
      { id: "i1", transactionId: "t1", installmentNumber: 1, totalInstallments: 3, amount: 100, dueDate: now, paid: true },
      { id: "i2", transactionId: "t1", installmentNumber: 2, totalInstallments: 3, amount: 100, dueDate: nextMonth, paid: false },
      { id: "i3", transactionId: "t1", installmentNumber: 3, totalInstallments: 3, amount: 100, dueDate: twoMonths, paid: false },
    ];

    const projections = projectFutureBalance(account, [parentTx], installments, 3);
    expect(projections.length).toBeGreaterThan(1);
    expect(projections[0]?.balance).toBe(5000);
  });

  it("returns accumulated bill for credit card accounts", () => {
    const now = new Date();
    const account: Account = { id: "c1", name: "Visa", type: "credit", balance: 0, creditLimit: 5000 };
    const transactions: Transaction[] = [
      {
        id: "t1",
        accountId: "c1",
        type: "expense",
        amount: 200,
        categoryId: "food",
        date: new Date(now.getFullYear(), now.getMonth(), 5),
      },
      {
        id: "t2",
        accountId: "c1",
        type: "expense",
        amount: 300,
        categoryId: "shop",
        date: new Date(now.getFullYear(), now.getMonth(), 15),
      },
    ];

    const projections = projectFutureBalance(account, transactions, [], 1);
    expect(projections[0]?.balance).toBe(500);
  });
});
