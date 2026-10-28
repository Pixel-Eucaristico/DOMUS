// Barra da chave da NF sobre a câmera (QrScanScreen, Story 13.6). Sem
// `react-native` aqui, para dar para testar no vitest.
import { stickyOpenedOffset } from "@/src/components/shared/keyboardStickyOffset";

/** Folga mínima entre o campo/botões e o topo do teclado (FR-29). */
export const MIN_KEY_GAP = 8;

/** `paddingTop` da barra de baixo. */
export const KEY_BAR_PADDING_TOP = 24;
/** `paddingTop` da barra no modo compacto (D-1 a). */
export const KEY_BAR_COMPACT_PADDING_TOP = 8;
/** `paddingBottom` da barra, somado ao `insets.bottom`: é a folga até o teclado. */
export const KEY_BAR_PADDING_BOTTOM = 20;

/** Quantos dígitos tem a chave de acesso da NF. */
export const CHAVE_DIGITS = 44;

const nonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export interface QrKeyBarInput {
  /**
   * Altura do contêiner da tela, medida no `onLayout` (R5): é a área em que a
   * barra se move, com ou sem a barra de navegação (Android ≤ 14 com 3 botões,
   * tela dividida). 0 = ainda sem medida.
   */
  containerHeight: number;
  /** Altura-alvo do teclado (0 = fechado), do `useKeyboardTargetHeight`. Já inclui a barra de navegação. */
  keyboardHeight: number;
  /** insets.bottom da área segura. */
  insetBottom: number;
  /** Altura do cabeçalho (X e abas), que começa no topo da janela. */
  topBarHeight: number;
  /** Altura da barra NÃO compacta, com o paddingBottom (ver keyBarFullHeight). 0 = ainda sem medida. */
  fullBarHeight: number;
}

export interface QrKeyBarLayout {
  /** `offset.opened` do KeyboardStickyView. */
  openedOffset: number;
  /** A barra erguida não cabe entre o cabeçalho e o teclado: some o cabeçalho e a dica, e o paddingTop cai. */
  compact: boolean;
  /**
   * A barra (compacta, quando `compact`) cabe inteira entre o topo do
   * contêiner e o teclado. `false` só no compacto: a barra passa a uma linha
   * (campo e botões lado a lado, sem o contador), R3.
   */
  fits: boolean;
}

/**
 * A faixa que a barra erguida ocupa acima do teclado é `fullBarHeight −
 * openedOffset`. Com o teclado aberto, se ela passa do que sobra entre o
 * cabeçalho e o teclado, a barra entra no modo compacto (D-1 a). A decisão usa
 * sempre a altura não compacta, para não alternar quando a barra encolhe; sem
 * medida (`fullBarHeight` 0, primeiro quadro) a barra fica como hoje.
 */
export function computeQrKeyBarLayout({
  containerHeight,
  keyboardHeight,
  insetBottom,
  topBarHeight,
  fullBarHeight,
}: QrKeyBarInput): QrKeyBarLayout {
  const keyboard = nonNegative(keyboardHeight);
  const full = nonNegative(fullBarHeight);
  const container = nonNegative(containerHeight);
  const openedOffset = stickyOpenedOffset(insetBottom, keyboard);
  if (keyboard === 0 || full === 0 || container === 0) return { openedOffset, compact: false, fits: true };
  const lifted = full - openedOffset;
  const aboveKeyboard = container - keyboard;
  const compact = lifted > aboveKeyboard - nonNegative(topBarHeight);
  if (!compact) return { openedOffset, compact, fits: true };
  // Compacta: sem cabeçalho e com o paddingTop menor.
  const compactLifted = lifted - (KEY_BAR_PADDING_TOP - KEY_BAR_COMPACT_PADDING_TOP);
  return { openedOffset, compact, fits: compactLifted <= aboveKeyboard };
}

/**
 * Altura do conteúdo da barra guardada para a decisão: a medida nova, salvo
 * no layout de uma linha, que tem outra altura (R3). Assim a decisão segue a
 * barra empilhada e não alterna ao trocar de layout.
 */
export function nextKeyContentHeight(previous: number, measured: number, oneRow: boolean): number {
  return oneRow ? previous : nonNegative(measured);
}

/**
 * Altura da barra não compacta a partir do conteúdo medido (campo, contador e
 * botões), que é o mesmo nos dois modos: só o paddingTop muda. Assim a medida
 * não depende do modo em que a barra está (R-3). 0 = conteúdo ainda sem medida.
 */
export function keyBarFullHeight(contentHeight: number, insetBottom: number): number {
  const content = nonNegative(contentHeight);
  if (content === 0) return 0;
  return KEY_BAR_PADDING_TOP + content + KEY_BAR_PADDING_BOTTOM + nonNegative(insetBottom);
}

/**
 * O que vai no campo da chave (D-2 b, R6), a partir do texto novo do campo e
 * do valor anterior:
 * - até 44 dígitos: só os dígitos (tira espaços, pontos, letras);
 * - mais de 44 (chave colada junto de outros números, ou uma tecla a mais com
 *   o campo cheio): a única sequência de 44 dígitos seguidos, aceitando
 *   espaços, quebras de linha e pontos entre os blocos (formato do DANFE). Sem
 *   uma sequência única, fica o valor anterior: nunca se monta uma chave com
 *   dígitos de fora nem se descarta o último dígito digitado.
 */
export function normalizeChaveInput(text: string, previous = ""): string {
  const digits = (text ?? "").replace(/\D/g, "");
  if (digits.length <= CHAVE_DIGITS) return digits;
  const candidates = new Set<string>();
  for (const run of (text ?? "").match(/\d+(?:[\s.]+\d+)*/g) ?? []) {
    const groups = run.split(/[\s.]+/);
    for (let start = 0; start < groups.length; start++) {
      let joined = "";
      for (let end = start; end < groups.length && joined.length < CHAVE_DIGITS; end++) {
        joined += groups[end];
        if (joined.length === CHAVE_DIGITS) candidates.add(joined);
      }
    }
  }
  if (candidates.size !== 1) return (previous ?? "").replace(/\D/g, "").slice(0, CHAVE_DIGITS);
  return [...candidates][0];
}
