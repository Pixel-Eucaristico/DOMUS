import React from "react";
import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import type { ThemeColors } from "@packages/theme";

interface DomusLogoProps {
  size?: number;
  theme: ThemeColors;
}

export const DomusLogo: React.FC<DomusLogoProps> = ({ size = 40, theme }) => {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path
          d="M15 45L50 15L85 45"
          stroke={theme.primaryColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Rect
          x="25"
          y="65"
          width="12"
          height="20"
          rx="2"
          fill={theme.primaryColor}
        />
        <Rect
          x="44"
          y="45"
          width="12"
          height="40"
          rx="2"
          fill={theme.accentColor}
        />
        <Rect
          x="63"
          y="25"
          width="12"
          height="60"
          rx="2"
          fill={theme.success}
        />
      </Svg>
    </View>
  );
};
