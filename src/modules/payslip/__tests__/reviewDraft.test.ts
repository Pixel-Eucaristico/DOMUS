import { describe, it, expect } from "vitest";
import {
  PAYSLIP_COMPANY_MAX_LENGTH,
  PAYSLIP_DRAFT_ERRORS,
  PAYSLIP_SUBMIT_ERROR,
  decidePayslipSubmit,
  draftFromParse,
  emptyPayslipDraft,
  initialTouched,
  isThirteenthPeriodInput,
  parseAmountInput,
  periodToInput,
  toggleDraftThirteenth,
  updateDraftField,
  validatePayslipDraft,
  visibleDraftErrors,
  type PayslipDraft,
} from "../reviewDraft";
import type { PayslipReviewValues } from "@packages/domain";
import { sameEmployer } from "@packages/domain";

/** Story 11.5: rascunho da revisão — validação, 13º e erros visíveis. */

const CNPJ_A = "11.222.333/0001-81";
/** Exemplo oficial da Receita do CNPJ alfanumérico. */
const CNPJ_ALNUM = "12.ABC.345/01DE-35";

function draft(over: Partial<PayslipDraft> = {}): PayslipDraft {
  return {
    ...emptyPayslipDraft(),
    company: "ACME LTDA",
    period: "09/2026",
    gross: "5.000,00",
    net: "4.000,00",
    deductions: [{ name: "INSS", value: 600 }, { name: "IRRF", value: 400 }],
    source: "ocr",
    ...over,
  };
}

function valuesOf(d: PayslipDraft): PayslipReviewValues {
  const r = validatePayslipDraft(d);
  if (!r.ok) throw new Error(`rascunho inválido: ${JSON.stringify(r.errors)}`);
  return r.values;
}

describe("validatePayslipDraft", () => {
  it("rascunho completo vira valores normalizados", () => {
    const r = validatePayslipDraft(draft({ cnpj: "11222333000181", fgts: 400 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual({
      period: "2026-09",
      company: "ACME LTDA",
      cnpj: CNPJ_A,
      grossSalary: 5000,
      netSalary: 4000,
      earnings: [],
      deductions: [{ name: "INSS", value: 600 }, { name: "IRRF", value: 400 }],
      fgts: 400,
      source: "ocr",
    });
    expect(r.values.kind).toBeUndefined();
  });

  it.each([
    ["14/2026", PAYSLIP_DRAFT_ERRORS.periodInvalid],
    ["", PAYSLIP_DRAFT_ERRORS.periodEmpty],
    ["   ", PAYSLIP_DRAFT_ERRORS.periodEmpty],
    ["05/10/2026", PAYSLIP_DRAFT_ERRORS.periodInvalid],
    ["abc", PAYSLIP_DRAFT_ERRORS.periodInvalid],
  ])("competência %j não salva", (period, message) => {
    const r = validatePayslipDraft(draft({ period }));
    expect(r.ok).toBe(false);
    expect(r.errors.period).toBe(message);
  });

  it("13/AAAA vira dezembro do 13º; 12/AAAA segue a chave", () => {
    expect(valuesOf(draft({ period: "13/2026", thirteenth: true }))).toMatchObject({ period: "2026-12", kind: "thirteenth" });
    expect(valuesOf(draft({ period: "12/2026", thirteenth: false })).kind).toBeUndefined();
    expect(valuesOf(draft({ period: "12/2026", thirteenth: true })).kind).toBe("thirteenth");
  });

  it("líquido maior que o bruto não salva", () => {
    const r = validatePayslipDraft(draft({ gross: "3000", net: "3100" }));
    expect(r.ok).toBe(false);
    expect(r.errors.net).toBe(PAYSLIP_DRAFT_ERRORS.netAboveGross);
  });

  it("líquido igual ao bruto salva", () => {
    expect(valuesOf(draft({ gross: "3000", net: "3.000,00" })).netSalary).toBe(3000);
  });

  it.each(["0", "", "0,00"])("líquido %j não salva", (net) => {
    const r = validatePayslipDraft(draft({ net }));
    expect(r.ok).toBe(false);
    expect(r.errors.net).toBe(PAYSLIP_DRAFT_ERRORS.netInvalid);
  });

  it.each(["", "0"])("bruto %j não salva", (gross) => {
    const r = validatePayslipDraft(draft({ gross }));
    expect(r.ok).toBe(false);
    expect(r.errors.gross).toBe(PAYSLIP_DRAFT_ERRORS.grossInvalid);
  });

  it("sem empresa nem CNPJ não salva (R8 da 11.4)", () => {
    for (const company of ["", "   ", "..."]) {
      const r = validatePayslipDraft(draft({ company, cnpj: "" }));
      expect(r.ok).toBe(false);
      expect(r.errors.company).toBe(PAYSLIP_DRAFT_ERRORS.employerMissing);
    }
  });

  it("só o CNPJ basta", () => {
    expect(valuesOf(draft({ company: "", cnpj: CNPJ_A }))).toMatchObject({ company: "", cnpj: CNPJ_A });
  });

  it("CNPJ com dígito verificador errado não salva", () => {
    const r = validatePayslipDraft(draft({ cnpj: "11.222.333/0001-82" }));
    expect(r.ok).toBe(false);
    expect(r.errors.cnpj).toBe(PAYSLIP_DRAFT_ERRORS.cnpjInvalid);
    expect(r.errors.company).toBeUndefined();
  });

  it("valores arredondados a 2 casas", () => {
    expect(valuesOf(draft({ gross: "5000,005", net: "4000,004" }))).toMatchObject({ grossSalary: 5000.01, netSalary: 4000 });
  });
});

describe("R8: CNPJ alfanumérico", () => {
  it("aceita o CNPJ alfanumérico válido, em maiúsculas ou minúsculas", () => {
    expect(valuesOf(draft({ cnpj: CNPJ_ALNUM })).cnpj).toBe(CNPJ_ALNUM);
    expect(valuesOf(draft({ cnpj: "12abc34501de35" })).cnpj).toBe(CNPJ_ALNUM);
  });

  it("recusa dígito verificador errado com a mensagem dos 14 caracteres", () => {
    const r = validatePayslipDraft(draft({ cnpj: "12.ABC.345/01DE-36" }));
    expect(r.ok).toBe(false);
    expect(r.errors.cnpj).toBe("CNPJ inválido. Confira os 14 caracteres.");
  });

  it("o numérico continua valendo", () => {
    expect(valuesOf(draft({ cnpj: "11222333000181" })).cnpj).toBe(CNPJ_A);
  });

  it("o CNPJ salvo casa no reducer com o mesmo CNPJ escrito de outro jeito", () => {
    const cnpj = valuesOf(draft({ cnpj: "12abc34501de35" })).cnpj!;
    expect(sameEmployer({ cnpj, company: "x" }, { cnpj: "12ABC34501DE35", company: "y" })).toBe(true);
  });
});

describe("R10: valores digitados", () => {
  it.each([
    ["5.340,91", 5340.91],
    ["5340.91", 5340.91],
    ["R$ 5.340,91", 5340.91],
    ["1 234,56", 1234.56],
    ["1 234,56", 1234.56],
    ["", null],
  ])("%j → %s", (text, expected) => {
    expect(parseAmountInput(text)).toBe(expected);
  });

  it.each(["1e3", "-10", "10-", "0x10", "Infinity", "abc", "12a"])("%j é ilegível", (text) => {
    expect(parseAmountInput(text)).toBeNaN();
  });

  it("valor ilegível ou negativo mostra 'Valor inválido.'", () => {
    for (const net of ["1e3", "-10", "abc"]) {
      expect(validatePayslipDraft(draft({ net })).errors.net).toBe("Valor inválido.");
    }
    expect(validatePayslipDraft(draft({ gross: "1e9" })).errors.gross).toBe("Valor inválido.");
  });

  it("espaço como milhar salva", () => {
    expect(valuesOf(draft({ gross: "5 000,00", net: "4 000,00" }))).toMatchObject({ grossSalary: 5000, netSalary: 4000 });
  });
});

describe("R11: limite da empresa", () => {
  it(`até ${PAYSLIP_COMPANY_MAX_LENGTH} caracteres`, () => {
    expect(validatePayslipDraft(draft({ company: "A".repeat(PAYSLIP_COMPANY_MAX_LENGTH) })).ok).toBe(true);
    const r = validatePayslipDraft(draft({ company: "A".repeat(PAYSLIP_COMPANY_MAX_LENGTH + 1) }));
    expect(r.ok).toBe(false);
    expect(r.errors.company).toBe("Use até 120 caracteres.");
  });
});

describe("R9: 13º e competência", () => {
  it("13/AAAA força o 13º mesmo com a chave desligada (não substitui dezembro)", () => {
    expect(valuesOf(draft({ period: "13/2026", thirteenth: false }))).toMatchObject({ period: "2026-12", kind: "thirteenth" });
  });

  it("aceita 13º/AAAA", () => {
    expect(isThirteenthPeriodInput("13º/2026")).toBe(true);
    expect(valuesOf(draft({ period: "13º/2026" }))).toMatchObject({ period: "2026-12", kind: "thirteenth" });
  });

  it("13 de um mês não é 13º", () => {
    expect(isThirteenthPeriodInput("13 de setembro de 2026")).toBe(false);
  });

  it("a chave acompanha a competência até o usuário tocar nela", () => {
    let d = updateDraftField(draft({ period: "" }), "period", "13/2026");
    expect(d.thirteenth).toBe(true);
    d = updateDraftField(d, "period", "12/2026");
    expect(d.thirteenth).toBe(false);
    d = toggleDraftThirteenth(d, true);
    d = updateDraftField(d, "period", "11/2026");
    expect(d.thirteenth).toBe(true);
  });

  it("depois de tocada, a chave ainda é ligada por 13/AAAA", () => {
    let d = toggleDraftThirteenth(draft({ period: "09/2026" }), false);
    d = updateDraftField(d, "period", "13/2026");
    expect(d.thirteenth).toBe(true);
  });

  it("desligar a chave com 13/AAAA troca a competência para 12/AAAA", () => {
    const d = toggleDraftThirteenth(draft({ period: "13/2026", thirteenth: true }), false);
    expect(d).toMatchObject({ period: "12/2026", thirteenth: false, thirteenthTouched: true });
    expect(valuesOf(d).kind).toBeUndefined();
  });

  it("13º lido aparece como 13/AAAA", () => {
    const d = draftFromParse(
      { company: "ACME", period: "2026-12", thirteenth: true, grossSalary: 1, netSalary: 1, earnings: [], deductions: [], confidence: 1, warnings: [] },
      "ocr",
    );
    expect(d).toMatchObject({ period: "13/2026", thirteenth: true });
    expect(updateDraftField(d, "company", "X").thirteenth).toBe(true);
  });
});

describe("R7: erros visíveis e toque em Salvar", () => {
  it("revisão manual não abre cheia de erros", () => {
    const d = emptyPayslipDraft();
    expect(visibleDraftErrors(validatePayslipDraft(d).errors, initialTouched(d))).toEqual({});
  });

  it("falta de empresa/CNPJ em campos não tocados aparece ao tocar em Salvar", () => {
    const d = draft({ company: "", cnpj: "" });
    const v = validatePayslipDraft(d);
    const touched = initialTouched(d);
    expect(visibleDraftErrors(v.errors, touched)).toEqual({});
    const decision = decidePayslipSubmit(v);
    expect(decision.action).toBe("showErrors");
    if (decision.action !== "showErrors") return;
    expect(decision.message).toBe(PAYSLIP_SUBMIT_ERROR);
    expect(visibleDraftErrors(v.errors, decision.touched)).toEqual({ company: PAYSLIP_DRAFT_ERRORS.employerMissing });
  });

  it("mexer no CNPJ mostra a falta de empresa", () => {
    const d = draft({ company: "", cnpj: "" });
    const errors = validatePayslipDraft(d).errors;
    expect(visibleDraftErrors(errors, { cnpj: true })).toEqual({ company: PAYSLIP_DRAFT_ERRORS.employerMissing });
  });

  it("rascunho válido salva", () => {
    expect(decidePayslipSubmit(validatePayslipDraft(draft()))).toMatchObject({ action: "save", values: { period: "2026-09" } });
  });
});

describe("rascunho a partir da leitura", () => {
  it("draftFromParse leva texto e linhas; nunca confidence/warnings", () => {
    const d = draftFromParse(
      {
        company: "ACME",
        cnpj: CNPJ_A,
        period: "2026-09",
        grossSalary: 5340.91,
        netSalary: 4000,
        earnings: [{ name: "SALARIO", value: 5340.91 }],
        deductions: [{ name: "INSS", value: 1340.91 }],
        fgts: 427.27,
        confidence: 0.9,
        warnings: ["x"],
      },
      "vision",
    );
    expect(d).toEqual({
      company: "ACME",
      cnpj: CNPJ_A,
      period: "09/2026",
      thirteenth: false,
      gross: "5340,91",
      net: "4000,00",
      earnings: [{ name: "SALARIO", value: 5340.91 }],
      deductions: [{ name: "INSS", value: 1340.91 }],
      fgts: 427.27,
      source: "vision",
    });
  });

  it("sem valores nem competência fica em branco", () => {
    const d = draftFromParse(
      { company: "", period: null, grossSalary: 0, netSalary: 0, earnings: [], deductions: [], confidence: 0, warnings: [] },
      "ocr",
    );
    expect(d).toMatchObject({ period: "", gross: "", net: "", thirteenth: false });
  });

  it("manual começa vazio", () => {
    expect(emptyPayslipDraft()).toMatchObject({ source: "manual", company: "", period: "", thirteenth: false });
  });

  it("13/AAAA digitado é 13º; outros não", () => {
    expect(isThirteenthPeriodInput("13/2026")).toBe(true);
    expect(isThirteenthPeriodInput(" 13/2026")).toBe(true);
    expect(isThirteenthPeriodInput("12/2026")).toBe(false);
    expect(isThirteenthPeriodInput("13/")).toBe(false);
    expect(isThirteenthPeriodInput("130/2026")).toBe(false);
  });

  it("periodToInput", () => {
    expect(periodToInput("2026-09")).toBe("09/2026");
    expect(periodToInput(null)).toBe("");
  });
});
