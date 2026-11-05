import React, { useEffect, useId, useMemo } from "react";
import { View, StyleSheet, Text } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { TrophyDecorationFactory } from "./TrophyDecorationFactory";
import {
  getTrophyAnimationConfig,
  resolveActiveParticleCount,
  type TrophyAnimationConfig,
  type ParticleType,
} from "@/src/constants/trophyAnimationConfigs";

const PARTICLE_GLYPHS: Record<Exclude<ParticleType, "none">, string> = {
  stars: "✦",
  hearts: "♥",
  fire: "🔥",
  snow: "❄",
  confetti: "❖",
};

const PARTICLE_POSITIONS: Array<{
  top?: `${number}%`;
  bottom?: `${number}%`;
  left?: `${number}%`;
  right?: `${number}%`;
}> = [
  { top: "10%", left: "18%" },
  { top: "24%", right: "14%" },
  { bottom: "18%", left: "22%" },
  { bottom: "22%", right: "18%" },
  { top: "48%", left: "10%" },
  { top: "46%", right: "10%" },
];

export interface Props {
  icon?: string;
  id?: string;
  size?: number;
  color?: string;
  isLiturgical?: boolean;
  isStatic?: boolean;
  config?: TrophyAnimationConfig;
}

/**
 * AnimatedSeasonalTrophy component using SOLID principles.
 * SRP: Responsável apenas pela composição e animação do troféu.
 * OCP: Aberto para novas decorações e configurações individuais via TrophyAnimationConfig.
 */
export function AnimatedSeasonalTrophy({
  icon,
  id,
  size = 120,
  color = "#FFC107",
  isLiturgical = false,
  isStatic = false,
  config,
}: Props) {
  const rawInstanceId = useId();
  const instanceId = rawInstanceId.replace(/[^a-zA-Z0-9_-]/g, "");
  const gradientId = `trophy_gradient_${instanceId}`;

  const activeConfig = useMemo(
    () => config ?? getTrophyAnimationConfig(id, { isLiturgical }),
    [config, id, isLiturgical],
  );
  const effectColor = isStatic ? color : (activeConfig.effectColor ?? color);

  const floatY = useSharedValue(0);
  const glowOpacity = useSharedValue(isStatic ? 0.3 : 0.3);
  const scaleValue = useSharedValue(isStatic ? 1 : 0);

  useEffect(() => {
    if (isStatic) {
      cancelAnimation(floatY);
      cancelAnimation(glowOpacity);
      cancelAnimation(scaleValue);
      floatY.value = 0;
      glowOpacity.value = activeConfig.secondaryEffect === "none" ? 0 : 0.35;
      scaleValue.value = 1;
      return;
    }

    const motionSpeed = Math.max(300, activeConfig.motionSpeed);
    const halfSpeed = Math.round(motionSpeed / 2);
    const entryDuration = Math.max(0, activeConfig.entryDuration);

    floatY.value = 0;
    glowOpacity.value = 0.3;
    scaleValue.value = 0;

    if (activeConfig.primaryMotion === "spin") {
      floatY.value = withRepeat(
        withTiming(1, { duration: motionSpeed, easing: Easing.linear }),
        -1,
      );
    } else {
      floatY.value = withRepeat(
        withSequence(
          withTiming(1, { duration: halfSpeed, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: halfSpeed, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      );
    }

    if (activeConfig.secondaryEffect === "none") {
      glowOpacity.value = 0;
    } else {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: Math.round(motionSpeed * 0.75) }),
          withTiming(0.28, { duration: Math.round(motionSpeed * 0.75) }),
        ),
        -1,
      );
    }

    scaleValue.value =
      entryDuration > 0
        ? withTiming(1, {
            duration: entryDuration,
            easing: Easing.out(Easing.cubic),
          })
        : 1;

    return () => {
      cancelAnimation(floatY);
      cancelAnimation(glowOpacity);
      cancelAnimation(scaleValue);
    };
  }, [
    isStatic,
    activeConfig.motionSpeed,
    activeConfig.primaryMotion,
    activeConfig.secondaryEffect,
    activeConfig.entryDuration,
    floatY,
    glowOpacity,
    scaleValue,
  ]);

  const primaryMotion = activeConfig.primaryMotion;
  const entryAnimation = activeConfig.entryAnimation;
  const secondaryEffect = activeConfig.secondaryEffect;

  const floatingStyle = useAnimatedStyle(() => {
    if (isStatic) {
      return {
        opacity: 1,
        transform: [
          { translateX: 0 },
          { translateY: 0 },
          { scale: 1 },
          { scaleX: 1 },
          { rotateZ: "0deg" },
        ],
      };
    }

    const p = floatY.value;
    const e = scaleValue.value;

    let translateY = 0;
    let translateX = 0;
    let scale = 1;
    let scaleX = 1;
    let rotateZ = "0deg";

    if (primaryMotion === "spin") {
      scaleX = Math.cos(p * 2 * Math.PI);
      translateY = Math.sin(p * 2 * Math.PI) * -6;
    } else if (primaryMotion === "float") {
      translateY = p * -12;
    } else if (primaryMotion === "bounce") {
      translateY = -Math.abs(Math.sin(p * Math.PI)) * 15;
      scale = 1 + Math.sin(p * Math.PI) * 0.06;
    } else if (primaryMotion === "shake") {
      translateX = Math.sin(p * 4 * Math.PI) * 5;
      rotateZ = `${Math.sin(p * 4 * Math.PI) * 5}deg`;
    } else if (primaryMotion === "pulse") {
      scale = interpolate(p, [0, 1], [0.94, 1.08]);
      translateY = p * -6;
    } else if (primaryMotion === "swing") {
      rotateZ = `${Math.sin(p * 2 * Math.PI) * 9}deg`;
      translateY = p * -6;
    }

    let opacity = 1;
    if (entryAnimation === "scale") {
      scale *= interpolate(e, [0, 1], [0.82, 1]);
    } else if (entryAnimation === "fade") {
      opacity = interpolate(e, [0, 1], [0.2, 1]);
    } else if (entryAnimation === "slide") {
      translateY += interpolate(e, [0, 1], [18, 0]);
      opacity = interpolate(e, [0, 1], [0.25, 1]);
    } else if (entryAnimation === "flip") {
      scaleX *= interpolate(e, [0, 1], [0.2, 1]);
      opacity = interpolate(e, [0, 1], [0.25, 1]);
    }

    return {
      opacity,
      transform: [
        { translateX },
        { translateY },
        { scale },
        { scaleX },
        { rotateZ },
      ],
    };
  }, [isStatic, primaryMotion, entryAnimation]);

  const glowEffectStyle = useAnimatedStyle(() => {
    if (secondaryEffect === "none") {
      return { opacity: 0, transform: [{ scale: 1 }, { rotateZ: "0deg" }] };
    }
    if (isStatic) {
      return {
        opacity: 0.35,
        transform: [{ scale: 1.05 }, { rotateZ: "0deg" }],
      };
    }
    const g = glowOpacity.value;
    if (secondaryEffect === "ripple") {
      return {
        opacity: interpolate(g, [0.28, 0.85], [0.65, 0.15]),
        transform: [
          { scale: interpolate(g, [0.28, 0.85], [0.95, 1.35]) },
          { rotateZ: "0deg" },
        ],
      };
    }
    if (secondaryEffect === "trail") {
      return {
        opacity: interpolate(g, [0.28, 0.85], [0.2, 0.55]),
        transform: [
          { translateY: interpolate(g, [0.28, 0.85], [5, -5]) },
          { scale: interpolate(g, [0.28, 0.85], [0.96, 1.16]) },
          { rotateZ: "0deg" },
        ],
      };
    }
    if (secondaryEffect === "sparkle") {
      return {
        opacity: interpolate(g, [0.28, 0.56, 0.85], [0.15, 0.85, 0.15]),
        transform: [
          { scale: interpolate(g, [0.28, 0.56, 0.85], [0.9, 1.25, 0.9]) },
          { rotateZ: `${interpolate(g, [0.28, 0.85], [-12, 12])}deg` },
        ],
      };
    }
    // glow
    return {
      opacity: g,
      transform: [{ scale: 1.05 + g * 0.22 }, { rotateZ: "0deg" }],
    };
  }, [isStatic, secondaryEffect]);

  // Hook único no topo do componente (rules-of-hooks)
  const sparkleAnimatedStyle = useAnimatedStyle(() => {
    const p = glowOpacity.value;
    return {
      opacity: interpolate(p, [0.28, 0.56, 0.85], [0.2, 0.88, 0.2]),
      transform: [
        { scale: interpolate(p, [0.28, 0.85], [0.65, 1.2]) },
        { translateY: interpolate(p, [0.28, 0.85], [0, -14]) },
      ],
    };
  }, []);

  const maxParticles = resolveActiveParticleCount(
    activeConfig,
    isStatic,
    PARTICLE_POSITIONS.length,
  );
  const particleGlyph =
    activeConfig.particles === "none"
      ? ""
      : PARTICLE_GLYPHS[activeConfig.particles];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background Aura */}
      {secondaryEffect !== "none" && (
        <Animated.View
          style={[
            styles.glow,
            glowEffectStyle,
            {
              backgroundColor:
                secondaryEffect === "ripple" ? "transparent" : effectColor,
              borderColor: effectColor,
              borderWidth: secondaryEffect === "ripple" ? 2 : 0,
              width: size * 0.85,
              height: size * 0.85,
              borderRadius: size * 0.42,
            },
          ]}
        />
      )}

      {/* Partículas / Sparkles */}
      {PARTICLE_POSITIONS.slice(0, maxParticles).map((pos, index) => (
        <Animated.View
          key={index}
          pointerEvents="none"
          style={[
            styles.sparkleWrap,
            pos,
            sparkleAnimatedStyle,
          ]}
        >
          <Text
            style={{
              fontSize: Math.max(9, Math.round(size * 0.11)),
              color: effectColor,
            }}
          >
            {particleGlyph}
          </Text>
        </Animated.View>
      ))}

      <Animated.View style={[styles.contentWrapper, floatingStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient
              id={gradientId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.8} />
              <Stop offset="100%" stopColor={color} stopOpacity={0.15} />
            </LinearGradient>
          </Defs>

          <G>
            {/* Base Protective Circle */}
            <Circle
              cx="50"
              cy="50"
              r="46"
              fill={`url(#${gradientId})`}
              stroke={color}
              strokeWidth="0.8"
              opacity={0.6}
            />

            {/* Decorações específicas delegadas para a Factory (DIP / OCP) */}
            <TrophyDecorationFactory
              id={id}
              color={color}
              isLiturgical={isLiturgical}
              animationConfig={isStatic ? undefined : activeConfig}
            />

            {/* Ambient Particles */}
            <Circle cx="20" cy="30" r="1.8" fill={effectColor} opacity={0.5} />
            <Circle cx="80" cy="40" r="2.2" fill={effectColor} opacity={0.4} />
            <Circle cx="45" cy="85" r="1.6" fill={effectColor} opacity={0.6} />
          </G>
        </Svg>

        {/* Central Icon Overlay */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Text
            style={[
              styles.iconText,
              {
                fontSize: size * 0.42,
                lineHeight: size,
              },
              isLiturgical ? { color: "#2D3748" } : undefined,
            ]}
          >
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
  sparkleWrap: {
    position: "absolute",
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
