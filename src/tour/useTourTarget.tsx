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

// How long after navigation before we attempt to measure the target element.
// Uses RAF retries instead of a fixed delay now, but we still wait for the
// navigation animation to settle before the first attempt.
const MEASURE_INITIAL_DELAY_MS = 300;
// Max RAF retry attempts if measure returns (0,0,0,0)
const MEASURE_MAX_RETRIES = 6;
// Delay between RAF retries (ms)
const MEASURE_RETRY_DELAY_MS = 120;

const SCROLL_TO_TARGET_DELAY_MS = 600;
// How long after scroll starts before the off-screen detector is re-enabled.
// Must be longer than SCROLL_TO_TARGET_DELAY_MS + scroll animation duration.
const SCROLL_OFFSCREEN_RESUME_MS = SCROLL_TO_TARGET_DELAY_MS + 900;

const OFF_SCREEN_CHECK_INTERVAL_MS = 1500;
const OFF_SCREEN_CHECK_START_DELAY_MS = 800;
const OFF_SCREEN_THRESHOLD_PX = 200;
// How many consecutive off-screen readings before we minimise the tour.
// Avoids false positives during animated scrolls.
const OFF_SCREEN_CONSECUTIVE_REQUIRED = 2;

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

  // ─── Bug A fix: retry measureInWindow with RAF until valid coords ───────────
  useEffect(() => {
    if (!isActive || !targetRef.current || !tourControl) {
      tourControl?.setSpotlightRect(null);
      return;
    }

    let cancelled = false;
    let retryCount = 0;
    let rafId: ReturnType<typeof requestAnimationFrame> | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    function attemptMeasure() {
      if (cancelled || !targetRef.current || !tourControl) return;

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

      try {
        targetRef.current.measureInWindow((x, y, w, h) => {
          if (cancelled) return;
          if (Number.isFinite(x) && Number.isFinite(y) && w > 0 && h > 0) {
            tourControl?.setSpotlightRect({ x, y, w, h });
          } else if (retryCount < MEASURE_MAX_RETRIES) {
            // Coords not ready yet — retry after a short delay via RAF
            retryCount++;
            timerId = setTimeout(() => {
              if (!cancelled) {
                rafId = requestAnimationFrame(attemptMeasure);
              }
            }, MEASURE_RETRY_DELAY_MS);
          }
          // If max retries exhausted, leave spotlight off — better than wrong position
        });
      } catch {
        // measureInWindow can throw if view was unmounted between check and call
      }
    }

    // Wait for navigation animation to settle before first attempt
    timerId = setTimeout(() => {
      if (!cancelled) {
        rafId = requestAnimationFrame(attemptMeasure);
      }
    }, MEASURE_INITIAL_DELAY_MS);

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
      if (rafId) cancelAnimationFrame(rafId);
      tourControl?.setSpotlightRect(null);
    };
  }, [isActive, targetRef, tourControl]);

  // ─── Bug B fix: scroll to target, pause off-screen detector during scroll ──
  // isScrollingRef is shared between the scroll effect and the off-screen effect
  const isScrollingRef = useRef(false);
  const scrollResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isActive || !targetRef.current) return;

    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled || !targetRef.current) return;

      // Mark scroll as in-progress so off-screen detector pauses
      isScrollingRef.current = true;
      if (scrollResumeTimerRef.current) clearTimeout(scrollResumeTimerRef.current);
      scrollResumeTimerRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, SCROLL_OFFSCREEN_RESUME_MS - SCROLL_TO_TARGET_DELAY_MS);

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

      if (!scrollViewRef?.current || !targetRef.current) return;

      function doScroll() {
        if (cancelled || !targetRef.current || !scrollViewRef?.current) return;
        try {
          targetRef.current.measureLayout(
            scrollViewRef.current as any,
            (_x: number, y: number, _w: number, h: number) => {
              if (cancelled) return;
              // Retry if measureLayout returns zeroes (ScrollView not ready)
              if (y === 0 && h === 0) {
                setTimeout(() => {
                  if (!cancelled) doScroll();
                }, 200);
                return;
              }
              (scrollViewRef.current as any)?.scrollTo?.({
                y: Math.max(0, y - SCROLL_OFFSET_PX),
                animated: true,
              });
            },
            () => {
              // Error callback — ScrollView not ready, retry once
              setTimeout(() => {
                if (!cancelled) doScroll();
              }, 200);
            },
          );
        } catch {
          // measureLayout can throw during unmount
        }
      }

      doScroll();
    }, SCROLL_TO_TARGET_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (scrollResumeTimerRef.current) {
        clearTimeout(scrollResumeTimerRef.current);
        scrollResumeTimerRef.current = null;
      }
      isScrollingRef.current = false;
    };
  }, [isActive, targetRef, scrollViewRef]);

  // ─── Bug B fix: off-screen detector with consecutive-reading guard ──────────
  const { height: screenHeight } = useWindowDimensions();
  useEffect(() => {
    if (!isActive || !cardRef.current || !tourControl) return;

    let offScreenCount = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const delayId = setTimeout(() => {
      intervalId = setInterval(() => {
        // Do not trigger while scroll animation is running
        if (isScrollingRef.current) {
          offScreenCount = 0; // reset streak during scroll
          return;
        }

        if (!cardRef.current) return;
        try {
          cardRef.current.measureInWindow(
            (_x: number, y: number, _w: number, h: number) => {
              if (h <= 0 || (y === 0 && h === 0)) return;
              if (!Number.isFinite(y) || !Number.isFinite(h)) return;
              const isOffScreenAbove = y + h < -OFF_SCREEN_THRESHOLD_PX;
              const isOffScreenBelow = y > screenHeight + OFF_SCREEN_THRESHOLD_PX;
              if (isOffScreenAbove || isOffScreenBelow) {
                offScreenCount++;
                if (offScreenCount >= OFF_SCREEN_CONSECUTIVE_REQUIRED) {
                  tourControl!.handleMinimize();
                }
              } else {
                offScreenCount = 0; // back in view, reset streak
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
