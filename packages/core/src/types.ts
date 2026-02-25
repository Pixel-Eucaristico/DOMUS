export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit";
  balance: number;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  categoryId: string;
  date: Date;
  description?: string;
  installments?: number;
  parentTransactionId?: string;
  targetAccountId?: string;
}

export interface Installment {
  id: string;
  transactionId: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: Date;
  paid: boolean;
}

export interface BudgetBreakdown {
  needs: number;
  wants: number;
  savings: number;
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
}

export interface BalanceProjection {
  date: Date;
  balance: number;
}

export type CategoryGroup = "needs" | "wants" | "savings";

export interface Category {
  id: string;
  name: string;
  group: CategoryGroup;
}
