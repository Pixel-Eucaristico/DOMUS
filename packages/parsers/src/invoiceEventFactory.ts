import type { InvoiceImportedPayload, InvoiceConfirmedPayload } from "./types";
import { EVENT_TYPES } from "./types";

export function createInvoiceImportedEvent(payload: InvoiceImportedPayload) {
  return {
    type: EVENT_TYPES.INVOICE_IMPORTED,
    payload,
    metadata: {
      createdAt: new Date().toISOString(),
      deviceId: "local",
      version: 1,
    },
  };
}

export function createInvoiceConfirmedEvent(payload: InvoiceConfirmedPayload) {
  return {
    type: EVENT_TYPES.INVOICE_CONFIRMED,
    payload,
    metadata: {
      createdAt: new Date().toISOString(),
      deviceId: "local",
      version: 1,
    },
  };
}
