import React, { useCallback, useRef, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { useTourNavigation } from "@/src/tour/useTourNavigation";
import { TOUR_STEPS, TOUR_TOTAL } from "@/src/tour/tourStepConfig";
import { TourMiniBadge } from "@/src/components/tour/TourMiniBadge";
import { TourModalCard } from "@/src/components/tour/TourModalCard";
import { SpotlightBackdrop } from "@/src/components/tour/TourBackdrop";
import {
  TourControlProvider,
  useInlineCardTracker,
  type TourControlContextValue,
  type SpotlightRect,
} from "@/src/tour/TourControlContext";
import { soundManager } from "@/src/services/SoundManager";
import type { ThemeColors } from "@packages/theme";

interface Props {
  theme: ThemeColors;
  children?: React.ReactNode;
}

/**
 * Tour overlay + context provider.
 *
 * Steps com alvo: card inline dentro da ScrollView (via useTourTarget).
 *   - Backdrop: SVG SpotlightBackdrop renderizado aqui (nivel raiz), com buraco
 *     ao redor do elemento alvo para evitar "null child" no Animated.View.
 *   - As coordenadas do alvo chegam via TourControlContext.setSpotlightRect()
 *     chamado em useTourTarget quando measureInWindow retorna dimensoes validas.
 *
 * Steps sem alvo: TourModalCard centralizado (sem backdrop de spotlight).
 */
export function TourOverlay({ theme, children }: Props) {
  const {
    isDemoActive,
    stopDemo,
    currentTourStep,
    setTourStep,
    isTourMinimized,
    setTourMinimized,
  } = useDemoMode();

  useTourNavigation();

  const step = TOUR_STEPS[currentTourStep];

  const handleNext = useCallback(() => {
    soundManager.play("tap");
    if (currentTourStep < TOUR_TOTAL - 1) {
      setTourStep(currentTourStep + 1);
    } else {
      stopDemo();
      soundManager.play("success");
    }
  }, [currentTourStep, setTourStep, stopDemo]);

  const handlePrev = useCallback(() => {
    if (currentTourStep > 0) {
      soundManager.play("tap");
      setTourStep(currentTourStep - 1);
    }
  }, [currentTourStep, setTourStep]);

  const handleSkip = useCallback(() => {
    soundManager.play("tap");
    stopDemo();
  }, [stopDemo]);

  const handleMinimize = useCallback(() => {
    soundManager.play("tap");
    setTourMinimized(true);
  }, [setTourMinimized]);

  const { registerInlineCard, inlineCardVisible } = useInlineCardTracker();

  // Spotlight rect received from useTourTarget via context.
  // Cleared when step changes or tour deactivates.
  const [spotlightRect, setSpotlightRectState] = useState<SpotlightRect | null>(null);
  const setSpotlightRect = useCallback((rect: SpotlightRect | null) => {
    setSpotlightRectState(rect);
  }, []);

  // Note: spotlightRect is cleared by useTourTarget via setSpotlightRect(null)
  // whenever isActive becomes false (step change, minimize, or tour stop).

  const autoMinRef = useRef(false);

  const handleRestore = useCallback(() => {
    soundManager.play("pop");
    setTimeout(() => {
      autoMinRef.current = false;
      setTourMinimized(false);
    }, 200);
  }, [setTourMinimized]);

  const controlValue = useMemo<TourControlContextValue>(
    () => ({
      handleNext,
      handlePrev,
      handleSkip,
      handleMinimize,
      currentTourStep,
      isTourMinimized,
      isDemoActive,
      registerInlineCard,
      inlineCardVisible,
      spotlightRect,
      setSpotlightRect,
    }),
    [
      handleNext,
      handlePrev,
      handleSkip,
      handleMinimize,
      currentTourStep,
      isTourMinimized,
      isDemoActive,
      registerInlineCard,
      inlineCardVisible,
      spotlightRect,
      setSpotlightRect,
    ],
  );

  const hasTarget = !!step?.targetId;
  const currentIsLast = currentTourStep === TOUR_TOTAL - 1;

  // Spotlight: only when tour is active, not minimized, step has a target, and
  // valid coordinates arrived via measureInWindow in useTourTarget
  const showSpotlight = isDemoActive && !isTourMinimized && hasTarget && !!spotlightRect;

  // FIX-2026-03-11: showBadge e showModal sao mutuamente exclusivos.
  // Usar dois blocos `&&` separados cria dois slots filhos que ficam
  // null alternadamente no EdgeToEdgeReactViewGroup, causando crash
  // "null child at index N" no Android 16. Um unico ternario encadeado
  // garante no maximo 2 filhos no View, sem slots nulos fixos.
  const showModal = isDemoActive && !isTourMinimized && !hasTarget && !!step;
  const showBadge = isDemoActive && !showModal && !inlineCardVisible;

  return (
    <TourControlProvider value={controlValue}>
      <View style={styles.root}>
        {children}
        {/* SVG spotlight backdrop — nivel raiz, acima de todo o conteudo.
            Renderizado como Animated.View SEM prop "entering" no proximo nivel.
            O FadeIn/FadeOut esta dentro de SpotlightBackdrop que usa Animated.View
            wrappeando o SVG — o SVG em si nao tem callbacks de animacao nativos,
            portanto nao gera "obj == null" no JNI handler do Reanimated. */}
        {showSpotlight && <SpotlightBackdrop rect={spotlightRect} />}
        {showBadge ? (
          <TourMiniBadge theme={theme} onRestore={handleRestore} />
        ) : showModal ? (
          <TourModalCard
            step={step}
            stepIndex={currentTourStep}
            theme={theme}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
            onMinimize={handleMinimize}
            isLast={currentIsLast}
          />
        ) : null}
      </View>
    </TourControlProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
