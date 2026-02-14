import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import type { DomainEvent, AccountPayload, TransactionPayload, CategoryPayload } from "@packages/events/src/types";
import { EVENT_TYPES } from "@packages/events/src/types";
import { domainReducer } from "@packages/domain/src/reducer";
import { createInitialState, type AppState } from "@packages/domain/src/state";
import { calculate503020, type BudgetBreakdown } from "@packages/domain/src/transactions";
import type { GamificationEvent, GamificationState } from "@packages/gamification/src/types";
import { GAMIFICATION_EVENTS } from "@packages/gamification/src/types";
import { gamificationReducer, createInitialGamificationState } from "@packages/gamification/src/reducer";
import { calculateLevel, getLevelInfo, shouldLevelUp, type LevelInfo } from "@packages/gamification/src/levelEngine";
import { getXpForAction, calculateBudgetAdherenceXp, calculateStreakBonusXp, createXpPayload } from "@packages/gamification/src/xpEngine";
import { updateStreak, createInitialStreak, type StreakState } from "@packages/gamification/src/streakEngine";
import type { OnboardingEvent, OnboardingState } from "@packages/onboarding/src/types";
import { ONBOARDING_EVENTS } from "@packages/onboarding/src/types";
import { onboardingReducer, createInitialOnboardingState } from "@packages/onboarding/src/reducer";
import type { SeasonState } from "@packages/season/src/types";
import { SEASON_EVENTS } from "@packages/season/src/types";
import type { SeasonEvent } from "@packages/season/src/types";
import { seasonReducer, createInitialSeasonState } from "@packages/season/src/reducer";
import { detectArchetype, calculateScores } from "@packages/personality/src/profileDetector";
import { getThemeForArchetype, getDefaultTheme, type ThemeColors } from "@packages/theme";
import type { ArchetypeType } from "@packages/personality/src/types";
import { ARCHETYPES } from "@packages/personality/src/types";
import { createEvent, generateId } from "@packages/events/src/factory";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { SQLiteEventStore } from "@packages/storage/src/eventStore";

type AnyEvent = DomainEvent | GamificationEvent | OnboardingEvent | SeasonEvent;

interface DerivedState {
  domain: AppState;
  gamification: GamificationState;
  onboarding: OnboardingState;
  season: SeasonState;
  archetype: ArchetypeType;
  theme: ThemeColors;
  levelInfo: LevelInfo;
  budget: BudgetBreakdown;
  totalBalance: number;
  loading: boolean;
}

interface AppStateContextValue extends DerivedState {
  dispatch: (event: AnyEvent) => void;
  dispatchDomainEvent: (event: DomainEvent) => void;
  importEvents: (events: SyncEvent[]) => Promise<number>;
  getAllEvents: () => SyncEvent[];
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function replayAllEvents(events: SyncEvent[]): {
  domain: AppState;
  gamification: GamificationState;
  onboarding: OnboardingState;
  season: SeasonState;
} {
  let domain = createInitialState();
  let gamification = createInitialGamificationState();
  let onboarding = createInitialOnboardingState();
  let season = createInitialSeasonState();

  for (const raw of events) {
    const evt = raw as unknown as AnyEvent;
    const t = evt.type as string;

    if (t in EVENT_TYPES || Object.values(EVENT_TYPES).includes(t as any)) {
      domain = domainReducer(domain, evt as DomainEvent);
    }
    if (t in GAMIFICATION_EVENTS || Object.values(GAMIFICATION_EVENTS).includes(t as any)) {
      gamification = gamificationReducer(gamification, evt as GamificationEvent);
    }
    if (t in ONBOARDING_EVENTS || Object.values(ONBOARDING_EVENTS).includes(t as any)) {
      onboarding = onboardingReducer(onboarding, evt as OnboardingEvent);
    }
    if (t in SEASON_EVENTS || Object.values(SEASON_EVENTS).includes(t as any)) {
      season = seasonReducer(season, evt as SeasonEvent);
    }
  }

  return { domain, gamification, onboarding, season };
}

let eventStoreInstance: SQLiteEventStore | null = null;

async function getEventStore(): Promise<SQLiteEventStore | null> {
  if (Platform.OS === "web") return null;
  if (eventStoreInstance) return eventStoreInstance;

  try {
    const { createSQLiteAdapter } = await import("@packages/storage/src/sqliteAdapter");
    const adapter = await createSQLiteAdapter("orcafacil.db");
    eventStoreInstance = new SQLiteEventStore(adapter);
    eventStoreInstance.initDatabase();
    return eventStoreInstance;
  } catch {
    return null;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [allEvents, setAllEvents] = useState<SyncEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const store = await getEventStore();
      if (store && mounted) {
        const events = store.getAllEvents();
        setAllEvents(events);
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const { domain, gamification, onboarding, season } = useMemo(
    () => replayAllEvents(allEvents),
    [allEvents],
  );

  const now = new Date();
  const budget = useMemo(
    () =>
      calculate503020(
        Object.values(domain.transactions),
        domain.categories,
        now.getMonth(),
        now.getFullYear(),
      ),
    [domain.transactions, domain.categories],
  );

  const levelInfo = useMemo(
    () => getLevelInfo(gamification.totalXp),
    [gamification.totalXp],
  );

  const archetype = useMemo<ArchetypeType>(() => {
    const txCount = Object.keys(domain.transactions).length;
    const scores = calculateScores({
      transactionCount: txCount,
      daysActive: gamification.currentStreak || 1,
      budgetAdherencePercent:
        budget.needsPercent > 0
          ? 100 - Math.abs(budget.needsPercent - 50) - Math.abs(budget.wantsPercent - 30) - Math.abs(budget.savingsPercent - 20)
          : 0,
      wishlistItemsTracked: 0,
      desiresSaved: 0,
      monthsPlanned: season.history.length,
    });
    return detectArchetype(scores);
  }, [domain.transactions, gamification.currentStreak, budget, season.history]);

  const theme = useMemo(
    () => getThemeForArchetype(archetype),
    [archetype],
  );

  const totalBalance = useMemo(
    () =>
      Object.values(domain.accounts).reduce(
        (sum, a) => sum + (a.type !== "credit_card" ? a.balance : 0),
        0,
      ),
    [domain.accounts],
  );

  const dispatch = useCallback(
    (event: AnyEvent) => {
      const syncEvt: SyncEvent = {
        id: event.id,
        type: event.type as string,
        payload: (event as any).payload,
        timestamp: event.timestamp,
        deviceId: event.deviceId,
        signature: event.signature,
      };

      getEventStore().then((store) => {
        store?.appendEvent(syncEvt);
      });

      setAllEvents((prev) => [...prev, syncEvt]);
    },
    [],
  );

  const importEvents = useCallback(
    async (events: SyncEvent[]): Promise<number> => {
      const store = await getEventStore();
      const existingIds = new Set(allEvents.map((e) => e.id));
      const newEvents: SyncEvent[] = [];

      for (const evt of events) {
        if (!existingIds.has(evt.id)) {
          store?.appendEvent(evt);
          newEvents.push(evt);
          existingIds.add(evt.id);
        }
      }

      if (newEvents.length > 0) {
        setAllEvents((prev) => {
          const merged = [...prev, ...newEvents];
          merged.sort((a, b) => a.timestamp - b.timestamp);
          return merged;
        });
      }

      return newEvents.length;
    },
    [allEvents],
  );

  const getAllEventsCallback = useCallback(() => allEvents, [allEvents]);

  const dispatchDomainEvent = useCallback(
    (event: DomainEvent) => {
      dispatch(event);

      if (event.type === EVENT_TYPES.TRANSACTION_CREATED) {
        const xpPayload = createXpPayload("transaction_logged");
        const xpEvent: GamificationEvent = {
          id: generateId(),
          type: GAMIFICATION_EVENTS.XP_GAINED,
          payload: xpPayload,
          timestamp: Date.now(),
          deviceId: "local",
          signature: "",
        } as GamificationEvent;
        dispatch(xpEvent);

        const today = todayStr();
        const currentStreak: StreakState = {
          currentStreak: gamification.currentStreak,
          longestStreak: gamification.longestStreak,
          lastActiveDate: gamification.lastActiveDate,
        };
        const streakResult = updateStreak(currentStreak, today);
        const streakEvent: GamificationEvent = {
          id: generateId(),
          type: GAMIFICATION_EVENTS.STREAK_UPDATED,
          payload: streakResult,
          timestamp: Date.now(),
          deviceId: "local",
          signature: "",
        } as GamificationEvent;
        dispatch(streakEvent);

        const newTotalXp = gamification.totalXp + xpPayload.amount;
        const levelCheck = shouldLevelUp(gamification.totalXp, newTotalXp);
        if (levelCheck.leveledUp) {
          const levelEvent: GamificationEvent = {
            id: generateId(),
            type: GAMIFICATION_EVENTS.LEVEL_UP,
            payload: {
              previousLevel: levelCheck.previousLevel,
              newLevel: levelCheck.newLevel,
              totalXp: newTotalXp,
            },
            timestamp: Date.now(),
            deviceId: "local",
            signature: "",
          } as GamificationEvent;
          dispatch(levelEvent);
        }
      }
    },
    [dispatch, gamification],
  );

  const value = useMemo<AppStateContextValue>(
    () => ({
      domain,
      gamification,
      onboarding,
      season,
      archetype,
      theme,
      levelInfo,
      budget,
      totalBalance,
      loading,
      dispatch,
      dispatchDomainEvent,
      importEvents,
      getAllEvents: getAllEventsCallback,
    }),
    [domain, gamification, onboarding, season, archetype, theme, levelInfo, budget, totalBalance, loading, dispatch, dispatchDomainEvent, importEvents, getAllEventsCallback],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}
