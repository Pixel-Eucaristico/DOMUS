import React from "react";
import { StyleSheet, Platform } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { TOUR_STEPS } from "@/src/tour/tourStepConfig";

// FIX-2026-03-09: ver docs/tour-crash-fixes.md #1
/**
 * Backdrop fume full-screen.
 * Web: position fixed para ignorar stacking contexts.
 * Native: position absolute com top/left/right/bottom 0 (seguro para GPU).
 * pointerEvents="none" para nao bloquear scroll.
 */
export function TourBackdrop() {
  const { isDemoActive, isTourMinimized, currentTourStep } = useDemoMode();

  if (!isDemoActive || isTourMinimized) return null;

  const step = TOUR_STEPS[currentTourStep];
  if (!step?.targetId) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={s.backdrop}
      pointerEvents="none"
    />
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...(Platform.OS === "web"
      ? ({
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        } as any)
      : {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }),
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 9996,
  },
});
