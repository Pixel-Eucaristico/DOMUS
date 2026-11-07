import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { extractScannedCode } from "../qrScannerUtils";

describe("Story 4.4: QRScannerModal - Processamento e extração de códigos", () => {
  const CANONICAL_SECRET =
    "DOMUS1-AAAQ-EAYE-AUDA-OCAJ-BIFQ-YDIO-B4IB-CEQT-CQKR-MFYY-DENB-WHA5-DYPS-NINV-RI";

  it("aceita segredo canônico do Grupo forte de 79 caracteres sem alteração", () => {
    const result = extractScannedCode(CANONICAL_SECRET);
    expect(result).toBe(CANONICAL_SECRET);
  });

  it("remove prefixo domus:// minúsculo mantendo o segredo completo de 79 caracteres", () => {
    const uri = `domus://${CANONICAL_SECRET}`;
    const result = extractScannedCode(uri);
    expect(result).toBe(CANONICAL_SECRET);
  });

  it("remove prefixo DOMUS:// maiúsculo (case-insensitive)", () => {
    const uri = `DOMUS://${CANONICAL_SECRET}`;
    const result = extractScannedCode(uri);
    expect(result).toBe(CANONICAL_SECRET);
  });

  it("converte código em minúsculas para maiúsculas e remove espaços nas pontas", () => {
    const input = `  domus://${CANONICAL_SECRET.toLowerCase()}  `;
    const result = extractScannedCode(input);
    expect(result).toBe(CANONICAL_SECRET);
  });

  it("aceita código legado de 6 caracteres para encaminhamento e recusa instrutiva pela sync engine", () => {
    expect(extractScannedCode("ABC123")).toBe("ABC123");
    expect(extractScannedCode("domus://K7M2QX")).toBe("K7M2QX");
  });

  it("retorna null para entradas nulas, vazias ou contendo apenas espaços", () => {
    expect(extractScannedCode(null)).toBeNull();
    expect(extractScannedCode(undefined)).toBeNull();
    expect(extractScannedCode("")).toBeNull();
    expect(extractScannedCode("   ")).toBeNull();
  });

  it("retorna null para prefixo domus:// isolado sem código", () => {
    expect(extractScannedCode("domus://")).toBeNull();
    expect(extractScannedCode("DOMUS://   ")).toBeNull();
  });

  it("retorna null para códigos curtos com menos de 4 caracteres", () => {
    expect(extractScannedCode("ABC")).toBeNull();
    expect(extractScannedCode("12")).toBeNull();
    expect(extractScannedCode("domus://AB")).toBeNull();
  });
});

describe("Story 4.4: QRScannerModal - Inspeção estática de conformidade", () => {
  const modalSource = readFileSync(
    path.resolve(__dirname, "../QRScannerModal.tsx"),
    "utf8",
  );

  it("eliminou o filtro obsoleto de 8 caracteres (length <= 8)", () => {
    expect(modalSource).not.toContain("cleaned.length <= 8");
    expect(modalSource).not.toContain("<= 8");
  });

  it("utiliza extractScannedCode para normalizar dados do QR Code", () => {
    expect(modalSource).toContain("extractScannedCode");
  });

  it("não utiliza alertas nativos do sistema", () => {
    expect(modalSource).not.toContain("Alert.alert");
    expect(modalSource).not.toContain("window.alert");
    expect(modalSource).not.toContain("window.confirm");
  });

  it("configura o leitor de câmera com suporte a QR Code", () => {
    expect(modalSource).toContain('barcodeScannerSettings={{ barcodeTypes: ["qr"] }}');
  });
});
