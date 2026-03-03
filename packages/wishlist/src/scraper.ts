import { resolveCategory } from "./ncmMapping";
import { AFFILIATE_CONFIG } from "./affiliateConfig";
import type { ScrapedProductData } from "./types";

function buildAmazonAffiliateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("tag", AFFILIATE_CONFIG.amazon.tag);
    parsed.searchParams.set("linkCode", AFFILIATE_CONFIG.amazon.linkCode);
    parsed.searchParams.delete("ref_");
    return parsed.toString();
  } catch {
    return url;
  }
}

function isAmazonUrl(url: string): boolean {
  return /amazon\.(com\.br|com|es|de|fr|co\.uk|co\.jp)/i.test(url);
}

function isMercadoLivreUrl(url: string): boolean {
  return /mercadolivre\.com\.br|mercadolibre\.com|meli\.la/i.test(url);
}

function extractPrice(html: string): number | undefined {
  const patterns = [
    /"price"\s*:\s*"?([\d]+[.,][\d]{2})"?/i,
    /itemprop="price"\s+content="([\d.]+)"/i,
    /<meta[^>]+property="product:price:amount"[^>]+content="([\d.]+)"/i,
    /class="[^"]*price[^"]*"[^>]*>\s*R\$\s*([\d.,]+)/i,
    /R\$\s*([\d]{1,3}(?:[.,][\d]{3})*(?:[.,][\d]{2}))/,
    /([\d]{1,3}(?:\.\d{3})*,\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      // Se tem vírgula → formato brasileiro (1.234,56): remove pontos de milhar, troca vírgula por ponto
      // Se não tem vírgula → formato padrão com ponto decimal (55.30): mantém como está
      const normalized = match[1].includes(",")
        ? match[1].replace(/\./g, "").replace(",", ".")
        : match[1];
      const value = parseFloat(normalized);
      if (!isNaN(value) && value > 0 && value < 1_000_000) return value;
    }
  }
  return undefined;
}

function extractEan(html: string): string | undefined {
  const patterns = [
    /(?:EAN|GTIN|barcode)["\s:=]+["']?(\d{8,14})["']?/i,
    /"gtin\d*"\s*:\s*"(\d{8,14})"/i,
    /itemprop="gtin\d*"\s+content="(\d{8,14})"/i,
    /<span[^>]*>(\d{13})<\/span>/,
    /(\d{13})(?=\D|$)/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1] && /^\d{8,14}$/.test(match[1])) return match[1];
  }
  return undefined;
}

function extractNcm(html: string): string | undefined {
  const patterns = [
    /NCM[:\s]+(\d{4}\.?\d{2}\.?\d{2})/i,
    /(?:NCM|SH)["\s:=]+["']?(\d{8})["']?/i,
    /"ncm"\s*:\s*"(\d{4,8})"/i,
    /class="[^"]*ncm[^"]*"[^>]*>\s*(\d{4}\.?\d{2}\.?\d{2})/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].replace(/\D/g, "").substring(0, 8);
  }
  return undefined;
}

function extractImageUrl(html: string): string | undefined {
  const patterns = [
    /<meta[^>]+property="og:image"\s+content="([^"]+)"/i,
    /<meta[^>]+content="([^"]+)"\s+property="og:image"/i,
    /<meta[^>]+name="twitter:image"\s+content="([^"]+)"/i,
    /<meta[^>]+content="([^"]+)"\s+name="twitter:image"/i,
    /"image"\s*:\s*\{\s*"url"\s*:\s*"([^"]+)"/i,
    /"thumbnailUrl"\s*:\s*"([^"]+)"/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1] && match[1].startsWith("http")) {
      return match[1].replace(/&amp;/g, "&");
    }
  }
  return undefined;
}

function extractProductName(html: string): string | undefined {
  const patterns = [
    /<title>([^<|–-]{3,100})/i,
    /<h1[^>]*>([^<]{3,100})<\/h1>/i,
    /og:title"\s+content="([^"]{3,100})"/i,
    /"name"\s*:\s*"([^"]{3,100})"/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1]
        .trim()
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"');
    }
  }
  return undefined;
}

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

    const price = extractPrice(html);
    const ean = extractEan(html);
    const ncm = extractNcm(html);
    const name = extractProductName(html);
    const category = resolveCategory(ncm, ean, name);
    const imageUrl = extractImageUrl(html);

    let affiliateUrl: string | undefined;
    if (isAmazonUrl(url)) {
      affiliateUrl = buildAmazonAffiliateUrl(url);
    } else if (isMercadoLivreUrl(url)) {
      affiliateUrl = AFFILIATE_CONFIG.mercadolivre.link;
    }

    return { price, ean, ncm, category, name, affiliateUrl, imageUrl };
  }

  buildAffiliateUrl(url: string): string | undefined {
    if (isAmazonUrl(url)) return buildAmazonAffiliateUrl(url);
    if (isMercadoLivreUrl(url)) return AFFILIATE_CONFIG.mercadolivre.link;
    return undefined;
  }

  isAmazonUrl(url: string): boolean {
    return isAmazonUrl(url);
  }

  isMercadoLivreUrl(url: string): boolean {
    return isMercadoLivreUrl(url);
  }
}

export const wishlistScraperService = new WishlistScraperService();
