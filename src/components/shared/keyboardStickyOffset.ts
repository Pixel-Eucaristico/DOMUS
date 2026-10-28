// `offset.opened` do KeyboardStickyView das barras que sobem com o teclado
// (rodapé do ParsedScreen, Story 13.2, e barra da chave da NF, Story 13.6).
// Sem `react-native` aqui, para dar para testar no vitest.

const nonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * A altura do teclado da biblioteca já inclui a barra de navegação, e a barra
 * tem `paddingBottom` com o `insets.bottom`: o `opened` desconta o inset. Um
 * teclado mais baixo que o inset (teclado físico só com a faixa de sugestões,
 * teclado flutuante) não pode empurrar a barra para baixo (`translateY`
 * positivo), então o desconto nunca passa da altura do teclado. Com o teclado
 * fechado o valor não é usado; fica o inset para não pular no meio da animação
 * de fechar. Entradas não finitas ou negativas valem 0.
 */
export function stickyOpenedOffset(insetBottom: number, keyboardHeight: number): number {
  const inset = nonNegative(insetBottom);
  const keyboard = nonNegative(keyboardHeight);
  return keyboard > 0 ? Math.min(inset, keyboard) : inset;
}

/**
 * Altura-alvo do teclado a partir do evento do keyboard-controller (`onStart`
 * já traz a altura final da animação; `onEnd` confirma). Usada pelo
 * `useKeyboardTargetHeight` (Story 13.6, R2/R4): com a altura-alvo desde o
 * começo da animação, o `opened` nunca passa do teclado em nenhum quadro e as
 * decisões de layout (compacto, rodapé ligado) saem antes da barra subir.
 */
export function keyboardTargetHeight(eventHeight: number): number {
  return nonNegative(eventHeight);
}
