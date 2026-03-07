import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { TokenTracker } from "@/src/modules/ai/application/TokenTracker";
import { TokenPricingService } from "@/src/modules/ai/infrastructure/TokenPricingService";
import { PROVIDER_THEME, getProviderBudget, isUnlimitedBudget } from "@/src/modules/ai/domain/AISettings";
import type { AIProvider, AIModelTier, DailyTokenUsage } from "@packages/ai";

interface AIUsageDashboardProps {
  modelTier?: AIModelTier;
  customBudgets?: Partial<Record<AIProvider, number>>;
}

interface ProviderCost {
  costBrl: number;
  budgetCostBrl: number;
}

export function AIUsageDashboard({ modelTier = "fast", customBudgets }: AIUsageDashboardProps) {
  const { theme } = useAppState();
  const [usage, setUsage] = useState<DailyTokenUsage | null>(null);
  const [costs, setCosts] = useState<Record<string, ProviderCost>>({});
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await TokenTracker.getToday();
      if (!mounted) return;
      setUsage(u);

      // Fetch exchange rate + compute costs
      const rate = await TokenPricingService.getUsdToBrl();
      if (!mounted) return;
      setExchangeRate(rate);

      const providerEntries = Object.entries(u.byProvider).filter(
        ([, tokens]) => (tokens ?? 0) > 0,
      ) as Array<[AIProvider, number]>;

      const costMap: Record<string, ProviderCost> = {};
      for (const [p, tokens] of providerEntries) {
        const budget = getProviderBudget(p, customBudgets);
        const [used, max] = await Promise.all([
          TokenPricingService.estimateCost(p, modelTier, tokens),
          TokenPricingService.estimateCost(p, modelTier, budget),
        ]);
        costMap[p] = { costBrl: used.costBrl, budgetCostBrl: max.costBrl };
      }
      if (mounted) setCosts(costMap);
    })();
    return () => { mounted = false; };
  }, [modelTier, customBudgets]);

  if (!usage) return null;

  const providers = Object.entries(usage.byProvider).filter(
    ([, tokens]) => (tokens ?? 0) > 0,
  ) as Array<[AIProvider, number]>;

  if (providers.length === 0 && usage.totalTokens === 0) return null;

  const anyOver = providers.some(
    ([p, tokens]) =>
      !isUnlimitedBudget(p, customBudgets) && tokens >= getProviderBudget(p, customBudgets),
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

      {providers.map(([provider, tokens]) => {
        const unlimited = isUnlimitedBudget(provider, customBudgets);
        const budget = getProviderBudget(provider, customBudgets);
        const pTheme = PROVIDER_THEME[provider];
        const pct = unlimited ? 0 : Math.min(100, (tokens / budget) * 100);
        const isOver = !unlimited && tokens >= budget;
        const cost = costs[provider];

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
                {tokens.toLocaleString("pt-BR")}{unlimited ? "" : ` / ${budget.toLocaleString("pt-BR")}`}
              </Text>
              {unlimited ? (
                <Text style={[styles.providerPct, { color: pTheme.color }]}>∞</Text>
              ) : (
                <Text style={[styles.providerPct, { color: barColor }]}>
                  {Math.round(pct)}%
                </Text>
              )}
            </View>
            {!unlimited && (
              <View style={[styles.track, { backgroundColor: theme.border }]}>
                <View
                  style={[styles.fill, { width: `${pct}%` as `${number}%`, backgroundColor: barColor }]}
                />
              </View>
            )}
            {cost && (
              <Text style={[styles.costText, { color: theme.secondaryText }]}>
                Custo est.: R$ {cost.costBrl.toFixed(4)}{unlimited ? "" : ` / R$ ${cost.budgetCostBrl.toFixed(4)} max`}
              </Text>
            )}
          </View>
        );
      })}

      {anyOver && (
        <Text style={[styles.overBudget, { color: theme.danger }]}>
          Limite diario atingido em um ou mais provedores.
        </Text>
      )}

      {exchangeRate && (
        <Text style={[styles.disclaimer, { color: theme.secondaryText }]}>
          Cotacao USD/BRL: {exchangeRate.toFixed(2)} · Valores estimados, nao representam custo real exato
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
  costText: {
    fontSize: 10,
    fontStyle: "italic",
  },
  overBudget: {
    fontSize: 12,
    fontWeight: "600",
  },
  disclaimer: {
    fontSize: 9,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 2,
  },
});
