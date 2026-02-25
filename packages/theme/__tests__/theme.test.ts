import { describe, it, expect } from "vitest";
import {
  getThemeForArchetype,
  getDefaultTheme,
  getAllThemes,
  isValidArchetypeTheme,
} from "../src/themeEngine";
import type { ThemeColors, ArchetypeThemeKey } from "../src/types";

const ARCHETYPES: ArchetypeThemeKey[] = [
  "explorer",
  "organizer",
  "planner",
  "strategist",
  "investor",
  "independent",
];

const REQUIRED_FIELDS: (keyof ThemeColors)[] = [
  "primaryColor",
  "accentColor",
  "background",
  "textColor",
  "secondaryText",
  "cardBackground",
  "border",
  "success",
  "warning",
  "danger",
];

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

const CHILDISH_COLORS = [
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
];

describe("themeEngine", () => {
  describe("getThemeForArchetype", () => {
    for (const archetype of ARCHETYPES) {
      it(`returns a theme for ${archetype}`, () => {
        const theme = getThemeForArchetype(archetype);
        expect(theme).toBeDefined();
        expect(theme.primaryColor).toBeTruthy();
      });
    }
  });

  describe("required fields", () => {
    for (const archetype of ARCHETYPES) {
      it(`${archetype} theme has all required fields`, () => {
        const theme = getThemeForArchetype(archetype);
        for (const field of REQUIRED_FIELDS) {
          expect(theme).toHaveProperty(field);
          expect(typeof theme[field]).toBe("string");
        }
      });
    }
  });

  describe("valid hex colors", () => {
    for (const archetype of ARCHETYPES) {
      it(`${archetype} theme uses valid hex colors`, () => {
        const theme = getThemeForArchetype(archetype);
        for (const field of REQUIRED_FIELDS) {
          expect(theme[field]).toMatch(HEX_REGEX);
        }
      });
    }
  });

  describe("getDefaultTheme", () => {
    it("returns explorer theme", () => {
      const defaultTheme = getDefaultTheme();
      const explorerTheme = getThemeForArchetype("explorer");
      expect(defaultTheme).toEqual(explorerTheme);
    });
  });

  describe("unknown archetype", () => {
    it("returns default theme for unknown archetype", () => {
      const theme = getThemeForArchetype("nonexistent");
      const defaultTheme = getDefaultTheme();
      expect(theme).toEqual(defaultTheme);
    });

    it("returns default theme for empty string", () => {
      const theme = getThemeForArchetype("");
      const defaultTheme = getDefaultTheme();
      expect(theme).toEqual(defaultTheme);
    });
  });

  describe("isValidArchetypeTheme", () => {
    for (const archetype of ARCHETYPES) {
      it(`returns true for valid archetype: ${archetype}`, () => {
        expect(isValidArchetypeTheme(archetype)).toBe(true);
      });
    }

    it("returns false for invalid archetype", () => {
      expect(isValidArchetypeTheme("wizard")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidArchetypeTheme("")).toBe(false);
    });
  });

  describe("getAllThemes", () => {
    it("returns all 6 themes", () => {
      const themes = getAllThemes();
      expect(Object.keys(themes)).toHaveLength(6);
      for (const archetype of ARCHETYPES) {
        expect(themes).toHaveProperty(archetype);
      }
    });
  });

  describe("visual distinctness", () => {
    it("all primary colors are different", () => {
      const primaries = ARCHETYPES.map(
        (a) => getThemeForArchetype(a).primaryColor,
      );
      const unique = new Set(primaries);
      expect(unique.size).toBe(ARCHETYPES.length);
    });
  });

  describe("no childish/saturated colors", () => {
    for (const archetype of ARCHETYPES) {
      it(`${archetype} theme has no pure saturated colors`, () => {
        const theme = getThemeForArchetype(archetype);
        for (const field of REQUIRED_FIELDS) {
          expect(CHILDISH_COLORS).not.toContain(theme[field].toUpperCase());
        }
      });
    }
  });
});
