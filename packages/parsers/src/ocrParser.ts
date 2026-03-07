import type { InvoiceItem, OCRAdapter, OCRResult } from "./types";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

export interface OCRParseResult {
  invoiceId: string;
  date: Date | null;
  items: InvoiceItem[];
  totalAmount: number;
  confidence: number;
}

// ── Patterns ────────────────────────────────────────────────────────────────

// "ARROZ 5KG 2 x 22,90" or "ARROZ 5KG 2 x 22,90 R$ 45,80"
// Price MUST have decimal separator (comma or dot+2digits) to avoid matching "58X70" as qty×price
const ITEM_QTY_X_PRICE = /^(.+?)\s+(\d+[\.,]?\d*)\s+[xX×]\s+R?\$?\s*(\d+[\.,]\d+)\s*(?:R?\$?\s*(\d+[\.,]\d+))?$/;

// "ARROZ 5KG R$ 15,90" or "ARROZ 5KG 15,90"
const ITEM_SIMPLE_PRICE = /^(.+?)\s+R?\$\s*(\d{1,6}[\.,]\d{2})$/;

// "1,000 Un x 11,49 11,49" or "2,000 UN X 22,9000 (45,80)" — NFC-e detail line
const NFCE_DETAIL_LINE = /^(\d+[\.,]?\d*)\s*(?:UN|KG|LT?|CX|PC|PCT|ML|M2?|GR?|DZ|PAR)\s*[xX×]\s*(\d+[\.,]?\d+)\s*(?:\(?\s*(\d+[\.,]?\d*)\s*\)?)?\s*$/i;

// "Qtde.: 2,000 UN Vl.Unit: 22,90 Vl.Total: 45,80"
const NFCE_LABEL_LINE = /(?:qtd[e.]?)[.:]*\s*(\d+[\.,]?\d*)\s*(?:UN|KG|LT?|CX|PC|PCT|ML|M2?|GR?|DZ|PAR)?\s*(?:vl?\s*\.?\s*unit[.:]*\s*(\d+[\.,]?\d+))?\s*(?:vl?\s*\.?\s*total[.:]*\s*(\d+[\.,]?\d+))?/i;

// Column format: "001 ARROZ 5KG 2 22,90 45,80" (seq desc qty unitprice total)
const ITEM_COLUMN = /^(\d{1,4})\s+(.+?)\s+(\d+[\.,]?\d*)\s+(\d+[\.,]\d{2})\s+(\d+[\.,]\d{2})$/;

// Total line — requires value with decimal separator (comma or dot+2 digits)
// to avoid matching barcodes/codes
const TOTAL_LINE_PATTERN = /(?:total|valor\s*total|total\s*r\$|vlr?\s*total)\s*:?\s*R?\$?\s*(\d{1,6}[\.,]\d{2})\b/i;

const DATE_LINE_PATTERN = /(\d{2}\/\d{2}\/\d{4})/;

// Lines that are just a numeric code (EAN, product code, sequence number)
const PURE_CODE_LINE = /^\d{3,}$/;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse Brazilian decimal: "1.234,56" → 1234.56, "22,90" → 22.9 */
function parseDecimal(value: string): number {
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Strip leading numeric codes from a product description */
function stripLeadingCodes(text: string): string {
  // Remove leading sequence number: "001 " or "01 "
  let cleaned = text.replace(/^\d{1,4}\s+/, "");
  // Remove leading EAN/barcode (8-14 digits followed by space)
  cleaned = cleaned.replace(/^\d{8,14}\s+/, "");
  return cleaned.trim();
}

function isHeaderOrFooter(text: string): boolean {
  const skipTerms = [
    "cnpj", "cpf", "consumidor", "troco", "subtotal",
    "forma", "pagamento", "dinheiro", "credito", "debito", "pix",
    "obrigado", "volte", "sempre", "fiscal", "endereco",
    "chave de acesso", "protocolo", "consulta", "sefaz",
    "nfce", "nfc-e", "nota fiscal", "tributos", "imposto",
    "contribuinte", "inscricao", "operacao", "emissao",
    "recebido", "autorizado", "serie", "numero",
    "documento aux", "qtd. total", "qtd total", "valor total",
    "valor a pagar", "valor pago", "vl. total r$",
    "item | cod", "item |cod", "desc | qtde", "unit | vl",
    "loja=", "pdv=", "seq=", "telefone:",
  ];
  const lower = text.toLowerCase();
  return skipTerms.some((term) => lower.includes(term));
}

/** Check if a price is plausible for a single item (R$ 0.01 – R$ 99.999) */
function isPlausiblePrice(value: number): boolean {
  return value > 0 && value < 100_000;
}

// ── Main parser ─────────────────────────────────────────────────────────────

export function parseOCRText(ocrResult: OCRResult): OCRParseResult {
  const lines = ocrResult.text.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: InvoiceItem[] = [];
  let totalAmount = 0;
  let date: Date | null = null;

  // Pending description from a previous line (for multi-line NFC-e items)
  let pendingDescription: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // ── Skip pure numeric codes (barcodes, sequence numbers on their own) ──
    if (PURE_CODE_LINE.test(line)) {
      continue;
    }

    // ── Date extraction ──
    if (!date) {
      const dateMatch = line.match(DATE_LINE_PATTERN);
      if (dateMatch?.[1]) {
        const [d, m, y] = dateMatch[1].split("/");
        date = new Date(parseInt(y!), parseInt(m!) - 1, parseInt(d!));
      }
    }

    // ── Skip header/footer lines ──
    if (isHeaderOrFooter(line)) {
      pendingDescription = null;
      continue;
    }

    // ── Try NFC-e detail line (quantity line after product name) ──
    // Must be checked BEFORE total, because label lines contain "Vl.Total"
    const nfceDetail = line.match(NFCE_DETAIL_LINE);
    if (nfceDetail && pendingDescription) {
      const quantity = parseDecimal(nfceDetail[1]!);
      const unitPrice = parseDecimal(nfceDetail[2]!);
      const totalPrice = nfceDetail[3] ? parseDecimal(nfceDetail[3]) : quantity * unitPrice;
      if (quantity > 0 && unitPrice > 0 && isPlausiblePrice(unitPrice)) {
        items.push({
          description: pendingDescription,
          quantity,
          unitPrice,
          totalPrice,
        });
      }
      pendingDescription = null;
      continue;
    }

    // ── Try NFC-e label line (Qtde.: X UN Vl.Unit: Y Vl.Total: Z) ──
    // Must be checked BEFORE total, because label lines contain "Vl.Total"
    const nfceLabel = line.match(NFCE_LABEL_LINE);
    if (nfceLabel && pendingDescription) {
      const quantity = parseDecimal(nfceLabel[1]!);
      const unitPrice = nfceLabel[2] ? parseDecimal(nfceLabel[2]) : 0;
      const totalPrice = nfceLabel[3] ? parseDecimal(nfceLabel[3]) : quantity * unitPrice;
      if (quantity > 0 && (unitPrice > 0 || totalPrice > 0)) {
        items.push({
          description: pendingDescription,
          quantity,
          unitPrice: unitPrice || (totalPrice / quantity),
          totalPrice: totalPrice || (quantity * unitPrice),
        });
      }
      pendingDescription = null;
      continue;
    }

    // ── Total extraction (after NFC-e checks to avoid matching "Vl.Total") ──
    const totalMatch = line.match(TOTAL_LINE_PATTERN);
    if (totalMatch?.[1]) {
      const parsed = parseDecimal(totalMatch[1]);
      if (isPlausiblePrice(parsed)) {
        totalAmount = parsed;
      }
      continue;
    }

    // ── Try "QTY x PRICE" format ──
    const itemMatch = line.match(ITEM_QTY_X_PRICE);
    if (itemMatch) {
      const description = stripLeadingCodes(itemMatch[1]!);
      const quantity = parseDecimal(itemMatch[2]!);
      const unitPrice = parseDecimal(itemMatch[3]!);
      const totalPrice = itemMatch[4] ? parseDecimal(itemMatch[4]) : quantity * unitPrice;
      if (description.length > 1 && quantity > 0 && unitPrice > 0 && isPlausiblePrice(unitPrice)) {
        items.push({ description, quantity, unitPrice, totalPrice });
        pendingDescription = null;
        continue;
      }
    }

    // ── Try column format: SEQ DESC QTY UNIT_PRICE TOTAL ──
    const columnMatch = line.match(ITEM_COLUMN);
    if (columnMatch) {
      const description = columnMatch[2]!.trim();
      const quantity = parseDecimal(columnMatch[3]!);
      const unitPrice = parseDecimal(columnMatch[4]!);
      const totalPrice = parseDecimal(columnMatch[5]!);
      if (description.length > 1 && quantity > 0 && unitPrice > 0 && isPlausiblePrice(unitPrice)) {
        items.push({ description, quantity, unitPrice, totalPrice });
        pendingDescription = null;
        continue;
      }
    }

    // ── Try simple price format: "ITEM R$ 15,90" ──
    const simpleMatch = line.match(ITEM_SIMPLE_PRICE);
    if (simpleMatch) {
      const description = stripLeadingCodes(simpleMatch[1]!);
      const price = parseDecimal(simpleMatch[2]!);
      if (description.length > 2 && isPlausiblePrice(price) && !isHeaderOrFooter(description)) {
        items.push({
          description,
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
        });
        pendingDescription = null;
        continue;
      }
    }

    // ── If the line looks like a product description, save it for multi-line ──
    // A product description line: starts with letters or a code prefix, no price
    const hasPrice = /\d+[\.,]\d{2}\s*$/.test(line);
    if (!hasPrice && line.length > 2 && /[A-Za-zÀ-ú]/.test(line)) {
      pendingDescription = stripLeadingCodes(line);
    }
  }

  // ── Fallback total: sum of items ──
  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
  }

  // ── Sanity check: if total is unreasonably large, recalculate from items ──
  if (totalAmount > 100_000 && items.length > 0) {
    const itemsTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
    if (itemsTotal < totalAmount) {
      totalAmount = itemsTotal;
    }
  }

  return {
    invoiceId: generateId(),
    date,
    items,
    totalAmount: Math.round(totalAmount * 100) / 100,
    confidence: ocrResult.confidence,
  };
}

export async function parseFromImage(
  imageUri: string,
  ocrAdapter: OCRAdapter,
): Promise<OCRParseResult> {
  const ocrResult = await ocrAdapter.recognizeText(imageUri);
  return parseOCRText(ocrResult);
}
