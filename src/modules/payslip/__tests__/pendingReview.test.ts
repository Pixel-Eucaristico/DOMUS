import { describe, it, expect } from "vitest";
import { setPendingPayslipReview, takePendingPayslipReview } from "../pendingReview";

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
