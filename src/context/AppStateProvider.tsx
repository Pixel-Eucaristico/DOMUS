import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { DomainEvent } from "@packages/events/src/types";
import { EVENT_TYPES } from "@packages/events/src/types";
import { domainReducer } from "@packages/domain/src/reducer";
import { createInitialState, type AppState } from "@packages/domain/src/state";
import { calculate503020, type BudgetBreakdown } from "@packages/domain/src/transactions";
import type { GamificationEvent, GamificationState, AchievementUnlockedPayload, MonthlyTrophyCompletedPayload , SeasonalTrophyCompletedPayload } from "@packages/gamification/src/types";
import { GAMIFICATION_EVENTS } from "@packages/gamification/src/types";
import { gamificationReducer, createInitialGamificationState } from "@packages/gamification/src/reducer";
import { getLevelInfo, type LevelInfo } from "@packages/gamification/src/levelEngine";
import type { OnboardingEvent, OnboardingState } from "@packages/onboarding/src/types";
import { ONBOARDING_EVENTS } from "@packages/onboarding/src/types";
import { onboardingReducer, createInitialOnboardingState } from "@packages/onboarding/src/reducer";
import type { SeasonState , SeasonEvent } from "@packages/season/src/types";
import { SEASON_EVENTS } from "@packages/season/src/types";
import { seasonReducer, createInitialSeasonState } from "@packages/season/src/reducer";
import type { ThemeColors, ThemeMode } from "@packages/theme";
import type { ArchetypeType } from "@packages/personality/src/types";
import { generateId } from "@packages/events/src/factory";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import {
  WISHLIST_EVENTS,
  wishlistReducer,
  createInitialWishlistState,
  type WishlistEvent,
  type WishlistState,
} from "@packages/wishlist";
import { useDemoMode } from "@/src/context/DemoModeProvider";

// Extracted hooks
import { useToastState } from "@/src/hooks/useToastState";
import { useDebugOverrides } from "@/src/hooks/useDebugOverrides";
import { useThemePreferences } from "@/src/hooks/useThemePreferences";
import { useEventStore, getEventStore } from "@/src/hooks/useEventStore";
import { useGamificationEffects } from "@/src/hooks/useGamificationEffects";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AnyEvent = DomainEvent | GamificationEvent | OnboardingEvent | SeasonEvent | WishlistEvent;

interface AppStateContextValue {
  domain: AppState;
  gamification: GamificationState;
  onboarding: OnboardingState;
  season: SeasonState;
  wishlist: WishlistState;
  archetype: ArchetypeType;
  themeMode: ThemeMode;
  soundEnabled: boolean;
  theme: ThemeColors;
  levelInfo: LevelInfo;
  budget: BudgetBreakdown;
  totalBalance: number;
  loading: boolean;
  dispatch: (event: AnyEvent) => void;
  dispatchDomainEvent: (event: DomainEvent) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setSoundEnabled: (enabled: boolean) => void;
  importEvents: (events: SyncEvent[]) => Promise<number>;
  restoreFromBackup: (events: SyncEvent[]) => Promise<void>;
  resetApp: () => Promise<void>;
  getAllEvents: () => SyncEvent[];
  localEventCount: number;
  deviceId: string | null;
  pendingToast: AchievementUnlockedPayload | null;
  setPendingToast: (toast: AchievementUnlockedPayload | null) => void;
  clearPendingToast: () => void;
  pendingMonthlyToast: MonthlyTrophyCompletedPayload | null;
  clearPendingMonthlyToast: () => void;
  pendingSeasonalToast: SeasonalTrophyCompletedPayload | null;
  clearPendingSeasonalToast: () => void;
  isCatholic: boolean | null;
  setIsCatholic: (value: boolean) => void;
  debugArchetype: ArchetypeType | null;
  setDebugArchetype: (type: ArchetypeType | null) => void;
  debugXp: number | null;
  setDebugXp: (xp: number | null) => void;
  debugBalance: number | null;
  setDebugBalance: (balance: number | null) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

const THEME_MODE_KEY = "domus_theme_mode_v1";
const SOUND_ENABLED_KEY = "domus_sound_enabled_v1";

// ── Pure replay function ──────────────────────────────────────────────
function replayAllEvents(events: SyncEvent[]): {
  domain: AppState;
  gamification: GamificationState;
  onboarding: OnboardingState;
  season: SeasonState;
  wishlist: WishlistState;
} {
  let domain = createInitialState();
  let gamification = createInitialGamificationState();
  let onboarding = createInitialOnboardingState();
  let season = createInitialSeasonState();
  let wishlist = createInitialWishlistState();

  for (const raw of events) {
    const evt = raw as unknown as AnyEvent;
    const t = evt.type as string;

    if (Object.values(EVENT_TYPES).includes(t as any)) {
      domain = domainReducer(domain, evt as DomainEvent);
    }
    if (Object.values(GAMIFICATION_EVENTS).includes(t as any)) {
      gamification = gamificationReducer(gamification, evt as GamificationEvent);
    }
    if (Object.values(ONBOARDING_EVENTS).includes(t as any)) {
      onboarding = onboardingReducer(onboarding, evt as OnboardingEvent);
    }
    if (Object.values(SEASON_EVENTS).includes(t as any)) {
      season = seasonReducer(season, evt as SeasonEvent);
    }
    if (Object.values(WISHLIST_EVENTS).includes(t as any)) {
      wishlist = wishlistReducer(wishlist, evt as WishlistEvent);
    }
  }

  return { domain, gamification, onboarding, season, wishlist };
}

// ── Provider Component ────────────────────────────────────────────────
export function AppStateProvider({ children }: { children: ReactNode }) {
  const { isDemoActive, demoEvents, dispatchDemoEvent } = useDemoMode();

  // Composed hooks
  const toast = useToastState();
  const debug = useDebugOverrides();
  const eventStore = useEventStore({ isDemoActive, dispatchDemoEvent });

  // Replay all events to derive state
  const { domain, gamification: baseGamification, onboarding, season, wishlist } = useMemo(
    () => replayAllEvents(isDemoActive ? demoEvents : eventStore.allEvents),
    [isDemoActive, demoEvents, eventStore.allEvents],
  );

  const gamification = useMemo(() => {
    if (debug.debugXp === null) return baseGamification;
    return { ...baseGamification, totalXp: debug.debugXp };
  }, [baseGamification, debug.debugXp]);

  const budget = useMemo(
    () => {
      const now = new Date();
      return calculate503020(
        Object.values(domain.transactions),
        domain.categories,
        now.getMonth(),
        now.getFullYear(),
      );
    },
    [domain.transactions, domain.categories],
  );

  const levelInfo = useMemo(
    () => getLevelInfo(gamification.totalXp),
    [gamification.totalXp],
  );

  const totalBalance = useMemo(() => {
    if (debug.debugBalance !== null) return debug.debugBalance;
    return Object.values(domain.accounts).reduce(
      (sum: number, a: any) => sum + (a.type !== "credit_card" ? a.balance : 0),
      0,
    );
  }, [domain.accounts, debug.debugBalance]);

  // Theme + preferences (depends on derived state)
  const themePrefs = useThemePreferences({
    debugArchetype: debug.debugArchetype,
    transactionCount: Object.keys(domain.transactions).length,
    currentStreak: gamification.currentStreak || 1,
    budgetAdherenceScore: budget.adherenceScore,
    wishlistItemCount: Object.keys(wishlist?.items ?? {}).length,
    monthsPlanned: season.history.length,
  });

  // XP recovery effect
  useEffect(() => {
    if (isDemoActive || debug.debugXp !== null) return;
    if (!eventStore.loading && eventStore.allEvents.length > 0 && eventStore.deviceId) {
      const txCount = Object.keys(domain.transactions).length;
      const currentXp = gamification.totalXp;
      const hasRecovery = eventStore.allEvents.some(e => e.id?.startsWith("xp-recovery-"));

      if (txCount > 0 && currentXp <= 5 && !hasRecovery) {
        const recoveryAmount = Math.max(30, txCount * 15);
        const recoveryEvent: SyncEvent = {
          id: `xp-recovery-${generateId()}`,
          type: GAMIFICATION_EVENTS.XP_GAINED as string,
          payload: {
            amount: recoveryAmount,
            source: "streak_bonus",
            description: "Correção de XP Domus",
          },
          timestamp: Date.now(),
          deviceId: eventStore.deviceId,
          signature: "",
        };

        getEventStore().then((store) => {
          store?.appendEvent(recoveryEvent);
        });

        eventStore.setAllEvents((prev) => {
          const next = [...prev, recoveryEvent];
          next.sort((a, b) => a.timestamp - b.timestamp);
          return next;
        });
        eventStore.setLocalEventCount((c) => c + 1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- eventStore é recriado a cada render; os campos realmente usados já estão nas deps e reexecutar dispararia o evento de recuperação de novo
  }, [isDemoActive, eventStore.loading, eventStore.allEvents.length, domain.transactions, gamification.totalXp, eventStore.deviceId, debug.debugXp]);

  // Gamification side-effects (trophy checks, dispatchDomainEvent)
  const gamEffects = useGamificationEffects({
    domain,
    gamification,
    budget,
    deviceId: eventStore.deviceId,
    loading: eventStore.loading,
    isDemoActive,
    debugXp: debug.debugXp,
    isCatholic: themePrefs.isCatholic,
    allEventsLength: eventStore.allEvents.length,
    dispatch: eventStore.dispatch,
    setLocalEventCount: eventStore.setLocalEventCount,
    setAllEvents: eventStore.setAllEvents,
    setPendingToast: toast.setPendingToast,
    setPendingMonthlyToast: toast.setPendingMonthlyToast,
    setPendingSeasonalToast: toast.setPendingSeasonalToast,
  });

  // Wrap dispatch to accept AnyEvent (converts to SyncEvent)
  const dispatchAny = useCallback(
    (event: AnyEvent) => {
      const syncEvt: SyncEvent = {
        id: event.id,
        type: event.type as string,
        payload: (event as any).payload,
        timestamp: event.timestamp,
        deviceId: (event.deviceId && event.deviceId !== "local") ? event.deviceId : (eventStore.deviceId || "local"),
        signature: event.signature,
      };
      eventStore.dispatch(syncEvt);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- eventStore é recriado a cada render; dispatch e deviceId (os membros usados) já são deps
    [eventStore.dispatch, eventStore.deviceId],
  );

  // Reset app: clear events + reset theme/sound prefs
  const resetApp = useCallback(async (): Promise<void> => {
    await eventStore.resetApp();
    themePrefs.setThemeMode("system");
    await AsyncStorage.removeItem(THEME_MODE_KEY);
    themePrefs.setSoundEnabled(true);
    await AsyncStorage.removeItem(SOUND_ENABLED_KEY);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- eventStore/themePrefs são recriados a cada render; os métodos usados já são deps
  }, [eventStore.resetApp, themePrefs.setThemeMode, themePrefs.setSoundEnabled]);

  // Assemble context value
  const value = useMemo<AppStateContextValue>(
    () => ({
      domain,
      gamification,
      onboarding,
      season,
      wishlist,
      archetype: themePrefs.archetype,
      themeMode: themePrefs.themeMode,
      soundEnabled: themePrefs.soundEnabled,
      theme: themePrefs.theme,
      levelInfo,
      budget,
      totalBalance,
      loading: eventStore.loading,
      dispatch: dispatchAny,
      dispatchDomainEvent: gamEffects.dispatchDomainEvent,
      setThemeMode: themePrefs.setThemeMode,
      setSoundEnabled: themePrefs.setSoundEnabled,
      importEvents: eventStore.importEvents,
      restoreFromBackup: eventStore.restoreFromBackup,
      resetApp,
      getAllEvents: eventStore.getAllEvents,
      localEventCount: eventStore.localEventCount,
      deviceId: eventStore.deviceId,
      pendingToast: toast.pendingToast,
      setPendingToast: toast.setPendingToast,
      clearPendingToast: toast.clearPendingToast,
      pendingMonthlyToast: toast.pendingMonthlyToast,
      clearPendingMonthlyToast: toast.clearPendingMonthlyToast,
      pendingSeasonalToast: toast.pendingSeasonalToast,
      clearPendingSeasonalToast: toast.clearPendingSeasonalToast,
      isCatholic: themePrefs.isCatholic,
      setIsCatholic: themePrefs.setIsCatholic,
      debugArchetype: debug.debugArchetype,
      setDebugArchetype: debug.setDebugArchetype,
      debugXp: debug.debugXp,
      setDebugXp: debug.setDebugXp,
      debugBalance: debug.debugBalance,
      setDebugBalance: debug.setDebugBalance,
    }),
    [domain, gamification, onboarding, season, wishlist, themePrefs, levelInfo, budget, totalBalance, eventStore, dispatchAny, gamEffects.dispatchDomainEvent, resetApp, toast, debug],
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
