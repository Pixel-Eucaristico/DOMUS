import type { Account, Transaction, Installment, BalanceProjection } from "./types";

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function projectFutureBalance(
  account: Account,
  transactions: Transaction[],
  installments: Installment[],
  monthsAhead: number,
): BalanceProjection[] {
  if (account.type === "credit") {
    return projectCreditBalance(account, transactions, installments, monthsAhead);
  }

  const projections: BalanceProjection[] = [];
  const now = new Date();
  let runningBalance = account.balance;

  for (let i = 0; i <= monthsAhead; i++) {
    const projectionDate = addMonths(now, i);
    const monthStart = startOfMonth(projectionDate);
    const monthEnd = new Date(
      projectionDate.getFullYear(),
      projectionDate.getMonth() + 1,
      0,
    );

    if (i === 0) {
      projections.push({ date: monthStart, balance: runningBalance });
      continue;
    }

    const futureInstallments = installments.filter((inst) => {
      if (inst.paid) return false;
      const dueDate = inst.dueDate instanceof Date ? inst.dueDate : new Date(inst.dueDate);
      return dueDate >= monthStart && dueDate <= monthEnd;
    });

    for (const inst of futureInstallments) {
      const parentTx = transactions.find((t) => t.id === inst.transactionId);
      if (!parentTx || parentTx.accountId !== account.id) continue;

      if (parentTx.type === "expense") {
        runningBalance -= inst.amount;
      } else if (parentTx.type === "income") {
        runningBalance += inst.amount;
      }
    }

    const recurringTx = transactions.filter((t) => {
      if (t.accountId !== account.id) return false;
      if (t.installments && t.installments > 1) return false;
      if (t.parentTransactionId) return false;
      const txDate = t.date instanceof Date ? t.date : new Date(t.date);
      return txDate.getMonth() === projectionDate.getMonth();
    });

    for (const tx of recurringTx) {
      if (tx.type === "income") {
        runningBalance += tx.amount;
      } else if (tx.type === "expense") {
        runningBalance -= tx.amount;
      }
    }

    projections.push({
      date: monthStart,
      balance: Math.round(runningBalance * 100) / 100,
    });
  }

  return projections;
}

function projectCreditBalance(
  account: Account,
  transactions: Transaction[],
  installments: Installment[],
  monthsAhead: number,
): BalanceProjection[] {
  const projections: BalanceProjection[] = [];
  const now = new Date();

  for (let i = 0; i <= monthsAhead; i++) {
    const projectionDate = addMonths(now, i);
    const monthStart = startOfMonth(projectionDate);
    const monthEnd = new Date(
      projectionDate.getFullYear(),
      projectionDate.getMonth() + 1,
      0,
    );

    let monthTotal = 0;

    const monthTx = transactions.filter((t) => {
      if (t.accountId !== account.id || t.type !== "expense") return false;
      if (t.parentTransactionId) return false;
      const txDate = t.date instanceof Date ? t.date : new Date(t.date);
      return txDate >= monthStart && txDate <= monthEnd;
    });

    for (const tx of monthTx) {
      monthTotal += tx.amount;
    }

    const futureInstallments = installments.filter((inst) => {
      if (inst.paid) return false;
      const parentTx = transactions.find((t) => t.id === inst.transactionId);
      if (!parentTx || parentTx.accountId !== account.id) return false;
      const dueDate = inst.dueDate instanceof Date ? inst.dueDate : new Date(inst.dueDate);
      return dueDate >= monthStart && dueDate <= monthEnd;
    });

    for (const inst of futureInstallments) {
      monthTotal += inst.amount;
    }

    projections.push({
      date: monthStart,
      balance: Math.round(monthTotal * 100) / 100,
    });
  }

  return projections;
}
