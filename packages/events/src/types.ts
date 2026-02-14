export const EVENT_TYPES = {
  ACCOUNT_CREATED: "ACCOUNT_CREATED",
  ACCOUNT_UPDATED: "ACCOUNT_UPDATED",
  ACCOUNT_DELETED: "ACCOUNT_DELETED",
  TRANSACTION_CREATED: "TRANSACTION_CREATED",
  TRANSACTION_UPDATED: "TRANSACTION_UPDATED",
  TRANSACTION_DELETED: "TRANSACTION_DELETED",
  CATEGORY_CREATED: "CATEGORY_CREATED",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export const ACCOUNT_TYPES = {
  CHECKING: "checking",
  SAVINGS: "savings",
  WALLET: "wallet",
  CREDIT_CARD: "credit_card",
} as const;

export type AccountType = (typeof ACCOUNT_TYPES)[keyof typeof ACCOUNT_TYPES];

export const TRANSACTION_TYPES = {
  INCOME: "income",
  EXPENSE: "expense",
  TRANSFER: "transfer",
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];

export const CATEGORY_GROUPS = {
  NEEDS: "needs",
  WANTS: "wants",
  SAVINGS: "savings",
} as const;

export type CategoryGroup =
  (typeof CATEGORY_GROUPS)[keyof typeof CATEGORY_GROUPS];

export interface InstallmentInfo {
  current: number;
  total: number;
  parentTransactionId: string;
}

export interface AccountPayload {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
  color?: string;
}

export interface TransactionPayload {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string;
  description?: string;
  installments?: number;
  targetAccountId?: string;
  installmentInfo?: InstallmentInfo;
}

export interface CategoryPayload {
  id: string;
  name: string;
  group: CategoryGroup;
}

interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: number;
  deviceId: string;
  signature: string;
}

export interface AccountCreatedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.ACCOUNT_CREATED;
  payload: AccountPayload;
}

export interface AccountUpdatedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.ACCOUNT_UPDATED;
  payload: Partial<AccountPayload> & { id: string };
}

export interface AccountDeletedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.ACCOUNT_DELETED;
  payload: { id: string };
}

export interface TransactionCreatedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.TRANSACTION_CREATED;
  payload: TransactionPayload;
}

export interface TransactionUpdatedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.TRANSACTION_UPDATED;
  payload: Partial<TransactionPayload> & { id: string };
}

export interface TransactionDeletedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.TRANSACTION_DELETED;
  payload: { id: string };
}

export interface CategoryCreatedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.CATEGORY_CREATED;
  payload: CategoryPayload;
}

export type DomainEvent =
  | AccountCreatedEvent
  | AccountUpdatedEvent
  | AccountDeletedEvent
  | TransactionCreatedEvent
  | TransactionUpdatedEvent
  | TransactionDeletedEvent
  | CategoryCreatedEvent;
