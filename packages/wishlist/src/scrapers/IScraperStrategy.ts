import type { ScrapedProductData } from "../types";

export interface IScraperStrategy {
  id: string;
  name: string;
  /** Nome do ícone Feather ou URI de imagem */
  icon: string;
  /** Domínios que esta estratégia cobre, ex: ['amazon.com.br', 'amzn.to'] */
  baseUrls: string[];
  /** URL inicial padrão para abrir na WebView de busca */
  searchUrl: string;
  isSponsored?: boolean;

  canHandle(url: string): boolean;
  extractData(html: string, url: string): ScrapedProductData;
  buildAffiliateUrl(url: string): string | undefined;
  /** Monta URL de busca com termo, ex: https://amazon.com.br/s?k=termo */
  buildSearchUrl(query: string): string;
}
