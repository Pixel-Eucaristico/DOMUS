import React from "react";
import Svg, { Polygon } from "react-native-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import type { ArrowDirection } from "@/src/tour/tourStepConfig";

const ARROW_W = 20;
const ARROW_H = 10;

interface Props {
  direction: ArrowDirection;
  color: string;
  style?: any;
}

export function TourArrow({ direction, color, style }: Props) {
  const isVertical = direction === "up" || direction === "down";
  const w = isVertical ? ARROW_W : ARROW_H;
  const h = isVertical ? ARROW_H : ARROW_W;

  let points: string;
  switch (direction) {
    case "down":
      points = `0,0 ${ARROW_W},0 ${ARROW_W / 2},${ARROW_H}`;
      break;
    case "up":
      points = `0,${ARROW_H} ${ARROW_W},${ARROW_H} ${ARROW_W / 2},0`;
      break;
    case "left":
      points = `${ARROW_H},0 ${ARROW_H},${ARROW_W} 0,${ARROW_W / 2}`;
      break;
    case "right":
      points = `0,0 0,${ARROW_W} ${ARROW_H},${ARROW_W / 2}`;
      break;
  }

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[{ width: w, height: h }, style]}>
      <Svg width={w} height={h}>
        <Polygon points={points} fill={color} />
      </Svg>
    </Animated.View>
  );
}
