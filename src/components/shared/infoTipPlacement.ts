/** Cálculo puro da posição do balão do InfoTip (testável sem react-native). */

export interface TipAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TipPlacement {
  left: number;
  width: number;
  /** Distância do topo da tela (balão abaixo do ícone) */
  top?: number;
  /** Distância da base da tela (balão acima do ícone) */
  bottom?: number;
  above: boolean;
  arrowLeft: number;
  /** Altura máxima disponível no lado escolhido (o texto rola se passar) */
  maxHeight: number;
}

export const TIP_MAX_WIDTH = 300;
export const TIP_MARGIN = 12;
export const TIP_ARROW = 8;

/**
 * Abre abaixo do ícone quando o balão cabe; senão, abre acima se lá couber;
 * se nenhum lado couber, usa o lado com mais espaço e limita a altura.
 * `bubbleHeight` é a altura medida (antes da medição, use uma estimativa).
 */
export function computeTipPlacement(
  anchor: TipAnchor,
  screenW: number,
  screenH: number,
  bubbleHeight: number,
): TipPlacement {
  const width = Math.max(0, Math.min(TIP_MAX_WIDTH, screenW - TIP_MARGIN * 2));
  const centerX = anchor.x + anchor.width / 2;
  const left = Math.min(Math.max(centerX - width / 2, TIP_MARGIN), Math.max(TIP_MARGIN, screenW - width - TIP_MARGIN));

  const spaceBelow = screenH - (anchor.y + anchor.height) - TIP_ARROW - TIP_MARGIN;
  const spaceAbove = anchor.y - TIP_ARROW - TIP_MARGIN;
  const fitsBelow = bubbleHeight <= spaceBelow;
  const fitsAbove = bubbleHeight <= spaceAbove;
  const above = !fitsBelow && (fitsAbove || spaceAbove > spaceBelow);

  const arrowMin = 12;
  const arrowMax = Math.max(arrowMin, width - 12 - TIP_ARROW * 2);
  const arrowLeft = Math.min(Math.max(centerX - left - TIP_ARROW, arrowMin), arrowMax);

  return above
    ? { left, width, bottom: screenH - anchor.y + TIP_ARROW, above, arrowLeft, maxHeight: Math.max(0, spaceAbove) }
    : { left, width, top: anchor.y + anchor.height + TIP_ARROW, above, arrowLeft, maxHeight: Math.max(0, spaceBelow) };
}
