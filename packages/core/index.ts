export type {
  Account,
  Transaction,
  Installment,
  BudgetBreakdown,
  BalanceProjection,
  Category,
  CategoryGroup,
} from "./src/types";

export { generateId } from "./src/id";

export {
  createAccount,
  applyToBalance,
  applyTransfer,
  getCreditUsage,
  getAvailableCredit,
} from "./src/accounts";

export {
  createTransaction,
  getAccountTransactions,
  getCreditCardBill,
} from "./src/transactions";
export type { CreateTransactionParams, TransactionResult } from "./src/transactions";

export { calculate503020, getIdeal503020 } from "./src/budget";

export { projectFutureBalance } from "./src/projections";
