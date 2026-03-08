import React, { useCallback, useRef, useMemo } from "react";
import { View, StyleSheet } from "react-native";
// Navigation is fully handled by useTourNavigation
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { useTourNavigation } from "@/src/tour/useTourNavigation";
import { TOUR_STEPS, TOUR_TOTAL } from "@/src/tour/tourStepConfig";
import { TourMiniBadge } from "@/src/components/tour/TourMiniBadge";
import { TourModalCard } from "@/src/components/tour/TourModalCard";
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
 * Steps com alvo: card inline dentro da ScrollView (via useTourTarget).
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

  // Navigation is handled by useTourNavigation — just update the step
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
    // useTourNavigation handles route changes when isTourMinimized becomes false
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

  return (
    <TourControlProvider value={controlValue}>
      <View style={styles.root}>
        {children}
        {showBadge && (
          <TourMiniBadge theme={theme} onRestore={handleRestore} />
        )}
        {showModal && (
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
        )}
      </View>
    </TourControlProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
