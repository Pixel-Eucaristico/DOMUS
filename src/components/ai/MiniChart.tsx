import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppState } from "@/src/context/AppStateProvider";

interface MiniChartItem {
  label: string;
  value: number;
  color?: string;
}

interface MiniChartProps {
  items: MiniChartItem[];
  title?: string;
}

const COLORS = ["#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0", "#00BCD4"];

export function MiniChart({ items, title }: MiniChartProps) {
  const { theme } = useAppState();
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      {title && (
        <Text style={[styles.title, { color: theme.textColor }]}>{title}</Text>
      )}
      {items.slice(0, 6).map((item, idx) => {
        const pct = Math.max((item.value / max) * 100, 4);
        const color = item.color || COLORS[idx % COLORS.length]!;
        return (
          <View key={idx} style={styles.row}>
            <Text style={[styles.label, { color: theme.secondaryText }]} numberOfLines={1}>
              {item.label}
            </Text>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.value, { color: theme.textColor }]}>
              R${item.value.toFixed(0)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    marginTop: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    width: 80,
    fontSize: 12,
  },
  barContainer: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E020",
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 4,
  },
  value: {
    width: 56,
    fontSize: 12,
    textAlign: "right",
    fontWeight: "500",
  },
});
