import React, { useCallback, useRef, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { useTourNavigation } from "@/src/tour/useTourNavigation";
import { TOUR_STEPS, TOUR_TOTAL } from "@/src/tour/tourStepConfig";
import { TourMiniBadge } from "@/src/components/tour/TourMiniBadge";
import { TourModalCard } from "@/src/components/tour/TourModalCard";
import { TourInlineCard } from "@/src/components/tour/TourInlineCard";
import {
  TourControlProvider,
  useInlineCardTracker,
  type TourControlContextValue,
} from "@/src/tour/TourControlContext";
import { soundManager } from "@/src/services/SoundManager";
import type { ThemeColors } from "@packages/theme";

interface Props {
  theme: ThemeColors;
  children?: React.ReactNode;
}

/**
 * Tour overlay + context provider.
 * Steps com alvo: backdrop inline (via useTourTarget) + card fixo na base (aqui).
 * Steps sem alvo: TourModalCard centralizado com backdrop.
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
    }),
    [handleNext, handlePrev, handleSkip, handleMinimize, currentTourStep, isTourMinimized, isDemoActive, registerInlineCard, inlineCardVisible],
  );

  const hasTarget = !!step?.targetId;
  const currentIsLast = currentTourStep === TOUR_TOTAL - 1;
  const showModal = isDemoActive && !isTourMinimized && !hasTarget && !!step;
  const showBadge = isDemoActive && !showModal && !inlineCardVisible;
  const showBottomCard = isDemoActive && !isTourMinimized && inlineCardVisible && hasTarget && !!step;

  return (
    <TourControlProvider value={controlValue}>
      <View style={styles.root}>
        {children}
        {/* FIX-2026-03-11: showBadge e showModal são mutuamente exclusivos.
            Usar dois blocos `&&` separados cria dois slots filhos que ficam
            null alternadamente no EdgeToEdgeReactViewGroup, causando crash
            "null child at index 2" no Android 16. Um único ternário encadeado
            garante no máximo 2 filhos no View, sem slots nulos fixos. */}
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
        ) : showBottomCard ? (
          <BottomInlineCard
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

function BottomInlineCard({
  step,
  stepIndex,
  theme,
  onNext,
  onPrev,
  onSkip,
  onMinimize,
  isLast,
}: {
  step: any;
  stepIndex: number;
  theme: ThemeColors;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onMinimize: () => void;
  isLast: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomCardContainer,
        { paddingBottom: insets.bottom + 8 },
      ]}
      pointerEvents="box-none"
    >
      <TourInlineCard
        step={step}
        stepIndex={stepIndex}
        theme={theme}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
        onMinimize={onMinimize}
        isLast={isLast}
        showArrow={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bottomCardContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 10000,
    elevation: 24,
  },
});
