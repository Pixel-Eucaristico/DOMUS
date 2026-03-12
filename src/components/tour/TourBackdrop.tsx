import React from "react";
import { useWindowDimensions, StyleSheet, Platform } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import type { SpotlightRect } from "@/src/tour/TourControlContext";

const SPOTLIGHT_PADDING = 14;
const SPOTLIGHT_RADIUS = 12;
// Extra height below target to ensure the inline TourCard is also inside the spotlight
const CARD_CLEARANCE = 400;

interface Props {
  rect: SpotlightRect;
}

/**
 * Full-screen SVG spotlight backdrop.
 *
 * Renders a semi-transparent dark overlay with a rounded rectangular "hole"
 * around the active tour target so it remains clearly visible.
 * The hole extends CARD_CLEARANCE px below the target to also reveal the
 * inline TourCard that renders beneath the target element.
 *
 * Uses SVG Mask instead of an animated View opacity so there are no Reanimated
 * "entering/exiting" callbacks — eliminating the "obj == null" JNI crash on
 * Android 16 that appeared when the Animated.View was unmounted mid-animation.
 */
export function SpotlightBackdrop({ rect }: Props) {
  const { width: sw, height: sh } = useWindowDimensions();

  // Safety guard: do not render if target has no measurable size
  if (rect.w <= 0 || rect.h <= 0) return null;

  const holeX = Math.max(0, rect.x - SPOTLIGHT_PADDING);
  const holeY = Math.max(0, rect.y - SPOTLIGHT_PADDING);
  const holeW = Math.min(sw - holeX, rect.w + SPOTLIGHT_PADDING * 2);
  // Extend downward to reveal the card rendered below the target
  const holeH = Math.min(sh - holeY, rect.h + SPOTLIGHT_PADDING + CARD_CLEARANCE);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[StyleSheet.absoluteFillObject, s.container]}
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
