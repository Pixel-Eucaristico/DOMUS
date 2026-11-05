import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { TCard, TText } from "@/src/components/tamagui";
import { soundManager } from "@/src/services/SoundManager";
import { FinancialTooltip } from "@/src/components/ai/FinancialTooltip";
import { getBudgetFeedback } from "@packages/gamification/src/xpEngine";
import type { BudgetBreakdown } from "@packages/domain/src/transactions";

interface BudgetFeedbackCardProps {
  budget: BudgetBreakdown;
  previousBudget?: BudgetBreakdown;
  theme: any;
}

export function BudgetFeedbackCard({
  budget,
  previousBudget,
  theme,
}: BudgetFeedbackCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const feedback = getBudgetFeedback(budget, previousBudget);

  if (feedback.status === "empty") {
    return null;
  }

  const isAttention = feedback.status === "needs_attention";
  const isPerfect = feedback.status === "perfect";

  const cardBg = isAttention
    ? `${theme.warning ?? "#F59E0B"}15`
    : isPerfect
    ? `${theme.success ?? "#10B981"}15`
    : `${theme.primaryColor}15`;

  const borderColor = isAttention
    ? `${theme.warning ?? "#F59E0B"}40`
    : isPerfect
    ? `${theme.success ?? "#10B981"}40`
    : `${theme.primaryColor}40`;

  const iconColor = isAttention
    ? theme.warning ?? "#F59E0B"
    : isPerfect
    ? theme.success ?? "#10B981"
    : theme.primaryColor;

  const iconName = isAttention
    ? "alert-circle"
    : isPerfect
    ? "check-circle"
    : "thumbs-up";

  return (
    <>
      <TCard
        elevated={false}
        backgroundColor={cardBg}
        borderColor={borderColor}
        borderRadius={12}
        padding={12}
        marginTop={10}
        gap={6}
      >
        <View style={s.headerRow}>
          <Feather name={iconName} size={18} color={iconColor} />
          <TText variant="label" fontWeight="600" color={theme.textColor} flex={1}>
            {feedback.title}
          </TText>
          {feedback.improved && (
            <View style={[s.improvedBadge, { backgroundColor: `${theme.success ?? "#10B981"}25` }]}>
              <Feather name="trending-up" size={12} color={theme.success ?? "#10B981"} />
              <TText variant="caption" fontWeight="600" color={theme.success ?? "#10B981"}>
                Melhorou!
              </TText>
            </View>
          )}
        </View>

        <TText variant="body" fontSize={13} color={theme.textColor} lineHeight={18}>
          {feedback.message}
        </TText>

        <View style={s.footerRow}>
          <TouchableOpacity
            style={s.learnMoreBtn}
            onPress={() => {
              soundManager.play("tap");
              setShowTooltip(true);
            }}
          >
            <Feather name="help-circle" size={14} color={theme.primaryColor} />
            <TText variant="caption" fontWeight="600" color={theme.primaryColor}>
              Entenda a regra 50/30/20
            </TText>
          </TouchableOpacity>
        </View>
      </TCard>

      <FinancialTooltip
        visible={showTooltip}
        title="Regra 50/30/20"
        content="A metodologia 50/30/20 propõe equilibrar sua renda líquida em três pilares fundamentais: 50% para Necessidades essenciais (aluguel, contas, alimentação básica), 30% para Desejos pessoais (lazer, compras, estilo de vida) e 20% para Poupança e Investimentos (reserva de emergência e metas de longo prazo). No DOMUS, você não perde pontos se estourar um teto — o objetivo é guiar seu aprendizado contínuo!"
        onClose={() => setShowTooltip(false)}
      />
    </>
  );
}

const s = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  improvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  learnMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
});
