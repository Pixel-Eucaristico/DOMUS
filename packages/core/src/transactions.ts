import type { Account, Transaction, Installment } from "./types";
import { generateId } from "./id";
import { applyToBalance, applyTransfer } from "./accounts";

export interface CreateTransactionParams {
  accountId: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  categoryId: string;
  date: Date;
  description?: string;
  installments?: number;
  targetAccountId?: string;
}

export interface TransactionResult {
  transaction: Transaction;
  installments: Installment[];
  updatedAccounts: Account[];
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function createTransaction(
  params: CreateTransactionParams,
  accounts: Account[],
): TransactionResult {
  const { accountId, type, amount, categoryId, date, description, installments, targetAccountId } =
    params;

  if (amount <= 0) {
    throw new Error("Transaction amount must be positive");
  }

  const account = accounts.find((a) => a.id === accountId);
  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  if (type === "transfer" && !targetAccountId) {
    throw new Error("Transfer requires a target account");
  }

  const parentId = generateId();

  const parentTransaction: Transaction = {
    id: parentId,
    accountId,
    type,
    amount,
    categoryId,
    date,
    description,
    installments: installments ?? 1,
    targetAccountId,
  };

  const installmentCount = installments ?? 1;
  const generatedInstallments: Installment[] = [];
  const childTransactions: Transaction[] = [];

  if (installmentCount > 1) {
    const installmentAmount = Math.round((amount / installmentCount) * 100) / 100;
    const remainder = Math.round((amount - installmentAmount * installmentCount) * 100) / 100;

    for (let i = 0; i < installmentCount; i++) {
      const dueDate = addMonths(date, i);
      const isLast = i === installmentCount - 1;
      const currentAmount = isLast ? installmentAmount + remainder : installmentAmount;

      const installment: Installment = {
        id: generateId(),
        transactionId: parentId,
        installmentNumber: i + 1,
        totalInstallments: installmentCount,
        amount: currentAmount,
        dueDate,
        paid: i === 0,
      };
      generatedInstallments.push(installment);

      if (i > 0) {
        const childTx: Transaction = {
          id: generateId(),
          accountId,
          type,
          amount: currentAmount,
          categoryId,
          date: dueDate,
          description: description
            ? `${description} (${i + 1}/${installmentCount})`
            : `Parcela ${i + 1}/${installmentCount}`,
          installments: installmentCount,
          parentTransactionId: parentId,
          targetAccountId,
        };
        childTransactions.push(childTx);
      }
    }
  }

  let updatedAccounts = [...accounts];
  const firstAmount =
    installmentCount > 1
      ? generatedInstallments[0]?.amount ?? amount
      : amount;

  if (type === "income") {
    const idx = updatedAccounts.findIndex((a) => a.id === accountId);
    if (idx !== -1) {
      updatedAccounts[idx] = applyToBalance(updatedAccounts[idx]!, firstAmount);
    }
  } else if (type === "expense") {
    if (account.type !== "credit") {
      const idx = updatedAccounts.findIndex((a) => a.id === accountId);
      if (idx !== -1) {
        updatedAccounts[idx] = applyToBalance(updatedAccounts[idx]!, -firstAmount);
      }
    }
  } else if (type === "transfer") {
    const target = updatedAccounts.find((a) => a.id === targetAccountId);
    if (!target) {
      throw new Error(`Target account ${targetAccountId} not found`);
    }
    const result = applyTransfer(account, target, firstAmount);
    const srcIdx = updatedAccounts.findIndex((a) => a.id === accountId);
    const tgtIdx = updatedAccounts.findIndex((a) => a.id === targetAccountId);
    if (srcIdx !== -1) updatedAccounts[srcIdx] = result.source;
    if (tgtIdx !== -1) updatedAccounts[tgtIdx] = result.target;
  }

  return {
    transaction: parentTransaction,
    installments: generatedInstallments,
    updatedAccounts,
  };
}

export function getAccountTransactions(
  transactions: Transaction[],
  accountId: string,
): Transaction[] {
  return transactions.filter(
    (t) => t.accountId === accountId || t.targetAccountId === accountId,
  );
}

export function getCreditCardBill(
  transactions: Transaction[],
  account: Account,
  month: number,
  year: number,
): number {
  if (account.type !== "credit") return 0;

  return transactions
    .filter((t) => {
      if (t.accountId !== account.id || t.type !== "expense") return false;
      const txDate = t.date instanceof Date ? t.date : new Date(t.date);
      return txDate.getMonth() === month && txDate.getFullYear() === year;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}
