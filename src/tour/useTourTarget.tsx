import React, { useRef, useEffect, useMemo } from "react";
import {
  View as RNView,
  Platform,
  type View,
  type ScrollView,
  type ViewStyle,
} from "react-native";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { useTourControl } from "./TourControlContext";
import { TOUR_STEPS } from "./tourStepConfig";

const ACTIVE_STYLE: ViewStyle = {
  zIndex: 9998,
  elevation: 22,
  position: "relative",
};

/** Card fica acima do spotlight (zIndex > backdrop 9996) */
const CARD_STYLE: ViewStyle = {
  position: "relative",
  zIndex: 10000,
  elevation: 24,
};

/**
 * Hook para elementos da UI exibirem destaque (backdrop) durante o tour.
 * O card de explicação é renderizado na base da tela via TourOverlay.
 *
 * Quando o passo correspondente ao targetId esta ativo:
 * 1. Mede a posicao do elemento alvo na tela via measureInWindow.
 * 2. Envia as coordenadas para TourControlContext.setSpotlightRect() para que
 *    TourOverlay renderize o SpotlightBackdrop SVG em nivel raiz (sem null-child).
 * 3. Renderiza o TourInlineCard abaixo/perto do elemento alvo.
 *
 * IMPORTANTE: O backdrop (Animated.View com entering/exiting) foi REMOVIDO daqui
 * e substituido pelo SpotlightBackdrop SVG renderizado em TourOverlay. Isso elimina
 * o Fragment com dois filhos animados que causava "null child at index N" no
 * EdgeToEdgeReactViewGroup no Android 16.
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

  // Measure target element position (screen coords) and send to TourOverlay
  // for the SVG SpotlightBackdrop. Cleared when step deactivates.
  // Guard: only send if dimensions are valid (w > 0, h > 0).
  useEffect(() => {
    if (!isActive || !targetRef.current || !tourControl) {
      tourControl?.setSpotlightRect(null);
      return;
    }

    // Delay to let layout/accordion animations settle before measuring
    const timerId = setTimeout(() => {
      if (!targetRef.current || !tourControl) return;

      if (Platform.OS === "web") {
        // On web measureInWindow is not reliable; use getBoundingClientRect
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
        if (!Number.isFinite(x) || !Number.isFinite(y) || w <= 0 || h <= 0) {
          // Target has no measurable size yet — do not render backdrop
          return;
        }
        tourControl.setSpotlightRect({ x, y, w, h });
      });
    }, 500);

    return () => {
      clearTimeout(timerId);
      // Clear spotlight when this step deactivates
      tourControl?.setSpotlightRect(null);
    };
  }, [isActive, targetRef, tourControl]);

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

  // Auto-minimize when the card scrolls off screen
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

  // NOTE: No Fragment and no backdrop Animated.View here.
  // The backdrop is now SpotlightBackdrop rendered by TourOverlay at root level
  // (see TourOverlay.tsx). This eliminates the "null child at index N" crash
  // caused by Animated.View entering/exiting callbacks running on a detached
  // view in the EdgeToEdgeReactViewGroup on Android 16.
  return (
    <RNView
      ref={cardRef}
      collapsable={false}
      style={[
        CARD_STYLE,
        targetId === "accounts-add" ? { marginTop: 12 } : {},
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
