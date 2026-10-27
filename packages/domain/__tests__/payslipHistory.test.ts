import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  PAYSLIP_HISTORY_WINDOW,
  UNDETAILED_DEDUCTIONS_LABEL,
  buildPayslipHistory,
  deletePayslipMessage,
  deductionKey,
  payslipChartSeries,
  payslipDeductionReport,
  payslipDeductionTotals,
  payslipDeductionWindow,
  payslipSummaryNotice,
  payslipEmployerLabel,
  payslipHistoryWindow,
  sortPayslipsNewestFirst,
  summarizePayslipHistory,
} from "../src/payslipHistory";
import type { StoredPayslip } from "../src/state";
import * as domain from "../index";

/** Story 11.6: histórico, resumo, gráfico e total por desconto do holerite. */

let seq = 0;
function slip(over: Partial<StoredPayslip> = {}): StoredPayslip {
  seq += 1;
  return {
    id: `p${seq}`,
    period: "2026-09",
    company: "ACME LTDA",
    grossSalary: 5000,
    netSalary: 4000,
    deductions: [],
    recordedAt: seq,
    ...over,
  };
}

function all(list: StoredPayslip[]) {
  const history = buildPayslipHistory(list);
  return {
    history,
    summary: summarizePayslipHistory(history),
    series: payslipChartSeries(history),
    totals: payslipDeductionTotals(list, history),
  };
}

function months(n: number, from = 2025): StoredPayslip[] {
  return Array.from({ length: n }, (_, i) => {
    const y = from + Math.floor(i / 12);
    const m = String((i % 12) + 1).padStart(2, "0");
    return slip({ period: `${y}-${m}`, grossSalary: 1000 * (i + 1), netSalary: 800 * (i + 1), deductions: [{ name: "INSS", value: 200 * (i + 1) }] });
  });
}

describe("sem holerite", () => {
  it("histórico, resumo, série e totais vazios", () => {
    const r = all([]);
    expect(r.history).toEqual([]);
    expect(r.summary).toBeNull();
    expect(r.series).toEqual([]);
    expect(r.totals).toEqual([]);
    expect(payslipHistoryWindow([])).toBeNull();
    expect(sortPayslipsNewestFirst({})).toEqual([]);
  });
});

describe("resumo", () => {
  it("um holerite: sem anterior, média = líquido, 20% de descontos, uma barra", () => {
    const r = all([slip()]);
    expect(r.summary).toMatchObject({
      latest: { period: "2026-09", net: 4000, gross: 5000, deductionsTotal: 1000, count: 1 },
      previous: null,
      netChange: null,
      netChangePct: null,
      averageNet: 4000,
      windowCount: 1,
      deductionRate: 0.2,
    });
    expect(r.series).toHaveLength(1);
    expect(r.series[0]).toMatchObject({ label: "09/26", fullLabel: "09/2026", netRatio: 0.8, grossRatio: 1 });
  });

  it("alta: +200 (+5%) em relação a 08/2026", () => {
    const r = all([slip({ period: "2026-08", netSalary: 4000 }), slip({ period: "2026-09", netSalary: 4200 })]);
    expect(r.summary).toMatchObject({ previous: { period: "2026-08" }, netChange: 200, netChangePct: 5 });
  });

  it("queda: −200 (−4,76%)", () => {
    const r = all([slip({ period: "2026-08", netSalary: 4200 }), slip({ period: "2026-09", netSalary: 4000 })]);
    expect(r.summary?.netChange).toBe(-200);
    expect(r.summary?.netChangePct).toBe(-4.76);
  });

  it("competência pulada: anterior = 06/2026, duas barras sem buraco", () => {
    const r = all([slip({ period: "2026-09" }), slip({ period: "2026-06" })]);
    expect(r.summary?.previous?.period).toBe("2026-06");
    expect(r.series.map((p) => p.label)).toEqual(["06/26", "09/26"]);
  });

  it("líquido anterior 0: percentual null, variação calculada", () => {
    const r = all([slip({ period: "2026-08", netSalary: 0, grossSalary: 0 }), slip({ period: "2026-09" })]);
    expect(r.summary?.netChange).toBe(4000);
    expect(r.summary?.netChangePct).toBeNull();
  });

  it("bruto 0 na janela: deductionRate 0, razões 0 (sem divisão por zero)", () => {
    const r = all([slip({ grossSalary: 0, netSalary: 0 })]);
    expect(r.summary?.deductionRate).toBe(0);
    expect(r.series[0]).toMatchObject({ netRatio: 0, grossRatio: 0 });
  });

  it("15 competências: resumo e gráfico só com as 12 mais recentes", () => {
    const list = months(15);
    const r = all(list);
    expect(r.history).toHaveLength(15);
    expect(r.series).toHaveLength(PAYSLIP_HISTORY_WINDOW);
    expect(r.series[0]!.period).toBe("2025-04");
    expect(r.series[11]!.period).toBe("2026-03");
    expect(r.summary?.windowCount).toBe(12);
    // média dos líquidos 4..15 × 800
    expect(r.summary?.averageNet).toBe(round2((800 * (4 + 15) * 12) / 2 / 12));
    expect(r.summary?.deductionRate).toBe(0.2);
    expect(payslipHistoryWindow(r.history)).toEqual({ from: "2025-04", to: "2026-03" });
    // totais só da janela
    expect(r.totals).toEqual([{ name: "INSS", value: 200 * ((4 + 15) * 12) / 2, ratio: 1 }]);
    expect(sortPayslipsNewestFirst(list)).toHaveLength(15);
  });

  it("arredonda a 2 casas", () => {
    const r = all([
      slip({ period: "2026-08", netSalary: 1000.1, grossSalary: 1200.2 }),
      slip({ period: "2026-09", netSalary: 1000.2, grossSalary: 1200.1 }),
      slip({ period: "2026-10", netSalary: 1000.25, grossSalary: 1200 }),
    ]);
    expect(r.summary?.averageNet).toBe(1000.18);
    expect(r.summary?.netChange).toBe(0.05);
    expect(r.history[0]!.deductionsTotal).toBe(200.1);
  });
});

describe("decisão 1a: vários empregadores na mesma competência", () => {
  it("soma por competência; count = 2; a lista mostra os dois", () => {
    const list = [
      slip({ id: "a", company: "ACME", netSalary: 4000, grossSalary: 5000 }),
      slip({ id: "b", company: "Beta", cnpj: "11.444.777/0001-61", netSalary: 1500, grossSalary: 1800 }),
    ];
    const r = all(list);
    expect(r.history).toEqual([{ period: "2026-09", gross: 6800, net: 5500, deductionsTotal: 1300, count: 2, ids: ["a", "b"] }]);
    expect(r.summary?.latest.count).toBe(2);
    expect(r.summary?.averageNet).toBe(5500);
    expect(r.series).toHaveLength(1);
    expect(sortPayslipsNewestFirst(list)).toHaveLength(2);
  });
});

describe("decisão 2a: 13º", () => {
  it("fora do resumo e do gráfico; dentro do total por desconto", () => {
    const list = [
      slip({ period: "2026-12", netSalary: 4000, deductions: [{ name: "INSS", value: 600 }, { name: "IRRF", value: 400 }] }),
      slip({ period: "2026-12", kind: "thirteenth", netSalary: 3000, grossSalary: 3500, deductions: [{ name: "INSS", value: 500 }] }),
    ];
    const r = all(list);
    expect(r.history).toHaveLength(1);
    expect(r.summary).toMatchObject({ latest: { net: 4000, count: 1 }, averageNet: 4000, deductionRate: 0.2 });
    expect(r.series).toHaveLength(1);
    expect(r.series[0]!.net).toBe(4000);
    expect(r.totals.map((t) => [t.name, t.value])).toEqual([
      ["INSS", 1100],
      ["IRRF", 400],
    ]);
    // o 13º aparece primeiro na lista da competência
    expect(sortPayslipsNewestFirst(list)[0]!.kind).toBe("thirteenth");
  });

  it("13º fora da janela de 12 competências não entra nos totais", () => {
    const list = [
      ...months(13), // 2025-01..2026-01: janela 2025-02..2026-01
      slip({ period: "2024-12", kind: "thirteenth", deductions: [{ name: "IRRF", value: 77 }] }),
      slip({ period: "2025-12", kind: "thirteenth", deductions: [{ name: "IRRF", value: 99 }] }),
    ];
    const totals = payslipDeductionTotals(list);
    const irrf = totals.find((t) => t.name === "IRRF");
    expect(irrf?.value).toBe(99);
  });

  it("só 13º: sem resumo nem gráfico; totais de todos os 13º e título próprio", () => {
    const list = [slip({ kind: "thirteenth", period: "2026-12", deductions: [{ name: "INSS", value: 400 }] })];
    const r = all(list);
    expect(r.summary).toBeNull();
    expect(r.series).toEqual([]);
    expect(r.totals.map((t) => [t.name, t.value])).toEqual([
      [UNDETAILED_DEDUCTIONS_LABEL, 600],
      ["INSS", 400],
    ]);
    expect(payslipDeductionReport(list).title).toBe("Descontos do 13º salário");
    expect(payslipDeductionReport([slip()]).title).toBe("Descontos nas últimas 12 competências");
    expect(payslipSummaryNotice(list)).toBe("Ainda não há holerite mensal para o resumo.");
  });
});

describe("total por desconto", () => {
  it("agrupa nomes variados com o nome do mais recente", () => {
    const list = [
      slip({ period: "2026-07", netSalary: 4900, deductions: [{ name: "I.N.S.S.", value: 100 }] }),
      slip({ period: "2026-09", netSalary: 4900, deductions: [{ name: "INSS", value: 100 }] }),
      slip({ period: "2026-08", netSalary: 4900, deductions: [{ name: "inss ", value: 100 }] }),
    ];
    expect(payslipDeductionTotals(list)).toEqual([{ name: "INSS", value: 300, ratio: 1 }]);
    expect(deductionKey(" Contribuição  I.N.S.S. ")).toBe("CONTRIBUICAO INSS");
  });

  it("do maior para o menor, empate por nome", () => {
    const list = [slip({ netSalary: 4400, deductions: [{ name: "VT", value: 100 }, { name: "IRRF", value: 300 }, { name: "Plano", value: 100 }, { name: "INSS", value: 100 }] })];
    expect(payslipDeductionTotals(list).map((t) => t.name)).toEqual(["IRRF", "INSS", "Plano", "VT"]);
    expect(payslipDeductionTotals(list).map((t) => t.ratio)).toEqual([1, 1 / 3, 1 / 3, 1 / 3]);
  });

  it("manual sem linhas: 'Descontos sem detalhe' com bruto − líquido", () => {
    expect(payslipDeductionTotals([slip({ source: "manual" })])).toEqual([{ name: "Descontos sem detalhe", value: 1000, ratio: 1 }]);
  });

  it("leitura incompleta: a diferença entra em 'Descontos sem detalhe' e o total fecha", () => {
    const totals = payslipDeductionTotals([slip({ deductions: [{ name: "INSS", value: 600 }] })]);
    expect(totals).toEqual([
      { name: "INSS", value: 600, ratio: 1 },
      { name: "Descontos sem detalhe", value: 400, ratio: 400 / 600 },
    ]);
    expect(totals.reduce((s, t) => s + t.value, 0)).toBe(1000);
  });

  it("linhas acima de bruto − líquido: nenhuma linha negativa, linhas como estão", () => {
    const totals = payslipDeductionTotals([slip({ deductions: [{ name: "INSS", value: 700 }, { name: "IRRF", value: 500 }] })]);
    expect(totals.map((t) => [t.name, t.value])).toEqual([
      ["INSS", 700],
      ["IRRF", 500],
    ]);
  });
});

describe("valor não finito (dados antigos, D38)", () => {
  it("é ignorado no resumo, no gráfico e nos totais, sem lançar", () => {
    const list = [
      slip({ period: "2026-08", netSalary: NaN }),
      slip({ period: "2026-09", grossSalary: Infinity }),
      slip({ period: "2026-10", deductions: [{ name: "INSS", value: NaN }, { name: "IRRF", value: 1000 }] }),
      slip({ period: "x" }),
    ];
    const r = all(list);
    expect(r.history.map((e) => e.period)).toEqual(["2026-10"]);
    expect(r.summary?.previous).toBeNull();
    expect(r.series).toHaveLength(1);
    expect(r.totals).toEqual([{ name: "IRRF", value: 1000, ratio: 1 }]);
  });
});

describe("rótulos e exclusão", () => {
  it("payslipEmployerLabel", () => {
    expect(payslipEmployerLabel({ company: " ACME " })).toBe("ACME");
    expect(payslipEmployerLabel({ company: "", cnpj: "11.222.333/0001-81" })).toBe("11.222.333/0001-81");
    expect(payslipEmployerLabel({ company: "" })).toBe("Empresa não informada");
  });

  it("mensagem sem receita", () => {
    const msg = deletePayslipMessage(slip({ transactionId: "t1" }), false);
    expect(msg).toBe("O holerite de 09/2026 de ACME LTDA sai do histórico, do gráfico e dos totais.");
    expect(msg).not.toContain("receita");
  });

  it("mensagem com receita que ainda existe", () => {
    expect(deletePayslipMessage(slip({ transactionId: "t1" }), true)).toBe(
      "O holerite de 09/2026 de ACME LTDA sai do histórico, do gráfico e dos totais. A receita “Salário (09/2026)” lançada por ele continua no extrato; exclua-a por lá, se quiser.",
    );
    expect(deletePayslipMessage(slip({ kind: "thirteenth", period: "2026-12", company: "" }), true)).toBe(
      "O holerite de 13º salário 2026 sai da lista e do total por desconto. A receita “13º salário (2026)” lançada por ele continua no extrato; exclua-a por lá, se quiser.",
    );
  });
});

describe("R1: janela dos totais com o 13º", () => {
  it("13º posterior ao último mensal entra; o título diz que inclui o 13º", () => {
    const list = [
      slip({ period: "2026-11", deductions: [{ name: "INSS", value: 1000 }] }),
      slip({ period: "2026-12", kind: "thirteenth", grossSalary: 3500, netSalary: 3000, deductions: [{ name: "INSS", value: 500 }] }),
    ];
    const r = payslipDeductionReport(list);
    expect(r.window).toEqual({ from: "2026-01", to: "2026-12" });
    expect(r.rows).toEqual([{ name: "INSS", value: 1500, ratio: 1 }]);
    expect(r.includesThirteenth).toBe(true);
    expect(r.title).toBe("Descontos nas últimas 12 competências (inclui 13º)");
  });

  it("menos de 12 mensais: início 11 meses antes do fim, pegando o 13º anterior ao primeiro mensal", () => {
    const list = [
      slip({ period: "2026-03", deductions: [{ name: "INSS", value: 1000 }] }),
      slip({ period: "2026-04", deductions: [{ name: "INSS", value: 1000 }] }),
      slip({ period: "2025-12", kind: "thirteenth", deductions: [{ name: "IRRF", value: 1000 }] }),
      slip({ period: "2025-04", kind: "thirteenth", deductions: [{ name: "Antigo", value: 1000 }] }),
    ];
    const r = payslipDeductionReport(list);
    expect(r.window).toEqual({ from: "2025-05", to: "2026-04" });
    expect(r.rows.map((t) => [t.name, t.value])).toEqual([
      ["INSS", 2000],
      ["IRRF", 1000],
    ]);
    expect(r.title).toBe("Descontos nas últimas 12 competências (inclui 13º)");
  });

  it("12 mensais ou mais: início na primeira das 12; fim estendido até o 13º mais recente", () => {
    const list = [...months(12), slip({ period: "2026-12", kind: "thirteenth", deductions: [{ name: "IRRF", value: 1000 }] })];
    expect(payslipDeductionWindow(list)).toEqual({ from: "2025-01", to: "2026-12" });
    expect(payslipDeductionTotals(list).find((t) => t.name === "IRRF")?.value).toBe(1000);
  });

  it("mensais espalhados por mais de 12 meses: a janela não deixa de fora a primeira mensal contada", () => {
    const list = [
      slip({ period: "2024-01" }),
      slip({ period: "2026-09" }),
      slip({ period: "2024-12", kind: "thirteenth", deductions: [{ name: "IRRF", value: 100 }] }),
    ];
    expect(payslipDeductionWindow(list)).toEqual({ from: "2024-01", to: "2026-09" });
    expect(payslipDeductionTotals(list).find((t) => t.name === "IRRF")?.value).toBe(100);
  });

  it("sem 13º na conta, o título não o menciona", () => {
    const r = payslipDeductionReport([slip(), slip({ period: "2024-12", kind: "thirteenth", deductions: [{ name: "X", value: 1 }] })]);
    expect(r.includesThirteenth).toBe(false);
    expect(r.title).toBe("Descontos nas últimas 12 competências");
  });
});

describe("R3: rótulos do gráfico com muitas barras", () => {
  it("até 6 barras: MM/AA, sem marcador de ano", () => {
    const series = payslipChartSeries(buildPayslipHistory(months(6)));
    expect(series.map((p) => p.label)).toEqual(["01/25", "02/25", "03/25", "04/25", "05/25", "06/25"]);
    expect(series.every((p) => p.yearMarker === null)).toBe(true);
  });

  it("mais de 6 barras: só MM, com o ano na primeira barra e na virada", () => {
    const series = payslipChartSeries(buildPayslipHistory(months(13))); // janela 2025-02..2026-01
    expect(series).toHaveLength(12);
    expect(series.map((p) => p.label)).toEqual(["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "01"]);
    expect(series.map((p) => p.yearMarker)).toEqual(["2025", ...Array(10).fill(null), "2026"]);
    expect(series[11]!.fullLabel).toBe("01/2026");
  });
});

describe("R4/R6: percentual e linhas negativas", () => {
  it("deductionRate sai sem arredondar (a tela arredonda uma vez)", () => {
    expect(summarizePayslipHistory(buildPayslipHistory([slip({ grossSalary: 3, netSalary: 2 })]))?.deductionRate).toBe(1 / 3);
  });

  it("líquido acima do bruto: deductionRate negativo (a tela mostra —)", () => {
    expect(summarizePayslipHistory(buildPayslipHistory([slip({ grossSalary: 4000, netSalary: 5000 })]))!.deductionRate).toBeLessThan(0);
  });

  it("grupo com soma negativa ou zero não aparece", () => {
    const totals = payslipDeductionTotals([
      slip({ deductions: [{ name: "INSS", value: 600 }, { name: "Estorno", value: -50 }, { name: "Zero", value: 0 }] }),
    ]);
    expect(totals.map((t) => t.name)).toEqual(["INSS", "Descontos sem detalhe"]);
    expect(totals.every((t) => t.value > 0)).toBe(true);
  });
});

describe("R8: mensagem e título pelos tipos salvos", () => {
  it("mensais com valores inválidos + 13º: aviso próprio e título do 13º", () => {
    const list = [
      slip({ period: "2026-11", netSalary: NaN }),
      slip({ period: "2026-12", kind: "thirteenth", deductions: [{ name: "INSS", value: 400 }] }),
    ];
    const history = buildPayslipHistory(list);
    expect(summarizePayslipHistory(history)).toBeNull();
    expect(payslipSummaryNotice(list, history)).toBe("Os holerites mensais salvos não têm valores válidos para o resumo.");
    expect(payslipDeductionReport(list, history).title).toBe("Descontos do 13º salário");
  });

  it("com resumo, sem aviso", () => {
    expect(payslipSummaryNotice([slip()])).toBeNull();
  });
});

describe("R11: lacunas de teste", () => {
  it("razões do gráfico sobre o maior valor da janela, com várias barras", () => {
    const series = payslipChartSeries(
      buildPayslipHistory([
        slip({ period: "2026-07", grossSalary: 2000, netSalary: 1500 }),
        slip({ period: "2026-08", grossSalary: 8000, netSalary: 6000 }),
        slip({ period: "2026-09", grossSalary: 4000, netSalary: 3000 }),
      ]),
    );
    expect(series.map((p) => [p.grossRatio, p.netRatio])).toEqual([
      [0.25, 0.1875],
      [1, 0.75],
      [0.5, 0.375],
    ]);
  });

  it("na mesma competência, o nome exibido é o do holerite gravado por último (recordedAt)", () => {
    const list = [
      slip({ id: "b", period: "2026-09", company: "Beta", recordedAt: 200, netSalary: 4900, deductions: [{ name: "I.N.S.S.", value: 100 }] }),
      slip({ id: "a", period: "2026-09", company: "ACME", recordedAt: 100, netSalary: 4900, deductions: [{ name: "inss", value: 100 }] }),
    ];
    expect(payslipDeductionTotals(list)).toEqual([{ name: "I.N.S.S.", value: 200, ratio: 1 }]);
    expect(payslipDeductionTotals([...list].reverse())).toEqual([{ name: "I.N.S.S.", value: 200, ratio: 1 }]);
    expect(sortPayslipsNewestFirst(list).map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("totais por desconto arredondados a 2 casas (sem resíduo de ponto flutuante)", () => {
    const list = [
      slip({ period: "2026-08", netSalary: 4999.9, deductions: [{ name: "VT", value: 0.1 }] }),
      slip({ period: "2026-09", netSalary: 4999.8, deductions: [{ name: "VT", value: 0.2 }] }),
    ];
    expect(payslipDeductionTotals(list)).toEqual([{ name: "VT", value: 0.3, ratio: 1 }]);
  });

  it("linha negativa não aparece nem cria 'Descontos sem detalhe' falso", () => {
    const totals = payslipDeductionTotals([slip({ netSalary: 4400, deductions: [{ name: "INSS", value: 600 }, { name: "Ajuste", value: -100 }] })]);
    expect(totals).toEqual([{ name: "INSS", value: 600, ratio: 1 }]);
  });
});

describe("pureza", () => {
  it("exportado em packages/domain/index.ts", () => {
    expect(domain.buildPayslipHistory).toBe(buildPayslipHistory);
    expect(domain.deletePayslipMessage).toBe(deletePayslipMessage);
  });

  it("R4: payslipHistory.ts não importa parsers, react, react-native, expo nem usa Date.now/Math.random", () => {
    const src = readFileSync(path.resolve(__dirname, "../src/payslipHistory.ts"), "utf-8");
    expect(src).not.toMatch(/from\s+["'][^"']*parsers/);
    expect(src).not.toMatch(/from\s+["'](react|react-native|expo)[^"']*["']/);
    expect(src).not.toMatch(/Date\.now|Math\.random/);
  });
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
