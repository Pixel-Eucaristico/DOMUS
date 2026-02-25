import type {
  AccountPayload,
  AccountCreatedEvent,
  AccountUpdatedEvent,
  AccountDeletedEvent,
  AccountType,
} from "../../events/src/types";
import { EVENT_TYPES } from "../../events/src/types";
import { createEvent, generateId } from "../../events/src/factory";

export interface CreateAccountParams {
  name: string;
  type: AccountType;
  balance?: number;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
  color?: string;
}

export function createAccountEvent(
  params: CreateAccountParams,
  deviceId: string = "local",
): AccountCreatedEvent {
  const payload: AccountPayload = {
    id: generateId(),
    name: params.name,
    type: params.type,
    balance: params.balance ?? 0,
    creditLimit: params.creditLimit,
    closingDay: params.closingDay,
    dueDay: params.dueDay,
    color: params.color,
  };

  return createEvent<AccountCreatedEvent>(
    EVENT_TYPES.ACCOUNT_CREATED,
    payload,
    deviceId,
  );
}

export function updateAccountEvent(
  id: string,
  changes: Partial<Omit<AccountPayload, "id">>,
  deviceId: string = "local",
): AccountUpdatedEvent {
  return createEvent<AccountUpdatedEvent>(
    EVENT_TYPES.ACCOUNT_UPDATED,
    { id, ...changes },
    deviceId,
  );
}

export function deleteAccountEvent(
  id: string,
  deviceId: string = "local",
): AccountDeletedEvent {
  return createEvent<AccountDeletedEvent>(
    EVENT_TYPES.ACCOUNT_DELETED,
    { id },
    deviceId,
  );
}

export function getCreditUsage(
  account: AccountPayload,
  transactions: Array<{ accountId: string; type: string; amount: number }>,
): number {
  if (account.type !== "credit_card") return 0;
  return transactions
    .filter((t) => t.accountId === account.id && t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getAvailableCredit(
  account: AccountPayload,
  transactions: Array<{ accountId: string; type: string; amount: number }>,
): number {
  if (account.type !== "credit_card" || !account.creditLimit) return 0;
  const usage = getCreditUsage(account, transactions);
  return account.creditLimit - usage;
}
