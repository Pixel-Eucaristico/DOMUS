import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { colors, spacing } from "@/src/theme";

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
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Feather name="dollar-sign" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.label}>Saldo total</Text>
        </View>
        <Feather name="eye" size={18} color="rgba(255,255,255,0.6)" />
      </View>
      <Text style={styles.balance}>{formatted}</Text>
      <View style={styles.footer}>
        <View style={styles.changeRow}>
          <Feather name="trending-up" size={14} color={colors.secondaryLight} />
          <Text style={styles.changeText}>+2,4% este mes</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  balance: {
    fontFamily: "DMSans_700Bold",
    fontSize: 36,
    color: "#FFFFFF",
    marginBottom: spacing.md,
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
  changeText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: colors.secondaryLight,
  },
});
