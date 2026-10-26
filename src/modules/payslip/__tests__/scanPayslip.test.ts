import { describe, it, expect, vi } from "vitest";
import { scanPayslip, isVisionEligible, PAYSLIP_SCAN_WARNINGS } from "../scanPayslip";

/** Story 11.5: Vision × OCR do aparelho na captura do holerite. */

const OCR_TEXT = `
ACME COMERCIO LTDA
CNPJ: 11.222.333/0001-81
Referente ao Mês / Ano: Setembro/2026
Cód.  Descrição                 Referência   Vencimentos   Descontos
001   SALARIO BASE              30,00        5.000,00
901   INSS                      14,00                      557,36
      Total de Vencimentos   Total de Descontos
      5.000,00               557,36
                        Valor Líquido ->    4.442,64
`;

const VISION_RAW = {
  company: "ACME LTDA  CPF 123.456.789-09",
  cnpj: "11222333000181",
  period: "13/2026",
  grossSalary: 5000,
  netSalary: 4000,
  deductions: [{ name: "INSS", value: 600 }, { name: "IRRF", value: 400 }],
};

function deps(over: Partial<Parameters<typeof scanPayslip>[0]> = {}) {
  return {
    visionEligible: true,
    runVision: vi.fn().mockResolvedValue(VISION_RAW),
    recordVisionTokens: vi.fn(),
    runLocalOcr: vi.fn().mockResolvedValue(OCR_TEXT),
    ...over,
  };
}

describe("isVisionEligible", () => {
  const all = { aiEnabled: true, visionFlag: true, providerSupportsVision: true, hasApiKey: true, overBudget: false };
  it("só com todas as condições", () => {
    expect(isVisionEligible(all)).toBe(true);
    expect(isVisionEligible({ ...all, aiEnabled: false })).toBe(false);
    expect(isVisionEligible({ ...all, visionFlag: false })).toBe(false);
    expect(isVisionEligible({ ...all, providerSupportsVision: false })).toBe(false);
    expect(isVisionEligible({ ...all, hasApiKey: false })).toBe(false);
    expect(isVisionEligible({ ...all, overBudget: true })).toBe(false);
  });
});

describe("scanPayslip", () => {
  it("Vision elegível: normaliza (limpa CPF, valida CNPJ, 13º) e registra tokens", async () => {
    const d = deps();
    const r = await scanPayslip(d);
    expect(r.source).toBe("vision");
    expect(r.fellBack).toBe(false);
    expect(r.data.cnpj).toBe("11.222.333/0001-81");
    expect(r.data.company).not.toMatch(/123|CPF/);
    expect(r.data.period).toBe("2026-12");
    expect(r.data.thirteenth).toBe(true);
    expect(d.recordVisionTokens).toHaveBeenCalledTimes(1);
    expect(d.runLocalOcr).not.toHaveBeenCalled();
  });

  it("Vision não elegível (flag desligada, sem chave, orçamento): OCR do aparelho, sem chamada ao provedor", async () => {
    const d = deps({ visionEligible: false });
    const r = await scanPayslip(d);
    expect(r).toMatchObject({ source: "ocr", fellBack: false });
    expect(r.data.netSalary).toBeCloseTo(4442.64);
    expect(r.data.warnings).not.toContain(PAYSLIP_SCAN_WARNINGS.visionFellBack);
    expect(d.runVision).not.toHaveBeenCalled();
    expect(d.recordVisionTokens).not.toHaveBeenCalled();
  });

  it("Vision falha: cai para o aparelho com aviso; tokens não registrados", async () => {
    const onVisionError = vi.fn();
    const d = deps({ runVision: vi.fn().mockRejectedValue(new Error("rede")), onVisionError });
    const r = await scanPayslip(d);
    expect(r).toMatchObject({ source: "ocr", fellBack: true });
    expect(r.data.warnings[0]).toBe(PAYSLIP_SCAN_WARNINGS.visionFellBack);
    expect(d.recordVisionTokens).not.toHaveBeenCalled();
    expect(onVisionError).toHaveBeenCalledTimes(1);
  });

  it("falha ao registrar tokens não derruba a leitura do Vision", async () => {
    const r = await scanPayslip(deps({ recordVisionTokens: vi.fn().mockRejectedValue(new Error("x")) }));
    expect(r.source).toBe("vision");
  });

  it("os dois falham: o erro chega a quem chamou", async () => {
    const d = deps({
      runVision: vi.fn().mockRejectedValue(new Error("chave")),
      runLocalOcr: vi.fn().mockRejectedValue(new Error("OCR_UNAVAILABLE")),
    });
    await expect(scanPayslip(d)).rejects.toThrow("OCR_UNAVAILABLE");
  });

  it("foto sem valores: revisão com o aviso de valores não encontrados", async () => {
    const r = await scanPayslip(deps({ visionEligible: false, runLocalOcr: vi.fn().mockResolvedValue("foto borrada") }));
    expect(r.data.grossSalary).toBe(0);
    expect(r.data.netSalary).toBe(0);
    expect(r.data.warnings).toContain(PAYSLIP_SCAN_WARNINGS.noValues);
  });

  it("Vision sem valores também ganha o aviso", async () => {
    const r = await scanPayslip(deps({ runVision: vi.fn().mockResolvedValue({ ...VISION_RAW, grossSalary: 0, netSalary: 0, deductions: [] }) }));
    expect(r.source).toBe("vision");
    expect(r.data.warnings).toContain(PAYSLIP_SCAN_WARNINGS.noValues);
  });
});
