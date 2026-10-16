import type {
  AccountPayload,
  TransactionPayload,
  CategoryPayload,
  InvoiceImportedPayload,
  PayslipPayload,
} from "../../events/src/types";

export interface StoredInvoice extends InvoiceImportedPayload {
  importedAt: number;
  confirmed: boolean;
  confirmedAt?: number;
}

export interface StoredPayslip extends PayslipPayload {
  recordedAt: number;
}

export interface AppState {
  accounts: Record<string, AccountPayload>;
  transactions: Record<string, TransactionPayload>;
  categories: Record<string, CategoryPayload>;
  invoices: Record<string, StoredInvoice>;
  payslips: Record<string, StoredPayslip>;
}

export function createInitialState(): AppState {
  return {
    accounts: {},
    transactions: {},
    categories: {},
    invoices: {},
    payslips: {},
  };
}
