import React, { useRef, useEffect, useMemo } from "react";
import {
  View as RNView,
  Platform,
  useWindowDimensions,
  type View,
  type ScrollView,
  type ViewStyle,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { useTourControl } from "./TourControlContext";
import { TOUR_STEPS, TOUR_TOTAL } from "./tourStepConfig";
import { TourInlineCard } from "@/src/components/tour/TourInlineCard";
import { useAppState } from "@/src/context/AppStateProvider";

const ACTIVE_STYLE: ViewStyle = {
  zIndex: 9998,
  elevation: 22,
  position: "relative",
};

/** Card fica entre o alvo (9998) e o fume (9996) */
const CARD_STYLE: ViewStyle = {
  position: "relative",
  zIndex: 10000,
  elevation: 24,
};

const BACKDROP_STYLE: ViewStyle = Platform.OS === "web"
  ? ({
      position: "fixed",
      top: -10000,
      left: -10000,
      right: -10000,
      bottom: -10000,
      backgroundColor: "rgba(0,0,0,0.5)",
      zIndex: 9996,
    } as any)
  : {
      position: "absolute",
      top: -10000,
      left: -10000,
      width: 30000,
      height: 30000,
      backgroundColor: "rgba(0,0,0,0.5)",
      zIndex: 9996,
    };

/**
 * Hook para elementos da UI exibirem um card de tour inline.
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
          <TourCardRenderer
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

function TourCardRenderer({
  targetId,
  targetRef,
  scrollViewRef,
}: {
  targetId: string;
  targetRef: React.RefObject<View | null>;
  scrollViewRef?: React.RefObject<ScrollView | null>;
}) {
  const { isDemoActive, isTourMinimized, currentTourStep } = useDemoMode();
  const { theme } = useAppState();
  const tourControl = useTourControl();

  const cardRef = useRef<View>(null);

  const stepIndex = TOUR_STEPS.findIndex((s) => s.targetId === targetId);
  const step = stepIndex >= 0 ? TOUR_STEPS[stepIndex] : null;
  const isActive =
    isDemoActive &&
    !isTourMinimized &&
    step !== null &&
    currentTourStep === stepIndex;
  const isLast = stepIndex === TOUR_TOTAL - 1;

  // Register inline card visibility with TourOverlay
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
          // On web, refs already point to DOM nodes — no need for findNodeHandle
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
    }, 300);

    return () => clearTimeout(timer);
  }, [isActive, targetRef, scrollViewRef]);

  // Auto-minimize when card scrolls off screen
  const { height: screenH } = useWindowDimensions();
  useEffect(() => {
    if (!isActive || !cardRef.current || !tourControl) return;

    const interval = setInterval(() => {
      if (!cardRef.current) return;
      cardRef.current.measureInWindow(
        (_x: number, y: number, _w: number, h: number) => {
          if (h <= 0 || y === 0) return;
          if (y + h < -200 || y > screenH + 200) {
            tourControl!.handleMinimize();
          }
        },
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, screenH, tourControl]);

  if (!isActive || !step || !tourControl) return null;

  return (
    <>
      {/* Backdrop fume — sibling do alvo dentro do mesmo container,
          z-index 9996 fica abaixo do alvo (9997) mas acima de todo o resto */}
      <Animated.View
        entering={FadeIn.duration(250)}
        style={BACKDROP_STYLE}
        pointerEvents="none"
      />
      {/* Card inline */}
      <RNView 
        ref={cardRef} 
        collapsable={false} 
        style={[
          CARD_STYLE,
          targetId === "accounts-add" ? { marginTop: 12 } : {}
        ]}
      >
        <TourInlineCard
          step={step}
          stepIndex={stepIndex}
          theme={theme}
          onNext={tourControl.handleNext}
          onPrev={tourControl.handlePrev}
          onSkip={tourControl.handleSkip}
          onMinimize={tourControl.handleMinimize}
          isLast={isLast}
          showArrow={true}
        />
      </RNView>
    </>
  );
}
