import { describe, it, expect } from "vitest";
import {
  computeQrKeyBarLayout,
  keyBarFullHeight,
  normalizeChaveInput,
  CHAVE_DIGITS,
  KEY_BAR_COMPACT_PADDING_TOP,
  KEY_BAR_PADDING_BOTTOM,
  KEY_BAR_PADDING_TOP,
  MIN_KEY_GAP,
} from "../qrKeyBarLayout";

/** Folga entre o conteúdo da barra (campo e botões) e o topo do teclado. */
const keyGap = (insetBottom: number, openedOffset: number) => KEY_BAR_PADDING_BOTTOM + insetBottom - openedOffset;

// Retrato 412×900: teclado 300 (com a barra de navegação), inset 24, cabeçalho 84, barra 191 (167 + 24).
const portrait = { windowHeight: 900, keyboardHeight: 300, insetBottom: 24, topBarHeight: 84, fullBarHeight: 191 };
// Paisagem 900×412: teclado 200, inset 0, cabeçalho 60, barra 167.
const landscape = { windowHeight: 412, keyboardHeight: 200, insetBottom: 0, topBarHeight: 60, fullBarHeight: 167 };

describe("computeQrKeyBarLayout (Story 13.6)", () => {
  it("retrato: a barra sobe inteira abaixo do cabeçalho, com folga ≥ 8 até o teclado", () => {
    const r = computeQrKeyBarLayout(portrait);
    expect(r).toEqual({ openedOffset: 24, compact: false });
    const barTop = 900 - 300 - (191 - r.openedOffset);
    expect(barTop).toBe(433);
    expect(barTop).toBeGreaterThanOrEqual(84);
    expect(keyGap(24, r.openedOffset)).toBeGreaterThanOrEqual(MIN_KEY_GAP);
  });

  it("teclado fechado: openedOffset = inset e nunca compacta, mesmo em janela baixa", () => {
    expect(computeQrKeyBarLayout({ ...portrait, keyboardHeight: 0 })).toEqual({ openedOffset: 24, compact: false });
    expect(computeQrKeyBarLayout({ ...landscape, windowHeight: 100, keyboardHeight: 0 })).toEqual({
      openedOffset: 0,
      compact: false,
    });
  });

  it("R3: teclado 16 com inset 24 → openedOffset 16 (a barra nunca desce)", () => {
    const r = computeQrKeyBarLayout({ ...portrait, keyboardHeight: 16 });
    expect(r.openedOffset).toBe(16);
    expect(-16 + r.openedOffset).toBeLessThanOrEqual(0);
    expect(r.compact).toBe(false);
    expect(keyGap(24, r.openedOffset)).toBeGreaterThanOrEqual(MIN_KEY_GAP);
  });

  it("paisagem 900×412 com teclado 200 → compacto, e o campo cabe na janela", () => {
    const r = computeQrKeyBarLayout(landscape);
    expect(r).toEqual({ openedOffset: 0, compact: true });
    // compacta: sem cabeçalho e com o paddingTop menor, a faixa cabe acima do teclado
    const compactLifted = 167 - (KEY_BAR_PADDING_TOP - KEY_BAR_COMPACT_PADDING_TOP) - r.openedOffset;
    expect(412 - 200 - compactLifted).toBeGreaterThanOrEqual(0);
    expect(keyGap(0, r.openedOffset)).toBeGreaterThanOrEqual(MIN_KEY_GAP);
  });

  it("limite exato: sobra igual à faixa → não compacta; um a mais → compacta", () => {
    // faixa = 191 − 24 = 167; sobra = janela − 300 − 84
    const exact = 300 + 84 + 167;
    expect(computeQrKeyBarLayout({ ...portrait, windowHeight: exact }).compact).toBe(false);
    expect(computeQrKeyBarLayout({ ...portrait, windowHeight: exact - 1 }).compact).toBe(true);
  });

  it("sem medida da barra (primeiro quadro, R-2): fica como hoje", () => {
    expect(computeQrKeyBarLayout({ ...landscape, fullBarHeight: 0 })).toEqual({ openedOffset: 0, compact: false });
    expect(computeQrKeyBarLayout({ ...portrait, fullBarHeight: 0, topBarHeight: 0 })).toEqual({
      openedOffset: 24,
      compact: false,
    });
  });

  it("entradas inválidas (NaN, negativas) valem 0", () => {
    expect(computeQrKeyBarLayout({ ...portrait, insetBottom: Number.NaN })).toEqual({ openedOffset: 0, compact: false });
    expect(computeQrKeyBarLayout({ ...portrait, insetBottom: -5 }).openedOffset).toBe(0);
    expect(computeQrKeyBarLayout({ ...portrait, keyboardHeight: Number.NaN })).toEqual({ openedOffset: 24, compact: false });
    expect(computeQrKeyBarLayout({ ...portrait, keyboardHeight: -300 }).compact).toBe(false);
    expect(computeQrKeyBarLayout({ ...landscape, fullBarHeight: Number.NaN }).compact).toBe(false);
    expect(computeQrKeyBarLayout({ ...portrait, topBarHeight: -84 }).compact).toBe(false);
    // janela inválida vale 0: não sobra nada, a barra medida compacta
    expect(computeQrKeyBarLayout({ ...portrait, windowHeight: Number.NaN }).compact).toBe(true);
  });
});

describe("keyBarFullHeight (R-3: a decisão não alterna)", () => {
  it("soma os paddings da barra não compacta ao conteúdo medido", () => {
    expect(keyBarFullHeight(123, 24)).toBe(KEY_BAR_PADDING_TOP + 123 + KEY_BAR_PADDING_BOTTOM + 24);
    expect(keyBarFullHeight(123, 0)).toBe(167);
  });

  it("conteúdo sem medida (0, NaN, negativo) → 0", () => {
    expect(keyBarFullHeight(0, 24)).toBe(0);
    expect(keyBarFullHeight(Number.NaN, 24)).toBe(0);
    expect(keyBarFullHeight(-10, 24)).toBe(0);
    expect(keyBarFullHeight(123, Number.NaN)).toBe(167);
  });

  it("no limite em que a barra compacta caberia, a decisão segue compacta (usa a altura não compacta)", () => {
    // conteúdo 123 em paisagem: a barra cheia (167) não cabe; a compacta (151) caberia
    // se o cabeçalho também sumisse da conta. A medida do conteúdo é a mesma nos dois
    // modos, então a altura que entra na decisão também é.
    const content = 123;
    const room = 167 - 1; // sobra um a menos que a faixa da barra cheia
    const input = { windowHeight: 200 + 60 + room, keyboardHeight: 200, insetBottom: 0, topBarHeight: 60 };
    const first = computeQrKeyBarLayout({ ...input, fullBarHeight: keyBarFullHeight(content, 0) });
    expect(first.compact).toBe(true);
    // já compacta, a mesma medida do conteúdo dá a mesma decisão
    const again = computeQrKeyBarLayout({ ...input, fullBarHeight: keyBarFullHeight(content, 0) });
    expect(again.compact).toBe(true);
    // a altura da barra compacta (o que o onLayout da barra inteira mediria) inverteria a decisão
    const compactBar = KEY_BAR_COMPACT_PADDING_TOP + content + KEY_BAR_PADDING_BOTTOM;
    expect(computeQrKeyBarLayout({ ...input, fullBarHeight: compactBar }).compact).toBe(false);
  });
});

describe("normalizeChaveInput (D-2 b)", () => {
  const chave = "35241012345678000190650010000123451123456789";

  it("chave colada com espaços (formato do DANFE, 54 caracteres) → 44 dígitos", () => {
    const pasted = chave.match(/.{1,4}/g)!.join(" ");
    expect(pasted).toHaveLength(54);
    expect(normalizeChaveInput(pasted)).toBe(chave);
  });

  it("mais de 44 dígitos → os 44 primeiros", () => {
    expect(chave).toHaveLength(CHAVE_DIGITS);
    expect(normalizeChaveInput(`${chave}9876`)).toBe(chave);
  });

  it("letras, pontos, barras e quebras de linha saem", () => {
    expect(normalizeChaveInput("NFe 3524.1012/3456-78\n00\t0190")).toBe("35241012345678000190");
  });

  it("vazio → vazio; só dígitos até 44 fica igual", () => {
    expect(normalizeChaveInput("")).toBe("");
    expect(normalizeChaveInput("1234")).toBe("1234");
  });
});
