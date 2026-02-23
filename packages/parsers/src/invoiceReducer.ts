import type { InvoiceItem, InvoiceImportedPayload, AIClassificationCorrectedPayload } from "./types";
import { EVENT_TYPES } from "./types";

export interface InvoiceState {
  invoices: Map<string, StoredInvoice>;
}

export interface StoredInvoice {
  invoiceId: string;
  source: "SEFAZ_QR" | "OCR_FALLBACK";
  emitter: {
    cnpj: string;
    name: string;
  };
  date: string;
  items: InvoiceItem[];
  totalAmount: number;
  importedAt: number;
  confirmed: boolean;
  confirmedAt?: number;
}

export function createInitialInvoiceState(): InvoiceState {
  return { invoices: new Map() };
}

export function invoiceReducer(
  state: InvoiceState,
  event: { type: string; payload: any; timestamp: number },
): InvoiceState {
  switch (event.type) {
    case EVENT_TYPES.INVOICE_IMPORTED: {
      const payload = event.payload as InvoiceImportedPayload;
      const newInvoices = new Map(state.invoices);
      newInvoices.set(payload.invoiceId, {
        invoiceId: payload.invoiceId,
        source: payload.source,
        emitter: payload.emitter,
        date: payload.date,
        items: [...payload.items],
        totalAmount: payload.totalAmount,
        importedAt: event.timestamp,
        confirmed: false,
      });
      return { invoices: newInvoices };
    }

    case EVENT_TYPES.INVOICE_CONFIRMED: {
      const payload = event.payload as InvoiceConfirmedPayload;
      const invoice = state.invoices.get(payload.invoiceId);
      if (!invoice) return state;

      const newInvoices = new Map(state.invoices);
      newInvoices.set(payload.invoiceId, {
        ...invoice,
        confirmed: true,
        confirmedAt: event.timestamp,
      });
      return { invoices: newInvoices };
    }

    default:
      return state;
  }
}
