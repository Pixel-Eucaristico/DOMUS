import type { IScraperStrategy } from "./IScraperStrategy";
import { AmazonStrategy } from "./AmazonStrategy";
import { MercadoLivreStrategy } from "./MercadoLivreStrategy";

const scrapers: IScraperStrategy[] = [
  new AmazonStrategy(),
  new MercadoLivreStrategy(),
  // Para adicionar nova loja: new ShopeeStrategy(), new MagaluStrategy(), etc.
];

export const ScraperRegistry = {
  /** Retorna todas as estratégias registradas */
  getAll(): IScraperStrategy[] {
    return scrapers;
  },

  /** Retorna a estratégia adequada para a URL ou null se nenhuma conhecida */
  findForUrl(url: string): IScraperStrategy | null {
    return scrapers.find((s) => s.canHandle(url)) ?? null;
  },
};
