import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ThemeColors } from "@packages/theme";

interface Props {
  current: number;
  total: number;
  theme: ThemeColors;
}

export function InstallmentBadge({ current, total, theme }: Props) {
  return (
    <View style={[s.badge, { backgroundColor: `${theme.primaryColor}15` }]}>
      <Text style={[s.text, { color: theme.primaryColor }]}>
        {current}/{total}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  text: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 10,
  },
});
