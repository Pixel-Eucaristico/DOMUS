import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, spacing } from "@/src/theme";
import { TText } from "@/src/components/tamagui";

interface BudgetSegment {
  label: string;
  percentage: number;
  color: string;
  amount: number;
}

const MOCK_BUDGET: BudgetSegment[] = [
  { label: "Necessidades", percentage: 50, color: colors.chart.needs, amount: 2500 },
  { label: "Desejos", percentage: 30, color: colors.chart.wants, amount: 1500 },
  { label: "Poupanca", percentage: 20, color: colors.chart.savings, amount: 1000 },
];

const SIZE = 140;
const STROKE_WIDTH = 14;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function BudgetChart() {
  let cumulativeOffset = 0;

  return (
    <View style={s.container}>
      <TText variant="subtitle" color={colors.text.primary} marginBottom={spacing.md}>
        Divisao 50/30/20
      </TText>
      <View style={s.content}>
        <View style={s.chartWrapper}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={colors.borderLight}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {MOCK_BUDGET.map((segment, index) => {
              const segmentLength = (segment.percentage / 100) * CIRCUMFERENCE;
              const offset = cumulativeOffset;
              cumulativeOffset += segmentLength;

              return (
                <Circle
                  key={index}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  stroke={segment.color}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeDasharray={`${segmentLength} ${CIRCUMFERENCE - segmentLength}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
              );
            })}
          </Svg>
          <View style={s.chartCenter}>
            <TText variant="body" bold color={colors.text.primary}>R$ 5.000</TText>
            <TText variant="caption" color={colors.text.tertiary} fontSize={11}>Total</TText>
          </View>
        </View>
        <View style={s.legend}>
          {MOCK_BUDGET.map((segment, index) => (
            <View key={index} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: segment.color }]} />
              <View style={s.legendTextGroup}>
                <TText variant="label" color={colors.text.primary}>{segment.label}</TText>
                <TText variant="caption" color={colors.text.tertiary} fontSize={11}>
                  {segment.percentage}%
                </TText>
              </View>
              <TText variant="label" fontWeight="600" color={colors.text.primary}>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(segment.amount)}
              </TText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  chartWrapper: {
    width: SIZE,
    height: SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  chartCenter: {
    position: "absolute",
    alignItems: "center",
  },
  legend: {
    flex: 1,
    gap: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendTextGroup: {
    flex: 1,
  },
});
