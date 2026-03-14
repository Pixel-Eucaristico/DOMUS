import React, { useEffect, useState } from "react";
import { useWindowDimensions, StyleSheet, Platform } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import type { SpotlightRect } from "@/src/tour/TourControlContext";

const SPOTLIGHT_PADDING = 14;
const SPOTLIGHT_RADIUS = 12;

interface Props {
  rect: SpotlightRect;
  cardHeight?: number;
}

/**
 * Full-screen SVG spotlight backdrop.
 *
 * Renders a semi-transparent dark overlay with a rounded rectangular "hole"
 * around the active tour target so it remains clearly visible.
 * The hole extends below the target by cardHeight (measured via onLayout on
 * TourInlineCard) to also reveal the inline card.
 *
 * Uses SVG Mask instead of animated View opacity.
 * Uses manual useSharedValue animation instead of entering/exiting props to
 * avoid the "obj == null" JNI crash on Android 16 when Reanimated tries to
 * access a native view that was already destroyed mid-animation.
 */
export function SpotlightBackdrop({ rect, cardHeight }: Props) {
  const { width: sw, height: sh } = useWindowDimensions();
  const opacity = useSharedValue(0);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    return () => {
      // Fade out then unmount — controlled manually to avoid Reanimated
      // accessing a destroyed native view on Android 16.
      opacity.value = withTiming(0, { duration: 150 }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Safety guard: do not render if target has no measurable size or unmounted
  if (!mounted || rect.w <= 0 || rect.h <= 0) return null;

  const CARD_CLEARANCE = cardHeight != null && cardHeight > 0 ? cardHeight + 24 : 400;

  const holeX = Math.max(0, rect.x - SPOTLIGHT_PADDING);
  const holeY = Math.max(0, rect.y - SPOTLIGHT_PADDING);
  const holeW = Math.min(sw - holeX, rect.w + SPOTLIGHT_PADDING * 2);
  const holeH = Math.min(sh - holeY, rect.h + SPOTLIGHT_PADDING + CARD_CLEARANCE);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, s.container, animatedStyle]}
      pointerEvents="none"
    >
      <Svg
        width={sw}
        height={sh}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      >
        <Defs>
          <Mask id="tour-spotlight-mask" x="0" y="0" width={sw} height={sh}>
            {/* White = opaque/visible, black = transparent (cut-out) */}
            <Rect x={0} y={0} width={sw} height={sh} fill="white" />
            <Rect
              x={holeX}
              y={holeY}
              width={holeW}
              height={holeH}
              rx={SPOTLIGHT_RADIUS}
              fill="black"
            />
          </Mask>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={sw}
          height={sh}
          fill={Platform.OS === "web" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.55)"}
          mask="url(#tour-spotlight-mask)"
        />
      </Svg>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    zIndex: 9996,
    elevation: 20,
  },
});
