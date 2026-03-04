import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import type { ThemeColors } from "@packages/theme";

interface LoadingSpinnerProps {
  size?: number;
  theme: ThemeColors;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Spinner de carregamento otimizado em SVG.
 * Substitui loaders estáticos por uma animação fluida e leve.
 */
export function LoadingSpinner({ size = 40, theme }: LoadingSpinnerProps) {
  const rotation = useSharedValue(0);
  const strokeOffset = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1
    );
    strokeOffset.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(strokeOffset.value, [0, 1], [0, 120]),
  }));

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <Svg width={size} height={size} viewBox="0 0 50 50">
          <AnimatedCircle
            cx="25"
            cy="25"
            r="20"
            stroke={theme.primaryColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="125"
            animatedProps={animatedCircleProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
