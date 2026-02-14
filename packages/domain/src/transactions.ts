import type {
  TransactionPayload,
  TransactionCreatedEvent,
  TransactionUpdatedEvent,
  TransactionDeletedEvent,
  TransactionType,
  CategoryGroup,
  InstallmentInfo,
} from "../../events/src/types";
import { EVENT_TYPES } from "../../events/src/types";
import { createEvent, generateId } from "../../events/src/factory";

export interface CreateTransactionParams {
  accountId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string;
  description?: string;
  installments?: number;
  targetAccountId?: string;
}

export function createTransactionEvent(
  params: CreateTransactionParams,
  deviceId: string = "local",
): TransactionCreatedEvent[] {
  const { installments = 1 } = params;

  if (installments <= 1) {
    const payload: TransactionPayload = {
      id: generateId(),
      accountId: params.accountId,
      type: params.type,
      amount: params.amount,
      categoryId: params.categoryId,
      date: params.date,
      description: params.description,
      installments: 1,
      targetAccountId: params.targetAccountId,
    };

    return [
      createEvent<TransactionCreatedEvent>(
        EVENT_TYPES.TRANSACTION_CREATED,
        payload,
        deviceId,
      ),
    ];
  }

  const parentId = generateId();
  const installmentAmount =
    Math.round((params.amount / installments) * 100) / 100;
  const remainder =
    Math.round((params.amount - installmentAmount * installments) * 100) / 100;

  const events: TransactionCreatedEvent[] = [];

  for (let i = 0; i < installments; i++) {
    const isLast = i === installments - 1;
    const currentAmount = isLast ? installmentAmount + remainder : installmentAmount;
    const dueDate = addMonths(params.date, i);

    const installmentInfo: InstallmentInfo = {
      current: i + 1,
      total: installments,
      parentTransactionId: parentId,
    };

    const desc = params.description
      ? `${params.description} (${i + 1}/${installments})`
      : `Parcela ${i + 1}/${installments}`;

    const payload: TransactionPayload = {
      id: i === 0 ? parentId : generateId(),
      accountId: params.accountId,
      type: params.type,
      amount: currentAmount,
      categoryId: params.categoryId,
      date: dueDate,
      description: desc,
      installments,
      targetAccountId: params.targetAccountId,
      installmentInfo,
    };

    events.push(
      createEvent<TransactionCreatedEvent>(
        EVENT_TYPES.TRANSACTION_CREATED,
        payload,
        deviceId,
      ),
    );
  }

  return events;
}

export function updateTransactionEvent(
  id: string,
  changes: Partial<Omit<TransactionPayload, "id">>,
  deviceId: string = "local",
): TransactionUpdatedEvent {
  return createEvent<TransactionUpdatedEvent>(
    EVENT_TYPES.TRANSACTION_UPDATED,
    { id, ...changes },
    deviceId,
  );
}

export function deleteTransactionEvent(
  id: string,
  deviceId: string = "local",
): TransactionDeletedEvent {
  return createEvent<TransactionDeletedEvent>(
    EVENT_TYPES.TRANSACTION_DELETED,
    { id },
    deviceId,
  );
}

export interface BudgetBreakdown {
  needs: number;
  wants: number;
  savings: number;
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
}

export function calculate503020(
  transactions: TransactionPayload[],
  categories: Record<string, { group: CategoryGroup }>,
  month: number,
  year: number,
): BudgetBreakdown {
  let needs = 0;
  let wants = 0;
  let savings = 0;

  const monthExpenses = transactions.filter((t) => {
    if (t.type !== "expense") return false;
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  for (const tx of monthExpenses) {
    const cat = categories[tx.categoryId];
    const group = cat?.group ?? "wants";
    switch (group) {
      case "needs":
        needs += tx.amount;
        break;
      case "wants":
        wants += tx.amount;
        break;
      case "savings":
        savings += tx.amount;
        break;
    }
  }

  const total = needs + wants + savings;

  return {
    needs,
    wants,
    savings,
    needsPercent: total > 0 ? Math.round((needs / total) * 100) : 0,
    wantsPercent: total > 0 ? Math.round((wants / total) * 100) : 0,
    savingsPercent: total > 0 ? Math.round((savings / total) * 100) : 0,
  };
}

export function getIdeal503020(totalIncome: number): BudgetBreakdown {
  return {
    needs: totalIncome * 0.5,
    wants: totalIncome * 0.3,
    savings: totalIncome * 0.2,
    needsPercent: 50,
    wantsPercent: 30,
    savingsPercent: 20,
  };
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0]!;
}
