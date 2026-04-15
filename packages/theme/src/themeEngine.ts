import type { ThemeColors, ArchetypeThemeKey } from "./types";

const THEMES: Record<ArchetypeThemeKey, ThemeColors> = {
  explorer: {
    primaryColor: "#1B5E63",
    accentColor: "#26A69A",
    background: "#F5F7FA",
    textColor: "#1A1A2E",
    secondaryText: "#6B7280",
    cardBackground: "#FFFFFF",
    border: "#E5E7EB",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
  },
  organizer: {
    primaryColor: "#2D3A8C",
    accentColor: "#5B6ABF",
    background: "#F4F5F9",
    textColor: "#1E1E3F",
    secondaryText: "#64748B",
    cardBackground: "#FFFFFF",
    border: "#E2E4ED",
    success: "#059669",
    warning: "#D97706",
    danger: "#DC2626",
  },
  planner: {
    primaryColor: "#1E3A5F",
    accentColor: "#3B82F6",
    background: "#F0F4F8",
    textColor: "#0F172A",
    secondaryText: "#475569",
    cardBackground: "#FFFFFF",
    border: "#CBD5E1",
    success: "#22C55E",
    warning: "#EAB308",
    danger: "#EF4444",
  },
  strategist: {
    primaryColor: "#3F1D38",
    accentColor: "#7C3AED",
    background: "#FAF5FF",
    textColor: "#1C1917",
    secondaryText: "#57534E",
    cardBackground: "#FFFFFF",
    border: "#D6D3D1",
    success: "#16A34A",
    warning: "#CA8A04",
    danger: "#E11D48",
  },
  investor: {
    primaryColor: "#064E3B",
    accentColor: "#059669",
    background: "#F0FDF4",
    textColor: "#052E16",
    secondaryText: "#4B5563",
    cardBackground: "#FFFFFF",
    border: "#D1D5DB",
    success: "#15803D",
    warning: "#B45309",
    danger: "#B91C1C",
  },
  independent: {
    primaryColor: "#1C1917",
    accentColor: "#A78BFA",
    background: "#FAFAF9",
    textColor: "#0C0A09",
    secondaryText: "#78716C",
    cardBackground: "#FFFFFF",
    border: "#D6D3D1",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
  },
};

const DARK_THEMES: Record<ArchetypeThemeKey, ThemeColors> = {
  explorer: {
    primaryColor: "#26A69A",
    accentColor: "#1B5E63",
    background: "#0F172A",
    textColor: "#F8FAFC",
    secondaryText: "#94A3B8",
    cardBackground: "#1E293B",
    border: "#334155",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
  },
  organizer: {
    primaryColor: "#5B6ABF",
    accentColor: "#2D3A8C",
    background: "#0F111A",
    textColor: "#F1F5F9",
    secondaryText: "#94A3B8",
    cardBackground: "#1A1C2E",
    border: "#2E314F",
    success: "#059669",
    warning: "#D97706",
    danger: "#DC2626",
  },
  planner: {
    primaryColor: "#3B82F6",
    accentColor: "#1E3A5F",
    background: "#0B0E14",
    textColor: "#F1F5F9",
    secondaryText: "#94A3B8",
    cardBackground: "#161B22",
    border: "#30363D",
    success: "#22C55E",
    warning: "#EAB308",
    danger: "#EF4444",
  },
  strategist: {
    primaryColor: "#A78BFA",
    accentColor: "#3F1D38",
    background: "#120B1A",
    textColor: "#F5F3FF",
    secondaryText: "#A78BFA",
    cardBackground: "#241831",
    border: "#3B2D4A",
    success: "#16A34A",
    warning: "#CA8A04",
    danger: "#E11D48",
  },
  investor: {
    primaryColor: "#10B981",
    accentColor: "#064E3B",
    background: "#06100E",
    textColor: "#ECFDF5",
    secondaryText: "#6EE7B7",
    cardBackground: "#0A261F",
    border: "#124D3D",
    success: "#15803D",
    warning: "#B45309",
    danger: "#B91C1C",
  },
  independent: {
    primaryColor: "#D6D3D1",
    accentColor: "#A78BFA",
    background: "#0C0A09",
    textColor: "#FAFAF9",
    secondaryText: "#A8A29E",
    cardBackground: "#1C1917",
    border: "#44403C",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
  },
};

// ── Paletas Católicas ─────────────────────────────────────────────────────────
// Inspirado em: Roman Catholic palette (#d1c29a, #fcfcea, #c9a758),
// Soft Gold Ivory Elegance (#d4af37, #b79a67), Church palette (#dbcdb3).
// Tons mutados e elegantes — marfim, ouro envelhecido, taupe, verde litúrgico.
// Referência: color-hex.com/color-palette/46996, discipls.com church palettes.

const CATHOLIC_THEMES: Record<ArchetypeThemeKey, ThemeColors> = {
  explorer: {
    primaryColor: "#8C7A5B",    // ouro envelhecido (mutado)
    accentColor: "#7B5B4C",     // terracota suave
    background: "#FAF8F4",      // marfim quente
    textColor: "#3B3229",       // marrom quente
    secondaryText: "#8A8078",   // taupe
    cardBackground: "#FFFFFF",
    border: "#E8E2D8",          // bege suave
    success: "#5C8A5E",         // verde litúrgico mutado
    warning: "#C49A3C",         // âmbar dourado
    danger: "#A85454",          // vermelho suave
  },
  organizer: {
    primaryColor: "#6E6050",    // taupe escuro
    accentColor: "#A08C6A",     // dourado mutado
    background: "#F8F5F0",      // linho
    textColor: "#38322A",
    secondaryText: "#8A8078",
    cardBackground: "#FFFFFF",
    border: "#E4DDD4",
    success: "#5C8A5E",
    warning: "#C49A3C",
    danger: "#A85454",
  },
  planner: {
    primaryColor: "#5A6D7A",    // azul acinzentado (mariano suave)
    accentColor: "#A08C6A",     // dourado mutado
    background: "#F6F5F2",      // off-white quente
    textColor: "#2E3338",
    secondaryText: "#7C8288",
    cardBackground: "#FFFFFF",
    border: "#DDD9D2",
    success: "#5C8A5E",
    warning: "#C49A3C",
    danger: "#A85454",
  },
  strategist: {
    primaryColor: "#7A5565",    // bordô mutado / malva
    accentColor: "#A08C6A",     // dourado mutado
    background: "#F9F6F5",      // rosa marfim sutil
    textColor: "#362D32",
    secondaryText: "#887880",
    cardBackground: "#FFFFFF",
    border: "#E4DCDF",
    success: "#5C8A5E",
    warning: "#C49A3C",
    danger: "#A85454",
  },
  investor: {
    primaryColor: "#5E7A62",    // verde litúrgico mutado
    accentColor: "#A08C6A",     // dourado mutado
    background: "#F5F7F3",      // verde marfim sutil
    textColor: "#2C3530",
    secondaryText: "#707A72",
    cardBackground: "#FFFFFF",
    border: "#D8DED5",
    success: "#5E7A62",
    warning: "#C49A3C",
    danger: "#A85454",
  },
  independent: {
    primaryColor: "#6E6050",    // taupe monástico
    accentColor: "#8C7A5B",     // ouro envelhecido
    background: "#F8F6F2",      // pergaminho suave
    textColor: "#332E28",
    secondaryText: "#8A8078",
    cardBackground: "#FFFFFF",
    border: "#E2DCD4",
    success: "#5C8A5E",
    warning: "#C49A3C",
    danger: "#A85454",
  },
};

const CATHOLIC_DARK_THEMES: Record<ArchetypeThemeKey, ThemeColors> = {
  explorer: {
    primaryColor: "#C9B896",    // ouro claro mutado
    accentColor: "#A08C6A",     // dourado suave
    background: "#1A1814",      // marrom muito escuro
    textColor: "#EDE8DF",       // marfim
    secondaryText: "#9A9188",   // taupe claro
    cardBackground: "#242018",  // marrom escuro quente
    border: "#3A352C",
    success: "#7AAE7C",
    warning: "#D4AA5C",
    danger: "#C47070",
  },
  organizer: {
    primaryColor: "#B8A888",    // taupe claro
    accentColor: "#C9B896",
    background: "#181614",
    textColor: "#EDE8DF",
    secondaryText: "#9A9188",
    cardBackground: "#221E18",
    border: "#38342C",
    success: "#7AAE7C",
    warning: "#D4AA5C",
    danger: "#C47070",
  },
  planner: {
    primaryColor: "#8AA0B0",    // azul mariano claro mutado
    accentColor: "#C9B896",
    background: "#16181A",
    textColor: "#E8E6E2",
    secondaryText: "#949AA0",
    cardBackground: "#1E2024",
    border: "#30343A",
    success: "#7AAE7C",
    warning: "#D4AA5C",
    danger: "#C47070",
  },
  strategist: {
    primaryColor: "#B08898",    // malva claro
    accentColor: "#C9B896",
    background: "#1A1618",
    textColor: "#EDE6E8",
    secondaryText: "#A09098",
    cardBackground: "#241E22",
    border: "#3A3036",
    success: "#7AAE7C",
    warning: "#D4AA5C",
    danger: "#C47070",
  },
  investor: {
    primaryColor: "#88B08C",    // verde litúrgico claro mutado
    accentColor: "#C9B896",
    background: "#141816",
    textColor: "#E4ECE6",
    secondaryText: "#88A08C",
    cardBackground: "#1C241E",
    border: "#2C3A30",
    success: "#7AAE7C",
    warning: "#D4AA5C",
    danger: "#C47070",
  },
  independent: {
    primaryColor: "#C9B896",    // ouro envelhecido claro
    accentColor: "#B8A888",
    background: "#161412",
    textColor: "#ECE8E0",
    secondaryText: "#9A9088",
    cardBackground: "#201E18",
    border: "#383428",
    success: "#7AAE7C",
    warning: "#D4AA5C",
    danger: "#C47070",
  },
};

const DEFAULT_THEME = THEMES.explorer;

export function getThemeForArchetype(
  archetype: string,
  isDark: boolean = false,
  isCatholic: boolean = false,
): ThemeColors {
  const key = archetype.toLowerCase() as ArchetypeThemeKey;
  let source: Record<ArchetypeThemeKey, ThemeColors>;
  if (isCatholic) {
    source = isDark ? CATHOLIC_DARK_THEMES : CATHOLIC_THEMES;
  } else {
    source = isDark ? DARK_THEMES : THEMES;
  }
  return source[key] ?? (isDark ? DARK_THEMES.explorer : DEFAULT_THEME);
}

export function getDefaultTheme(): ThemeColors {
  return DEFAULT_THEME;
}

export function getAllThemes(): Record<ArchetypeThemeKey, ThemeColors> {
  return { ...THEMES };
}

export function isValidArchetypeTheme(archetype: string): boolean {
  const key = archetype.toLowerCase() as ArchetypeThemeKey;
  return key in THEMES;
}
