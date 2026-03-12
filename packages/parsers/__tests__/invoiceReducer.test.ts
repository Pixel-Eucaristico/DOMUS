import { describe, it, expect } from "vitest";
import {
  invoiceReducer,
  createInitialInvoiceState,
} from "../src/invoiceReducer";

import { EVENT_TYPES, type InvoiceItem } from "../src/types";
import type { InvoiceImportedPayload } from "../src/types";

describe("invoiceReducer", () => {
  describe("INVOICE_IMPORTED", () => {
    it("adds an invoice to state", () => {
      const state = createInitialInvoiceState();
      const payload: InvoiceImportedPayload = {
        invoiceId: "inv-001",
        emitter: { name: "Test Store", cnpj: "00.000.000/0001-00" },
        items: [
          { description: "ARROZ 5KG", quantity: 1, unitPrice: 22.9, totalPrice: 22.9 },
          { description: "FEIJAO 1KG", quantity: 2, unitPrice: 8.5, totalPrice: 17.0 },
        ],
        totalAmount: 39.9,
        date: "2026-02-14T15:00:00.000Z",
        source: "SEFAZ_QR",
      };

      const newState = invoiceReducer(state, {
        type: EVENT_TYPES.INVOICE_IMPORTED,
        payload,
        timestamp: Date.now(),
      });

      expect(newState.invoices.size).toBe(1);
      const invoice = newState.invoices.get("inv-001");
      expect(invoice).toBeDefined();
      expect(invoice!.items).toHaveLength(2);
      expect(invoice!.totalAmount).toBe(39.9);
      expect(invoice!.source).toBe("SEFAZ_QR");
    });

    it("handles multiple invoices", () => {
      let state = createInitialInvoiceState();

      state = invoiceReducer(state, {
        type: EVENT_TYPES.INVOICE_IMPORTED,
        payload: {
          invoiceId: "inv-001",
          emitter: { name: "A", cnpj: "" },
          items: [{ description: "A", quantity: 1, unitPrice: 10, totalPrice: 10 }],
          totalAmount: 10,
          date: "2026-02-14T10:00:00.000Z",
          source: "SEFAZ_QR",
        },
        timestamp: 1000,
      });

      state = invoiceReducer(state, {
        type: EVENT_TYPES.INVOICE_IMPORTED,
        payload: {
          invoiceId: "inv-002",
          emitter: { name: "B", cnpj: "" },
          items: [{ description: "B", quantity: 1, unitPrice: 20, totalPrice: 20 }],
          totalAmount: 20,
          date: "2026-02-14T12:00:00.000Z",
          source: "OCR_FALLBACK",
        },
        timestamp: 2000,
      });

      expect(state.invoices.size).toBe(2);
    });

    it("does not mutate original state", () => {
      const state = createInitialInvoiceState();
      const payload: InvoiceImportedPayload = {
        invoiceId: "inv-001",
        emitter: { name: "X", cnpj: "" },
        items: [{ description: "X", quantity: 1, unitPrice: 5, totalPrice: 5 }],
        totalAmount: 5,
        date: "2026-02-14T10:00:00.000Z",
        source: "SEFAZ_QR",
      };

      const newState = invoiceReducer(state, {
        type: EVENT_TYPES.INVOICE_IMPORTED,
        payload,
        timestamp: Date.now(),
      });

      expect(state.invoices.size).toBe(0);
      expect(newState.invoices.size).toBe(1);
    });
  });

  describe("unknown events", () => {
    it("returns state unchanged for unknown event types", () => {
      const state = createInitialInvoiceState();
      const newState = invoiceReducer(state, {
        type: "UNKNOWN_EVENT",
        payload: {},
        timestamp: Date.now(),
      });
      expect(newState).toBe(state);
    });
  });
});
