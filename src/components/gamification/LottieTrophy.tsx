import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import LottieView from "lottie-react-native";
import { AnimatedTrophy } from "./AnimatedTrophy";
import { AnimatedSeasonalTrophy } from "./AnimatedSeasonalTrophy";
import type { AchievementRarity } from "@packages/gamification/src/achievements";

/**
 * Mapa de troféus com Lottie aprovados.
 * Chave = trophyId, valor = require() do JSON.
 * Atualizar conforme cada animação é aprovada.
 */
/**
 * Troféus aprovados com variantes por tier.
 * base = fallback, t1-t4 = Bronze/Prata/Ouro/Diamante.
 */
const APPROVED_LOTTIE: Record<string, {
  base: any;
  t1?: any;
  t2?: any;
  t3?: any;
  t4?: any;
}> = {
  "first_transaction": {
    base: require("@/assets/lottie/trophies/first_transaction.json"),
    t1: require("@/assets/lottie/trophies/first_transaction_t1.json"),
    t2: require("@/assets/lottie/trophies/first_transaction_t2.json"),
    t3: require("@/assets/lottie/trophies/first_transaction_t3.json"),
    t4: require("@/assets/lottie/trophies/first_transaction_t4.json"),
  },
  "ten_transactions": {
    base: require("@/assets/lottie/trophies/ten_transactions.json"),
    t1: require("@/assets/lottie/trophies/ten_transactions_t1.json"),
    t2: require("@/assets/lottie/trophies/ten_transactions_t2.json"),
    t3: require("@/assets/lottie/trophies/ten_transactions_t3.json"),
    t4: require("@/assets/lottie/trophies/ten_transactions_t4.json"),
  },
  "streak_7": {
    base: require("@/assets/lottie/trophies/streak_7.json"),
    t1: require("@/assets/lottie/trophies/streak_7_t1.json"),
    t2: require("@/assets/lottie/trophies/streak_7_t2.json"),
    t3: require("@/assets/lottie/trophies/streak_7_t3.json"),
    t4: require("@/assets/lottie/trophies/streak_7_t4.json"),
  },
  "streak_30": {
    base: require("@/assets/lottie/trophies/streak_30.json"),
    t1: require("@/assets/lottie/trophies/streak_30_t1.json"),
    t2: require("@/assets/lottie/trophies/streak_30_t2.json"),
    t3: require("@/assets/lottie/trophies/streak_30_t3.json"),
    t4: require("@/assets/lottie/trophies/streak_30_t4.json"),
  },
  "budget_ok": {
    base: require("@/assets/lottie/trophies/budget_ok.json"),
    t1: require("@/assets/lottie/trophies/budget_ok_t1.json"),
    t2: require("@/assets/lottie/trophies/budget_ok_t2.json"),
    t3: require("@/assets/lottie/trophies/budget_ok_t3.json"),
    t4: require("@/assets/lottie/trophies/budget_ok_t4.json"),
  },
  "level_5": {
    base: require("@/assets/lottie/trophies/level_5.json"),
    t1: require("@/assets/lottie/trophies/level_5_t1.json"),
    t2: require("@/assets/lottie/trophies/level_5_t2.json"),
    t3: require("@/assets/lottie/trophies/level_5_t3.json"),
    t4: require("@/assets/lottie/trophies/level_5_t4.json"),
  },
  "first_dizimo": {
    base: require("@/assets/lottie/trophies/first_dizimo.json"),
    t1: require("@/assets/lottie/trophies/first_dizimo_t1.json"),
    t2: require("@/assets/lottie/trophies/first_dizimo_t2.json"),
    t3: require("@/assets/lottie/trophies/first_dizimo_t3.json"),
    t4: require("@/assets/lottie/trophies/first_dizimo_t4.json"),
  },
  "level_10": {
    base: require("@/assets/lottie/trophies/level_10.json"),
    t1: require("@/assets/lottie/trophies/level_10_t1.json"),
    t2: require("@/assets/lottie/trophies/level_10_t2.json"),
    t3: require("@/assets/lottie/trophies/level_10_t3.json"),
    t4: require("@/assets/lottie/trophies/level_10_t4.json"),
  },
  "tx_50": {
    base: require("@/assets/lottie/trophies/tx_50.json"),
    t1: require("@/assets/lottie/trophies/tx_50_t1.json"),
    t2: require("@/assets/lottie/trophies/tx_50_t2.json"),
    t3: require("@/assets/lottie/trophies/tx_50_t3.json"),
    t4: require("@/assets/lottie/trophies/tx_50_t4.json"),
  },
  "tx_100": {
    base: require("@/assets/lottie/trophies/tx_100.json"),
    t1: require("@/assets/lottie/trophies/tx_100_t1.json"),
    t2: require("@/assets/lottie/trophies/tx_100_t2.json"),
    t3: require("@/assets/lottie/trophies/tx_100_t3.json"),
    t4: require("@/assets/lottie/trophies/tx_100_t4.json"),
  },
  "tx_500": {
    base: require("@/assets/lottie/trophies/tx_500.json"),
    t1: require("@/assets/lottie/trophies/tx_500_t1.json"),
    t2: require("@/assets/lottie/trophies/tx_500_t2.json"),
    t3: require("@/assets/lottie/trophies/tx_500_t3.json"),
    t4: require("@/assets/lottie/trophies/tx_500_t4.json"),
  },
  "streak_3": {
    base: require("@/assets/lottie/trophies/streak_3.json"),
    t1: require("@/assets/lottie/trophies/streak_3_t1.json"),
    t2: require("@/assets/lottie/trophies/streak_3_t2.json"),
    t3: require("@/assets/lottie/trophies/streak_3_t3.json"),
    t4: require("@/assets/lottie/trophies/streak_3_t4.json"),
  },
  "streak_14": {
    base: require("@/assets/lottie/trophies/streak_14.json"),
    t1: require("@/assets/lottie/trophies/streak_14_t1.json"),
    t2: require("@/assets/lottie/trophies/streak_14_t2.json"),
    t3: require("@/assets/lottie/trophies/streak_14_t3.json"),
    t4: require("@/assets/lottie/trophies/streak_14_t4.json"),
  },
  "streak_90": {
    base: require("@/assets/lottie/trophies/streak_90.json"),
    t1: require("@/assets/lottie/trophies/streak_90_t1.json"),
    t2: require("@/assets/lottie/trophies/streak_90_t2.json"),
    t3: require("@/assets/lottie/trophies/streak_90_t3.json"),
    t4: require("@/assets/lottie/trophies/streak_90_t4.json"),
  },
  "streak_365": {
    base: require("@/assets/lottie/trophies/streak_365.json"),
    t1: require("@/assets/lottie/trophies/streak_365_t1.json"),
    t2: require("@/assets/lottie/trophies/streak_365_t2.json"),
    t3: require("@/assets/lottie/trophies/streak_365_t3.json"),
    t4: require("@/assets/lottie/trophies/streak_365_t4.json"),
  },
  "budget_3mo": {
    base: require("@/assets/lottie/trophies/budget_3mo.json"),
    t1: require("@/assets/lottie/trophies/budget_3mo_t1.json"),
    t2: require("@/assets/lottie/trophies/budget_3mo_t2.json"),
    t3: require("@/assets/lottie/trophies/budget_3mo_t3.json"),
    t4: require("@/assets/lottie/trophies/budget_3mo_t4.json"),
  },
  "budget_6mo": {
    base: require("@/assets/lottie/trophies/budget_6mo.json"),
    t1: require("@/assets/lottie/trophies/budget_6mo_t1.json"),
    t2: require("@/assets/lottie/trophies/budget_6mo_t2.json"),
    t3: require("@/assets/lottie/trophies/budget_6mo_t3.json"),
    t4: require("@/assets/lottie/trophies/budget_6mo_t4.json"),
  },
  "budget_12mo": {
    base: require("@/assets/lottie/trophies/budget_12mo.json"),
    t1: require("@/assets/lottie/trophies/budget_12mo_t1.json"),
    t2: require("@/assets/lottie/trophies/budget_12mo_t2.json"),
    t3: require("@/assets/lottie/trophies/budget_12mo_t3.json"),
    t4: require("@/assets/lottie/trophies/budget_12mo_t4.json"),
  },
  "savings_1mo": {
    base: require("@/assets/lottie/trophies/savings_1mo.json"),
    t1: require("@/assets/lottie/trophies/savings_1mo_t1.json"),
    t2: require("@/assets/lottie/trophies/savings_1mo_t2.json"),
    t3: require("@/assets/lottie/trophies/savings_1mo_t3.json"),
    t4: require("@/assets/lottie/trophies/savings_1mo_t4.json"),
  },
  "savings_3mo": {
    base: require("@/assets/lottie/trophies/savings_3mo.json"),
    t1: require("@/assets/lottie/trophies/savings_3mo_t1.json"),
    t2: require("@/assets/lottie/trophies/savings_3mo_t2.json"),
    t3: require("@/assets/lottie/trophies/savings_3mo_t3.json"),
    t4: require("@/assets/lottie/trophies/savings_3mo_t4.json"),
  },
  "savings_elite": {
    base: require("@/assets/lottie/trophies/savings_elite.json"),
    t1: require("@/assets/lottie/trophies/savings_elite_t1.json"),
    t2: require("@/assets/lottie/trophies/savings_elite_t2.json"),
    t3: require("@/assets/lottie/trophies/savings_elite_t3.json"),
    t4: require("@/assets/lottie/trophies/savings_elite_t4.json"),
  },
  "wants_1mo": {
    base: require("@/assets/lottie/trophies/wants_1mo.json"),
    t1: require("@/assets/lottie/trophies/wants_1mo_t1.json"),
    t2: require("@/assets/lottie/trophies/wants_1mo_t2.json"),
    t3: require("@/assets/lottie/trophies/wants_1mo_t3.json"),
    t4: require("@/assets/lottie/trophies/wants_1mo_t4.json"),
  },
  "wants_3mo": {
    base: require("@/assets/lottie/trophies/wants_3mo.json"),
    t1: require("@/assets/lottie/trophies/wants_3mo_t1.json"),
    t2: require("@/assets/lottie/trophies/wants_3mo_t2.json"),
    t3: require("@/assets/lottie/trophies/wants_3mo_t3.json"),
    t4: require("@/assets/lottie/trophies/wants_3mo_t4.json"),
  },
  "five_categories_month": {
    base: require("@/assets/lottie/trophies/five_categories_month.json"),
    t1: require("@/assets/lottie/trophies/five_categories_month_t1.json"),
    t2: require("@/assets/lottie/trophies/five_categories_month_t2.json"),
    t3: require("@/assets/lottie/trophies/five_categories_month_t3.json"),
    t4: require("@/assets/lottie/trophies/five_categories_month_t4.json"),
  },
  "level_20": {
    base: require("@/assets/lottie/trophies/level_20.json"),
    t1: require("@/assets/lottie/trophies/level_20_t1.json"),
    t2: require("@/assets/lottie/trophies/level_20_t2.json"),
    t3: require("@/assets/lottie/trophies/level_20_t3.json"),
    t4: require("@/assets/lottie/trophies/level_20_t4.json"),
  },
  "level_50": {
    base: require("@/assets/lottie/trophies/level_50.json"),
    t1: require("@/assets/lottie/trophies/level_50_t1.json"),
    t2: require("@/assets/lottie/trophies/level_50_t2.json"),
    t3: require("@/assets/lottie/trophies/level_50_t3.json"),
    t4: require("@/assets/lottie/trophies/level_50_t4.json"),
  },
  "first_income": {
    base: require("@/assets/lottie/trophies/first_income.json"),
    t1: require("@/assets/lottie/trophies/first_income_t1.json"),
    t2: require("@/assets/lottie/trophies/first_income_t2.json"),
    t3: require("@/assets/lottie/trophies/first_income_t3.json"),
    t4: require("@/assets/lottie/trophies/first_income_t4.json"),
  },
};

const RARITY_TO_TIER: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 4,
};

interface Props {
  trophyId: string;
  type: "achievement" | "seasonal" | "liturgical" | "monthly";
  size?: number;
  rarity?: AchievementRarity;
  icon?: string;
  color?: string;
  isLiturgical?: boolean;
  isStatic?: boolean;
  /** Callback ao tocar no troféu */
  onPress?: () => void;
}

/**
 * Renderiza Lottie se a animação está aprovada,
 * senão faz fallback para o SVG animado atual.
 *
 * Fluxo: criar .json no LottieFiles/SVGator/Recraft → aprovar →
 * adicionar em APPROVED_LOTTIE → LottieTrophy detecta automaticamente.
 */
export function LottieTrophy({
  trophyId,
  type,
  size = 64,
  rarity = "gold",
  icon,
  color,
  isLiturgical = false,
  isStatic = false,
  onPress,
}: Props) {
  const lottieRef = useRef<LottieView>(null);
  const [lottieError, setLottieError] = useState(false);

  // When static, jump to last frame after mount
  useEffect(() => {
    if (isStatic && lottieRef.current) {
      // Play to end then stop — shows all elements visible
      lottieRef.current.play(89, 89);
    }
  }, [isStatic]);

  const entry = APPROVED_LOTTIE[trophyId];
  const tier = RARITY_TO_TIER[rarity] ?? 3;
  const tierKey = `t${tier}` as "t1" | "t2" | "t3" | "t4";
  const source = entry ? (entry[tierKey] ?? entry.base) : undefined;

  if (source && !lottieError) {
    const lottieSize = size * 1.45; // Canvas has ~30% empty padding, compensate
    const lottieView = (
      <View style={[s.container, { width: size, height: size }]}>
        <LottieView
          ref={lottieRef}
          source={source}
          style={{ width: lottieSize, height: lottieSize }}
          autoPlay={!isStatic}
          loop={!isStatic}
          speed={1}
          onAnimationFailure={() => setLottieError(true)}
        />
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
      isLiturgical={isLiturgical}
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
