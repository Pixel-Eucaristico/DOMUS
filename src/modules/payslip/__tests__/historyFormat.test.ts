import { describe, it, expect } from "vitest";
import { buildPayslipHistory, payslipChartSeries, summarizePayslipHistory, type StoredPayslip } from "@packages/domain";
import {
  averageLabel,
  chartBarAccessibilityLabel,
  chartBarDetail,
  deductionRateLabel,
  netChangeColors,
  employersLabel,
  formatPercentPoints,
  moneyOrDash,
  netChangeView,
} from "../historyFormat";

/** Story 11.6: textos do resumo e do gráfico do holerite. */

const nbsp = (s: string) => s.replace(/ /g, " ");

function slip(period: string, netSalary: number, grossSalary = 5000): StoredPayslip {
  return { id: period, period, company: "ACME", grossSalary, netSalary, deductions: [], recordedAt: 1 };
}

function summary(list: StoredPayslip[]) {
  return summarizePayslipHistory(buildPayslipHistory(list))!;
}

describe("historyFormat", () => {
  it("primeiro holerite", () => {
    expect(netChangeView(summary([slip("2026-09", 4000)]))).toEqual({ trend: "flat", text: "Primeiro holerite salvo", reference: null });
  });

  it("alta e queda com sinal e percentual de 1 casa", () => {
    const up = netChangeView(summary([slip("2026-08", 4000), slip("2026-09", 4200)]));
    expect(up.trend).toBe("up");
    expect(nbsp(up.text)).toBe("+R$ 200,00 (+5,0%)");
    expect(up.reference).toBe("em relação a 08/2026");
    const down = netChangeView(summary([slip("2026-08", 4200), slip("2026-09", 4000)]));
    expect(down.trend).toBe("down");
    expect(nbsp(down.text)).toBe("−R$ 200,00 (−4,8%)");
  });

  it("sem variação e anterior com líquido 0", () => {
    expect(netChangeView(summary([slip("2026-08", 4000), slip("2026-09", 4000)])).trend).toBe("flat");
    expect(nbsp(netChangeView(summary([slip("2026-08", 0, 0), slip("2026-09", 4000)])).text)).toBe("+R$ 4.000,00");
  });

  it("rótulos", () => {
    expect(formatPercentPoints(20)).toBe("20,0%");
    expect(averageLabel(7)).toBe("média de 7 competências");
    expect(averageLabel(1)).toBe("média de 1 competência");
    expect(employersLabel(1)).toBeNull();
    expect(employersLabel(2)).toBe("2 empregadores");
    expect(moneyOrDash(NaN)).toBe("—");
    const [p] = payslipChartSeries(buildPayslipHistory([slip("2026-09", 4000)]));
    expect(nbsp(chartBarAccessibilityLabel(p!))).toBe("09/2026: líquido R$ 4.000,00, bruto R$ 5.000,00");
    expect(nbsp(chartBarDetail(p!))).toBe("09/2026 · líquido R$ 4.000,00 · bruto R$ 5.000,00");
  });

  it("R4/R6: percentual de descontos arredondado uma vez; negativo ou não finito vira —", () => {
    // 0,177496 arredondado antes a 4 casas (0,1775) viraria 17,8%; o certo é 17,7%.
    expect(deductionRateLabel(0.177496)).toBe("17,7%");
    expect(deductionRateLabel(0.2)).toBe("20,0%");
    expect(deductionRateLabel(0)).toBe("0,0%");
    expect(deductionRateLabel(-0.25)).toBe("—");
    expect(deductionRateLabel(NaN)).toBe("—");
    expect(deductionRateLabel(summary([slip("2026-09", 5000, 4000)]).deductionRate)).toBe("—");
  });

  it("R9: a cor da alta/queda fica só na seta; o texto usa textColor", () => {
    const theme = { success: "#0f0", danger: "#f00", textColor: "#111" };
    expect(netChangeColors("up", theme)).toEqual({ icon: "#0f0", text: "#111" });
    expect(netChangeColors("down", theme)).toEqual({ icon: "#f00", text: "#111" });
    expect(netChangeColors("flat", theme)).toEqual({ icon: "#111", text: "#111" });
  });
});
