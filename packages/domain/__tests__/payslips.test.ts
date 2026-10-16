import { describe, it, expect } from "vitest";
import { replayEvents } from "../src/replay";
import {
  recordPayslipEvent,
  deletePayslipEvent,
  getPayslipHistory,
  summarizePayslips,
  formatPayslipPeriod,
} from "../src/payslips";
import type { RecordPayslipParams } from "../src/payslips";

function payslip(overrides: Partial<RecordPayslipParams> = {}): RecordPayslipParams {
  return {
    period: "2026-03",
    company: "ACME LTDA",
    cnpj: "12.345.678/0001-90",
    grossSalary: 5000,
    netSalary: 4000,
    deductions: [
      { name: "INSS", value: 600 },
      { name: "IRRF", value: 400 },
    ],
    source: "vision",
    ...overrides,
  };
}

describe("payslip events", () => {
  it("registra holerites no estado via replay", () => {
    const state = replayEvents([
      recordPayslipEvent(payslip({ id: "p1" })),
      recordPayslipEvent(payslip({ id: "p2", period: "2026-04" })),
    ]);
    expect(Object.keys(state.payslips)).toEqual(["p1", "p2"]);
    expect(state.payslips.p1!.recordedAt).toBeTypeOf("number");
  });

  it("substitui a leitura da mesma competência e mesmo CNPJ", () => {
    const state = replayEvents([
      recordPayslipEvent(payslip({ id: "p1", netSalary: 3900 })),
      recordPayslipEvent(payslip({ id: "p2", cnpj: "12345678000190", netSalary: 4000 })),
    ]);
    expect(Object.keys(state.payslips)).toEqual(["p2"]);
  });

  it("mantém competências iguais de empresas diferentes", () => {
    const state = replayEvents([
      recordPayslipEvent(payslip({ id: "p1" })),
      recordPayslipEvent(payslip({ id: "p2", company: "OUTRA SA", cnpj: undefined })),
    ]);
    expect(Object.keys(state.payslips)).toHaveLength(2);
  });

  it("regravar o mesmo id atualiza o registro", () => {
    const state = replayEvents([
      recordPayslipEvent(payslip({ id: "p1", netSalary: 3900 })),
      recordPayslipEvent(payslip({ id: "p1", netSalary: 4100 })),
    ]);
    expect(state.payslips.p1!.netSalary).toBe(4100);
  });

  it("remove holerite e ignora id inexistente", () => {
    const state = replayEvents([
      recordPayslipEvent(payslip({ id: "p1" })),
      deletePayslipEvent("p1"),
      deletePayslipEvent("nao-existe"),
    ]);
    expect(state.payslips).toEqual({});
  });

  it("não altera saldos de contas", () => {
    const state = replayEvents([recordPayslipEvent(payslip())]);
    expect(state.accounts).toEqual({});
    expect(state.transactions).toEqual({});
  });
});

describe("getPayslipHistory / summarizePayslips", () => {
  it("ordena por competência e resume", () => {
    const state = replayEvents([
      recordPayslipEvent(payslip({ id: "abr", period: "2026-04", grossSalary: 5500, netSalary: 4400, deductions: [{ name: "INSS ", value: 650 }, { name: "IRRF", value: 450 }] })),
      recordPayslipEvent(payslip({ id: "mar", period: "2026-03" })),
    ]);
    const history = getPayslipHistory(state);
    expect(history.map((p) => p.id)).toEqual(["mar", "abr"]);

    const s = summarizePayslips(history);
    expect(s.count).toBe(2);
    expect(s.latest!.id).toBe("abr");
    expect(s.averageNet).toBe(4200);
    expect(s.averageGross).toBe(5250);
    expect(s.netChange).toBe(400);
    expect(s.netChangePct).toBe(10);
    expect(s.deductionRate).toBe(0.2);
    expect(s.deductionTotals).toEqual([
      { name: "INSS", value: 1250 },
      { name: "IRRF", value: 850 },
    ]);
  });

  it("resumo vazio", () => {
    const s = summarizePayslips([]);
    expect(s.count).toBe(0);
    expect(s.latest).toBeNull();
    expect(s.netChange).toBeNull();
  });

  it("formata competência", () => {
    expect(formatPayslipPeriod("2026-03")).toBe("mar/2026");
    expect(formatPayslipPeriod("invalido")).toBe("invalido");
  });
});
