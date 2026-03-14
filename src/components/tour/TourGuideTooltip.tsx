import React from "react";
import { View, StyleSheet } from "react-native";
import type { TooltipProps } from "rn-tourguide";
import { TOUR_STEPS } from "@/src/tour/tourStepConfig";
import { globalStepIndex } from "@/src/tour/tourPageGroups";
import { useTourPageGroupId } from "@/src/tour/TourPageContext";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { useAppState } from "@/src/context/AppStateProvider";
import { TourInlineCard } from "./TourInlineCard";
import { soundManager } from "@/src/services/SoundManager";
import { markIntentionalStop } from "@/src/tour/tourStopFlag";

/**
 * Custom rn-tourguide tooltip that renders TourInlineCard.
 *
 * Convention: TourGuideZone's `text` prop = tour step ID (as string).
 * e.g. text="1" for TOUR_STEPS[1] (dashboard-balance).
 */
export function TourGuideTooltip({
  isFirstStep,
  isLastStep,
  currentStep,
  handleNext,
  handlePrev,
  handleStop,
}: TooltipProps) {
  const { nextPageGroup, prevPageGroup, stopDemo, setTourMinimized } = useDemoMode();
  const { theme } = useAppState();
  const groupId = useTourPageGroupId();

  const stepId = parseInt(currentStep?.text ?? "-1", 10);
  const step = TOUR_STEPS.find((s) => s.id === stepId) ?? null;
  const zoneOrder = currentStep?.order ?? 1;

  const globalIdx = groupId >= 0
    ? globalStepIndex(groupId, "guide", zoneOrder - 1)
    : stepId;

  if (!step) return null;

  const handleNextWrapped = () => {
    soundManager.play("tap");
    if (isLastStep) {
      markIntentionalStop();
      nextPageGroup();
      handleStop?.();
    } else {
      handleNext?.();
    }
  };

  const handlePrevWrapped = () => {
    soundManager.play("tap");
    if (isFirstStep) {
      markIntentionalStop();
      prevPageGroup();
      handleStop?.();
    } else {
      handlePrev?.();
    }
  };

  const handleSkip = () => {
    soundManager.play("tap");
    markIntentionalStop();
    stopDemo();
    handleStop?.();
  };

  const handleMinimize = () => {
    soundManager.play("tap");
    markIntentionalStop();
    setTourMinimized(true, zoneOrder);
    handleStop?.();
  };

  return (
    <View style={s.wrapper}>
      <TourInlineCard
        step={step}
        stepIndex={globalIdx}
        theme={theme}
        onNext={handleNextWrapped}
        onPrev={handlePrevWrapped}
        onSkip={handleSkip}
        onMinimize={handleMinimize}
        isLast={!!isLastStep}
        showArrow={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    maxWidth: 340,
    width: "90%",
  },
});
