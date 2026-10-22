import React, { useRef, useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import LottieView from "lottie-react-native";
import { configureLottieWasm } from "./lottieWasm";
import { StaticLottieWeb } from "./StaticLottieWeb";
import { AnimatedTrophy } from "./AnimatedTrophy";
import { AnimatedSeasonalTrophy } from "./AnimatedSeasonalTrophy";
import type { AchievementRarity } from "@packages/gamification/src/achievements";
import { APPROVED_LOTTIE } from "./approvedLottie";
import {
  lottieTierKey,
  lottieSourceKey,
  resolveLottieSource,
  staticLottieFrame,
  type TrophyTier,
} from "./lottieTierSelection";

configureLottieWasm();

interface Props {
  trophyId: string;
  type: "achievement" | "seasonal" | "liturgical" | "monthly";
  size?: number;
  /** Conquistas: a raridade escolhe o nível (t1..t4). */
  rarity?: AchievementRarity;
  /**
   * Sazonais e litúrgicos: nível conquistado (1 = bronze, 2 = prata,
   * 3 = ouro). Sem nível → bronze.
   */
  tier?: TrophyTier;
  icon?: string;
  color?: string;
  isLiturgical?: boolean;
  isStatic?: boolean;
  /** Callback ao tocar no troféu */
  onPress?: () => void;
}

/**
 * Renderiza Lottie se a animação está aprovada (APPROVED_LOTTIE, em
 * approvedLottie.ts), senão faz fallback para o SVG animado atual. O JSON já
 * está no pacote; o getter do registro só adia a avaliação do módulo até o
 * troféu ser mostrado. Se o getter lança ou a animação falha
 * (`onAnimationFailure`), volta para o SVG (resolveLottieSource).
 */
export function LottieTrophy({
  trophyId,
  type,
  size = 64,
  rarity = "gold",
  tier,
  icon,
  color,
  isLiturgical = false,
  isStatic = false,
  onPress,
}: Props) {
  const lottieRef = useRef<LottieView>(null);
  const tierKey = lottieTierKey(type, { rarity, tier });
  const sourceKey = lottieSourceKey(trophyId, tierKey);
  // Falhas guardadas por arquivo (id + nível): trocar de nível (ex.: DebugTools)
  // tenta o outro arquivo; voltar ao que falhou continua no SVG.
  const [failedKeys, setFailedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const markFailed = useCallback(() => {
    setFailedKeys((prev) => (prev.has(sourceKey) ? prev : new Set(prev).add(sourceKey)));
  }, [sourceKey]);

  const source: any = resolveLottieSource(APPROVED_LOTTIE, trophyId, tierKey, failedKeys);

  // Estático: mostrar o quadro final (o quadro 0 dos gerados é vazio).
  // - nativo: `LottieView` com `progress={1}` e autoPlay desligado;
  // - web: `progress` não é suportado e `play(n, n)` recomeça do quadro 0,
  //   então o StaticLottieWeb usa o dotLottie direto com `setFrame`.
  const isWeb = Platform.OS === "web";

  if (source) {
    const lottieSize = size * 1.45; // Canvas has ~30% empty padding, compensate
    const lottieView = (
      <View style={[s.container, { width: size, height: size }]}>
        {isStatic && isWeb ? (
          <StaticLottieWeb
            key={sourceKey}
            source={source}
            frame={staticLottieFrame(source)}
            size={lottieSize}
            onFailure={markFailed}
          />
        ) : (
          <LottieView
            key={sourceKey}
            ref={lottieRef}
            source={source}
            style={{ width: lottieSize, height: lottieSize }}
            autoPlay={!isStatic}
            loop={!isStatic}
            speed={1}
            {...(isStatic ? { progress: 1 } : null)}
            onAnimationFailure={markFailed}
          />
        )}
      </View>
    );

    if (onPress) {
      return (
        <Pressable
          onPress={() => {
            lottieRef.current?.play();
            onPress();
          }}
        >
          {lottieView}
        </Pressable>
      );
    }

    return lottieView;
  }

  // Fallback: SVG animado existente
  if (type === "achievement") {
    return <AnimatedTrophy rarity={rarity} size={Math.round(size * 0.75) + 2} spinning={!isStatic} />;
  }

  return (
    <AnimatedSeasonalTrophy
      icon={icon}
      id={trophyId}
      size={size}
      color={color}
      isLiturgical={isLiturgical || type === "liturgical"}
      isStatic={isStatic}
    />
  );
}

const s = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
});
