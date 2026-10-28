// Contas do teclado no chat da IA (Story 13.5): o único deslocamento é o
// `KeyboardAvoidingView` interno do GiftedChat 3.3.2, configurado por props.
// Sem `react-native` aqui, para dar para testar no vitest.

/**
 * Folga entre o fim da caixa de mensagem e o topo do teclado (D-3 a). Com os
 * 6 dp do `paddingVertical` da linha do campo (`ChatInputBar`), o campo fica a
 * 8 dp do teclado (FR-29).
 */
export const CHAT_KEYBOARD_GAP = 2;

/**
 * Props do `KeyboardProvider` interno do GiftedChat (D-1 a): espelho do
 * provider da raiz (`app/_layout.tsx`, os dois translúcidos), sem refazer o
 * `preload` do teclado, que a raiz já faz. Nunca `enabled: false` (mataria o
 * deslocamento). O `children: null` só satisfaz o tipo (`children` é
 * obrigatório em `KeyboardProviderProps`); o filho JSX do `GiftedChatWrapper`
 * vem depois do spread e vence.
 */
export const CHAT_KEYBOARD_PROVIDER_PROPS = {
  statusBarTranslucent: true,
  navigationBarTranslucent: true,
  preload: false,
  children: null,
} as const;

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
