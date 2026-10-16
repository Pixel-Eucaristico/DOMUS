import { describe, it, expect } from "vitest";
import {
  parsePayslipText,
  normalizePayslipPeriod,
  normalizeVisionPayslip,
  parseBRL,
} from "../src/payslipParser";

const HOLERITE_COMPLETO = `
ACME COMERCIO DE ALIMENTOS LTDA      CNPJ: 12.345.678/0001-90
DEMONSTRATIVO DE PAGAMENTO DE SALARIO
Referência: 03/2026
Funcionário: 0042 - JOAO DA SILVA        Cargo: ANALISTA
Cód  Descrição               Ref.     Vencimentos   Descontos
001  SALARIO BASE            30,00    5.000,00
015  HORAS EXTRAS 50%        10,00    340,91
901  INSS                    14,00                  557,36
902  IRRF                    27,50                  312,40
910  VALE TRANSPORTE          6,00                  300,00
Total de Vencimentos 5.340,91
Total de Descontos 1.169,76
Valor Líquido 4.171,15
Base INSS 5.340,91   Base FGTS 5.340,91   FGTS do Mês 427,27
`;

describe("parseBRL", () => {
  it("interpreta formatos brasileiros e com ponto decimal", () => {
    expect(parseBRL("5.340,91")).toBe(5340.91);
    expect(parseBRL("557,36")).toBe(557.36);
    expect(parseBRL("1.234.567,89")).toBe(1234567.89);
    expect(parseBRL("4171.15")).toBe(4171.15);
  });
});

describe("normalizePayslipPeriod", () => {
  it.each([
    ["03/2026", "2026-03"],
    ["3/26", "2026-03"],
    ["2026-03", "2026-03"],
    ["Março/2026", "2026-03"],
    ["marco de 2026", "2026-03"],
    ["MAR/2026", "2026-03"],
    ["Dezembro 2025", "2025-12"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePayslipPeriod(input)).toBe(expected);
  });

  it("retorna null para entradas inválidas", () => {
    expect(normalizePayslipPeriod("")).toBeNull();
    expect(normalizePayslipPeriod(undefined)).toBeNull();
    expect(normalizePayslipPeriod("sem data")).toBeNull();
    expect(normalizePayslipPeriod("13/2026")).toBeNull();
  });
});

describe("parsePayslipText", () => {
  it("extrai todos os campos de um holerite completo", () => {
    const r = parsePayslipText(HOLERITE_COMPLETO);
    expect(r.company).toBe("ACME COMERCIO DE ALIMENTOS LTDA");
    expect(r.cnpj).toBe("12.345.678/0001-90");
    expect(r.employee).toBe("JOAO DA SILVA");
    expect(r.period).toBe("2026-03");
    expect(r.grossSalary).toBe(5340.91);
    expect(r.netSalary).toBe(4171.15);
    expect(r.fgts).toBe(427.27);
    expect(r.deductions).toEqual([
      { name: "INSS", value: 557.36 },
      { name: "IRRF", value: 312.4 },
      { name: "VALE TRANSPORTE", value: 300 },
    ]);
    expect(r.earnings.map((e) => e.value)).toEqual([5000, 340.91]);
    expect(r.confidence).toBe(1);
    expect(r.warnings).toEqual([]);
  });

  it("não trata bases de cálculo e FGTS como descontos", () => {
    const r = parsePayslipText(HOLERITE_COMPLETO);
    expect(r.deductions.some((d) => /base|fgts/i.test(d.name))).toBe(false);
  });

  it("calcula o líquido quando ausente", () => {
    const r = parsePayslipText(`
      EMPRESA X S.A.
      Competência: Abril/2026
      SALARIO 3.000,00
      INSS 240,00
      Total de Vencimentos 3.000,00
    `);
    expect(r.period).toBe("2026-04");
    expect(r.netSalary).toBe(2760);
    expect(r.warnings).toContain("Valor líquido calculado a partir do bruto − descontos");
  });

  it("calcula o bruto a partir das rubricas quando o total não aparece", () => {
    const r = parsePayslipText(`
      PADARIA BOM PAO ME
      Mês/Ano: 05/2026
      SALARIO BASE 2.000,00
      ADICIONAL NOTURNO 200,00
      INSS 165,00
      Líquido a Receber 2.035,00
    `);
    expect(r.grossSalary).toBe(2200);
    expect(r.netSalary).toBe(2035);
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("sinaliza quando os totais não fecham", () => {
    const r = parsePayslipText(`
      EMPRESA Y LTDA
      Referência: 06/2026
      INSS 300,00
      Total de Vencimentos 4.000,00
      Valor Líquido 3.000,00
    `);
    expect(r.warnings).toContain("Bruto − descontos não fecha com o líquido — revise os valores");
    expect(r.confidence).toBeLessThan(1);
  });

  it("baixa a confiança quando o líquido é maior que o bruto", () => {
    const r = parsePayslipText(`
      Total de Vencimentos 1.000,00
      Valor Líquido 9.000,00
    `);
    expect(r.confidence).toBeLessThanOrEqual(0.4);
  });

  it("não confunde data de pagamento com competência", () => {
    const r = parsePayslipText(`
      EMPRESA Z LTDA
      Data de pagamento: 05/04/2026
      Valor Líquido 1.500,00
    `);
    expect(r.period).toBeNull();
    expect(r.warnings).toContain("Competência não identificada");
  });

  it("retorna resultado vazio para texto sem holerite", () => {
    const r = parsePayslipText("foto de um gato");
    expect(r.grossSalary).toBe(0);
    expect(r.netSalary).toBe(0);
    expect(r.confidence).toBeLessThan(0.3);
  });
});

describe("normalizeVisionPayslip", () => {
  it("normaliza competência e calcula confiança", () => {
    const r = normalizeVisionPayslip({
      company: " ACME LTDA ",
      period: "03/2026",
      grossSalary: 5000,
      deductions: [
        { name: "INSS", value: 500 },
        { name: "Zerado", value: 0 },
      ],
      netSalary: 4500,
    });
    expect(r.company).toBe("ACME LTDA");
    expect(r.period).toBe("2026-03");
    expect(r.deductions).toHaveLength(1);
    expect(r.confidence).toBe(0.95);
    expect(r.warnings).toEqual([]);
  });

  it("avisa quando os valores não fecham", () => {
    const r = normalizeVisionPayslip({
      company: "ACME",
      period: "xx",
      grossSalary: 5000,
      deductions: [],
      netSalary: 4000,
    });
    expect(r.period).toBeNull();
    expect(r.confidence).toBe(0.7);
    expect(r.warnings).toHaveLength(2);
  });
});
