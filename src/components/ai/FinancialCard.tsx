import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppState } from "@/src/context/AppStateProvider";
import type { ConsultationResult } from "@packages/ai";

interface FinancialCardProps {
  result: ConsultationResult;
}

const DECISION_COLORS: Record<string, { bg: string; text: string }> = {
  Buy: { bg: "#4CAF5020", text: "#4CAF50" },
  Delay: { bg: "#FF980020", text: "#FF9800" },
  Avoid: { bg: "#F4433620", text: "#F44336" },
};

const RISK_COLORS: Record<string, string> = {
  Low: "#4CAF50",
  Medium: "#FF9800",
  High: "#F44336",
};

export function FinancialCard({ result }: FinancialCardProps) {
  const { theme } = useAppState();
  const decisionStyle = DECISION_COLORS[result.decision] ?? DECISION_COLORS.Delay!;
  const riskColor = RISK_COLORS[result.risk] ?? "#FF9800";

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      {/* Decision Badge */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: decisionStyle.bg }]}>
          <Text style={[styles.badgeText, { color: decisionStyle.text }]}>
            {result.decision === "Buy" ? "Comprar" : result.decision === "Delay" ? "Adiar" : "Evitar"}
          </Text>
        </View>
        <View style={[styles.riskBadge, { borderColor: riskColor }]}>
          <Text style={[styles.riskText, { color: riskColor }]}>
            Risco {result.risk === "Low" ? "Baixo" : result.risk === "Medium" ? "Médio" : "Alto"}
          </Text>
        </View>
      </View>

      {/* Confidence bar */}
      <View style={styles.confidenceRow}>
        <Text style={[styles.label, { color: theme.secondaryText }]}>Confiança</Text>
        <View style={styles.confidenceBar}>
          <View
            style={[
              styles.confidenceFill,
              {
                width: `${Math.round(result.confidence * 100)}%`,
                backgroundColor: result.confidence > 0.7 ? "#4CAF50" : result.confidence > 0.4 ? "#FF9800" : "#F44336",
              },
            ]}
          />
        </View>
        <Text style={[styles.confidenceValue, { color: theme.textColor }]}>
          {Math.round(result.confidence * 100)}%
        </Text>
      </View>

      {/* Recommendation */}
      {result.recommendation ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Recomendacao</Text>
          <Text style={[styles.sectionText, { color: theme.secondaryText }]}>
            {result.recommendation}
          </Text>
        </View>
      ) : null}

      {/* Behavior Insight */}
      {result.behaviorInsight ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Perfil Comportamental</Text>
          <Text style={[styles.sectionText, { color: theme.secondaryText }]}>
            {result.behaviorInsight}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  riskText: {
    fontSize: 12,
    fontWeight: "600",
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 12,
    width: 70,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E0E0E030",
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: "600",
    width: 36,
    textAlign: "right",
  },
  section: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
