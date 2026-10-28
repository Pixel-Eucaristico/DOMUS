import { describe, it, expect } from "vitest";
import {
  CHAT_KEYBOARD_GAP,
  CHAT_KEYBOARD_PROVIDER_PROPS,
  chatKeyboardVerticalOffset,
  giftedChatLift,
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

  it("o provider interno espelha o da raiz, sem preload e sem enabled (D-1 a)", () => {
    expect(CHAT_KEYBOARD_PROVIDER_PROPS.statusBarTranslucent).toBe(true);
    expect(CHAT_KEYBOARD_PROVIDER_PROPS.navigationBarTranslucent).toBe(true);
    expect(CHAT_KEYBOARD_PROVIDER_PROPS.preload).toBe(false);
    expect("enabled" in CHAT_KEYBOARD_PROVIDER_PROPS).toBe(false);
    expect(CHAT_KEYBOARD_PROVIDER_PROPS.children).toBeNull();
    expect(Object.keys(CHAT_KEYBOARD_PROVIDER_PROPS).sort()).toEqual(
      ["children", "navigationBarTranslucent", "preload", "statusBarTranslucent"],
    );
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
