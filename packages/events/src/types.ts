export const EVENT_TYPES = {
  ACCOUNT_CREATED: "ACCOUNT_CREATED",
  ACCOUNT_UPDATED: "ACCOUNT_UPDATED",
  ACCOUNT_DELETED: "ACCOUNT_DELETED",
  TRANSACTION_CREATED: "TRANSACTION_CREATED",
  TRANSACTION_UPDATED: "TRANSACTION_UPDATED",
  TRANSACTION_DELETED: "TRANSACTION_DELETED",
  CATEGORY_CREATED: "CATEGORY_CREATED",
  INVOICE_IMPORTED: "INVOICE_IMPORTED",
  INVOICE_CONFIRMED: "INVOICE_CONFIRMED",
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
  originalTotalAmount?: number;
}

export type InstallmentAmountMode = "total" | "per_installment";

export interface AccountPayload {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
  color?: string;
  /** Ativa modo "objetivo de poupança" nesta conta */
  savingsGoalEnabled?: boolean;
  /** Valor do aporte periódico (cria transação pendente a cada período) */
  savingsContributionAmount?: number;
  /** Periodicidade do aporte: "monthly" (padrão) | "biweekly" | "weekly" */
  contributionRecurrence?: "monthly" | "biweekly" | "weekly";
  /** Dia do mês para gerar o aporte mensal (1-28). Padrão: 1 */
  contributionDay?: number;
  /** savings/CDB vinculada a um credit_card — saldo vira crédito adicional */
  linkedCreditCardId?: string;
  /** Soma acumulada de dividendos recebidos — excluída do cálculo de crédito adicional */
  cdbDividendsTotal?: number;
}

export interface TransactionItem {
  description: string;
  amount: number;
  categoryId: string;
  subcategoryId?: string;          // subcategoria NCM granular
  groupOverride?: CategoryGroup;   // override do grupo padrão (needs/wants/savings)
  ean?: string;
  ncm?: string;
}

export type TransactionStatus = "pending" | "confirmed";
export type RecurrenceType = "once" | "weekly" | "monthly" | "yearly" | "custom";

export interface TransactionPayload {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  subcategoryId?: string;          // subcategoria NCM granular (nível transação)
  groupOverride?: CategoryGroup;   // override manual do grupo needs/wants/savings
  date: string;
  description?: string;
  items?: TransactionItem[];
  installments?: number;
  targetAccountId?: string;
  installmentInfo?: InstallmentInfo;
  status?: TransactionStatus;
  recurrence?: RecurrenceType;
  recurrenceDays?: number;  // usado quando recurrence === "custom"
  returnDate?: string;          // YYYY-MM-DD — data esperada de devolução (só em transfers)
  returnTransactionId?: string; // ID da tx de retorno gerada automaticamente
  isReturnTransfer?: boolean;   // marca a tx de volta para não gerar loop
  isCdbDividend?: boolean;      // receita de dividendo CDB — não altera crédito adicional
}

export interface CategoryPayload {
  id: string;
  name: string;
  group: CategoryGroup;
}

export interface InvoiceItemPayload {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceEmitter {
  cnpj: string;
  name: string;
}

export interface InvoiceImportedPayload {
  invoiceId: string;
  source: "SEFAZ_QR" | "OCR_FALLBACK";
  emitter: InvoiceEmitter;
  date: string;
  items: InvoiceItemPayload[];
  totalAmount: number;
  rawHtmlHash?: string;
  confidenceScore?: number;
}

export interface InvoiceConfirmedPayload {
  invoiceId: string;
  date: string;
  totalAmount: number;
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

export interface InvoiceImportedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.INVOICE_IMPORTED;
  payload: InvoiceImportedPayload;
}

export interface InvoiceConfirmedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.INVOICE_CONFIRMED;
  payload: InvoiceConfirmedPayload;
}

export type DomainEvent =
  | AccountCreatedEvent
  | AccountUpdatedEvent
  | AccountDeletedEvent
  | TransactionCreatedEvent
  | TransactionUpdatedEvent
  | TransactionDeletedEvent
  | CategoryCreatedEvent
  | InvoiceImportedEvent
  | InvoiceConfirmedEvent;
