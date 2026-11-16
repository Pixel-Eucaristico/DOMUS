/**
 * Calcula efeitos colaterais de gamificação para eventos de domínio.
 * Módulo puro (sem `react-native`, `expo-*` ou hooks React) para ser testável no Vitest.
 */

import { EVENT_TYPES, type DomainEvent } from "@packages/events/src/types";
import { generateId } from "@packages/events/src/factory";
import type { AppState } from "@packages/domain/src/state";
import { calculate503020 } from "@packages/domain/src/transactions";
import {
  GAMIFICATION_EVENTS,
  type AchievementUnlockedPayload,
  type GamificationEvent,
  type GamificationState,
} from "@packages/gamification/src/types";
import {
  checkNewAchievements,
  checkNewMonthlyTrophies,
  createAchievementUnlockedEvent,
} from "@packages/gamification/src/achievements";
import { calculateLevel, shouldLevelUp } from "@packages/gamification/src/levelEngine";
import {
  calculateBudgetAdherenceXp,
  createXpPayload,
  getXpForAction,
} from "@packages/gamification/src/xpEngine";
import { calculateStreakFromTransactions } from "@packages/gamification/src/streakEngine";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { replayAllEvents, replayOptionsFor } from "@/src/context/replay";
import { transactionRewardEligibility } from "@/src/modules/transactionRewards";

export interface DomainEventEffectsInput {
  event: DomainEvent;
  deviceId: string | null;
  /**
   * Quando `true` (fora do modo demo), reconstrói `domain` e `gamification` a partir
   * de `logEvents` (que já deve conter `event` recém-despachado).
   * Quando `false` (modo demo), usa `fallbackDomain` + `event` e `fallbackGamification`.
   */
  useLogEvents: boolean;
  logEvents?: readonly SyncEvent[];
  fallbackDomain: AppState;
  fallbackGamification: GamificationState;
  /** Estado anterior da transação para `TRANSACTION_UPDATED`, capturado antes do dispatch. */
  prevExistingTx?: { status?: string } | null;
  now?: Date;
}

export interface DomainEventEffectsResult {
  gamificationEvents: GamificationEvent[];
  leveledUp: boolean;
  achievementToasts: AchievementUnlockedPayload[];
  monthlyToasts: AchievementUnlockedPayload[];
}

function createEmptyEffects(): DomainEventEffectsResult {
  return {
    gamificationEvents: [],
    leveledUp: false,
    achievementToasts: [],
    monthlyToasts: [],
  };
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isNonLocalEvent(event: DomainEvent, deviceId: string | null): boolean {
  if (!event.deviceId || event.deviceId === "local" || event.deviceId === deviceId) {
    return false;
  }
  return true;
}

function applyTransactionFallback(domain: AppState, event: DomainEvent): AppState {
  const nextTransactions = { ...domain.transactions };
  if (event.type === EVENT_TYPES.TRANSACTION_CREATED) {
    nextTransactions[event.payload.id] = event.payload as any;
  } else if (event.type === EVENT_TYPES.TRANSACTION_UPDATED) {
    const existing = nextTransactions[event.payload.id];
    if (existing) {
      nextTransactions[event.payload.id] = { ...existing, ...event.payload } as any;
    }
  } else if (event.type === EVENT_TYPES.TRANSACTION_DELETED) {
    delete nextTransactions[event.payload.id];
  }
  return { ...domain, transactions: nextTransactions };
}

export function computeDomainEventEffects(
  input: DomainEventEffectsInput,
): DomainEventEffectsResult {
  const {
    event,
    deviceId,
    useLogEvents,
    logEvents,
    fallbackDomain,
    fallbackGamification,
    prevExistingTx,
    now = new Date(),
  } = input;

  if (isNonLocalEvent(event, deviceId)) {
    return createEmptyEffects();
  }

  if (
    event.type !== EVENT_TYPES.TRANSACTION_CREATED &&
    event.type !== EVENT_TYPES.TRANSACTION_UPDATED &&
    event.type !== EVENT_TYPES.TRANSACTION_DELETED
  ) {
    return createEmptyEffects();
  }

  const originDeviceId =
    event.deviceId && event.deviceId !== "local" ? event.deviceId : deviceId || "local";

  let nextDomain: AppState;
  let currentGamification: GamificationState;

  if (useLogEvents) {
    const replayed = replayAllEvents(logEvents ?? [], replayOptionsFor(false, deviceId));
    nextDomain = replayed.domain;
    currentGamification = replayed.gamification;
  } else {
    nextDomain = applyTransactionFallback(fallbackDomain, event);
    currentGamification = fallbackGamification;
  }

  const existingForEligibility = useLogEvents
    ? (prevExistingTx ?? undefined)
    : prevExistingTx !== undefined
      ? prevExistingTx
      : (fallbackDomain.transactions[event.payload.id] as { status?: string } | undefined);

  const nextBudget = calculate503020(
    Object.values(nextDomain.transactions),
    nextDomain.categories,
    now.getMonth(),
    now.getFullYear(),
  );

  const reward = transactionRewardEligibility({
    eventType: event.type,
    payload: event.payload as { status?: string },
    existing: existingForEligibility,
  });

  const gamificationEvents: GamificationEvent[] = [];
  const achievementToasts: AchievementUnlockedPayload[] = [];
  const monthlyToasts: AchievementUnlockedPayload[] = [];
  const nowMs = now.getTime();
  const todayPrefix = formatLocalDate(now);

  // XP e Anti-farm:
  // 1. TRANSACTION_DELETED nunca desconta XP (não pune correção de erros do usuário).
  // 2. TRANSACTION_CREATED concede XP apenas até a cota diária de 5 registros de hábito.
  // 3. Cadastros além da cota salvam normalmente sem XP adicional.
  // 4. Transação pendente não paga XP/streak; a confirmação paga (idempotente por transactionId).
  let totalXpGain = 0;
  if (reward.awardXp) {
    const todayXpEntries = (currentGamification.xpHistory ?? []).filter((entry) => {
      if (entry.source !== "transaction_logged") return false;
      return formatLocalDate(new Date(entry.timestamp)) === todayPrefix;
    });

    if (todayXpEntries.length < 5) {
      const baseXp = getXpForAction("transaction_logged");
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const prevBudget = calculate503020(
        Object.values(nextDomain.transactions),
        nextDomain.categories,
        prevMonth,
        prevYear,
      );
      const budgetBonus = calculateBudgetAdherenceXp(nextBudget, prevBudget);
      totalXpGain = Math.max(0, baseXp + budgetBonus);
    }
  }

  if (totalXpGain > 0) {
    const xpPayload = {
      ...createXpPayload("transaction_logged", totalXpGain),
      transactionId: event.payload.id,
    };
    gamificationEvents.push({
      id: generateId(),
      type: GAMIFICATION_EVENTS.XP_GAINED,
      payload: xpPayload,
      timestamp: nowMs,
      deviceId: originDeviceId,
      signature: "",
    } as GamificationEvent);
  }

  // Level Up check (mantém `leveledUp` para efeito sonoro sem emitir evento LEVEL_UP)
  const currentTotalXp = currentGamification.totalXp;
  const estimatedNewTotalXp = Math.max(0, currentTotalXp + totalXpGain);
  const levelCheck = shouldLevelUp(currentTotalXp, estimatedNewTotalXp);
  const leveledUp = levelCheck.leveledUp;

  // Story 7.9: streak é derivado das transações (não emite mais STREAK_UPDATED).
  // No modo demo (!useLogEvents), recalcula sobre `nextDomain.transactions` para manter conquistas `streak_*` reativas.
  const estimatedStreak = useLogEvents
    ? {
        currentStreak: currentGamification.currentStreak,
        longestStreak: currentGamification.longestStreak,
        lastActiveDate: currentGamification.lastActiveDate,
      }
    : calculateStreakFromTransactions(nextDomain.transactions);

  // Achievement checks
  const estimatedNextGamification: GamificationState = {
    ...currentGamification,
    totalXp: estimatedNewTotalXp,
    level: calculateLevel(estimatedNewTotalXp),
    currentStreak: estimatedStreak.currentStreak,
    longestStreak: estimatedStreak.longestStreak,
    lastActiveDate: estimatedStreak.lastActiveDate,
  };
  const alreadyUnlocked = new Set(
    (currentGamification.unlockedAchievements ?? []).map((a) => a.id),
  );
  const newAchievements = checkNewAchievements(
    nextDomain,
    estimatedNextGamification,
    nextBudget,
    alreadyUnlocked,
  );
  for (const ach of newAchievements) {
    gamificationEvents.push(createAchievementUnlockedEvent(ach, originDeviceId, nowMs));
    achievementToasts.push({
      achievementId: ach.id,
      name: ach.name,
      description: ach.description,
      rarity: ach.rarity,
      xpReward: ach.xpReward,
    });
  }

  // Monthly trophy checks
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const completedMonthly = currentGamification.completedMonthlyTrophies ?? [];
  const newMonthlyTrophies = checkNewMonthlyTrophies(
    nextDomain,
    nextBudget,
    completedMonthly,
  );
  for (const trophy of newMonthlyTrophies) {
    gamificationEvents.push({
      id: generateId(),
      type: GAMIFICATION_EVENTS.MONTHLY_TROPHY_COMPLETED,
      payload: {
        trophyId: trophy.id,
        monthKey,
        name: trophy.name,
        description: trophy.description,
        xpReward: trophy.xpReward,
      },
      timestamp: nowMs,
      deviceId: originDeviceId,
      signature: "",
    } as GamificationEvent);
    monthlyToasts.push({
      achievementId: trophy.id,
      name: `📅 ${trophy.name}`,
      description: trophy.description,
      rarity: "gold",
      xpReward: trophy.xpReward,
    });
  }

  return {
    gamificationEvents,
    leveledUp,
    achievementToasts,
    monthlyToasts,
  };
}
