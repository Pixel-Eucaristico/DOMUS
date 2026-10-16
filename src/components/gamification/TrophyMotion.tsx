import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import type {
  TrophyAnimationConfig,
  TrophyParticles,
} from "@/src/constants/trophyAnimationConfigs";

/**
 * Motor de animação dos troféus guiado por TrophyAnimationConfig.
 * - useTrophyMotion: estilo do corpo do troféu (movimento em loop + entrada)
 * - TrophyEffects: aura/brilho/ondas e partículas ao redor
 */

export function useTrophyMotion(
  config: TrophyAnimationConfig,
  size: number,
  isStatic: boolean,
) {
  const progress = useSharedValue(0);
  const entry = useSharedValue(isStatic ? 1 : 0);
  const { primaryMotion, motionSpeed, entryAnimation, entryDuration } = config;

  useEffect(() => {
    if (isStatic) {
      cancelAnimation(progress);
      progress.value = 0;
      entry.value = 1;
      return;
    }
    entry.value = 0;
    entry.value = withTiming(1, { duration: entryDuration, easing: Easing.out(Easing.cubic) });
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: motionSpeed, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [isStatic, motionSpeed, entryDuration, progress, entry]);

  const k = size / 100;

  return useAnimatedStyle(() => {
    const t = progress.value * Math.PI * 2;
    const e = entry.value;
    let translateY = 0;
    let scale = 1;
    let scaleX = 1;
    let rotate = 0;
    let rotateY = 0;
    let opacity = 1;

    switch (primaryMotion) {
      case "spin":
        scaleX = Math.cos(t);
        break;
      case "float":
        translateY = -((1 - Math.cos(t)) / 2) * 12 * k;
        break;
      case "bounce":
        translateY = -Math.abs(Math.sin(t)) * 14 * k;
        break;
      case "shake": {
        // Rajada curta de tremida e depois repouso
        const burst = progress.value < 0.3 ? Math.sin((progress.value / 0.3) * Math.PI) : 0;
        rotate = Math.sin(t * 10) * 9 * burst;
        break;
      }
      case "pulse":
        scale = 1 + 0.08 * Math.sin(t);
        break;
      case "swing":
        rotate = Math.sin(t) * 12;
        break;
    }

    switch (entryAnimation) {
      case "scale":
        scale *= interpolate(e, [0, 1], [0.6, 1]);
        opacity = interpolate(e, [0, 0.4, 1], [0, 1, 1]);
        break;
      case "fade":
        opacity = e;
        break;
      case "slide":
        translateY += (1 - e) * 30 * k;
        opacity = e;
        break;
      case "flip":
        rotateY = (1 - e) * 180;
        break;
    }

    return {
      opacity,
      transform: [
        { perspective: 800 },
        { translateY },
        { rotateY: `${rotateY}deg` },
        { rotate: `${rotate}deg` },
        { scale },
        { scaleX },
      ],
    };
  });
}

// ─── Efeitos e partículas ─────────────────────────────────────────────────

const PARTICLE_GLYPH: Record<Exclude<TrophyParticles, "none">, string> = {
  stars: "✦",
  hearts: "♥",
  fire: "🔥",
  snow: "❄",
  confetti: "■",
  coins: "●",
};

const CONFETTI_COLORS = ["#F44336", "#FFC107", "#4CAF50", "#2196F3", "#9C27B0", "#FF9800"];

/** Partículas que caem (as demais sobem) */
const FALLING: TrophyParticles[] = ["snow", "coins", "confetti"];

interface ParticleProps {
  clock: SharedValue<number>;
  index: number;
  count: number;
  kind: Exclude<TrophyParticles, "none">;
  color: string;
  size: number;
}

function Particle({ clock, index, count, kind, color, size }: ParticleProps) {
  const phase = index / count;
  // Espalha horizontalmente de forma determinística (sem Math.random → sem saltos em re-render)
  const x = ((index * 37) % 100) / 100;
  const falling = FALLING.includes(kind);
  const travel = size * 0.7;
  const glyphSize = Math.max(6, size * (kind === "fire" ? 0.11 : 0.09));

  const style = useAnimatedStyle(() => {
    const p = (clock.value + phase) % 1;
    const y = falling ? -travel / 2 + p * travel : travel / 2 - p * travel;
    return {
      opacity: interpolate(p, [0, 0.15, 0.75, 1], [0, 1, 0.8, 0]),
      transform: [
        { translateY: y },
        { translateX: Math.sin((p + phase) * Math.PI * 2) * size * 0.04 },
        { rotate: `${kind === "confetti" || kind === "coins" ? p * 360 : 0}deg` },
        { scale: interpolate(p, [0, 0.2, 1], [0.4, 1, 0.7]) },
      ],
    };
  });

  const particleColor = kind === "confetti" ? CONFETTI_COLORS[index % CONFETTI_COLORS.length]! : kind === "coins" ? "#FFC107" : color;

  return (
    <Animated.View
      pointerEvents="none"
      style={[s.particle, { left: size * (0.12 + x * 0.76) - glyphSize / 2, top: size / 2 - glyphSize / 2 }, style]}
    >
      <Text style={{ fontSize: glyphSize, color: particleColor, lineHeight: glyphSize * 1.2 }}>
        {PARTICLE_GLYPH[kind]}
      </Text>
    </Animated.View>
  );
}

interface TrophyEffectsProps {
  config: TrophyAnimationConfig;
  /** Cor base do troféu (usada quando config.effectColor não é definida) */
  color: string;
  size: number;
  isStatic: boolean;
  /** Desenhar a aura atrás do troféu (o troféu sazonal desenha a sua) */
  aura?: boolean;
}

export function TrophyEffects({ config, color, size, isStatic, aura = true }: TrophyEffectsProps) {
  const clock = useSharedValue(0);
  const pulse = useSharedValue(0.5);
  const effectColor = config.effectColor ?? color;
  const { secondaryEffect, particles, particleCount } = config;

  useEffect(() => {
    if (isStatic) {
      cancelAnimation(clock);
      cancelAnimation(pulse);
      pulse.value = 0.5;
      return;
    }
    clock.value = 0;
    clock.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1600 }), withTiming(0, { duration: 1600 })),
      -1,
    );
    return () => {
      cancelAnimation(clock);
      cancelAnimation(pulse);
    };
  }, [isStatic, clock, pulse]);

  const auraStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + pulse.value * 0.35,
    transform: [{ scale: 1 + pulse.value * 0.12 }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [0, 1], [0.6, 0]),
    transform: [{ scale: interpolate(clock.value, [0, 1], [0.7, 1.35]) }],
  }));

  const twinkleA = useAnimatedStyle(() => ({ opacity: 0.2 + pulse.value * 0.8, transform: [{ scale: 0.6 + pulse.value * 0.6 }] }));
  const twinkleB = useAnimatedStyle(() => ({ opacity: 1 - pulse.value * 0.8, transform: [{ scale: 1.2 - pulse.value * 0.6 }] }));

  const auraSize = size * 0.85;
  const showParticles = !isStatic && particles !== "none" && particleCount > 0;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.center]}>
      {aura && secondaryEffect !== "none" && (
        <Animated.View
          style={[
            s.abs,
            { width: auraSize, height: auraSize, borderRadius: auraSize / 2, backgroundColor: effectColor },
            auraStyle,
          ]}
        />
      )}

      {secondaryEffect === "ripple" && !isStatic && (
        <Animated.View
          style={[
            s.abs,
            { width: auraSize, height: auraSize, borderRadius: auraSize / 2, borderWidth: 2, borderColor: effectColor },
            rippleStyle,
          ]}
        />
      )}

      {secondaryEffect === "sparkle" && (
        <>
          <Animated.View style={[s.dot, { top: "12%", left: "20%", backgroundColor: effectColor }, twinkleA]} />
          <Animated.View style={[s.dot, { top: "28%", right: "14%", backgroundColor: effectColor }, twinkleB]} />
          <Animated.View style={[s.dot, { bottom: "18%", left: "26%", backgroundColor: effectColor }, twinkleB]} />
          <Animated.View style={[s.dot, { bottom: "26%", right: "22%", backgroundColor: effectColor }, twinkleA]} />
        </>
      )}

      {showParticles &&
        Array.from({ length: particleCount }, (_, i) => (
          <Particle
            key={i}
            clock={clock}
            index={i}
            count={particleCount}
            kind={particles as Exclude<TrophyParticles, "none">}
            color={effectColor}
            size={size}
          />
        ))}
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  abs: { position: "absolute" },
  dot: { position: "absolute", width: 6, height: 6, borderRadius: 3 },
  particle: { position: "absolute" },
});
