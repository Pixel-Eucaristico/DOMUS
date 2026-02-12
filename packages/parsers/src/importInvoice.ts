import type {
  Invoice,
  InvoiceImportedPayload,
  AIClassificationCorrectedPayload,
  ClassifierAdapter,
  SefazFetcher,
  OCRAdapter,
} from "./types";
import { EVENT_TYPES } from "./types";
import { parseNFCeQRCode } from "./qrcodeParser";
import { parseSefazHtml, fetchAndParseSefaz } from "./sefazParser";
import { parseFromImage } from "./ocrParser";
import { createKeywordClassifier, createHybridClassifier } from "./classifier";

export interface ImportFromQRCodeOptions {
  qrData: string;
  fetcher: SefazFetcher;
  classifier?: ClassifierAdapter;
  geminiApiKey?: string;
}

export interface ImportFromImageOptions {
  imageUri: string;
  ocrAdapter: OCRAdapter;
  classifier?: ClassifierAdapter;
  geminiApiKey?: string;
}

export interface ImportFromHtmlOptions {
  html: string;
  classifier?: ClassifierAdapter;
  geminiApiKey?: string;
}

export interface ImportResult {
  invoice: Invoice;
  event: {
    type: string;
    payload: InvoiceImportedPayload;
  };
}

function getClassifier(
  classifier?: ClassifierAdapter,
  geminiApiKey?: string,
): ClassifierAdapter {
  if (classifier) return classifier;
  if (geminiApiKey) return createHybridClassifier(geminiApiKey);
  return createKeywordClassifier();
}

async function classifyItems(
  items: Array<{ name: string; quantity: number; price: number }>,
  classifier: ClassifierAdapter,
): Promise<Array<{ name: string; quantity: number; price: number; categoryId?: string; categoryConfidence?: number }>> {
  const classified = await Promise.all(
    items.map(async (item) => {
      const result = await classifier.classify(item.name);
      return {
        ...item,
        categoryId: result.categoryId,
        categoryConfidence: result.confidence,
      };
    }),
  );
  return classified;
}

export async function importFromQRCode(
  options: ImportFromQRCodeOptions,
): Promise<ImportResult> {
  const qrData = parseNFCeQRCode(options.qrData);
  if (!qrData) {
    throw new Error("QR Code invalido: nao contem URL da SEFAZ");
  }

  const parsed = await fetchAndParseSefaz(qrData.url, options.fetcher);
  const activeClassifier = getClassifier(options.classifier, options.geminiApiKey);
  const classifiedItems = await classifyItems(parsed.items, activeClassifier);

  const invoice: Invoice = {
    invoiceId: parsed.invoiceId,
    date: parsed.date ?? new Date(),
    items: classifiedItems,
    total: parsed.total,
    source: "qrcode",
    rawUrl: qrData.url,
  };

  return {
    invoice,
    event: {
      type: EVENT_TYPES.INVOICE_IMPORTED,
      payload: {
        invoiceId: invoice.invoiceId,
        items: invoice.items,
        total: invoice.total,
        date: invoice.date.toISOString(),
        source: "qrcode",
      },
    },
  };
}

export async function importFromImage(
  options: ImportFromImageOptions,
): Promise<ImportResult> {
  const parsed = await parseFromImage(options.imageUri, options.ocrAdapter);
  const activeClassifier = getClassifier(options.classifier, options.geminiApiKey);
  const classifiedItems = await classifyItems(parsed.items, activeClassifier);

  const invoice: Invoice = {
    invoiceId: parsed.invoiceId,
    date: parsed.date ?? new Date(),
    items: classifiedItems,
    total: parsed.total,
    source: "ocr",
  };

  return {
    invoice,
    event: {
      type: EVENT_TYPES.INVOICE_IMPORTED,
      payload: {
        invoiceId: invoice.invoiceId,
        items: invoice.items,
        total: invoice.total,
        date: invoice.date.toISOString(),
        source: "ocr",
      },
    },
  };
}

export async function importFromHtml(
  options: ImportFromHtmlOptions,
): Promise<ImportResult> {
  const parsed = parseSefazHtml(options.html);
  const activeClassifier = getClassifier(options.classifier, options.geminiApiKey);
  const classifiedItems = await classifyItems(parsed.items, activeClassifier);

  const invoice: Invoice = {
    invoiceId: parsed.invoiceId,
    date: parsed.date ?? new Date(),
    items: classifiedItems,
    total: parsed.total,
    source: "qrcode",
  };

  return {
    invoice,
    event: {
      type: EVENT_TYPES.INVOICE_IMPORTED,
      payload: {
        invoiceId: invoice.invoiceId,
        items: invoice.items,
        total: invoice.total,
        date: invoice.date.toISOString(),
        source: "qrcode",
      },
    },
  };
}

export function createClassificationCorrectionEvent(
  invoiceId: string,
  itemIndex: number,
  oldCategoryId: string,
  newCategoryId: string,
): { type: string; payload: AIClassificationCorrectedPayload } {
  return {
    type: EVENT_TYPES.AI_CLASSIFICATION_CORRECTED,
    payload: {
      invoiceId,
      itemIndex,
      oldCategoryId,
      newCategoryId,
    },
  };
}
