import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { TokenTracker } from "@/src/modules/ai/application/TokenTracker";
import { TokenPricingService } from "@/src/modules/ai/infrastructure/TokenPricingService";
import { getProviderBudget, isUnlimitedBudget, getMonthlyBudget, isUnlimitedMonthlyBudget, PROVIDER_THEME } from "@/src/modules/ai/domain/AISettings";
import type { BudgetMode } from "@/src/modules/ai/domain/AISettings";
import type { AIProvider, AIModelTier, DailyTokenUsage } from "@packages/ai";
import { TText } from "@/src/components/tamagui";

interface AIUsageBarProps {
  provider: AIProvider;
  audioProvider?: string;
  voiceEnabled?: boolean;
  modelTier?: AIModelTier;
  customBudgets?: Partial<Record<AIProvider, number>>;
  budgetMode?: BudgetMode;
  monthlyBudgets?: Partial<Record<AIProvider, number>>;
  billingDay?: number;
  refreshKey?: number;
}

function BarRow({
  provider,
  tokens,
  label,
  budget,
  unlimited,
  costBrl,
  theme,
}: {
  provider: string;
  tokens: number;
  label: string;
  budget: number;
  unlimited: boolean;
  costBrl: number | null;
  theme: any;
}) {
  const pTheme = PROVIDER_THEME[provider as AIProvider] ?? { color: "#888", icon: "robot" };
  const safeTokens = tokens ?? 0;
  const safeBudget = budget || 1;
  const pct = unlimited ? 0 : Math.min(100, (safeTokens / safeBudget) * 100);
  const isOver = !unlimited && safeTokens >= safeBudget;
  const barColor = isOver ? theme.danger : pct > 80 ? theme.warning : pTheme.color;

  return (
    <View style={s.barRow}>
      <View style={s.row}>
        <View style={s.labelRow}>
          <MaterialCommunityIcons
            name={pTheme.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={11}
            color={pTheme.color}
          />
          <TText bold fontSize={10} textTransform="capitalize" color={pTheme.color}>
            {label}
          </TText>
          <TText fontSize={10} color={theme.secondaryText}>
            {safeTokens.toLocaleString("pt-BR")}{unlimited ? "" : ` / ${safeBudget.toLocaleString("pt-BR")}`}
          </TText>
          {costBrl !== null && (
            <TText fontSize={9} fontStyle="italic" color={theme.secondaryText}>
              · R$ {costBrl.toFixed(2)}
            </TText>
          )}
        </View>
        {!unlimited ? (
          <TText bold fontSize={10} color={barColor}>{Math.round(pct)}%</TText>
        ) : (
          <TText bold fontSize={10} color={theme.secondaryText}>∞</TText>
        )}
      </View>
      {!unlimited && (
        <View style={[s.track, { backgroundColor: theme.border }]}>
          <View style={[s.fill, { width: `${pct}%` as `${number}%`, backgroundColor: barColor }]} />
        </View>
      )}
    </View>
  );
}

export function AIUsageBar({
  provider,
  audioProvider,
  voiceEnabled,
  modelTier = "fast",
  customBudgets,
  budgetMode,
  monthlyBudgets,
  refreshKey,
}: AIUsageBarProps) {
  const { theme } = useAppState();
  const [usage, setUsage] = useState<DailyTokenUsage | null>(null);
  const [costs, setCosts] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    const u = await TokenTracker.getToday();
    setUsage(u);
    const costMap: Record<string, number> = {};
    for (const [p, tokens] of Object.entries(u.byProvider)) {
      if ((tokens ?? 0) > 0) {
        const est = await TokenPricingService.estimateCost(p as AIProvider, modelTier, tokens!);
        costMap[p] = est.costBrl;
      }
    }
    if (u.ttsCharsByProvider) {
      for (const [p, chars] of Object.entries(u.ttsCharsByProvider)) {
        if ((chars ?? 0) > 0) {
          const est = await TokenPricingService.estimateTTSCost(p, chars!);
          costMap[`tts_${p}`] = est.costBrl;
        }
      }
    }
    setCosts(costMap);
  }, [modelTier]);

  useEffect(() => { refresh(); }, [refresh, refreshKey]);

  if (!usage) return null;

  const isMonthly = budgetMode === "monthly";
  const audioProv = voiceEnabled ? audioProvider : undefined;
  const sameProvider = !audioProv || audioProv === provider;

  const bars: Array<{ id: string; label: string; tokens: number; budget: number; unlimited: boolean; cost: number | null }> = [];

  const textTokens = usage.byProvider[provider] ?? 0;
  const getBudget = (p: AIProvider) => isMonthly ? getMonthlyBudget(p, monthlyBudgets) : getProviderBudget(p, customBudgets);
  const getUnlimited = (p: AIProvider) => isMonthly ? isUnlimitedMonthlyBudget(p, monthlyBudgets) : isUnlimitedBudget(p, customBudgets);

  if (sameProvider) {
    bars.push({
      id: provider,
      label: provider,
      tokens: textTokens,
      budget: getBudget(provider),
      unlimited: getUnlimited(provider),
      cost: costs[provider] ?? null,
    });
  } else {
    bars.push({
      id: provider,
      label: `${provider} (texto)`,
      tokens: textTokens,
      budget: getBudget(provider),
      unlimited: getUnlimited(provider),
      cost: costs[provider] ?? null,
    });
    if (audioProv) {
      const ttsChars = usage.ttsCharsByProvider?.[audioProv] ?? 0;
      const isCharBased = audioProv === "elevenlabs";
      const audioValue = isCharBased ? ttsChars : (usage.byProvider[audioProv as AIProvider] ?? 0);
      const audioBudget = isCharBased ? 30_000 : getBudget(audioProv as AIProvider);
      bars.push({
        id: audioProv,
        label: `${audioProv} (voz${isCharBased ? " · chars" : ""})`,
        tokens: audioValue,
        budget: audioBudget,
        unlimited: isCharBased ? false : getUnlimited(audioProv as AIProvider),
        cost: costs[`tts_${audioProv}`] ?? costs[audioProv] ?? null,
      });
    }
  }

  return (
    <View style={[s.container, { borderColor: theme.border }]}>
      {bars.map((bar) => (
        <BarRow
          key={bar.id}
          provider={bar.id}
          tokens={bar.tokens}
          label={bar.label}
          budget={bar.budget}
          unlimited={bar.unlimited}
          costBrl={bar.cost}
          theme={theme}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  barRow: { gap: 2, paddingVertical: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  track: { height: 3, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
});
