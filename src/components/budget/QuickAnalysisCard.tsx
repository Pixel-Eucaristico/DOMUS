import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { TCard, TText } from "@/src/components/tamagui";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { calculateQuickAnalysis } from "@packages/gamification";
import type { BudgetBreakdown } from "@packages/domain/src/transactions";

interface QuickAnalysisCardProps {
  budget: BudgetBreakdown;
  level: number;
  theme: any;
}

export function QuickAnalysisCard({
  budget,
  level,
  theme,
}: QuickAnalysisCardProps) {
  const isUnlocked = level >= 2;

  if (!isUnlocked) {
    return (
      <TCard
        elevated={false}
        backgroundColor={`${theme.border}20`}
        borderColor={theme.border}
        borderRadius={12}
        padding={14}
        gap={6}
      >
        <View style={s.lockedHeader}>
          <View style={[s.lockedIconCircle, { backgroundColor: `${theme.primaryColor}20` }]}>
            <Feather name="lock" size={14} color={theme.primaryColor} />
          </View>
          <TText variant="label" fontWeight="600" color={theme.textColor} flex={1}>
            Análise Rápida: Desejos vs Necessidades
          </TText>
          <View style={[s.levelBadge, { backgroundColor: theme.primaryColor }]}>
            <TText variant="caption" fontWeight="700" color="#FFF">
              Nível 2
            </TText>
          </View>
        </View>
        <TText variant="caption" color={theme.secondaryText} lineHeight={16}>
          Alcance o Nível 2 para desbloquear o diagnóstico instantâneo da proporção entre gastos essenciais e estilo de vida.
        </TText>
      </TCard>
    );
  }

  const analysis = calculateQuickAnalysis(budget);

  if (analysis.status === "empty") {
    return null;
  }

  const statusColors = {
    frugal: theme.primaryColor,
    balanced: theme.success ?? "#10B981",
    lifestyle_heavy: theme.warning ?? "#F59E0B",
    critical: theme.danger ?? "#EF4444",
  };

  const badgeColor = statusColors[analysis.status] ?? theme.primaryColor;

  return (
    <TCard
      elevated={false}
      backgroundColor={theme.cardBackground}
      borderColor={theme.border}
      borderRadius={12}
      padding={14}
      gap={10}
    >
      <View style={s.unlockedHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <Feather name="pie-chart" size={16} color={theme.primaryColor} />
          <TText variant="label" fontWeight="600" color={theme.textColor}>
            Análise Rápida (Nível 2)
          </TText>
        </View>
        <View style={[s.statusBadge, { backgroundColor: `${badgeColor}20` }]}>
          <TText variant="caption" fontWeight="600" color={badgeColor}>
            {analysis.diagnosis}
          </TText>
        </View>
      </View>

      <View style={s.metricsRow}>
        <View style={s.metricBox}>
          <TText variant="caption" color={theme.secondaryText}>Necessidades</TText>
          <TText variant="label" fontWeight="700" color={theme.textColor}>
            {formatCurrency(analysis.needsAmount)}
          </TText>
          <TText variant="caption" color={theme.primaryColor} fontWeight="600">
            {analysis.needsPercent}% da renda
          </TText>
        </View>

        <View style={[s.metricDivider, { backgroundColor: theme.border }]} />

        <View style={s.metricBox}>
          <TText variant="caption" color={theme.secondaryText}>Desejos</TText>
          <TText variant="label" fontWeight="700" color={theme.textColor}>
            {formatCurrency(analysis.wantsAmount)}
          </TText>
          <TText variant="caption" color={theme.accentColor} fontWeight="600">
            {analysis.wantsPercent}% da renda
          </TText>
        </View>
      </View>

      <View style={[s.ratioBanner, { backgroundColor: `${theme.primaryColor}12` }]}>
        <Feather name="compass" size={14} color={theme.primaryColor} />
        <TText variant="caption" fontWeight="600" color={theme.textColor} flex={1}>
          {analysis.ratioFormatted}
        </TText>
      </View>

      <TText variant="caption" color={theme.secondaryText} lineHeight={16}>
        💡 {analysis.tip}
      </TText>
    </TCard>
  );
}

const s = StyleSheet.create({
  lockedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lockedIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unlockedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 4,
  },
  metricBox: {
    alignItems: "center",
    gap: 2,
  },
  metricDivider: {
    width: 1,
    height: 36,
  },
  ratioBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
