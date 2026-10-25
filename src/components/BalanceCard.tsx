import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { colors, spacing } from "@/src/theme";
import { TText } from "@/src/components/tamagui";

interface BalanceCardProps {
  balance: number;
}

export function BalanceCard({ balance }: BalanceCardProps) {
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(balance);

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.container}
    >
      <View style={s.header}>
        <View style={s.labelRow}>
          <Feather name="dollar-sign" size={16} color="rgba(255,255,255,0.7)" />
          <TText variant="body" fontWeight="500" color="rgba(255,255,255,0.7)">
            Saldo total
          </TText>
        </View>
        <Feather name="eye" size={18} color="rgba(255,255,255,0.6)" />
      </View>
      <TText fontWeight="700" fontSize={36} color="#FFFFFF" marginBottom={spacing.md}>
        {formatted}
      </TText>
      <View style={s.footer}>
        <View style={s.changeRow}>
          <Feather name="trending-up" size={14} color={colors.secondaryLight} />
          <TText variant="caption" fontWeight="500" color={colors.secondaryLight}>
            +2,4% este mês
          </TText>
        </View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
