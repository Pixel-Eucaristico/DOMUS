import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import {
  buildPayslipSaveEvents,
  defaultIncomeAccountId,
  defaultLaunchIncome,
  findPayslipsInSlot,
  formatPayslipPeriodLabel,
  incomeEligibleAccounts,
  isRealIsoDate,
  payslipIncomeDescription,
  replacePayslipMessage,
  type PayslipReviewValues,
} from "../src/payslipReview";
import { replayEvents } from "../src/replay";
import { createAccountEvent } from "../src/accounts";
import type { StoredPayslip } from "../src/state";
import { EVENT_TYPES } from "../../events/src/types";
import type { AccountPayload, DomainEvent } from "../../events/src/types";

/**
 * Story 11.5: salvar o holerite revisado — vaga ocupada e eventos do salvar.
 * A validação do texto digitado fica em `src/modules/payslip/reviewDraft.ts`
 * (R4 da revisão), testada em `src/modules/payslip/__tests__/reviewDraft.test.ts`.
 */

const CNPJ_A = "11.222.333/0001-81";
const CNPJ_B = "11.444.777/0001-61";

function values(over: Partial<PayslipReviewValues> = {}): PayslipReviewValues {
  return {
    period: "2026-09",
    company: "ACME LTDA",
    grossSalary: 5000,
    netSalary: 4000,
    earnings: [],
    deductions: [{ name: "INSS", value: 600 }, { name: "IRRF", value: 400 }],
    source: "ocr",
    ...over,
  };
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

describe("R4: packages/domain não depende de packages/parsers", () => {
  it("nenhum arquivo de packages/domain/src importa o parser", () => {
    const dir = path.resolve(__dirname, "../src");
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith(".ts"))
      .filter((f) => /from\s+["'][^"']*parsers/.test(readFileSync(path.join(dir, f), "utf-8")));
    expect(offenders).toEqual([]);
  });
});

describe("rótulos", () => {
  it("formatPayslipPeriodLabel", () => {
    expect(formatPayslipPeriodLabel({ period: "2026-09" })).toBe("09/2026");
    expect(formatPayslipPeriodLabel({ period: "2026-12", kind: "thirteenth" })).toBe("13º salário 2026");
  });
});

describe("vaga ocupada (samePayslipSlot)", () => {
  const monthly = stored({ id: "m", period: "2026-12", cnpj: CNPJ_A });
  const thirteenth = stored({ id: "t", period: "2026-12", cnpj: CNPJ_A, kind: "thirteenth" });

  it("13º não ocupa a vaga do mensal de dezembro, e vice-versa", () => {
    expect(findPayslipsInSlot({ m: monthly }, { period: "2026-12", kind: "thirteenth", cnpj: CNPJ_A, company: "ACME LTDA" })).toEqual([]);
    expect(findPayslipsInSlot({ t: thirteenth }, { period: "2026-12", cnpj: CNPJ_A, company: "ACME LTDA" })).toEqual([]);
    expect(findPayslipsInSlot([monthly, thirteenth], { period: "2026-12", kind: "thirteenth", cnpj: CNPJ_A, company: "x" }).map((p) => p.id)).toEqual(["t"]);
  });

  it("CNPJ diferente é outro empregador, mesmo com o mesmo nome", () => {
    expect(findPayslipsInSlot({ m: monthly }, { period: "2026-12", cnpj: CNPJ_B, company: "ACME LTDA" })).toEqual([]);
  });

  it("sem CNPJ de um lado, compara o nome normalizado", () => {
    expect(findPayslipsInSlot({ m: monthly }, { period: "2026-12", company: "acme ltda." }).map((p) => p.id)).toEqual(["m"]);
    expect(findPayslipsInSlot({ m: monthly }, { period: "2026-11", company: "acme ltda." })).toEqual([]);
  });

  it("decisão 2a: receita começa desligada se a vaga já lançou receita", () => {
    expect(defaultLaunchIncome(true, [])).toBe(true);
    expect(defaultLaunchIncome(false, [])).toBe(false);
    expect(defaultLaunchIncome(true, [stored({ id: "x" })])).toBe(true);
    expect(defaultLaunchIncome(true, [stored({ id: "x", transactionId: "tx" })])).toBe(false);
  });

  // R3: salvar só com o nome casa com todos os holerites desse nome, de qualquer CNPJ.
  describe("R3: vários holerites na vaga", () => {
    const withA = stored({ id: "a", cnpj: CNPJ_A });
    const withB = stored({ id: "b", cnpj: CNPJ_B, transactionId: "tx-b" });
    const nameOnly = { period: "2026-09", company: "Acme Ltda" };

    it("findPayslipsInSlot devolve todos, como o reducer substitui todos", () => {
      expect(findPayslipsInSlot({ a: withA, b: withB }, nameOnly).map((p) => p.id).sort()).toEqual(["a", "b"]);
      const [ev] = buildPayslipSaveEvents(values({ company: "Acme Ltda" }));
      const acc = createAccountEvent({ name: "Banco", type: "checking", balance: 0 });
      const before = [acc, ...buildPayslipSaveEvents(values({ cnpj: CNPJ_A })), ...buildPayslipSaveEvents(values({ cnpj: CNPJ_B }))];
      const all = [...before, ev] as DomainEvent[];
      all.forEach((e, i) => (e.timestamp = 1000 + i));
      expect(Object.values(replayEvents(before as DomainEvent[]).payslips)).toHaveLength(2);
      expect(Object.keys(replayEvents(all).payslips)).toEqual([ev.payload.id]);
    });

    it("a receita começa desligada se qualquer um já lançou receita", () => {
      expect(defaultLaunchIncome(true, [withA, withB])).toBe(false);
      expect(defaultLaunchIncome(true, [withA])).toBe(true);
    });

    it("a confirmação lista todos e cita as receitas mantidas", () => {
      const msg = replacePayslipMessage([withA, withB]);
      expect(msg).toContain("Já existem 2 holerites nesta vaga");
      expect(msg).toContain(CNPJ_A);
      expect(msg).toContain(CNPJ_B);
      expect(msg).toContain("Todos serão substituídos pelo novo.");
      expect(msg).toContain("As receitas já lançadas pelos holerites anteriores continuam no extrato.");
    });
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
  const base = values({ cnpj: CNPJ_A });

  it("sem receita: só PAYSLIP_RECORDED, sem transactionId, id novo a cada salvar", () => {
    const [a, ...rest] = buildPayslipSaveEvents(base, { deviceId: "dev-a" });
    const [b] = buildPayslipSaveEvents(base, { deviceId: "dev-a" });
    expect(rest).toEqual([]);
    expect(a.type).toBe(EVENT_TYPES.PAYSLIP_RECORDED);
    expect(a.deviceId).toBe("dev-a");
    expect(a.payload.transactionId).toBeUndefined();
    expect(a.payload.id).not.toBe(b.payload.id);
    expect(a.payload).not.toHaveProperty("kind");
  });

  it("com receita: income/salario com o líquido, ligada ao holerite", () => {
    const events = buildPayslipSaveEvents(base, { income: { accountId: "acc", date: "2026-10-05" } });
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
      description: "Salário (09/2026)",
    });
    expect((payslip.payload as { transactionId?: string }).transactionId).toBe((tx.payload as { id: string }).id);
  });

  it("13º: kind no evento e descrição do 13º", () => {
    const v = values({ period: "2026-12", kind: "thirteenth", company: "", cnpj: CNPJ_A });
    const [p, tx] = buildPayslipSaveEvents(v, { income: { accountId: "acc", date: "2026-12-20" } });
    expect(p.payload.kind).toBe("thirteenth");
    expect(tx?.payload.description).toBe("13º salário (2026)");
    expect(payslipIncomeDescription({ period: "2026-12", kind: "thirteenth" })).toBe("13º salário (2026)");
  });

  it("nunca leva confidence, warnings, nome nem CPF", () => {
    const [p] = buildPayslipSaveEvents(base);
    expect(Object.keys(p.payload).sort()).toEqual(
      ["cnpj", "company", "deductions", "grossSalary", "id", "netSalary", "period", "source"].sort(),
    );
  });

  // R2: a descrição vai ao contexto da IA e ao Grupo; o empregador não.
  it("R2: descrição da receita sem o nome da empresa", () => {
    const [, tx] = buildPayslipSaveEvents(values({ company: "ACME COMERCIO LTDA" }), { income: { accountId: "acc", date: "2026-10-05" } });
    expect(tx?.payload.description).toBe("Salário (09/2026)");
    expect(JSON.stringify(tx?.payload)).not.toMatch(/ACME/i);
  });

  it("data da receita inválida ou conta vazia lança erro", () => {
    expect(() => buildPayslipSaveEvents(base, { income: { accountId: "acc", date: "05/10/2026" } })).toThrow();
    // R11: data que não existe no calendário.
    expect(() => buildPayslipSaveEvents(base, { income: { accountId: "acc", date: "2026-13-45" } })).toThrow();
    expect(() => buildPayslipSaveEvents(base, { income: { accountId: "acc", date: "2026-02-30" } })).toThrow();
    expect(() => buildPayslipSaveEvents(base, { income: { accountId: "", date: "2026-10-05" } })).toThrow();
  });

  it("replay: substitui pela vaga, mantém a receita anterior e soma o saldo", () => {
    const acc = createAccountEvent({ name: "Banco", type: "checking", balance: 1000 });
    const accountId = acc.payload.id;
    const first = buildPayslipSaveEvents(base, { income: { accountId, date: "2026-10-05" } });
    const second = buildPayslipSaveEvents(values({ cnpj: CNPJ_A, netSalary: 4100 }), {});
    const other = buildPayslipSaveEvents(values({ cnpj: CNPJ_B }), {});
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

describe("R11: data real e conta padrão da receita", () => {
  it("isRealIsoDate", () => {
    expect(isRealIsoDate("2026-10-05")).toBe(true);
    expect(isRealIsoDate("2028-02-29")).toBe(true);
    expect(isRealIsoDate("2026-02-29")).toBe(false);
    expect(isRealIsoDate("2026-13-45")).toBe(false);
    expect(isRealIsoDate("2026-04-31")).toBe(false);
    expect(isRealIsoDate("2026-00-10")).toBe(false);
    expect(isRealIsoDate("2026-1-5")).toBe(false);
  });

  function acc(id: string, type: AccountPayload["type"], over: Partial<AccountPayload> = {}): AccountPayload {
    return { id, name: id, type, balance: 0, ...over };
  }

  it("prefere a conta corrente a poupança com meta, CDB de cartão e carteira", () => {
    const goal = acc("meta", "savings", { savingsGoalEnabled: true });
    const cdb = acc("cdb", "savings", { linkedCreditCardId: "card" });
    const card = acc("card", "credit_card");
    const wallet = acc("wallet", "wallet");
    const checking = acc("checking", "checking");
    expect(defaultIncomeAccountId([goal, cdb, card, wallet, checking])).toBe("checking");
    expect(defaultIncomeAccountId([goal, cdb, card, wallet])).toBe("wallet");
    expect(defaultIncomeAccountId([goal, acc("poup", "savings"), cdb])).toBe("poup");
    expect(defaultIncomeAccountId([goal, card])).toBe("meta");
    expect(defaultIncomeAccountId([card])).toBe("");
    expect(incomeEligibleAccounts([card, wallet]).map((a) => a.id)).toEqual(["wallet"]);
  });
});
