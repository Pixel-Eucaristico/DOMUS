import React from "react";
import { View, StyleSheet } from "react-native";
import type { ThemeColors } from "@packages/theme";

interface Props {
  theme: ThemeColors;
  children?: React.ReactNode;
}

export function TourOverlay({ children }: Props) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
