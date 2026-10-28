// Rodapé da revisão da nota (ParsedScreen) que sobe com o teclado (Story 13.2,
// D-1 a). Sem `react-native` aqui, para dar para testar no vitest.
import { KEYBOARD_BOTTOM_OFFSET, MIN_FIELD_SPACE } from "@/components/keyboardScrollDefaults";

/** Espaço mínimo que sobra para o campo focado entre o topo da rolagem e o rodapé erguido. */
export { MIN_FIELD_SPACE };

export interface ParsedFooterInput {
  /** Altura da janela (useWindowDimensions). */
  windowHeight: number;
  /** Altura do teclado agora (0 = fechado). Já inclui a barra de navegação. */
  keyboardHeight: number;
  /** Topo da área rolável, na coordenada da janela. */
  scrollTop: number;
  /** Altura do rodapé medida no layout (inclui o paddingBottom com insets.bottom). */
  footerHeight: number;
  /** insets.bottom da área segura. */
  insetBottom: number;
  /** Folga padrão do campo acima do teclado. */
  baseOffset?: number;
}

export interface ParsedFooterLayout {
  /** O rodapé sobe com o teclado (KeyboardStickyView `enabled`). */
  stickyEnabled: boolean;
  /** `offset.opened` do KeyboardStickyView: desconta o insets.bottom, nunca mais que o teclado. */
  openedOffset: number;
  /** `bottomOffset` da rolagem. */
  bottomOffset: number;
}

const nonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Com o teclado aberto, o rodapé erguido cobre a faixa logo acima do teclado, e
 * o campo focado precisa parar acima dele. Quando a janela é baixa (paisagem,
 * fonte grande) e o rodapé erguido não deixa ao menos `MIN_FIELD_SPACE` para o
 * campo, o rodapé deixa de subir (fica atrás do teclado) e a rolagem volta à
 * folga padrão, limitada ao que cabe.
 */
export function computeParsedFooterLayout({
  windowHeight,
  keyboardHeight,
  scrollTop,
  footerHeight,
  insetBottom,
  baseOffset = KEYBOARD_BOTTOM_OFFSET,
}: ParsedFooterInput): ParsedFooterLayout {
  const keyboard = nonNegative(keyboardHeight);
  const inset = nonNegative(insetBottom);
  // Teclado mais baixo que o inset (ex.: teclado físico com barra de sugestões)
  // não pode empurrar o rodapé para baixo. Com o teclado fechado o valor não é
  // usado; fica o inset para não pular no meio da animação de fechar.
  const openedOffset = keyboard > 0 ? Math.min(inset, keyboard) : inset;
  const overlap = Math.max(0, nonNegative(footerHeight) - openedOffset);

  // Espaço visível da rolagem acima do teclado.
  const available = nonNegative(windowHeight) - keyboard - nonNegative(scrollTop);
  const fitsWithFooter = available - overlap - baseOffset >= MIN_FIELD_SPACE;

  if (fitsWithFooter) {
    return { stickyEnabled: true, openedOffset, bottomOffset: baseOffset + overlap };
  }
  return {
    stickyEnabled: false,
    openedOffset,
    bottomOffset: Math.min(baseOffset, Math.max(0, available - MIN_FIELD_SPACE)),
  };
}

export interface NewItemDraft {
  isAddingItem: boolean;
  desc: string;
  unitPrice: string;
  ean: string;
  ncm: string;
}

/**
 * O formulário de novo item está aberto com dado digitado que ainda não virou
 * item (quantidade e unidade já vêm preenchidas com "1"/"UN" e não contam).
 */
export function hasPendingNewItem(d: NewItemDraft): boolean {
  if (!d.isAddingItem) return false;
  return [d.desc, d.unitPrice, d.ean, d.ncm].some((v) => v.trim() !== "");
}
