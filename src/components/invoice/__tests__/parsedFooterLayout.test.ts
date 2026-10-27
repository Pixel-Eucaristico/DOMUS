import { describe, it, expect } from "vitest";
import {
  computeParsedFooterLayout,
  hasPendingNewItem,
  MIN_FIELD_SPACE,
} from "../parsedFooterLayout";
import { KEYBOARD_BOTTOM_OFFSET } from "@/components/keyboardScrollDefaults";

// Retrato típico: janela 800, cabeçalho até 90, rodapé 150 (com inset 24).
const portrait = { windowHeight: 800, scrollTop: 90, footerHeight: 150, insetBottom: 24 };

describe("computeParsedFooterLayout (Story 13.2, R1/R3)", () => {
  it("teclado fechado: rodapé ativo e folga acima do rodapé", () => {
    const r = computeParsedFooterLayout({ ...portrait, keyboardHeight: 0 });
    expect(r.stickyEnabled).toBe(true);
    expect(r.openedOffset).toBe(24);
    expect(r.bottomOffset).toBe(KEYBOARD_BOTTOM_OFFSET + 150 - 24);
  });

  it("retrato com teclado: o campo para acima do rodapé erguido", () => {
    const r = computeParsedFooterLayout({ ...portrait, keyboardHeight: 300 });
    expect(r).toEqual({ stickyEnabled: true, openedOffset: 24, bottomOffset: KEYBOARD_BOTTOM_OFFSET + 126 });
    // sobra pelo menos MIN_FIELD_SPACE entre o topo da rolagem e o campo
    const fieldBottom = 800 - 300 - r.bottomOffset;
    expect(fieldBottom - 90).toBeGreaterThanOrEqual(MIN_FIELD_SPACE);
  });

  it("paisagem: rodapé erguido não cabe → não sobe e a folga cabe na janela", () => {
    const r = computeParsedFooterLayout({
      windowHeight: 400,
      keyboardHeight: 200,
      scrollTop: 70,
      footerHeight: 150,
      insetBottom: 0,
    });
    expect(r.stickyEnabled).toBe(false);
    expect(r.bottomOffset).toBe(KEYBOARD_BOTTOM_OFFSET);
    expect(400 - 200 - 70 - r.bottomOffset).toBeGreaterThanOrEqual(MIN_FIELD_SPACE);
  });

  it("janela baixíssima: a folga encolhe até caber (nunca negativa)", () => {
    const tight = computeParsedFooterLayout({
      windowHeight: 360,
      keyboardHeight: 200,
      scrollTop: 70,
      footerHeight: 150,
      insetBottom: 0,
    });
    expect(tight.stickyEnabled).toBe(false);
    expect(tight.bottomOffset).toBe(360 - 200 - 70 - MIN_FIELD_SPACE);

    const none = computeParsedFooterLayout({
      windowHeight: 300,
      keyboardHeight: 250,
      scrollTop: 70,
      footerHeight: 150,
      insetBottom: 0,
    });
    expect(none.bottomOffset).toBe(0);
  });

  it("limite exato: cabe com MIN_FIELD_SPACE justo, não cabe com 1 a menos", () => {
    const overlap = 150 - 24;
    const windowHeight = 300 + 90 + overlap + KEYBOARD_BOTTOM_OFFSET + MIN_FIELD_SPACE;
    expect(computeParsedFooterLayout({ ...portrait, windowHeight, keyboardHeight: 300 }).stickyEnabled).toBe(true);
    expect(
      computeParsedFooterLayout({ ...portrait, windowHeight: windowHeight - 1, keyboardHeight: 300 }).stickyEnabled,
    ).toBe(false);
  });

  it("R3: teclado mais baixo que o inset não empurra o rodapé para baixo", () => {
    const r = computeParsedFooterLayout({ ...portrait, insetBottom: 48, keyboardHeight: 30 });
    expect(r.openedOffset).toBe(30);
    expect(r.openedOffset).toBeLessThanOrEqual(30);
    expect(r.bottomOffset).toBe(KEYBOARD_BOTTOM_OFFSET + 150 - 30);
  });

  it("entradas inválidas (NaN, negativas) viram 0", () => {
    const r = computeParsedFooterLayout({
      windowHeight: 800,
      keyboardHeight: Number.NaN,
      scrollTop: -10,
      footerHeight: -5,
      insetBottom: Number.NaN,
    });
    expect(r).toEqual({ stickyEnabled: true, openedOffset: 0, bottomOffset: KEYBOARD_BOTTOM_OFFSET });
  });
});

describe("hasPendingNewItem (Story 13.2, R2)", () => {
  const empty = { isAddingItem: true, desc: "", unitPrice: "", ean: "", ncm: "" };

  it("formulário fechado nunca conta", () => {
    expect(hasPendingNewItem({ ...empty, isAddingItem: false, desc: "Arroz" })).toBe(false);
  });

  it("formulário aberto e vazio (ou só espaços) não conta", () => {
    expect(hasPendingNewItem(empty)).toBe(false);
    expect(hasPendingNewItem({ ...empty, desc: "   " })).toBe(false);
  });

  it.each(["desc", "unitPrice", "ean", "ncm"] as const)("conta com %s preenchido", (field) => {
    expect(hasPendingNewItem({ ...empty, [field]: "1" })).toBe(true);
  });
});
