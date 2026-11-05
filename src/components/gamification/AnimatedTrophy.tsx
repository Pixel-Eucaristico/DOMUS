import React, { useEffect, useId, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Path,
  Rect,
  Ellipse,
  Text as SvgText,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
  interpolate,
} from "react-native-reanimated";
import type { AchievementRarity } from "@packages/gamification/src/achievements";
import {
  getTrophyAnimationConfig,
  resolveActiveParticleCount,
  type TrophyAnimationConfig,
  type ParticleType,
} from "@/src/constants/trophyAnimationConfigs";

interface TrophyColors {
  light: string;
  mid: string;
  dark: string;
  star: string;
}

const RARITY_COLORS: Record<AchievementRarity, TrophyColors> = {
  silver: {
    light: "#F0F0F0",
    mid: "#B0B0B0",
    dark: "#707070",
    star: "#E0E0E0",
  },
  gold: {
    light: "#FFE566",
    mid: "#FFC107",
    dark: "#B8860B",
    star: "#FFFFFF",
  },
  diamond: {
    light: "#E0F7FF",
    mid: "#4FC3F7",
    dark: "#0277BD",
    star: "#FFFFFF",
  },
};

const PARTICLE_GLYPHS: Record<Exclude<ParticleType, "none">, string> = {
  stars: "✦",
  hearts: "♥",
  fire: "🔥",
  snow: "❄",
  confetti: "❖",
};

const PARTICLE_POSITIONS: Array<{ top: `${number}%`; left: `${number}%` }> = [
  { top: "8%", left: "14%" },
  { top: "14%", left: "78%" },
  { top: "48%", left: "8%" },
  { top: "52%", left: "82%" },
  { top: "78%", left: "18%" },
  { top: "75%", left: "76%" },
];

export interface Props {
  rarity: AchievementRarity;
  size?: number;
  spinning?: boolean;
  id?: string;
  config?: TrophyAnimationConfig;
}

export function AnimatedTrophy({
  rarity,
  size = 64,
  spinning = true,
  id,
  config,
}: Props) {
  const rawInstanceId = useId();
  const instanceId = rawInstanceId.replace(/[^a-zA-Z0-9_-]/g, "");
  const activeConfig = useMemo(
    () => config ?? getTrophyAnimationConfig(id, { rarity }),
    [config, id, rarity],
  );
  const colors = RARITY_COLORS[rarity];
  const effectColor = activeConfig.effectColor ?? colors.mid;
  const gradientId = `grad_${rarity}_${instanceId}`;

  // Shared values declarados incondicionalmente no topo (Rules of Hooks)
  const motionProgress = useSharedValue(0);
  const effectProgress = useSharedValue(0);
  const entryProgress = useSharedValue(spinning ? 0 : 1);

  useEffect(() => {
    if (!spinning) {
      cancelAnimation(motionProgress);
      cancelAnimation(effectProgress);
      cancelAnimation(entryProgress);
      motionProgress.value = 0;
      effectProgress.value = 0;
      entryProgress.value = 1;
      return;
    }

    const duration = Math.max(300, activeConfig.motionSpeed);
    const entryDuration = Math.max(0, activeConfig.entryDuration);

    motionProgress.value = 0;
    effectProgress.value = 0;
    entryProgress.value = 0;
    entryProgress.value =
      entryDuration > 0
        ? withTiming(1, {
            duration: entryDuration,
            easing: Easing.out(Easing.cubic),
          })
        : 1;

    if (activeConfig.primaryMotion === "spin") {
      motionProgress.value = withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1,
      );
    } else {
      motionProgress.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: Math.round(duration / 2),
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: Math.round(duration / 2),
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
      );
    }

    effectProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: Math.round(duration * 0.55),
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: Math.round(duration * 0.55),
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
    );

    return () => {
      cancelAnimation(motionProgress);
      cancelAnimation(effectProgress);
      cancelAnimation(entryProgress);
    };
  }, [
    spinning,
    activeConfig.primaryMotion,
    activeConfig.motionSpeed,
    activeConfig.secondaryEffect,
    activeConfig.entryDuration,
    motionProgress,
    effectProgress,
    entryProgress,
  ]);

  const primaryMotion = activeConfig.primaryMotion;
  const entryAnimation = activeConfig.entryAnimation;
  const secondaryEffect = activeConfig.secondaryEffect;

  const trophyStyle = useAnimatedStyle(() => {
    if (!spinning) {
      return {
        opacity: 1,
        transform: [
          { translateY: 0 },
          { translateX: 0 },
          { rotateZ: "0deg" },
          { scaleX: 1 },
          { scale: 1 },
        ],
      };
    }

    const p = motionProgress.value;
    const e = entryProgress.value;

    let translateY = 0;
    let translateX = 0;
    let scale = 1;
    let scaleX = 1;
    let rotateZ = "0deg";

    if (primaryMotion === "spin") {
      scaleX = Math.cos(p * 2 * Math.PI);
    } else if (primaryMotion === "float") {
      translateY = interpolate(p, [0, 1], [0, -size * 0.1]);
    } else if (primaryMotion === "bounce") {
      translateY = -Math.abs(Math.sin(p * Math.PI)) * (size * 0.14);
      scale = 1 + Math.sin(p * Math.PI) * 0.05;
    } else if (primaryMotion === "shake") {
      translateX = Math.sin(p * 4 * Math.PI) * (size * 0.06);
      rotateZ = `${Math.sin(p * 4 * Math.PI) * 6}deg`;
    } else if (primaryMotion === "pulse") {
      scale = interpolate(p, [0, 1], [0.95, 1.1]);
    } else if (primaryMotion === "swing") {
      rotateZ = `${Math.sin(p * 2 * Math.PI) * 10}deg`;
    }

    let entryOpacity = 1;
    if (entryAnimation === "scale") {
      scale *= interpolate(e, [0, 1], [0.7, 1]);
    } else if (entryAnimation === "fade") {
      entryOpacity = e;
    } else if (entryAnimation === "slide") {
      translateY += interpolate(e, [0, 1], [size * 0.22, 0]);
      entryOpacity = e;
    } else if (entryAnimation === "flip") {
      scaleX *= interpolate(e, [0, 1], [0.15, 1]);
      entryOpacity = e;
    }

    return {
      opacity: entryOpacity,
      transform: [
        { translateY },
        { translateX },
        { rotateZ },
        { scaleX },
        { scale },
      ],
    };
  }, [spinning, primaryMotion, entryAnimation, size]);

  const secondaryEffectStyle = useAnimatedStyle(() => {
    if (!spinning || secondaryEffect === "none") {
      return { opacity: 0, transform: [{ scale: 1 }, { rotateZ: "0deg" }] };
    }
    const ep = effectProgress.value;
    if (secondaryEffect === "ripple") {
      return {
        opacity: interpolate(ep, [0, 1], [0.55, 0.08]),
        transform: [
          { scale: interpolate(ep, [0, 1], [0.85, 1.35]) },
          { rotateZ: "0deg" },
        ],
      };
    }
    if (secondaryEffect === "trail") {
      return {
        opacity: interpolate(ep, [0, 1], [0.18, 0.5]),
        transform: [
          { translateY: interpolate(ep, [0, 1], [4, -4]) },
          { scale: interpolate(ep, [0, 1], [0.95, 1.12]) },
          { rotateZ: "0deg" },
        ],
      };
    }
    if (secondaryEffect === "sparkle") {
      return {
        opacity: interpolate(ep, [0, 0.5, 1], [0.12, 0.78, 0.12]),
        transform: [
          { scale: interpolate(ep, [0, 0.5, 1], [0.82, 1.24, 0.82]) },
          { rotateZ: `${interpolate(ep, [0, 0.5, 1], [-15, 0, 15])}deg` },
        ],
      };
    }
    // glow
    return {
      opacity: interpolate(ep, [0, 1], [0.22, 0.65]),
      transform: [
        { scale: interpolate(ep, [0, 1], [0.92, 1.18]) },
        { rotateZ: "0deg" },
      ],
    };
  }, [spinning, secondaryEffect]);

  const shineStyle = useAnimatedStyle(() => {
    if (!spinning) {
      return { opacity: 0.25 };
    }
    const angle =
      primaryMotion === "spin"
        ? motionProgress.value * 2 * Math.PI
        : effectProgress.value * Math.PI;
    return {
      opacity: Math.max(0, Math.cos(angle - 0.5)) * 0.45,
    };
  }, [spinning, primaryMotion]);

  const particleStyle = useAnimatedStyle(() => {
    if (!spinning) {
      return {
        opacity: 0,
        transform: [{ translateY: 0 }, { scale: 0.7 }],
      };
    }
    const p = effectProgress.value;
    return {
      opacity: interpolate(p, [0, 0.5, 1], [0.25, 0.9, 0.25]),
      transform: [
        { translateY: interpolate(p, [0, 1], [2, -size * 0.12]) },
        { scale: interpolate(p, [0, 0.5, 1], [0.7, 1.15, 0.7]) },
      ],
    };
  }, [spinning, size]);

  const svgHeight = size * 1.2;
  const maxParticles = resolveActiveParticleCount(
    activeConfig,
    !spinning,
    PARTICLE_POSITIONS.length,
  );
  const particleGlyph =
    activeConfig.particles === "none"
      ? ""
      : PARTICLE_GLYPHS[activeConfig.particles];

  return (
    <View
      style={{
        width: size,
        height: svgHeight,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Efeito secundário (glow / ripple / trail / sparkle) */}
      {secondaryEffect !== "none" && spinning && (
        <Animated.View
          pointerEvents="none"
          style={[
            s.secondaryAura,
            {
              width: size * 0.86,
              height: size * 0.86,
              borderRadius: size * 0.43,
              backgroundColor:
                secondaryEffect === "ripple" ? "transparent" : effectColor,
              borderWidth: secondaryEffect === "ripple" ? 2 : 0,
              borderColor: effectColor,
            },
            secondaryEffectStyle,
          ]}
        />
      )}

      {/* Partículas temáticas */}
      {PARTICLE_POSITIONS.slice(0, maxParticles).map((pos, idx) => (
        <Animated.View
          key={idx}
          pointerEvents="none"
          style={[
            s.particleWrap,
            { top: pos.top, left: pos.left },
            particleStyle,
          ]}
        >
          <Text
            style={{
              fontSize: Math.max(8, Math.round(size * 0.14)),
              color: effectColor,
            }}
          >
            {particleGlyph}
          </Text>
        </Animated.View>
      ))}

      <Animated.View style={[{ width: size, height: svgHeight }, trophyStyle]}>
        <Svg viewBox="0 0 100 120" width={size} height={svgHeight}>
          <Defs>
            <RadialGradient id={gradientId} cx="40%" cy="35%" r="65%">
              <Stop offset="0%" stopColor={colors.light} />
              <Stop offset="100%" stopColor={colors.dark} />
            </RadialGradient>
          </Defs>

          {/* Corpo do troféu */}
          <Path
            d="M25,10 Q20,50 30,70 L70,70 Q80,50 75,10 Z"
            fill={`url(#${gradientId})`}
          />

          {/* Alça esquerda */}
          <Path
            d="M26,28 Q6,42 26,56"
            stroke={colors.mid}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
          />

          {/* Alça direita */}
          <Path
            d="M74,28 Q94,42 74,56"
            stroke={colors.mid}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
          />

          {/* Haste */}
          <Rect x="43" y="70" width="14" height="18" fill={colors.mid} />

          {/* Base */}
          <Rect x="28" y="88" width="44" height="9" rx="4" fill={colors.dark} />

          {/* Estrela central */}
          <SvgText
            x="50"
            y="52"
            textAnchor="middle"
            fontSize="26"
            fill={colors.star}
          >
            ★
          </SvgText>

          {/* Reflexo (shine estático no SVG) */}
          <Ellipse
            cx="38"
            cy="28"
            rx="9"
            ry="5"
            fill="white"
            opacity={0.25}
            transform="rotate(-25, 38, 28)"
          />
        </Svg>
      </Animated.View>

      {/* Camada de brilho animado sobreposta */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: size * 0.35,
            height: size * 0.2,
            borderRadius: size * 0.1,
            backgroundColor: "white",
            top: size * 0.12,
            left: size * 0.15,
            transform: [{ rotate: "-25deg" }],
          },
          shineStyle,
        ]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  secondaryAura: {
    position: "absolute",
  },
  particleWrap: {
    position: "absolute",
  },
});
