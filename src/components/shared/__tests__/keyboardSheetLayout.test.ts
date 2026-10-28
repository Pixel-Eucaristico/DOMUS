import { describe, it, expect } from "vitest";
import {
  backdropPressAction,
  computeFocusScrollDelta,
  computeFocusScrollTarget,
  computeKeyboardListSheetLayout,
  computeKeyboardSheetLayout,
  listSheetHeaderHeight,
  listSheetSlots,
  keyboardLift,
  sheetKeyboardHeight,
  sheetLiftDiscount,
  sheetPaddingBottomFor,
  sheetRootPadding,
  DIALOG_EDGE_PADDING,
  MIN_FIELD_SPACE,
  MIN_LIST_SPACE,
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

// ─── Story 13.4 ──────────────────────────────────────────────────────────────

describe("placement (Story 13.4)", () => {
  it("sheetLiftDiscount: no diálogo centrado é o insets.bottom (a raiz já reserva a barra de navegação)", () => {
    expect(sheetLiftDiscount(24, "center")).toBe(0);
    expect(sheetLiftDiscount(24, "center", 48)).toBe(48);
    expect(keyboardLift(320, sheetLiftDiscount(24, "center", 48))).toBe(320 - 48);
    expect(sheetLiftDiscount(24, "center", Number.NaN)).toBe(0);
  });

  it("sheetLiftDiscount: bottom (padrão) e fill descontam como na 13.3, sem olhar o insets.bottom", () => {
    expect(sheetLiftDiscount(48, "bottom")).toBe(sheetLiftDiscount(48));
    expect(sheetLiftDiscount(48, "bottom", 48)).toBe(48 - SHEET_KEYBOARD_GAP);
    expect(sheetLiftDiscount(48, "fill")).toBe(48 - SHEET_KEYBOARD_GAP);
  });

  it("sheetPaddingBottomFor: max(insets.bottom, base) embaixo e na tela cheia; só a base no diálogo", () => {
    expect(sheetPaddingBottomFor(48, 20)).toBe(48);
    expect(sheetPaddingBottomFor(0, 20)).toBe(20);
    expect(sheetPaddingBottomFor(48, 64, "fill")).toBe(64);
    expect(sheetPaddingBottomFor(48, 24, "center")).toBe(24);
    expect(sheetPaddingBottomFor(Number.NaN, -1)).toBe(0);
  });

  it("sheetRootPadding: bottom só no topo; center com a margem do diálogo mais a barra de navegação; fill sem padding", () => {
    expect(sheetRootPadding(24)).toEqual({ top: 24 + SHEET_TOP_GAP, bottom: 0, horizontal: 0 });
    expect(sheetRootPadding(24, "bottom", 48)).toEqual({ top: 24 + SHEET_TOP_GAP, bottom: 0, horizontal: 0 });
    expect(sheetRootPadding(24, "center", 48)).toEqual({
      top: 24 + SHEET_TOP_GAP,
      bottom: DIALOG_EDGE_PADDING + 48,
      horizontal: DIALOG_EDGE_PADDING,
    });
    expect(sheetRootPadding(24, "fill", 48)).toEqual({ top: 0, bottom: 0, horizontal: 0 });
    expect(DIALOG_EDGE_PADDING).toBeGreaterThanOrEqual(8);
  });

  it('o padrão é "bottom": mesmo resultado com e sem placement, e o insetBottom não muda nada', () => {
    for (const kb of [0, 200, 320]) {
      const input = { ...portrait, keyboardHeight: kb };
      expect(computeKeyboardSheetLayout({ ...input, placement: "bottom", insetBottom: 48 })).toEqual(
        computeKeyboardSheetLayout(input),
      );
    }
  });

  // Diálogo: janela 412×900, status 24, barra de navegação 48 (3 botões), cartão com paddingBottom 24.
  const dialog = {
    windowHeight: 900,
    insetTop: 24,
    insetBottom: 48,
    sheetPaddingBottom: sheetPaddingBottomFor(48, 24, "center"),
    headerHeight: 120,
    footerHeight: 56,
    maxHeightRatio: 1,
    placement: "center" as const,
  };

  it("center com teclado fechado: o cartão fica entre a barra de status e a barra de navegação, com as margens (R3)", () => {
    const r = computeKeyboardSheetLayout({ ...dialog, keyboardHeight: 0 });
    expect(r.lift).toBe(0);
    expect(r.sheetMaxHeight).toBe(900 - 24 - SHEET_TOP_GAP - DIALOG_EDGE_PADDING - 48);
    // Pior caso (cartão do tamanho máximo): termina a DIALOG_EDGE_PADDING da barra de navegação.
    const cardBottom = 24 + SHEET_TOP_GAP + r.sheetMaxHeight;
    expect(900 - 48 - cardBottom).toBe(DIALOG_EDGE_PADDING);
  });

  it("center, retrato 412×900 com teclado de 320 (já com a barra): a barra de navegação não conta duas vezes", () => {
    const r = computeKeyboardSheetLayout({ ...dialog, keyboardHeight: 320 });
    expect(r.lift).toBe(320 - 48);
    expect(r.sheetMaxHeight).toBe(900 - 24 - SHEET_TOP_GAP - DIALOG_EDGE_PADDING - 320);
    const cardBottom = 24 + SHEET_TOP_GAP + r.sheetMaxHeight;
    expect(900 - 320 - cardBottom).toBe(DIALOG_EDGE_PADDING);
    // O topo desconta a barra de status uma vez só.
    expect(cardBottom - r.sheetMaxHeight).toBe(24 + SHEET_TOP_GAP);
    expect(r.footerPinned).toBe(true);
  });

  it("center, paisagem 800×360 com teclado de 200: o rodapé vai para a rolagem (D-3 da 13.3)", () => {
    const r = computeKeyboardSheetLayout({
      ...dialog,
      windowHeight: 360,
      insetTop: 0,
      insetBottom: 0,
      headerHeight: 110,
      keyboardHeight: 200,
    });
    expect(r.sheetMaxHeight).toBe(360 - SHEET_TOP_GAP - DIALOG_EDGE_PADDING - 200);
    expect(r.footerPinned).toBe(false);
  });

  it("fill: a folha vai do topo da tela até o espaçador", () => {
    const pb = sheetPaddingBottomFor(48, 48 + 16, "fill");
    const base = {
      windowHeight: 900,
      insetTop: 24,
      sheetPaddingBottom: pb,
      headerHeight: 40,
      footerHeight: 64,
      maxHeightRatio: 1,
      placement: "fill" as const,
    };
    expect(computeKeyboardSheetLayout({ ...base, keyboardHeight: 0 }).sheetMaxHeight).toBe(900);
    const open = computeKeyboardSheetLayout({ ...base, keyboardHeight: 320 });
    expect(open.lift).toBe(320 - (pb - SHEET_KEYBOARD_GAP));
    expect(open.sheetMaxHeight).toBe(900 - open.lift);
    // Barra "Começar Tour!" logo acima do teclado, com a folga.
    expect(900 - 320 - (900 - open.lift - pb)).toBe(SHEET_KEYBOARD_GAP);
    expect(open.footerPinned).toBe(true);
  });
});

// Busca: janela 412×900, status 24, paddingBottom 20, cabeçalho com o título
// até 130 (alça, título, busca), 80% da janela.
const listPortrait = {
  windowHeight: 900,
  insetTop: 24,
  sheetPaddingBottom: 20,
  headerHeight: 130,
  maxHeightRatio: 0.8,
};

describe("computeKeyboardListSheetLayout (Story 13.4)", () => {
  it("MIN_LIST_SPACE é uma linha (MIN_FIELD_SPACE)", () => {
    expect(MIN_LIST_SPACE).toBe(MIN_FIELD_SPACE);
  });

  it("retrato 412×900 com teclado de 320: título à mostra e lista com pelo menos uma linha", () => {
    const r = computeKeyboardListSheetLayout({ ...listPortrait, keyboardHeight: 320 });
    expect(r.lift).toBe(320 - (20 - SHEET_KEYBOARD_GAP));
    expect(r.sheetMaxHeight).toBe(900 - 24 - SHEET_TOP_GAP - r.lift);
    expect(r.sheetMaxHeight - 130 - 20).toBeGreaterThanOrEqual(MIN_LIST_SPACE);
    expect(r.titleCollapsed).toBe(false);
    // Fundo da lista = topo do teclado − folga (≥ 8 dp do FR-29).
    expect(900 - 320 - (900 - r.lift - 20)).toBe(SHEET_KEYBOARD_GAP);
  });

  it("paisagem 800×360 com teclado de 200: o título recolhe (R-1)", () => {
    const r = computeKeyboardListSheetLayout({ ...listPortrait, windowHeight: 360, insetTop: 0, keyboardHeight: 200 });
    // sheetMaxHeight = 360 − 8 − (200 − 8) = 160; com o título: 160 − 130 − 20 = 10 < 48.
    expect(r.sheetMaxHeight).toBe(160);
    expect(r.titleCollapsed).toBe(true);
  });

  it("limite exato de MIN_LIST_SPACE: título à mostra com 48, recolhido com 47", () => {
    // sheetMaxHeight = 900 − 24 − 8 − (320 − 8) = 556; lista = 556 − header − 20.
    expect(computeKeyboardListSheetLayout({ ...listPortrait, keyboardHeight: 320, headerHeight: 556 - 20 - 48 }).titleCollapsed).toBe(false);
    expect(computeKeyboardListSheetLayout({ ...listPortrait, keyboardHeight: 320, headerHeight: 556 - 20 - 47 }).titleCollapsed).toBe(true);
  });

  it.each([
    { ...listPortrait },
    { ...listPortrait, windowHeight: 360, headerHeight: 400 },
    { ...listPortrait, windowHeight: 100 },
  ])("teclado fechado: título à mostra e lift 0 (%#)", (input) => {
    const r = computeKeyboardListSheetLayout({ ...input, keyboardHeight: 0 });
    expect(r.lift).toBe(0);
    expect(r.titleCollapsed).toBe(false);
  });

  it("altura fixa (heightRatio 0,85 do DebugTools) encolhe com o teclado e volta ao fechar", () => {
    const base = { ...listPortrait, maxHeightRatio: 0.85 };
    const closed = computeKeyboardListSheetLayout({ ...base, keyboardHeight: 0 });
    expect(closed.sheetMaxHeight).toBe(0.85 * 900);
    const open = computeKeyboardListSheetLayout({ ...base, keyboardHeight: 320 });
    expect(open.sheetMaxHeight).toBe(900 - 24 - SHEET_TOP_GAP - open.lift);
    expect(open.sheetMaxHeight).toBeLessThan(closed.sheetMaxHeight);
    expect(computeKeyboardListSheetLayout({ ...base, keyboardHeight: 0 })).toEqual(closed);
  });

  it("mesmas contas de lift e altura do KeyboardSheet (bottom)", () => {
    for (const kb of [0, 30, 200, 320]) {
      const list = computeKeyboardListSheetLayout({ ...listPortrait, keyboardHeight: kb });
      const sheet = computeKeyboardSheetLayout({ ...listPortrait, footerHeight: 0, keyboardHeight: kb });
      expect(list.lift).toBe(sheet.lift);
      expect(list.sheetMaxHeight).toBe(sheet.sheetMaxHeight);
    }
  });

  it("entradas inválidas não dão negativo nem NaN", () => {
    const r = computeKeyboardListSheetLayout({
      windowHeight: Number.NaN,
      keyboardHeight: -5,
      insetTop: Number.POSITIVE_INFINITY,
      sheetPaddingBottom: -1,
      headerHeight: Number.NaN,
      maxHeightRatio: 3,
    });
    expect(r).toEqual({ lift: 0, sheetMaxHeight: 0, titleCollapsed: false });
  });
});

describe("folha de busca: o campo nunca remonta ao recolher o título (R1 da revisão)", () => {
  it("a busca e a lista ficam no mesmo índice com o título à mostra e recolhido", () => {
    const open = listSheetSlots(false);
    const collapsed = listSheetSlots(true);
    expect(open).toEqual(["title", "search", "list"]);
    expect(collapsed).toEqual([null, "search", "list"]);
    expect(open.length).toBe(collapsed.length);
    for (const slot of ["search", "list"] as const) expect(collapsed.indexOf(slot)).toBe(open.indexOf(slot));
  });

  it("a altura com o título vem das medidas, com ou sem o título na tela", () => {
    // Título à mostra: a busca termina em 16 (paddingTop) + 70 (título) + 44 (busca).
    expect(listSheetHeaderHeight(130, 70, false)).toBe(130);
    // Recolhido: a busca sobe e termina em 16 + 44; soma a última altura do título.
    expect(listSheetHeaderHeight(60, 70, true)).toBe(130);
    expect(listSheetHeaderHeight(Number.NaN, -1, true)).toBe(0);
  });

  it("caminho do R1: paisagem com teclado recolhe, a decisão fica estável com as medidas do recolhido e volta ao fechar", () => {
    const landscape = { ...listPortrait, windowHeight: 360, insetTop: 0 };
    const step1 = computeKeyboardListSheetLayout({ ...landscape, keyboardHeight: 200, headerHeight: listSheetHeaderHeight(130, 70, false) });
    expect(step1.titleCollapsed).toBe(true);
    // Depois de recolher, a busca é medida mais acima: a altura com o título continua 130, não alterna.
    const step2 = computeKeyboardListSheetLayout({ ...landscape, keyboardHeight: 200, headerHeight: listSheetHeaderHeight(60, 70, true) });
    expect(step2.titleCollapsed).toBe(true);
    // A busca segue no mesmo lugar da árvore nos dois estados.
    expect(listSheetSlots(step1.titleCollapsed).indexOf("search")).toBe(listSheetSlots(false).indexOf("search"));
    // Fechar o teclado mostra o título de novo.
    const closed = computeKeyboardListSheetLayout({ ...landscape, keyboardHeight: 0, headerHeight: listSheetHeaderHeight(60, 70, true) });
    expect(closed.titleCollapsed).toBe(false);
  });
});
