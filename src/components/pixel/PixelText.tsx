import React from "react";
import { Text, StyleSheet } from "react-native";
import type { TextStyle } from "react-native";

interface Props {
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: TextStyle;
}

/**
 * Texto com fonte pixel (Press Start 2P) — identidade Pixel Eucarístico.
 * Usar para títulos, logos, badges e elementos de destaque.
 */
export function PixelText({ children, size = 10, color, style }: Props) {
  return (
    <Text style={[s.text, { fontSize: size, color }, style]}>
      {children}
    </Text>
  );
}

const s = StyleSheet.create({
  text: {
    fontFamily: "PressStart2P_400Regular",
    letterSpacing: 0.5,
  },
});
