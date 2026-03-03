import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { TokenTracker } from "@/src/modules/ai/application/TokenTracker";
import { DAILY_TOKEN_BUDGET } from "@/src/modules/ai/domain/AISettings";
import type { DailyTokenUsage } from "@packages/ai";

export function AIUsageDashboard() {
  const { theme } = useAppState();
  const [usage, setUsage] = useState<DailyTokenUsage | null>(null);

  useEffect(() => {
    let mounted = true;
    TokenTracker.getToday().then((u) => {
      if (mounted) setUsage(u);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!usage) return null;

  const pct = Math.min(100, (usage.totalTokens / DAILY_TOKEN_BUDGET) * 100);
  const isOver = usage.totalTokens >= DAILY_TOKEN_BUDGET;

  const barColor = isOver
    ? theme.danger
    : pct > 75
      ? theme.warning
      : theme.success;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
    >
      <View style={styles.header}>
        <Feather name="cpu" size={14} color={theme.secondaryText} />
        <Text style={[styles.title, { color: theme.secondaryText }]}>
          Uso diário de tokens
        </Text>
        <Text style={[styles.value, { color: isOver ? theme.danger : theme.textColor }]}>
          {usage.totalTokens.toLocaleString("pt-BR")} / {DAILY_TOKEN_BUDGET.toLocaleString("pt-BR")}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View
          style={[styles.fill, { width: `${pct}%` as `${number}%`, backgroundColor: barColor }]}
        />
      </View>

      {/* Per-provider breakdown */}
      {Object.entries(usage.byProvider).length > 0 && (
        <View style={styles.breakdown}>
          {Object.entries(usage.byProvider).map(([provider, tokens]) => (
            <Text
              key={provider}
              style={[styles.breakdownItem, { color: theme.secondaryText }]}
            >
              {provider}: {(tokens ?? 0).toLocaleString("pt-BR")}
            </Text>
          ))}
        </View>
      )}

      {isOver && (
        <Text style={[styles.overBudget, { color: theme.danger }]}>
          Limite diário atingido. Retomará amanhã.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 13,
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  breakdown: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  breakdownItem: {
    fontSize: 12,
  },
  overBudget: {
    fontSize: 12,
    fontWeight: "600",
  },
});
