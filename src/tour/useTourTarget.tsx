// FIX-2026-03-09: Backdrop e measureInWindow fixes — ver docs/tour-crash-fixes.md
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

    // Delay enough for accordion animations to finish before scrolling
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
    }, 600);

    return () => clearTimeout(timer);
  }, [isActive, targetRef, scrollViewRef]);

  // FIX: Auto-minimize com guards contra valores invalidos do measureInWindow.
  // Ver docs/tour-crash-fixes.md #4
  const { height: screenH } = useWindowDimensions();
  useEffect(() => {
    if (!isActive || !cardRef.current || !tourControl) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const delayId = setTimeout(() => {
      intervalId = setInterval(() => {
        if (!cardRef.current) return;
        try {
          cardRef.current.measureInWindow(
            (_x: number, y: number, _w: number, h: number) => {
              if (h <= 0 || (y === 0 && h === 0)) return;
              if (!Number.isFinite(y) || !Number.isFinite(h)) return;
              if (y + h < -200 || y > screenH + 200) {
                tourControl!.handleMinimize();
              }
            },
          );
        } catch {
          // measureInWindow pode falhar durante unmount
        }
      }, 1500);
    }, 800);

    return () => {
      clearTimeout(delayId);
      if (intervalId) clearInterval(intervalId);
    };
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
