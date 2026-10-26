import { describe, it, expect } from "vitest";
import {
  PAYSLIP_DRAFT_ERRORS,
  buildPayslipSaveEvents,
  defaultLaunchIncome,
  draftFromParse,
  emptyPayslipDraft,
  findPayslipInSlot,
  formatPayslipPeriodLabel,
  isThirteenthPeriodInput,
  payslipIncomeDescription,
  periodToInput,
  replacePayslipMessage,
  validatePayslipDraft,
  type PayslipDraft,
  type PayslipReviewValues,
} from "../src/payslipReview";
import { replayEvents } from "../src/replay";
import { createAccountEvent } from "../src/accounts";
import type { StoredPayslip } from "../src/state";
import { EVENT_TYPES } from "../../events/src/types";
import type { DomainEvent } from "../../events/src/types";

/** Story 11.5: revisão do holerite — validação, vaga ocupada e eventos do salvar. */

const CNPJ_A = "11.222.333/0001-81";
const CNPJ_B = "11.444.777/0001-61";

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

function stored(over: Partial<StoredPayslip> & { id: string }): StoredPayslip {
  return {
    period: "2026-09",
    company: "ACME LTDA",
    grossSalary: 5000,
    netSalary: 4000,
    deductions: [],
    recordedAt: 1,
    ...over,
  };
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

  it("13/AAAA vira dezembro; a chave decide o tipo", () => {
    expect(valuesOf(draft({ period: "13/2026", thirteenth: true }))).toMatchObject({ period: "2026-12", kind: "thirteenth" });
    expect(valuesOf(draft({ period: "12/2026", thirteenth: false })).kind).toBeUndefined();
  });

  it("líquido maior que o bruto não salva", () => {
    const r = validatePayslipDraft(draft({ gross: "3000", net: "3100" }));
    expect(r.ok).toBe(false);
    expect(r.errors.net).toBe(PAYSLIP_DRAFT_ERRORS.netAboveGross);
  });

  it("líquido igual ao bruto salva", () => {
    expect(valuesOf(draft({ gross: "3000", net: "3.000,00" })).netSalary).toBe(3000);
  });

  it.each(["0", "", "0,00", "-10", "abc"])("líquido %j não salva", (net) => {
    const r = validatePayslipDraft(draft({ net }));
    expect(r.ok).toBe(false);
    expect(r.errors.net).toBe(PAYSLIP_DRAFT_ERRORS.netInvalid);
  });

  it.each(["", "abc", "0"])("bruto %j não salva", (gross) => {
    const r = validatePayslipDraft(draft({ gross }));
    expect(r.ok).toBe(false);
    expect(r.errors.gross).toBe(PAYSLIP_DRAFT_ERRORS.grossInvalid);
  });

  it("sem empresa nem CNPJ não salva (R8)", () => {
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

describe("rascunho a partir da leitura", () => {
  it("draftFromParse leva texto, 13º e linhas; nunca confidence/warnings", () => {
    const d = draftFromParse(
      {
        company: "ACME",
        cnpj: CNPJ_A,
        period: "2026-12",
        thirteenth: true,
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
      period: "12/2026",
      thirteenth: true,
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

  it("13/AAAA digitado liga a chave; outros não", () => {
    expect(isThirteenthPeriodInput("13/2026")).toBe(true);
    expect(isThirteenthPeriodInput(" 13/2026")).toBe(true);
    expect(isThirteenthPeriodInput("12/2026")).toBe(false);
    expect(isThirteenthPeriodInput("13/")).toBe(false);
    expect(isThirteenthPeriodInput("130/2026")).toBe(false);
  });

  it("periodToInput e rótulos", () => {
    expect(periodToInput("2026-09")).toBe("09/2026");
    expect(periodToInput(null)).toBe("");
    expect(formatPayslipPeriodLabel({ period: "2026-09" })).toBe("09/2026");
    expect(formatPayslipPeriodLabel({ period: "2026-12", kind: "thirteenth" })).toBe("13º salário 2026");
  });
});

describe("vaga ocupada (samePayslipSlot)", () => {
  const monthly = stored({ id: "m", period: "2026-12", cnpj: CNPJ_A });
  const thirteenth = stored({ id: "t", period: "2026-12", cnpj: CNPJ_A, kind: "thirteenth" });

  it("13º não ocupa a vaga do mensal de dezembro, e vice-versa", () => {
    expect(findPayslipInSlot({ m: monthly }, { period: "2026-12", kind: "thirteenth", cnpj: CNPJ_A, company: "ACME LTDA" })).toBeUndefined();
    expect(findPayslipInSlot({ t: thirteenth }, { period: "2026-12", cnpj: CNPJ_A, company: "ACME LTDA" })).toBeUndefined();
    expect(findPayslipInSlot([monthly, thirteenth], { period: "2026-12", kind: "thirteenth", cnpj: CNPJ_A, company: "x" })?.id).toBe("t");
  });

  it("CNPJ diferente é outro empregador, mesmo com o mesmo nome", () => {
    expect(findPayslipInSlot({ m: monthly }, { period: "2026-12", cnpj: CNPJ_B, company: "ACME LTDA" })).toBeUndefined();
  });

  it("sem CNPJ de um lado, compara o nome normalizado", () => {
    expect(findPayslipInSlot({ m: monthly }, { period: "2026-12", company: "acme ltda." })?.id).toBe("m");
    expect(findPayslipInSlot({ m: monthly }, { period: "2026-11", company: "acme ltda." })).toBeUndefined();
  });

  it("decisão 2a: receita começa desligada se a vaga já lançou receita", () => {
    expect(defaultLaunchIncome(true, undefined)).toBe(true);
    expect(defaultLaunchIncome(false, undefined)).toBe(false);
    expect(defaultLaunchIncome(true, stored({ id: "x" }))).toBe(true);
    expect(defaultLaunchIncome(true, stored({ id: "x", transactionId: "tx" }))).toBe(false);
  });

  it("mensagem de substituição cita competência, empresa e a receita mantida", () => {
    expect(replacePayslipMessage(stored({ id: "x" }))).toBe(
      "Já existe o holerite de 09/2026 de ACME LTDA. Ele será substituído pelo novo.",
    );
    expect(replacePayslipMessage(stored({ id: "x", kind: "thirteenth", period: "2026-12", transactionId: "tx" }))).toBe(
      "Já existe o holerite de 13º salário 2026 de ACME LTDA. Ele será substituído pelo novo. A receita já lançada pelo holerite anterior continua no extrato.",
    );
  });
});

describe("buildPayslipSaveEvents", () => {
  const values = valuesOf(draft({ cnpj: CNPJ_A }));

  it("sem receita: só PAYSLIP_RECORDED, sem transactionId, id novo a cada salvar", () => {
    const [a, ...rest] = buildPayslipSaveEvents(values, { deviceId: "dev-a" });
    const [b] = buildPayslipSaveEvents(values, { deviceId: "dev-a" });
    expect(rest).toEqual([]);
    expect(a.type).toBe(EVENT_TYPES.PAYSLIP_RECORDED);
    expect(a.deviceId).toBe("dev-a");
    expect(a.payload.transactionId).toBeUndefined();
    expect(a.payload.id).not.toBe(b.payload.id);
    expect(a.payload).not.toHaveProperty("kind");
  });

  it("com receita: income/salario com o líquido, ligada ao holerite", () => {
    const events = buildPayslipSaveEvents(values, { income: { accountId: "acc", date: "2026-10-05" } });
    expect(events).toHaveLength(2);
    const [payslip, tx] = events as [DomainEvent, DomainEvent];
    expect(payslip.type).toBe(EVENT_TYPES.PAYSLIP_RECORDED);
    expect(tx.type).toBe(EVENT_TYPES.TRANSACTION_CREATED);
    expect(tx.payload).toMatchObject({
      accountId: "acc",
      type: "income",
      amount: 4000,
      categoryId: "salario",
      date: "2026-10-05",
      description: "Salário (09/2026) — ACME LTDA",
    });
    expect((payslip.payload as { transactionId?: string }).transactionId).toBe((tx.payload as { id: string }).id);
  });

  it("13º: kind no evento e descrição do 13º", () => {
    const v = valuesOf(draft({ period: "13/2026", thirteenth: true, company: "" , cnpj: CNPJ_A }));
    const [p, tx] = buildPayslipSaveEvents(v, { income: { accountId: "acc", date: "2026-12-20" } });
    expect(p.payload.kind).toBe("thirteenth");
    expect(tx?.payload.description).toBe("13º salário (2026)");
    expect(payslipIncomeDescription({ period: "2026-12", kind: "thirteenth", company: "X" })).toBe("13º salário (2026) — X");
  });

  it("nunca leva confidence, warnings, nome nem CPF", () => {
    const [p] = buildPayslipSaveEvents(values);
    expect(Object.keys(p.payload).sort()).toEqual(
      ["cnpj", "company", "deductions", "grossSalary", "id", "netSalary", "period", "source"].sort(),
    );
  });

  it("data da receita inválida ou conta vazia lança erro", () => {
    expect(() => buildPayslipSaveEvents(values, { income: { accountId: "acc", date: "05/10/2026" } })).toThrow();
    expect(() => buildPayslipSaveEvents(values, { income: { accountId: "", date: "2026-10-05" } })).toThrow();
  });

  it("replay: substitui pela vaga, mantém a receita anterior e soma o saldo", () => {
    const acc = createAccountEvent({ name: "Banco", type: "checking", balance: 1000 });
    const accountId = acc.payload.id;
    const first = buildPayslipSaveEvents(values, { income: { accountId, date: "2026-10-05" } });
    const second = buildPayslipSaveEvents(valuesOf(draft({ cnpj: CNPJ_A, net: "4.100,00" })), {});
    const other = buildPayslipSaveEvents(valuesOf(draft({ cnpj: CNPJ_B })), {});
    const all = [acc, ...first, ...second, ...other] as DomainEvent[];
    all.forEach((e, i) => (e.timestamp = 1000 + i));
    const s = replayEvents(all);
    const slips = Object.values(s.payslips);
    expect(slips).toHaveLength(2);
    expect(slips.find((p) => p.cnpj === CNPJ_A)?.netSalary).toBe(4100);
    expect(Object.values(s.transactions)).toHaveLength(1);
    expect(s.accounts[accountId]?.balance).toBe(5000);
  });
});
