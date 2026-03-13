import React, { useRef, useEffect, useMemo } from "react";
import {
  View as RNView,
  Platform,
  useWindowDimensions,
  type View,
  type ScrollView,
  type ViewStyle,
} from "react-native";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { useAppState } from "@/src/context/AppStateProvider";
import { useTourControl } from "./TourControlContext";
import { TOUR_STEPS, TOUR_TOTAL } from "./tourStepConfig";
import { TourInlineCard } from "@/src/components/tour/TourInlineCard";

const SPOTLIGHT_MEASURE_DELAY_MS = 500;
const SCROLL_TO_TARGET_DELAY_MS = 600;
const OFF_SCREEN_CHECK_INTERVAL_MS = 1500;
const OFF_SCREEN_CHECK_START_DELAY_MS = 800;
const OFF_SCREEN_THRESHOLD_PX = 200;
const SCROLL_OFFSET_PX = 120;

const TARGET_WITH_TOP_MARGIN = "accounts-add";
const TARGET_TOP_MARGIN_PX = 12;

const ACTIVE_STYLE: ViewStyle = {
  zIndex: 9998,
  elevation: 22,
  position: "relative",
};

const CARD_STYLE: ViewStyle = {
  position: "relative",
  zIndex: 10000,
  elevation: 24,
};

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
  const { theme } = useAppState();
  const tourControl = useTourControl();
  const cardRef = useRef<RNView | null>(null);

  const stepIndex = TOUR_STEPS.findIndex((s) => s.targetId === targetId);
  const isLast = stepIndex === TOUR_TOTAL - 1;
  const step = stepIndex >= 0 ? TOUR_STEPS[stepIndex] : null;
  const isActive =
    isDemoActive &&
    !isTourMinimized &&
    step !== null &&
    currentTourStep === stepIndex;

  useEffect(() => {
    if (!isActive || !targetRef.current || !tourControl) {
      tourControl?.setSpotlightRect(null);
      return;
    }

    const timerId = setTimeout(() => {
      if (!targetRef.current || !tourControl) return;

      if (Platform.OS === "web") {
        try {
          const domNode = targetRef.current as any;
          if (domNode && typeof domNode.getBoundingClientRect === "function") {
            const r = domNode.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              tourControl.setSpotlightRect({ x: r.left, y: r.top, w: r.width, h: r.height });
            }
          }
        } catch {
          // ignore
        }
        return;
      }

      targetRef.current.measureInWindow((x, y, w, h) => {
        if (!Number.isFinite(x) || !Number.isFinite(y) || w <= 0 || h <= 0) return;
        tourControl.setSpotlightRect({ x, y, w, h });
      });
    }, SPOTLIGHT_MEASURE_DELAY_MS);

    return () => {
      clearTimeout(timerId);
      tourControl?.setSpotlightRect(null);
    };
  }, [isActive, targetRef, tourControl]);

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
              y: Math.max(0, y - SCROLL_OFFSET_PX),
              animated: true,
            });
          },
          () => {},
        );
      }
    }, SCROLL_TO_TARGET_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isActive, targetRef, scrollViewRef]);

  const { height: screenHeight } = useWindowDimensions();
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
              const isOffScreenAbove = y + h < -OFF_SCREEN_THRESHOLD_PX;
              const isOffScreenBelow = y > screenHeight + OFF_SCREEN_THRESHOLD_PX;
              if (isOffScreenAbove || isOffScreenBelow) {
                tourControl!.handleMinimize();
              }
            },
          );
        } catch {
          // measureInWindow pode falhar durante unmount
        }
      }, OFF_SCREEN_CHECK_INTERVAL_MS);
    }, OFF_SCREEN_CHECK_START_DELAY_MS);

    return () => {
      clearTimeout(delayId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, screenHeight, tourControl]);

  if (!isActive || !step || !tourControl) return null;

  return (
    <RNView
      ref={cardRef}
      collapsable={false}
      style={[
        CARD_STYLE,
        targetId === TARGET_WITH_TOP_MARGIN ? { marginTop: TARGET_TOP_MARGIN_PX } : {},
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
  );
}
