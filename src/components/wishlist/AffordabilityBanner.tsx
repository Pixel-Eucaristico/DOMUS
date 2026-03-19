import React from "react";
import { View, StyleSheet } from "react-native";
import type { ThemeColors } from "@packages/theme";
import { TCard, TText } from "@/src/components/tamagui";

interface Props {
  availableAmount: number;
  affordableCount: number;
  theme: ThemeColors;
}

export function AffordabilityBanner({
  availableAmount,
  affordableCount,
  theme,
}: Props) {
  const isPositive = availableAmount >= 0;

  return (
    <TCard
      compact
      marginHorizontal={16}
      marginVertical={8}
      borderRadius={12}
      borderWidth={0}
      backgroundColor={isPositive ? theme.cardBackground : "#FEF2F2"}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <TText variant="caption" secondary marginBottom={2}>
            Disponível este mês
          </TText>
          <TText
            variant="title"
            fontSize={20}
            color={isPositive ? theme.success ?? "#16A34A" : "#DC2626"}
          >
            {isPositive ? "" : "-"}R${" "}
            {Math.abs(availableAmount).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </TText>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.primaryColor + "20" }]}>
          <TText variant="caption" color={theme.primaryColor} fontWeight="600">
            {affordableCount} {affordableCount === 1 ? "item" : "itens"}{" "}
            possíveis
          </TText>
        </View>
      </View>
    </TCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flex: 1 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
