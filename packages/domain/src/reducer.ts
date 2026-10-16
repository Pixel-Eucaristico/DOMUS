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
      if (!tx.status || tx.status === "confirmed") {
        return applyTransactionToAccounts(newState, tx, "apply");
      }
      return newState;
    }

    case EVENT_TYPES.TRANSACTION_UPDATED: {
      const existingTx = state.transactions[event.payload.id];
      if (!existingTx) return state;

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
      const txToDelete = state.transactions[event.payload.id];
      if (!txToDelete) return state;

      const wasConfirmed = !txToDelete.status || txToDelete.status === "confirmed";
      const base = wasConfirmed
        ? applyTransactionToAccounts(state, txToDelete, "reverse")
        : state;
      const { [event.payload.id]: _removed, ...remainingTx } =
        base.transactions;
      return {
        ...base,
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

    case EVENT_TYPES.PAYSLIP_RECORDED: {
      const payslip = event.payload;
      // Uma competência por empresa: regravar substitui a leitura anterior
      const payslips = Object.fromEntries(
        Object.entries(state.payslips).filter(
          ([, p]) => !(p.period === payslip.period && samePayer(p, payslip)) || p.id === payslip.id,
        ),
      );
      return {
        ...state,
        payslips: {
          ...payslips,
          [payslip.id]: { ...payslip, recordedAt: event.timestamp },
        },
      };
    }

    case EVENT_TYPES.PAYSLIP_DELETED: {
      if (!state.payslips[event.payload.id]) return state;
      const { [event.payload.id]: _removed, ...remaining } = state.payslips;
      return { ...state, payslips: remaining };
    }

    default:
      return state;
  }
}

function samePayer(a: { cnpj?: string; company: string }, b: { cnpj?: string; company: string }): boolean {
  const digits = (s?: string) => (s ?? "").replace(/\D/g, "");
  if (digits(a.cnpj) && digits(b.cnpj)) return digits(a.cnpj) === digits(b.cnpj);
  return a.company.trim().toLowerCase() === b.company.trim().toLowerCase();
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
