import { resolveCategory } from "./ncmMapping";
import type { ScrapedProductData } from "./types";
import { ScraperRegistry } from "./scrapers/ScraperRegistry";
import {
  extractEan,
  extractNcm,
  extractImageUrl,
  extractProductName,
  extractPriceGeneric,
} from "./scrapers/sharedExtractors";

export class WishlistScraperService {
  async scrape(url: string): Promise<ScrapedProductData> {
    let html = "";
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
      });
      html = await response.text();
    } catch {
      return {};
    }

    const strategy = ScraperRegistry.findForUrl(url);

    let result: ScrapedProductData;
    if (strategy) {
      result = strategy.extractData(html, url);
    } else {
      // Extração genérica para lojas sem estratégia específica
      const price = extractPriceGeneric(html);
      const ean = extractEan(html);
      const ncm = extractNcm(html);
      const name = extractProductName(html);
      const imageUrl = extractImageUrl(html);
      result = { price, ean, ncm, name, imageUrl };
    }

    // Resolve categoria via NCM/EAN/nome (funciona para todas as estratégias)
    if (!result.category) {
      result = {
        ...result,
        category: resolveCategory(result.ncm, result.ean, result.name),
      };
    }

    return result;
  }

  buildAffiliateUrl(url: string): string | undefined {
    const strategy = ScraperRegistry.findForUrl(url);
    return strategy?.buildAffiliateUrl(url);
  }

  isAmazonUrl(url: string): boolean {
    return ScraperRegistry.findForUrl(url)?.id === "amazon";
  }

  isMercadoLivreUrl(url: string): boolean {
    return ScraperRegistry.findForUrl(url)?.id === "mercadolivre";
  }
}

export const wishlistScraperService = new WishlistScraperService();
