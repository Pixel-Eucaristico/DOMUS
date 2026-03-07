import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppState } from "@/src/context/AppStateProvider";
import { TokenTracker } from "@/src/modules/ai/application/TokenTracker";
import { DAILY_TOKEN_BUDGET } from "@/src/modules/ai/domain/AISettings";
import type { DailyTokenUsage } from "@packages/ai";

interface AIUsageBarProps {
  /** Triggers a refresh when this value changes (e.g. messages.length) */
  refreshKey?: number;
}

/**
 * Compact token usage bar for the chat screen.
 * Shows current usage and auto-refreshes when refreshKey changes.
 */
export function AIUsageBar({ refreshKey }: AIUsageBarProps) {
  const { theme } = useAppState();
  const [usage, setUsage] = useState<DailyTokenUsage | null>(null);

  const refresh = useCallback(() => {
    TokenTracker.getToday().then(setUsage);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  if (!usage || usage.totalTokens === 0) return null;

  const pct = Math.min(100, (usage.totalTokens / DAILY_TOKEN_BUDGET) * 100);
  const isOver = usage.totalTokens >= DAILY_TOKEN_BUDGET;

  const barColor = isOver
    ? theme.danger
    : pct > 75
      ? theme.warning
      : theme.success;

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.secondaryText }]}>
          Tokens: {usage.totalTokens.toLocaleString("pt-BR")} / {DAILY_TOKEN_BUDGET.toLocaleString("pt-BR")}
        </Text>
        <Text style={[styles.pct, { color: barColor }]}>
          {Math.round(pct)}%
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View
          style={[styles.fill, { width: `${pct}%` as `${number}%`, backgroundColor: barColor }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 11,
  },
  pct: {
    fontSize: 11,
    fontWeight: "600",
  },
  track: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
});
