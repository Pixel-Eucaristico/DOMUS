import { createEvent } from "@packages/events/src/factory";
import {
  EVENT_TYPES,
  type AccountPayload,
  type CategoryPayload,
  type TransactionCreatedEvent,
  type TransactionPayload,
} from "@packages/events/src/types";
import { createDefaultCategories } from "@packages/domain/src/categories";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { createXpRecoveryEvent, isXpRecoveryEvent } from "@/src/context/localEventLog";

/**
 * Story 7.2: Tempo máximo (em ms) que o aparelho aguarda pela conclusão do
 * primeiro pull de sincronização antes de liberar os efeitos de boot por timeout.
 */
export const FIRST_PULL_TIMEOUT_MS = 10_000;

export type BootEffectsReadyReason = "no_group" | "pull_completed" | "timeout";

export interface BootEffectsGateOptions {
  timeoutMs?: number;
  onReady?: (reason: BootEffectsReadyReason) => void;
}

export interface BootEffectsGate {
  /** Inicia a espera pelo primeiro pull quando um Grupo de sync ativo é detectado. */
  startGroupWait: () => void;
  /** Libera imediatamente quando não há Grupo de sync configurado. */
  markNoGroup: () => void;
  /** Libera os efeitos assim que o primeiro pull concluir com sucesso. */
  markPullCompleted: () => void;
  /** Registra falha no pull inicial, mantendo a espera até o timeout ou recuperação. */
  markPullFailed: () => void;
  /** Informa se a barreira de sincronização inicial já foi liberada. */
  isReady: () => boolean;
  /** Motivo pelo qual a barreira foi liberada (`null` enquanto pendente). */
  getReason: () => BootEffectsReadyReason | null;
  /** Inscreve um ouvinte para ser notificado quando a barreira liberar. */
  subscribe: (listener: (reason: BootEffectsReadyReason) => void) => () => void;
  /** Cancela timers pendentes ao desmontar. */
  dispose: () => void;
}

/**
 * Cria a máquina de estados da barreira do primeiro pull para efeitos de boot.
 * Livre de dependências de `react-native` para testes determinísticos no Vitest.
 */
export function createBootEffectsGate(options?: BootEffectsGateOptions): BootEffectsGate {
  const timeoutMs = options?.timeoutMs ?? FIRST_PULL_TIMEOUT_MS;
  let ready = false;
  let reason: BootEffectsReadyReason | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<(resolvedReason: BootEffectsReadyReason) => void>();

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const resolve = (nextReason: BootEffectsReadyReason) => {
    if (ready) return;
    clearTimer();
    ready = true;
    reason = nextReason;
    options?.onReady?.(nextReason);
    for (const listener of listeners) {
      listener(nextReason);
    }
  };

  const ensureTimeoutTimer = () => {
    if (ready || timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      resolve("timeout");
    }, timeoutMs);
  };

  return {
    startGroupWait: () => {
      if (ready) return;
      clearTimer();
      ensureTimeoutTimer();
    },
    markNoGroup: () => {
      resolve("no_group");
    },
    markPullCompleted: () => {
      resolve("pull_completed");
    },
    markPullFailed: () => {
      ensureTimeoutTimer();
    },
    isReady: () => ready,
    getReason: () => reason,
    subscribe: (listener) => {
      listeners.add(listener);
      if (ready && reason !== null) {
        listener(reason);
      }
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {
      clearTimer();
      listeners.clear();
    },
  };
}

// ─── Guardas e avaliadores puros dos 3 efeitos de boot ──────────────────────

export interface BootEffectsGuardInput {
  loading: boolean;
  initialSyncReady: boolean;
  isDemoActive?: boolean;
}

/**
 * Verifica se os efeitos automáticos de boot já estão autorizados a executar.
 */
export function shouldRunBootEffects({
  loading,
  initialSyncReady,
  isDemoActive = false,
}: BootEffectsGuardInput): boolean {
  if (loading || !initialSyncReady || isDemoActive) return false;
  return true;
}

export interface DefaultCategoriesEffectInput {
  loading: boolean;
  initialSyncReady: boolean;
  isDemoActive?: boolean;
  deviceId: string | null;
  categories: Record<string, CategoryPayload | unknown>;
  allEvents?: readonly SyncEvent[];
  hasCategoryEvents?: boolean;
  alreadyCreatedInSession?: boolean;
}

/**
 * Avalia se as categorias padrão devem ser geradas no boot.
 * Retorna `[]` enquanto `!initialSyncReady` ou quando o log/estado já possui categorias.
 */
export function evaluateDefaultCategoriesEffect({
  loading,
  initialSyncReady,
  isDemoActive = false,
  deviceId,
  categories,
  allEvents,
  hasCategoryEvents = false,
  alreadyCreatedInSession = false,
}: DefaultCategoriesEffectInput): SyncEvent[] {
  if (!shouldRunBootEffects({ loading, initialSyncReady, isDemoActive })) {
    return [];
  }
  if (!deviceId || alreadyCreatedInSession || hasCategoryEvents) {
    return [];
  }
  if (allEvents?.some((e) => e?.type === EVENT_TYPES.CATEGORY_CREATED)) {
    return [];
  }
  if (Object.keys(categories).length > 0) {
    return [];
  }

  return createDefaultCategories().map((evt) => ({
    id: evt.id,
    type: evt.type as string,
    payload: evt.payload,
    timestamp: evt.timestamp,
    deviceId,
    signature: evt.signature || "",
  }));
}

export interface XpRecoveryEffectInput {
  loading: boolean;
  initialSyncReady: boolean;
  isDemoActive?: boolean;
  debugXp?: number | null;
  deviceId: string | null;
  allEvents: readonly SyncEvent[];
  transactions: Record<string, TransactionPayload | unknown> | readonly unknown[];
  totalXp: number;
}

/**
 * Avalia se o evento de recuperação de XP deve ser emitido no boot.
 * Retorna `[]` enquanto `!initialSyncReady` ou se o log já contém recuperação/XP.
 */
export function evaluateXpRecoveryEffect({
  loading,
  initialSyncReady,
  isDemoActive = false,
  debugXp = null,
  deviceId,
  allEvents,
  transactions,
  totalXp,
}: XpRecoveryEffectInput): SyncEvent[] {
  if (!shouldRunBootEffects({ loading, initialSyncReady, isDemoActive })) {
    return [];
  }
  if (debugXp !== null && debugXp !== undefined) {
    return [];
  }
  if (!deviceId || allEvents.length === 0) {
    return [];
  }

  const txCount = Array.isArray(transactions)
    ? transactions.length
    : Object.keys(transactions).length;
  const hasRecovery = allEvents.some(isXpRecoveryEvent);

  if (txCount > 0 && totalXp <= 5 && !hasRecovery) {
    const recoveryAmount = Math.max(30, txCount * 15);
    return [createXpRecoveryEvent(recoveryAmount, deviceId)];
  }

  return [];
}

// ─── Helpers de período e avaliador de aporte pendente ──────────────────────

/** Formata data como "YYYY-MM-DD". */
export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Retorna "YYYY-MM" do mês de referência. */
export function currentMonthPrefix(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Retorna o intervalo [início, fim] da quinzena em "YYYY-MM-DD".
 * 1ª quinzena: dia 1–15 | 2ª quinzena: dia 16–fim do mês.
 */
export function currentFortnight(now: Date = new Date()): [string, string] {
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
export function currentWeek(now: Date = new Date()): [string, string] {
  const day = now.getDay(); // 0=Dom, 1=Seg, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [fmtDate(monday), fmtDate(sunday)];
}

/**
 * Para recorrência mensal, calcula a data do aporte no mês atual
 * usando o contributionDay configurado (padrão: dia 1).
 * Se o dia é maior que o último dia do mês (ex: 31 em fev), usa o último dia.
 */
export function monthlyContributionDate(contributionDay: number, now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(contributionDay, lastDay);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Verifica se já existe aporte (pendente OU confirmado) no período atual.
 */
export function alreadyScheduledInPeriod(
  transactions: readonly TransactionPayload[],
  accountId: string,
  recurrence: "monthly" | "biweekly" | "weekly",
  descPrefix: string,
  now: Date = new Date(),
): boolean {
  return transactions.some((tx) => {
    if (
      tx.accountId !== accountId ||
      tx.type !== "income" ||
      !tx.description?.startsWith(descPrefix)
    ) {
      return false;
    }

    if (tx.status !== "pending" && tx.status !== "confirmed") return false;

    if (recurrence === "monthly") {
      return tx.date?.startsWith(currentMonthPrefix(now));
    }
    if (recurrence === "biweekly") {
      const [start, end] = currentFortnight(now);
      return tx.date >= start && tx.date <= end;
    }
    const [start, end] = currentWeek(now);
    return tx.date >= start && tx.date <= end;
  });
}

/**
 * Chave do período do aporte: mensal `YYYY-MM`; quinzenal `YYYY-MM-Q1|Q2`;
 * semanal = data (`YYYY-MM-DD`) da segunda-feira da semana.
 */
export function savingsContributionPeriodKey(
  recurrence: "monthly" | "biweekly" | "weekly",
  now: Date = new Date(),
): string {
  if (recurrence === "monthly") return currentMonthPrefix(now);
  if (recurrence === "biweekly") {
    return `${currentMonthPrefix(now)}-${now.getDate() <= 15 ? "Q1" : "Q2"}`;
  }
  return currentWeek(now)[0];
}

/** Id determinístico do aporte pendente: `savings:{accountId}:{período}`. */
export function savingsContributionEventId(
  accountId: string,
  recurrence: "monthly" | "biweekly" | "weekly",
  now: Date = new Date(),
): string {
  return `savings:${accountId}:${savingsContributionPeriodKey(recurrence, now)}`;
}

export interface SavingsGoalScheduleEffectInput {
  loading: boolean;
  initialSyncReady: boolean;
  isDemoActive?: boolean;
  deviceId: string | null;
  accounts: Record<string, AccountPayload> | readonly AccountPayload[];
  transactions: Record<string, TransactionPayload> | readonly TransactionPayload[];
  alreadyRunInSession?: boolean;
  now?: Date;
}

/**
 * Avalia quais eventos de aporte pendente devem ser gerados no boot.
 * Retorna `[]` enquanto `!initialSyncReady` ou se o aporte do período já existe no estado pós-pull.
 */
export function evaluateSavingsGoalScheduleEffect({
  loading,
  initialSyncReady,
  isDemoActive = false,
  deviceId,
  accounts,
  transactions,
  alreadyRunInSession = false,
  now = new Date(),
}: SavingsGoalScheduleEffectInput): TransactionCreatedEvent[] {
  if (!shouldRunBootEffects({ loading, initialSyncReady, isDemoActive })) {
    return [];
  }
  if (alreadyRunInSession) {
    return [];
  }

  const did = deviceId ?? "local";
  const todayStr = fmtDate(now);

  const txList: TransactionPayload[] = Array.isArray(transactions)
    ? [...transactions]
    : Object.values(transactions);
  const accountList: AccountPayload[] = Array.isArray(accounts)
    ? [...accounts]
    : Object.values(accounts);

  const savingsAccounts = accountList.filter(
    (acc) => acc.type === "savings" && (acc.savingsContributionAmount ?? 0) > 0,
  );

  const scheduledEvents: TransactionCreatedEvent[] = [];

  for (const acc of savingsAccounts) {
    const amount = acc.savingsContributionAmount!;
    const recurrence = acc.contributionRecurrence ?? "monthly";
    const descPrefix = "Aporte poupança:";

    if (recurrence === "monthly") {
      const contribDay = acc.contributionDay ?? 1;
      if (now.getDate() < contribDay) continue;
    }

    if (alreadyScheduledInPeriod(txList, acc.id, recurrence, descPrefix, now)) continue;

    const recurrenceLabel =
      recurrence === "weekly" ? "semanal" : recurrence === "biweekly" ? "quinzenal" : "mensal";

    let txDate = todayStr;
    if (recurrence === "monthly") {
      txDate = monthlyContributionDate(acc.contributionDay ?? 1, now);
    }

    const contributionId = savingsContributionEventId(acc.id, recurrence, now);
    const created = createEvent<TransactionCreatedEvent>(
      EVENT_TYPES.TRANSACTION_CREATED,
      {
        id: contributionId,
        accountId: acc.id,
        type: "income",
        amount,
        categoryId: "outros",
        date: txDate,
        description: `Aporte poupança: ${acc.name} (${recurrenceLabel})`,
        status: "pending",
      },
      did,
    );
    const txEvent: TransactionCreatedEvent = { ...created, id: contributionId };
    scheduledEvents.push(txEvent);
  }

  return scheduledEvents;
}
