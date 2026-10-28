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
  /** Altura da janela (useWindowDimensions). */
  windowHeight: number;
  /** Altura do teclado agora (0 = fechado). Já inclui a barra de navegação. */
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
}

/**
 * A faixa que a barra erguida ocupa acima do teclado é `fullBarHeight −
 * openedOffset`. Com o teclado aberto, se ela passa do que sobra entre o
 * cabeçalho e o teclado, a barra entra no modo compacto (D-1 a). A decisão usa
 * sempre a altura não compacta, para não alternar quando a barra encolhe; sem
 * medida (`fullBarHeight` 0, primeiro quadro) a barra fica como hoje.
 */
export function computeQrKeyBarLayout({
  windowHeight,
  keyboardHeight,
  insetBottom,
  topBarHeight,
  fullBarHeight,
}: QrKeyBarInput): QrKeyBarLayout {
  const keyboard = nonNegative(keyboardHeight);
  const full = nonNegative(fullBarHeight);
  const openedOffset = stickyOpenedOffset(insetBottom, keyboard);
  const lifted = full - openedOffset;
  const room = nonNegative(windowHeight) - keyboard - nonNegative(topBarHeight);
  const compact = keyboard > 0 && full > 0 && lifted > room;
  return { openedOffset, compact };
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
 * O que vai no campo da chave (D-2 b): só os dígitos, no máximo 44. Uma chave
 * colada com espaços, pontos ou quebras de linha (formato do DANFE) vira os 44
 * dígitos, em vez de ser cortada por um `maxLength` que conta caracteres.
 */
export function normalizeChaveInput(text: string): string {
  return (text ?? "").replace(/\D/g, "").slice(0, CHAVE_DIGITS);
}
