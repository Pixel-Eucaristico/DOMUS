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

const ITEM_LINE_PATTERN = /^(.+?)\s+(\d+[\.,]?\d*)\s*[xX×]\s*R?\$?\s*(\d+[\.,]?\d*)\s*(?:R?\$?\s*(\d+[\.,]?\d*))?$/;
const SIMPLE_ITEM_PATTERN = /^(.+?)\s+R?\$?\s*(\d+[\.,]?\d*)$/;
const TOTAL_LINE_PATTERN = /(?:total|valor\s*total|total\s*r\$)\s*:?\s*R?\$?\s*([\d.,]+)/i;
const DATE_LINE_PATTERN = /(\d{2}\/\d{2}\/\d{4})/;

function parseDecimal(value: string): number {
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseOCRText(ocrResult: OCRResult): OCRParseResult {
  const lines = ocrResult.text.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: InvoiceItem[] = [];
  let totalAmount = 0;
  let date: Date | null = null;

  for (const line of lines) {
    const totalMatch = line.match(TOTAL_LINE_PATTERN);
    if (totalMatch?.[1]) {
      totalAmount = parseDecimal(totalMatch[1]);
      continue;
    }

    if (!date) {
      const dateMatch = line.match(DATE_LINE_PATTERN);
      if (dateMatch?.[1]) {
        const [d, m, y] = dateMatch[1].split("/");
        date = new Date(parseInt(y!), parseInt(m!) - 1, parseInt(d!));
      }
    }

    const itemMatch = line.match(ITEM_LINE_PATTERN);
    if (itemMatch) {
      const description = itemMatch[1]!.trim();
      const quantity = parseDecimal(itemMatch[2]!);
      const unitPrice = parseDecimal(itemMatch[3]!);
      const totalPrice = itemMatch[4] ? parseDecimal(itemMatch[4]) : quantity * unitPrice;
      if (description.length > 1 && quantity > 0 && unitPrice > 0) {
        items.push({
          description,
          quantity,
          unitPrice,
          totalPrice,
        });
        continue;
      }
    }

    const simpleMatch = line.match(SIMPLE_ITEM_PATTERN);
    if (simpleMatch) {
      const description = simpleMatch[1]!.trim();
      const price = parseDecimal(simpleMatch[2]!);
      if (description.length > 2 && price > 0 && !isHeaderOrFooter(description)) {
        items.push({
          description,
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
        });
      }
    }
  }

  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
  }

  return {
    invoiceId: generateId(),
    date,
    items,
    totalAmount: Math.round(totalAmount * 100) / 100,
    confidence: ocrResult.confidence,
  };
}

function isHeaderOrFooter(text: string): boolean {
  const skipTerms = [
    "cnpj", "cpf", "consumidor", "troco", "subtotal",
    "forma", "pagamento", "dinheiro", "credito", "debito", "pix",
    "obrigado", "volte", "sempre", "fiscal", "endereco",
  ];
  const lower = text.toLowerCase();
  return skipTerms.some((term) => lower.includes(term));
}

export async function parseFromImage(
  imageUri: string,
  ocrAdapter: OCRAdapter,
): Promise<OCRParseResult> {
  const ocrResult = await ocrAdapter.recognizeText(imageUri);
  return parseOCRText(ocrResult);
}
