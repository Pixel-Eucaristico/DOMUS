import { describe, it, expect } from "vitest";
import { keyboardTargetHeight, stickyOpenedOffset } from "../keyboardStickyOffset";

describe("stickyOpenedOffset (Stories 13.2 e 13.6, R3)", () => {
  it("teclado aberto mais alto que o inset: desconta o inset inteiro", () => {
    expect(stickyOpenedOffset(24, 300)).toBe(24);
  });

  it("teclado mais baixo que o inset (teclado físico, flutuante): nunca passa do teclado", () => {
    expect(stickyOpenedOffset(24, 16)).toBe(16);
    // translateY = −teclado + opened nunca fica positivo
    expect(-16 + stickyOpenedOffset(24, 16)).toBeLessThanOrEqual(0);
  });

  it("teclado fechado: fica o inset (não pula ao fechar)", () => {
    expect(stickyOpenedOffset(24, 0)).toBe(24);
    expect(stickyOpenedOffset(0, 0)).toBe(0);
  });

  it("entradas não finitas ou negativas valem 0", () => {
    expect(stickyOpenedOffset(Number.NaN, 300)).toBe(0);
    expect(stickyOpenedOffset(-10, 300)).toBe(0);
    expect(stickyOpenedOffset(24, Number.NaN)).toBe(24);
    expect(stickyOpenedOffset(24, -50)).toBe(24);
    expect(stickyOpenedOffset(Number.POSITIVE_INFINITY, 300)).toBe(0);
  });
});

describe("keyboardTargetHeight (Story 13.6, R2/R4)", () => {
  it("devolve a altura do evento, com não finitas ou negativas valendo 0", () => {
    expect(keyboardTargetHeight(300)).toBe(300);
    expect(keyboardTargetHeight(0)).toBe(0);
    expect(keyboardTargetHeight(-12)).toBe(0);
    expect(keyboardTargetHeight(Number.NaN)).toBe(0);
  });
});
