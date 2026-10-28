import { describe, it, expect } from "vitest";
import {
  computeQrKeyBarLayout,
  keyBarFullHeight,
  nextKeyContentHeight,
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
const portrait = { containerHeight: 900, keyboardHeight: 300, insetBottom: 24, topBarHeight: 84, fullBarHeight: 191 };
// Paisagem 900×412: teclado 200, inset 0, cabeçalho 60, barra 167.
const landscape = { containerHeight: 412, keyboardHeight: 200, insetBottom: 0, topBarHeight: 60, fullBarHeight: 167 };

describe("computeQrKeyBarLayout (Story 13.6)", () => {
  it("retrato: a barra sobe inteira abaixo do cabeçalho, com folga ≥ 8 até o teclado", () => {
    const r = computeQrKeyBarLayout(portrait);
    expect(r).toEqual({ openedOffset: 24, compact: false, fits: true });
    const barTop = 900 - 300 - (191 - r.openedOffset);
    expect(barTop).toBe(433);
    expect(barTop).toBeGreaterThanOrEqual(84);
    expect(keyGap(24, r.openedOffset)).toBeGreaterThanOrEqual(MIN_KEY_GAP);
  });

  it("teclado fechado: openedOffset = inset e nunca compacta, mesmo em janela baixa", () => {
    expect(computeQrKeyBarLayout({ ...portrait, keyboardHeight: 0 })).toEqual({ openedOffset: 24, compact: false, fits: true });
    expect(computeQrKeyBarLayout({ ...landscape, containerHeight: 100, keyboardHeight: 0 })).toEqual({
      openedOffset: 0,
      compact: false,
      fits: true,
    });
  });

  it("R3 (offset): teclado 16 com inset 24 → openedOffset 16 (a barra nunca desce)", () => {
    const r = computeQrKeyBarLayout({ ...portrait, keyboardHeight: 16 });
    expect(r.openedOffset).toBe(16);
    expect(-16 + r.openedOffset).toBeLessThanOrEqual(0);
    expect(r.compact).toBe(false);
    expect(keyGap(24, r.openedOffset)).toBeGreaterThanOrEqual(MIN_KEY_GAP);
  });

  it("R4: com a altura-alvo, o opened não passa do teclado em nenhum quadro da animação", () => {
    // KeyboardStickyView: translateY = −altura(p) + p × opened, com altura(p) = p × alvo.
    for (const target of [16, 300]) {
      const { openedOffset } = computeQrKeyBarLayout({ ...portrait, keyboardHeight: target });
      for (let p = 0; p <= 1; p += 0.125) expect(-p * target + p * openedOffset).toBeLessThanOrEqual(0);
    }
  });

  it("paisagem 900×412 com teclado 200 → compacto, e a compacta cabe na janela", () => {
    const r = computeQrKeyBarLayout(landscape);
    expect(r).toEqual({ openedOffset: 0, compact: true, fits: true });
    const compactLifted = 167 - (KEY_BAR_PADDING_TOP - KEY_BAR_COMPACT_PADDING_TOP) - r.openedOffset;
    expect(412 - 200 - compactLifted).toBeGreaterThanOrEqual(0);
    expect(keyGap(0, r.openedOffset)).toBeGreaterThanOrEqual(MIN_KEY_GAP);
  });

  it("limite exato do compacto: sobra igual à faixa → não compacta; um a mais → compacta", () => {
    // faixa = 191 − 24 = 167; sobra = contêiner − 300 − 84
    const exact = 300 + 84 + 167;
    expect(computeQrKeyBarLayout({ ...portrait, containerHeight: exact }).compact).toBe(false);
    expect(computeQrKeyBarLayout({ ...portrait, containerHeight: exact - 1 }).compact).toBe(true);
  });

  describe("R3: nem a compacta cabe → fits = false (uma linha)", () => {
    // 640×360 em paisagem, teclado numérico 200, inset 0, cabeçalho 60.
    const small = { containerHeight: 360, keyboardHeight: 200, insetBottom: 0, topBarHeight: 60 };
    // Conteúdo empilhado (campo, contador, botões) ≈ 123 com fonte 1,0; ≈ 160 com 1,3; ≈ 200 com 2,0.
    it.each([
      ["1,0", 123, true],
      ["1,3", 160, false],
      ["2,0", 200, false],
    ])("fonte %s (conteúdo %i) → fits %s", (_font, content, fits) => {
      const r = computeQrKeyBarLayout({ ...small, fullBarHeight: keyBarFullHeight(content, 0) });
      expect(r.compact).toBe(true);
      expect(r.fits).toBe(fits);
      if (fits) {
        // a compacta inteira acima do teclado: topo ≥ 0
        const top = 360 - 200 - (KEY_BAR_COMPACT_PADDING_TOP + content + KEY_BAR_PADDING_BOTTOM);
        expect(top).toBeGreaterThanOrEqual(0);
      }
    });

    it("limite exato da compacta: cabe com sobra 0, não cabe com 1 a menos", () => {
      // compacta = 8 + 132 + 20 = 160 = 360 − 200
      expect(computeQrKeyBarLayout({ ...small, fullBarHeight: keyBarFullHeight(132, 0) }).fits).toBe(true);
      expect(computeQrKeyBarLayout({ ...small, fullBarHeight: keyBarFullHeight(133, 0) }).fits).toBe(false);
    });

    it("fora do compacto, fits é sempre true", () => {
      expect(computeQrKeyBarLayout(portrait).fits).toBe(true);
    });
  });

  it("sem medida (barra, contêiner) no primeiro quadro (R-2): fica como hoje", () => {
    expect(computeQrKeyBarLayout({ ...landscape, fullBarHeight: 0 })).toEqual({ openedOffset: 0, compact: false, fits: true });
    expect(computeQrKeyBarLayout({ ...landscape, containerHeight: 0 })).toEqual({ openedOffset: 0, compact: false, fits: true });
    expect(computeQrKeyBarLayout({ ...portrait, fullBarHeight: 0, topBarHeight: 0 })).toEqual({
      openedOffset: 24,
      compact: false,
      fits: true,
    });
  });

  it("entradas inválidas (NaN, negativas) valem 0", () => {
    expect(computeQrKeyBarLayout({ ...portrait, insetBottom: Number.NaN })).toEqual({ openedOffset: 0, compact: false, fits: true });
    expect(computeQrKeyBarLayout({ ...portrait, insetBottom: -5 }).openedOffset).toBe(0);
    expect(computeQrKeyBarLayout({ ...portrait, keyboardHeight: Number.NaN })).toEqual({ openedOffset: 24, compact: false, fits: true });
    expect(computeQrKeyBarLayout({ ...portrait, keyboardHeight: -300 }).compact).toBe(false);
    expect(computeQrKeyBarLayout({ ...landscape, fullBarHeight: Number.NaN }).compact).toBe(false);
    expect(computeQrKeyBarLayout({ ...portrait, topBarHeight: -84 }).compact).toBe(false);
    expect(computeQrKeyBarLayout({ ...portrait, containerHeight: Number.NaN }).compact).toBe(false);
  });
});

describe("keyBarFullHeight e nextKeyContentHeight (R-3: a decisão não alterna)", () => {
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
    const content = 123;
    const room = 167 - 1; // sobra um a menos que a faixa da barra cheia
    const input = { containerHeight: 200 + 60 + room, keyboardHeight: 200, insetBottom: 0, topBarHeight: 60 };
    const first = computeQrKeyBarLayout({ ...input, fullBarHeight: keyBarFullHeight(content, 0) });
    expect(first.compact).toBe(true);
    const again = computeQrKeyBarLayout({ ...input, fullBarHeight: keyBarFullHeight(content, 0) });
    expect(again.compact).toBe(true);
    // a altura da barra compacta (o que o onLayout da barra inteira mediria) inverteria a decisão
    const compactBar = KEY_BAR_COMPACT_PADDING_TOP + content + KEY_BAR_PADDING_BOTTOM;
    expect(computeQrKeyBarLayout({ ...input, fullBarHeight: compactBar }).compact).toBe(false);
  });

  it("a medida de uma linha não substitui a do conteúdo empilhado (R3 sem alternar)", () => {
    expect(nextKeyContentHeight(160, 43, true)).toBe(160);
    expect(nextKeyContentHeight(160, 150, false)).toBe(150);
    expect(nextKeyContentHeight(160, Number.NaN, false)).toBe(0);
    // com a medida de uma linha (43) a decisão voltaria a "cabe" e alternaria
    const small = { containerHeight: 360, keyboardHeight: 200, insetBottom: 0, topBarHeight: 60 };
    const stored = nextKeyContentHeight(160, 43, true);
    expect(computeQrKeyBarLayout({ ...small, fullBarHeight: keyBarFullHeight(stored, 0) }).fits).toBe(false);
    expect(computeQrKeyBarLayout({ ...small, fullBarHeight: keyBarFullHeight(43, 0) }).fits).toBe(true);
  });
});

describe("normalizeChaveInput (D-2 b, R6)", () => {
  // Chave do exemplo do Manual de Orientação do Contribuinte (DV 5).
  const chave = "52060433009911002506550120000007800267301615";
  const blocks = (k: string) => k.match(/.{1,4}/g)!.join(" ");

  it("chave colada com espaços (formato do DANFE, 54 caracteres) → 44 dígitos", () => {
    expect(blocks(chave)).toHaveLength(54);
    expect(normalizeChaveInput(blocks(chave))).toBe(chave);
  });

  it("chave colada com pontos ou quebras de linha entre os blocos", () => {
    expect(normalizeChaveInput(chave.match(/.{1,4}/g)!.join("."))).toBe(chave);
    expect(normalizeChaveInput(`${chave.slice(0, 20)}\n${chave.slice(20)}`)).toBe(chave);
  });

  it("chave colada com outros números em volta: usa a única sequência de 44", () => {
    expect(normalizeChaveInput(`Nº 123 Série 1\nChave de acesso: ${blocks(chave)}`)).toBe(chave);
    expect(normalizeChaveInput(`123 ${blocks(chave)}`)).toBe(chave);
    expect(normalizeChaveInput(`${chave} 99`)).toBe(chave);
    expect(normalizeChaveInput(`NFe${chave}`)).toBe(chave);
  });

  it("sem uma sequência única de 44, fica o valor anterior (nunca monta chave errada)", () => {
    expect(normalizeChaveInput(`12${chave}`, "1234")).toBe("1234");
    expect(normalizeChaveInput(`${blocks(chave)} 1234`, "")).toBe("");
    expect(normalizeChaveInput(`${chave} ${chave.replace(/5/g, "6")}`, "99")).toBe("99");
  });

  it("digitar além de 44 (no fim ou no meio) mantém o valor anterior", () => {
    expect(chave).toHaveLength(CHAVE_DIGITS);
    expect(normalizeChaveInput(`${chave}9`, chave)).toBe(chave);
    expect(normalizeChaveInput(`${chave.slice(0, 10)}7${chave.slice(10)}`, chave)).toBe(chave);
  });

  it("até 44 dígitos: letras, pontos, barras e quebras de linha saem", () => {
    expect(normalizeChaveInput("NFe 3524.1012/3456-78\n00\t0190")).toBe("35241012345678000190");
  });

  it("vazio → vazio; só dígitos até 44 fica igual", () => {
    expect(normalizeChaveInput("")).toBe("");
    expect(normalizeChaveInput("1234")).toBe("1234");
  });
});
