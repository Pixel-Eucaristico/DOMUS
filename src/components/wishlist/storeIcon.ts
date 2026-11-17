// Ícones das lojas via Google Favicon Service (128px). Envia o domínio da loja
// ao Google: só com a flag "Consultas de itens, preços e ícones" ligada.

/** URL do favicon, ou null para o ícone genérico (flag desligada ou imagem falhou). */
export function resolveStoreIconUrl(
  storeId: string,
  baseUrls: string[],
  remoteEnabled: boolean,
  failed = false,
): string | null {
  if (!remoteEnabled || failed) return null;
  const candidate = baseUrls.find((u) => u.trim().length > 0) ?? storeId;
  const host = candidate
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    ?.trim();
  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}
