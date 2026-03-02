import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ThemeColors } from "@packages/theme";

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
    <View
      style={[
        styles.container,
        { backgroundColor: isPositive ? theme.cardBackground : "#FEF2F2" },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={[styles.label, { color: theme.secondaryText }]}>
            Disponível este mês
          </Text>
          <Text
            style={[
              styles.amount,
              { color: isPositive ? theme.success ?? "#16A34A" : "#DC2626" },
            ]}
          >
            {isPositive ? "" : "-"}R${" "}
            {Math.abs(availableAmount).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.primaryColor + "20" }]}>
          <Text style={[styles.badgeText, { color: theme.primaryColor }]}>
            {affordableCount} {affordableCount === 1 ? "item" : "itens"}{" "}
            possíveis
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flex: 1 },
  label: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    marginBottom: 2,
  },
  amount: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
});
