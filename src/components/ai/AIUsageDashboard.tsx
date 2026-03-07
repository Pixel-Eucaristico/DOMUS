import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { TokenTracker } from "@/src/modules/ai/application/TokenTracker";
import { DAILY_TOKEN_BUDGET, PROVIDER_THEME } from "@/src/modules/ai/domain/AISettings";
import type { AIProvider, DailyTokenUsage } from "@packages/ai";

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

  const providers = Object.entries(usage.byProvider).filter(
    ([, tokens]) => (tokens ?? 0) > 0,
  ) as Array<[AIProvider, number]>;

  if (providers.length === 0 && usage.totalTokens === 0) return null;

  // Check if any provider is over budget
  const anyOver = providers.some(
    ([p, tokens]) => tokens >= DAILY_TOKEN_BUDGET[p],
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
    >
      <View style={styles.header}>
        <MaterialCommunityIcons name="robot-happy" size={14} color={theme.secondaryText} />
        <Text style={[styles.title, { color: theme.secondaryText }]}>
          Uso diario de tokens
        </Text>
      </View>

      {/* Per-provider bars */}
      {providers.map(([provider, tokens]) => {
        const budget = DAILY_TOKEN_BUDGET[provider];
        const pTheme = PROVIDER_THEME[provider];
        const pct = Math.min(100, (tokens / budget) * 100);
        const isOver = tokens >= budget;

        const barColor = isOver
          ? theme.danger
          : pct > 80
            ? theme.warning
            : pTheme.color;

        return (
          <View key={provider} style={styles.providerSection}>
            <View style={styles.providerHeader}>
              <MaterialCommunityIcons
                name={pTheme.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={12}
                color={pTheme.color}
              />
              <Text style={[styles.providerName, { color: theme.textColor }]}>
                {provider}
              </Text>
              <Text style={[styles.providerValue, { color: isOver ? theme.danger : theme.secondaryText }]}>
                {tokens.toLocaleString("pt-BR")} / {budget.toLocaleString("pt-BR")}
              </Text>
              <Text style={[styles.providerPct, { color: barColor }]}>
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
      })}

      {anyOver && (
        <Text style={[styles.overBudget, { color: theme.danger }]}>
          Limite diario atingido em um ou mais provedores.
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
  providerSection: {
    gap: 4,
  },
  providerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  providerName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  providerValue: {
    fontSize: 11,
  },
  providerPct: {
    fontSize: 11,
    fontWeight: "600",
    minWidth: 30,
    textAlign: "right",
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
  overBudget: {
    fontSize: 12,
    fontWeight: "600",
  },
});
