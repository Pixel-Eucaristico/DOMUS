export type {
  Invoice,
  InvoiceItem,
  InvoiceImportedPayload,
  AIClassificationCorrectedPayload,
  ClassificationResult,
  ClassifierAdapter,
  OCRResult,
  OCRAdapter,
  SefazFetcher,
} from "./src/types";
export { EVENT_TYPES } from "./src/types";

export { parseNFCeQRCode, isValidSefazUrl, extractUrlFromQRData } from "./src/qrcodeParser";
export type { QRCodeData } from "./src/qrcodeParser";

export { parseSefazHtml, fetchAndParseSefaz } from "./src/sefazParser";
export type { SefazParseResult } from "./src/sefazParser";

export { parseOCRText, parseFromImage } from "./src/ocrParser";
export type { OCRParseResult } from "./src/ocrParser";

export {
  classifyByKeyword,
  createKeywordClassifier,
  createGeminiClassifier,
  createHybridClassifier,
} from "./src/classifier";
export type { GeminiConfig } from "./src/classifier";

export {
  invoiceReducer,
  createInitialInvoiceState,
} from "./src/invoiceReducer";
export type { InvoiceState, StoredInvoice } from "./src/invoiceReducer";

export {
  importFromQRCode,
  importFromImage,
  importFromHtml,
  createClassificationCorrectionEvent,
} from "./src/importInvoice";
export type {
  ImportFromQRCodeOptions,
  ImportFromImageOptions,
  ImportFromHtmlOptions,
  ImportResult,
} from "./src/importInvoice";
