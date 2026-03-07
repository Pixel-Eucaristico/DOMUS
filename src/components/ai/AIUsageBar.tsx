import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { TokenTracker } from "@/src/modules/ai/application/TokenTracker";
import { TokenPricingService } from "@/src/modules/ai/infrastructure/TokenPricingService";
import { getProviderBudget, isUnlimitedBudget, PROVIDER_THEME } from "@/src/modules/ai/domain/AISettings";
import type { AIProvider, AIModelTier, DailyTokenUsage } from "@packages/ai";

interface AIUsageBarProps {
  provider: AIProvider;
  modelTier?: AIModelTier;
  customBudgets?: Partial<Record<AIProvider, number>>;
  refreshKey?: number;
}

export function AIUsageBar({
  provider,
  modelTier = "fast",
  customBudgets,
  refreshKey,
}: AIUsageBarProps) {
  const { theme } = useAppState();
  const [usage, setUsage] = useState<DailyTokenUsage | null>(null);
  const [costBrl, setCostBrl] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const u = await TokenTracker.getToday();
    setUsage(u);
    const tokens = u.byProvider[provider] ?? 0;
    if (tokens > 0) {
      const est = await TokenPricingService.estimateCost(provider, modelTier, tokens);
      setCostBrl(est.costBrl);
    } else {
      setCostBrl(null);
    }
  }, [provider, modelTier]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  const providerTokens = usage?.byProvider[provider] ?? 0;
  const unlimited = isUnlimitedBudget(provider, customBudgets);
  const budget = getProviderBudget(provider, customBudgets);
  const pTheme = PROVIDER_THEME[provider];

  if (!usage || providerTokens === 0) return null;

  const pct = unlimited ? 0 : Math.min(100, (providerTokens / budget) * 100);
  const isOver = !unlimited && providerTokens >= budget;

  const barColor = isOver
    ? theme.danger
    : pct > 80
      ? theme.warning
      : pTheme.color;

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <View style={styles.row}>
        <View style={styles.labelRow}>
          <MaterialCommunityIcons
            name={pTheme.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={12}
            color={pTheme.color}
          />
          <Text style={[styles.label, { color: theme.secondaryText }]}>
            {providerTokens.toLocaleString("pt-BR")}{unlimited ? "" : ` / ${budget.toLocaleString("pt-BR")}`}
          </Text>
          {costBrl !== null && (
            <Text style={[styles.costLabel, { color: theme.secondaryText }]}>
              · R$ {costBrl.toFixed(4)}
            </Text>
          )}
        </View>
        {!unlimited && (
          <Text style={[styles.pct, { color: barColor }]}>
            {Math.round(pct)}%
          </Text>
        )}
        {unlimited && (
          <Text style={[styles.pct, { color: theme.secondaryText }]}>∞</Text>
        )}
      </View>
      {!unlimited && (
        <View style={[styles.track, { backgroundColor: theme.border }]}>
          <View
            style={[styles.fill, { width: `${pct}%` as `${number}%`, backgroundColor: barColor }]}
          />
        </View>
      )}
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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontSize: 11,
  },
  costLabel: {
    fontSize: 10,
    fontStyle: "italic",
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
