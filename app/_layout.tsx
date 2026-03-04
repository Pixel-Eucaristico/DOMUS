import "@/src/modules/cryptoPolyfill";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { useShareIntent } from "expo-share-intent";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AppStateProvider } from "@/src/context/AppStateProvider";
import { SyncProvider } from "@/src/context/SyncProvider";
import { DemoModeProvider, useDemoMode } from "@/src/context/DemoModeProvider";
import { TourOverlay } from "@/src/components/shared/TourOverlay";
import { AchievementToast } from "@/src/components/gamification/AchievementToast";
import { ReligiousPreferenceModal } from "@/src/components/shared/ReligiousPreferenceModal";
import { ShareToWishlistModal } from "@/src/components/wishlist/ShareToWishlistModal";
import { useSavingsGoalScheduler } from "@/src/hooks/useSavingsGoalScheduler";
import { useAutoBackup } from "@/src/hooks/useAutoBackup";
import { LockScreen } from "@/src/components/security/LockScreen";
import { useSecurityLock } from "@/src/hooks/useSecurityLock";
import { AnimatedSplash } from "@/src/components/shared/AnimatedSplash";
import { useAppState } from "@/src/context/AppStateProvider";

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
  const { theme, loading } = useAppState();
  if (loading) return null;
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
        name="privacy-policy"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

function AppContainer({ children }: { children: React.ReactNode }) {
  const { theme } = useAppState();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      {children}
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

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DemoModeProvider>
          <AppStateProvider>
            <AppContainer>
              <KeyboardProvider>
                {!splashFinished && (
                  <SplashWrapper onFinish={() => setSplashFinished(true)} />
                )}
                <SyncProvider>
                  <SavingsGoalScheduler />
                  <AutoBackupScheduler />
                  <SecurityGuard>
                    <RootLayoutNav />
                  </SecurityGuard>

                  {/* Modais e Overlays globais só aparecem após o término da animação de Splash para evitar sobreposição visual */}
                  {splashFinished && (
                    <>
                      <ShareIntentHandler />
                      <TourContent />
                      <AchievementToastHost />
                      <SeasonalToastHost />
                      <ReligiousPreferenceHost />
                    </>
                  )}
                </SyncProvider>
              </KeyboardProvider>
            </AppContainer>
          </AppStateProvider>
        </DemoModeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function TourContent() {
  const { theme } = useAppState();
  return <TourOverlay theme={theme} />;
}

function AchievementToastHost() {
  const { pendingToast, clearPendingToast } = useAppState();
  return <AchievementToast toast={pendingToast} onDismiss={clearPendingToast} />;
}

function ReligiousPreferenceHost() {
  const { isCatholic, loading, setIsCatholic } = useAppState();
  const { isDemoActive } = useDemoMode();
  if (loading || isCatholic !== null || isDemoActive) return null;
  return (
    <ReligiousPreferenceModal
      visible
      onSelect={setIsCatholic}
    />
  );
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
