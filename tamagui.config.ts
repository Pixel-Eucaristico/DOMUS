import { createTamagui, createTokens, createFont } from "@tamagui/core";
import { defaultConfig } from "@tamagui/config/v5";

// ── Tokens baseados no design system DOMUS ─────────────────────────────────────
// Mapeiam os valores usados no StyleSheet.create para tokens Tamagui reutilizáveis.

const tokens = createTokens({
  ...defaultConfig.tokens,
  size: {
    ...defaultConfig.tokens.size,
    // Tamanhos de componentes padrão do DOMUS
    iconSm: 16,
    iconMd: 20,
    iconLg: 28,
    btnHeight: 48,
    cardRadius: 16,
    inputHeight: 44,
    fabSize: 60,
  },
  space: {
    ...defaultConfig.tokens.space,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  radius: {
    ...defaultConfig.tokens.radius,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },
});

// ── Font DM Sans (usado em todo o app) ─────────────────────────────────────────

const dmSansFont = createFont({
  family: "DMSans_400Regular",
  size: {
    1: 10,
    2: 11,
    3: 12,
    4: 13,
    5: 14,
    6: 15,
    7: 16,
    8: 18,
    9: 20,
    10: 22,
    11: 24,
    12: 28,
  },
  weight: {
    4: "400",
    5: "500",
    6: "600",
    7: "700",
  },
  face: {
    400: { normal: "DMSans_400Regular" },
    500: { normal: "DMSans_500Medium" },
    600: { normal: "DMSans_600SemiBold" },
    700: { normal: "DMSans_700Bold" },
  },
});

// ── Temas mapeados dos archetypes existentes ───────────────────────────────────
// Cada archetype do DOMUS vira um tema Tamagui com tokens semânticos.
// Coexiste com o sistema atual via ThemeColors — migração gradual.

const themes = {
  light: {
    background: "#F5F7FA",
    color: "#1A1A2E",
    colorSecondary: "#6B7280",
    cardBackground: "#FFFFFF",
    borderColor: "#E5E7EB",
    primary: "#1B5E63",
    accent: "#26A69A",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
  },
  dark: {
    background: "#0F172A",
    color: "#F8FAFC",
    colorSecondary: "#94A3B8",
    cardBackground: "#1E293B",
    borderColor: "#334155",
    primary: "#26A69A",
    accent: "#1B5E63",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
  },
};

// ── Config ─────────────────────────────────────────────────────────────────────

const config = createTamagui({
  ...defaultConfig,
  tokens,
  themes,
  fonts: {
    ...defaultConfig.fonts,
    body: dmSansFont,
    heading: dmSansFont,
  },
});

export type AppConfig = typeof config;

declare module "@tamagui/core" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
