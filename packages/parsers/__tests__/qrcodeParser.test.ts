import { describe, it, expect } from "vitest";
import { parseNFCeQRCode, isValidSefazUrl, extractUrlFromQRData } from "../src/qrcodeParser";

describe("parseNFCeQRCode", () => {
  it("parses a valid SEFAZ NFC-e URL", () => {
    const url = "https://nfce.sefaz.ce.gov.br/pages/ShowNFCe.html?p=23210412345678000199650010000012341234567890";
    const result = parseNFCeQRCode(url);
    expect(result).not.toBeNull();
    expect(result!.url).toBe(url);
  });

  it("extracts chave de acesso from URL with p= parameter", () => {
    const chave = "12345678901234567890123456789012345678901234";
    const url = `https://nfce.sefaz.sp.gov.br/NFCe?p=${chave}`;
    const result = parseNFCeQRCode(url);
    expect(result).not.toBeNull();
    expect(result!.chaveAcesso).toBe(chave);
  });

  it("extracts chave de acesso from URL with chNFe= parameter", () => {
    const chave = "12345678901234567890123456789012345678901234";
    const url = `https://nfce.fazenda.mg.gov.br/portalnfce?chNFe=${chave}&nVersao=100`;
    const result = parseNFCeQRCode(url);
    expect(result).not.toBeNull();
    expect(result!.chaveAcesso).toBe(chave);
  });

  it("returns null for non-SEFAZ URLs", () => {
    expect(parseNFCeQRCode("https://google.com")).toBeNull();
    expect(parseNFCeQRCode("random text")).toBeNull();
    expect(parseNFCeQRCode("")).toBeNull();
  });

  it("handles URL with nfce in the domain as fallback", () => {
    const url = "https://custom.nfce.example.com/view?id=123";
    const result = parseNFCeQRCode(url);
    expect(result).not.toBeNull();
    expect(result!.url).toBe(url);
  });

  it("handles URL with extra whitespace", () => {
    const url = "  https://nfce.sefaz.rj.gov.br/consulta?p=12345678901234567890123456789012345678901234  ";
    const result = parseNFCeQRCode(url);
    expect(result).not.toBeNull();
  });

  it("promove URLs http:// da SEFAZ para https:// (D18 / Android 16 cleartext)", () => {
    const chave = "35240100000000000000650010000000011000000010";
    const sefazHttp = `http://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=${chave}|2|1|1|00`;
    const result = parseNFCeQRCode(sefazHttp);
    expect(result).not.toBeNull();
    expect(result!.url).toBe(
      `https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=${chave}|2|1|1|00`,
    );
    expect(result!.chaveAcesso).toBe(chave);

    const fallbackHttp = "HTTP://custom.nfce.example.com/view?id=123";
    const fallbackResult = parseNFCeQRCode(fallbackHttp);
    expect(fallbackResult?.url).toBe("https://custom.nfce.example.com/view?id=123");
  });
});

describe("isValidSefazUrl", () => {
  it("returns true for valid SEFAZ URLs", () => {
    expect(isValidSefazUrl("https://nfce.sefaz.sp.gov.br/NFCe?p=123")).toBe(true);
    expect(isValidSefazUrl("https://www.fazenda.mg.gov.br/nfce")).toBe(true);
  });

  it("returns false for non-SEFAZ URLs", () => {
    expect(isValidSefazUrl("https://google.com")).toBe(false);
  });
});

describe("extractUrlFromQRData", () => {
  it("extracts URL from QR data", () => {
    const url = "https://nfce.sefaz.ce.gov.br/pages/Show?p=123";
    expect(extractUrlFromQRData(url)).toBe(url);
  });

  it("returns null for invalid data", () => {
    expect(extractUrlFromQRData("not a url")).toBeNull();
  });
});
