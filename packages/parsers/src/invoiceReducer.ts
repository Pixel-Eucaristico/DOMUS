import type { InvoiceItem, InvoiceImportedPayload, AIClassificationCorrectedPayload } from "./types";
import { EVENT_TYPES } from "./types";

export interface InvoiceState {
  invoices: Map<string, StoredInvoice>;
}

export interface StoredInvoice {
  invoiceId: string;
  date: string;
  items: InvoiceItem[];
  total: number;
  source: "qrcode" | "ocr" | "manual";
  importedAt: number;
}

export function createInitialInvoiceState(): InvoiceState {
  return { invoices: new Map() };
}

export function invoiceReducer(
  state: InvoiceState,
  event: { type: string; payload: unknown; timestamp: number },
): InvoiceState {
  switch (event.type) {
    case EVENT_TYPES.INVOICE_IMPORTED: {
      const payload = event.payload as InvoiceImportedPayload;
      const newInvoices = new Map(state.invoices);
      newInvoices.set(payload.invoiceId, {
        invoiceId: payload.invoiceId,
        date: payload.date,
        items: [...payload.items],
        total: payload.total,
        source: payload.source,
        importedAt: event.timestamp,
      });
      return { invoices: newInvoices };
    }

    case EVENT_TYPES.AI_CLASSIFICATION_CORRECTED: {
      const payload = event.payload as AIClassificationCorrectedPayload;
      const invoice = state.invoices.get(payload.invoiceId);
      if (!invoice) return state;

      const updatedItems = [...invoice.items];
      if (payload.itemIndex >= 0 && payload.itemIndex < updatedItems.length) {
        updatedItems[payload.itemIndex] = {
          ...updatedItems[payload.itemIndex]!,
          categoryId: payload.newCategoryId,
          categoryConfidence: 1.0,
        };
      }

      const newInvoices = new Map(state.invoices);
      newInvoices.set(payload.invoiceId, {
        ...invoice,
        items: updatedItems,
      });
      return { invoices: newInvoices };
    }

    default:
      return state;
  }
}
