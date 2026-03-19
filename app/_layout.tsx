import "@/src/modules/cryptoPolyfill";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useCallback } from "react";
import { View, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AvoidSoftInput } from "react-native-avoid-softinput";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { useShareIntent } from "expo-share-intent";
import { TamaguiProvider } from "tamagui";
import tamaguiConfig from "@/tamagui.config";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AppStateProvider } from "@/src/context/AppStateProvider";
import { SyncProvider } from "@/src/context/SyncProvider";
import { DemoModeProvider, useDemoMode } from "@/src/context/DemoModeProvider";
import { TourOverlay } from "@/src/components/shared/TourOverlay";
import { WelcomeCarousel } from "@/src/components/tour/WelcomeCarousel";
import { AchievementToast } from "@/src/components/gamification/AchievementToast";
import { ShareToWishlistModal } from "@/src/components/wishlist/ShareToWishlistModal";
import { useSavingsGoalScheduler } from "@/src/hooks/useSavingsGoalScheduler";
import { useAutoBackup } from "@/src/hooks/useAutoBackup";
import { useNotificationScheduler } from "@/src/hooks/useNotificationScheduler";
import { useAnalyticsInit } from "@/src/hooks/useAnalyticsInit";
import { createEvent } from "@packages/events/src/factory";
import { EVENT_TYPES } from "@packages/events/src/types";
import type { TransactionUpdatedEvent } from "@packages/events/src/types";
import { LockScreen } from "@/src/components/security/LockScreen";
import { useSecurityLock } from "@/src/hooks/useSecurityLock";
import { AnimatedSplash } from "@/src/components/shared/AnimatedSplash";
import { useAppState } from "@/src/context/AppStateProvider";
import { DebugTools } from "@/src/components/debug/DebugTools";
import { ResponsiveLayoutProvider } from "@/src/ui/layout/ResponsiveLayoutProvider";
import { useResponsive } from "@/src/ui/layout/useResponsive";
import { AdaptiveTabBar } from "@/src/ui/navigation/AdaptiveTabBar";
import { SupportBanner } from "@/src/components/monetization/SupportBanner";
import { DailyAdModal } from "@/src/components/monetization/DailyAdModal";
import { NativeAdBanner } from "@/src/components/monetization/NativeAdBanner";
import { AppOpenAdHost } from "@/src/components/monetization/AppOpenAdHost";
import { loadSupportModes, loadLastDailyAdDate, saveLastDailyAdDate } from "@/src/modules/monetization/MonetizationSettingsStore";
import type { SupportMode } from "@/src/modules/monetization/MonetizationSettingsStore";
import { ToastProvider } from "react-native-sprinkle-toast";

SplashScreen.preventAutoHideAsync();

/** Detecta URLs Amazon/Mercado Livre compartilhadas via intent do sistema */
function isAmazonOrML(text: string): boolean {
  return /amazon\.com\.br|amzn\.to|mercadolivre\.com\.br|meli\.la/i.test(text);
}

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

/** Executa na inicialização: cria aportes pendentes para objetivos de poupança vencidos. */
function SavingsGoalScheduler() {
  useSavingsGoalScheduler();
  return null;
}

/** Executa na inicialização: cria auto-backup local cifrado se passaram ≥ 24 h. */
function AutoBackupScheduler() {
  useAutoBackup();
  return null;
}

/** Executa na inicialização: reagenda todas as notificações locais. */
function NotificationSchedulerRunner() {
  useNotificationScheduler();
  return null;
}

/** Executa na inicialização: inicializa Firebase Analytics/Performance conforme consentimento. */
function AnalyticsInitRunner() {
  useAnalyticsInit();
  return null;
}

/** Processa respostas dos botões de ação das notificações (efetivar/editar). */
function NotificationResponseRunner() {
  useNotificationResponseHandler();
  return null;
}

/** Processa respostas dos botões de ação das notificações (efetivar/editar). */
function useNotificationResponseHandler() {
  const { dispatchDomainEvent, deviceId } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;
    let sub: { remove(): void } | undefined;
    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        sub = Notifications.addNotificationResponseReceivedListener((response) => {
          const action = response.actionIdentifier;
          const data = response.notification.request.content.data as Record<string, unknown>;

          if (action === "efetivar" && data.transactionId) {
            const did = deviceId ?? "local";
            const evt = createEvent<TransactionUpdatedEvent>(
              EVENT_TYPES.TRANSACTION_UPDATED,
              { id: data.transactionId as string, status: "confirmed" },
              did,
            );
            dispatchDomainEvent(evt);
          } else if (action === "editar" && data.transactionId) {
            router.push(`/add-transaction?editId=${data.transactionId}`);
          } else if (
            action === Notifications.DEFAULT_ACTION_IDENTIFIER &&
            data.type === "pending-transactions-group"
          ) {
            router.push("/transactions?filter=pending");
          }
        });
      } catch {
        // expo-notifications not available
      }
    })();
    return () => sub?.remove();
  }, [deviceId, dispatchDomainEvent, router]);
}

/**
 * Mostra a LockScreen enquanto o app estiver bloqueado.
 * Deve estar dentro de AppStateProvider (para ter acesso ao tema).
 */
function SecurityGuard({ children }: { children: React.ReactNode }) {
  const { isLocked, isLoading, unlock } = useSecurityLock();

  if (isLoading) return null;
  if (isLocked) return <LockScreen onUnlock={unlock} />;
  return <>{children}</>;
}

/**
 * Fica invisível na árvore mas ouve intents de compartilhamento.
 * Quando o usuário compartilha um produto da Amazon ou ML, exibe o modal de lista.
 * Deve estar dentro de AppStateProvider para ter acesso ao useWishlist.
 */
function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;

    // Tenta extrair URL do webUrl direto ou do texto compartilhado
    const candidate =
      shareIntent.webUrl && isAmazonOrML(shareIntent.webUrl)
        ? shareIntent.webUrl
        : shareIntent.text
          ? extractUrl(shareIntent.text)
          : null;

    if (candidate && isAmazonOrML(candidate)) {
      setSharedUrl(candidate);
    } else {
      // URL não é Amazon nem ML — ignora e limpa o intent
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent]);

  const handleClose = useCallback(() => {
    setSharedUrl(null);
    resetShareIntent();
  }, [resetShareIntent]);

  if (!sharedUrl) return null;

  return (
    <ShareToWishlistModal
      visible={!!sharedUrl}
      url={sharedUrl}
      onClose={handleClose}
    />
  );
}

function SplashWrapper({ onFinish }: { onFinish: () => void }) {
  const { theme } = useAppState();
  return <AnimatedSplash onAnimationFinish={onFinish} theme={theme} />;
}

function RootLayoutNav() {
  const { theme } = useAppState();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Voltar",
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-transaction"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="onboarding"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="sync"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="transactions"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="import-invoice"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ocr-settings"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="wishlist"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="backup"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="about"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="security-settings"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ai-chat"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ai-settings"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="notification-settings"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="analytics-settings"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

function DesktopLayout({ children }: { children: React.ReactNode }) {
  const { sidebarEnabled } = useResponsive();
  const { theme } = useAppState();
  const { isDemoActive } = useDemoMode();

  if (!sidebarEnabled) return <>{children}</>;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.background }}>
      <AdaptiveTabBar />
      <View style={{ flex: 1, zIndex: isDemoActive ? 9999 : 1, elevation: isDemoActive ? 9999 : 0 }}>{children}</View>
    </View>
  );
}

function AppContainer({ children }: { children: React.ReactNode }) {
  const { theme, themeMode } = useAppState();
  const systemScheme = require("react-native").useColorScheme?.() ?? "light";
  const isDark = themeMode === "dark" || (themeMode === "system" && systemScheme === "dark");
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme={isDark ? "dark" : "light"}>
        <SafeAreaProvider>
          <ResponsiveLayoutProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ResponsiveLayoutProvider>
        </SafeAreaProvider>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Enable native keyboard avoidance globally (react-native-avoid-softinput)
  useEffect(() => {
    AvoidSoftInput.setEnabled(true);
    AvoidSoftInput.setAvoidOffset(8);
    AvoidSoftInput.setEasing("easeIn");
    AvoidSoftInput.setHideAnimationDuration(100);
    AvoidSoftInput.setShowAnimationDuration(100);
    return () => {
      AvoidSoftInput.setEnabled(false);
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DemoModeProvider>
          <AppStateProvider>
            <AppContainer>
              <>
                {!splashFinished ? (
                  <SplashWrapper onFinish={() => setSplashFinished(true)} />
                ) : null}
                <SyncProvider>
                  <SavingsGoalScheduler />
                  <AutoBackupScheduler />
                  <NotificationSchedulerRunner />
                  <AnalyticsInitRunner />
                  <NotificationResponseRunner />
                  <TourContent>
                    <SecurityGuard>
                      <DesktopLayout>
                        <RootLayoutNav />
                      </DesktopLayout>
                    </SecurityGuard>

                    {/* Todos os overlays/modais pós-splash num único slot condicional para
                        evitar múltiplas entradas/saídas simultâneas de filhos no
                        EdgeToEdgeReactViewGroup, que causa crash "null child at index N"
                        no Android 16 quando o rendering pipeline encontra inconsistência. */}
                    {splashFinished ? (
                      <>
                        <MonetizationHosts />
                        <ShareIntentHandler />
                        <AchievementToastHost />
                        <SeasonalToastHost />
                        <WelcomeCarouselHost />
                        {__DEV__ ? <DebugTools /> : null}
                      </>
                    ) : null}
                  </TourContent>
                </SyncProvider>
              </>
            </AppContainer>
          </AppStateProvider>
        </DemoModeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function TourContent({ children }: { children: React.ReactNode }) {
  const { theme } = useAppState();
  return <TourOverlay theme={theme}>{children}</TourOverlay>;
}

function AchievementToastHost() {
  const { pendingToast, clearPendingToast } = useAppState();
  return <AchievementToast toast={pendingToast} onDismiss={clearPendingToast} />;
}

function SeasonalToastHost() {
  const { pendingSeasonalToast, clearPendingSeasonalToast } = useAppState();
  if (!pendingSeasonalToast) return null;
  return (
    <AchievementToast
      toast={{
        achievementId: pendingSeasonalToast.trophyId,
        name: `🎴 ${pendingSeasonalToast.name}`,
        description: pendingSeasonalToast.description,
        rarity: pendingSeasonalToast.tier === 3 ? "diamond" : pendingSeasonalToast.tier === 2 ? "gold" : "silver",
        xpReward: pendingSeasonalToast.xpReward,
      }}
      onDismiss={clearPendingSeasonalToast}
      offsetTop={140}
    />
  );
}

function WelcomeCarouselHost() {
  const { showWelcomeCarousel, completeWelcomeCarousel, startDemo } = useDemoMode();
  // Keep modal visible state separate from mount state so the Modal can close
  // gracefully before the component unmounts (avoids EdgeToEdge null-child crash
  // on Android 16 when Modal is destroyed mid-animation).
  const [modalVisible, setModalVisible] = React.useState(true);

  if (!showWelcomeCarousel) return null;

  return (
    <WelcomeCarousel
      visible={modalVisible}
      onComplete={() => {
        // 1. Hide the Modal (starts its closing animation ~300ms)
        setModalVisible(false);
        // 2. After animation, mark carousel done → unmounts this component
        setTimeout(() => {
          completeWelcomeCarousel();
        }, 400);
        // 3. Start demo tour after modal is fully gone
        setTimeout(() => startDemo(), 1000);
      }}
    />
  );
}

function MonetizationHosts() {
  const [modes, setModes] = useState<SupportMode[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [nativeDismissed, setNativeDismissed] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const { loading } = useAppState();
  const { isDemoActive } = useDemoMode();

  useEffect(() => {
    if (loading || isDemoActive || Platform.OS === "web") return;
    loadSupportModes().then(async (ms) => {
      setModes(ms);
      if (ms.includes("daily_ad")) {
        const last = await loadLastDailyAdDate();
        const today = new Date().toISOString().slice(0, 10);
        if (last !== today) {
          await saveLastDailyAdDate(today);
          setShowDailyModal(true);
        }
      }
    });
  }, [loading, isDemoActive]);

  if (isDemoActive || modes.length === 0) return null;

  return (
    <>
      {modes.includes("banners") && !bannerDismissed && (
        <SupportBanner onDismiss={() => setBannerDismissed(true)} />
      )}
      {modes.includes("native_ad") && !nativeDismissed && (
        <NativeAdBanner onDismiss={() => setNativeDismissed(true)} />
      )}
      {modes.includes("daily_ad") && showDailyModal && (
        <DailyAdModal onClose={() => setShowDailyModal(false)} />
      )}
      <AppOpenAdHost enabled={modes.includes("app_open")} />
    </>
  );
}
