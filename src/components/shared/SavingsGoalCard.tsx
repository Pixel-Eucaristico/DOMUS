import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { soundManager } from "@/src/services/SoundManager";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { useResponsive } from "@/src/ui/layout/useResponsive";

interface SavingsGoalCardProps {
  savingsGoalAccounts: any[];
  savingsContributed: Record<string, number>;
  theme: any;
}

export function SavingsGoalCard({ savingsGoalAccounts, savingsContributed, theme }: SavingsGoalCardProps) {
  const router = useRouter();
  const { isMobile } = useResponsive();

  if (savingsGoalAccounts.length === 0) return null;

  return (
    <Pressable
      style={[s.card, { backgroundColor: theme.cardBackground, marginHorizontal: 0, width: "100%" }]}
      onPress={() => {
        soundManager.play("tap");
        router.push("/(tabs)/accounts");
      }}
    >
      <View style={s.cardHeader}>
        <View style={s.titleRow}>
          <Feather name="target" size={15} color={theme.success} />
          <Text style={[s.cardTitle, { color: theme.textColor }]}>Metas de poupança</Text>
        </View>
        <Feather name="chevron-right" size={16} color={theme.secondaryText} />
      </View>
      {savingsGoalAccounts.map((acc) => {
        const target = acc.savingsContributionAmount ?? 0;
        const contributed = savingsContributed[acc.id] ?? 0;
        const pct = target > 0 ? Math.min((contributed / target) * 100, 100) : 0;
        const pctLabel = target > 0 ? `${Math.round(pct)}%` : "—";
        const barColor = pct >= 100 ? theme.success : pct >= 50 ? "#F59E0B" : theme.danger;
        return (
          <View key={acc.id} style={[s.savingsGoalRow, { borderTopColor: theme.border }]}>
            <View style={s.savingsGoalInfo}>
              <Text style={[s.savingsGoalName, { color: theme.textColor }]} numberOfLines={1}>
                {acc.name}
              </Text>
              <Text style={[s.savingsGoalAmt, { color: theme.secondaryText }]}>
                {formatCurrency(contributed)}{target > 0 ? ` / ${formatCurrency(target)}` : ""}
              </Text>
            </View>
            <Text style={[s.savingsGoalPct, { color: pct >= 100 ? theme.success : theme.textColor }]}>
              {pctLabel}
            </Text>
            <View style={[s.savingsGoalBarWrap, { backgroundColor: theme.border }]}>
              <View style={[s.savingsGoalBarFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
            </View>
          </View>
        );
      })}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 16 },
  savingsGoalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "transparent",
  },
  savingsGoalInfo: {
    flex: 1,
    minWidth: 0,
  },
  savingsGoalName: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  savingsGoalAmt: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  savingsGoalPct: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    width: 36,
    textAlign: "right",
  },
  savingsGoalBarWrap: {
    height: 6,
    borderRadius: 3,
    width: 60,
    overflow: "hidden",
  },
  savingsGoalBarFill: {
    height: 6,
    borderRadius: 3,
    minWidth: 2,
  },
});
