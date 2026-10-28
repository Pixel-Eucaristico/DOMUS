import { describe, it, expect } from "vitest";
import {
  backdropPressAction,
  computeFocusScrollDelta,
  computeFocusScrollTarget,
  computeKeyboardSheetLayout,
  keyboardLift,
  sheetKeyboardHeight,
  sheetLiftDiscount,
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

describe("sheetLiftDiscount", () => {
  it("é o paddingBottom da folha menos a folga", () => {
    expect(sheetLiftDiscount(48)).toBe(48 - SHEET_KEYBOARD_GAP);
    expect(sheetLiftDiscount(24)).toBe(24 - SHEET_KEYBOARD_GAP);
  });

  it("nunca é negativo; entrada inválida vale 0", () => {
    expect(sheetLiftDiscount(SHEET_KEYBOARD_GAP - 4)).toBe(0);
    expect(sheetLiftDiscount(Number.NaN)).toBe(0);
    expect(sheetLiftDiscount(-20)).toBe(0);
  });

  it("é o mesmo desconto que computeKeyboardSheetLayout usa no lift", () => {
    for (const pb of [0, 8, 20, 24, 48, 60]) {
      for (const kb of [0, 30, 200, 320]) {
        const r = computeKeyboardSheetLayout({ ...portrait, sheetPaddingBottom: pb, keyboardHeight: kb });
        expect(r.lift, `pb ${pb}, kb ${kb}`).toBe(keyboardLift(kb, sheetLiftDiscount(pb)));
      }
    }
  });
});

describe("sheetKeyboardHeight (estado do teclado ao montar)", () => {
  it("antes do primeiro evento depois de montar, a folha ignora o teclado", () => {
    expect(sheetKeyboardHeight(null)).toBe(0);
  });

  it("segue o keyboardDidShow e zera no keyboardDidHide", () => {
    expect(sheetKeyboardHeight({ type: "keyboardDidShow", height: 320 })).toBe(320);
    expect(sheetKeyboardHeight({ type: "keyboardDidHide", height: 320 })).toBe(0);
    expect(sheetKeyboardHeight({ type: "keyboardDidShow", height: Number.NaN })).toBe(0);
  });
});

describe("backdropPressAction (toque no fundo)", () => {
  it("com o teclado aberto, o primeiro toque só fecha o teclado", () => {
    expect(backdropPressAction(true)).toBe("dismissKeyboard");
  });

  it("com o teclado fechado (e na web), fecha o modal", () => {
    expect(backdropPressAction(false)).toBe("close");
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

  it("paisagem 800×360 com teclado de 200: sem o rodapé ainda sobra espaço, o cabeçalho fica fixo", () => {
    const r = computeKeyboardSheetLayout({
      windowHeight: 360,
      keyboardHeight: 200,
      insetTop: 0,
      sheetPaddingBottom: 24,
      headerHeight: 60,
      footerHeight: 64,
      maxHeightRatio: 0.9,
    });
    expect(r.footerPinned).toBe(false);
    expect(r.sheetMaxHeight - 60 - 24).toBeGreaterThanOrEqual(MIN_FIELD_SPACE);
    expect(r.headerPinned).toBe(true);
  });

  it("paisagem 800×360 com teclado de 240: nem sem o rodapé cabe, o cabeçalho também entra na rolagem", () => {
    const r = computeKeyboardSheetLayout({
      windowHeight: 360,
      keyboardHeight: 240,
      insetTop: 0,
      sheetPaddingBottom: 24,
      headerHeight: 60,
      footerHeight: 64,
      maxHeightRatio: 0.9,
    });
    // sheetMaxHeight = 360 − 8 − (240 − 12) = 124; sem o rodapé: 124 − 60 − 24 = 40 < 48.
    expect(r.sheetMaxHeight).toBe(124);
    expect(r.footerPinned).toBe(false);
    expect(r.headerPinned).toBe(false);
  });

  it("limite exato do cabeçalho: fixo com 48 sem o rodapé, solto com 47", () => {
    // sheetMaxHeight = 584 (retrato com teclado de 320); sem o rodapé: 584 − header − 48.
    const base = { ...portrait, keyboardHeight: 320, footerHeight: 600 };
    const atLimit = computeKeyboardSheetLayout({ ...base, headerHeight: 584 - 48 - 48 });
    expect(atLimit.footerPinned).toBe(false);
    expect(atLimit.headerPinned).toBe(true);
    const below = computeKeyboardSheetLayout({ ...base, headerHeight: 584 - 48 - 47 });
    expect(below.headerPinned).toBe(false);
  });

  it("rodapé fixo implica cabeçalho fixo; teclado fechado deixa os dois fixos", () => {
    expect(computeKeyboardSheetLayout({ ...portrait, keyboardHeight: 320 }).headerPinned).toBe(true);
    const closed = computeKeyboardSheetLayout({ ...portrait, windowHeight: 200, headerHeight: 400, keyboardHeight: 0 });
    expect(closed.footerPinned).toBe(true);
    expect(closed.headerPinned).toBe(true);
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
    expect(r).toEqual({ lift: 0, sheetMaxHeight: 0, scrollSpace: 0, footerPinned: true, headerPinned: true });
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

describe("computeFocusScrollTarget (posição medida, sem scrollY guardado)", () => {
  // Área visível de 400 a partir de y=100 na janela; conteúdo rolado 300 (topo do conteúdo em −200).
  const base = { contentWindowY: -200, viewportWindowY: 100, viewportHeight: 400, gap: 12 };

  it("campo abaixo da área: rola a partir da posição medida", () => {
    // campo em 680..724 no conteúdo → 380..424 na área → passa 36 do fundo − folga (388).
    expect(computeFocusScrollTarget({ ...base, inputY: 680, inputHeight: 44 })).toBe(300 + (424 - 388));
  });

  it("campo acima da área: rola para cima", () => {
    expect(computeFocusScrollTarget({ ...base, inputY: 250, inputHeight: 44 })).toBe(250 - 12);
  });

  it("campo visível: não rola", () => {
    expect(computeFocusScrollTarget({ ...base, inputY: 400, inputHeight: 44 })).toBeNull();
  });

  it("a posição atual vem das medidas: o mesmo campo com o conteúdo sem rolar pede outro alvo", () => {
    const unscrolled = { ...base, contentWindowY: 100 };
    expect(computeFocusScrollTarget({ ...unscrolled, inputY: 680, inputHeight: 44 })).toBe(724 - 388);
    expect(computeFocusScrollTarget({ ...unscrolled, inputY: 250, inputHeight: 44 })).toBeNull();
  });

  it("nunca rola para antes do começo", () => {
    expect(computeFocusScrollTarget({ ...base, contentWindowY: 90, inputY: 0, inputHeight: 44 })).toBe(0);
  });

  it("medidas inválidas não rolam", () => {
    expect(computeFocusScrollTarget({ ...base, inputY: Number.NaN, inputHeight: 44 })).toBeNull();
    expect(computeFocusScrollTarget({ ...base, inputY: 10, inputHeight: -1 })).toBeNull();
    expect(computeFocusScrollTarget({ ...base, viewportHeight: 0, inputY: 10, inputHeight: 44 })).toBeNull();
  });
});
