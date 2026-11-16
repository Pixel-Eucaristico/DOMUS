export interface OnPrimaryTokens {
  /** Cor principal de texto e ícones em destaque sobre `primaryColor` */
  text: string;
  /** Cor secundária para labels e ícones auxiliares sobre `primaryColor` */
  muted: string;
  /** Cor terciária para metadados sutis (ex.: contagem de contas) sobre `primaryColor` */
  subtle: string;
  /** Indica se `primaryColor` é claro e requer texto escuro */
  isLight: boolean;
}

const DARK_ON_LIGHT = "#1A1814";
const LIGHT_ON_DARK = "#FFFFFF";

/** Limiar de luminância relativa WCAG acima do qual texto escuro oferece melhor contraste (crossover #1A1814 vs #FFFFFF ≈ 0.198) */
const LIGHT_LUMINANCE_THRESHOLD = 0.198;

function parseHexRgb(hex: string): [number, number, number] | null {
  if (typeof hex !== "string") return null;
  const cleaned = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) return null;

  if (cleaned.length === 3 || cleaned.length === 4) {
    if (cleaned.length === 4) {
      const a = parseInt(cleaned[3] + cleaned[3], 16);
      if (a < 128) return null;
    }
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return [r, g, b];
  }

  if (cleaned.length === 6 || cleaned.length === 8) {
    if (cleaned.length === 8) {
      const a = parseInt(cleaned.slice(6, 8), 16);
      if (a < 128) return null;
    }
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return [r, g, b];
  }

  return null;
}

function linearizeChannel(channel255: number): number {
  const srgb = channel255 / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

/**
 * Calcula a luminância relativa WCAG 2.x (0 = preto, 1 = branco) de uma cor hex.
 * Retorna `null` para entradas inválidas.
 */
export function getRelativeLuminance(hex: string): number | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return (
    0.2126 * linearizeChannel(r) +
    0.7152 * linearizeChannel(g) +
    0.0722 * linearizeChannel(b)
  );
}

/**
 * Indica se a cor hex é clara o suficiente para exigir texto escuro (`#1A1814`).
 * Entradas inválidas retornam `false` (fallback seguro para texto branco).
 */
export function isLightColor(hex: string): boolean {
  const luminance = getRelativeLuminance(hex);
  if (luminance === null) return false;
  return luminance > LIGHT_LUMINANCE_THRESHOLD;
}

/**
 * Retorna a cor de texto com alto contraste (`#1A1814` ou `#FFFFFF`) para um fundo hex.
 */
export function getContrastTextColor(hex: string): string {
  return isLightColor(hex) ? DARK_ON_LIGHT : LIGHT_ON_DARK;
}

/**
 * Retorna o conjunto de tokens de texto/ícone sobre `theme.primaryColor`.
 */
export function getOnPrimaryTokens(primaryColor: string): OnPrimaryTokens {
  const light = isLightColor(primaryColor);
  if (light) {
    return {
      text: DARK_ON_LIGHT,
      muted: "rgba(26,24,20,0.75)",
      subtle: "rgba(26,24,20,0.6)",
      isLight: true,
    };
  }
  return {
    text: LIGHT_ON_DARK,
    muted: "rgba(255,255,255,0.7)",
    subtle: "rgba(255,255,255,0.5)",
    isLight: false,
  };
}

export interface ResolvePrimaryButtonTextColorParams {
  variant?: string;
  backgroundColor?: unknown;
  bg?: unknown;
  color?: unknown;
}

/**
 * Resolve a cor automática do texto para botões primários (`variant` undefined ou `"primary"`)
 * quando não há `color` explícito e o fundo (`backgroundColor` ou `bg`) é uma cor hex.
 */
export function resolvePrimaryButtonTextColor({
  variant,
  backgroundColor,
  bg,
  color,
}: ResolvePrimaryButtonTextColorParams): string | undefined {
  if (color !== undefined) return undefined;
  if (variant !== undefined && variant !== "primary") return undefined;
  const effectiveBg = backgroundColor ?? bg;
  if (typeof effectiveBg === "string" && effectiveBg.startsWith("#")) {
    return getContrastTextColor(effectiveBg);
  }
  return undefined;
}
