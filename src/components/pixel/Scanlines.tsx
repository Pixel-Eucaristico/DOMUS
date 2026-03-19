import React from "react";
import { View, StyleSheet } from "react-native";

interface Props {
  /** Opacidade das scanlines (0.0 a 1.0). Default: 0.03 (muito sutil) */
  opacity?: number;
  /** Espaçamento entre linhas em px. Default: 3 */
  spacing?: number;
  /** Cor das linhas. Default: "#000" */
  color?: string;
}

/**
 * Overlay de scanlines CRT — efeito retro Silver Screen.
 * Coloca como overlay absoluto sobre qualquer container.
 * Muito sutil por padrão (opacity 0.03) para não atrapalhar leitura.
 */
export function Scanlines({ opacity = 0.03, spacing = 3, color = "#000" }: Props) {
  // Gera linhas suficientes para cobrir tela inteira
  const lines = Array.from({ length: Math.ceil(1000 / spacing) }, (_, i) => (
    <View
      key={i}
      style={{
        height: 1,
        marginBottom: spacing - 1,
        backgroundColor: color,
        opacity,
      }}
    />
  ));

  return (
    <View style={s.container} pointerEvents="none">
      {lines}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 999,
  },
});
