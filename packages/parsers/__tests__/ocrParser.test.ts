import { describe, it, expect } from "vitest";
import { parseOCRText, parseFromImage } from "../src/ocrParser";
import type { OCRAdapter, OCRResult } from "../src/types";

describe("parseOCRText", () => {
  it("parses items with quantity x price format", () => {
    const ocr: OCRResult = {
      text: `SUPERMERCADO BOM PRECO
14/02/2026 15:30
ARROZ TIPO 1 5KG 2 x 22,90
FEIJAO CARIOCA 1KG 1 x 8,50
TOTAL R$ 54,30`,
      confidence: 0.85,
    };

    const result = parseOCRText(ocr);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.name).toBe("ARROZ TIPO 1 5KG");
    expect(result.items[0]!.quantity).toBe(2);
    expect(result.items[0]!.price).toBe(22.9);
    expect(result.total).toBe(54.3);
  });

  it("parses items with simple price format", () => {
    const ocr: OCRResult = {
      text: `CAFE PREMIUM R$ 15,90
LEITE INTEGRAL R$ 6,50`,
      confidence: 0.8,
    };

    const result = parseOCRText(ocr);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.name).toBe("CAFE PREMIUM");
    expect(result.items[0]!.price).toBe(15.9);
    expect(result.items[0]!.quantity).toBe(1);
  });

  it("extracts date from OCR text", () => {
    const ocr: OCRResult = {
      text: `DATA: 14/02/2026
ITEM A R$ 10,00`,
      confidence: 0.9,
    };

    const result = parseOCRText(ocr);
    expect(result.date).not.toBeNull();
    expect(result.date!.getFullYear()).toBe(2026);
    expect(result.date!.getMonth()).toBe(1);
    expect(result.date!.getDate()).toBe(14);
  });

  it("extracts total from OCR text", () => {
    const ocr: OCRResult = {
      text: `ITEM A R$ 10,00
ITEM B R$ 20,00
TOTAL R$ 30,00`,
      confidence: 0.9,
    };

    const result = parseOCRText(ocr);
    expect(result.total).toBe(30);
  });

  it("calculates total from items when total line is missing", () => {
    const ocr: OCRResult = {
      text: `ITEM A R$ 10,00
ITEM B R$ 20,00`,
      confidence: 0.9,
    };

    const result = parseOCRText(ocr);
    expect(result.total).toBe(30);
  });

  it("skips header/footer lines", () => {
    const ocr: OCRResult = {
      text: `CNPJ 12.345.678/0001-90
ITEM REAL R$ 10,00
FORMA DE PAGAMENTO
OBRIGADO VOLTE SEMPRE`,
      confidence: 0.8,
    };

    const result = parseOCRText(ocr);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.name).toBe("ITEM REAL");
  });

  it("handles empty OCR text", () => {
    const ocr: OCRResult = { text: "", confidence: 0.1 };
    const result = parseOCRText(ocr);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("preserves OCR confidence", () => {
    const ocr: OCRResult = { text: "ITEM A R$ 5,00", confidence: 0.75 };
    const result = parseOCRText(ocr);
    expect(result.confidence).toBe(0.75);
  });
});

describe("parseFromImage", () => {
  it("uses OCR adapter and parses result", async () => {
    const adapter: OCRAdapter = {
      async recognizeText(_uri: string) {
        return {
          text: "ARROZ 5KG 1 x 22,90\nTOTAL R$ 22,90",
          confidence: 0.9,
        };
      },
    };

    const result = await parseFromImage("file:///photo.jpg", adapter);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.name).toBe("ARROZ 5KG");
    expect(result.total).toBe(22.9);
  });

  it("propagates OCR adapter errors", async () => {
    const adapter: OCRAdapter = {
      async recognizeText(_uri: string) {
        throw new Error("ML Kit not available");
      },
    };

    await expect(parseFromImage("file:///photo.jpg", adapter)).rejects.toThrow("ML Kit not available");
  });
});
