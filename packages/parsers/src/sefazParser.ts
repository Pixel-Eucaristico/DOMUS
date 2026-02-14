import type { InvoiceItem, SefazFetcher } from "./types";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

export interface SefazParseResult {
  invoiceId: string;
  date: Date | null;
  items: InvoiceItem[];
  total: number;
}

const ITEM_PATTERNS = [
  /<span[^>]*class="[^"]*txtTit[^"]*"[^>]*>(.*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*Rqtd[^"]*"[^>]*>.*?(\d+[\.,]?\d*)\s*<\/span>[\s\S]*?<span[^>]*class="[^"]*RvlUnit[^"]*"[^>]*>.*?(\d+[\.,]?\d*)\s*<\/span>[\s\S]*?<span[^>]*class="[^"]*valor[^"]*"[^>]*>.*?(\d+[\.,]?\d*)\s*<\/span>/gi,
  /<td[^>]*>\s*(.*?)\s*<\/td>\s*<td[^>]*>\s*(\d+[\.,]?\d*)\s*<\/td>\s*<td[^>]*>\s*R?\$?\s*(\d+[\.,]?\d*)\s*<\/td>\s*<td[^>]*>\s*R?\$?\s*(\d+[\.,]?\d*)\s*<\/td>/gi,
];

const TOTAL_PATTERNS = [
  /<span[^>]*class="[^"]*totalNumb[^"]*"[^>]*>\s*R?\$?\s*([\d.,]+)\s*<\/span>/i,
  /(?:valor\s*total|total\s*(?:da\s*)?nota|total\s*r\$)\s*:?\s*R?\$?\s*([\d.,]+)/i,
  /<span[^>]*id="[^"]*totalNota[^"]*"[^>]*>\s*R?\$?\s*([\d.,]+)\s*<\/span>/i,
];

const DATE_PATTERNS = [
  /(?:emiss[aã]o|data)[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
  /(\d{2}\/\d{2}\/\d{4})\s*\d{2}:\d{2}/,
  /(\d{4}-\d{2}-\d{2})T/,
];

function parseDecimal(value: string): number {
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function cleanProductName(name: string): string {
  return name
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(dateStr: string): Date | null {
  const slashMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
  }

  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(dateStr);
  }

  return null;
}

export function parseSefazHtml(html: string): SefazParseResult {
  const items = extractItems(html);
  const total = extractTotal(html) ?? items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const date = extractDate(html);
  const invoiceId = extractInvoiceId(html) ?? generateId();

  return {
    invoiceId,
    date,
    items,
    total: Math.round(total * 100) / 100,
  };
}

function extractItems(html: string): InvoiceItem[] {
  const items: InvoiceItem[] = [];

  for (const pattern of ITEM_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const name = cleanProductName(match[1]!);
      const quantity = parseDecimal(match[2]!);
      const _unitPrice = parseDecimal(match[3]!);
      const totalPrice = parseDecimal(match[4]!);

      if (name && quantity > 0) {
        items.push({
          name,
          quantity,
          price: Math.round((totalPrice / quantity) * 100) / 100,
        });
      }
    }
    if (items.length > 0) break;
  }

  if (items.length === 0) {
    const fallbackItems = extractItemsFallback(html);
    items.push(...fallbackItems);
  }

  return items;
}

function extractItemsFallback(html: string): InvoiceItem[] {
  const items: InvoiceItem[] = [];
  const prodPattern = /<span[^>]*class="[^"]*txtTit[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  const valPattern = /<span[^>]*class="[^"]*valor[^"]*"[^>]*>\s*R?\$?\s*([\d.,]+)\s*<\/span>/gi;

  const names: string[] = [];
  const values: number[] = [];

  let m: RegExpExecArray | null;
  while ((m = prodPattern.exec(html)) !== null) {
    names.push(cleanProductName(m[1]!));
  }
  while ((m = valPattern.exec(html)) !== null) {
    values.push(parseDecimal(m[1]!));
  }

  const count = Math.min(names.length, values.length);
  for (let i = 0; i < count; i++) {
    if (names[i] && values[i]! > 0) {
      items.push({
        name: names[i]!,
        quantity: 1,
        price: values[i]!,
      });
    }
  }

  return items;
}

function extractTotal(html: string): number | null {
  for (const pattern of TOTAL_PATTERNS) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const value = parseDecimal(match[1]);
      if (value > 0) return value;
    }
  }
  return null;
}

function extractDate(html: string): Date | null {
  for (const pattern of DATE_PATTERNS) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const date = parseDate(match[1]);
      if (date && !isNaN(date.getTime())) return date;
    }
  }
  return null;
}

function extractInvoiceId(html: string): string | null {
  const chaveMatch = html.match(/(?:chave[\s\w]*acesso|chave|chNFe)[:\s]*(\d{44})/i);
  if (chaveMatch?.[1]) return chaveMatch[1];

  const numMatch = html.match(/(?:n[uú]mero|nNF)[:\s]*(\d+)/i);
  if (numMatch?.[1]) return numMatch[1];

  return null;
}

export async function fetchAndParseSefaz(
  url: string,
  fetcher: SefazFetcher,
): Promise<SefazParseResult> {
  const html = await fetcher.fetchPage(url);
  return parseSefazHtml(html);
}
