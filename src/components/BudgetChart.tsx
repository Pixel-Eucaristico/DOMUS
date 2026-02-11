import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, spacing } from "@/src/theme";

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
    <View style={styles.container}>
      <Text style={styles.title}>Divisao 50/30/20</Text>
      <View style={styles.content}>
        <View style={styles.chartWrapper}>
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
          <View style={styles.chartCenter}>
            <Text style={styles.chartCenterValue}>R$ 5.000</Text>
            <Text style={styles.chartCenterLabel}>Total</Text>
          </View>
        </View>
        <View style={styles.legend}>
          {MOCK_BUDGET.map((segment, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
              <View style={styles.legendTextGroup}>
                <Text style={styles.legendLabel}>{segment.label}</Text>
                <Text style={styles.legendPercentage}>{segment.percentage}%</Text>
              </View>
              <Text style={styles.legendAmount}>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(segment.amount)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.md,
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
  chartCenterValue: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: colors.text.primary,
  },
  chartCenterLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: colors.text.tertiary,
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
  legendLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: colors.text.primary,
  },
  legendPercentage: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: colors.text.tertiary,
  },
  legendAmount: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: colors.text.primary,
  },
});
