import type {
  AccountPayload,
  TransactionPayload,
  CategoryPayload,
} from "../../events/src/types";

export interface AppState {
  accounts: Record<string, AccountPayload>;
  transactions: Record<string, TransactionPayload>;
  categories: Record<string, CategoryPayload>;
}

export function createInitialState(): AppState {
  return {
    accounts: {},
    transactions: {},
    categories: {},
  };
}
