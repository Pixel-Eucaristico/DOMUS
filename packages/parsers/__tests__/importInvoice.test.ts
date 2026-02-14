import { describe, it, expect } from "vitest";
import {
  importFromQRCode,
  importFromImage,
  importFromHtml,
  createClassificationCorrectionEvent,
} from "../src/importInvoice";
import { EVENT_TYPES } from "../src/types";
import type { SefazFetcher, OCRAdapter } from "../src/types";

const SAMPLE_HTML = `
<html>
<body>
  <span class="txtTit">ARROZ TIPO 1 5KG</span>
  <span class="Rqtd">Qtde.: 2,000</span>
  <span class="RvlUnit">Vl. Unit.: 22,90</span>
  <span class="valor">45,80</span>
  <span class="txtTit">CERVEJA BRAHMA LATA</span>
  <span class="Rqtd">Qtde.: 6,000</span>
  <span class="RvlUnit">Vl. Unit.: 3,50</span>
  <span class="valor">21,00</span>
  <span class="totalNumb">R$ 66,80</span>
  <div>Emissão: 14/02/2026</div>
</body>
</html>
`;

const mockFetcher: SefazFetcher = {
  async fetchPage(_url: string) {
    return SAMPLE_HTML;
  },
};

const mockOCR: OCRAdapter = {
  async recognizeText(_uri: string) {
    return {
      text: `14/02/2026
LEITE INTEGRAL 1L 2 x 6,50
CHOCOLATE AO LEITE 1 x 8,90
TOTAL R$ 21,90`,
      confidence: 0.85,
    };
  },
};

describe("importFromQRCode", () => {
  it("imports invoice from QR code data", async () => {
    const result = await importFromQRCode({
      qrData: "https://nfce.sefaz.sp.gov.br/NFCe?p=12345678901234567890123456789012345678901234",
      fetcher: mockFetcher,
    });

    expect(result.invoice.source).toBe("qrcode");
    expect(result.invoice.items).toHaveLength(2);
    expect(result.invoice.total).toBe(66.8);
    expect(result.event.type).toBe(EVENT_TYPES.INVOICE_IMPORTED);
    expect(result.event.payload.items).toHaveLength(2);
  });

  it("classifies items in imported invoice", async () => {
    const result = await importFromQRCode({
      qrData: "https://nfce.sefaz.sp.gov.br/NFCe?p=12345678901234567890123456789012345678901234",
      fetcher: mockFetcher,
    });

    const arroz = result.invoice.items.find((i) => i.name.includes("ARROZ"));
    expect(arroz?.categoryId).toBe("alimentacao");

    const cerveja = result.invoice.items.find((i) => i.name.includes("CERVEJA"));
    expect(cerveja?.categoryId).toBe("lazer");
  });

  it("throws for invalid QR code data", async () => {
    await expect(
      importFromQRCode({
        qrData: "invalid data",
        fetcher: mockFetcher,
      }),
    ).rejects.toThrow("QR Code invalido");
  });

  it("emits event with ISO date string", async () => {
    const result = await importFromQRCode({
      qrData: "https://nfce.sefaz.sp.gov.br/NFCe?p=12345678901234567890123456789012345678901234",
      fetcher: mockFetcher,
    });

    expect(typeof result.event.payload.date).toBe("string");
    expect(result.event.payload.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("importFromImage", () => {
  it("imports invoice from image via OCR", async () => {
    const result = await importFromImage({
      imageUri: "file:///photo.jpg",
      ocrAdapter: mockOCR,
    });

    expect(result.invoice.source).toBe("ocr");
    expect(result.invoice.items.length).toBeGreaterThan(0);
    expect(result.event.type).toBe(EVENT_TYPES.INVOICE_IMPORTED);
    expect(result.event.payload.source).toBe("ocr");
  });

  it("classifies OCR items", async () => {
    const result = await importFromImage({
      imageUri: "file:///photo.jpg",
      ocrAdapter: mockOCR,
    });

    const leite = result.invoice.items.find((i) => i.name.includes("LEITE"));
    expect(leite?.categoryId).toBe("alimentacao");

    const chocolate = result.invoice.items.find((i) => i.name.includes("CHOCOLATE"));
    expect(chocolate?.categoryId).toBeDefined();
  });
});

describe("importFromHtml", () => {
  it("imports invoice from raw HTML", async () => {
    const result = await importFromHtml({ html: SAMPLE_HTML });

    expect(result.invoice.items).toHaveLength(2);
    expect(result.invoice.total).toBe(66.8);
    expect(result.event.type).toBe(EVENT_TYPES.INVOICE_IMPORTED);
  });
});

describe("createClassificationCorrectionEvent", () => {
  it("creates a correction event", () => {
    const event = createClassificationCorrectionEvent(
      "inv-001",
      0,
      "outros",
      "alimentacao",
    );

    expect(event.type).toBe(EVENT_TYPES.AI_CLASSIFICATION_CORRECTED);
    expect(event.payload.invoiceId).toBe("inv-001");
    expect(event.payload.itemIndex).toBe(0);
    expect(event.payload.oldCategoryId).toBe("outros");
    expect(event.payload.newCategoryId).toBe("alimentacao");
  });
});
