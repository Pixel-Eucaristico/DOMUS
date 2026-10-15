import React, { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import type { ThemeColors } from "@packages/theme";
import { PixelText } from "@/src/components/pixel";


interface AnimatedSplashProps {
  onAnimationFinish: () => void;
  theme: ThemeColors;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onAnimationFinish, theme }) => {
  const roofProgress = useSharedValue(0);
  const bar1Scale = useSharedValue(0);
  const bar2Scale = useSharedValue(0);
  const bar3Scale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // Sequência de animação
    roofProgress.value = withTiming(1, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    bar1Scale.value = withDelay(400, withTiming(1, { duration: 500 }));
    bar2Scale.value = withDelay(600, withTiming(1, { duration: 500 }));
    bar3Scale.value = withDelay(800, withTiming(1, { duration: 500 }));
    textOpacity.value = withDelay(1000, withTiming(1, { duration: 600 }));

    // Finalização
    const timeout = setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(onAnimationFinish)();
        }
      });
    }, 2800);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animação de splash roda uma única vez na montagem; shared values são estáveis e onAnimationFinish não deve reiniciá-la
  }, []);

  const roofProps = useAnimatedProps(() => ({
    opacity: roofProgress.value,
  }));

  const bar1Props = useAnimatedProps(() => ({
    opacity: bar1Scale.value,
  }));

  const bar2Props = useAnimatedProps(() => ({
    opacity: bar2Scale.value,
  }));

  const bar3Props = useAnimatedProps(() => ({
    opacity: bar3Scale.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: 0.95 + textOpacity.value * 0.05 }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[s.container, containerStyle, { backgroundColor: theme.background }]}>
      <View style={s.logoWrapper}>
        <Svg width={120} height={120} viewBox="0 0 100 100">
          {/* Teto da Casa */}
          <AnimatedPath
            d="M15 45L50 15L85 45"
            stroke={theme.primaryColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            animatedProps={roofProps}
          />
          {/* Barras do Gráfico (Simbolizando crescimento dentro da casa/domus) */}
          <AnimatedRect
            x="25"
            y="65"
            width="12"
            height="20"
            rx="3"
            fill={theme.primaryColor}
            animatedProps={bar1Props}
          />
          <AnimatedRect
            x="44"
            y="45"
            width="12"
            height="40"
            rx="3"
            fill={theme.accentColor}
            animatedProps={bar2Props}
          />
          <AnimatedRect
            x="63"
            y="25"
            width="12"
            height="60"
            rx="3"
            fill={theme.success}
            animatedProps={bar3Props}
          />
        </Svg>
        <Animated.View style={[s.textContainer, textStyle]}>
          <PixelText size={28} color={theme.primaryColor} style={{ letterSpacing: 4 }}>DOMUS</PixelText>
          <Text style={[s.sloganText, { color: theme.textColor }]}>Gestão Financeira Inteligente</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  logoWrapper: {
    alignItems: "center",
  },
  textContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  brandText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 32,
    letterSpacing: 4,
  },
  sloganText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    marginTop: 4,
    opacity: 0.6,
  },
});
