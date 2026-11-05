import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle, G } from "react-native-svg";
import type { ThemeColors } from "@packages/theme";

interface Props {
  theme: ThemeColors;
  size?: number;
  opacity?: number;
  /** User level: unlocks additional sacred icons when >= 5 */
  level?: number;
  /** Which icon to show. Rotates daily if not specified. */
  icon?: "cross" | "heart" | "dove" | "chalice" | "fish" | "rosary" | "candle" | "celtic_cross" | "crown";
}

// Minimal hand-crafted SVG paths for subtle liturgical icons (viewBox 0 0 24 24)
const ICONS = {
  cross: (
    <>
      <Path d="M12 2v20M7 7h10" strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={12} cy={7} r={3.5} strokeWidth={1} fill="none" />
    </>
  ),
  heart: (
    <>
      <Path d="M12 21s-7-4.5-7-9.5c0-2.5 2-4.5 4.5-4.5 1.4 0 2.5.8 2.5.8s1.1-.8 2.5-.8c2.5 0 4.5 2 4.5 4.5 0 5-7 9.5-7 9.5z" strokeWidth={1.2} fill="none" />
      <Path d="M12 6v6M9.5 9h5" strokeWidth={1} strokeLinecap="round" />
      <Path d="M10 16c.5 1 1.2 1.5 2 1.5s1.5-.5 2-1.5" strokeWidth={0.8} fill="none" strokeLinecap="round" />
    </>
  ),
  dove: (
    <>
      <Path d="M12 4c-2 0-4 1.5-4 3.5s1 3 2.5 4l-2.5 5h2l1.5-3 1.5 3h2l-2.5-5c1.5-1 2.5-2 2.5-4S14 4 12 4z" strokeWidth={1} fill="none" />
      <Path d="M8 8c-2-.5-3.5 0-4 1.5M16 8c2-.5 3.5 0 4 1.5" strokeWidth={0.8} fill="none" strokeLinecap="round" />
    </>
  ),
  chalice: (
    <>
      <Path d="M8 4h8v3c0 3-1.5 5-4 5.5V17h3v2H9v-2h3v-4.5C9.5 12 8 10 8 7V4z" strokeWidth={1.1} fill="none" />
      <Circle cx={12} cy={3} r={1} strokeWidth={0.8} fill="none" />
    </>
  ),
  fish: (
    <>
      <Path d="M2 12c3-4 7-5 10-4 3-1 7 0 10 4-3 4-7 5-10 4-3 1-7 0-10-4z" strokeWidth={1.1} fill="none" />
      <Circle cx={17} cy={11.5} r={0.8} />
    </>
  ),
  // Nível 5: Expansão Litúrgica
  rosary: (
    <>
      <Circle cx={12} cy={9} r={5} strokeWidth={1} fill="none" />
      <Path d="M12 14v6M10 17h4" strokeWidth={1.2} strokeLinecap="round" />
      <Circle cx={12} cy={4} r={0.8} />
      <Circle cx={17} cy={9} r={0.8} />
      <Circle cx={7} cy={9} r={0.8} />
    </>
  ),
  candle: (
    <>
      <Path d="M9 10h6v11H9z" strokeWidth={1.2} fill="none" />
      <Path d="M12 4c-1 1.5-1.5 3 0 4 1.5-1 1-2.5 0-4z" strokeWidth={1} fill="none" />
      <Path d="M12 8v2" strokeWidth={1} strokeLinecap="round" />
    </>
  ),
  celtic_cross: (
    <>
      <Path d="M12 2v20M4 9h16" strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={12} cy={9} r={4} strokeWidth={1} fill="none" />
    </>
  ),
  crown: (
    <>
      <Path d="M4 17h16l2-10-5 4-5-6-5 6-5-4z" strokeWidth={1.2} fill="none" strokeLinejoin="round" />
      <Circle cx={12} cy={6} r={0.8} />
      <Circle cx={6} cy={8} r={0.8} />
      <Circle cx={18} cy={8} r={0.8} />
    </>
  ),
};

const BASE_ICON_KEYS: (keyof typeof ICONS)[] = ["cross", "heart", "dove", "chalice", "fish"];
const ALL_ICON_KEYS: (keyof typeof ICONS)[] = [
  "cross", "heart", "dove", "chalice", "fish", "rosary", "candle", "celtic_cross", "crown"
];

/**
 * Renders a subtle liturgical icon for Catholic users.
 * Rotates daily based on day of year. Level >= 5 expands to 9 sacred icons.
 */
export function CatholicHeaderIcon({ theme, size = 18, opacity = 0.25, icon, level = 1 }: Props) {
  const selectedIcon = useMemo(() => {
    if (icon) return icon;
    const pool = level >= 5 ? ALL_ICON_KEYS : BASE_ICON_KEYS;
    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    return pool[dayOfYear % pool.length]!;
  }, [icon, level]);

  return (
    <View style={[s.container, { opacity }]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={theme.primaryColor}
      >
        <G>{ICONS[selectedIcon]}</G>
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginHorizontal: 4,
  },
});
