import type {
  AccountPayload,
  TransactionPayload,
  CategoryPayload,
  InvoiceImportedPayload,
  AccountUpdatedEvent,
  AccountDeletedEvent,
  TransactionUpdatedEvent,
  TransactionDeletedEvent,
} from "../../events/src/types";

export interface StoredInvoice extends InvoiceImportedPayload {
  importedAt: number;
  confirmed: boolean;
  confirmedAt?: number;
}

/**
 * Story 3.7: edições/exclusões que chegaram (na ordem do replay) antes do alvo.
 * Estado derivado, refeito a cada replay — nunca persistido nem gravado no log.
 *
 * - `pendingTransactions`/`pendingAccounts`: por id do alvo, os eventos na ordem
 *   do log; aplicados logo depois do `*_CREATED` do alvo.
 * - `deletedTransactions`/`deletedAccounts`: alvos excluídos por uma exclusão
 *   pendente; um `*_CREATED` posterior com o mesmo id não os traz de volta.
 */
export interface OutOfOrderState {
  pendingTransactions: Readonly<Record<string, readonly (TransactionUpdatedEvent | TransactionDeletedEvent)[]>>;
  pendingAccounts: Readonly<Record<string, readonly (AccountUpdatedEvent | AccountDeletedEvent)[]>>;
  deletedTransactions: Readonly<Record<string, true>>;
  deletedAccounts: Readonly<Record<string, true>>;
}

export interface AppState {
  accounts: Record<string, AccountPayload>;
  transactions: Record<string, TransactionPayload>;
  categories: Record<string, CategoryPayload>;
  invoices: Record<string, StoredInvoice>;
  /**
   * Story 3.7: controle interno do replay (ver `OutOfOrderState`). Só existe
   * quando alguma edição/exclusão chegou antes do alvo; telas e seletores não
   * devem ler este campo.
   */
  outOfOrder?: OutOfOrderState;
}

export function createInitialOutOfOrderState(): OutOfOrderState {
  return {
    pendingTransactions: {},
    pendingAccounts: {},
    deletedTransactions: {},
    deletedAccounts: {},
  };
}

export function createInitialState(): AppState {
  return {
    accounts: {},
    transactions: {},
    categories: {},
    invoices: {},
  };
}
