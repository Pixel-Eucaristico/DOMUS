import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { HOME_HEADER_METRICS, computeHomeHeaderFit } from "../homeHeaderLayout";

const ROOT = path.resolve(__dirname, "../../../..");

describe("computeHomeHeaderFit", () => {
  it.each([320, 360, 390, 412])(
    "acomoda os 4 botões sem overflow na largura %idp",
    (screenWidth) => {
      const fit = computeHomeHeaderFit(screenWidth);

      expect(fit.actionsWidth).toBe(
        HOME_HEADER_METRICS.actionCount * HOME_HEADER_METRICS.buttonSize +
          (HOME_HEADER_METRICS.actionCount - 1) * HOME_HEADER_METRICS.actionsGap,
      );
      expect(fit.actionsWidth + HOME_HEADER_METRICS.horizontalPadding * 2).toBeLessThan(
        screenWidth,
      );
      expect(fit.totalReservedWidth).toBeLessThan(screenWidth);
      expect(fit.availableBrandWidth).toBeGreaterThan(0);
    },
  );

  it("nunca retorna availableBrandWidth negativo em larguras muito pequenas", () => {
    const fit = computeHomeHeaderFit(120);
    expect(fit.availableBrandWidth).toBe(0);
  });

  it("retorna availableBrandWidth = 0 quando screenWidth é NaN", () => {
    const fit = computeHomeHeaderFit(Number.NaN);
    expect(fit.availableBrandWidth).toBe(0);
    expect(Number.isFinite(fit.availableBrandWidth)).toBe(true);
  });
});

describe("proteção de área segura e cabeçalho responsivo nas telas", () => {
  it("app/(tabs)/index.tsx aplica paddingTop: insets.top + webTopInset no View raiz fora do ScrollView", () => {
    const src = fs.readFileSync(path.join(ROOT, "app/(tabs)/index.tsx"), "utf8");

    const rootMatch = src.match(
      /<View\s+style=\{\[\s*s\.root,\s*\{[\s\S]*?paddingTop:\s*insets\.top \+ webTopInset[\s\S]*?paddingLeft:\s*insets\.left[\s\S]*?paddingRight:\s*insets\.right[\s\S]*?\},?\s*\]\s*\}\s*>\s*<ScrollView/,
    );
    expect(rootMatch).not.toBeNull();

    // ScrollView não deve mais somar insets.top no contentContainerStyle
    expect(src).not.toMatch(/paddingTop:\s*insets\.top\s*\+\s*webTopInset\s*\+\s*16/);
    expect(src).toMatch(/paddingTop:\s*16/);

    // Cabeçalho usa métricas e encolhimento no bloco da marca sem encolher os botões
    expect(src).toContain("HOME_HEADER_METRICS");
    expect(src).toMatch(/headerBrand:\s*\{[^}]*flex:\s*1[^}]*minWidth:\s*0/s);
    expect(src).toMatch(/headerBrandText:\s*\{[^}]*flexShrink:\s*1[^}]*minWidth:\s*0/s);
    expect(src).toMatch(/headerActions:\s*\{[^}]*flexShrink:\s*0/s);
    expect(src).toMatch(/numberOfLines=\{1\}/);
    expect(src).toContain("adjustsFontSizeToFit");
  });

  it("app/add-transaction.tsx aplica paddingTop: insets.top + webTopInset no View raiz fora do KeyboardAwareScrollViewCompat", () => {
    const src = fs.readFileSync(path.join(ROOT, "app/add-transaction.tsx"), "utf8");

    const rootMatch = src.match(
      /<View\s+style=\{\[\s*s\.root,\s*\{[\s\S]*?paddingTop:\s*insets\.top \+ webTopInset[\s\S]*?paddingLeft:\s*insets\.left[\s\S]*?paddingRight:\s*insets\.right[\s\S]*?\},?\s*\]\s*\}\s*>\s*<KeyboardAwareScrollViewCompat/,
    );
    expect(rootMatch).not.toBeNull();

    expect(src).not.toMatch(/paddingTop:\s*insets\.top\s*\+\s*webTopInset\s*\+\s*16/);
    expect(src).toMatch(/paddingTop:\s*16/);
    expect(src).toContain("SCROLL_BOTTOM_PADDING");
  });
});
