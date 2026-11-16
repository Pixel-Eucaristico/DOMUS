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
  createSettingChangedEvent,
  type SettingsEvent,
  type SettingsState,
} from "@packages/settings";
import {
  applySyncedSupportModes,
  loadSupportModes,
  resetLocalSupportModes,
  type SupportMode,
} from "@/src/modules/monetization/MonetizationSettingsStore";
import {
  buildSettingsSeedEvents,
  normalizeSupportModes,
  resolveSoundEnabledFromSettings,
  resolveSupportModesFromSettings,
  resolveThemeModeFromSettings,
} from "@/src/modules/settings/syncedPreferences";
import { AI_SETTINGS_STORE_KEY, type AISettings } from "@/src/modules/ai/domain/AISettings";
import {
  AI_CUSTOM_PRICES_SETTING_KEY,
  AI_SETTINGS_SETTING_KEY,
  buildAISettingsSeedEvents,
  pickSyncedAISettings,
  resolveCustomPricesFromSettings,
} from "@/src/modules/ai/domain/syncedAISettings";
import { TokenPricingService } from "@/src/modules/ai/infrastructure/TokenPricingService";
import { SecureStorageService } from "@/src/modules/security/infrastructure/SecureStorageService";
import { OCRConfigService } from "@/src/services/ocrConfigService";
import {
  OCR_CONFIG_SETTING_KEY,
  buildOCRConfigSeedEvents,
  pickSyncedOCRConfig,
  resolveOCRConfigFromSettings,
} from "@/src/services/syncedOCRConfig";
import {
  DRIVE_BACKUP_PREF_SETTING_KEY,
  buildDriveBackupPrefSeedEvents,
  pickSyncedDriveBackupPref,
  resolveDriveBackupPrefFromSettings,
  type DriveBackupPreference,
} from "@/src/modules/backup/domain/syncedDriveBackupPref";
import { GoogleDriveService } from "@/src/modules/backup/infrastructure/GoogleDriveService";
import {
  futureReleaseDelayMs,
  nextFutureReleaseAt,
  replayAllEvents,
  replayOptionsFor,
  type QuarantineEntry,
} from "@/src/context/replay";
import { appendGenerated } from "@/src/context/localEventLog";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import {
  createBootEffectsGate,
  evaluateXpRecoveryEffect,
  type BootEffectsGate,
} from "@/src/modules/bootEffectsGate";

// Extracted hooks
import { useToastState } from "@/src/hooks/useToastState";
import { useDebugOverrides } from "@/src/hooks/useDebugOverrides";
import { useThemePreferences } from "@/src/hooks/useThemePreferences";
import { useEventStore, getEventStore } from "@/src/hooks/useEventStore";
import { useGamificationEffects } from "@/src/hooks/useGamificationEffects";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AnyEvent = DomainEvent | GamificationEvent | OnboardingEvent | SeasonEvent | WishlistEvent | SettingsEvent;

interface AppStateContextValue {
  domain: AppState;
  gamification: GamificationState;
  onboarding: OnboardingState;
  season: SeasonState;
  wishlist: WishlistState;
  settings: SettingsState;
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
  initialSyncReady: boolean;
  bootEffectsGate: BootEffectsGate;
  isDemoActive: boolean;
  dispatch: (event: AnyEvent) => void;
  dispatchDomainEvent: (event: DomainEvent) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSupportModes: (modes: SupportMode[]) => void;
  setAISettings: (aiSettings: Partial<AISettings>) => void;
  driveBackupPref: DriveBackupPreference | undefined;
  setDriveBackupPref: (pref: DriveBackupPreference) => void;
  importEvents: (events: SyncEvent[], options?: { isStrongGroup?: boolean }) => Promise<number>;
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

  // Story 7.2: Barreira do primeiro pull para efeitos automáticos de boot
  const [initialSyncReady, setInitialSyncReady] = useState(false);
  const [bootEffectsGate] = useState(() =>
    createBootEffectsGate({
      onReady: () => setInitialSyncReady(true),
    }),
  );

  useEffect(() => {
    if (bootEffectsGate.isReady()) {
      setInitialSyncReady(true);
    }
    const unsubscribe = bootEffectsGate.subscribe(() => {
      setInitialSyncReady(true);
    });
    return () => {
      unsubscribe();
    };
  }, [bootEffectsGate]);

  // Story 3.5: `nowTick` força um novo replay (com um novo `Date.now()`) quando um evento
  // em Quarentena por "horário no futuro" pode ter passado a valer: ao voltar para o
  // primeiro plano e no timer até o próximo evento desses. Não é estado derivado persistido.
  const [nowTick, setNowTick] = useState(0);

  // Replay all events to derive state
  const { domain, gamification: baseGamification, onboarding, season, wishlist, settings, quarantine } = useMemo(
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

  const syncedThemeMode = useMemo(() => resolveThemeModeFromSettings(settings), [settings]);
  const syncedSoundEnabled = useMemo(() => resolveSoundEnabledFromSettings(settings), [settings]);
  const syncedSupportModes = useMemo(() => resolveSupportModesFromSettings(settings), [settings]);
  const syncedCustomPrices = useMemo(() => resolveCustomPricesFromSettings(settings), [settings]);
  const syncedOCRConfig = useMemo(() => resolveOCRConfigFromSettings(settings), [settings]);
  const driveBackupPref = useMemo(
    () => (isDemoActive ? undefined : resolveDriveBackupPrefFromSettings(settings)),
    [isDemoActive, settings],
  );

  const handleSyncThemeMode = useCallback(
    (mode: ThemeMode) => {
      dispatchAny(createSettingChangedEvent("domus_theme_mode_v1", mode, eventStore.deviceId || "local"));
    },
    [dispatchAny, eventStore.deviceId],
  );

  const handleSyncSoundEnabled = useCallback(
    (enabled: boolean) => {
      dispatchAny(createSettingChangedEvent("domus_sound_enabled_v1", enabled, eventStore.deviceId || "local"));
    },
    [dispatchAny, eventStore.deviceId],
  );

  const setSupportModes = useCallback(
    (modes: SupportMode[]) => {
      const normalized = normalizeSupportModes(modes);
      void applySyncedSupportModes(normalized, !isDemoActive);
      dispatchAny(createSettingChangedEvent("domus_support_modes_v2", normalized, eventStore.deviceId || "local"));
    },
    [dispatchAny, eventStore.deviceId, isDemoActive],
  );

  useEffect(() => {
    if (syncedSupportModes === undefined) return;
    void applySyncedSupportModes(syncedSupportModes, !isDemoActive);
  }, [syncedSupportModes, isDemoActive]);

  const setAISettings = useCallback(
    (aiSettings: Partial<AISettings>) => {
      const sanitized = pickSyncedAISettings(aiSettings);
      if (Object.keys(sanitized).length === 0) return;
      dispatchAny(
        createSettingChangedEvent(
          AI_SETTINGS_SETTING_KEY,
          sanitized,
          eventStore.deviceId || "local",
        ),
      );
    },
    [dispatchAny, eventStore.deviceId],
  );

  const setDriveBackupPref = useCallback(
    (pref: DriveBackupPreference) => {
      if (isDemoActive) return;
      const sanitized = pickSyncedDriveBackupPref(pref);
      if (!sanitized) return;
      dispatchAny(
        createSettingChangedEvent(
          DRIVE_BACKUP_PREF_SETTING_KEY,
          sanitized,
          eventStore.deviceId || "local",
        ),
      );
    },
    [dispatchAny, eventStore.deviceId, isDemoActive],
  );

  useEffect(() => {
    if (syncedCustomPrices === undefined) {
      if (!isDemoActive) {
        TokenPricingService.invalidateCustomPricesCache();
      }
      return;
    }
    void TokenPricingService.applySyncedCustomPrices(syncedCustomPrices, !isDemoActive);
  }, [syncedCustomPrices, isDemoActive]);

  useEffect(() => {
    return TokenPricingService.registerCustomPricesSyncListener((prices) => {
      dispatchAny(
        createSettingChangedEvent(
          AI_CUSTOM_PRICES_SETTING_KEY,
          prices,
          eventStore.deviceId || "local",
        ),
      );
    });
  }, [dispatchAny, eventStore.deviceId]);

  useEffect(() => {
    if (syncedOCRConfig === undefined) {
      if (!isDemoActive) {
        OCRConfigService.invalidateSyncedOCRConfigCache();
      }
      return;
    }
    void OCRConfigService.applySyncedOCRConfig(syncedOCRConfig, !isDemoActive);
  }, [syncedOCRConfig, isDemoActive]);

  useEffect(() => {
    if (isDemoActive) return;
    return OCRConfigService.registerOCRConfigSyncListener((config) => {
      dispatchAny(
        createSettingChangedEvent(
          OCR_CONFIG_SETTING_KEY,
          pickSyncedOCRConfig(config),
          eventStore.deviceId || "local",
        ),
      );
    });
  }, [dispatchAny, eventStore.deviceId, isDemoActive]);

  // Theme + preferences (depends on derived state)
  const themePrefs = useThemePreferences({
    debugArchetype: debug.debugArchetype,
    transactionCount: Object.keys(domain.transactions).length,
    currentStreak: gamification.currentStreak || 1,
    budgetAdherenceScore: budget.adherenceScore,
    wishlistItemCount: Object.keys(wishlist?.items ?? {}).length,
    monthsPlanned: season.history.length,
    syncedThemeMode,
    syncedSoundEnabled,
    isDemoActive,
    onSyncThemeMode: handleSyncThemeMode,
    onSyncSoundEnabled: handleSyncSoundEnabled,
  });

  // Seed inicial das preferências locais para o log após liberação do primeiro pull (Story 9.3)
  const hasRunSettingsSeedRef = useRef(false);
  const seedEpochRef = useRef(0);
  useEffect(() => {
    if (
      hasRunSettingsSeedRef.current ||
      eventStore.loading ||
      !initialSyncReady ||
      isDemoActive ||
      !eventStore.deviceId
    ) {
      return;
    }
    hasRunSettingsSeedRef.current = true;
    let cancelled = false;
    let completed = false;
    const epoch = seedEpochRef.current;
    const did = eventStore.deviceId;

    (async () => {
      try {
        const [savedTheme, savedSound, savedSupport, savedAISettingsRaw, savedCustomPrices, savedOCRConfig, driveConnected, driveEmail] =
          await Promise.all([
            AsyncStorage.getItem(THEME_MODE_KEY),
            AsyncStorage.getItem(SOUND_ENABLED_KEY),
            loadSupportModes(),
            SecureStorageService.get(AI_SETTINGS_STORE_KEY),
            TokenPricingService.getCustomPricesSnapshot(),
            OCRConfigService.getSyncedOCRConfigSnapshot(),
            GoogleDriveService.isConnected(),
            GoogleDriveService.getConnectedEmail(),
          ]);
        if (cancelled || epoch !== seedEpochRef.current) return;

        let savedAISettings: Partial<AISettings> | null = null;
        if (savedAISettingsRaw) {
          try {
            savedAISettings = JSON.parse(savedAISettingsRaw) as Partial<AISettings>;
          } catch {
            savedAISettings = null;
          }
        }

        const currentEvents =
          eventStore.allEventsRef.current.length >= eventStore.allEvents.length
            ? eventStore.allEventsRef.current
            : eventStore.allEvents;

        const seedEvents = [
          ...buildSettingsSeedEvents({
            allEvents: currentEvents,
            deviceId: did,
            themeMode: savedTheme,
            soundEnabled: savedSound,
            supportModes: savedSupport,
          }),
          ...buildAISettingsSeedEvents({
            allEvents: currentEvents,
            deviceId: did,
            aiSettings: savedAISettings,
            customPrices: savedCustomPrices,
          }),
          ...buildOCRConfigSeedEvents({
            allEvents: currentEvents,
            deviceId: did,
            ocrConfig: savedOCRConfig,
          }),
          ...buildDriveBackupPrefSeedEvents({
            allEvents: currentEvents,
            deviceId: did,
            isConnected: driveConnected,
            email: driveEmail,
          }),
        ];
        completed = true;
        if (seedEvents.length === 0) return;

        const { events: next, added } = appendGenerated(eventStore.allEventsRef.current, seedEvents, did);
        if (added.length === 0) return;
        eventStore.allEventsRef.current = next;

        getEventStore().then((store) => {
          added.forEach((evt) => store?.appendEvent(evt));
        });

        eventStore.setAllEvents((prev) => appendGenerated(prev, added, did).events);
        eventStore.setLocalEventCount((c) => c + added.length);
      } catch {
        // best-effort: não bloqueia o app se AsyncStorage falhar no seed inicial
      }
    })();

    return () => {
      cancelled = true;
      if (!completed) {
        hasRunSettingsSeedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- executa uma única vez após boot + initialSyncReady
  }, [eventStore.loading, initialSyncReady, isDemoActive, eventStore.deviceId]);

  // XP recovery effect (Story 7.2: só roda após a liberação da barreira do primeiro pull)
  useEffect(() => {
    const recoveryEvents = evaluateXpRecoveryEffect({
      loading: eventStore.loading,
      initialSyncReady,
      isDemoActive,
      debugXp: debug.debugXp,
      deviceId: eventStore.deviceId,
      allEvents:
        eventStore.allEventsRef.current.length >= eventStore.allEvents.length
          ? eventStore.allEventsRef.current
          : eventStore.allEvents,
      transactions: domain.transactions,
      totalXp: gamification.totalXp,
    });
    if (recoveryEvents.length === 0 || !eventStore.deviceId) return;

    const did = eventStore.deviceId;
    const { events: next, added } = appendGenerated(eventStore.allEventsRef.current, recoveryEvents, did);
    if (added.length === 0) return;
    eventStore.allEventsRef.current = next;

    getEventStore().then((store) => {
      added.forEach((evt) => store?.appendEvent(evt));
    });

    eventStore.setAllEvents((prev) => appendGenerated(prev, added, did).events);
    eventStore.setLocalEventCount((c) => c + added.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- eventStore é recriado a cada render; os campos realmente usados já estão nas deps e reexecutar dispararia o evento de recuperação de novo
  }, [isDemoActive, eventStore.loading, initialSyncReady, eventStore.allEvents.length, domain.transactions, gamification.totalXp, eventStore.deviceId, debug.debugXp]);

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
    initialSyncReady,
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

  // Reset app: clear events + reset theme/sound/support prefs locally (without emitting SETTING_CHANGED)
  const resetApp = useCallback(async (): Promise<void> => {
    seedEpochRef.current += 1;
    hasRunSettingsSeedRef.current = true;
    await eventStore.resetApp();
    await themePrefs.resetLocalPreferences();
    await resetLocalSupportModes();
    await TokenPricingService.resetLocalCustomPrices();
    await SecureStorageService.delete(AI_SETTINGS_STORE_KEY);
    await OCRConfigService.resetLocalOCRConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- eventStore/themePrefs são recriados a cada render; os métodos usados já são deps
  }, [eventStore.resetApp, themePrefs.resetLocalPreferences]);

  // Assemble context value
  const value = useMemo<AppStateContextValue>(
    () => ({
      domain,
      gamification,
      onboarding,
      season,
      wishlist,
      settings,
      quarantine,
      archetype: themePrefs.archetype,
      themeMode: themePrefs.themeMode,
      soundEnabled: themePrefs.soundEnabled,
      theme: themePrefs.theme,
      levelInfo,
      budget,
      totalBalance,
      loading: eventStore.loading,
      initialSyncReady,
      bootEffectsGate,
      isDemoActive,
      dispatch: dispatchAny,
      dispatchDomainEvent: gamEffects.dispatchDomainEvent,
      setThemeMode: themePrefs.setThemeMode,
      setSoundEnabled: themePrefs.setSoundEnabled,
      setSupportModes,
      setAISettings,
      driveBackupPref,
      setDriveBackupPref,
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
    [domain, gamification, onboarding, season, wishlist, settings, quarantine, themePrefs, levelInfo, budget, totalBalance, eventStore, initialSyncReady, bootEffectsGate, isDemoActive, dispatchAny, gamEffects.dispatchDomainEvent, setSupportModes, setAISettings, driveBackupPref, setDriveBackupPref, resetApp, toast, debug],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppStateOptional(): AppStateContextValue | null {
  return useContext(AppStateContext);
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}
