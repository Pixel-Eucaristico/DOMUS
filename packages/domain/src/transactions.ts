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
  totalIncome: number;
  adherenceScore: number;
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
  let totalIncome = 0;

  for (const tx of transactions) {
    // Parse YYYY-MM-DD manually to avoid timezone issues with new Date()
    const parts = tx.date.split("-");
    if (parts.length < 2) continue;
    const y = parseInt(parts[0]!, 10);
    const m = parseInt(parts[1]!, 10) - 1; // 0-indexed month

    if (m !== month || y !== year) continue;

    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else if (tx.type === "expense") {
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
  }

  const denominator = totalIncome > 0 ? totalIncome : (needs + wants + savings);
  const needsPercent = denominator > 0 ? Math.round((needs / denominator) * 100) : 0;
  const wantsPercent = denominator > 0 ? Math.round((wants / denominator) * 100) : 0;
  const savingsPercent = denominator > 0 ? Math.round((savings / denominator) * 100) : 0;

  // Adherence Score: Start at 100, penalize overspending in Needs/Wants and undersaving in Savings.
  let adherenceScore = 0;
  if (denominator > 0) {
    let score = 100;
    if (needsPercent > 50) score -= (needsPercent - 50) * 2;
    if (wantsPercent > 30) score -= (wantsPercent - 30) * 2;
    if (savingsPercent < 20) score -= (20 - savingsPercent) * 2;
    adherenceScore = Math.max(0, Math.min(100, score));
  }

  return {
    needs,
    wants,
    savings,
    totalIncome,
    needsPercent,
    wantsPercent,
    savingsPercent,
    adherenceScore,
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
