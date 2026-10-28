// Contas do teclado no chat da IA (Story 13.5): o único deslocamento é o
// `KeyboardAvoidingView` interno do GiftedChat 3.3.2, configurado por props.
// O GiftedChat não monta `KeyboardProvider` próprio (patch
// `patches/react-native-gifted-chat+3.3.2.patch`, R1): o KAV dele usa o
// provider único da raiz. Sem `react-native` aqui, para dar para testar no vitest.

/**
 * Folga entre o fim da caixa de mensagem e o topo do teclado (D-3 a). Com os
 * 6 dp do `paddingVertical` da linha do campo (`ChatInputBar`), o campo fica a
 * 8 dp do teclado (FR-29).
 */
export const CHAT_KEYBOARD_GAP = 2;

/**
 * `keyboardVerticalOffset` do `KeyboardAvoidingView` interno do GiftedChat: a
 * distância do topo da janela até o chat (`chatTop`, medida pelo `onLayout`
 * do invólucro) mais a folga. O KAV calcula a subida com `frame.y` relativo ao
 * pai (0), então sem o `chatTop` a caixa sobe `chatTop` a menos. Arredonda
 * para cima; `chatTop` negativo ou não finito vira 0, então o resultado nunca
 * fica abaixo da folga.
 */
export function chatKeyboardVerticalOffset(chatTop: number, gap: number = CHAT_KEYBOARD_GAP): number {
  const top = Number.isFinite(chatTop) && chatTop > 0 ? chatTop : 0;
  const safeGap = Number.isFinite(gap) && gap > 0 ? gap : 0;
  return Math.ceil(top + safeGap);
}

export interface GiftedChatLiftInput {
  /** Altura da janela (`useWindowDimensions().height`). */
  windowHeight: number;
  /** Altura do teclado aberto (já com a barra de navegação). */
  keyboardHeight: number;
  /** `y` do KAV relativo ao pai (0 dentro do GiftedChat). */
  frameY?: number;
  /** Altura do KAV (a área do chat). */
  frameHeight: number;
  keyboardVerticalOffset: number;
  /** Progresso da animação do teclado (0 fechado, 1 aberto). */
  progress?: number;
}

/**
 * Espelho do `relativeKeyboardHeight` do `KeyboardAvoidingView` do
 * keyboard-controller 1.18.5, interpolado pelo `progress`:
 * `max(frameY + frameHeight − (windowHeight − keyboardHeight − offset), 0)`.
 * Só para os testes provarem que o offset deixa a caixa colada; a sentinela
 * de versão em `keyboardScroll.test.ts` liga este espelho ao código da
 * biblioteca.
 */
export function giftedChatLift({
  windowHeight,
  keyboardHeight,
  frameY = 0,
  frameHeight,
  keyboardVerticalOffset,
  progress = 1,
}: GiftedChatLiftInput): number {
  const keyboardY = windowHeight - keyboardHeight - keyboardVerticalOffset;
  const relative = Math.max(frameY + frameHeight - keyboardY, 0);
  // interpolate(progress, [0, 1], [0, relative]) do reanimated (extrapolação estendida).
  return progress * relative;
}

/**
 * Altura da caixa de mensagem antes da 1ª medida (`ChatInputBar` na web,
 * Playwright da Story 13.5). Depois vale a medida do `onLayout`.
 */
export const CHAT_COMPOSER_FALLBACK_HEIGHT = 110;

export interface ChatCompactInput {
  /** Teclado aberto (`useKeyboardState`, atualiza no fim da animação). */
  keyboardVisible: boolean;
  /** Altura do teclado aberto (já com a barra de navegação). */
  keyboardHeight: number;
  /** Altura da janela: fim do chat + `insets.bottom` (não muda quando a barra de uso some). */
  windowHeight: number;
  /** Topo da janela até o chat sem a barra de uso (barra de status, cabeçalho e banners). */
  topWithoutUsageBar: number;
  /** Altura da `AIUsageBar` (a última medida, mesmo escondida). */
  usageBarHeight: number;
  /** Altura da caixa de mensagem (`ChatInputBar`). */
  composerHeight: number;
  /** Altura do rodapé (`QuickSuggestions`; a última medida, mesmo escondido). */
  footerHeight: number;
  gap?: number;
}

export interface ChatCompactLayout {
  /** Espaço entre o topo do chat (com a barra de uso) e o topo do teclado, menos a folga. */
  space: number;
  /** O que precisa caber: caixa + rodapé. */
  needed: number;
  /** Teclado aberto e espaço curto: esconder as sugestões rápidas e a barra de uso (R2). */
  compact: boolean;
  /** A caixa cabe no espaço que sobra (sem a barra de uso, se compacto). Falso só em casos extremos (paisagem com fonte 2,0). */
  composerFits: boolean;
}

const finiteOr0 = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Decide se o chat fica compacto com o teclado aberto (R2 da revisão da
 * Story 13.5). O espaço é sempre calculado **com** a barra de uso e com a
 * última altura medida do rodapé, então esconder os dois não muda a decisão
 * (sem oscilação). Com o teclado fechado nunca é compacto.
 */
export function chatKeyboardCompact(input: ChatCompactInput): ChatCompactLayout {
  const gap = finiteOr0(input.gap ?? CHAT_KEYBOARD_GAP);
  const usageBar = finiteOr0(input.usageBarHeight);
  const composer = finiteOr0(input.composerHeight);
  const footer = finiteOr0(input.footerHeight);
  const top = finiteOr0(input.topWithoutUsageBar) + usageBar;
  const keyboard = input.keyboardVisible ? finiteOr0(input.keyboardHeight) : 0;
  const space = finiteOr0(input.windowHeight) - keyboard - gap - top;
  const needed = composer + footer;
  const compact = input.keyboardVisible && keyboard > 0 && space < needed;
  const composerFits = (compact ? space + usageBar : space - footer) >= composer;
  return { space, needed, compact, composerFits };
}

/**
 * Entradas do `chatKeyboardCompact` a partir das medidas da tela: o `chatTop`
 * e a altura do invólucro (`onLayout`), o `insets.bottom` e se a barra de uso
 * está na tela. Esconder a barra sobe o chat e o faz crescer na mesma medida,
 * então o resultado não muda.
 */
export function chatCompactFrame(
  chatTop: number,
  chatHeight: number,
  insetBottom: number,
  usageBarHeight: number,
  usageBarShown: boolean,
): { windowHeight: number; topWithoutUsageBar: number } {
  const top = finiteOr0(chatTop);
  return {
    windowHeight: top + finiteOr0(chatHeight) + finiteOr0(insetBottom),
    topWithoutUsageBar: Math.max(top - (usageBarShown ? finiteOr0(usageBarHeight) : 0), 0),
  };
}
