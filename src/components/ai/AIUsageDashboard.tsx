import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
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
import { TCard, TText } from "@/src/components/tamagui";

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

      const rate = await TokenPricingService.getUsdToBrl();
      if (!mounted) return;
      setExchangeRate(rate);

      const providerEntries = Object.entries(u.byProvider).filter(
        ([, tokens]) => (tokens ?? 0) > 0,
      ) as [AIProvider, number][];

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
  ) as [AIProvider, number][];

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
    <TCard
      elevated
      backgroundColor={theme.cardBackground}
      borderColor={theme.border}
      borderWidth={1.5}
      gap={12}
    >
      <View style={s.header}>
        <MaterialCommunityIcons name="robot-happy" size={14} color={theme.secondaryText} />
        <TText bold color={theme.secondaryText} letterSpacing={0.3}>
          {isMonthly ? "Uso de tokens (mensal)" : "Uso diário de tokens"}
        </TText>
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
          <View key={provider} style={s.providerSection}>
            <View style={s.providerHeader}>
              <MaterialCommunityIcons
                name={pTheme.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={12}
                color={pTheme.color}
              />
              <TText variant="label" bold flex={1} textTransform="capitalize" color={theme.textColor}>
                {provider}
              </TText>
              <TText variant="caption" color={isOver ? theme.danger : theme.secondaryText}>
                {tokens.toLocaleString("pt-BR")}{unlimited ? "" : ` / ${budget.toLocaleString("pt-BR")}`}
                {isMonthly && !unlimited ? " hoje" : ""}
              </TText>
              {unlimited ? (
                <TText variant="caption" bold color={pTheme.color} minWidth={35} textAlign="right">∞</TText>
              ) : (
                <TText variant="caption" bold color={barColor} minWidth={35} textAlign="right">
                  {Math.round(pct)}%
                </TText>
              )}
            </View>
            {!unlimited && (
              <View style={[s.track, { backgroundColor: theme.border }]}>
                <View
                  style={[s.fill, { width: `${pct}%` as `${number}%`, backgroundColor: barColor }]}
                />
              </View>
            )}
            {cost && (
              <TText fontSize={11} fontStyle="italic" color={theme.secondaryText} opacity={0.8} marginTop={2}>
                Custo est.: R$ {cost.costBrl.toFixed(2)}{unlimited ? "" : ` / R$ ${cost.budgetCostBrl.toFixed(2)} max`}
              </TText>
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
          <View key={`${provider}-monthly`} style={s.monthlyInfo}>
            <TText fontSize={11} color={theme.secondaryText}>
              Ciclo mensal: {mUsed.toLocaleString("pt-BR")}{mUnlimited ? "" : ` / ${mBudget.toLocaleString("pt-BR")}`} tokens
              {mUnlimited ? " ∞" : ` (${Math.round(mPct)}%)`}
              {` · ${daysLeft}d restantes`}
            </TText>
            {!mUnlimited && (
              <View style={[s.track, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    s.fill,
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
        <TText
          variant="caption"
          bold
          color={theme.danger}
          textAlign="center"
          marginTop={4}
          padding={8}
          borderRadius={8}
          backgroundColor="rgba(239, 68, 68, 0.08)"
        >
          {isMonthly
            ? "Limite diário (mensal rateado) atingido em um ou mais provedores."
            : "Limite diário atingido em um ou mais provedores."}
        </TText>
      )}

      {exchangeRate && (
        <TText
          fontSize={10}
          fontStyle="italic"
          color={theme.secondaryText}
          textAlign="center"
          marginTop={4}
          opacity={0.7}
        >
          Cotação USD/BRL: {exchangeRate.toFixed(2)} · Valores estimados, não representam custo real exato
        </TText>
      )}
    </TCard>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
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
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  monthlyInfo: {
    gap: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
});
