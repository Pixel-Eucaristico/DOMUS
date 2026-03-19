import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Rect, Defs, Pattern } from "react-native-svg";

interface Props {
  /** Tamanho de cada pixel do grid. Default: 8 */
  cellSize?: number;
  /** Cor do grid. Default: cor do tema */
  color?: string;
  /** Opacidade do grid. Default: 0.02 (quase invisível) */
  opacity?: number;
}

/**
 * Pattern de grid quadriculado sutil no fundo — remete a pixels/tela digital.
 * Identidade visual Pixel Eucarístico.
 */
export function PixelGrid({ cellSize = 8, color = "#000", opacity = 0.02 }: Props) {
  return (
    <View style={s.container} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="pixelGrid" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
            <Rect x={0} y={0} width={cellSize} height={cellSize} fill="none" stroke={color} strokeWidth={0.5} opacity={opacity} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#pixelGrid)" />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
  },
});
