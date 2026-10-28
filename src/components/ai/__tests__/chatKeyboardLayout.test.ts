import { describe, it, expect } from "vitest";
import * as layout from "../chatKeyboardLayout";
import {
  CHAT_COMPOSER_FALLBACK_HEIGHT,
  CHAT_KEYBOARD_GAP,
  chatCompactFrame,
  chatKeyboardCompact,
  chatKeyboardVerticalOffset,
  giftedChatLift,
  type ChatCompactInput,
} from "../chatKeyboardLayout";

/**
 * Story 13.5: o fim da caixa de mensagem com o teclado aberto. O GiftedChat
 * ocupa do `chatTop` até a borda de baixo do `SafeAreaView` (acima da barra de
 * navegação); a caixa fica no fim dele e sobe `giftedChatLift(…)`.
 */
function boxBottom(opts: {
  windowHeight: number;
  chatTop: number;
  navBar: number;
  keyboardHeight: number;
  keyboardVerticalOffset: number;
  progress?: number;
}) {
  const frameHeight = opts.windowHeight - opts.navBar - opts.chatTop;
  const lift = giftedChatLift({
    windowHeight: opts.windowHeight,
    keyboardHeight: opts.keyboardHeight,
    frameHeight,
    keyboardVerticalOffset: opts.keyboardVerticalOffset,
    progress: opts.progress,
  });
  return { bottom: opts.chatTop + frameHeight - lift, lift, frameHeight };
}

describe("constantes (Story 13.5)", () => {
  it("a folga é 2 dp: com os 6 dp da linha do campo, o campo fica a 8 dp do teclado (D-3, FR-29)", () => {
    expect(CHAT_KEYBOARD_GAP).toBe(2);
    const inputRowPaddingVertical = 6; // ChatInputBar, s.inputRow
    expect(CHAT_KEYBOARD_GAP + inputRowPaddingVertical).toBeGreaterThanOrEqual(8);
  });

  it("sem props de provider interno: o GiftedChat não monta KeyboardProvider (patch, R1)", () => {
    expect("CHAT_KEYBOARD_PROVIDER_PROPS" in layout).toBe(false);
  });
});

describe("chatKeyboardVerticalOffset", () => {
  it("é o chatTop mais a folga", () => {
    expect(chatKeyboardVerticalOffset(125)).toBe(127);
    expect(chatKeyboardVerticalOffset(185)).toBe(187);
    expect(chatKeyboardVerticalOffset(125, 0)).toBe(125);
    expect(chatKeyboardVerticalOffset(125, 8)).toBe(133);
  });

  it("arredonda para cima o chatTop fracionário", () => {
    expect(chatKeyboardVerticalOffset(125.2)).toBe(128);
    expect(chatKeyboardVerticalOffset(124.9)).toBe(127);
    expect(Number.isInteger(chatKeyboardVerticalOffset(0.01))).toBe(true);
  });

  it.each([-10, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0])(
    "chatTop %s vira 0: o offset é a folga",
    (chatTop) => {
      expect(chatKeyboardVerticalOffset(chatTop)).toBe(CHAT_KEYBOARD_GAP);
    },
  );

  it("nunca fica abaixo da folga, e a folga inválida vira 0", () => {
    for (const top of [-1, 0, 0.5, 10, 300]) {
      expect(chatKeyboardVerticalOffset(top)).toBeGreaterThanOrEqual(CHAT_KEYBOARD_GAP);
    }
    expect(chatKeyboardVerticalOffset(100, -5)).toBe(100);
    expect(chatKeyboardVerticalOffset(100, Number.NaN)).toBe(100);
  });
});

describe("giftedChatLift (espelho do KeyboardAvoidingView 1.18.5)", () => {
  it("segue a fórmula max(frameY + frameHeight − (janela − teclado − offset), 0)", () => {
    expect(giftedChatLift({ windowHeight: 915, keyboardHeight: 336, frameHeight: 742, keyboardVerticalOffset: 127 })).toBe(
      742 - (915 - 336 - 127),
    );
    expect(giftedChatLift({ windowHeight: 915, keyboardHeight: 336, frameY: 10, frameHeight: 742, keyboardVerticalOffset: 0 })).toBe(
      10 + 742 - (915 - 336),
    );
  });

  it("nunca é negativa (chat curto, longe do teclado)", () => {
    expect(giftedChatLift({ windowHeight: 915, keyboardHeight: 336, frameHeight: 100, keyboardVerticalOffset: 0 })).toBe(0);
  });

  it("interpola pelo progresso: 0 com o teclado fechado, metade no meio", () => {
    const base = { windowHeight: 915, keyboardHeight: 336, frameHeight: 742, keyboardVerticalOffset: 127 };
    const full = giftedChatLift(base);
    expect(giftedChatLift({ ...base, progress: 0 })).toBe(0);
    expect(giftedChatLift({ ...base, progress: 0.5 })).toBe(full / 2);
    expect(giftedChatLift({ ...base, progress: 1 })).toBe(full);
  });
});

describe("caixa colada acima do teclado (Story 13.5)", () => {
  const portrait = { windowHeight: 915, keyboardHeight: 336 };

  it.each([
    [125, 48, "sem banner, 3 botões"],
    [125, 24, "sem banner, gestos"],
    [185, 48, "com banner, 3 botões"],
    [185, 24, "com banner, gestos"],
  ])("retrato 412×915: chatTop %s, navegação %s (%s) → fim da caixa em 915 − 336 − 2", (chatTop, navBar) => {
    const { bottom, lift, frameHeight } = boxBottom({
      ...portrait,
      chatTop,
      navBar,
      keyboardVerticalOffset: chatKeyboardVerticalOffset(chatTop),
    });
    expect(bottom).toBe(915 - 336 - CHAT_KEYBOARD_GAP);
    expect(lift).toBeGreaterThan(0);
    expect(lift).toBeLessThanOrEqual(frameHeight);
  });

  it.each([
    [93, 0],
    [93, 48],
    [153, 0],
  ])("paisagem 915×412, teclado 200: chatTop %s, navegação %s → colada e a subida não passa da altura do chat", (chatTop, navBar) => {
    const { bottom, lift, frameHeight } = boxBottom({
      windowHeight: 412,
      keyboardHeight: 200,
      chatTop,
      navBar,
      keyboardVerticalOffset: chatKeyboardVerticalOffset(chatTop),
    });
    expect(bottom).toBe(412 - 200 - CHAT_KEYBOARD_GAP);
    expect(lift).toBeLessThanOrEqual(frameHeight);
  });

  it("teclado fechado (progress 0): sem subida, a caixa fica acima da barra de navegação", () => {
    const { bottom, lift } = boxBottom({
      ...portrait,
      chatTop: 125,
      navBar: 48,
      keyboardVerticalOffset: chatKeyboardVerticalOffset(125),
      progress: 0,
    });
    expect(lift).toBe(0);
    expect(bottom).toBe(915 - 48);
  });

  it("regressão documentada: com o offset de hoje (insets.top interno ≈ 0), a caixa fica chatTop abaixo do topo do teclado", () => {
    for (const chatTop of [125, 185]) {
      const { bottom } = boxBottom({ ...portrait, chatTop, navBar: 48, keyboardVerticalOffset: 0 });
      expect(bottom - (915 - 336)).toBe(chatTop);
    }
  });
});

/**
 * R2 da revisão da Story 13.5: com o teclado aberto, o espaço acima dele
 * precisa caber a caixa e o rodapé (sugestões). Se não couber, o chat fica
 * compacto: some o rodapé e a barra de uso. Medidas: caixa 110 (web,
 * Playwright), sugestões 52, barra de uso 32; retrato com chatTop 125 (sem
 * banner) e 185 (com banner), como nos casos acima.
 */
describe("chatKeyboardCompact (espaço acima do teclado, R2)", () => {
  const base: ChatCompactInput = {
    keyboardVisible: true,
    keyboardHeight: 336,
    windowHeight: 915,
    topWithoutUsageBar: 93,
    usageBarHeight: 32,
    composerHeight: 110,
    footerHeight: 52,
  };

  it.each([
    [93, "sem banner (chatTop 125)"],
    [153, "com banner (chatTop 185)"],
  ])("retrato 412×915, teclado 336, topo %s (%s): o espaço ≥ caixa + rodapé, nada some", (top) => {
    const r = chatKeyboardCompact({ ...base, topWithoutUsageBar: top });
    expect(r.space).toBe(915 - 336 - CHAT_KEYBOARD_GAP - (top + 32));
    expect(r.space).toBeGreaterThanOrEqual(r.needed);
    expect(r.needed).toBe(110 + 52);
    expect(r.compact).toBe(false);
    expect(r.composerFits).toBe(true);
  });

  it("paisagem 915×412, teclado 200: o espaço é curto, some o rodapé e a barra de uso, e a caixa cabe", () => {
    const r = chatKeyboardCompact({ ...base, windowHeight: 412, keyboardHeight: 200, topWithoutUsageBar: 61 });
    expect(r.space).toBe(412 - 200 - CHAT_KEYBOARD_GAP - (61 + 32));
    expect(r.space).toBeLessThan(r.needed);
    expect(r.compact).toBe(true);
    // sem a barra de uso (e sem o rodapé), a caixa cabe
    expect(r.space + 32).toBeGreaterThanOrEqual(110);
    expect(r.composerFits).toBe(true);
  });

  it("paisagem com fonte 2,0 (57 dp acima do teclado): compacto, e a caixa ainda não cabe (aviso na checklist)", () => {
    const r = chatKeyboardCompact({
      ...base,
      windowHeight: 412,
      keyboardHeight: 200,
      topWithoutUsageBar: 123,
      usageBarHeight: 30,
      composerHeight: 150,
      footerHeight: 80,
    });
    expect(r.space).toBe(412 - 200 - CHAT_KEYBOARD_GAP - 153);
    expect(r.compact).toBe(true);
    expect(r.composerFits).toBe(false);
  });

  it("teclado fechado: nunca compacto, mesmo com pouco espaço", () => {
    const r = chatKeyboardCompact({ ...base, keyboardVisible: false, windowHeight: 300 });
    expect(r.compact).toBe(false);
    expect(chatKeyboardCompact({ ...base, keyboardVisible: true, keyboardHeight: 0, windowHeight: 200 }).compact).toBe(false);
  });

  it("a decisão não depende de a barra de uso e o rodapé estarem escondidos (sem oscilação)", () => {
    // Paisagem: chatTop 93 com a barra (61 + 32), chat de 412 − 93 − 0 de altura.
    const shown = chatCompactFrame(93, 412 - 93, 0, 32, true);
    // Escondida a barra: o chat sobe 32 e cresce 32.
    const hidden = chatCompactFrame(61, 412 - 61, 0, 32, false);
    expect(hidden).toEqual(shown);
    expect(shown).toEqual({ windowHeight: 412, topWithoutUsageBar: 61 });
    const input = { ...base, keyboardHeight: 200, footerHeight: 52 };
    const before = chatKeyboardCompact({ ...input, ...shown });
    const after = chatKeyboardCompact({ ...input, ...hidden });
    expect(before.compact).toBe(true);
    expect(after).toEqual(before);
  });

  it("chatCompactFrame: a janela é o fim do chat mais o insets.bottom; medidas inválidas viram 0", () => {
    expect(chatCompactFrame(125, 742, 48, 32, true)).toEqual({ windowHeight: 915, topWithoutUsageBar: 93 });
    expect(chatCompactFrame(Number.NaN, 700, -1, 32, true)).toEqual({ windowHeight: 700, topWithoutUsageBar: 0 });
  });

  it("no limite: espaço igual a caixa + rodapé não compacta; 1 dp a menos compacta", () => {
    const exact = { ...base, windowHeight: 336 + CHAT_KEYBOARD_GAP + 93 + 32 + 110 + 52 };
    expect(chatKeyboardCompact(exact).compact).toBe(false);
    expect(chatKeyboardCompact({ ...exact, windowHeight: exact.windowHeight - 1 }).compact).toBe(true);
  });

  it("medidas inválidas (NaN, negativas) viram 0; a caixa sem medida usa o valor de reserva", () => {
    const r = chatKeyboardCompact({ ...base, usageBarHeight: Number.NaN, footerHeight: -5 });
    expect(r.needed).toBe(110);
    expect(r.space).toBe(915 - 336 - CHAT_KEYBOARD_GAP - 93);
    expect(CHAT_COMPOSER_FALLBACK_HEIGHT).toBeGreaterThan(0);
  });
});
