// FIX-2026-03-09: Backdrop e measureInWindow fixes — ver docs/tour-crash-fixes.md
import React, { useRef, useEffect, useMemo } from "react";
import {
  View as RNView,
  Platform,
  type View,
  type ScrollView,
  type ViewStyle,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { useTourControl } from "./TourControlContext";
import { TOUR_STEPS } from "./tourStepConfig";

const ACTIVE_STYLE: ViewStyle = {
  zIndex: 9998,
  elevation: 22,
  position: "relative",
};

// FIX: Backdrop agora usa dimensoes seguras ao inves de 30000px que crashava
// GPUs Mali em Samsung S23+ (e similares). Ver docs/tour-crash-fixes.md #1
const BACKDROP_BASE: ViewStyle = {
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  zIndex: 9996,
};

const BACKDROP_STYLE: ViewStyle = Platform.OS === "web"
  ? ({ ...BACKDROP_BASE, position: "fixed" } as any)
  : { ...BACKDROP_BASE, position: "absolute" };

/**
 * Hook para elementos da UI exibirem destaque (backdrop) durante o tour.
 * O card de explicação é renderizado na base da tela via TourOverlay.
 *
 * @returns targetRef, TourCard e activeStyle (aplicar no View alvo para z-index elevado)
 */
export function useTourTarget(
  targetId: string,
  scrollViewRef?: React.RefObject<ScrollView | null>,
) {
  const targetRef = useRef<View>(null);
  const { isDemoActive, isTourMinimized, currentTourStep } = useDemoMode();

  const stepIndex = TOUR_STEPS.findIndex((s) => s.targetId === targetId);
  const isActive =
    isDemoActive &&
    !isTourMinimized &&
    stepIndex >= 0 &&
    currentTourStep === stepIndex;

  const activeStyle = isActive ? ACTIVE_STYLE : undefined;

  const TourCard = useMemo(
    () =>
      function TourCardInner() {
        return (
          <TourBackdropRenderer
            targetId={targetId}
            targetRef={targetRef}
            scrollViewRef={scrollViewRef}
          />
        );
      },
    [targetId, scrollViewRef],
  );

  return { targetRef, TourCard, activeStyle };
}

function TourBackdropRenderer({
  targetId,
  targetRef,
  scrollViewRef,
}: {
  targetId: string;
  targetRef: React.RefObject<View | null>;
  scrollViewRef?: React.RefObject<ScrollView | null>;
}) {
  const { isDemoActive, isTourMinimized, currentTourStep } = useDemoMode();
  const tourControl = useTourControl();

  const stepIndex = TOUR_STEPS.findIndex((s) => s.targetId === targetId);
  const step = stepIndex >= 0 ? TOUR_STEPS[stepIndex] : null;
  const isActive =
    isDemoActive &&
    !isTourMinimized &&
    step !== null &&
    currentTourStep === stepIndex;

  // Register inline card visibility with TourOverlay (so it renders the bottom card)
  useEffect(() => {
    if (!isActive || !tourControl) return;
    return tourControl.registerInlineCard();
  }, [isActive, tourControl]);

  // Scroll to target when step activates
  useEffect(() => {
    if (!isActive || !targetRef.current) return;

    const timer = setTimeout(() => {
      if (!targetRef.current) return;

      if (Platform.OS === "web") {
        try {
          const domNode = targetRef.current as any;
          if (domNode && typeof domNode.scrollIntoView === "function") {
            domNode.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
        } catch {
          // fallback
        }
      }

      if (scrollViewRef?.current && targetRef.current) {
        targetRef.current.measureLayout(
          scrollViewRef.current as any,
          (_x: number, y: number) => {
            (scrollViewRef.current as any)?.scrollTo?.({
              y: Math.max(0, y - 120),
              animated: true,
            });
          },
          () => {},
        );
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [isActive, targetRef, scrollViewRef]);

  if (!isActive || !step) return null;

  return (
    // Backdrop fume — sibling do alvo dentro do mesmo container,
    // z-index 9996 fica abaixo do alvo (9998) mas acima de todo o resto
    <Animated.View
      entering={FadeIn.duration(250)}
      style={BACKDROP_STYLE}
      pointerEvents="none"
    />
  );
}
