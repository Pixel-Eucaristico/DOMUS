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

const DEFAULT_THEME = THEMES.explorer;

export function getThemeForArchetype(archetype: string): ThemeColors {
  const key = archetype.toLowerCase() as ArchetypeThemeKey;
  return THEMES[key] ?? DEFAULT_THEME;
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
