import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import type { ThemeColors } from "@packages/theme";
import { GROUP_COLORS } from "@/src/constants/invoiceCategories";

interface CategoryOption {
  id: string;
  name: string;
  group: "needs" | "wants" | "savings";
}

interface CategoryChipScrollProps {
  categories: CategoryOption[];
  selectedId: string;
  theme: ThemeColors;
  onSelect: (id: string) => void;
}

export function CategoryChipScroll({
  categories,
  selectedId,
  theme,
  onSelect,
}: CategoryChipScrollProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scroll}>
      <View style={s.row}>
        {categories.map((cat) => {
          const color = GROUP_COLORS[cat.group] ?? theme.primaryColor;
          const selected = selectedId === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={[
                s.chip,
                {
                  borderColor: selected ? color : theme.border,
                  backgroundColor: selected ? `${color}18` : "transparent",
                },
              ]}
              onPress={() => onSelect(cat.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${cat.name}${selected ? ", selecionada" : ""}`}
            >
              <Text
                style={[
                  s.chipText,
                  {
                    color: selected ? color : theme.secondaryText,
                    fontWeight: selected ? "700" : "400",
                  },
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { marginBottom: 4 },
  row: { flexDirection: "row", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12 },
});
