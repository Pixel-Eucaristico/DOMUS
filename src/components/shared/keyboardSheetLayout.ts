// Contas das folhas dentro de Modal: com formulário (KeyboardSheet, Story 13.3)
// e com busca em lista (KeyboardListSheet, Story 13.4).
// Sem `react-native` aqui, para dar para testar no vitest.
import { MIN_FIELD_SPACE } from "@/components/keyboardScrollDefaults";

export { MIN_FIELD_SPACE };

/** Altura mínima da lista de uma busca com o teclado aberto (uma linha), Story 13.4. */
export const MIN_LIST_SPACE = MIN_FIELD_SPACE;

/** Folga entre o conteúdo da folha e o topo do teclado (≥ 8 dp do FR-29). */
export const SHEET_KEYBOARD_GAP = 12;

/** Folga entre a barra de status e o topo da folha. */
export const SHEET_TOP_GAP = 8;

/**
 * Onde a folha fica (Story 13.4): `"bottom"` (folha de baixo, padrão da 13.3),
 * `"center"` (diálogo centrado, D-2) ou `"fill"` (tela cheia, D-3).
 */
export type SheetPlacement = "bottom" | "center" | "fill";

/** Margem do diálogo centrado: laterais e embaixo (folga até o teclado), como o overlay de antes. */
export const DIALOG_EDGE_PADDING = 20;

const nonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Altura do espaçador do KeyboardSafeView: o teclado menos o desconto (o
 * `paddingBottom` da folha, que já cobre a barra de navegação, menos a folga).
 * Nunca negativa nem maior que o teclado; 0 para entradas inválidas. Contínua:
 * com o teclado em 0 dá 0, então a folha volta ao lugar ao fechar.
 */
export function keyboardLift(keyboardHeight: number, liftDiscount: number): number {
  "worklet";
  const keyboard = Number.isFinite(keyboardHeight) && keyboardHeight > 0 ? keyboardHeight : 0;
  const discount = Number.isFinite(liftDiscount) && liftDiscount > 0 ? liftDiscount : 0;
  return keyboard > discount ? keyboard - discount : 0;
}

/**
 * Quanto descontar do teclado no espaçador do KeyboardSafeView: o
 * `paddingBottom` da folha (que já cobre a barra de navegação) menos a folga
 * `SHEET_KEYBOARD_GAP`. No diálogo centrado (`"center"`) o cartão não encosta
 * na borda de baixo: a raiz já reserva `DIALOG_EDGE_PADDING + insets.bottom`
 * embaixo, então o desconto é o `insets.bottom` (o teclado já inclui a barra de
 * navegação) e a folga até o teclado fica sendo a margem do diálogo. Único
 * lugar dessa conta (usado pelo KeyboardSheet, pelo KeyboardListSheet e pelas
 * funções de layout). Nunca negativo.
 */
export function sheetLiftDiscount(
  sheetPaddingBottom: number,
  placement: SheetPlacement = "bottom",
  insetBottom = 0,
): number {
  if (placement === "center") return nonNegative(insetBottom);
  return Math.max(0, nonNegative(sheetPaddingBottom) - SHEET_KEYBOARD_GAP);
}

/**
 * `paddingBottom` da folha: `max(insets.bottom, base)` quando a folha encosta
 * no fundo da tela (`"bottom"`, `"fill"`); no diálogo centrado só a `base`, porque
 * a barra de navegação fica abaixo da margem da raiz.
 */
export function sheetPaddingBottomFor(
  insetBottom: number,
  basePaddingBottom: number,
  placement: SheetPlacement = "bottom",
): number {
  const base = nonNegative(basePaddingBottom);
  return placement === "center" ? base : Math.max(nonNegative(insetBottom), base);
}

/**
 * Padding da raiz (o KeyboardSafeView) em volta da folha, por `placement`. No
 * diálogo, embaixo vai a margem mais a barra de navegação (com o teclado
 * fechado o cartão não entra embaixo dela; com o teclado aberto o desconto do
 * espaçador devolve esse `insets.bottom`, ver `sheetLiftDiscount`).
 */
export function sheetRootPadding(
  insetTop: number,
  placement: SheetPlacement = "bottom",
  insetBottom = 0,
): { top: number; bottom: number; horizontal: number } {
  if (placement === "fill") return { top: 0, bottom: 0, horizontal: 0 };
  const top = nonNegative(insetTop) + SHEET_TOP_GAP;
  if (placement === "center") {
    return { top, bottom: DIALOG_EDGE_PADDING + nonNegative(insetBottom), horizontal: DIALOG_EDGE_PADDING };
  }
  return { top, bottom: 0, horizontal: 0 };
}

/**
 * Altura do teclado que a folha usa. A folha começa em 0 ao montar e só passa a
 * seguir o teclado no primeiro `keyboardDidShow`/`keyboardDidHide` depois de
 * montar (`null` = nenhum evento ainda), para não herdar um estado velho do
 * teclado de antes do modal abrir.
 */
export function sheetKeyboardHeight(
  event: { type: "keyboardDidShow" | "keyboardDidHide"; height: number } | null,
): number {
  if (!event || event.type === "keyboardDidHide") return 0;
  return nonNegative(event.height);
}

/**
 * O que fazer ao tocar no fundo escuro do modal: com o teclado aberto, o
 * primeiro toque só fecha o teclado (não perde o que foi digitado); com o
 * teclado fechado, fecha o modal.
 */
export function backdropPressAction(keyboardVisible: boolean): "dismissKeyboard" | "close" {
  return keyboardVisible ? "dismissKeyboard" : "close";
}

export interface KeyboardSheetLayoutInput {
  /** Altura da janela (useWindowDimensions). Na janela do Modal, é a tela toda. */
  windowHeight: number;
  /** Altura do teclado agora (0 = fechado). Já inclui a barra de navegação. */
  keyboardHeight: number;
  /** insets.top da área segura. */
  insetTop: number;
  /** paddingBottom da folha: max(insets.bottom, base). */
  sheetPaddingBottom: number;
  /** Do topo da folha até o fim do cabeçalho fixo (inclui o paddingTop da folha). */
  headerHeight: number;
  /** Altura do rodapé medida no layout. */
  footerHeight: number;
  /** Altura máxima da folha como fração da janela (0,85, 0,90, 0,92). */
  maxHeightRatio: number;
  /** Onde a folha fica; padrão `"bottom"` (Story 13.3). */
  placement?: SheetPlacement;
  /** insets.bottom da área segura; só conta no `"center"`. */
  insetBottom?: number;
}

export interface KeyboardSheetLayout {
  /** Altura do espaçador abaixo da folha. */
  lift: number;
  /** Altura máxima que a folha pode ter agora (entre a barra de status e o espaçador). */
  sheetMaxHeight: number;
  /** Espaço que sobra para a rolagem com o rodapé fixo. */
  scrollSpace: number;
  /** O rodapé fica fixo acima do teclado; `false` = vai para o fim da rolagem (D-3). */
  footerPinned: boolean;
  /**
   * O cabeçalho fica fixo no topo da folha; `false` = entra no começo da
   * rolagem. Só acontece quando o rodapé já foi para a rolagem e o espaço
   * ainda fica abaixo de `MIN_FIELD_SPACE` (paisagem com teclado alto).
   */
  headerPinned: boolean;
}

interface SheetBoundsInput {
  windowHeight: number;
  keyboardHeight: number;
  insetTop: number;
  sheetPaddingBottom: number;
  maxHeightRatio: number;
  placement?: SheetPlacement;
  insetBottom?: number;
}

/**
 * Espaçador e altura máxima da folha agora: entre a margem de cima da raiz e o
 * espaçador (e, no diálogo, a margem de baixo). Mesma conta para o
 * KeyboardSheet e o KeyboardListSheet.
 */
function sheetBounds({
  windowHeight,
  keyboardHeight,
  insetTop,
  sheetPaddingBottom,
  maxHeightRatio,
  placement = "bottom",
  insetBottom = 0,
}: SheetBoundsInput): { lift: number; sheetMaxHeight: number } {
  const window = nonNegative(windowHeight);
  const keyboard = nonNegative(keyboardHeight);
  const ratio = Math.min(nonNegative(maxHeightRatio), 1);
  const root = sheetRootPadding(insetTop, placement, insetBottom);
  const lift = keyboardLift(keyboard, sheetLiftDiscount(sheetPaddingBottom, placement, insetBottom));
  const sheetMaxHeight = Math.max(0, Math.min(ratio * window, window - root.top - root.bottom - lift));
  return { lift, sheetMaxHeight };
}

/**
 * Onde fica o rodapé da folha. O encolhimento em si é do Yoga (`flexShrink`);
 * aqui só se decide se, com o teclado aberto, o rodapé fixo ainda deixa ao
 * menos `MIN_FIELD_SPACE` para o campo. Se não deixa (paisagem, fonte grande),
 * o rodapé vai para o fim da rolagem, como no parsedFooterLayout da 13.2.
 * Com `placement` `"center"` o cartão fica entre a barra de status e a margem
 * de baixo da raiz acima do teclado; com `"fill"`, entre o topo da tela e o
 * espaçador (Story 13.4).
 */
export function computeKeyboardSheetLayout({
  windowHeight,
  keyboardHeight,
  insetTop,
  sheetPaddingBottom,
  headerHeight,
  footerHeight,
  maxHeightRatio,
  placement = "bottom",
  insetBottom = 0,
}: KeyboardSheetLayoutInput): KeyboardSheetLayout {
  const keyboard = nonNegative(keyboardHeight);
  const paddingBottom = nonNegative(sheetPaddingBottom);
  const { lift, sheetMaxHeight } = sheetBounds({
    windowHeight,
    keyboardHeight: keyboard,
    insetTop,
    sheetPaddingBottom: paddingBottom,
    maxHeightRatio,
    placement,
    insetBottom,
  });
  const header = nonNegative(headerHeight);
  const scrollSpace = Math.max(0, sheetMaxHeight - header - nonNegative(footerHeight) - paddingBottom);
  const footerPinned = !(keyboard > 0 && scrollSpace < MIN_FIELD_SPACE);
  // Com o rodapé já na rolagem, o espaço que sobra entre o cabeçalho e o fundo da folha.
  const spaceWithoutFooter = Math.max(0, sheetMaxHeight - header - paddingBottom);
  const headerPinned = footerPinned || spaceWithoutFooter >= MIN_FIELD_SPACE;
  return { lift, sheetMaxHeight, scrollSpace, footerPinned, headerPinned };
}

export interface KeyboardListSheetLayoutInput {
  /** Altura da janela (useWindowDimensions). Na janela do Modal, é a tela toda. */
  windowHeight: number;
  /** Altura do teclado agora (0 = fechado). */
  keyboardHeight: number;
  /** insets.top da área segura. */
  insetTop: number;
  /** paddingBottom da folha: max(insets.bottom, base). */
  sheetPaddingBottom: number;
  /** Do topo da folha até o fim da busca com o título à mostra (inclui o paddingTop da folha). */
  headerHeight: number;
  /** Altura (fixa ou máxima) da folha como fração da janela (0,75, 0,80, 0,85). */
  maxHeightRatio: number;
}

export interface KeyboardListSheetLayout {
  /** Altura do espaçador abaixo da folha. */
  lift: number;
  /** Altura máxima que a folha pode ter agora. */
  sheetMaxHeight: number;
  /** `true` = o título (alça, título, fechar) sai e fica só a busca, R-1. */
  titleCollapsed: boolean;
}

/**
 * Folha de busca em lista (KeyboardListSheet, Story 13.4): o título e a busca
 * ficam fixos e a lista encolhe. Com o teclado aberto, se o cabeçalho completo
 * deixa menos de `MIN_LIST_SPACE` para a lista (paisagem, fonte grande), o
 * título recolhe. A decisão usa sempre a altura com o título, para não
 * alternar.
 */
export function computeKeyboardListSheetLayout({
  windowHeight,
  keyboardHeight,
  insetTop,
  sheetPaddingBottom,
  headerHeight,
  maxHeightRatio,
}: KeyboardListSheetLayoutInput): KeyboardListSheetLayout {
  const keyboard = nonNegative(keyboardHeight);
  const paddingBottom = nonNegative(sheetPaddingBottom);
  const { lift, sheetMaxHeight } = sheetBounds({
    windowHeight,
    keyboardHeight: keyboard,
    insetTop,
    sheetPaddingBottom: paddingBottom,
    maxHeightRatio,
  });
  const listSpace = Math.max(0, sheetMaxHeight - nonNegative(headerHeight) - paddingBottom);
  const titleCollapsed = keyboard > 0 && listSpace < MIN_LIST_SPACE;
  return { lift, sheetMaxHeight, titleCollapsed };
}

/** O que a folha de busca renderiza, na ordem. */
export type ListSheetSlot = "title" | "search" | "list";

/**
 * Os filhos da folha de busca, por posição (R1 da revisão da 13.4). O título
 * recolhido vira `null` no mesmo índice: a busca e a lista ficam sempre na
 * mesma posição da árvore, então o React mantém a mesma instância do campo e o
 * teclado não fecha quando o título recolhe ou volta.
 */
export function listSheetSlots(titleCollapsed: boolean): readonly (ListSheetSlot | null)[] {
  return [titleCollapsed ? null : "title", "search", "list"];
}

/**
 * Até onde vai o cabeçalho com o título à mostra, a partir das medidas: o fim
 * da busca (`y + altura` do espaço da busca) e, com o título recolhido, mais a
 * última altura medida do título.
 */
export function listSheetHeaderHeight(searchBottom: number, titleHeight: number, titleCollapsed: boolean): number {
  return nonNegative(searchBottom) + (titleCollapsed ? nonNegative(titleHeight) : 0);
}
export interface FocusScrollInput {
  /** Topo e fundo do campo focado, na coordenada da janela. */
  inputTop: number;
  inputBottom: number;
  /** Topo e fundo da área visível da rolagem, na coordenada da janela. */
  viewportTop: number;
  viewportBottom: number;
  /** Folga mínima entre o campo e a borda da área. */
  gap: number;
}

/**
 * Quanto rolar para o campo focado ficar dentro da área visível com folga.
 * Positivo: rolar para baixo (o campo passa do fundo). Negativo: para cima (o
 * campo está acima do topo). 0: já está visível. Campo mais alto que a área
 * (multiline): alinha pelo topo.
 */
export function computeFocusScrollDelta({
  inputTop,
  inputBottom,
  viewportTop,
  viewportBottom,
  gap,
}: FocusScrollInput): number {
  const values = [inputTop, inputBottom, viewportTop, viewportBottom];
  if (!values.every(Number.isFinite) || inputBottom < inputTop || viewportBottom <= viewportTop) return 0;
  const g = nonNegative(gap);
  const top = viewportTop + g;
  const bottom = viewportBottom - g;
  if (inputBottom - inputTop > bottom - top) return inputTop - top;
  if (inputTop < top) return inputTop - top;
  if (inputBottom > bottom) return inputBottom - bottom;
  return 0;
}

export interface FocusScrollTargetInput {
  /** Topo do campo focado no conteúdo da rolagem (`measureLayout` relativo ao conteúdo). */
  inputY: number;
  /** Altura do campo focado. */
  inputHeight: number;
  /** Topo do conteúdo da rolagem na janela (`measureInWindow`; já descontada a rolagem atual). */
  contentWindowY: number;
  /** Topo da área visível da rolagem na janela (`measureInWindow`). */
  viewportWindowY: number;
  /** Altura da área visível da rolagem. */
  viewportHeight: number;
  /** Folga mínima entre o campo e a borda da área. */
  gap: number;
}

/**
 * Para onde rolar (deslocamento absoluto) para o campo focado ficar visível
 * com folga, ou `null` se não precisa rolar. A posição atual da rolagem vem das
 * medidas (topo da área − topo do conteúdo na janela), nunca de um `scrollY`
 * guardado de `onScroll`.
 */
export function computeFocusScrollTarget({
  inputY,
  inputHeight,
  contentWindowY,
  viewportWindowY,
  viewportHeight,
  gap,
}: FocusScrollTargetInput): number | null {
  const values = [inputY, inputHeight, contentWindowY, viewportWindowY, viewportHeight];
  if (!values.every(Number.isFinite) || inputHeight < 0 || viewportHeight <= 0) return null;
  const offset = Math.max(0, viewportWindowY - contentWindowY);
  const delta = computeFocusScrollDelta({
    inputTop: inputY - offset,
    inputBottom: inputY + inputHeight - offset,
    viewportTop: 0,
    viewportBottom: viewportHeight,
    gap,
  });
  if (delta === 0) return null;
  return Math.max(0, offset + delta);
}
