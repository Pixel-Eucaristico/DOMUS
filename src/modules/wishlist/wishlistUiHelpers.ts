/** Placeholder conciso para o campo de link no modal de Adicionar Item, evitando corte horizontal. */
export const WISHLIST_LINK_PLACEHOLDER = "Cole o link ou toque na lupa";

/**
 * Indica se o botão de lixeira da Lista de Desejos deve ficar desabilitado.
 * Listas sem itens (ou com contagem não finita) não permitem ação de exclusão rápida.
 */
export function isWishlistTrashDisabled(itemCount: number): boolean {
  return !Number.isFinite(itemCount) || itemCount <= 0;
}

/**
 * Valida se o nome do item de desejo possui ao menos 2 caracteres úteis (sem contar espaços).
 */
export function isWishlistItemValid(name: string): boolean {
  return typeof name === "string" && name.trim().length >= 2;
}

/**
 * Retorna o título exibido da Lista de Desejos com fallback seguro para `"Desejos"`.
 */
export function getWishlistDisplayTitle(name?: string | null): string {
  return typeof name === "string" && name.trim().length > 0 ? name.trim() : "Desejos";
}
