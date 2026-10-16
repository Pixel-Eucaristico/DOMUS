import React, { useEffect } from "react";
import { View } from "react-native";
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
  withTiming,
  Easing,
} from "react-native-reanimated";
import type { AchievementRarity } from "@packages/gamification/src/achievements";
import {
  getTrophyAnimationConfig,
  type TrophyAnimationConfig,
} from "@/src/constants/trophyAnimationConfigs";
import { TrophyEffects, useTrophyMotion } from "./TrophyMotion";

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

/** Comportamento original (giro contínuo) para quando não há trophyId/config */
const LEGACY_CONFIG: TrophyAnimationConfig = {
  primaryMotion: "spin",
  motionSpeed: 3500,
  secondaryEffect: "none",
  entryAnimation: "fade",
  entryDuration: 1,
  particles: "none",
  particleCount: 0,
};

interface Props {
  rarity: AchievementRarity;
  size?: number;
  spinning?: boolean;
  /** ID do troféu — seleciona a animação individual em trophyAnimationConfigs */
  trophyId?: string;
  /** Configuração explícita (tem prioridade sobre trophyId) */
  config?: TrophyAnimationConfig;
}

export function AnimatedTrophy({ rarity, size = 64, spinning = true, trophyId, config: configProp }: Props) {
  const rotation = useSharedValue(0);
  const colors = RARITY_COLORS[rarity];
  const gradientId = `grad_${rarity}`;
  const config = configProp ?? (trophyId ? getTrophyAnimationConfig(trophyId) : LEGACY_CONFIG);
  const isSpin = config.primaryMotion === "spin";
  const motionStyle = useTrophyMotion(config, size, !spinning);

  useEffect(() => {
    // Rotação usada apenas pelo reflexo animado no movimento "spin"
    if (spinning && isSpin) {
      rotation.value = withRepeat(
        withTiming(2 * Math.PI, { duration: config.motionSpeed, easing: Easing.linear }),
        -1,
      );
    } else {
      rotation.value = 0;
    }
  }, [spinning, isSpin, config.motionSpeed, rotation]);

  const shineStyle = useAnimatedStyle(() => ({
    opacity: isSpin ? Math.max(0, Math.cos(rotation.value - 0.5)) * 0.5 : 0,
  }));

  const svgHeight = size * 1.2;

  return (
    <View style={{ width: size, height: svgHeight, alignItems: "center", justifyContent: "center" }}>
      {/* Em listas estáticas (grades de conquistas) o troféu aparece sem efeitos, como antes */}
      {spinning && <TrophyEffects config={config} color={colors.mid} size={size} isStatic={false} />}
      <Animated.View style={[{ width: size, height: svgHeight }, motionStyle]}>
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
