export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceEmitter {
  cnpj: string;
  name: string;
}

export interface InvoiceImportedPayload {
  invoiceId: string;
  source: "SEFAZ_QR" | "OCR_FALLBACK";
  emitter: InvoiceEmitter;
  date: string;
  items: InvoiceItem[];
  totalAmount: number;
  rawHtmlHash?: string;
  confidenceScore?: number;
}

export interface InvoiceConfirmedPayload {
  invoiceId: string;
  date: string;
  totalAmount: number;
}

export const EVENT_TYPES = {
  INVOICE_IMPORTED: "INVOICE_IMPORTED",
  INVOICE_CONFIRMED: "INVOICE_CONFIRMED",
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
