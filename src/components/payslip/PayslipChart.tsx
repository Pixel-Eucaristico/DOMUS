import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { ThemeColors } from "@packages/theme";
import type { PayslipChartPoint } from "@packages/domain";
import { InfoTip } from "@/src/components/shared/InfoTip";
import { chartBarAccessibilityLabel, chartBarDetail } from "@/src/modules/payslip/historyFormat";

interface PayslipChartProps {
  /** Série pronta (`payslipChartSeries`): até 12 competências, da mais antiga à mais recente. */
  series: readonly PayslipChartPoint[];
  theme: ThemeColors;
}

/** Altura fixa da área das barras: nenhuma `View` passa disso (GPU Mali). */
const CHART_HEIGHT = 140;
const BAR_MAX_WIDTH = 28;

/**
 * Story 11.6: barras pareadas por competência — bruto em contorno, líquido
 * preenchido. Só `View`s de tamanho fixo, sem SVG e sem animação. Tocar numa
 * barra mostra o detalhe abaixo (padrão: a mais recente).
 */
export function PayslipChart({ series, theme }: PayslipChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  if (series.length === 0) return null;
  const selected = series.find((p) => p.period === selectedPeriod) ?? series[series.length - 1]!;

  return (
    <View style={[s.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <Text style={[s.title, { color: theme.textColor }]} accessibilityRole="header">
        Líquido e bruto por competência
      </Text>
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.dot, { backgroundColor: theme.primaryColor }]} />
          <Text style={[s.legendText, { color: theme.secondaryText }]}>Líquido</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.dot, s.dotOutline, { borderColor: theme.secondaryText }]} />
          <Text style={[s.legendText, { color: theme.secondaryText }]}>Bruto</Text>
          <InfoTip term="salario_bruto" size={13} />
        </View>
      </View>

      <View style={s.bars}>
        {series.map((p) => {
          const isSelected = p.period === selected.period;
          const grossH = p.gross > 0 ? Math.max(Math.round(p.grossRatio * CHART_HEIGHT), 4) : 0;
          const netH = p.net > 0 ? Math.max(Math.round(p.netRatio * CHART_HEIGHT), 2) : 0;
          return (
            <Pressable
              key={p.period}
              style={s.col}
              onPress={() => setSelectedPeriod(p.period)}
              accessibilityRole="button"
              accessibilityLabel={chartBarAccessibilityLabel(p)}
              accessibilityState={{ selected: isSelected }}
              testID={`payslip-bar-${p.period}`}
            >
              <View style={[s.track, isSelected && { backgroundColor: theme.primaryColor + "14" }]}>
                <View
                  style={[
                    s.gross,
                    { height: grossH, borderColor: isSelected ? theme.primaryColor : theme.secondaryText },
                  ]}
                />
                <View style={[s.net, { height: netH, backgroundColor: theme.primaryColor }]} />
              </View>
              <Text
                style={[
                  s.label,
                  { color: isSelected ? theme.textColor : theme.secondaryText },
                  isSelected && s.labelSelected,
                ]}
                numberOfLines={1}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[s.detail, { color: theme.textColor }]} accessibilityLiveRegion="polite">
        {chartBarDetail(selected)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  title: { fontSize: 15, fontWeight: "700" },
  legend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  dotOutline: { borderWidth: 1.5, backgroundColor: "transparent" },
  legendText: { fontSize: 12 },
  bars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 2 },
  col: { flex: 1, maxWidth: 48, alignItems: "center", gap: 6 },
  track: {
    width: "100%",
    maxWidth: BAR_MAX_WIDTH + 8,
    height: CHART_HEIGHT,
    borderRadius: 8,
    overflow: "hidden",
  },
  gross: {
    position: "absolute",
    left: "8%",
    right: "8%",
    bottom: 0,
    borderWidth: 1.5,
    borderRadius: 6,
  },
  net: { position: "absolute", left: "26%", right: "26%", bottom: 0, borderRadius: 4 },
  label: { fontSize: 9 },
  labelSelected: { fontWeight: "700" },
  detail: { fontSize: 13, fontWeight: "600", textAlign: "center" },
});
