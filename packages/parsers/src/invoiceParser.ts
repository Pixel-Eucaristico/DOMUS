import { SefazParseResult } from "./sefazParser";
import { OCRParseResult } from "./ocrParser";
import { InvoiceImportedPayload } from "./types";

export class InvoiceParser {
  fromSefaz(result: SefazParseResult): InvoiceImportedPayload {
    return {
      invoiceId: result.invoiceId,
      source: "SEFAZ_QR",
      emitter: result.emitter,
      date: result.date?.toISOString() ?? new Date().toISOString(),
      items: result.items,
      totalAmount: result.totalAmount,
    };
  }

  fromOCR(result: OCRParseResult): InvoiceImportedPayload {
    return {
      invoiceId: result.invoiceId,
      source: "OCR_FALLBACK",
      emitter: { name: "Extracted via OCR", cnpj: "" },
      date: result.date?.toISOString() ?? new Date().toISOString(),
      items: result.items,
      totalAmount: result.totalAmount,
      confidenceScore: result.confidence,
    };
  }
}
