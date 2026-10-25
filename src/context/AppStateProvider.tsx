import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState as RNAppState } from "react-native";
import { EVENT_TYPES, type DomainEvent } from "@packages/events/src/types";
import type { AppState } from "@packages/domain/src/state";
import { calculate503020, type BudgetBreakdown } from "@packages/domain/src/transactions";
import type { GamificationEvent, GamificationState, AchievementUnlockedPayload, MonthlyTrophyCompletedPayload , SeasonalTrophyCompletedPayload } from "@packages/gamification/src/types";
import { getLevelInfo, type LevelInfo } from "@packages/gamification/src/levelEngine";
import type { OnboardingEvent, OnboardingState } from "@packages/onboarding/src/types";
import type { SeasonState , SeasonEvent } from "@packages/season/src/types";
import type { ThemeColors, ThemeMode } from "@packages/theme";
import type { ArchetypeType } from "@packages/personality/src/types";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import type { WishlistEvent, WishlistState } from "@packages/wishlist";
import {
  futureReleaseDelayMs,
  nextFutureReleaseAt,
  replayAllEvents,
  replayOptionsFor,
  type QuarantineEntry,
} from "@/src/context/replay";
import { appendGenerated, createXpRecoveryEvent, isXpRecoveryEvent } from "@/src/context/localEventLog";
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
  /** Eventos isolados no replay (Story 3.2) — derivado, só em memória. */
  quarantine: QuarantineEntry[];
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

// ── Provider Component ────────────────────────────────────────────────
export function AppStateProvider({ children }: { children: ReactNode }) {
  const { isDemoActive, demoEvents, dispatchDemoEvent } = useDemoMode();

  // Composed hooks
  const toast = useToastState();
  const debug = useDebugOverrides();
  const eventStore = useEventStore({ isDemoActive, dispatchDemoEvent });

  // Story 3.5: `nowTick` força um novo replay (com um novo `Date.now()`) quando um evento
  // em Quarentena por "horário no futuro" pode ter passado a valer: ao voltar para o
  // primeiro plano e no timer até o próximo evento desses. Não é estado derivado persistido.
  const [nowTick, setNowTick] = useState(0);

  // Replay all events to derive state
  const { domain, gamification: baseGamification, onboarding, season, wishlist, quarantine } = useMemo(
    // Story 3.5: "agora" = Date.now() a cada replay; o id do aparelho decide quais eventos são
    // de outro aparelho (no modo demo, nenhum: a regra do horário no futuro não se aplica).
    () => {
      void nowTick;
      return replayAllEvents(
        isDemoActive ? demoEvents : eventStore.allEvents,
        replayOptionsFor(isDemoActive, eventStore.deviceId),
      );
    },
    [isDemoActive, demoEvents, eventStore.allEvents, eventStore.deviceId, nowTick],
  );

  const hasFutureQuarantine = useMemo(
    () => quarantine.some((q) => q.kind === "future_timestamp"),
    [quarantine],
  );
  const hasFutureQuarantineRef = useRef(hasFutureQuarantine);
  useEffect(() => {
    hasFutureQuarantineRef.current = hasFutureQuarantine;
  }, [hasFutureQuarantine]);

  // Story 3.5: ao voltar para o primeiro plano, refaz o replay só se há evento em Quarentena
  // por horário (o relógio pode ter andado muito com o app em segundo plano).
  useEffect(() => {
    const sub = RNAppState.addEventListener("change", (next) => {
      if (next === "active" && hasFutureQuarantineRef.current) setNowTick((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  // Story 3.5: timer até o primeiro instante em que um evento em Quarentena por horário passa
  // a valer; refeito a cada mudança do log/aparelho/replay e limpo ao desmontar. Sem evento
  // desses, nenhum timer.
  useEffect(() => {
    if (!hasFutureQuarantine) return;
    const options = replayOptionsFor(isDemoActive, eventStore.deviceId);
    const now = Date.now();
    const releaseAt = nextFutureReleaseAt(isDemoActive ? demoEvents : eventStore.allEvents, { ...options, now });
    const delay = futureReleaseDelayMs(releaseAt, now);
    if (delay === null) return;
    const timer = setTimeout(() => setNowTick((n) => n + 1), delay);
    return () => clearTimeout(timer);
  }, [hasFutureQuarantine, isDemoActive, demoEvents, eventStore.allEvents, eventStore.deviceId, nowTick]);

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
      // Ids antigos com prefixo "xp-recovery-" e novos com a marca no payload.
      const hasRecovery = eventStore.allEvents.some(isXpRecoveryEvent);

      if (txCount > 0 && currentXp <= 5 && !hasRecovery) {
        const recoveryAmount = Math.max(30, txCount * 15);
        // Revisão 23/10: id e timestamp do mesmo instante (createEvent) e mesma regra do
        // dispatch (carimbo antes de gravar, sem ids repetidos, ordem total).
        const recoveryEvent = createXpRecoveryEvent(recoveryAmount, eventStore.deviceId);
        const did = eventStore.deviceId;
        const { events: next, added } = appendGenerated(eventStore.allEventsRef.current, [recoveryEvent], did);
        if (added.length === 0) return;
        eventStore.allEventsRef.current = next;

        getEventStore().then((store) => {
          added.forEach((evt) => store?.appendEvent(evt));
        });

        eventStore.setAllEvents((prev) => appendGenerated(prev, added, did).events);
        eventStore.setLocalEventCount((c) => c + added.length);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- eventStore é recriado a cada render; os campos realmente usados já estão nas deps e reexecutar dispararia o evento de recuperação de novo
  }, [isDemoActive, eventStore.loading, eventStore.allEvents.length, domain.transactions, gamification.totalXp, eventStore.deviceId, debug.debugXp]);

  // Story 3.2: categorias padrão só quando o log não tem nenhum CATEGORY_CREATED
  // (mesmo que esses eventos estejam na Quarentena e não apareçam no estado).
  const hasCategoryEvents = useMemo(
    () => eventStore.allEvents.some((e) => e?.type === EVENT_TYPES.CATEGORY_CREATED),
    [eventStore.allEvents],
  );

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
    hasCategoryEvents,
    dispatch: eventStore.dispatch,
    setLocalEventCount: eventStore.setLocalEventCount,
    setAllEvents: eventStore.setAllEvents,
    allEventsRef: eventStore.allEventsRef,
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
      quarantine,
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
    [domain, gamification, onboarding, season, wishlist, quarantine, themePrefs, levelInfo, budget, totalBalance, eventStore, dispatchAny, gamEffects.dispatchDomainEvent, resetApp, toast, debug],
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
