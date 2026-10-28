import { describe, it, expect } from "vitest";
import {
  skipHeaderMinHeight,
  SKIP_BUTTON_PADDING,
  SKIP_FONT_SIZE,
  SKIP_LINE_HEIGHT_FACTOR,
} from "../welcomeCarouselLayout";

describe("skipHeaderMinHeight (R8 da revisão da 13.4)", () => {
  const button = (top: number, scale: number) =>
    top + 2 * SKIP_BUTTON_PADDING + SKIP_FONT_SIZE * SKIP_LINE_HEIGHT_FACTOR * scale;

  it.each([1, 1.3, 2])("cobre o botão \"Pular\" inteiro com fonte %s×", (scale) => {
    for (const top of [20, 56]) {
      const min = skipHeaderMinHeight(top, scale);
      expect(min).toBeGreaterThanOrEqual(button(top, scale));
      expect(min - button(top, scale)).toBeLessThan(1);
    }
  });

  it("com fonte 2,0 no Android passa do cabeçalho de área segura pequena (24 + 16)", () => {
    expect(skipHeaderMinHeight(20, 2)).toBeGreaterThan(24 + 16);
  });

  it("cresce com a fonte", () => {
    expect(skipHeaderMinHeight(20, 2)).toBeGreaterThan(skipHeaderMinHeight(20, 1));
  });

  it("entradas inválidas usam topo 0 e fonte 1", () => {
    expect(skipHeaderMinHeight(Number.NaN, Number.NaN)).toBe(skipHeaderMinHeight(0, 1));
    expect(skipHeaderMinHeight(-5, 0)).toBe(skipHeaderMinHeight(0, 1));
  });
});
