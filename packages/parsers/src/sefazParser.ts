import type { InvoiceItem, InvoiceEmitter, SefazFetcher } from "./types";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

export interface SefazParseResult {
  invoiceId: string;
  date: Date | null;
  items: InvoiceItem[];
  totalAmount: number;
  emitter: InvoiceEmitter;
}

const ITEM_PATTERNS = [
  /<span[^>]*class="[^"]*txtTit[^"]*"[^>]*>(.*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*Rqtd[^"]*"[^>]*>.*?(\d+[\.,]?\d*)\s*<\/span>[\s\S]*?<span[^>]*class="[^"]*RvlUnit[^"]*"[^>]*>.*?(\d+[\.,]?\d*)\s*<\/span>[\s\S]*?<span[^>]*class="[^"]*valor[^"]*"[^>]*>.*?(\d+[\.,]?\d*)\s*<\/span>/gi,
  /<tr[^>]*>[\s\S]*?<td[^>]*class="[^"]*fixo-prod-serv-descricao[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*class="[^"]*fixo-prod-serv-qtd[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*class="[^"]*fixo-prod-serv-uc[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*class="[^"]*fixo-prod-serv-vb[^"]*"[^>]*>([\s\S]*?)<\/td>/gi,
];

const TOTAL_PATTERNS = [
  /<span[^>]*class="[^"]*totalNumb[^"]*"[^>]*>\s*R?\$?\s*([\d.,]+)\s*<\/span>/i,
  /valor\s*total\s*da\s*nota\s*:?\s*R?\$?\s*([\d.,]+)/i,
];

const DATE_PATTERNS = [
  /(?:emissão|data)[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
  /(\d{2}\/\d{2}\/\d{4})\s*\d{2}:\d{2}:\d{2}/,
];

const EMITTER_NAME_PATTERN = /<div[^>]*id="[^"]*txtNome[^"]*"[^>]*>(.*?)<\/div>/i;
const EMITTER_CNPJ_PATTERN = /CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i;

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
  const totalAmount = extractTotal(html) ?? items.reduce((sum, i) => sum + i.totalPrice, 0);
  const date = extractDate(html);
  const invoiceId = extractInvoiceId(html) ?? generateId();
  const emitter = extractEmitter(html);

  return {
    invoiceId,
    date,
    items,
    totalAmount: Math.round(totalAmount * 100) / 100,
    emitter,
  };
}

function extractItems(html: string): InvoiceItem[] {
  const items: InvoiceItem[] = [];

  for (const pattern of ITEM_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const description = cleanProductName(match[1]!);
      const quantity = parseDecimal(match[2]!);
      const unitPrice = parseDecimal(match[3]!);
      const totalPrice = parseDecimal(match[4]!);

      if (description && quantity > 0) {
        items.push({
          description,
          quantity,
          unitPrice,
          totalPrice,
        });
      }
    }
    if (items.length > 0) break;
  }

  return items;
}

function extractEmitter(html: string): InvoiceEmitter {
  const nameMatch = html.match(EMITTER_NAME_PATTERN);
  const cnpjMatch = html.match(EMITTER_CNPJ_PATTERN);

  return {
    name: nameMatch ? cleanProductName(nameMatch[1]!) : "Desconhecido",
    cnpj: cnpjMatch ? cnpjMatch[1]!.replace(/\D/g, "") : "",
  };
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
