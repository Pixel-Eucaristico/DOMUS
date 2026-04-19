/** Funções de extração reutilizadas por todas as estratégias de scraping */

/** Decode all HTML entities: numeric hex (&#x27;), decimal (&#39;) and named (&amp; etc.) */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function extractEan(html: string): string | undefined {
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

export function extractNcm(html: string): string | undefined {
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

export function extractImageUrl(html: string): string | undefined {
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
      return decodeHtmlEntities(match[1]);
    }
  }
  return undefined;
}

export function extractProductName(html: string): string | undefined {
  const patterns = [
    /<title>([^<|–-]{3,100})/i,
    /<h1[^>]*>([^<]{3,100})<\/h1>/i,
    /og:title"\s+content="([^"]{3,100})"/i,
    /"name"\s*:\s*"([^"]{3,100})"/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }
  return undefined;
}

/** Extração genérica de preço (fallback para lojas sem estratégia específica) */
export function extractPriceGeneric(html: string): number | undefined {
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
      const normalized = match[1].includes(",")
        ? match[1].replace(/\./g, "").replace(",", ".")
        : match[1];
      const value = parseFloat(normalized);
      if (!isNaN(value) && value > 0 && value < 1_000_000) return value;
    }
  }
  return undefined;
}
