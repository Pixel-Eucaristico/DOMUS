import { describe, it, expect } from "vitest";
import { parseSefazHtml, fetchAndParseSefaz } from "../src/sefazParser";
import type { SefazFetcher } from "../src/types";

const SAMPLE_HTML = `
<html>
<body>
  <div>
    <span class="txtTit">ARROZ TIPO 1 5KG</span>
    <span class="Rqtd">Qtde.: 2,000</span>
    <span class="RvlUnit">Vl. Unit.: 22,90</span>
    <span class="valor">45,80</span>

    <span class="txtTit">FEIJAO CARIOCA 1KG</span>
    <span class="Rqtd">Qtde.: 3,000</span>
    <span class="RvlUnit">Vl. Unit.: 8,50</span>
    <span class="valor">25,50</span>

    <span class="txtTit">OLEO SOJA 900ML</span>
    <span class="Rqtd">Qtde.: 1,000</span>
    <span class="RvlUnit">Vl. Unit.: 7,99</span>
    <span class="valor">7,99</span>
  </div>
  <span class="totalNumb">R$ 79,29</span>
  <div>Emissão: 14/02/2026 15:30</div>
  <div>Chave de Acesso: 12345678901234567890123456789012345678901234</div>
</body>
</html>
`;

describe("parseSefazHtml", () => {
  it("extracts items from SEFAZ HTML", () => {
    const result = parseSefazHtml(SAMPLE_HTML);
    expect(result.partialInvoice.items).toHaveLength(3);
    expect(result.partialInvoice.items[0]!.description).toBe("ARROZ TIPO 1 5KG");
    expect(result.partialInvoice.items[0]!.quantity).toBe(2);
    expect(result.partialInvoice.items[0]!.unitPrice).toBe(22.9);
  });

  it("extracts total value", () => {
    const result = parseSefazHtml(SAMPLE_HTML);
    expect(result.partialInvoice.totalAmount).toBe(79.29);
  });

  it("extracts date", () => {
    const result = parseSefazHtml(SAMPLE_HTML);
    expect(result.partialInvoice.date).not.toBeNull();
    const date = new Date(result.partialInvoice.date!);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(1); // February
    expect(date.getDate()).toBe(14);
  });

  it("extracts invoice ID from chave de acesso", () => {
    const result = parseSefazHtml(SAMPLE_HTML);
    expect(result.partialInvoice.invoiceId).toBe("12345678901234567890123456789012345678901234");
  });

  it("calculates total from items when total is missing", () => {
    const html = `
      <span class="txtTit">ITEM A</span>
      <span class="Rqtd">Qtde.: 1,000</span>
      <span class="RvlUnit">Vl. Unit.: 10,00</span>
      <span class="valor">10,00</span>
      <span class="txtTit">ITEM B</span>
      <span class="Rqtd">Qtde.: 2,000</span>
      <span class="RvlUnit">Vl. Unit.: 5,00</span>
      <span class="valor">10,00</span>
    `;
    const result = parseSefazHtml(html);
    expect(result.partialInvoice.totalAmount).toBe(20);
  });

  it("handles empty HTML gracefully", () => {
    const result = parseSefazHtml("<html></html>");
    expect(result.partialInvoice.items).toHaveLength(0);
    expect(result.partialInvoice.totalAmount).toBe(0);
  });

  it("handles HTML entities in product names", () => {
    const html = `
      <span class="txtTit">CAFE &amp; CIA PREMIUM</span>
      <span class="Rqtd">Qtde.: 1,000</span>
      <span class="RvlUnit">Vl. Unit.: 15,90</span>
      <span class="valor">15,90</span>
    `;
    const result = parseSefazHtml(html);
    expect(result.partialInvoice.items[0]!.description).toBe("CAFE & CIA PREMIUM");
  });

  it("extracts date in ISO format", () => {
    const html = `<div>2026-02-14T15:30:00</div>`;
    const result = parseSefazHtml(html);
    expect(result.partialInvoice.date).not.toBeNull();
  });
});

describe("fetchAndParseSefaz", () => {
  it("fetches HTML and parses it", async () => {
    const fetcher: SefazFetcher = {
      async fetchPage(_url: string) {
        return SAMPLE_HTML;
      },
    };

    const result = await fetchAndParseSefaz("https://sefaz.gov.br/nfce?p=123", fetcher);
    expect(result.partialInvoice.items).toHaveLength(3);
    expect(result.partialInvoice.totalAmount).toBe(79.29);
  });

  it("propagates fetch errors", async () => {
    const fetcher: SefazFetcher = {
      async fetchPage(_url: string) {
        throw new Error("Network error");
      },
    };

    await expect(fetchAndParseSefaz("https://sefaz.gov.br", fetcher)).rejects.toThrow("Network error");
  });
});
