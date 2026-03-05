import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { Platform, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DomainEvent } from "@packages/events/src/types";
import { EVENT_TYPES } from "@packages/events/src/types";
import { domainReducer } from "@packages/domain/src/reducer";
import { createInitialState, type AppState } from "@packages/domain/src/state";
import { calculate503020, type BudgetBreakdown } from "@packages/domain/src/transactions";
import type { GamificationEvent, GamificationState, AchievementUnlockedPayload, MonthlyTrophyCompletedPayload } from "@packages/gamification/src/types";
import { GAMIFICATION_EVENTS } from "@packages/gamification/src/types";
import { checkNewAchievements, checkNewMonthlyTrophies, MONTHLY_TROPHIES } from "@packages/gamification/src/achievements";
import {
  ALL_SEASONAL_TROPHIES,
  pickSeasonalTrophy,
  getSeasonalTier,
  getSeasonalXp,
} from "@packages/gamification/src/seasonalTrophies";
import type { LiturgicalTrophy } from "@packages/gamification/src/liturgicalTrophies";
import { ALL_LITURGICAL_TROPHIES } from "@packages/gamification/src/liturgicalTrophies";
import type { SeasonalTrophySelectedPayload, SeasonalTrophyCompletedPayload } from "@packages/gamification/src/types";
import { gamificationReducer, createInitialGamificationState } from "@packages/gamification/src/reducer";
import { getLevelInfo, shouldLevelUp, type LevelInfo } from "@packages/gamification/src/levelEngine";
import { createXpPayload, getXpForAction, calculateBudgetAdherenceXp } from "@packages/gamification/src/xpEngine";
import { updateStreak, type StreakState } from "@packages/gamification/src/streakEngine";
import type { OnboardingEvent, OnboardingState } from "@packages/onboarding/src/types";
import { ONBOARDING_EVENTS } from "@packages/onboarding/src/types";
import { onboardingReducer, createInitialOnboardingState } from "@packages/onboarding/src/reducer";
import type { SeasonState } from "@packages/season/src/types";
import { SEASON_EVENTS } from "@packages/season/src/types";
import type { SeasonEvent } from "@packages/season/src/types";
import { seasonReducer, createInitialSeasonState } from "@packages/season/src/reducer";
import { detectArchetype, calculateScores } from "@packages/personality/src/profileDetector";
import { getThemeForArchetype, type ThemeColors, type ThemeMode } from "@packages/theme";
import type { ArchetypeType } from "@packages/personality/src/types";
import { soundManager } from "@/src/services/SoundManager";
import { generateId } from "@packages/events/src/factory";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { SQLiteEventStore } from "@packages/storage/src/eventStore";
import { createDefaultCategories } from "@packages/domain/src/categories";
import {
  WISHLIST_EVENTS,
  wishlistReducer,
  createInitialWishlistState,
  type WishlistEvent,
  type WishlistState,
} from "@packages/wishlist";
import { useDemoMode } from "@/src/context/DemoModeProvider";

type AnyEvent = DomainEvent | GamificationEvent | OnboardingEvent | SeasonEvent | WishlistEvent;

interface DerivedState {
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
}

interface AppStateContextValue extends DerivedState {
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
  // Debug overrides
  debugArchetype: ArchetypeType | null;
  setDebugArchetype: (type: ArchetypeType | null) => void;
  debugXp: number | null;
  setDebugXp: (xp: number | null) => void;
  debugBalance: number | null;
  setDebugBalance: (balance: number | null) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

const DEVICE_ID_KEY = "domus_device_id";
const EVENTS_BACKUP_KEY = "domus_events_v1";
const THEME_MODE_KEY = "domus_theme_mode_v1";
const SOUND_ENABLED_KEY = "domus_sound_enabled_v1";
const IS_CATHOLIC_KEY = "domus_is_catholic_v1";

function generateDeviceId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

let eventStoreInstance: SQLiteEventStore | null = null;

async function getEventStore(): Promise<SQLiteEventStore | null> {
  if (Platform.OS === "web") return null;
  if (eventStoreInstance) return eventStoreInstance;

  try {
    const { createSQLiteAdapter } = await import("@packages/storage/src/sqliteAdapter");
    const adapter = await createSQLiteAdapter("domus.db");
    eventStoreInstance = new SQLiteEventStore(adapter);
    eventStoreInstance.initDatabase();
    return eventStoreInstance;
  } catch {
    return null;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { isDemoActive, demoEvents, dispatchDemoEvent } = useDemoMode();
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [pendingToast, setPendingToast] = useState<AchievementUnlockedPayload | null>(null);
  const [pendingMonthlyToast, setPendingMonthlyToast] = useState<MonthlyTrophyCompletedPayload | null>(null);
  const [pendingSeasonalToast, setPendingSeasonalToast] = useState<SeasonalTrophyCompletedPayload | null>(null);

  const [isCatholic, setIsCatholicState] = useState<boolean | null>(null);
  const [debugArchetype, setDebugArchetype] = useState<ArchetypeType | null>(null);
  const [debugXp, setDebugXp] = useState<number | null>(null);
  const [debugBalance, setDebugBalance] = useState<number | null>(null);

  const [allEvents, setAllEvents] = useState<SyncEvent[]>([]);
  const allEventsRef = React.useRef(allEvents);
  
  const initialIsDark = systemColorScheme === "dark";
  const [isDarkState, setIsDarkState] = useState(initialIsDark);

  useEffect(() => {
    const isDark =
      themeMode === "dark" ||
      (themeMode === "system" && systemColorScheme === "dark");
    setIsDarkState(isDark);
  }, [themeMode, systemColorScheme]);

  useEffect(() => {
    allEventsRef.current = allEvents;
    if (Platform.OS === "web" && allEvents.length > 0) {
      AsyncStorage.setItem(EVENTS_BACKUP_KEY, JSON.stringify(allEvents));
    }
  }, [allEvents]);
  
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  // Contador de eventos criados LOCALMENTE (via dispatch).
  // NÃO incrementa quando eventos são importados via importEvents.
  // Usado pelo SyncProvider para saber quando fazer push sem causar loop.
  const [localEventCount, setLocalEventCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Carregar modo de tema salvo
      const savedTheme = await AsyncStorage.getItem(THEME_MODE_KEY);
      if (savedTheme && mounted) {
        setThemeModeState(savedTheme as ThemeMode);
      }

      // Carregar configuração de som
      const savedSound = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
      if (savedSound !== null && mounted) {
        const enabled = savedSound === "true";
        setSoundEnabledState(enabled);
        soundManager.setEnabled(enabled);
      }

      // Inicializar gerenciador de som (tentar carregar ativos se existirem)
      // Nota: No web ou se os arquivos não existirem, o init falha silenciosamente
      soundManager.init().catch(() => {});

      // Carregar preferência religiosa
      const savedCatholic = await AsyncStorage.getItem(IS_CATHOLIC_KEY);
      if (savedCatholic !== null && mounted) {
        setIsCatholicState(savedCatholic === "true");
      }

      // Carregar ou criar deviceId único para este dispositivo
      let did = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!did) {
        did = generateDeviceId();
        await AsyncStorage.setItem(DEVICE_ID_KEY, did);
      }
      if (mounted) setDeviceId(did);

      let events: SyncEvent[] = [];

      if (Platform.OS === "web") {
        const backup = await AsyncStorage.getItem(EVENTS_BACKUP_KEY);
        if (backup) {
          try {
            events = JSON.parse(backup);
          } catch {}
        }
      } else {
        const store = await getEventStore();
        if (store) {
          events = store.getAllEvents();
        }
      }

      if (mounted) {
        // Migrar eventos "local" para o novo deviceId para que possam ser sincronizados corretamente.
        let migratedCount = 0;
        const migratedEvents = events.map((e) => {
          if (e.deviceId === "local" || !e.deviceId) {
            migratedCount++;
            return { ...e, deviceId: did || "local" };
          }
          return e;
        });
        
        setAllEvents(migratedEvents);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const { domain, gamification: baseGamification, onboarding, season, wishlist } = useMemo(
    () => replayAllEvents(isDemoActive ? demoEvents : allEvents),
    [isDemoActive, demoEvents, allEvents],
  );

  const gamification = useMemo(() => {
    if (debugXp === null) return baseGamification;
    return { ...baseGamification, totalXp: debugXp };
  }, [baseGamification, debugXp]);

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

  // Mecanismo de recuperação de XP: Se o usuário tem transações mas o XP está zerado ou muito baixo
  // (devido ao bug de penalidade do início do mês), gera um evento de compensação único.
  useEffect(() => {
    if (isDemoActive || debugXp !== null) return;
    if (!loading && allEvents.length > 0 && deviceId) {
      const txCount = Object.keys(domain.transactions).length;
      const currentXp = gamification.totalXp;
      const hasRecovery = allEvents.some(e => e.id.startsWith("xp-recovery-"));

      // Se tem transações mas o XP é 0 (ou quase 0), é o bug do início do mês.
      // Precisamos dar um "empurrão" inicial para destravar o nível.
      if (txCount > 0 && currentXp <= 5 && !hasRecovery) {
        const recoveryAmount = Math.max(30, txCount * 15); // Rebalanceado: ~15-20 XP por transação anterior
        const recoveryEvent = {
          id: `xp-recovery-${generateId()}`,
          type: GAMIFICATION_EVENTS.XP_GAINED,
          payload: { 
            amount: recoveryAmount, 
            source: "streak_bonus", 
            description: "Correção de XP Domus" 
          },
          timestamp: Date.now(),
          deviceId: deviceId,
          signature: "",
        };

        const syncEvt: SyncEvent = {
          id: recoveryEvent.id,
          type: recoveryEvent.type as string,
          payload: recoveryEvent.payload,
          timestamp: recoveryEvent.timestamp,
          deviceId: deviceId,
          signature: "",
        };

        getEventStore().then((store) => {
          store?.appendEvent(syncEvt);
        });

        setAllEvents((prev) => {
          const next = [...prev, syncEvt];
          next.sort((a, b) => a.timestamp - b.timestamp);
          return next;
        });
        setLocalEventCount((c) => c + 1);
      }
    }
  }, [isDemoActive, loading, allEvents.length, domain.transactions, gamification.totalXp, deviceId, debugXp]);

  // Inicializar categorias padrão se não existirem
  useEffect(() => {
    if (isDemoActive) return;
    if (!loading && deviceId && Object.keys(domain.categories).length === 0) {
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
        next.sort((a, b) => a.timestamp - b.timestamp);
        return next;
      });
      setLocalEventCount((c) => c + syncEvents.length);
    }
  }, [isDemoActive, loading, domain.categories, deviceId]);

  // ── Monthly Trophy checker ────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !deviceId) return;
    const alreadyCompleted = gamification.completedMonthlyTrophies ?? [];
    const newTrophies = checkNewMonthlyTrophies(domain, budget, alreadyCompleted);
    if (newTrophies.length === 0) return;

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    for (const trophy of newTrophies) {
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
      dispatch(evt);
      setPendingMonthlyToast({
        trophyId: trophy.id,
        monthKey,
        name: trophy.name,
        description: trophy.description,
        xpReward: trophy.xpReward,
      });
    }
  }, [loading, budget, domain, gamification.completedMonthlyTrophies, deviceId]);

  // ── Seasonal Trophy: pick one per month ───────────────────────────────────
  useEffect(() => {
    if (loading || !deviceId || isCatholic === null) return;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const alreadySelected = (gamification.selectedSeasonalTrophies ?? []).some(
      s => s.monthKey === monthKey,
    );
    if (alreadySelected) return;

    // Build pool: secular (all users) + liturgical (Catholics only)
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
    dispatch(evt);
  }, [loading, deviceId, isCatholic, gamification.selectedSeasonalTrophies, gamification.completedSeasonalTrophies]);

  // ── Seasonal Trophy: check completion ─────────────────────────────────────
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
    if (alreadyCompleted) return;

    const trophy =
      ALL_SEASONAL_TROPHIES.find(t => t.id === selectedEntry.trophyId) ??
      (ALL_LITURGICAL_TROPHIES as typeof ALL_SEASONAL_TROPHIES).find(t => t.id === selectedEntry.trophyId);
    if (!trophy) return;

    if (!trophy.check(domain, budget, monthKey)) return;

    const xpReward = getSeasonalXp(trophy.baseXp, selectedEntry.tier);
    const payload: SeasonalTrophyCompletedPayload = {
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
    dispatch(evt);
    setPendingSeasonalToast(payload);
  }, [loading, budget, domain, gamification.selectedSeasonalTrophies, gamification.completedSeasonalTrophies, deviceId]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  }, []);

  const setSoundEnabled = useCallback(async (enabled: boolean) => {
    setSoundEnabledState(enabled);
    soundManager.setEnabled(enabled);
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, enabled ? "true" : "false");
  }, []);

  const setIsCatholic = useCallback(async (value: boolean) => {
    setIsCatholicState(value);
    await AsyncStorage.setItem(IS_CATHOLIC_KEY, value ? "true" : "false");
  }, []);

  const archetype = useMemo<ArchetypeType>(() => {
    if (debugArchetype) return debugArchetype;

    const txCount = Object.keys(domain.transactions).length;
    const scores = calculateScores({
      transactionCount: txCount,
      daysActive: gamification.currentStreak || 1,
      budgetAdherencePercent: budget.adherenceScore,
      wishlistItemsTracked: Object.keys(wishlist?.items ?? {}).length,
      desiresSaved: Object.keys(wishlist?.items ?? {}).length,
      monthsPlanned: season.history.length,
    });
    return detectArchetype(scores);
  }, [domain.transactions, gamification.currentStreak, budget, season.history, debugArchetype]);

  const theme = useMemo(() => {
    return getThemeForArchetype(archetype, isDarkState);
  }, [archetype, isDarkState]);

  const totalBalance = useMemo(() => {
    if (debugBalance !== null) return debugBalance;
    return Object.values(domain.accounts).reduce(
      (sum: number, a: any) => sum + (a.type !== "credit_card" ? a.balance : 0),
      0,
    );
  }, [domain.accounts, debugBalance]);

  /**
   * dispatch: cria um evento LOCAL.
   * Incrementa localEventCount para sinalizar ao SyncProvider que há novos dados para publicar.
   */
  const dispatch = useCallback(
    (event: AnyEvent) => {
      // Durante o tour, roteamos para o sandbox em memória — sem tocar no SQLite.
      if (isDemoActive) {
        dispatchDemoEvent({
          id: event.id,
          type: event.type as string,
          payload: (event as any).payload,
          timestamp: event.timestamp,
        });
        return;
      }

      const syncEvt: SyncEvent = {
        id: event.id,
        type: event.type as string,
        payload: (event as any).payload,
        timestamp: event.timestamp,
        deviceId: (event.deviceId && event.deviceId !== "local") ? event.deviceId : (deviceId || "local"),
        signature: event.signature,
      };

      getEventStore().then((store) => {
        store?.appendEvent(syncEvt);
      });

      setAllEvents((prev) => {
        const next = [...prev, syncEvt];
        next.sort((a, b) => a.timestamp - b.timestamp);
        return next;
      });
      // Incrementar contador de eventos locais para disparar push no SyncProvider
      setLocalEventCount((c) => c + 1);
    },
    [isDemoActive, dispatchDemoEvent, deviceId],
  );

  /**
   * importEvents: importa eventos recebidos de OUTROS dispositivos via sincronização.
   * NÃO incrementa localEventCount, evitando que o SyncProvider faça push em loop.
   * Filtra eventos duplicados por ID antes de adicionar ao estado.
   */
  const importEvents = useCallback(
    async (events: SyncEvent[]): Promise<number> => {
      // Ignorar sincronização enquanto o tour sandbox estiver ativo.
      if (isDemoActive) return 0;

      const store = await getEventStore();

      // Usar a versão mais recente de allEvents via ref para deduplicação precisa
      const existingIds = new Set(allEventsRef.current.map((e: SyncEvent) => e.id));
      const newEvents: SyncEvent[] = [];

      for (const evt of events) {
        if (!existingIds.has(evt.id)) {
          store?.appendEvent(evt);
          newEvents.push(evt);
          existingIds.add(evt.id);
        }
      }

      if (newEvents.length > 0) {
        setAllEvents((prev: SyncEvent[]) => {
          const merged = [...prev, ...newEvents];
          merged.sort((a, b) => a.timestamp - b.timestamp);
          return merged;
        });
      }

      return newEvents.length;
    },
    [isDemoActive],
  );

  const getAllEventsCallback = useCallback(() => allEvents, [allEvents]);

  /**
   * restoreFromBackup: substitui todo o event store pelos eventos do backup.
   * Limpa SQLite/AsyncStorage e re-insere os eventos restaurados.
   * NÃO incrementa localEventCount para evitar push acidental pós-restore.
   */
  const restoreFromBackup = useCallback(async (events: SyncEvent[]): Promise<void> => {
    if (isDemoActive) return; // Não restaurar enquanto o tour estiver ativo.
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(EVENTS_BACKUP_KEY, JSON.stringify(sorted));
    } else {
      const store = await getEventStore();
      if (store) {
        store.clearAllEvents();
        for (const evt of sorted) {
          store.appendEvent(evt);
        }
      }
    }
    setAllEvents(sorted);
  }, [isDemoActive]);

  const resetApp = useCallback(async (): Promise<void> => {
    await restoreFromBackup([]);
    setThemeModeState("system");
    await AsyncStorage.removeItem(THEME_MODE_KEY);
    setSoundEnabledState(true);
    await AsyncStorage.removeItem(SOUND_ENABLED_KEY);
    if (Platform.OS !== "web") {
      try {
        const { SecureStorageService } = await import(
          "@/src/modules/security/infrastructure/SecureStorageService"
        );
        await SecureStorageService.delete("domus_security_settings_v1");
      } catch (_) {}
    }
  }, [restoreFromBackup]);

    /**
     * dispatchDomainEvent: cria um evento de domínio LOCAL e gera eventos de gamificação associados.
     * Os eventos de gamificação (XP, Streak, Level Up) são gerados APENAS para ações locais,
     * nunca para eventos importados de outros dispositivos.
     * Isto é fundamental para evitar o loop de sincronização.
     */
    const dispatchDomainEvent = useCallback(
      (event: DomainEvent) => {
        // Usar o deviceId do evento original para os eventos de gamificação
        const originDeviceId = (event.deviceId && event.deviceId !== "local") ? event.deviceId : (deviceId || "local");
  
        dispatch(event);
  
        // Não processar gamificação para eventos que não são locais
        if (event.deviceId !== "local" && event.deviceId !== deviceId && event.deviceId !== undefined && event.deviceId !== null) return;
  
        if (
          event.type === EVENT_TYPES.TRANSACTION_CREATED ||
          event.type === EVENT_TYPES.TRANSACTION_UPDATED ||
          event.type === EVENT_TYPES.TRANSACTION_DELETED
        ) {
          // Prever o próximo estado das transações para calcular o XP correto baseado no novo orçamento
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
  
          const now = new Date();
                  const nextBudget = calculate503020(
                    Object.values(nextTransactions),
                    domain.categories,
                    now.getMonth(),
                    now.getFullYear(),
                  );
          
                  // Criar transação concede XP (base + bônus de aderência orçamentária).
                  // Deletar desconta o mesmo valor calculado com o orçamento pós-deleção
                  // (que é o estado "antes da criação"), zerando o ganho do ciclo criar→deletar.
                  // Editar (UPDATED) não altera XP — evita farming por re-salvamento.
                  const sign = event.type === EVENT_TYPES.TRANSACTION_DELETED ? -1 : 1;
                  const isCreatedOrDeleted =
                    event.type === EVENT_TYPES.TRANSACTION_CREATED ||
                    event.type === EVENT_TYPES.TRANSACTION_DELETED;
                  const baseLoggingXp = isCreatedOrDeleted ? sign * getXpForAction("transaction_logged") : 0;
                  const budgetBonus = isCreatedOrDeleted ? sign * calculateBudgetAdherenceXp(nextBudget) : 0;
                  const totalXpGain = baseLoggingXp + budgetBonus;
          if (totalXpGain !== 0) {
            const xpPayload = createXpPayload("transaction_logged", totalXpGain);
            const xpEvent: GamificationEvent = {
              id: generateId(),
              type: GAMIFICATION_EVENTS.XP_GAINED,
              payload: xpPayload,
              timestamp: Date.now(),
              deviceId: originDeviceId,
              signature: "",
            } as GamificationEvent;
            dispatch(xpEvent);
          }
  
          // Lógica de Streak apenas para novas transações
          if (event.type === EVENT_TYPES.TRANSACTION_CREATED) {
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
              deviceId: originDeviceId,
              signature: "",
            } as GamificationEvent;
            dispatch(streakEvent);
          }
  
          // Lógica de Level Up baseada no ganho total (aproximada para feedback imediato)
          const currentTotalXp = gamification.totalXp;
          const estimatedNewTotalXp = Math.max(0, currentTotalXp + totalXpGain);
          const levelCheck = shouldLevelUp(currentTotalXp, estimatedNewTotalXp);
          
          if (levelCheck.leveledUp) {
            const levelEvent: GamificationEvent = {
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
            } as GamificationEvent;
            dispatch(levelEvent);
          }

          // ── Conquistas ───────────────────────────────────────────────────
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
            const achEvent: GamificationEvent = {
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
            } as GamificationEvent;
            dispatch(achEvent);
            setPendingToast({
              achievementId: ach.id,
              name: ach.name,
              description: ach.description,
              rarity: ach.rarity,
              xpReward: ach.xpReward,
            });
          }

          // ── Desafios Mensais ────────────────────────────────────────────
          const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const completedMonthly = gamification.completedMonthlyTrophies ?? [];
          const newMonthlyTrophies = checkNewMonthlyTrophies(
            nextDomainForAchievements,
            nextBudget,
            completedMonthly,
          );
          for (const trophy of newMonthlyTrophies) {
            const trophyEvent: GamificationEvent = {
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
            } as GamificationEvent;
            dispatch(trophyEvent);
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
      [dispatch, gamification, deviceId, domain.transactions, domain.categories, setPendingToast],
    );

  const value = useMemo<AppStateContextValue>(
    () => ({
      domain,
      gamification,
      onboarding,
      season,
      wishlist,
      archetype,
      themeMode,
      soundEnabled,
      theme,
      levelInfo,
      budget,
      totalBalance,
      loading,
      dispatch,
      dispatchDomainEvent,
      setThemeMode,
      setSoundEnabled,
      importEvents,
      restoreFromBackup,
      resetApp,
      getAllEvents: getAllEventsCallback,
      localEventCount,
      deviceId,
      pendingToast,
      setPendingToast,
      clearPendingToast: () => setPendingToast(null),
      pendingMonthlyToast,
      clearPendingMonthlyToast: () => setPendingMonthlyToast(null),
      pendingSeasonalToast,
      clearPendingSeasonalToast: () => setPendingSeasonalToast(null),
      isCatholic,
      setIsCatholic,
      debugArchetype,
      setDebugArchetype,
      debugXp,
      setDebugXp,
      debugBalance,
      setDebugBalance,
    }),
    [domain, gamification, onboarding, season, wishlist, archetype, themeMode, soundEnabled, theme, levelInfo, budget, totalBalance, loading, dispatch, dispatchDomainEvent, setThemeMode, setSoundEnabled, importEvents, restoreFromBackup, resetApp, getAllEventsCallback, localEventCount, deviceId, pendingToast, pendingMonthlyToast, pendingSeasonalToast, isCatholic, setIsCatholic, debugArchetype, setDebugArchetype, debugXp, setDebugXp, debugBalance, setDebugBalance],
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
