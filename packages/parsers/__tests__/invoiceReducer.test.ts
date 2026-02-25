import { describe, it, expect } from "vitest";
import {
  invoiceReducer,
  createInitialInvoiceState,
} from "../src/invoiceReducer";
import { EVENT_TYPES } from "../src/types";
import type { InvoiceImportedPayload, AIClassificationCorrectedPayload } from "../src/types";

describe("invoiceReducer", () => {
  describe("INVOICE_IMPORTED", () => {
    it("adds an invoice to state", () => {
      const state = createInitialInvoiceState();
      const payload: InvoiceImportedPayload = {
        invoiceId: "inv-001",
        items: [
          { name: "ARROZ 5KG", quantity: 1, price: 22.9, categoryId: "alimentacao" },
          { name: "FEIJAO 1KG", quantity: 2, price: 8.5, categoryId: "alimentacao" },
        ],
        total: 39.9,
        date: "2026-02-14T15:00:00.000Z",
        source: "qrcode",
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
      expect(invoice!.total).toBe(39.9);
      expect(invoice!.source).toBe("qrcode");
    });

    it("handles multiple invoices", () => {
      let state = createInitialInvoiceState();

      state = invoiceReducer(state, {
        type: EVENT_TYPES.INVOICE_IMPORTED,
        payload: {
          invoiceId: "inv-001",
          items: [{ name: "A", quantity: 1, price: 10 }],
          total: 10,
          date: "2026-02-14T10:00:00.000Z",
          source: "qrcode",
        } as InvoiceImportedPayload,
        timestamp: 1000,
      });

      state = invoiceReducer(state, {
        type: EVENT_TYPES.INVOICE_IMPORTED,
        payload: {
          invoiceId: "inv-002",
          items: [{ name: "B", quantity: 1, price: 20 }],
          total: 20,
          date: "2026-02-14T12:00:00.000Z",
          source: "ocr",
        } as InvoiceImportedPayload,
        timestamp: 2000,
      });

      expect(state.invoices.size).toBe(2);
    });

    it("does not mutate original state", () => {
      const state = createInitialInvoiceState();
      const payload: InvoiceImportedPayload = {
        invoiceId: "inv-001",
        items: [{ name: "X", quantity: 1, price: 5 }],
        total: 5,
        date: "2026-02-14T10:00:00.000Z",
        source: "manual",
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

  describe("AI_CLASSIFICATION_CORRECTED", () => {
    it("updates item category", () => {
      let state = createInitialInvoiceState();
      state = invoiceReducer(state, {
        type: EVENT_TYPES.INVOICE_IMPORTED,
        payload: {
          invoiceId: "inv-001",
          items: [
            { name: "ITEM A", quantity: 1, price: 10, categoryId: "outros" },
            { name: "ITEM B", quantity: 1, price: 20, categoryId: "lazer" },
          ],
          total: 30,
          date: "2026-02-14T10:00:00.000Z",
          source: "qrcode",
        } as InvoiceImportedPayload,
        timestamp: 1000,
      });

      const correction: AIClassificationCorrectedPayload = {
        invoiceId: "inv-001",
        itemIndex: 0,
        oldCategoryId: "outros",
        newCategoryId: "alimentacao",
      };

      state = invoiceReducer(state, {
        type: EVENT_TYPES.AI_CLASSIFICATION_CORRECTED,
        payload: correction,
        timestamp: 2000,
      });

      const invoice = state.invoices.get("inv-001");
      expect(invoice!.items[0]!.categoryId).toBe("alimentacao");
      expect(invoice!.items[0]!.categoryConfidence).toBe(1.0);
      expect(invoice!.items[1]!.categoryId).toBe("lazer");
    });

    it("ignores correction for non-existent invoice", () => {
      const state = createInitialInvoiceState();
      const correction: AIClassificationCorrectedPayload = {
        invoiceId: "nonexistent",
        itemIndex: 0,
        oldCategoryId: "outros",
        newCategoryId: "alimentacao",
      };

      const newState = invoiceReducer(state, {
        type: EVENT_TYPES.AI_CLASSIFICATION_CORRECTED,
        payload: correction,
        timestamp: Date.now(),
      });

      expect(newState).toBe(state);
    });

    it("ignores correction for out-of-bounds index", () => {
      let state = createInitialInvoiceState();
      state = invoiceReducer(state, {
        type: EVENT_TYPES.INVOICE_IMPORTED,
        payload: {
          invoiceId: "inv-001",
          items: [{ name: "A", quantity: 1, price: 10, categoryId: "outros" }],
          total: 10,
          date: "2026-02-14T10:00:00.000Z",
          source: "qrcode",
        } as InvoiceImportedPayload,
        timestamp: 1000,
      });

      const correction: AIClassificationCorrectedPayload = {
        invoiceId: "inv-001",
        itemIndex: 99,
        oldCategoryId: "outros",
        newCategoryId: "alimentacao",
      };

      const newState = invoiceReducer(state, {
        type: EVENT_TYPES.AI_CLASSIFICATION_CORRECTED,
        payload: correction,
        timestamp: 2000,
      });

      const invoice = newState.invoices.get("inv-001");
      expect(invoice!.items[0]!.categoryId).toBe("outros");
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
