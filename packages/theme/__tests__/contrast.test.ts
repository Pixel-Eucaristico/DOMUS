import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  getRelativeLuminance,
  isLightColor,
  getContrastTextColor,
  getOnPrimaryTokens,
  resolvePrimaryButtonTextColor,
} from "../src/contrast";
import { getThemeForArchetype } from "../src/themeEngine";
import type { ArchetypeThemeKey } from "../src/types";

const ARCHETYPES: ArchetypeThemeKey[] = [
  "explorer",
  "organizer",
  "planner",
  "strategist",
  "investor",
  "independent",
];

const ROOT = path.resolve(__dirname, "../../..");

describe("contrast utilities", () => {
  it("retorna texto escuro (#1A1814) para cores primárias bege e claras", () => {
    for (const hex of ["#C9B896", "#B8A888", "#D6D3D1", "#8AA0B0"]) {
      expect(isLightColor(hex)).toBe(true);
      expect(getContrastTextColor(hex)).toBe("#1A1814");
      const tokens = getOnPrimaryTokens(hex);
      expect(tokens.isLight).toBe(true);
      expect(tokens.text).toBe("#1A1814");
      expect(tokens.muted).toBe("rgba(26,24,20,0.75)");
      expect(tokens.subtle).toBe("rgba(26,24,20,0.6)");
    }
  });

  it("retorna texto branco (#FFFFFF) para cores primárias escuras abaixo do limiar 0.198", () => {
    for (const hex of ["#1E3A5F", "#2E7D32", "#6366F1", "#1A73E8", "#5B6ABF"]) {
      expect(isLightColor(hex)).toBe(false);
      expect(getContrastTextColor(hex)).toBe("#FFFFFF");
      const tokens = getOnPrimaryTokens(hex);
      expect(tokens.isLight).toBe(false);
      expect(tokens.text).toBe("#FFFFFF");
      expect(tokens.muted).toBe("rgba(255,255,255,0.7)");
      expect(tokens.subtle).toBe("rgba(255,255,255,0.5)");
    }
  });

  it("suporta #RGB, #RGBA, #RRGGBBAA (descarta alpha < 128) e faz fallback seguro", () => {
    expect(isLightColor("#FFF")).toBe(true);
    expect(getContrastTextColor("#FFF")).toBe("#1A1814");

    expect(isLightColor("#FFF8")).toBe(true);
    expect(getContrastTextColor("#FFF8")).toBe("#1A1814");

    expect(isLightColor("#FFF3")).toBe(false);
    expect(getContrastTextColor("#FFF3")).toBe("#FFFFFF");

    expect(isLightColor("#FFFFFF33")).toBe(false);
    expect(getContrastTextColor("#FFFFFF33")).toBe("#FFFFFF");

    expect(isLightColor("#FFFFFFCC")).toBe(true);
    expect(getContrastTextColor("#FFFFFFCC")).toBe("#1A1814");

    expect(isLightColor("#000")).toBe(false);
    expect(getContrastTextColor("#000")).toBe("#FFFFFF");
    expect(isLightColor("#000F")).toBe(false);
    expect(getContrastTextColor("#000F")).toBe("#FFFFFF");

    expect(isLightColor("")).toBe(false);
    expect(getContrastTextColor("")).toBe("#FFFFFF");

    expect(isLightColor("invalid")).toBe(false);
    expect(getContrastTextColor("invalid")).toBe("#FFFFFF");
  });

  it("classifica corretamente todas as paletas do themeEngine (incluindo DARK_THEMES)", () => {
    for (const arch of ARCHETYPES) {
      // Temas claros padrão têm primaryColor escuro -> texto branco
      const light = getThemeForArchetype(arch, false, false);
      expect(getContrastTextColor(light.primaryColor)).toBe("#FFFFFF");

      // Temas católicos claros: apenas explorer (#8C7A5B, L ≈ 0.203 > 0.198) fica acima do crossover
      const catholicLight = getThemeForArchetype(arch, false, true);
      const catholicLum = getRelativeLuminance(catholicLight.primaryColor)!;
      expect(getContrastTextColor(catholicLight.primaryColor)).toBe(
        catholicLum > 0.198 ? "#1A1814" : "#FFFFFF",
      );

      // Todos os temas católicos escuros têm primaryColor claro/bege -> texto escuro
      const catholicDark = getThemeForArchetype(arch, true, true);
      expect(isLightColor(catholicDark.primaryColor)).toBe(true);
      expect(getContrastTextColor(catholicDark.primaryColor)).toBe("#1A1814");

      // Todos os DARK_THEMES respeitam o limiar 0.198 (incluindo planner #3B82F6 > 0.198 -> #1A1814, organizer #5B6ABF < 0.198 -> #FFFFFF)
      const dark = getThemeForArchetype(arch, true, false);
      const darkLum = getRelativeLuminance(dark.primaryColor)!;
      expect(getContrastTextColor(dark.primaryColor)).toBe(
        darkLum > 0.198 ? "#1A1814" : "#FFFFFF",
      );
    }

    // DARK_THEMES.planner (#3B82F6) e independent (#D6D3D1) exigem texto escuro
    expect(getContrastTextColor(getThemeForArchetype("planner", true, false).primaryColor)).toBe("#1A1814");
    expect(getContrastTextColor(getThemeForArchetype("independent", true, false).primaryColor)).toBe("#1A1814");
    expect(getContrastTextColor(getThemeForArchetype("organizer", true, false).primaryColor)).toBe("#FFFFFF");
  });

  it("resolvePrimaryButtonTextColor cobre variantes, shorthand bg, color explícito e não-hex", () => {
    expect(
      resolvePrimaryButtonTextColor({ variant: "primary", backgroundColor: "#C9B896" }),
    ).toBe("#1A1814");
    expect(
      resolvePrimaryButtonTextColor({ variant: undefined, backgroundColor: "#C9B896" }),
    ).toBe("#1A1814");
    expect(
      resolvePrimaryButtonTextColor({ variant: "primary", backgroundColor: "#1E3A5F" }),
    ).toBe("#FFFFFF");

    // Shorthand bg e precedência de backgroundColor
    expect(resolvePrimaryButtonTextColor({ bg: "#C9B896" })).toBe("#1A1814");
    expect(
      resolvePrimaryButtonTextColor({ backgroundColor: "#1E3A5F", bg: "#C9B896" }),
    ).toBe("#FFFFFF");

    // Outras variantes não recebem override
    for (const variant of ["outline", "danger", "ghost"]) {
      expect(
        resolvePrimaryButtonTextColor({ variant, backgroundColor: "#C9B896" }),
      ).toBeUndefined();
    }

    // color explícito preserva o valor do chamador
    expect(
      resolvePrimaryButtonTextColor({ variant: "primary", backgroundColor: "#C9B896", color: "#FF0000" }),
    ).toBeUndefined();

    // Valores não-hex ou ausentes retornam undefined
    expect(resolvePrimaryButtonTextColor({ backgroundColor: "$primary" })).toBeUndefined();
    expect(resolvePrimaryButtonTextColor({ backgroundColor: "transparent" })).toBeUndefined();
    expect(resolvePrimaryButtonTextColor({})).toBeUndefined();
  });
});

describe("padronização estrutural de TInput e legibilidade", () => {
  it("ContactForm.tsx, add-transaction.tsx e ocr-settings.tsx usam backgroundColor= sem background=", () => {
    const contactForm = fs.readFileSync(
      path.join(ROOT, "src/components/about/ContactForm.tsx"),
      "utf8",
    );
    expect(contactForm).toContain("backgroundColor={theme.background}");
    expect(contactForm).not.toMatch(/\bbackground=\{/);

    const addTx = fs.readFileSync(
      path.join(ROOT, "app/add-transaction.tsx"),
      "utf8",
    );
    expect(addTx).toContain('backgroundColor="transparent"');
    expect(addTx).not.toMatch(/\bbackground="/);

    const ocrSettings = fs.readFileSync(
      path.join(ROOT, "app/ocr-settings.tsx"),
      "utf8",
    );
    expect(ocrSettings).toContain('backgroundColor="transparent"');
    expect(ocrSettings).not.toMatch(/\bbackground="/);
  });

  it("TrophyAlbumView.tsx e SurpriseTrophyCard.tsx não reduzem opacidade no ÁLBUM e texto explicativo", () => {
    const albumView = fs.readFileSync(
      path.join(ROOT, "src/components/gamification/TrophyAlbumView.tsx"),
      "utf8",
    );
    expect(albumView).not.toContain("opacity={0.6}");

    const surpriseCard = fs.readFileSync(
      path.join(ROOT, "src/components/gamification/SurpriseTrophyCard.tsx"),
      "utf8",
    );
    expect(surpriseCard).not.toMatch(/surpriseInfo:\s*\{[^}]*opacity:/);
    expect(surpriseCard).not.toMatch(/surpriseSubtitle:\s*\{[^}]*opacity:/);
  });
});
