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
  // Padrão 1: spans SEFAZ SP (txtTit/txtTit2, Rqtd, RUN opcional, RvlUnit, valor)
  // [\s\S]*? em vez de .*? para capturar conteúdo com newlines dentro dos spans
  // (\d[\d.,]*) exige ao menos um dígito — [\d.,]+ sozinho capturava só o "."
  // de "Qtde." / "Vl. Unit." e zerava quantidade/preço, descartando os itens
  /<span[^>]*class="[^"]*txtTit2?[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*Rqtd[^"]*"[^>]*>[\s\S]*?(\d[\d.,]*)[\s\S]*?<\/span>(?:[\s\S]*?<span[^>]*class="[^"]*RUN[^"]*"[^>]*>([\s\S]*?)<\/span>)?[\s\S]*?<span[^>]*class="[^"]*RvlUnit[^"]*"[^>]*>[\s\S]*?(\d[\d.,]*)[\s\S]*?<\/span>[\s\S]*?<span[^>]*class="[^"]*valor[^"]*"[^>]*>[\s\S]*?(\d[\d.,]*)[\s\S]*?<\/span>/gi,
  // Padrão 2: tabela com classes fixo-prod-serv-* (outros estados)
  /<tr[^>]*>[\s\S]*?<td[^>]*class="[^"]*fixo-prod-serv-descricao[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*class="[^"]*fixo-prod-serv-qtd[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*class="[^"]*fixo-prod-serv-uc[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*class="[^"]*fixo-prod-serv-vb[^"]*"[^>]*>([\s\S]*?)<\/td>/gi,
];


const DATE_PATTERNS = [
  /(?:emissão|data)[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
  /(\d{2}\/\d{2}\/\d{4})\s*\d{2}:\d{2}:\d{2}/,
  // Alguns estados exibem data/hora em formato ISO (2026-02-14T15:30:00)
  /(\d{4}-\d{2}-\d{2})/,
];

// SEFAZ SP usa id="u20" class="txtTopo" — outros estados usam txtNome
const EMITTER_NAME_PATTERN =
  /<div[^>]*(?:id="u20"|class="[^"]*txtTopo[^"]*"|id="[^"]*txtNome[^"]*"|class="[^"]*txtNome[^"]*")[^>]*>(.*?)<\/div>/i;
const EMITTER_CNPJ_PATTERN = /CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i;

function parseDecimal(value: string): number {
  // Remove R$, espaços e outros caracteres não numéricos (mantém , e .)
  const cleaned = value.replace(/[^\d.,]/g, "");
  if (!cleaned) return 0;
  // NFC-e quantidade: "1.000" = 1 unidade (ponto como decimal sem vírgula)
  if (/^\d+\.\d{1,3}$/.test(cleaned) && !cleaned.includes(",")) {
    return parseFloat(cleaned);
  }
  // Formato brasileiro: "1.234,56" → 1234.56
  return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
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

  // Padrão 1 (SP spans): groups = [1]=desc, [2]=qty, [3]=unit(opcional), [4]=unitPrice, [5]=totalPrice
  const pattern1 = ITEM_PATTERNS[0]!;
  pattern1.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern1.exec(html)) !== null) {
    const description = cleanProductName(match[1]!);
    const quantity = parseDecimal(match[2]!);
    const unit = match[3] ? cleanProductName(match[3]).trim() || undefined : undefined;
    const unitPrice = parseDecimal(match[4]!);
    const totalPrice = parseDecimal(match[5]!);

    if (description && quantity > 0) {
      items.push({ description, quantity, unit, unitPrice, totalPrice });
    }
  }
  if (items.length > 0) return items;

  // Padrão 2 (tabela fixo-prod-serv-*): groups = [1]=desc, [2]=qty, [3]=unit, [4]=totalPrice
  const pattern2 = ITEM_PATTERNS[1]!;
  pattern2.lastIndex = 0;
  while ((match = pattern2.exec(html)) !== null) {
    const description = cleanProductName(match[1]!);
    const quantity = parseDecimal(match[2]!);
    const unit = match[3] ? cleanProductName(match[3]).trim() || undefined : undefined;
    const totalPrice = parseDecimal(match[4]!);

    if (description && quantity > 0) {
      items.push({ description, quantity, unit, unitPrice: 0, totalPrice });
    }
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
  // Prioridade 1: span.totalNumb.txtMax = "Valor a pagar" no SEFAZ SP
  // (o último totalNumb pode ser tributos: 10,11 — não o total da nota)
  const reTxtMax = /<span[^>]*class="[^"]*totalNumb[^"]*txtMax[^"]*"[^>]*>\s*([\d.,]+)\s*<\/span>/i;
  const mMax = html.match(reTxtMax);
  if (mMax?.[1]) {
    const v = parseDecimal(mMax[1]!);
    if (v > 0) return v;
  }

  // Prioridade 2: label "Valor a pagar" seguido de totalNumb
  const reVap = /(?:Valor\s*a\s*pagar[^<]{0,30})<span[^>]*class="[^"]*totalNumb[^"]*"[^>]*>\s*([\d.,]+)\s*<\/span>/i;
  const mVap = html.match(reVap);
  if (mVap?.[1]) {
    const v = parseDecimal(mVap[1]!);
    if (v > 0) return v;
  }

  // Prioridade 3: outros padrões de "VALOR A PAGAR" / "VALOR TOTAL"
  const m2 = html.match(/valor\s*(?:a\s*pagar|total)[^R\d]{0,20}R?\$?\s*([\d.,]+)/i);
  if (m2?.[1]) {
    const v = parseDecimal(m2[1]!);
    if (v > 0) return v;
  }

  // Prioridade 4: "valor total da nota"
  const m3 = html.match(/valor\s*total\s*da\s*nota\s*:?\s*R?\$?\s*([\d.,]+)/i);
  if (m3?.[1]) {
    const v = parseDecimal(m3[1]!);
    if (v > 0) return v;
  }

  // Último recurso: último totalNumb com valor razoável (acima de 1 real)
  const re4 = /<span[^>]*class="[^"]*totalNumb[^"]*"[^>]*>\s*([\d.,]+)\s*<\/span>/gi;
  let bestVal: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = re4.exec(html)) !== null) {
    const v = parseDecimal(m[1]!);
    // Ignorar valores claramente pequenos que parecem tributos ou contagens
    if (v > 0 && v >= 1) bestVal = v;
  }
  return bestVal;
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
