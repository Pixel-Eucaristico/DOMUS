export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "investment";
  balance: number;
  currency: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "income" | "expense";
  budgetGroup: "needs" | "wants" | "savings";
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  date: string;
  isRecurring: boolean;
  installmentId?: string;
  createdAt: string;
}

export interface Installment {
  id: string;
  accountId: string;
  categoryId: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  currentInstallment: number;
  installmentAmount: number;
  startDate: string;
  status: "active" | "completed" | "cancelled";
}

export interface WishlistItem {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  savedAmount: number;
  priority: "low" | "medium" | "high";
  imageUrl?: string;
  targetDate?: string;
  createdAt: string;
}
