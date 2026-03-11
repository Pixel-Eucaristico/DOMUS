import { AFFILIATE_CONFIG } from "../affiliateConfig";
import type { ScrapedProductData } from "../types";
import type { IScraperStrategy } from "./IScraperStrategy";
import {
  extractEan,
  extractNcm,
  extractImageUrl,
  extractProductName,
} from "./sharedExtractors";

export class AmazonStrategy implements IScraperStrategy {
  id = "amazon";
  name = "Amazon";
  icon = "shopping-bag";
  baseUrls = ["amazon.com.br", "amazon.com", "amzn.to", "a.co"];
  searchUrl = "https://www.amazon.com.br";
  isSponsored = true;

  buildSearchUrl(query: string): string {
    return query.trim()
      ? `https://www.amazon.com.br/s?k=${encodeURIComponent(query.trim())}`
      : this.searchUrl;
  }

  canHandle(url: string): boolean {
    return /amazon\.(com\.br|com|es|de|fr|co\.uk|co\.jp)|amzn\.to|a\.co/i.test(url);
  }

  buildAffiliateUrl(url: string): string | undefined {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("tag", AFFILIATE_CONFIG.amazon.tag);
      parsed.searchParams.set("linkCode", AFFILIATE_CONFIG.amazon.linkCode);
      parsed.searchParams.delete("ref_");
      return parsed.toString();
    } catch {
      return undefined;
    }
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
    // Tentativa 1: JSON-LD estruturado
    const jsonLdPrice = this.extractFromJsonLd(html);
    if (jsonLdPrice !== undefined) return jsonLdPrice;

    // Tentativa 2: Meta tags Open Graph
    const metaPrice = this.extractFromMeta(html);
    if (metaPrice !== undefined) return metaPrice;

    // Tentativa 3: Seletores CSS específicos da Amazon
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
          const price = this.parseLdPrice(entry);
          if (price !== undefined) return price;
        }
      } catch {
        // JSON inválido — tentar próximo bloco
      }
    }
    return undefined;
  }

  private parseLdPrice(data: any): number | undefined {
    if (!data || typeof data !== "object") return undefined;
    // Produto direto
    if (data["@type"] === "Product") {
      const offers = data.offers;
      if (offers) {
        const offerList = Array.isArray(offers) ? offers : [offers];
        for (const offer of offerList) {
          const p = this.parseRawPrice(offer.price ?? offer.lowPrice);
          if (p !== undefined) return p;
        }
      }
    }
    // Buscar recursivamente em @graph
    if (Array.isArray(data["@graph"])) {
      for (const item of data["@graph"]) {
        const p = this.parseLdPrice(item);
        if (p !== undefined) return p;
      }
    }
    return undefined;
  }

  private extractFromMeta(html: string): number | undefined {
    const patterns = [
      /<meta[^>]+property="og:price:amount"[^>]+content="([\d.,]+)"/i,
      /<meta[^>]+content="([\d.,]+)"[^>]+property="og:price:amount"/i,
      /<meta[^>]+property="product:price:amount"[^>]+content="([\d.,]+)"/i,
      /<meta[^>]+content="([\d.,]+)"[^>]+property="product:price:amount"/i,
      /itemprop="price"\s+content="([\d.,]+)"/i,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) {
        const v = this.parseRawPrice(m[1]);
        if (v !== undefined) return v;
      }
    }
    return undefined;
  }

  private extractFromHtml(html: string): number | undefined {
    // Tenta extrair valor inteiro + fração do corePriceDisplay
    const wholeMatch = html.match(/class="a-price-whole"[^>]*>([\d.,]+)</i);
    const fracMatch = html.match(/class="a-price-fraction"[^>]*>([\d]+)</i);
    if (wholeMatch?.[1] && fracMatch?.[1]) {
      const whole = wholeMatch[1].replace(/[.,]/g, "");
      const val = parseFloat(`${whole}.${fracMatch[1]}`);
      if (!isNaN(val) && val > 0) return val;
    }
    // Fallback genérico R$
    const fallback = html.match(/R\$\s*([\d]{1,3}(?:[.,][\d]{3})*(?:[.,][\d]{2}))/);
    if (fallback?.[1]) return this.parseRawPrice(fallback[1]);
    return undefined;
  }

  private parseRawPrice(raw: string | number | undefined): number | undefined {
    if (raw === undefined || raw === null) return undefined;
    const s = String(raw).trim();
    // Formato brasileiro: 1.234,56
    const normalized = s.includes(",")
      ? s.replace(/\./g, "").replace(",", ".")
      : s;
    const v = parseFloat(normalized);
    if (!isNaN(v) && v > 0 && v < 1_000_000) return v;
    return undefined;
  }
}
