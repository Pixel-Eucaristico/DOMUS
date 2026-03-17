import { useEffect, useRef } from "react";
import { useAppState } from "@/src/context/AppStateProvider";
import { createEvent, generateId } from "@packages/events/src/factory";
import { EVENT_TYPES } from "@packages/events/src/types";
import type { TransactionCreatedEvent } from "@packages/events/src/types";

// ─── helpers de período ───────────────────────────────────────────────────────

/** Retorna "YYYY-MM" do mês atual. */
function currentMonthPrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Retorna o intervalo [início, fim] da quinzena atual no formato "YYYY-MM-DD".
 * 1ª quinzena: dia 1–15 | 2ª quinzena: dia 16–fim do mês.
 */
function currentFortnight(): [string, string] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const mm = String(m).padStart(2, "0");
  const lastDay = new Date(y, m, 0).getDate();
  if (now.getDate() <= 15) {
    return [`${y}-${mm}-01`, `${y}-${mm}-15`];
  }
  return [`${y}-${mm}-16`, `${y}-${mm}-${lastDay}`];
}

/**
 * Retorna o intervalo [início, fim] da semana atual (Segunda–Domingo) em "YYYY-MM-DD".
 */
function currentWeek(): [string, string] {
  const now = new Date();
  const day = now.getDay(); // 0=Dom, 1=Seg, ...
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return [fmt(monday), fmt(sunday)];
}

function alreadyScheduledInPeriod(
  transactions: ReturnType<typeof Object.values>,
  accountId: string,
  recurrence: "monthly" | "biweekly" | "weekly",
  descPrefix: string,
): boolean {
  return transactions.some((tx) => {
    if (
      tx.accountId !== accountId ||
      tx.type !== "income" ||
      tx.status !== "pending" ||
      !tx.description?.startsWith(descPrefix)
    )
      return false;

    if (recurrence === "monthly") {
      return tx.date?.startsWith(currentMonthPrefix());
    }
    if (recurrence === "biweekly") {
      const [start, end] = currentFortnight();
      return tx.date >= start && tx.date <= end;
    }
    // weekly
    const [start, end] = currentWeek();
    return tx.date >= start && tx.date <= end;
  });
}

// ─── hook ─────────────────────────────────────────────────────────────────────

/**
 * Roda na inicialização do app (após loading=false).
 * Para cada conta poupança com `savingsContributionAmount > 0`,
 * cria uma transação de receita pendente caso ainda não exista no período atual.
 *
 * Respeita a `contributionRecurrence` da conta:
 *   - "monthly"  (padrão): 1 por mês
 *   - "biweekly": 1 por quinzena
 *   - "weekly":   1 por semana
 */
export function useSavingsGoalScheduler() {
  const { domain, dispatchDomainEvent, deviceId, loading } = useAppState();
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Aguarda dados carregarem do SQLite antes de executar
    if (loading || hasRunRef.current) return;
    hasRunRef.current = true;

    const did = deviceId ?? "local";
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const txList = Object.values(domain.transactions);

    // Qualquer conta poupança com valor de aporte configurado
    const savingsAccounts = Object.values(domain.accounts).filter(
      (acc) => acc.type === "savings" && (acc.savingsContributionAmount ?? 0) > 0,
    );

    for (const acc of savingsAccounts) {
      const amount = acc.savingsContributionAmount!;
      const recurrence = acc.contributionRecurrence ?? "monthly";
      const descPrefix = "Aporte poupança:";

      if (alreadyScheduledInPeriod(txList, acc.id, recurrence, descPrefix)) continue;

      const recurrenceLabel =
        recurrence === "weekly" ? "semanal" : recurrence === "biweekly" ? "quinzenal" : "mensal";

      const txEvent = createEvent<TransactionCreatedEvent>(
        EVENT_TYPES.TRANSACTION_CREATED,
        {
          id: generateId(),
          accountId: acc.id,
          type: "income",
          amount,
          categoryId: "outros",
          date: todayStr,
          description: `Aporte poupança: ${acc.name} (${recurrenceLabel})`,
          status: "pending",
        },
        did,
      );
      dispatchDomainEvent(txEvent);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps
}
