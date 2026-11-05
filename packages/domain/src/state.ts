import type {
  AccountPayload,
  TransactionPayload,
  CategoryPayload,
  InvoiceImportedPayload,
  OleriteReadingPayload,
} from "../../events/src/types";

export interface StoredInvoice extends InvoiceImportedPayload {
  importedAt: number;
  confirmed: boolean;
  confirmedAt?: number;
}

export interface AppState {
  accounts: Record<string, AccountPayload>;
  transactions: Record<string, TransactionPayload>;
  categories: Record<string, CategoryPayload>;
  invoices: Record<string, StoredInvoice>;
  oleriteReadings: Record<string, OleriteReadingPayload>;
}

export function createInitialState(): AppState {
  return {
    accounts: {},
    transactions: {},
    categories: {},
    invoices: {},
    oleriteReadings: {},
  };
}
