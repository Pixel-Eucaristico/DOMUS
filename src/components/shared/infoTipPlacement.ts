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

export interface TipSafeInsets {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
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
  insets: TipSafeInsets = {},
): TipPlacement {
  const leftMargin = Math.max(TIP_MARGIN, (insets.left ?? 0) + 8);
  const rightMargin = Math.max(TIP_MARGIN, (insets.right ?? 0) + 8);
  const topMargin = Math.max(TIP_MARGIN, (insets.top ?? 0) + 8);
  const bottomMargin = Math.max(TIP_MARGIN, (insets.bottom ?? 0) + 8);

  const width = Math.max(0, Math.min(TIP_MAX_WIDTH, screenW - leftMargin - rightMargin));
  const centerX = anchor.x + anchor.width / 2;
  const left = Math.min(Math.max(centerX - width / 2, leftMargin), Math.max(leftMargin, screenW - width - rightMargin));

  const clampedY = Math.min(Math.max(anchor.y, 0), screenH);
  const spaceBelow = screenH - (clampedY + anchor.height) - TIP_ARROW - bottomMargin;
  const spaceAbove = clampedY - TIP_ARROW - topMargin;
  const fitsBelow = bubbleHeight <= spaceBelow;
  const fitsAbove = bubbleHeight <= spaceAbove;
  const above = !fitsBelow && (fitsAbove || spaceAbove > spaceBelow);

  const arrowMin = 12;
  const arrowMax = Math.max(arrowMin, width - 12 - TIP_ARROW * 2);
  const arrowLeft = Math.min(Math.max(centerX - left - TIP_ARROW, arrowMin), arrowMax);

  return above
    ? {
        left,
        width,
        bottom: Math.max(bottomMargin, screenH - clampedY + TIP_ARROW),
        above,
        arrowLeft,
        maxHeight: Math.max(0, spaceAbove),
      }
    : {
        left,
        width,
        top: Math.max(topMargin, clampedY + anchor.height + TIP_ARROW),
        above,
        arrowLeft,
        maxHeight: Math.max(0, spaceBelow),
      };
}
