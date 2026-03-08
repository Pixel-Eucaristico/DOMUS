import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, Platform, Pressable } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import type { ThemeColors } from "@packages/theme";
import type { TourStepDef } from "@/src/tour/tourStepConfig";
import { TourInlineCard } from "./TourInlineCard";

interface Props {
  step: TourStepDef;
  stepIndex: number;
  theme: ThemeColors;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onMinimize: () => void;
  isLast: boolean;
}

export function TourModalCard({
  step,
  stepIndex,
  theme,
  onNext,
  onPrev,
  onSkip,
  onMinimize,
  isLast,
}: Props) {
  // Guard: ignore backdrop press right after mount to avoid
  // capturing the "Próximo" click from the previous step on web
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  const handleBackdropPress = useCallback(() => {
    if (ready) onMinimize();
  }, [ready, onMinimize]);

  return (
    <Animated.View entering={FadeIn.duration(200)} style={s.overlay}>
      <Pressable style={s.backdrop} onPress={handleBackdropPress} />
      <Animated.View
        entering={FadeInUp.duration(300).springify().damping(20)}
        style={s.cardWrapper}
      >
        <TourInlineCard
          step={step}
          stepIndex={stepIndex}
          theme={theme}
          onNext={onNext}
          onPrev={onPrev}
          onSkip={onSkip}
          onMinimize={onMinimize}
          isLast={isLast}
          showArrow={false}
        />
      </Animated.View>
    </Animated.View>
  );
}

const webFixed = Platform.OS === "web"
  ? ({ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 } as any)
  : StyleSheet.absoluteFillObject;

const s = StyleSheet.create({
  overlay: {
    ...webFixed,
    zIndex: 9998,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  cardWrapper: {
    maxWidth: 340,
    width: "90%",
    zIndex: 1,
  },
});
