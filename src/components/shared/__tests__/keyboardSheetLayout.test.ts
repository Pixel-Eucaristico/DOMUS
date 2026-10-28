import { describe, it, expect } from "vitest";
import {
  computeFocusScrollDelta,
  computeKeyboardSheetLayout,
  keyboardLift,
  MIN_FIELD_SPACE,
  SHEET_KEYBOARD_GAP,
  SHEET_TOP_GAP,
} from "../keyboardSheetLayout";
import { MIN_FIELD_SPACE as DEFAULTS_MIN_FIELD_SPACE } from "@/components/keyboardScrollDefaults";
import { MIN_FIELD_SPACE as PARSED_MIN_FIELD_SPACE } from "@/src/components/invoice/parsedFooterLayout";

describe("constantes (Story 13.3)", () => {
  it("MIN_FIELD_SPACE vem de keyboardScrollDefaults e é o mesmo da 13.2", () => {
    expect(MIN_FIELD_SPACE).toBe(48);
    expect(DEFAULTS_MIN_FIELD_SPACE).toBe(MIN_FIELD_SPACE);
    expect(PARSED_MIN_FIELD_SPACE).toBe(MIN_FIELD_SPACE);
  });

  it("a folga entre a folha e o teclado respeita os 8 dp do FR-29", () => {
    expect(SHEET_KEYBOARD_GAP).toBeGreaterThanOrEqual(8);
    expect(SHEET_TOP_GAP).toBeGreaterThanOrEqual(0);
  });
});

describe("keyboardLift", () => {
  it("teclado fechado dá 0", () => {
    expect(keyboardLift(0, 0)).toBe(0);
    expect(keyboardLift(0, 36)).toBe(0);
  });

  it("desconta da altura do teclado", () => {
    expect(keyboardLift(320, 36)).toBe(284);
    expect(keyboardLift(320, 0)).toBe(320);
  });

  it("desconto maior que o teclado dá 0", () => {
    expect(keyboardLift(20, 36)).toBe(0);
    expect(keyboardLift(36, 36)).toBe(0);
  });

  it.each([
    [-10, 10],
    [Number.NaN, 10],
    [Number.POSITIVE_INFINITY, 10],
    [Number.NEGATIVE_INFINITY, 10],
  ])("teclado inválido (%s) dá 0", (keyboard, discount) => {
    expect(keyboardLift(keyboard, discount)).toBe(0);
  });

  it("desconto inválido ou negativo vale 0", () => {
    expect(keyboardLift(300, -12)).toBe(300);
    expect(keyboardLift(300, Number.NaN)).toBe(300);
    expect(keyboardLift(300, Number.POSITIVE_INFINITY)).toBe(300);
  });

  it("curva contínua e monótona, nunca maior que o teclado", () => {
    const discount = 36;
    let prev = keyboardLift(0, discount);
    for (let h = 0; h <= 400; h += 0.5) {
      const v = keyboardLift(h, discount);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v - prev).toBeLessThanOrEqual(0.5 + 1e-9);
      expect(v).toBeLessThanOrEqual(h);
      prev = v;
    }
  });
});

// Retrato: janela 412×900, status 24, folha com paddingBottom 48 (navegação de
// 3 botões), cabeçalho até 76, rodapé 64, 85% da janela.
const portrait = {
  windowHeight: 900,
  insetTop: 24,
  sheetPaddingBottom: 48,
  headerHeight: 76,
  footerHeight: 64,
  maxHeightRatio: 0.85,
};

describe("computeKeyboardSheetLayout", () => {
  it("retrato 412×900 com teclado de 320: rodapé fixo e conteúdo a SHEET_KEYBOARD_GAP do teclado", () => {
    const r = computeKeyboardSheetLayout({ ...portrait, keyboardHeight: 320 });
    expect(r.lift).toBe(320 - (48 - SHEET_KEYBOARD_GAP));
    expect(r.sheetMaxHeight).toBe(900 - 24 - SHEET_TOP_GAP - r.lift);
    expect(r.scrollSpace).toBe(r.sheetMaxHeight - 76 - 64 - 48);
    expect(r.footerPinned).toBe(true);
    // Fundo do conteúdo da folha = janela − espaçador − paddingBottom = topo do teclado − folga.
    const contentBottom = 900 - r.lift - 48;
    expect(900 - 320 - contentBottom).toBe(SHEET_KEYBOARD_GAP);
  });

  it("paisagem 800×360 com teclado de 200: rodapé vai para o fim da rolagem", () => {
    const r = computeKeyboardSheetLayout({
      windowHeight: 360,
      keyboardHeight: 200,
      insetTop: 0,
      sheetPaddingBottom: 24,
      headerHeight: 60,
      footerHeight: 64,
      maxHeightRatio: 0.9,
    });
    expect(r.lift).toBe(200 - (24 - SHEET_KEYBOARD_GAP));
    expect(r.sheetMaxHeight).toBe(360 - SHEET_TOP_GAP - r.lift);
    expect(r.scrollSpace).toBeLessThan(MIN_FIELD_SPACE);
    expect(r.footerPinned).toBe(false);
  });

  it("limite exato de MIN_FIELD_SPACE: fixo em 48, solto em 47", () => {
    // sheetMaxHeight = 900 − 24 − 8 − (320 − 36) = 584; scrollSpace = 584 − header − 64 − 48.
    const atLimit = computeKeyboardSheetLayout({ ...portrait, keyboardHeight: 320, headerHeight: 584 - 64 - 48 - 48 });
    expect(atLimit.scrollSpace).toBe(MIN_FIELD_SPACE);
    expect(atLimit.footerPinned).toBe(true);
    const below = computeKeyboardSheetLayout({ ...portrait, keyboardHeight: 320, headerHeight: 584 - 64 - 48 - 47 });
    expect(below.scrollSpace).toBe(MIN_FIELD_SPACE - 1);
    expect(below.footerPinned).toBe(false);
  });

  it.each([
    { ...portrait },
    { ...portrait, windowHeight: 360, maxHeightRatio: 0.9, headerHeight: 300 },
    { ...portrait, footerHeight: 2000 },
  ])("teclado fechado: rodapé sempre fixo e lift 0 (%#)", (input) => {
    const r = computeKeyboardSheetLayout({ ...input, keyboardHeight: 0 });
    expect(r.lift).toBe(0);
    expect(r.footerPinned).toBe(true);
  });

  it("teclado fechado: a folha fica no limite da proporção", () => {
    const r = computeKeyboardSheetLayout({ ...portrait, keyboardHeight: 0 });
    expect(r.sheetMaxHeight).toBe(0.85 * 900);
  });

  it("teclado menor que o desconto não ergue a folha", () => {
    const r = computeKeyboardSheetLayout({ ...portrait, keyboardHeight: 30 });
    expect(r.lift).toBe(0);
  });

  it("a folha nunca entra embaixo da barra de status", () => {
    const r = computeKeyboardSheetLayout({ ...portrait, maxHeightRatio: 1, keyboardHeight: 0 });
    expect(r.sheetMaxHeight).toBe(900 - 24 - SHEET_TOP_GAP);
  });

  it("entradas inválidas não dão negativo nem NaN", () => {
    const r = computeKeyboardSheetLayout({
      windowHeight: Number.NaN,
      keyboardHeight: -5,
      insetTop: Number.POSITIVE_INFINITY,
      sheetPaddingBottom: -1,
      headerHeight: Number.NaN,
      footerHeight: -10,
      maxHeightRatio: 3,
    });
    expect(r).toEqual({ lift: 0, sheetMaxHeight: 0, scrollSpace: 0, footerPinned: true });
  });
});

describe("computeFocusScrollDelta", () => {
  const viewport = { viewportTop: 100, viewportBottom: 500, gap: 12 };

  it("campo abaixo da área: rola para baixo até a folga", () => {
    const d = computeFocusScrollDelta({ ...viewport, inputTop: 480, inputBottom: 524 });
    expect(d).toBe(524 - (500 - 12));
    expect(524 - d).toBe(500 - 12);
  });

  it("campo acima da área: rola para cima até a folga", () => {
    const d = computeFocusScrollDelta({ ...viewport, inputTop: 60, inputBottom: 104 });
    expect(d).toBe(60 - (100 + 12));
    expect(60 - d).toBe(100 + 12);
  });

  it("campo já visível com folga: não rola", () => {
    expect(computeFocusScrollDelta({ ...viewport, inputTop: 200, inputBottom: 244 })).toBe(0);
    expect(computeFocusScrollDelta({ ...viewport, inputTop: 112, inputBottom: 488 })).toBe(0);
  });

  it("a folga é respeitada: campo encostado na borda rola", () => {
    expect(computeFocusScrollDelta({ ...viewport, inputTop: 444, inputBottom: 492 })).toBe(4);
    expect(computeFocusScrollDelta({ ...viewport, inputTop: 108, inputBottom: 150 })).toBe(-4);
  });

  it("campo maior que a área: alinha pelo topo", () => {
    expect(computeFocusScrollDelta({ ...viewport, inputTop: 300, inputBottom: 800 })).toBe(300 - 112);
    expect(computeFocusScrollDelta({ ...viewport, inputTop: 20, inputBottom: 700 })).toBe(20 - 112);
  });

  it("medidas inválidas não rolam", () => {
    expect(computeFocusScrollDelta({ ...viewport, inputTop: Number.NaN, inputBottom: 10 })).toBe(0);
    expect(computeFocusScrollDelta({ ...viewport, inputTop: 50, inputBottom: 40 })).toBe(0);
    expect(computeFocusScrollDelta({ inputTop: 0, inputBottom: 40, viewportTop: 100, viewportBottom: 100, gap: 8 })).toBe(0);
  });
});
