import { useCallback, useEffect, useRef } from "react";
import { soundManager } from "@/src/services/SoundManager";
import type { DomainEvent } from "@packages/events/src/types";
import { EVENT_TYPES } from "@packages/events/src/types";
import type { AppState } from "@packages/domain/src/state";
import { calculate503020, type BudgetBreakdown } from "@packages/domain/src/transactions";
import type { GamificationEvent, GamificationState, AchievementUnlockedPayload, MonthlyTrophyCompletedPayload, SeasonalTrophyCompletedPayload, SeasonalTrophySelectedPayload } from "@packages/gamification/src/types";
import { GAMIFICATION_EVENTS } from "@packages/gamification/src/types";
import { checkNewAchievements, checkNewMonthlyTrophies } from "@packages/gamification/src/achievements";
import {
  ALL_SEASONAL_TROPHIES,
  pickSeasonalTrophy,
  getSeasonalTier,
  getSeasonalXp,
} from "@packages/gamification/src/seasonalTrophies";
import type { LiturgicalTrophy } from "@packages/gamification/src/liturgicalTrophies";
import { ALL_LITURGICAL_TROPHIES } from "@packages/gamification/src/liturgicalTrophies";
import { shouldLevelUp } from "@packages/gamification/src/levelEngine";
import { createXpPayload, getXpForAction, calculateBudgetAdherenceXp } from "@packages/gamification/src/xpEngine";
import { updateStreak, type StreakState } from "@packages/gamification/src/streakEngine";
import { generateId } from "@packages/events/src/factory";
import { createDefaultCategories } from "@packages/domain/src/categories";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { getEventStore } from "./useEventStore";
import { compareEvents } from "@/src/context/localEventLog";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface GamificationEffectsInput {
  domain: AppState;
  gamification: GamificationState;
  budget: BudgetBreakdown;
  deviceId: string | null;
  loading: boolean;
  isDemoActive: boolean;
  debugXp: number | null;
  isCatholic: boolean | null;
  allEventsLength: number;
  /** Há algum CATEGORY_CREATED no log (aplicado ou não)? */
  hasCategoryEvents: boolean;
  dispatch: (syncEvt: SyncEvent) => void;
  setLocalEventCount: React.Dispatch<React.SetStateAction<number>>;
  setAllEvents: React.Dispatch<React.SetStateAction<SyncEvent[]>>;
  setPendingToast: (toast: AchievementUnlockedPayload | null) => void;
  setPendingMonthlyToast: (toast: MonthlyTrophyCompletedPayload | null) => void;
  setPendingSeasonalToast: (toast: SeasonalTrophyCompletedPayload | null) => void;
}

function createSyncEvent(event: GamificationEvent | DomainEvent, deviceId: string): SyncEvent {
  return {
    id: event.id,
    type: event.type as string,
    payload: (event as any).payload,
    timestamp: event.timestamp,
    deviceId,
    signature: event.signature || "",
  };
}

export function useGamificationEffects(input: GamificationEffectsInput) {
  const {
    domain, gamification, budget, deviceId, loading, isDemoActive,
    debugXp, isCatholic, allEventsLength, hasCategoryEvents,
    dispatch, setLocalEventCount, setAllEvents,
    setPendingToast, setPendingMonthlyToast, setPendingSeasonalToast,
  } = input;

  // Helper to dispatch a gamification event
  const dispatchGamEvent = useCallback((evt: GamificationEvent) => {
    const originDeviceId = deviceId || "local";
    dispatch(createSyncEvent(evt, originDeviceId));
  }, [dispatch, deviceId]);

  // ── XP Recovery: fix zero XP when user has transactions ──────────────
  useEffect(() => {
    if (isDemoActive || debugXp !== null) return;
    if (!loading && allEventsLength > 0 && deviceId) {
      // Check if recovery already happened (scanning for event ID prefix is fragile,
      // but we keep backward compat with existing logic)
      // Note: we can't easily access allEvents here without passing it, so we use allEventsLength as trigger
      // The actual check uses a dispatched event approach
    }
  }, [isDemoActive, loading, allEventsLength, domain.transactions, gamification.totalXp, deviceId, debugXp]);

  // Story 3.2: guardas por sessão contra laço de autoalimentação — se o evento
  // gerado não chegar ao estado (ex.: Quarentena), o efeito não o recria sem fim.
  const defaultCategoriesCreatedRef = useRef(false);
  const dispatchedMonthlyRef = useRef(new Set<string>());
  const dispatchedSeasonalSelectionRef = useRef(new Set<string>());
  const dispatchedSeasonalCompletionRef = useRef(new Set<string>());
  // O demo tem estado próprio: o que foi gerado nele não bloqueia o app real.
  const modeKey = isDemoActive ? "demo" : "real";

  // Log vazio (ex.: depois de "resetar app"): não há eventos gerados para esperar.
  useEffect(() => {
    if (loading || allEventsLength > 0) return;
    defaultCategoriesCreatedRef.current = false;
    dispatchedMonthlyRef.current.clear();
    dispatchedSeasonalSelectionRef.current.clear();
    dispatchedSeasonalCompletionRef.current.clear();
  }, [loading, allEventsLength]);

  // ── Initialize default categories if none exist ─────────────────────
  useEffect(() => {
    if (isDemoActive) return;
    if (defaultCategoriesCreatedRef.current || hasCategoryEvents) return;
    if (!loading && deviceId && Object.keys(domain.categories).length === 0) {
      defaultCategoriesCreatedRef.current = true;
      const categoryEvents = createDefaultCategories();
      const syncEvents: SyncEvent[] = categoryEvents.map(evt => ({
        id: evt.id,
        type: evt.type as string,
        payload: evt.payload,
        timestamp: evt.timestamp,
        deviceId: deviceId,
        signature: evt.signature || "",
      }));

      getEventStore().then((store) => {
        syncEvents.forEach(evt => store?.appendEvent(evt));
      });

      setAllEvents((prev) => {
        const next = [...prev, ...syncEvents];
        next.sort(compareEvents);
        return next;
      });
      setLocalEventCount((c) => c + syncEvents.length);
    }
  }, [isDemoActive, loading, domain.categories, deviceId, hasCategoryEvents, setAllEvents, setLocalEventCount]);

  // ── Monthly Trophy checker ──────────────────────────────────────────
  useEffect(() => {
    if (loading || !deviceId) return;
    const alreadyCompleted = gamification.completedMonthlyTrophies ?? [];
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const newTrophies = checkNewMonthlyTrophies(domain, budget, alreadyCompleted).filter(
      (t) => !dispatchedMonthlyRef.current.has(`${modeKey}|${t.id}|${monthKey}`),
    );
    if (newTrophies.length === 0) return;

    for (const trophy of newTrophies) {
      dispatchedMonthlyRef.current.add(`${modeKey}|${trophy.id}|${monthKey}`);
      const evt: GamificationEvent = {
        id: generateId(),
        type: GAMIFICATION_EVENTS.MONTHLY_TROPHY_COMPLETED,
        payload: {
          trophyId: trophy.id,
          monthKey,
          name: trophy.name,
          description: trophy.description,
          xpReward: trophy.xpReward,
        },
        timestamp: Date.now(),
        deviceId,
        signature: "",
      } as GamificationEvent;
      dispatchGamEvent(evt);
      setPendingMonthlyToast({
        trophyId: trophy.id,
        monthKey,
        name: trophy.name,
        description: trophy.description,
        xpReward: trophy.xpReward,
      });
    }
  }, [loading, budget, domain, gamification.completedMonthlyTrophies, deviceId, modeKey, dispatchGamEvent, setPendingMonthlyToast]);

  // ── Seasonal Trophy: pick one per month ─────────────────────────────
  useEffect(() => {
    if (loading || !deviceId || isCatholic === null) return;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const alreadySelected = (gamification.selectedSeasonalTrophies ?? []).some(
      s => s.monthKey === monthKey,
    );
    if (alreadySelected || dispatchedSeasonalSelectionRef.current.has(`${modeKey}|${monthKey}`)) return;

    const month = parseInt(monthKey.split("-")[1]!);
    const liturgicalPool: LiturgicalTrophy[] = isCatholic
      ? ALL_LITURGICAL_TROPHIES.filter(t => t.month === month)
      : [];
    const combinedPool = [
      ...ALL_SEASONAL_TROPHIES,
      ...(liturgicalPool as typeof ALL_SEASONAL_TROPHIES),
    ];

    const picked = pickSeasonalTrophy(deviceId, monthKey, combinedPool);
    if (!picked) return;

    const tier = getSeasonalTier(
      picked.id,
      (gamification.completedSeasonalTrophies ?? []).map(c => ({ id: c.trophyId, monthKey: c.monthKey })),
      monthKey,
    );

    const evt: GamificationEvent = {
      id: generateId(),
      type: GAMIFICATION_EVENTS.SEASONAL_TROPHY_SELECTED,
      payload: { trophyId: picked.id, monthKey, tier } satisfies SeasonalTrophySelectedPayload,
      timestamp: Date.now(),
      deviceId,
      signature: "",
    } as GamificationEvent;
    dispatchedSeasonalSelectionRef.current.add(`${modeKey}|${monthKey}`);
    dispatchGamEvent(evt);
    soundManager.play("reveal");
  }, [loading, deviceId, isCatholic, gamification.selectedSeasonalTrophies, gamification.completedSeasonalTrophies, modeKey, dispatchGamEvent]);

  // ── Seasonal Trophy: check completion ───────────────────────────────
  useEffect(() => {
    if (loading || !deviceId) return;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const selectedEntry = (gamification.selectedSeasonalTrophies ?? []).find(
      s => s.monthKey === monthKey,
    );
    if (!selectedEntry) return;

    const alreadyCompleted = (gamification.completedSeasonalTrophies ?? []).some(
      c => c.trophyId === selectedEntry.trophyId && c.monthKey === monthKey,
    );
    const completionKey = `${modeKey}|${selectedEntry.trophyId}|${monthKey}`;
    if (alreadyCompleted || dispatchedSeasonalCompletionRef.current.has(completionKey)) return;

    const trophy =
      ALL_SEASONAL_TROPHIES.find(t => t.id === selectedEntry.trophyId) ??
      (ALL_LITURGICAL_TROPHIES as typeof ALL_SEASONAL_TROPHIES).find(t => t.id === selectedEntry.trophyId);
    if (!trophy) return;

    if (!trophy.check(domain, budget, monthKey)) return;

    const xpReward = getSeasonalXp(trophy.baseXp, selectedEntry.tier);
    const payload = {
      trophyId: trophy.id,
      monthKey,
      tier: selectedEntry.tier,
      name: trophy.name,
      description: trophy.description,
      xpReward,
    };

    const evt: GamificationEvent = {
      id: generateId(),
      type: GAMIFICATION_EVENTS.SEASONAL_TROPHY_COMPLETED,
      payload,
      timestamp: Date.now(),
      deviceId,
      signature: "",
    } as GamificationEvent;
    dispatchedSeasonalCompletionRef.current.add(completionKey);
    dispatchGamEvent(evt);
    setPendingSeasonalToast(payload);
  }, [loading, budget, domain, gamification.selectedSeasonalTrophies, gamification.completedSeasonalTrophies, deviceId, modeKey, dispatchGamEvent, setPendingSeasonalToast]);

  // ── dispatchDomainEvent: create domain event + gamification side-effects ──
  const dispatchDomainEvent = useCallback(
    (event: DomainEvent) => {
      const originDeviceId = (event.deviceId && event.deviceId !== "local") ? event.deviceId : (deviceId || "local");

      dispatch(createSyncEvent(event, originDeviceId));

      // Skip gamification for non-local events
      if (event.deviceId !== "local" && event.deviceId !== deviceId && event.deviceId !== undefined && event.deviceId !== null) return;

      if (
        event.type === EVENT_TYPES.TRANSACTION_CREATED ||
        event.type === EVENT_TYPES.TRANSACTION_UPDATED ||
        event.type === EVENT_TYPES.TRANSACTION_DELETED
      ) {
        // Predict next transaction state for correct XP calculation
        const nextTransactions = { ...domain.transactions };
        if (event.type === EVENT_TYPES.TRANSACTION_CREATED) {
          nextTransactions[event.payload.id] = event.payload as any;
        } else if (event.type === EVENT_TYPES.TRANSACTION_UPDATED) {
          const existing = nextTransactions[event.payload.id];
          if (existing) nextTransactions[event.payload.id] = { ...existing, ...event.payload } as any;
        } else if (event.type === EVENT_TYPES.TRANSACTION_DELETED) {
          delete nextTransactions[event.payload.id];
        }

        const now = new Date();
        const nextBudget = calculate503020(
          Object.values(nextTransactions),
          domain.categories,
          now.getMonth(),
          now.getFullYear(),
        );

        // XP: create grants, delete deducts, update is neutral
        const sign = event.type === EVENT_TYPES.TRANSACTION_DELETED ? -1 : 1;
        const isCreatedOrDeleted =
          event.type === EVENT_TYPES.TRANSACTION_CREATED ||
          event.type === EVENT_TYPES.TRANSACTION_DELETED;
        const baseXp = isCreatedOrDeleted ? sign * getXpForAction("transaction_logged") : 0;
        const budgetBonus = isCreatedOrDeleted ? sign * calculateBudgetAdherenceXp(nextBudget) : 0;
        const totalXpGain = baseXp + budgetBonus;

        if (totalXpGain !== 0) {
          const xpPayload = createXpPayload("transaction_logged", totalXpGain);
          dispatchGamEvent({
            id: generateId(),
            type: GAMIFICATION_EVENTS.XP_GAINED,
            payload: xpPayload,
            timestamp: Date.now(),
            deviceId: originDeviceId,
            signature: "",
          } as GamificationEvent);
        }

        // Streak only for new transactions
        if (event.type === EVENT_TYPES.TRANSACTION_CREATED) {
          const today = todayStr();
          const currentStreak: StreakState = {
            currentStreak: gamification.currentStreak,
            longestStreak: gamification.longestStreak,
            lastActiveDate: gamification.lastActiveDate,
          };
          const streakResult = updateStreak(currentStreak, today);
          dispatchGamEvent({
            id: generateId(),
            type: GAMIFICATION_EVENTS.STREAK_UPDATED,
            payload: streakResult,
            timestamp: Date.now(),
            deviceId: originDeviceId,
            signature: "",
          } as GamificationEvent);
        }

        // Level Up check
        const currentTotalXp = gamification.totalXp;
        const estimatedNewTotalXp = Math.max(0, currentTotalXp + totalXpGain);
        const levelCheck = shouldLevelUp(currentTotalXp, estimatedNewTotalXp);

        if (levelCheck.leveledUp) {
          soundManager.play("levelUp");
          dispatchGamEvent({
            id: generateId(),
            type: GAMIFICATION_EVENTS.LEVEL_UP,
            payload: {
              previousLevel: levelCheck.previousLevel,
              newLevel: levelCheck.newLevel,
              totalXp: estimatedNewTotalXp,
            },
            timestamp: Date.now(),
            deviceId: originDeviceId,
            signature: "",
          } as GamificationEvent);
        }

        // Achievement checks
        const estimatedNextGamification = {
          ...gamification,
          totalXp: estimatedNewTotalXp,
          level: levelCheck.leveledUp ? levelCheck.newLevel : gamification.level,
        };
        const nextDomainForAchievements = { ...domain, transactions: nextTransactions };
        const alreadyUnlocked = new Set(
          (gamification.unlockedAchievements ?? []).map((a) => a.id),
        );
        const newAchievements = checkNewAchievements(
          nextDomainForAchievements,
          estimatedNextGamification,
          nextBudget,
          alreadyUnlocked,
        );
        for (const ach of newAchievements) {
          dispatchGamEvent({
            id: generateId(),
            type: GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED,
            payload: {
              achievementId: ach.id,
              name: ach.name,
              description: ach.description,
              rarity: ach.rarity,
              xpReward: ach.xpReward,
            },
            timestamp: Date.now(),
            deviceId: originDeviceId,
            signature: "",
          } as GamificationEvent);
          setPendingToast({
            achievementId: ach.id,
            name: ach.name,
            description: ach.description,
            rarity: ach.rarity,
            xpReward: ach.xpReward,
          });
        }

        // Monthly trophy checks
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const completedMonthly = gamification.completedMonthlyTrophies ?? [];
        const newMonthlyTrophies = checkNewMonthlyTrophies(
          nextDomainForAchievements,
          nextBudget,
          completedMonthly,
        );
        for (const trophy of newMonthlyTrophies) {
          dispatchGamEvent({
            id: generateId(),
            type: GAMIFICATION_EVENTS.MONTHLY_TROPHY_COMPLETED,
            payload: {
              trophyId: trophy.id,
              monthKey,
              name: trophy.name,
              description: trophy.description,
              xpReward: trophy.xpReward,
            },
            timestamp: Date.now(),
            deviceId: originDeviceId,
            signature: "",
          } as GamificationEvent);
          setPendingToast({
            achievementId: trophy.id,
            name: `📅 ${trophy.name}`,
            description: trophy.description,
            rarity: "gold",
            xpReward: trophy.xpReward,
          });
        }
      }
    },
    [dispatch, dispatchGamEvent, gamification, deviceId, domain, setPendingToast],
  );

  return { dispatchDomainEvent };
}
