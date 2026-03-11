import { AFFILIATE_CONFIG } from "../affiliateConfig";
import type { ScrapedProductData } from "../types";
import type { IScraperStrategy } from "./IScraperStrategy";
import {
  extractEan,
  extractNcm,
  extractImageUrl,
  extractProductName,
} from "./sharedExtractors";

export class MercadoLivreStrategy implements IScraperStrategy {
  id = "mercadolivre";
  name = "Mercado Livre";
  icon = "shopping-cart";
  baseUrls = ["mercadolivre.com.br", "mercadolibre.com", "meli.la"];
  searchUrl = "https://www.mercadolivre.com.br";
  isSponsored = true;

  buildSearchUrl(query: string): string {
    return query.trim()
      ? `https://lista.mercadolivre.com.br/${encodeURIComponent(query.trim())}`
      : this.searchUrl;
  }

  canHandle(url: string): boolean {
    return /mercadolivre\.com\.br|mercadolibre\.com|meli\.la/i.test(url);
  }

  buildAffiliateUrl(_url: string): string | undefined {
    return AFFILIATE_CONFIG.mercadolivre.link;
  }

  extractData(html: string, url: string): ScrapedProductData {
    const price = this.extractPrice(html);
    const ean = extractEan(html);
    const ncm = extractNcm(html);
    const name = extractProductName(html);
    const imageUrl = extractImageUrl(html);
    const affiliateUrl = this.buildAffiliateUrl(url);

    return { price, ean, ncm, name, imageUrl, affiliateUrl };
  }

  private extractPrice(html: string): number | undefined {
    // Tentativa 1: Meta tag itemprop="price" (mais estável)
    const itemprop = html.match(/itemprop="price"\s+content="([\d.,]+)"/i);
    if (itemprop?.[1]) {
      const v = this.parseRawPrice(itemprop[1]);
      if (v !== undefined) return v;
    }

    // Tentativa 2: Open Graph price
    const ogPrice =
      html.match(/<meta[^>]+property="og:price:amount"[^>]+content="([\d.,]+)"/i) ??
      html.match(/<meta[^>]+content="([\d.,]+)"[^>]+property="og:price:amount"/i);
    if (ogPrice?.[1]) {
      const v = this.parseRawPrice(ogPrice[1]);
      if (v !== undefined) return v;
    }

    // Tentativa 3: JSON-LD
    const jsonLdPrice = this.extractFromJsonLd(html);
    if (jsonLdPrice !== undefined) return jsonLdPrice;

    // Tentativa 4: Seletor CSS do Andes (sistema de design do ML)
    return this.extractFromHtml(html);
  }

  private extractFromJsonLd(html: string): number | undefined {
    const scriptPattern = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = scriptPattern.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        const entries = Array.isArray(data) ? data : [data];
        for (const entry of entries) {
          if (entry?.["@type"] === "Product" && entry.offers) {
            const offers = Array.isArray(entry.offers) ? entry.offers : [entry.offers];
            for (const offer of offers) {
              const v = this.parseRawPrice(offer.price ?? offer.lowPrice);
              if (v !== undefined) return v;
            }
          }
        }
      } catch {
        // JSON inválido
      }
    }
    return undefined;
  }

  private extractFromHtml(html: string): number | undefined {
    // Inteiro + fração separados pelo componente andes-money-amount
    const fraction = html.match(/class="andes-money-amount__fraction"[^>]*>([\d]+)</i);
    const cents = html.match(/class="andes-money-amount__cents"[^>]*>([\d]+)</i);
    if (fraction?.[1]) {
      const whole = fraction[1].replace(/\./g, "");
      const dec = cents?.[1] ?? "00";
      const v = parseFloat(`${whole}.${dec}`);
      if (!isNaN(v) && v > 0) return v;
    }

    // Fallback: R$ no HTML geral
    const fallback = html.match(/R\$\s*([\d]{1,3}(?:[.,][\d]{3})*(?:[.,][\d]{2}))/);
    if (fallback?.[1]) return this.parseRawPrice(fallback[1]);
    return undefined;
  }

  private parseRawPrice(raw: string | number | undefined): number | undefined {
    if (raw === undefined || raw === null) return undefined;
    const s = String(raw).trim();
    const normalized = s.includes(",")
      ? s.replace(/\./g, "").replace(",", ".")
      : s;
    const v = parseFloat(normalized);
    if (!isNaN(v) && v > 0 && v < 1_000_000) return v;
    return undefined;
  }
}
