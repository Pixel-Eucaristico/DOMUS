import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { soundManager } from "@/src/services/SoundManager";
import { formatCurrency } from "@/src/utils/formatCurrency";

interface BudgetBarProps {
  label: string;
  percent: number;
  ideal: number;
  idealAmount: number;
  color: string;
  amount: number;
  group: "needs" | "wants" | "savings";
  theme: any;
  onPress?: (group: string) => void;
}

export function BudgetBar({
  label,
  percent,
  ideal,
  idealAmount,
  color,
  amount,
  group,
  theme,
  onPress,
}: BudgetBarProps) {
  const barWidth = Math.min(percent, 100);
  return (
    <Pressable
      onPress={() => {
        soundManager.play("tap");
        onPress?.(group);
      }}
      style={({ pressed }) => [
        s.budgetRow,
        pressed && { opacity: 0.7 }
      ]}
    >
      <View style={s.budgetLabelRow}>
        <View style={[s.budgetDot, { backgroundColor: color }]} />
        <Text style={[s.budgetLabel, { color: theme.textColor }]}>{label}</Text>
        <Text style={[s.budgetPercent, { color: theme.textColor }]}>
          {percent}% <Text style={[s.budgetIdeal, { color: theme.secondaryText }]}>(meta {ideal}%)</Text>
        </Text>
      </View>
      <View style={[s.budgetBarBg, { backgroundColor: theme.border }]}>
        <View
          style={[
            s.budgetBarFill,
            { width: `${barWidth}%` as any, backgroundColor: color },
          ]}
        />
      </View>
      <View style={s.budgetFooter}>
        <Text style={[s.budgetAmount, { color: theme.textColor }]}>{formatCurrency(amount)}</Text>
        <Text style={[s.budgetIdealValue, { color: theme.secondaryText }]}>Meta: {formatCurrency(idealAmount)}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  budgetRow: { gap: 4 },
  budgetLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  budgetDot: { width: 8, height: 8, borderRadius: 4 },
  budgetLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, flex: 1 },
  budgetPercent: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  budgetIdeal: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  budgetBarBg: { height: 6, borderRadius: 3 },
  budgetBarFill: { height: 6, borderRadius: 3, minWidth: 2 },
  budgetFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  budgetAmount: { fontFamily: "DMSans_600SemiBold", fontSize: 12 },
  budgetIdealValue: { fontFamily: "DMSans_400Regular", fontSize: 11 },
});
