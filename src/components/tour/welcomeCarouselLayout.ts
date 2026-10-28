// Contas do cabeçalho do WelcomeCarousel (Story 13.4, R8 da revisão).
// Sem `react-native` aqui, para dar para testar no vitest.

/** Padding do botão "Pular" (st.skipBtn). */
export const SKIP_BUTTON_PADDING = 8;
/** Fonte do "Pular" (st.skipText). */
export const SKIP_FONT_SIZE = 14;
/** Altura de linha por ponto de fonte, com folga para a DM Sans. */
export const SKIP_LINE_HEIGHT_FACTOR = 1.4;

/**
 * Altura mínima do cabeçalho do carrossel para cobrir o botão "Pular"
 * (absoluto, a `skipTop` do topo) inteiro, com a fonte do sistema aumentada.
 * No Android, a parte de um filho fora do pai não recebe toque; com o
 * cabeçalho baixo (área segura pequena, fonte grande), o "Pular" perdia parte
 * da área de toque.
 */
export function skipHeaderMinHeight(skipTop: number, fontScale: number): number {
  const top = Number.isFinite(skipTop) && skipTop > 0 ? skipTop : 0;
  const scale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  return Math.ceil(top + 2 * SKIP_BUTTON_PADDING + SKIP_FONT_SIZE * SKIP_LINE_HEIGHT_FACTOR * scale);
}
