import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ThemeColors } from "@packages/theme";
import type { StoredPayslip } from "@packages/domain";
import { formatPayslipPeriod } from "@packages/domain";

interface PayslipChartProps {
  history: StoredPayslip[];
  theme: ThemeColors;
  /** Quantas competências exibir (as mais recentes) */
  maxBars?: number;
}

const CHART_HEIGHT = 140;

function compact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return value.toFixed(0);
}

/** Evolução do salário: barra cheia = líquido, contorno = bruto */
export function PayslipChart({ history, theme, maxBars = 12 }: PayslipChartProps) {
  const data = history.slice(-maxBars);
  if (data.length === 0) return null;
  const max = Math.max(...data.map((p) => p.grossSalary), 1);

  return (
    <View
      style={[s.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      accessibilityLabel="Gráfico de evolução do salário"
    >
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.dot, { backgroundColor: theme.primaryColor }]} />
          <Text style={[s.legendText, { color: theme.secondaryText }]}>Líquido</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.dot, s.dotOutline, { borderColor: theme.secondaryText }]} />
          <Text style={[s.legendText, { color: theme.secondaryText }]}>Bruto</Text>
        </View>
      </View>

      <View style={[s.bars, { height: CHART_HEIGHT + 32 }]}>
        {data.map((p) => {
          const grossH = Math.max((p.grossSalary / max) * CHART_HEIGHT, 4);
          const netH = Math.max((p.netSalary / max) * CHART_HEIGHT, 2);
          return (
            <View key={p.id} style={s.col}>
              <Text style={[s.value, { color: theme.textColor }]} numberOfLines={1}>
                {compact(p.netSalary)}
              </Text>
              <View
                style={[s.gross, { height: grossH, borderColor: theme.border }]}
                accessibilityLabel={`${formatPayslipPeriod(p.period)}: líquido ${p.netSalary.toFixed(2)}, bruto ${p.grossSalary.toFixed(2)}`}
              >
                <View style={[s.net, { height: netH, backgroundColor: theme.primaryColor }]} />
              </View>
              <Text style={[s.label, { color: theme.secondaryText }]} numberOfLines={1}>
                {formatPayslipPeriod(p.period).split("/")[0]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  legend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  dotOutline: { borderWidth: 1.5, backgroundColor: "transparent" },
  legendText: { fontSize: 12 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  value: { fontSize: 10, fontWeight: "600" },
  gross: {
    width: "100%",
    maxWidth: 28,
    borderWidth: 1.5,
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  net: { width: "100%", borderRadius: 4 },
  label: { fontSize: 11 },
});
