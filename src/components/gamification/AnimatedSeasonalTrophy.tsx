import React, { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { TrophyDecorationFactory } from "./TrophyDecorationFactory";

const AnimatedG = Animated.createAnimatedComponent(G);

interface Props {
  icon?: string;
  id?: string;
  size?: number;
  color?: string;
  isLiturgical?: boolean;
  isStatic?: boolean;
}

/**
 * AnimatedSeasonalTrophy component using SOLID principles.
 * SRP: Responsável apenas pela composição e animação do troféu.
 * OCP: Aberto para novas decorações através da TrophyDecorationFactory.
 */
export function AnimatedSeasonalTrophy({
  icon,
  id,
  size = 120,
  color = "#FFC107",
  isLiturgical = false,
  isStatic = false,
}: Props) {
  const floatY = useSharedValue(0);
  const rotationY = useSharedValue(0);
  const glowOpacity = useSharedValue(0.4);
  const scaleValue = useSharedValue(0.9);

  useEffect(() => {
    if (isStatic) {
      floatY.value = 0;
      rotationY.value = 0.05; // Pequena inclinação para dar profundidade
      glowOpacity.value = 0.6;
      scaleValue.value = 1;
      return;
    }

    // Definindo animações com configurações de Clean Code (extraídas para facilidade de leitura)
    const animateFloat = () => {
      floatY.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
        ),
        -1
      );
    };

    const animateRotation = () => {
      rotationY.value = withRepeat(
        withTiming(1, { duration: 5000, easing: Easing.linear }),
        -1
      );
    };

    const animateGlow = () => {
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 1800 }), withTiming(0.3, { duration: 1800 })),
        -1
      );
    };

    const animateInitialScale = () => {
      scaleValue.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    };

    animateFloat();
    animateRotation();
    animateGlow();
    animateInitialScale();
  }, [isStatic, floatY, glowOpacity, rotationY, scaleValue]);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value * -12 },
      { scale: scaleValue.value }
    ],
  }));

  const spinningProps = useAnimatedProps(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${rotationY.value * 360}deg` }
    ] as any,
  }));

  const glowEffectStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: 1.1 + glowOpacity.value * 0.2 }],
  }));

  // Hook único no topo do componente (rules-of-hooks) — o antigo sparkleStyle(delay)
  // chamava useAnimatedStyle dentro de função comum e ignorava o delay.
  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(floatY.value, [0, 0.5, 1], [0.2, 0.8, 0.2]),
    transform: [
      { scale: interpolate(floatY.value, [0, 1], [0.5, 1.2]) },
      { translateY: interpolate(floatY.value, [0, 1], [0, -20]) }
    ],
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background Aura */}
      <Animated.View 
        style={[
          styles.glow, 
          glowEffectStyle, 
          { backgroundColor: color, width: size * 0.85, height: size * 0.85, borderRadius: size * 0.42 }
        ]} 
      />
      
      {/* Sparkles */}
      <Animated.View style={[styles.sparkle, { top: '10%', left: '20%', backgroundColor: color }, sparkleAnimatedStyle]} />
      <Animated.View style={[styles.sparkle, { top: '30%', right: '15%', backgroundColor: color }, sparkleAnimatedStyle]} />
      <Animated.View style={[styles.sparkle, { bottom: '20%', left: '25%', backgroundColor: color }, sparkleAnimatedStyle]} />

      <Animated.View style={[styles.contentWrapper, floatingStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="trophy_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.8} />
              <Stop offset="100%" stopColor={color} stopOpacity={0.15} />
            </LinearGradient>
          </Defs>

          <AnimatedG animatedProps={spinningProps}>
            {/* Base Protective Circle */}
            <Circle cx="50" cy="50" r="46" fill="url(#trophy_gradient)" stroke={color} strokeWidth="0.8" opacity={0.6} />
            
            {/* Decorações específicas delegadas para a Factory (DIP / OCP) */}
            <TrophyDecorationFactory id={id} color={color} isLiturgical={isLiturgical} />

            {/* Ambient Particles */}
            <Circle cx="20" cy="30" r="1.8" fill={color} opacity={0.5} />
            <Circle cx="80" cy="40" r="2.2" fill={color} opacity={0.4} />
            <Circle cx="45" cy="85" r="1.6" fill={color} opacity={0.6} />
          </AnimatedG>
        </Svg>
        
        {/* Central Icon Overlay */}
        <View style={StyleSheet.absoluteFill}>
          <Text style={[styles.iconText, { fontSize: size * 0.42, color: isLiturgical ? '#2D3748' : 'auto' }]}>
            {icon}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  glow: {
    position: "absolute",
  },
  sparkle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
  contentWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    textAlign: "center",
    lineHeight: 120,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
});
