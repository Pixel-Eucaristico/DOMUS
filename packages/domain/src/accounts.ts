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
  savingsGoalEnabled?: boolean;
  savingsContributionAmount?: number;
  contributionRecurrence?: "monthly" | "biweekly" | "weekly";
  contributionDay?: number;
  linkedCreditCardId?: string;
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
    savingsGoalEnabled: params.savingsGoalEnabled,
    savingsContributionAmount: params.savingsContributionAmount,
    contributionRecurrence: params.contributionRecurrence,
    contributionDay: params.contributionDay,
    linkedCreditCardId: params.linkedCreditCardId,
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

export function getCdbAdditionalCredit(cdbAccount: AccountPayload): number {
  if (cdbAccount.type !== "savings" || !cdbAccount.linkedCreditCardId) return 0;
  return Math.max(0, cdbAccount.balance - (cdbAccount.cdbDividendsTotal ?? 0));
}

export function getAvailableCredit(
  account: AccountPayload,
  transactions: Array<{ accountId: string; type: string; amount: number }>,
  linkedCdb?: AccountPayload,
): number {
  if (account.type !== "credit_card" || !account.creditLimit) return 0;
  const usage = getCreditUsage(account, transactions);
  const additionalCredit = linkedCdb ? getCdbAdditionalCredit(linkedCdb) : 0;
  return account.creditLimit + additionalCredit - usage;
}
