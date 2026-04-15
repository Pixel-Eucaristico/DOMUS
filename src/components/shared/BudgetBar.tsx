import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { soundManager } from "@/src/services/SoundManager";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { TText } from "@/src/components/tamagui";

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
        <TText variant="label" color={theme.textColor} flex={1}>{label}</TText>
        <TText variant="label" fontWeight="600" color={theme.textColor}>
          {percent}% <TText variant="caption" color={theme.secondaryText}>(meta {ideal}%)</TText>
        </TText>
      </View>
      <View style={[s.budgetBarBg, { backgroundColor: theme.border }]}>
        <View
          style={[
            s.budgetBarFill,
            { width: `${barWidth}%`, backgroundColor: color },
          ]}
        />
      </View>
      <View style={s.budgetFooter}>
        <TText variant="caption" fontWeight="600" color={theme.textColor}>{formatCurrency(amount)}</TText>
        <TText variant="caption" color={theme.secondaryText}>Meta: {formatCurrency(idealAmount)}</TText>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  budgetRow: { gap: 4 },
  budgetLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  budgetDot: { width: 8, height: 8, borderRadius: 4 },
  budgetBarBg: { height: 6, borderRadius: 3 },
  budgetBarFill: { height: 6, borderRadius: 3, minWidth: 2 },
  budgetFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
