import { describe, it, expect, vi, afterEach } from "vitest";
import { setPendingPayslipReview, takePendingPayslipReview, PENDING_PAYSLIP_TTL_MS } from "../pendingReview";

describe("pendingReview (chat → /payslips, em memória)", () => {
  it("é lido uma vez", () => {
    const data = { company: "ACME", period: "2026-09", grossSalary: 1, netSalary: 1, earnings: [], deductions: [], confidence: 1, warnings: [] };
    expect(takePendingPayslipReview()).toBeNull();
    setPendingPayslipReview({ data, source: "vision" });
    expect(takePendingPayslipReview()).toEqual({ data, source: "vision" });
    expect(takePendingPayslipReview()).toBeNull();
  });

  it("o último pendente vence", () => {
    const base = { company: "", period: null, grossSalary: 0, netSalary: 0, earnings: [], deductions: [], confidence: 0, warnings: [] };
    setPendingPayslipReview({ data: { ...base, company: "A" }, source: "ocr" });
    setPendingPayslipReview({ data: base, source: "manual" });
    expect(takePendingPayslipReview()?.source).toBe("manual");
    expect(takePendingPayslipReview()).toBeNull();
  });
});

// R6: o pendente não lido some da memória depois da validade curta.
describe("pendingReview — validade (R6)", () => {
  const data = { company: "ACME", period: "2026-09", grossSalary: 1, netSalary: 1, earnings: [], deductions: [], confidence: 1, warnings: [] };
  afterEach(() => {
    vi.useRealTimers();
    takePendingPayslipReview();
  });

  it("vencido não é entregue", () => {
    setPendingPayslipReview({ data, source: "ocr" }, 1000);
    expect(takePendingPayslipReview(1000 + PENDING_PAYSLIP_TTL_MS + 1)).toBeNull();
  });

  it("dentro da validade é entregue", () => {
    setPendingPayslipReview({ data, source: "ocr" }, 1000);
    expect(takePendingPayslipReview(1000 + PENDING_PAYSLIP_TTL_MS - 1)?.source).toBe("ocr");
  });

  it("o temporizador limpa a memória mesmo sem leitura", () => {
    vi.useFakeTimers();
    setPendingPayslipReview({ data, source: "vision" });
    vi.advanceTimersByTime(PENDING_PAYSLIP_TTL_MS + 1);
    vi.useRealTimers();
    // Lido com o relógio de "agora": só some se o temporizador limpou.
    expect(takePendingPayslipReview(0)).toBeNull();
  });
});
