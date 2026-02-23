import { EVENT_TYPES } from "../../events/src/types";
import type { DomainEvent } from "../../events/src/types";
import type { AppState } from "./state";

export function domainReducer(state: AppState, event: DomainEvent): AppState {
  switch (event.type) {
    case EVENT_TYPES.ACCOUNT_CREATED: {
      const account = event.payload;
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [account.id]: account,
        },
      };
    }

    case EVENT_TYPES.ACCOUNT_UPDATED: {
      const existing = state.accounts[event.payload.id];
      if (!existing) return state;
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [event.payload.id]: { ...existing, ...event.payload },
        },
      };
    }

    case EVENT_TYPES.ACCOUNT_DELETED: {
      const { [event.payload.id]: _removed, ...remainingAccounts } =
        state.accounts;
      return {
        ...state,
        accounts: remainingAccounts,
      };
    }

    case EVENT_TYPES.TRANSACTION_CREATED: {
      const tx = event.payload;
      const newState = {
        ...state,
        transactions: {
          ...state.transactions,
          [tx.id]: tx,
        },
      };
      return applyTransactionToAccounts(newState, tx, "apply");
    }

    case EVENT_TYPES.TRANSACTION_UPDATED: {
      const existingTx = state.transactions[event.payload.id];
      if (!existingTx) return state;

      let intermediate = applyTransactionToAccounts(
        state,
        existingTx,
        "reverse",
      );

      const updatedTx = { ...existingTx, ...event.payload };
      intermediate = {
        ...intermediate,
        transactions: {
          ...intermediate.transactions,
          [updatedTx.id]: updatedTx,
        },
      };

      return applyTransactionToAccounts(intermediate, updatedTx, "apply");
    }

    case EVENT_TYPES.TRANSACTION_DELETED: {
      const txToDelete = state.transactions[event.payload.id];
      if (!txToDelete) return state;

      const reversed = applyTransactionToAccounts(state, txToDelete, "reverse");
      const { [event.payload.id]: _removed, ...remainingTx } =
        reversed.transactions;
      return {
        ...reversed,
        transactions: remainingTx,
      };
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

function applyTransactionToAccounts(
  state: AppState,
  tx: {
    accountId: string;
    type: string;
    amount: number;
    targetAccountId?: string;
  },
  direction: "apply" | "reverse",
): AppState {
  const multiplier = direction === "apply" ? 1 : -1;
  const accounts = { ...state.accounts };

  const sourceAccount = accounts[tx.accountId];

  if (tx.type === "income" && sourceAccount) {
    if (sourceAccount.type !== "credit_card") {
      accounts[tx.accountId] = {
        ...sourceAccount,
        balance: sourceAccount.balance + tx.amount * multiplier,
      };
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
