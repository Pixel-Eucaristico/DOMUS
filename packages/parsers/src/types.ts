export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  categoryId?: string;
  categoryConfidence?: number;
}

export interface Invoice {
  invoiceId: string;
  date: Date;
  items: InvoiceItem[];
  total: number;
  source: "qrcode" | "ocr" | "manual";
  rawUrl?: string;
}

export interface InvoiceImportedPayload {
  invoiceId: string;
  items: InvoiceItem[];
  total: number;
  date: string;
  source: "qrcode" | "ocr" | "manual";
}

export interface AIClassificationCorrectedPayload {
  invoiceId: string;
  itemIndex: number;
  oldCategoryId: string;
  newCategoryId: string;
}

export const EVENT_TYPES = {
  INVOICE_IMPORTED: "INVOICE_IMPORTED",
  AI_CLASSIFICATION_CORRECTED: "AI_CLASSIFICATION_CORRECTED",
} as const;

export interface ClassificationResult {
  categoryId: string;
  categoryGroup: "needs" | "wants" | "savings";
  confidence: number;
  method: "keyword" | "ai" | "manual";
}

export interface ClassifierAdapter {
  classify(itemName: string): Promise<ClassificationResult>;
}

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface OCRAdapter {
  recognizeText(imageUri: string): Promise<OCRResult>;
}

export interface SefazFetcher {
  fetchPage(url: string): Promise<string>;
}
