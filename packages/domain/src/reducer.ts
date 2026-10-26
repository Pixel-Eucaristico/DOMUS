import { EVENT_TYPES } from "../../events/src/types";
import type {
  DomainEvent,
  AccountUpdatedEvent,
  AccountDeletedEvent,
  TransactionUpdatedEvent,
  TransactionDeletedEvent,
} from "../../events/src/types";
import { createInitialOutOfOrderState } from "./state";
import type { AppState, OutOfOrderState } from "./state";

export function domainReducer(state: AppState, event: DomainEvent): AppState {
  switch (event.type) {
    case EVENT_TYPES.ACCOUNT_CREATED: {
      const account = event.payload;
      // Story 3.7: excluída por uma exclusão que chegou antes — continua excluída.
      if (state.outOfOrder && hasOwn(state.outOfOrder.deletedAccounts, account.id)) return state;
      const created: AppState = {
        ...state,
        accounts: {
          ...state.accounts,
          [account.id]: account,
        },
      };
      return applyPendingAccountOps(created, account.id);
    }

    case EVENT_TYPES.ACCOUNT_UPDATED: {
      if (!hasOwn(state.accounts, event.payload.id)) return queueAccountOp(state, event);
      const existing = state.accounts[event.payload.id]!;
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [event.payload.id]: { ...existing, ...event.payload },
        },
      };
    }

    case EVENT_TYPES.ACCOUNT_DELETED: {
      if (!hasOwn(state.accounts, event.payload.id)) return queueAccountOp(state, event);
      const { [event.payload.id]: _removed, ...remainingAccounts } =
        state.accounts;
      return markAccountDeleted(
        { ...state, accounts: remainingAccounts },
        event.payload.id,
      );
    }

    case EVENT_TYPES.TRANSACTION_CREATED: {
      const tx = event.payload;
      // Story 3.7: excluída por uma exclusão que chegou antes — continua excluída,
      // sem efeito no saldo.
      if (state.outOfOrder && hasOwn(state.outOfOrder.deletedTransactions, tx.id)) return state;
      const newState = {
        ...state,
        transactions: {
          ...state.transactions,
          [tx.id]: tx,
        },
      };
      const created =
        !tx.status || tx.status === "confirmed"
          ? applyTransactionToAccounts(newState, tx, "apply")
          : newState;
      return applyPendingTransactionOps(created, tx.id);
    }

    case EVENT_TYPES.TRANSACTION_UPDATED: {
      if (!hasOwn(state.transactions, event.payload.id)) return queueTransactionOp(state, event);
      const existingTx = state.transactions[event.payload.id]!;

      const wasConfirmed = !existingTx.status || existingTx.status === "confirmed";
      const updatedTx = { ...existingTx, ...event.payload };
      const isConfirmed = !updatedTx.status || updatedTx.status === "confirmed";

      let intermediate = wasConfirmed
        ? applyTransactionToAccounts(state, existingTx, "reverse")
        : state;

      intermediate = {
        ...intermediate,
        transactions: {
          ...intermediate.transactions,
          [updatedTx.id]: updatedTx,
        },
      };

      return isConfirmed
        ? applyTransactionToAccounts(intermediate, updatedTx, "apply")
        : intermediate;
    }

    case EVENT_TYPES.TRANSACTION_DELETED: {
      if (!hasOwn(state.transactions, event.payload.id)) return queueTransactionOp(state, event);
      const txToDelete = state.transactions[event.payload.id]!;

      const wasConfirmed = !txToDelete.status || txToDelete.status === "confirmed";
      const base = wasConfirmed
        ? applyTransactionToAccounts(state, txToDelete, "reverse")
        : state;
      const { [event.payload.id]: _removed, ...remainingTx } =
        base.transactions;
      return markTransactionDeleted(
        { ...base, transactions: remainingTx },
        event.payload.id,
      );
    }

    case EVENT_TYPES.CATEGORY_CREATED: {
      const cat = event.payload;
      return {
        ...state,
        categories: {
          ...state.categories,
          [cat.id]: cat,
        },
      };
    }

    case EVENT_TYPES.INVOICE_IMPORTED: {
      const payload = event.payload;
      return {
        ...state,
        invoices: {
          ...state.invoices,
          [payload.invoiceId]: {
            ...payload,
            importedAt: event.timestamp,
            confirmed: false,
          },
        },
      };
    }

    case EVENT_TYPES.INVOICE_CONFIRMED: {
      const payload = event.payload;
      const invoice = state.invoices[payload.invoiceId];
      if (!invoice) return state;
      return {
        ...state,
        invoices: {
          ...state.invoices,
          [payload.invoiceId]: {
            ...invoice,
            confirmed: true,
            confirmedAt: event.timestamp,
          },
        },
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Story 3.7: edição/exclusão que chega (na ordem do replay) antes do alvo.
// Fica pendente pelo id do alvo e é aplicada logo depois do `*_CREATED`, na
// ordem do log. Toda exclusão deixa a marca do id: `*_CREATED`, edição ou
// exclusão posteriores de id marcado são ignorados. Tudo imutável;
// `outOfOrder` só existe enquanto houver algo pendente ou alguma marca.
// ---------------------------------------------------------------------------

function isOutOfOrderEmpty(o: OutOfOrderState): boolean {
  return (
    Object.keys(o.pendingTransactions).length === 0 &&
    Object.keys(o.pendingAccounts).length === 0 &&
    Object.keys(o.deletedTransactions).length === 0 &&
    Object.keys(o.deletedAccounts).length === 0
  );
}

function withOutOfOrder(state: AppState, next: OutOfOrderState): AppState {
  if (isOutOfOrderEmpty(next)) {
    if (state.outOfOrder === undefined) return state;
    const { outOfOrder: _dropped, ...rest } = state;
    return rest;
  }
  return { ...state, outOfOrder: next };
}

/** Só chaves próprias: um id como "constructor" não pode achar algo do protótipo. */
function hasOwn(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function ownList<T>(record: Readonly<Record<string, readonly T[]>>, key: string): readonly T[] {
  return hasOwn(record, key) ? record[key]! : [];
}

function without<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}

function queueAccountOp(state: AppState, event: AccountUpdatedEvent | AccountDeletedEvent): AppState {
  const ooo = state.outOfOrder ?? createInitialOutOfOrderState();
  const id = event.payload.id;
  // Id já excluído (marca): edição/exclusão ignorada, não fica pendente.
  if (hasOwn(ooo.deletedAccounts, id)) return state;
  return withOutOfOrder(state, {
    ...ooo,
    pendingAccounts: { ...ooo.pendingAccounts, [id]: [...ownList(ooo.pendingAccounts, id), event] },
  });
}

function queueTransactionOp(
  state: AppState,
  event: TransactionUpdatedEvent | TransactionDeletedEvent,
): AppState {
  const ooo = state.outOfOrder ?? createInitialOutOfOrderState();
  const id = event.payload.id;
  if (hasOwn(ooo.deletedTransactions, id)) return state;
  return withOutOfOrder(state, {
    ...ooo,
    pendingTransactions: {
      ...ooo.pendingTransactions,
      [id]: [...ownList(ooo.pendingTransactions, id), event],
    },
  });
}

/** Story 3.7: toda exclusão (normal ou pendente) deixa a marca do id. */
function markAccountDeleted(state: AppState, id: string): AppState {
  const cur = state.outOfOrder ?? createInitialOutOfOrderState();
  return withOutOfOrder(state, { ...cur, deletedAccounts: { ...cur.deletedAccounts, [id]: true } });
}

function markTransactionDeleted(state: AppState, id: string): AppState {
  const cur = state.outOfOrder ?? createInitialOutOfOrderState();
  return withOutOfOrder(state, {
    ...cur,
    deletedTransactions: { ...cur.deletedTransactions, [id]: true },
  });
}

/**
 * Edição de conta pendente sem o `balance`: o formulário de conta grava o saldo
 * derivado (com as transações já lançadas no aparelho que editou); reaplicá-lo
 * depois da criação contaria essas transações de novo. O resto da edição vale.
 */
function withoutBalance(op: AccountUpdatedEvent): AccountUpdatedEvent {
  if (!hasOwn(op.payload, "balance")) return op;
  const { balance: _balance, ...payload } = op.payload;
  return { ...op, payload };
}

/**
 * Aplica as pendências da conta `id` (recém-criada) na ordem do log. Uma
 * exclusão encerra a lista (ela deixa a marca, e o que viesse depois seria uma
 * edição de id excluído, ignorada).
 */
function applyPendingAccountOps(state: AppState, id: string): AppState {
  const ooo = state.outOfOrder;
  if (!ooo || !hasOwn(ooo.pendingAccounts, id)) return state;
  const pending = ownList(ooo.pendingAccounts, id);
  let next = withOutOfOrder(state, { ...ooo, pendingAccounts: without(ooo.pendingAccounts, id) });
  for (const op of pending) {
    next = domainReducer(next, op.type === EVENT_TYPES.ACCOUNT_UPDATED ? withoutBalance(op) : op);
    if (op.type === EVENT_TYPES.ACCOUNT_DELETED) break;
  }
  return next;
}

/** Igual a `applyPendingAccountOps`, para lançamentos (saldo pelo caminho normal). */
function applyPendingTransactionOps(state: AppState, id: string): AppState {
  const ooo = state.outOfOrder;
  if (!ooo || !hasOwn(ooo.pendingTransactions, id)) return state;
  const pending = ownList(ooo.pendingTransactions, id);
  let next = withOutOfOrder(state, {
    ...ooo,
    pendingTransactions: without(ooo.pendingTransactions, id),
  });
  for (const op of pending) {
    next = domainReducer(next, op);
    if (op.type === EVENT_TYPES.TRANSACTION_DELETED) break;
  }
  return next;
}

function applyTransactionToAccounts(
  state: AppState,
  tx: {
    accountId: string;
    type: string;
    amount: number;
    targetAccountId?: string;
    isCdbDividend?: boolean;
  },
  direction: "apply" | "reverse",
): AppState {
  const multiplier = direction === "apply" ? 1 : -1;
  const accounts = { ...state.accounts };

  const sourceAccount = accounts[tx.accountId];

  if (tx.type === "income" && sourceAccount) {
    if (sourceAccount.type !== "credit_card") {
      const balanceUpdate = { balance: sourceAccount.balance + tx.amount * multiplier };
      const dividendUpdate =
        tx.isCdbDividend && sourceAccount.type === "savings"
          ? {
              cdbDividendsTotal:
                (sourceAccount.cdbDividendsTotal ?? 0) + tx.amount * multiplier,
            }
          : {};
      accounts[tx.accountId] = { ...sourceAccount, ...balanceUpdate, ...dividendUpdate };
    }
  } else if (tx.type === "expense" && sourceAccount) {
    if (sourceAccount.type !== "credit_card") {
      accounts[tx.accountId] = {
        ...sourceAccount,
        balance: sourceAccount.balance - tx.amount * multiplier,
      };
    }
  } else if (tx.type === "transfer" && sourceAccount && tx.targetAccountId) {
    const targetAccount = accounts[tx.targetAccountId];
    if (targetAccount) {
      if (sourceAccount.type !== "credit_card") {
        accounts[tx.accountId] = {
          ...sourceAccount,
          balance: sourceAccount.balance - tx.amount * multiplier,
        };
      }
      if (targetAccount.type !== "credit_card") {
        accounts[tx.targetAccountId] = {
          ...targetAccount,
          balance: targetAccount.balance + tx.amount * multiplier,
        };
      }
    }
  }

  return { ...state, accounts };
}
