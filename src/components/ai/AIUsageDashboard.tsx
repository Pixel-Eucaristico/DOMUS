import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { TokenTracker } from "@/src/modules/ai/application/TokenTracker";
import { TokenPricingService } from "@/src/modules/ai/infrastructure/TokenPricingService";
import {
  PROVIDER_THEME,
  getProviderBudget,
  isUnlimitedBudget,
  getMonthlyBudget,
  isUnlimitedMonthlyBudget,
  getEffectiveDailyBudget,
  getBillingCycle,
} from "@/src/modules/ai/domain/AISettings";
import type { BudgetMode } from "@/src/modules/ai/domain/AISettings";
import type { AIProvider, AIModelTier, DailyTokenUsage, MonthlyTokenUsage } from "@packages/ai";

interface AIUsageDashboardProps {
  modelTier?: AIModelTier;
  customBudgets?: Partial<Record<AIProvider, number>>;
  budgetMode?: BudgetMode;
  monthlyBudgets?: Partial<Record<AIProvider, number>>;
  billingDay?: number;
}

interface ProviderCost {
  costBrl: number;
  budgetCostBrl: number;
}

export function AIUsageDashboard({
  modelTier = "fast",
  customBudgets,
  budgetMode = "daily",
  monthlyBudgets,
  billingDay,
}: AIUsageDashboardProps) {
  const { theme } = useAppState();
  const [usage, setUsage] = useState<DailyTokenUsage | null>(null);
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyTokenUsage | null>(null);
  const [costs, setCosts] = useState<Record<string, ProviderCost>>({});
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const isMonthly = budgetMode === "monthly";

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await TokenTracker.getToday();
      if (!mounted) return;
      setUsage(u);

      if (isMonthly) {
        const mu = await TokenTracker.getMonthlyUsage(billingDay);
        if (!mounted) return;
        setMonthlyUsage(mu);
      }

      // Fetch exchange rate + compute costs
      const rate = await TokenPricingService.getUsdToBrl();
      if (!mounted) return;
      setExchangeRate(rate);

      const providerEntries = Object.entries(u.byProvider).filter(
        ([, tokens]) => (tokens ?? 0) > 0,
      ) as Array<[AIProvider, number]>;

      const costMap: Record<string, ProviderCost> = {};
      for (const [p, tokens] of providerEntries) {
        const budget = isMonthly
          ? getMonthlyBudget(p as AIProvider, monthlyBudgets)
          : getProviderBudget(p as AIProvider, customBudgets);
        const [used, max] = await Promise.all([
          TokenPricingService.estimateCost(p as AIProvider, modelTier, tokens),
          TokenPricingService.estimateCost(p as AIProvider, modelTier, budget),
        ]);
        costMap[p] = { costBrl: used.costBrl, budgetCostBrl: max.costBrl };
      }
      if (mounted) setCosts(costMap);
    })();
    return () => { mounted = false; };
  }, [modelTier, customBudgets, budgetMode, monthlyBudgets, billingDay, isMonthly]);

  if (!usage) return null;

  const providers = Object.entries(usage.byProvider).filter(
    ([, tokens]) => (tokens ?? 0) > 0,
  ) as Array<[AIProvider, number]>;

  if (providers.length === 0 && usage.totalTokens === 0) return null;

  const anyOver = providers.some(([p, tokens]) => {
    if (isMonthly) {
      if (isUnlimitedMonthlyBudget(p, monthlyBudgets)) return false;
      const usedCycle = monthlyUsage?.byProvider[p] ?? 0;
      const dailyAllowance = getEffectiveDailyBudget(p, usedCycle, billingDay, monthlyBudgets);
      return tokens >= dailyAllowance;
    }
    return !isUnlimitedBudget(p, customBudgets) && tokens >= getProviderBudget(p, customBudgets);
  });

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
          {isMonthly ? "Uso de tokens (mensal)" : "Uso diario de tokens"}
        </Text>
      </View>

      {providers.map(([provider, tokens]) => {
        const unlimited = isMonthly
          ? isUnlimitedMonthlyBudget(provider, monthlyBudgets)
          : isUnlimitedBudget(provider, customBudgets);
        const usedCycle = monthlyUsage?.byProvider[provider] ?? 0;
        const budget = isMonthly
          ? getEffectiveDailyBudget(provider, usedCycle, billingDay, monthlyBudgets)
          : getProviderBudget(provider, customBudgets);
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
                {isMonthly && !unlimited ? " hoje" : ""}
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
                Custo est.: R$ {cost.costBrl.toFixed(2)}{unlimited ? "" : ` / R$ ${cost.budgetCostBrl.toFixed(2)} max`}
              </Text>
            )}
          </View>
        );
      })}

      {isMonthly && monthlyUsage && providers.map(([provider]) => {
        const mBudget = getMonthlyBudget(provider, monthlyBudgets);
        const mUsed = monthlyUsage.byProvider[provider] ?? 0;
        const mUnlimited = isUnlimitedMonthlyBudget(provider, monthlyBudgets);
        const mPct = mUnlimited ? 0 : Math.min(100, (mUsed / mBudget) * 100);
        const pTheme = PROVIDER_THEME[provider];
        const { end } = getBillingCycle(billingDay);
        const daysLeft = Math.max(1, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
        return (
          <View key={`${provider}-monthly`} style={styles.monthlyInfo}>
            <Text style={[styles.monthlyLabel, { color: theme.secondaryText }]}>
              Ciclo mensal: {mUsed.toLocaleString("pt-BR")}{mUnlimited ? "" : ` / ${mBudget.toLocaleString("pt-BR")}`} tokens
              {mUnlimited ? " ∞" : ` (${Math.round(mPct)}%)`}
              {` · ${daysLeft}d restantes`}
            </Text>
            {!mUnlimited && (
              <View style={[styles.track, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${mPct}%` as `${number}%`,
                      backgroundColor: mPct > 90 ? theme.danger : mPct > 70 ? theme.warning : pTheme.color,
                    },
                  ]}
                />
              </View>
            )}
          </View>
        );
      })}

      {anyOver && (
        <Text style={[styles.overBudget, { color: theme.danger }]}>
          {isMonthly
            ? "Limite diario (mensal rateado) atingido em um ou mais provedores."
            : "Limite diario atingido em um ou mais provedores."}
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
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.3,
  },
  providerSection: {
    gap: 6,
    paddingVertical: 4,
  },
  providerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  providerName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    textTransform: "capitalize",
  },
  providerValue: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
  },
  providerPct: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    minWidth: 35,
    textAlign: "right",
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  costText: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular_Italic",
    opacity: 0.8,
    marginTop: 2,
  },
  overBudget: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
    marginTop: 4,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  disclaimer: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular_Italic",
    textAlign: "center",
    marginTop: 4,
    opacity: 0.7,
  },
  monthlyInfo: {
    gap: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  monthlyLabel: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
  },
});
