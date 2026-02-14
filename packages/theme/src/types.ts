export interface ThemeColors {
  primaryColor: string;
  accentColor: string;
  background: string;
  textColor: string;
  secondaryText: string;
  cardBackground: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

export type ArchetypeThemeKey =
  | "explorer"
  | "organizer"
  | "planner"
  | "strategist"
  | "investor"
  | "independent";
