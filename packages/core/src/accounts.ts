import type { Account } from "./types";
import { generateId } from "./id";

export function createAccount(
  params: Omit<Account, "id" | "balance"> & { balance?: number },
): Account {
  return {
    id: generateId(),
    balance: params.balance ?? 0,
    ...params,
  };
}

export function applyToBalance(account: Account, amount: number): Account {
  if (account.type === "credit") {
    return account;
  }
  return { ...account, balance: account.balance + amount };
}

export function applyTransfer(
  source: Account,
  target: Account,
  amount: number,
): { source: Account; target: Account } {
  if (amount <= 0) {
    throw new Error("Transfer amount must be positive");
  }

  const updatedSource: Account =
    source.type === "credit"
      ? source
      : { ...source, balance: source.balance - amount };

  const updatedTarget: Account =
    target.type === "credit"
      ? target
      : { ...target, balance: target.balance + amount };

  return { source: updatedSource, target: updatedTarget };
}

export function getCreditUsage(account: Account, pendingExpenses: number): number {
  if (account.type !== "credit") {
    return 0;
  }
  return pendingExpenses;
}

export function getAvailableCredit(account: Account, pendingExpenses: number): number {
  if (account.type !== "credit" || account.creditLimit === undefined) {
    return 0;
  }
  return account.creditLimit - pendingExpenses;
}
