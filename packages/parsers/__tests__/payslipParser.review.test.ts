import { describe, it, expect } from "vitest";
import {
  normalizeCnpj,
  normalizePayslipPeriod,
  normalizeVisionPayslip,
  readPayslipPeriod,
} from "../src/payslipParser";

/** Story 11.5, revisão: CNPJ alfanumérico (R8) e competência "13º/AAAA" (R9). */

describe("normalizeCnpj — alfanumérico (R8)", () => {
  it("aceita o exemplo oficial da Receita (ASCII − 48, módulo 11)", () => {
    expect(normalizeCnpj("12.ABC.345/01DE-35")).toBe("12.ABC.345/01DE-35");
    expect(normalizeCnpj("12abc34501de35")).toBe("12.ABC.345/01DE-35");
  });

  it("recusa dígito verificador errado e letra nos dígitos verificadores", () => {
    expect(normalizeCnpj("12.ABC.345/01DE-36")).toBeNull();
    expect(normalizeCnpj("12ABC34501DE3A")).toBeNull();
    expect(normalizeCnpj("12ABC34501DE")).toBeNull();
  });

  it("o numérico continua igual, inclusive com rótulo", () => {
    expect(normalizeCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(normalizeCnpj("CNPJ: 11.222.333/0001-81")).toBe("11.222.333/0001-81");
    expect(normalizeCnpj("11.222.333/0001-82")).toBeNull();
    expect(normalizeCnpj("00000000000000")).toBeNull();
  });

  it("o Vision devolve o alfanumérico normalizado", () => {
    const r = normalizeVisionPayslip({ company: "X", cnpj: "12abc34501de35", period: "09/2026", grossSalary: 2, netSalary: 1, deductions: [] });
    expect(r.cnpj).toBe("12.ABC.345/01DE-35");
  });
});

describe("competência 13º/AAAA (R9)", () => {
  it.each(["13º/2026", "13°/2026", "13º 2026", "13ª-2026", "13/2026", "13º salário 2026"])("%j é o 13º de 2026", (text) => {
    expect(readPayslipPeriod(text)).toEqual({ period: "2026-12", thirteenth: true });
    expect(normalizePayslipPeriod(text)).toBe("2026-12");
  });

  it("mês comum não é 13º", () => {
    expect(readPayslipPeriod("12/2026")).toEqual({ period: "2026-12", thirteenth: false });
    expect(readPayslipPeriod("13 de setembro de 2026")?.thirteenth).not.toBe(true);
    expect(readPayslipPeriod("")).toBeNull();
  });
});
