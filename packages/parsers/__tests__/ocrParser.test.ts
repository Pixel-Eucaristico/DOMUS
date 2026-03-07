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
    expect(result.items[0]!.description).toBe("ARROZ TIPO 1 5KG");
    expect(result.items[0]!.quantity).toBe(2);
    expect(result.items[0]!.unitPrice).toBe(22.9);
    expect(result.totalAmount).toBe(54.3);
  });

  it("parses items with simple price format", () => {
    const ocr: OCRResult = {
      text: `CAFE PREMIUM R$ 15,90
LEITE INTEGRAL R$ 6,50`,
      confidence: 0.8,
    };

    const result = parseOCRText(ocr);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.description).toBe("CAFE PREMIUM");
    expect(result.items[0]!.unitPrice).toBe(15.9);
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
    expect(result.totalAmount).toBe(30);
  });

  it("calculates total from items when total line is missing", () => {
    const ocr: OCRResult = {
      text: `ITEM A R$ 10,00
ITEM B R$ 20,00`,
      confidence: 0.9,
    };

    const result = parseOCRText(ocr);
    expect(result.totalAmount).toBe(30);
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
    expect(result.items[0]!.description).toBe("ITEM REAL");
  });

  it("handles empty OCR text", () => {
    const ocr: OCRResult = { text: "", confidence: 0.1 };
    const result = parseOCRText(ocr);
    expect(result.items).toHaveLength(0);
    expect(result.totalAmount).toBe(0);
  });

  it("preserves OCR confidence", () => {
    const ocr: OCRResult = { text: "ITEM A R$ 5,00", confidence: 0.75 };
    const result = parseOCRText(ocr);
    expect(result.confidence).toBe(0.75);
  });

  it("parses NFC-e multi-line format (description + detail line)", () => {
    const ocr: OCRResult = {
      text: `001 7891234567890
ARROZ TIPO 1 5KG
2,000 UN X 22,9000 (45,80)
002 7891234567891
FEIJAO CARIOCA 1KG
1,000 UN X 8,50 (8,50)
TOTAL R$ 54,30`,
      confidence: 0.85,
    };

    const result = parseOCRText(ocr);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.description).toBe("ARROZ TIPO 1 5KG");
    expect(result.items[0]!.quantity).toBe(2);
    expect(result.items[0]!.unitPrice).toBeCloseTo(22.9, 1);
    expect(result.items[0]!.totalPrice).toBeCloseTo(45.8, 1);
    expect(result.totalAmount).toBe(54.3);
  });

  it("parses NFC-e label format (Qtde/Vl.Unit/Vl.Total)", () => {
    const ocr: OCRResult = {
      text: `ARROZ TIPO 1 5KG
Qtde.: 2,000 UN Vl.Unit: 22,90 Vl.Total: 45,80
FEIJAO CARIOCA 1KG
Qtde.: 1,000 UN Vl.Unit: 8,50 Vl.Total: 8,50`,
      confidence: 0.85,
    };

    const result = parseOCRText(ocr);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.description).toBe("ARROZ TIPO 1 5KG");
    expect(result.items[0]!.quantity).toBe(2);
    expect(result.items[0]!.unitPrice).toBe(22.9);
  });

  it("parses real NFC-e receipt with seq+barcode+description + detail line", () => {
    const ocr: OCRResult = {
      text: `CNPJ 06.057.223/0579-55 IC 671.716.096.119
Telefone: (19) 2122-0920 DATA: 10/01/2026 - 19:02
LOJA=0351 PDV=005 Seq=001596
DOCUMENTO AUXILIAR
DA NOTA FISCAL DE CONSUMIDOR ELETRONICA
ITEM | COD | DESC | QTDE | UN | UNIT | VL. TOTAL R$
001 40050020398598 DESOD NIVEA 50ML ORI
1,000 Un x 11,49 11,49
002 7891150079892 M HELLM 335G VERDE
1,000 Un x 10,70 10,70
003 7891150099371 MN HELLM 335G BACON
1,000 Un x 10,70 10,70
004 7891150090835 M HELLM 335G CHURRAS
1,000 Un x 10,70 10,70
005 7892840818357 DORITOS NACHO 300G
1,000 PC x 15,90 15,90
006 7891000336373 CH ALPINO 85G LEITE
1,000 Un x 9,30 9,30
007 12018430001 SAC ASS CZ POL 58X70
1,000 Un x 0,25 0,25
QTD. TOTAL DE ITENS 7
VALOR TOTAL R$ 69,04
VALOR A PAGAR R$ 69,04
FORMA DE PAGAMENTO
Cart. Debito`,
      confidence: 0.85,
    };

    const result = parseOCRText(ocr);
    expect(result.items).toHaveLength(7);
    expect(result.items[0]!.description).toBe("DESOD NIVEA 50ML ORI");
    expect(result.items[0]!.unitPrice).toBe(11.49);
    expect(result.items[0]!.totalPrice).toBe(11.49);
    expect(result.items[4]!.description).toBe("DORITOS NACHO 300G");
    expect(result.items[4]!.unitPrice).toBe(15.9);
    expect(result.items[6]!.description).toBe("SAC ASS CZ POL 58X70");
    expect(result.items[6]!.unitPrice).toBe(0.25);
    expect(result.totalAmount).toBe(69.04);
    expect(result.date!.getFullYear()).toBe(2026);
  });

  it("rejects absurd total values (e.g. barcode as total)", () => {
    const ocr: OCRResult = {
      text: `ITEM A R$ 10,00
ITEM B R$ 20,00
TOTAL R$ 30,00`,
      confidence: 0.85,
    };

    const result = parseOCRText(ocr);
    // Total should be 30, not some barcode number
    expect(result.totalAmount).toBe(30);
    expect(result.totalAmount).toBeLessThan(100_000);
  });

  it("does not match barcodes as total (no decimal separator)", () => {
    const ocr: OCRResult = {
      text: `ITEM A R$ 10,00
TOTAL 5000000
TOTAL R$ 10,00`,
      confidence: 0.85,
    };

    const result = parseOCRText(ocr);
    // "TOTAL 5000000" has no decimal separator, should be skipped
    // "TOTAL R$ 10,00" should be used (last valid match)
    expect(result.totalAmount).toBe(10);
  });

  it("parses column format (seq desc qty unitprice total)", () => {
    const ocr: OCRResult = {
      text: `001 ARROZ 5KG 2 22,90 45,80
002 FEIJAO 1KG 1 8,50 8,50
TOTAL R$ 54,30`,
      confidence: 0.85,
    };

    const result = parseOCRText(ocr);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.description).toBe("ARROZ 5KG");
    expect(result.items[0]!.quantity).toBe(2);
    expect(result.items[0]!.totalPrice).toBe(45.8);
  });

  it("strips leading product codes from descriptions", () => {
    const ocr: OCRResult = {
      text: `001 7891234567890 ARROZ TIPO 1 5KG 2 x 22,90`,
      confidence: 0.85,
    };

    const result = parseOCRText(ocr);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.description).toBe("ARROZ TIPO 1 5KG");
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
    expect(result.items[0]!.description).toBe("ARROZ 5KG");
    expect(result.totalAmount).toBe(22.9);
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
