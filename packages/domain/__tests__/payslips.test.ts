import { describe, it, expect } from "vitest";
import { domainReducer, sameEmployer, normalizeCompany } from "../src/reducer";
import { replayEvents } from "../src/replay";
import { createInitialState } from "../src/state";
import type { AppState } from "../src/state";
import { recordPayslipEvent, deletePayslipEvent } from "../src/payslips";
import type { RecordPayslipParams } from "../src/payslips";
import { EVENT_TYPES } from "../../events/src/types";
import type { DomainEvent, PayslipPayload } from "../../events/src/types";

/**
 * Story 11.4: holerite como evento local — matriz pelo reducer.
 * Eventos montados à mão com timestamp crescente = ordem do replay.
 */

const CNPJ_X = "12.345.678/0001-90";
const CNPJ_Y = "98.765.432/0001-10";

let seq = 0;
function ev(type: DomainEvent["type"], payload: object): DomainEvent {
  seq += 1;
  return { id: `e-${seq}`, type, payload, timestamp: 1_000 + seq, deviceId: "dev-a", signature: "" } as DomainEvent;
}

function slip(over: Partial<PayslipPayload> & { id: string }): PayslipPayload {
  return {
    period: "2026-09",
    company: "ACME LTDA",
    cnpj: CNPJ_X,
    grossSalary: 5000,
    netSalary: 4000,
    deductions: [
      { name: "INSS", value: 600 },
      { name: "IRRF", value: 400 },
    ],
    source: "vision",
    ...over,
  };
}

const recorded = (p: object) => ev(EVENT_TYPES.PAYSLIP_RECORDED, p);
const deleted = (id: string) => ev(EVENT_TYPES.PAYSLIP_DELETED, { id });

function run(events: DomainEvent[], start: AppState = createInitialState()): AppState {
  return events.reduce(domainReducer, start);
}

/** Partes públicas do estado (sem o controle interno `outOfOrder`). */
function publicOf(state: AppState) {
  const { outOfOrder: _o, ...rest } = state;
  return rest;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as object)) deepFreeze(v);
  }
  return value;
}

describe("domainReducer — holerite (Story 11.4)", () => {
  it("registrar: guarda com recordedAt = timestamp, só os campos da lista", () => {
    const e = recorded(slip({ id: "p1", earnings: [{ name: "Salário", value: 5000 }], fgts: 400, transactionId: "t9" }));
    const s = run([e]);
    expect(s.payslips).toEqual({
      p1: {
        id: "p1",
        period: "2026-09",
        company: "ACME LTDA",
        cnpj: CNPJ_X,
        grossSalary: 5000,
        netSalary: 4000,
        deductions: [
          { name: "INSS", value: 600 },
          { name: "IRRF", value: 400 },
        ],
        earnings: [{ name: "Salário", value: 5000 }],
        fgts: 400,
        source: "vision",
        transactionId: "t9",
        recordedAt: e.timestamp,
      },
    });
  });

  it("payload com employee, CPF, confidence, warnings e schemaVersion: nada disso chega ao estado", () => {
    const s = run([
      recorded({
        ...slip({ id: "p1" }),
        employee: "Maria",
        cpf: "123.456.789-00",
        confidence: 0.9,
        warnings: ["x"],
        schemaVersion: 1,
        deductions: [{ name: "INSS", value: 600, employee: "Maria" }],
      }),
    ]);
    const p = s.payslips["p1"]!;
    expect(p).toBeDefined();
    for (const k of ["employee", "cpf", "confidence", "warnings", "schemaVersion"]) expect(p).not.toHaveProperty(k);
    expect(p.deductions).toEqual([{ name: "INSS", value: 600 }]);
    expect(JSON.stringify(s)).not.toContain("Maria");
  });

  it("opcionais ausentes não viram chaves undefined", () => {
    const s = run([recorded({ id: "p1", period: "2026-09", company: "", grossSalary: 1, netSalary: 1, deductions: [] })]);
    expect(Object.keys(s.payslips["p1"]!).sort()).toEqual(
      ["company", "deductions", "grossSalary", "id", "netSalary", "period", "recordedAt"].sort(),
    );
  });

  it("substituir por CNPJ (com e sem pontuação): só o último", () => {
    const s = run([recorded(slip({ id: "p1" })), recorded(slip({ id: "p2", cnpj: "12345678000190" }))]);
    expect(Object.keys(s.payslips)).toEqual(["p2"]);
  });

  it("CNPJs diferentes com o mesmo nome: os dois ficam", () => {
    const s = run([recorded(slip({ id: "p1" })), recorded(slip({ id: "p2", cnpj: CNPJ_Y }))]);
    expect(Object.keys(s.payslips).sort()).toEqual(["p1", "p2"]);
  });

  it("substituir por nome normalizado quando nenhum tem CNPJ", () => {
    const s = run([
      recorded(slip({ id: "p1", company: "Acme Ltda", cnpj: undefined })),
      recorded(slip({ id: "p2", company: " ACME  LTDA ", cnpj: undefined })),
    ]);
    expect(Object.keys(s.payslips)).toEqual(["p2"]);
  });

  it("nome com e sem acento é o mesmo empregador", () => {
    const s = run([
      recorded(slip({ id: "p1", company: "Padaria São João", cnpj: undefined })),
      recorded(slip({ id: "p2", company: "PADARIA SAO JOAO", cnpj: undefined })),
    ]);
    expect(Object.keys(s.payslips)).toEqual(["p2"]);
  });

  it("um com CNPJ e outro sem: compara pelo nome", () => {
    const s = run([recorded(slip({ id: "p1" })), recorded(slip({ id: "p2", cnpj: undefined }))]);
    expect(Object.keys(s.payslips)).toEqual(["p2"]);
  });

  it("competências diferentes do mesmo empregador: os dois ficam", () => {
    const s = run([recorded(slip({ id: "p1" })), recorded(slip({ id: "p2", period: "2026-10" }))]);
    expect(Object.keys(s.payslips).sort()).toEqual(["p1", "p2"]);
  });

  it("mesmo id regravado: atualiza o registro", () => {
    const s = run([recorded(slip({ id: "p1", netSalary: 3900 })), recorded(slip({ id: "p1", netSalary: 4100 }))]);
    expect(Object.keys(s.payslips)).toEqual(["p1"]);
    expect(s.payslips["p1"]!.netSalary).toBe(4100);
  });

  it("excluir: sai do estado", () => {
    const s = run([recorded(slip({ id: "p1" })), deleted("p1")]);
    expect(s.payslips).toEqual({});
  });

  it("id inexistente: nada visível muda, não lança", () => {
    const start = run([recorded(slip({ id: "p1" }))]);
    const s = run([deleted("p9")], start);
    expect(publicOf(s)).toEqual(publicOf(start));
  });

  it("excluir o substituído: só o substituto fica", () => {
    const s = run([recorded(slip({ id: "p1" })), recorded(slip({ id: "p2" })), deleted("p1")]);
    expect(Object.keys(s.payslips)).toEqual(["p2"]);
  });

  it("decisão 2a: exclusão antes do holerite — continua excluído (marca)", () => {
    const s = run([deleted("p1"), recorded(slip({ id: "p1" }))]);
    expect(s.payslips).toEqual({});
    expect(s.outOfOrder?.deletedPayslips).toEqual({ p1: true });
    // A marca não afeta outro holerite.
    const s2 = run([recorded(slip({ id: "p2", period: "2026-10" }))], s);
    expect(Object.keys(s2.payslips)).toEqual(["p2"]);
  });

  it("decisão 2a: exclusão normal também deixa a marca; regravar o id não o traz de volta", () => {
    const s = run([recorded(slip({ id: "p1" })), deleted("p1"), recorded(slip({ id: "p1", netSalary: 1 }))]);
    expect(s.payslips).toEqual({});
  });

  it("holerite excluído pela marca não substitui outro do mesmo empregador", () => {
    const s = run([deleted("p2"), recorded(slip({ id: "p1" })), recorded(slip({ id: "p2" }))]);
    expect(Object.keys(s.payslips)).toEqual(["p1"]);
  });

  it("id '__proto__'/'constructor' não toca o protótipo", () => {
    const s = run([recorded(slip({ id: "__proto__" })), recorded(slip({ id: "constructor", period: "2026-10" }))]);
    expect(Object.keys(s.payslips).sort()).toEqual(["__proto__", "constructor"]);
    expect(Object.getPrototypeOf(s.payslips)).toBe(Object.prototype);
    const d = run([deleted("toString")], s);
    expect(Object.keys(d.payslips).sort()).toEqual(["__proto__", "constructor"]);
  });

  it("não altera a entrada (estado e evento congelados)", () => {
    const start = deepFreeze(run([recorded(slip({ id: "p1" }))]));
    const e = deepFreeze(recorded(slip({ id: "p2" })));
    expect(() => run([e, deleted("p2"), deleted("p9")], start)).not.toThrow();
  });

  it("sem efeito em contas, lançamentos, categorias e notas", () => {
    const base: DomainEvent[] = [
      ev(EVENT_TYPES.ACCOUNT_CREATED, { id: "a1", name: "Banco", type: "checking", balance: 1000 }),
      ev(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "t1", accountId: "a1", type: "income", amount: 4000, categoryId: "salario", date: "2026-09-30",
      }),
      ev(EVENT_TYPES.CATEGORY_CREATED, { id: "salario", name: "Salário", group: "needs" }),
    ];
    const withSlips = [
      base[0]!,
      recorded(slip({ id: "p1", transactionId: "t1" })),
      base[1]!,
      recorded(slip({ id: "p2" })),
      deleted("p2"),
      base[2]!,
      deleted("p9"),
    ];
    const a = run(base);
    const b = run(withSlips);
    expect(b.accounts).toEqual(a.accounts);
    expect(b.transactions).toEqual(a.transactions);
    expect(b.categories).toEqual(a.categories);
    expect(b.invoices).toEqual(a.invoices);
    expect(b.accounts["a1"]!.balance).toBe(5000);
    // Excluir o holerite não apaga a receita.
    const c = run([deleted("p1")], b);
    expect(c.transactions["t1"]).toBeDefined();
  });
});

describe("sameEmployer / normalizeCompany", () => {
  it("CNPJ dos dois: dígitos iguais", () => {
    expect(sameEmployer({ cnpj: CNPJ_X, company: "A" }, { cnpj: "12345678000190", company: "B" })).toBe(true);
    expect(sameEmployer({ cnpj: CNPJ_X, company: "A" }, { cnpj: CNPJ_Y, company: "A" })).toBe(false);
  });

  it("CNPJ incompleto conta como ausente (compara o nome)", () => {
    expect(sameEmployer({ cnpj: "123", company: "Acme" }, { cnpj: CNPJ_X, company: "acme" })).toBe(true);
  });

  it("normaliza pontas, caixa, acentos e espaços repetidos", () => {
    expect(normalizeCompany("  Ação   Ltda ")).toBe("acao ltda");
  });
});

describe("criadores (recordPayslipEvent / deletePayslipEvent)", () => {
  const params = (over: Partial<RecordPayslipParams> = {}): RecordPayslipParams => ({
    period: "2026-09",
    company: "ACME LTDA",
    cnpj: CNPJ_X,
    grossSalary: 1234.567,
    netSalary: 1000.004,
    deductions: [{ name: "INSS", value: 100.555 }],
    ...over,
  });

  it("monta o evento com id gerado e arredonda a 2 casas", () => {
    const e = recordPayslipEvent(params({ earnings: [{ name: "Salário", value: 1234.567 }], fgts: 98.765 }), "dev-x");
    expect(e.type).toBe(EVENT_TYPES.PAYSLIP_RECORDED);
    expect(e.deviceId).toBe("dev-x");
    expect(typeof e.id).toBe("string");
    expect(e.payload.id).toEqual(expect.any(String));
    expect(e.payload.id).not.toBe(e.id);
    expect(e.payload.grossSalary).toBe(1234.57);
    expect(e.payload.netSalary).toBe(1000);
    expect(e.payload.deductions).toEqual([{ name: "INSS", value: 100.56 }]);
    expect(e.payload.earnings).toEqual([{ name: "Salário", value: 1234.57 }]);
    expect(e.payload.fgts).toBe(98.77);
  });

  it("mantém o id informado (regravar)", () => {
    expect(recordPayslipEvent(params({ id: "p1" })).payload.id).toBe("p1");
  });

  it("competência inválida lança erro", () => {
    for (const period of ["2026-13", "09/2026", "2026-00", "2026-9", "", "2026-09-01"]) {
      expect(() => recordPayslipEvent(params({ period }))).toThrow();
    }
    expect(() => recordPayslipEvent(params({ period: "2026-12" }))).not.toThrow();
  });

  it("valor não finito lança erro", () => {
    expect(() => recordPayslipEvent(params({ netSalary: Number.NaN }))).toThrow();
  });

  it("só os campos da lista: employee/confidence/warnings do parser não entram", () => {
    const fromParser = { ...params(), employee: "Maria", confidence: 0.8, warnings: ["x"] } as RecordPayslipParams;
    const e = recordPayslipEvent(fromParser);
    expect(Object.keys(e.payload).sort()).toEqual(
      ["cnpj", "company", "deductions", "grossSalary", "id", "netSalary", "period"].sort(),
    );
  });

  it("CNPJ vazio é omitido", () => {
    expect(recordPayslipEvent(params({ cnpj: "  " })).payload).not.toHaveProperty("cnpj");
  });

  it("deletePayslipEvent", () => {
    const e = deletePayslipEvent("p1");
    expect(e.type).toBe(EVENT_TYPES.PAYSLIP_DELETED);
    expect(e.payload).toEqual({ id: "p1" });
  });

  it("criador + reducer: ponta a ponta", () => {
    const s = replayEvents([recordPayslipEvent(params({ id: "p1" }))]);
    expect(s.payslips["p1"]!.grossSalary).toBe(1234.57);
  });
});
