import React, { useEffect } from "react";
import { StyleSheet, View, Dimensions, Text } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  withSequence,
  runOnJS,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

interface AnimatedSplashProps {
  onAnimationFinish: () => void;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onAnimationFinish }) => {
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
  }, []);

  const roofStyle = useAnimatedStyle(() => ({
    opacity: roofProgress.value,
    transform: [{ translateY: (1 - roofProgress.value) * 10 }],
  }));

  const bar1Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: bar1Scale.value }],
    opacity: bar1Scale.value,
  }));

  const bar2Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: bar2Scale.value }],
    opacity: bar2Scale.value,
  }));

  const bar3Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: bar3Scale.value }],
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
    <Animated.View style={[s.container, containerStyle]}>
      <View style={s.logoWrapper}>
        <Svg width={120} height={120} viewBox="0 0 100 100">
          {/* Teto da Casa */}
          <AnimatedPath
            d="M15 45L50 15L85 45"
            stroke="#1B5E63"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={roofStyle}
          />
          {/* Barras do Gráfico (Simbolizando crescimento dentro da casa/domus) */}
          <AnimatedRect
            x="25"
            y="65"
            width="12"
            height="20"
            rx="3"
            fill="#1B5E63"
            style={bar1Style}
          />
          <AnimatedRect
            x="44"
            y="45"
            width="12"
            height="40"
            rx="3"
            fill="#1B5E63"
            style={bar2Style}
          />
          <AnimatedRect
            x="63"
            y="25"
            width="12"
            height="60"
            rx="3"
            fill="#1B5E63"
            style={bar3Style}
          />
        </Svg>
        <Animated.View style={[s.textContainer, textStyle]}>
          <Text style={s.brandText}>DOMUS</Text>
          <Text style={s.sloganText}>Gestão Financeira Inteligente</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F4F6F8",
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
    color: "#1B5E63",
    letterSpacing: 4,
  },
  sloganText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#1A1A2E",
    marginTop: 4,
    opacity: 0.6,
  },
});
