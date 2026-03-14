import React, { useEffect, useRef } from "react";
import { ScrollView, BackHandler, Dimensions } from "react-native";
import { TourGuideProvider, useTourGuideController } from "rn-tourguide";
import { useTourPage } from "@/src/tour/useTourPage";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { useAppState } from "@/src/context/AppStateProvider";
import { TourPageContextProvider } from "@/src/tour/TourPageContext";
import { TourGuideTooltip } from "./TourGuideTooltip";
import { TourModalCard } from "./TourModalCard";
import { isIntentionalStop, clearIntentionalStop, markIntentionalStop } from "@/src/tour/tourStopFlag";

interface Props {
  groupId: number;
  children: React.ReactNode;
  /** Pass a ScrollView ref so the guide can auto-scroll to each target element. */
  scrollRef?: React.RefObject<ScrollView>;
  /** Pass a ref that tracks the current scrollY offset (updated via onScroll). */
  scrollYRef?: React.MutableRefObject<number>;
}

/**
 * Per-page tour host. Wrap your page content with this to activate
 * rn-tourguide spotlight for guide steps and TourModalCard for modal steps.
 *
 * Pages with only modal steps (no guideSteps) skip TourGuideProvider entirely.
 */
export function TourPageHost({ groupId, children, scrollRef, scrollYRef }: Props) {
  const { theme } = useAppState();
  const { guideSteps, isModalActive, activeModalStep, activeModalStepIndex, onModalNext, onSkip, onMinimize } =
    useTourPage(groupId);

  const modal = isModalActive && activeModalStep ? (
    <TourModalCard
      step={activeModalStep}
      stepIndex={activeModalStepIndex}
      theme={theme}
      onNext={onModalNext}
      onPrev={() => {}}
      onSkip={onSkip}
      onMinimize={onMinimize}
      isLast={false}
    />
  ) : null;

  if (guideSteps.length === 0) {
    return (
      <>
        {children}
        {modal}
      </>
    );
  }

  return (
    <TourPageContextProvider value={groupId}>
      <TourGuideProvider
        tooltipComponent={TourGuideTooltip}
        backdropColor="rgba(0,0,0,0.75)"
        androidStatusBarVisible
        borderRadius={12}
        animationDuration={300}
        tooltipStyle={{ alignItems: "flex-start", paddingTop: 14, paddingLeft: 16 }}
      >
        <TourGuideStarter groupId={groupId} scrollRef={scrollRef} scrollYRef={scrollYRef} />
        {children}
        {modal}
      </TourGuideProvider>
    </TourPageContextProvider>
  );
}

interface StarterProps {
  groupId: number;
  scrollRef?: React.RefObject<ScrollView>;
  scrollYRef?: React.MutableRefObject<number>;
}

function TourGuideStarter({ groupId, scrollRef, scrollYRef }: StarterProps) {
  const { isGuideActive } = useTourPage(groupId);
  const { minimizedAtGuideStep, setTourMinimized } = useDemoMode();
  const { start, stop, canStart, eventEmitter, getCurrentStep } = useTourGuideController();
  const startedRef = useRef(false);
  const guideHasStartedRef = useRef(false);
  const currentStepOrderRef = useRef(1);

  // Listen to stepChange → auto-scroll to element before spotlight renders.
  // Listen to stop → if tap-outside (not intentional), minimize instead.
  useEffect(() => {
    if (!eventEmitter) return;

    const onStepChange = (step: any) => {
      if (step?.order) currentStepOrderRef.current = step.order;

      // Scroll so element top is near the top of the screen, BEFORE animateMove measures.
      // pageY = screen position. contentY = pageY + currentScrollOffset - scrollViewTop.
      // scrollTo(contentY) puts element at screen top.
      if (scrollRef?.current && step?.wrapper?.measure) {
        step.wrapper.measure(
          (_ox: number, _oy: number, _w: number, _h: number, _x: number, pageY: number) => {
            const currentScrollY = scrollYRef?.current ?? 0;
            // contentY = element's position in ScrollView content
            // When scroll=0, pageY ≈ contentY + scrollViewScreenTop (~56px for status bar)
            const scrollViewScreenTop = 56;
            const contentY = pageY + currentScrollY - scrollViewScreenTop;
            scrollRef.current?.scrollTo({
              y: Math.max(0, contentY),
              animated: false,
            });
          }
        );
      }
    };

    const onStart = () => {
      guideHasStartedRef.current = true;
    };

    const onStop = () => {
      // Ignore spurious stop emitted by TourGuideProvider on mount
      // (visible._default initializes to false, triggering a stop before start)
      if (!guideHasStartedRef.current) return;
      if (!isIntentionalStop) {
        const currentZone = currentStepOrderRef.current;
        setTourMinimized(true, currentZone);
      }
      clearIntentionalStop();
    };

    eventEmitter.on("start", onStart);
    eventEmitter.on("stepChange", onStepChange);
    eventEmitter.on("stop", onStop);
    return () => {
      eventEmitter.off("start", onStart);
      eventEmitter.off("stepChange", onStepChange);
      eventEmitter.off("stop", onStop);
    };
  }, [eventEmitter, setTourMinimized]);

  // Hardware back button: go to previous guide step, or minimize if first
  useEffect(() => {
    if (!isGuideActive) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const order = currentStepOrderRef.current;
      if (order > 1) {
        // Navigate directly to previous step without stopping the guide
        start(order - 1);
      } else {
        // First step: minimize
        markIntentionalStop();
        setTourMinimized(true, order);
        stop();
      }
      return true;
    });
    return () => sub.remove();
  }, [isGuideActive, stop, start, setTourMinimized]);

  // Start guide when active and zones registered.
  // Also has a fallback after 1200ms in case canStart never fires (e.g. zones
  // inside ScrollView measuring slowly).
  useEffect(() => {
    if (!isGuideActive) {
      startedRef.current = false;
      guideHasStartedRef.current = false;
      return;
    }

    if (canStart && !startedRef.current) {
      startedRef.current = true;
      scrollRef?.current?.scrollTo({ y: 0, animated: false });
      const resumeFrom = minimizedAtGuideStep ?? undefined;
      const t = setTimeout(() => start(resumeFrom), 650);
      return () => clearTimeout(t);
    }

    // Fallback: force start if canStart never became true
    if (!startedRef.current) {
      const fallback = setTimeout(() => {
        if (!startedRef.current) {
          startedRef.current = true;
          scrollRef?.current?.scrollTo({ y: 0, animated: false });
          start(minimizedAtGuideStep ?? undefined);
        }
      }, 1200);
      return () => clearTimeout(fallback);
    }
  }, [isGuideActive, canStart, start, minimizedAtGuideStep, scrollRef]);

  return null;
}
