import type {
  TransactionPayload,
  TransactionCreatedEvent,
  TransactionUpdatedEvent,
  TransactionDeletedEvent,
  TransactionType,
  TransactionItem,
  CategoryGroup,
  InstallmentInfo,
  InstallmentAmountMode,
  TransactionStatus,
  RecurrenceType,
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
  installmentAmountMode?: InstallmentAmountMode;
  installmentStartFrom?: number;
  targetAccountId?: string;
  items?: TransactionItem[];
  status?: TransactionStatus;
  recurrence?: RecurrenceType;
  recurrenceDays?: number;
}

export type { TransactionItem };

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
      items: params.items,
      status: params.status,
      recurrence: params.recurrence,
      recurrenceDays: params.recurrenceDays,
    };

    return [
      createEvent<TransactionCreatedEvent>(
        EVENT_TYPES.TRANSACTION_CREATED,
        payload,
        deviceId,
      ),
    ];
  }

  const { installmentAmountMode = "total", installmentStartFrom = 1 } = params;
  const startFrom = Math.max(1, Math.min(installmentStartFrom, installments));

  const parentId = generateId();

  // Calculo do valor por parcela
  let perInstallment: number;
  let totalAmount: number;
  if (installmentAmountMode === "per_installment") {
    perInstallment = params.amount;
    totalAmount = Math.round(params.amount * installments * 100) / 100;
  } else {
    totalAmount = params.amount;
    perInstallment = Math.round((params.amount / installments) * 100) / 100;
  }
  const remainder = Math.round((totalAmount - perInstallment * installments) * 100) / 100;

  const events: TransactionCreatedEvent[] = [];

  for (let i = startFrom - 1; i < installments; i++) {
    const isLast = i === installments - 1;
    const currentAmount = isLast ? perInstallment + remainder : perInstallment;
    const dateOffset = i - (startFrom - 1);
    const dueDate = addMonths(params.date, dateOffset);

    const installmentInfo: InstallmentInfo = {
      current: i + 1,
      total: installments,
      parentTransactionId: parentId,
      originalTotalAmount: totalAmount,
    };

    const desc = params.description
      ? `${params.description} (${i + 1}/${installments})`
      : `Parcela ${i + 1}/${installments}`;

    const payload: TransactionPayload = {
      id: i === startFrom - 1 ? parentId : generateId(),
      accountId: params.accountId,
      type: params.type,
      amount: currentAmount,
      categoryId: params.categoryId,
      date: dueDate,
      description: desc,
      installments,
      targetAccountId: params.targetAccountId,
      installmentInfo,
      status: params.status,
      recurrence: params.recurrence,
      recurrenceDays: params.recurrenceDays,
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
    // Only confirmed transactions count toward the budget
    if (tx.status === "pending") continue;

    // Parse YYYY-MM-DD manually to avoid timezone issues with new Date()
    const parts = tx.date.split("-");
    if (parts.length < 2) continue;
    const y = parseInt(parts[0]!, 10);
    const m = parseInt(parts[1]!, 10) - 1; // 0-indexed month

    if (m !== month || y !== year) continue;

    if (tx.type === "income") {
      // Aportes de poupança são transferências internas, não renda real
      // Incluí-los inflaria o totalIncome e distorceria as porcentagens 50/30/20
      if (!tx.description?.startsWith("Aporte poupança:")) {
        totalIncome += tx.amount;
      }
    } else if (tx.type === "expense") {
      // Transferências de aporte de poupança não são gastos reais
      if (tx.description?.startsWith("Transferência: Aporte poupança:")) continue;

      if (tx.items && tx.items.length > 0) {
        for (const item of tx.items) {
          const cat = categories[item.categoryId];
          const group = cat?.group ?? "wants";
          switch (group) {
            case "needs":
              needs += item.amount;
              break;
            case "wants":
              wants += item.amount;
              break;
            case "savings":
              savings += item.amount;
              break;
          }
        }
      } else {
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
    totalIncome,
    adherenceScore: 100,
  };
}

export function getInstallmentSiblings(
  transactions: Record<string, TransactionPayload>,
  txId: string,
): TransactionPayload[] {
  const tx = transactions[txId];
  if (!tx?.installmentInfo) return [];
  const parentId = tx.installmentInfo.parentTransactionId;
  return Object.values(transactions)
    .filter((t) => t.installmentInfo?.parentTransactionId === parentId)
    .sort((a, b) => (a.installmentInfo?.current ?? 0) - (b.installmentInfo?.current ?? 0));
}

export function splitInstallmentSiblings(
  transactions: Record<string, TransactionPayload>,
  txId: string,
): { current: TransactionPayload | null; past: TransactionPayload[]; future: TransactionPayload[] } {
  const tx = transactions[txId];
  if (!tx?.installmentInfo) return { current: null, past: [], future: [] };
  const siblings = getInstallmentSiblings(transactions, txId);
  const currentNum = tx.installmentInfo.current;
  return {
    current: tx,
    past: siblings.filter((s) => (s.installmentInfo?.current ?? 0) < currentNum),
    future: siblings.filter((s) => (s.installmentInfo?.current ?? 0) > currentNum),
  };
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0]!;
}
