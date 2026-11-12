import { useEffect, useRef } from "react";
import { useAppState } from "@/src/context/AppStateProvider";
import {
  alreadyScheduledInPeriod,
  currentFortnight,
  currentMonthPrefix,
  currentWeek,
  evaluateSavingsGoalScheduleEffect,
  fmtDate,
  monthlyContributionDate,
} from "@/src/modules/bootEffectsGate";

export {
  alreadyScheduledInPeriod,
  currentFortnight,
  currentMonthPrefix,
  currentWeek,
  fmtDate,
  monthlyContributionDate,
};

// ─── hook ─────────────────────────────────────────────────────────────────────

/**
 * Roda na inicialização do app (após loading=false e initialSyncReady=true).
 * Para cada conta poupança com `savingsContributionAmount > 0`,
 * cria uma transação de receita pendente caso ainda não exista no período atual.
 *
 * Respeita a `contributionRecurrence` da conta:
 *   - "monthly"  (padrão): 1 por mês, no dia configurado (contributionDay)
 *   - "biweekly": 1 por quinzena
 *   - "weekly":   1 por semana
 *
 * Para mensal: só gera se hoje >= contributionDay do mês.
 */
export function useSavingsGoalScheduler() {
  const { domain, dispatchDomainEvent, deviceId, loading, initialSyncReady, isDemoActive } = useAppState();
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Aguarda dados carregarem do SQLite e o primeiro pull do sync antes de executar
    if (loading || !initialSyncReady || isDemoActive || hasRunRef.current) return;
    hasRunRef.current = true;

    const scheduledEvents = evaluateSavingsGoalScheduleEffect({
      loading,
      initialSyncReady,
      isDemoActive,
      deviceId,
      accounts: domain.accounts,
      transactions: domain.transactions,
    });

    for (const txEvent of scheduledEvents) {
      dispatchDomainEvent(txEvent);
    }
  }, [loading, initialSyncReady, isDemoActive, domain.accounts, domain.transactions, deviceId, dispatchDomainEvent]);
}
