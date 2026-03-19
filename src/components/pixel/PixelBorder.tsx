import React from "react";
import { View, StyleSheet } from "react-native";

interface Props {
  children: React.ReactNode;
  /** Cor da borda pixel. Default: cor do tema */
  color?: string;
  /** Espessura da borda. Default: 2 */
  width?: number;
  /** Padding interno. Default: 0 */
  padding?: number;
}

/**
 * Borda pixelada estilo retro ao redor de qualquer componente.
 * Usa box-shadow escalonado para simular pixels.
 */
export function PixelBorder({ children, color = "#1B5E63", width = 2, padding = 0 }: Props) {
  return (
    <View style={[s.outer, { borderColor: color, borderWidth: width, padding }]}>
      {/* Cantos pixelados simulados com quadrados nos 4 cantos */}
      <View style={[s.corner, s.topLeft, { backgroundColor: color, width: width, height: width }]} />
      <View style={[s.corner, s.topRight, { backgroundColor: color, width: width, height: width }]} />
      <View style={[s.corner, s.bottomLeft, { backgroundColor: color, width: width, height: width }]} />
      <View style={[s.corner, s.bottomRight, { backgroundColor: color, width: width, height: width }]} />
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  outer: {
    position: "relative",
    borderRadius: 0, // bordas retas = pixel
  },
  corner: { position: "absolute" },
  topLeft: { top: -1, left: -1 },
  topRight: { top: -1, right: -1 },
  bottomLeft: { bottom: -1, left: -1 },
  bottomRight: { bottom: -1, right: -1 },
});
