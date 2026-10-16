import React, { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import { TrophyDecorationFactory } from "./TrophyDecorationFactory";
import { TrophyEffects, useTrophyMotion } from "./TrophyMotion";
import {
  getTrophyAnimationConfig,
  type TrophyAnimationConfig,
} from "@/src/constants/trophyAnimationConfigs";

const AnimatedG = Animated.createAnimatedComponent(G);

interface Props {
  icon?: string;
  id?: string;
  size?: number;
  color?: string;
  isLiturgical?: boolean;
  isStatic?: boolean;
  /** Configuração explícita (tem prioridade sobre a do id) */
  config?: TrophyAnimationConfig;
}

/**
 * AnimatedSeasonalTrophy component using SOLID principles.
 * SRP: Responsável apenas pela composição do troféu; o movimento vem de
 *      TrophyMotion conforme a configuração individual (trophyAnimationConfigs).
 * OCP: Aberto para novas decorações através da TrophyDecorationFactory.
 */
export function AnimatedSeasonalTrophy({
  icon,
  id,
  size = 120,
  color = "#FFC107",
  isLiturgical = false,
  isStatic = false,
  config: configProp,
}: Props) {
  const config = configProp ?? getTrophyAnimationConfig(id);
  // No "spin" o giro 3D fica no disco; o corpo só recebe a animação de entrada
  const isSpin = config.primaryMotion === "spin";
  const bodyConfig: TrophyAnimationConfig = isSpin ? { ...config, primaryMotion: "float" } : config;
  const motionStyle = useTrophyMotion(bodyConfig, size, isStatic);
  const rotationY = useSharedValue(0);

  useEffect(() => {
    if (isStatic || !isSpin) {
      cancelAnimation(rotationY);
      rotationY.value = isStatic ? 0.05 : 0; // Pequena inclinação para dar profundidade
      return;
    }
    rotationY.value = 0;
    rotationY.value = withRepeat(
      withTiming(1, { duration: config.motionSpeed, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(rotationY);
  }, [isStatic, isSpin, config.motionSpeed, rotationY]);

  const spinningProps = useAnimatedProps(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${rotationY.value * 360}deg` }
    ] as any,
  }));

  const gradientId = `trophy_gradient_${id ?? "default"}`;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <TrophyEffects config={config} color={color} size={size} isStatic={isStatic} />

      <Animated.View style={[styles.contentWrapper, motionStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.8} />
              <Stop offset="100%" stopColor={color} stopOpacity={0.15} />
            </LinearGradient>
          </Defs>

          <AnimatedG animatedProps={spinningProps}>
            {/* Base Protective Circle */}
            <Circle cx="50" cy="50" r="46" fill={`url(#${gradientId})`} stroke={color} strokeWidth="0.8" opacity={0.6} />

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
          <Text style={[styles.iconText, { fontSize: size * 0.42, lineHeight: size, color: isLiturgical ? '#2D3748' : 'auto' }]}>
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
  contentWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
});
