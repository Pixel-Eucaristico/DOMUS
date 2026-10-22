export type {
  InvoiceItem,
  InvoiceEmitter,
  InvoiceImportedPayload,
  InvoiceConfirmedPayload,
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
  parsePayslipText,
  normalizePayslipPeriod,
  normalizeVisionPayslip,
  parseBRL,
  PAYSLIP_WARNINGS,
  normalizeCnpj,
} from "./src/payslipParser";
export type { PayslipParseResult, PayslipLine, VisionPayslipInput } from "./src/payslipParser";

export { QRScannerService } from "./src/qrScannerService";
export { SefazService } from "./src/sefazService";
export { OCRService } from "./src/ocrService";
export { InvoiceParser } from "./src/invoiceParser";
export { createInvoiceImportedEvent, createInvoiceConfirmedEvent } from "./src/invoiceEventFactory";

export {
  classifyByKeyword,
  classifyByNcm,
  classifyByNcmWithSiscomex,
  createKeywordClassifier,
  createGeminiClassifier,
  createHybridClassifier,
  classifyItemFull,
  getSiscomexCache,
  restoreSiscomexCache,
  NCM_SUBCATEGORIES,
  findSubcategoryByNcm,
  getSubcategoryById,
  getSubcategoriesForParent,
  getParentCategoryIds,
  lookupByEAN,
  clearEANCache,
} from "./src/classifier";
export type {
  GeminiConfig,
  ExtendedClassificationResult,
  ClassifyItemInput,
  ClassifyItemOptions,
  NCMSubcategory,
  EANLookupResult,
} from "./src/classifier";

export { HybridOCRAdapter, createHybridOCRAdapter } from "./src/hybridOcrAdapter";
export type { CloudVisionConfig, OCRProvider, HybridOCRConfig } from "./src/hybridOcrAdapter";

export {
  invoiceReducer,
  createInitialInvoiceState,
} from "./src/invoiceReducer";
export type { InvoiceState, StoredInvoice } from "./src/invoiceReducer";

export {
  buildAutoFillScript,
  buildCaptureScript,
  buildPhase2Script,
} from "./src/sefazWebViewScripts";
