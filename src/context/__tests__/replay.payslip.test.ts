import { describe, it, expect } from "vitest";
import {
  replayAllEvents,
  KNOWN_EVENT_TYPES,
  FUTURE_SCHEMA_VERSION_REASON,
  UNKNOWN_TYPE_REASON,
  type ReplayOptions,
} from "../replay";
import { appendDispatched, buildExportEvents, prepareBackupForStorage } from "../localEventLog";
import { validatePayload } from "../replayValidation";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { EVENT_TYPES } from "@packages/events/src/types";
import { recordPayslipEvent, deletePayslipEvent } from "@packages/domain/src/payslips";

/**
 * Story 11.4: `PAYSLIP_*` no replay do app — roteamento ao `domainReducer`,
 * carimbo `schemaVersion: 1` no `appendDispatched`, conferência do payload,
 * versão futura, tipo desconhecido (Story 3.3) e saldo intacto.
 */

const T0 = 1_792_627_200_000; // 2026-10-22, em ms
let seq = 0;
function ev(type: string, payload: unknown, id = `e-${++seq}`, ts?: number): SyncEvent {
  return {
    id,
    type,
    payload: payload as object,
    timestamp: ts ?? T0 + ++seq * 1000,
    deviceId: "dev-a",
    signature: "",
  } as SyncEvent;
}

const slip = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  period: "2026-09",
  company: "ACME LTDA",
  cnpj: "12.345.678/0001-90",
  grossSalary: 5000,
  netSalary: 4000,
  deductions: [{ name: "INSS", value: 600 }],
  source: "vision",
  schemaVersion: 1,
  ...over,
});

const account = ev("ACCOUNT_CREATED", { id: "a1", name: "Banco", type: "checking", balance: 1000 }, "acc");
const income = ev(
  "TRANSACTION_CREATED",
  { id: "t1", accountId: "a1", type: "income", amount: 4000, categoryId: "salario", date: "2026-09-30" },
  "t1",
);

function stateOf(result: ReturnType<typeof replayAllEvents>) {
  const { quarantine: _q, ...state } = result;
  return state;
}

describe("replayAllEvents — holerite (Story 11.4)", () => {
  it("os dois tipos são conhecidos e roteados ao domínio; schemaVersion fora do estado", () => {
    expect(KNOWN_EVENT_TYPES.has("PAYSLIP_RECORDED")).toBe(true);
    expect(KNOWN_EVENT_TYPES.has("PAYSLIP_DELETED")).toBe(true);
    const e = ev("PAYSLIP_RECORDED", slip({ employee: "Maria", profileId: "perfil-1" }), "r1");
    const r = replayAllEvents([e]);
    expect(r.quarantine).toEqual([]);
    const p = r.domain.payslips["p1"]!;
    expect(p).toMatchObject({ id: "p1", period: "2026-09", netSalary: 4000, recordedAt: e.timestamp });
    for (const k of ["schemaVersion", "profileId", "employee"]) expect(p).not.toHaveProperty(k);
  });

  it("appendDispatched carimba schemaVersion: 1; o replay aplica e tira o carimbo", () => {
    const created = recordPayslipEvent({
      period: "2026-09",
      company: "ACME",
      grossSalary: 5000,
      netSalary: 4000,
      deductions: [],
    }) as unknown as SyncEvent;
    expect(created.payload).not.toHaveProperty("schemaVersion");
    const { event, events, added } = appendDispatched([], created, "dev-a");
    expect(added).toBe(true);
    expect(event.payload).toMatchObject({ schemaVersion: 1 });
    expect(created.payload).not.toHaveProperty("schemaVersion");

    const del = appendDispatched(events, deletePayslipEvent("outro") as unknown as SyncEvent, "dev-a");
    expect(del.event.payload).toEqual({ id: "outro", schemaVersion: 1 });

    const r = replayAllEvents(events);
    expect(r.quarantine).toEqual([]);
    const id = (created.payload as { id: string }).id;
    expect(r.domain.payslips[id]).toBeDefined();
    expect(r.domain.payslips[id]).not.toHaveProperty("schemaVersion");
  });

  it("payload sem period → Quarentena invalid_payload nomeando o campo", () => {
    const { period: _p, ...noPeriod } = slip();
    const r = replayAllEvents([ev("PAYSLIP_RECORDED", noPeriod, "sem-period")]);
    expect(r.quarantine).toHaveLength(1);
    expect(r.quarantine[0]).toMatchObject({ id: "sem-period", kind: "invalid_payload" });
    expect(r.quarantine[0]!.reason).toContain('"period"');
    expect(r.domain.payslips).toEqual({});
  });

  it("deductions não array (ou linha sem valor) → Quarentena invalid_payload", () => {
    const r = replayAllEvents([
      ev("PAYSLIP_RECORDED", slip({ deductions: "INSS" }), "ded-texto"),
      ev("PAYSLIP_RECORDED", slip({ id: "p2", deductions: [{ name: "INSS" }] }), "ded-linha"),
    ]);
    expect(r.quarantine.map((q) => [q.id, q.kind])).toEqual([
      ["ded-texto", "invalid_payload"],
      ["ded-linha", "invalid_payload"],
    ]);
    expect(r.quarantine[0]!.reason).toContain('"deductions"');
    expect(r.quarantine[1]!.reason).toContain('"deductions[0].value"');
  });

  it("PAYLOAD_SPECS: company vazia é válida; PAYSLIP_DELETED exige id", () => {
    expect(validatePayload("PAYSLIP_RECORDED", slip({ company: "" }))).toBeNull();
    expect(validatePayload("PAYSLIP_RECORDED", slip({ earnings: [{ name: "x", value: "1" }] }))).toBe("earnings[0].value");
    expect(validatePayload("PAYSLIP_DELETED", {})).toBe("id");
  });

  it("schemaVersion: 2 → Quarentena future_schema_version", () => {
    const r = replayAllEvents([ev("PAYSLIP_RECORDED", slip({ schemaVersion: 2 }), "v2")]);
    expect(r.quarantine).toEqual([
      { id: "v2", type: "PAYSLIP_RECORDED", kind: "future_schema_version", reason: FUTURE_SCHEMA_VERSION_REASON },
    ]);
    expect(r.domain.payslips).toEqual({});
  });

  it("versão que não conhece o tipo → unknown_type; depois da atualização, aplicado", () => {
    const OLD: ReplayOptions = {
      knownTypes: new Set([...KNOWN_EVENT_TYPES].filter((t) => !t.startsWith("PAYSLIP_"))),
    };
    const log = [account, ev("PAYSLIP_RECORDED", slip(), "rec"), ev("PAYSLIP_DELETED", { id: "p9", schemaVersion: 1 }, "del")];
    const old = replayAllEvents(log, OLD);
    expect(old.quarantine).toEqual([
      { id: "rec", type: "PAYSLIP_RECORDED", kind: "unknown_type", reason: UNKNOWN_TYPE_REASON },
      { id: "del", type: "PAYSLIP_DELETED", kind: "unknown_type", reason: UNKNOWN_TYPE_REASON },
    ]);
    expect(old.domain.payslips).toEqual({});

    const updated = replayAllEvents(log);
    expect(updated.quarantine).toEqual([]);
    expect(Object.keys(updated.domain.payslips)).toEqual(["p1"]);
  });

  it("id inexistente: sem Quarentena e sem mudança visível", () => {
    const base = [account, ev("PAYSLIP_RECORDED", slip(), "rec")];
    const a = replayAllEvents(base);
    const b = replayAllEvents([...base, ev("PAYSLIP_DELETED", { id: "p9", schemaVersion: 1 }, "del")]);
    expect(b.quarantine).toEqual([]);
    expect(b.domain.payslips).toEqual(a.domain.payslips);
    expect(b.domain.accounts).toEqual(a.domain.accounts);
  });

  it("exclusão com timestamp menor que o holerite (decisão 2a): não reaparece", () => {
    const r = replayAllEvents([
      ev("PAYSLIP_RECORDED", slip(), "rec", T0 + 10_000),
      ev("PAYSLIP_DELETED", { id: "p1", schemaVersion: 1 }, "del", T0 + 5_000),
    ]);
    expect(r.quarantine).toEqual([]);
    expect(r.domain.payslips).toEqual({});
  });

  it("substituição: o último na ordem total vence, em qualquer ordem de chegada", () => {
    const log = [
      ev("PAYSLIP_RECORDED", slip({ id: "p1", netSalary: 3900 }), "r1"),
      ev("PAYSLIP_RECORDED", slip({ id: "p2", cnpj: "12345678000190" }), "r2"),
      ev("PAYSLIP_RECORDED", slip({ id: "p3", period: "2026-10" }), "r3"),
      ev("PAYSLIP_DELETED", { id: "p3", schemaVersion: 1 }, "d3"),
    ];
    const a = replayAllEvents(log);
    const b = replayAllEvents([...log].reverse());
    expect(Object.keys(a.domain.payslips)).toEqual(["p2"]);
    expect(stateOf(b)).toEqual(stateOf(a));
  });

  it("contas, lançamentos e saldos iguais aos do log sem PAYSLIP_*", () => {
    const withSlips = [
      account,
      ev("PAYSLIP_RECORDED", slip({ transactionId: "t1" }), "rec"),
      income,
      ev("PAYSLIP_RECORDED", slip({ id: "p2" }), "rec2"),
      ev("PAYSLIP_DELETED", { id: "p2", schemaVersion: 1 }, "del2"),
      ev("PAYSLIP_DELETED", { id: "p1", schemaVersion: 1 }, "del1"),
    ];
    const a = replayAllEvents([account, income]);
    const b = replayAllEvents(withSlips);
    expect(b.quarantine).toEqual([]);
    expect(b.domain.accounts).toEqual(a.domain.accounts);
    expect(b.domain.transactions).toEqual(a.domain.transactions);
    expect(b.domain.categories).toEqual(a.domain.categories);
    expect(b.domain.invoices).toEqual(a.domain.invoices);
    expect(b.domain.accounts["a1"]!.balance).toBe(5000);
    expect(b.gamification).toEqual(a.gamification);
    expect(b.season).toEqual(a.season);
    expect(b.onboarding).toEqual(a.onboarding);
    expect(b.wishlist).toEqual(a.wishlist);
  });

  it("decisão 1a: backup exporta e restaura PAYSLIP_* sem mudança", () => {
    const log = [account, ev("PAYSLIP_RECORDED", slip(), "rec"), ev("PAYSLIP_DELETED", { id: "p9", schemaVersion: 1 }, "del")];
    const exported = buildExportEvents(log, "dev-a");
    expect(exported.map((e) => e.id)).toEqual(["acc", "rec", "del"]);
    const restored = prepareBackupForStorage(JSON.parse(JSON.stringify(exported)), "dev-b").events;
    expect(restored.map((e) => e.type)).toEqual(["ACCOUNT_CREATED", "PAYSLIP_RECORDED", "PAYSLIP_DELETED"]);
    expect(Object.keys(replayAllEvents(restored).domain.payslips)).toEqual(["p1"]);
  });

  it("EVENT_TYPES tem os dois tipos em UPPER_SNAKE", () => {
    expect(EVENT_TYPES.PAYSLIP_RECORDED).toBe("PAYSLIP_RECORDED");
    expect(EVENT_TYPES.PAYSLIP_DELETED).toBe("PAYSLIP_DELETED");
  });

  // ─── Revisão da Story 11.4 (Review Triage Log) ─────────────────────────────

  it("R2/R11: toda saída do criador passa no validatePayload e no replay sem Quarentena; entrada ruim lança Error claro", () => {
    const base = { period: "2026-09", company: "ACME", grossSalary: 5000, netSalary: 4000, deductions: [] };
    const inputs: unknown[] = [
      base,
      { ...base, company: "", cnpj: "  " },
      { ...base, cnpj: "12.ABC.345/01DE-35", kind: "thirteenth", source: "manual", transactionId: "t1" },
      { ...base, kind: "monthly", earnings: [{ name: " Salário ", value: 5000.001 }], fgts: 400 },
      { ...base, grossSalary: -10, netSalary: -10, deductions: [{ name: "Estorno", value: -5 }] },
      // Entradas ruins: o criador lança em vez de gerar evento que o replay recusaria.
      { ...base, deductions: [{ value: 1 }] },
      { ...base, earnings: [{ name: null, value: 1 }] },
      { ...base, company: undefined },
      { ...base, source: "pdf" },
      { ...base, kind: "decimo" },
      { ...base, id: "" },
    ];
    let created = 0;
    let rejected = 0;
    const log: SyncEvent[] = [];
    for (const input of inputs) {
      let e: SyncEvent;
      try {
        e = recordPayslipEvent(input as Parameters<typeof recordPayslipEvent>[0]) as unknown as SyncEvent;
      } catch (err) {
        expect(err).not.toBeInstanceOf(TypeError);
        expect((err as Error).message).toMatch(/^Holerite: /);
        rejected++;
        continue;
      }
      created++;
      expect(validatePayload("PAYSLIP_RECORDED", e.payload as Record<string, unknown>)).toBeNull();
      log.push(appendDispatched(log, e, "dev-a").event);
    }
    expect([created, rejected]).toEqual([5, 6]);
    const del = deletePayslipEvent("p-x") as unknown as SyncEvent;
    expect(validatePayload("PAYSLIP_DELETED", del.payload as Record<string, unknown>)).toBeNull();
    log.push(appendDispatched(log, del, "dev-a").event);
    expect(replayAllEvents(log).quarantine).toEqual([]);
  });

  it("R4: id vazio, period fora de AAAA-MM, source e kind desconhecidos → Quarentena nomeando o campo", () => {
    const cases: [string, Record<string, unknown>, string][] = [
      ["id-vazio", slip({ id: "" }), "id"],
      ["id-espacos", slip({ id: "   " }), "id"],
      ["period-lixo", slip({ period: "lixo" }), "period"],
      ["period-13", slip({ period: "2026-13" }), "period"],
      ["source-x", slip({ source: "pdf" }), "source"],
      ["kind-x", slip({ kind: "decimo" }), "kind"],
    ];
    const r = replayAllEvents(cases.map(([id, payload]) => ev("PAYSLIP_RECORDED", payload, id)));
    expect(r.quarantine.map((q) => [q.id, q.kind])).toEqual(cases.map(([id]) => [id, "invalid_payload"]));
    cases.forEach(([, , field], i) => expect(r.quarantine[i]!.reason).toContain(`"${field}"`));
    expect(r.domain.payslips).toEqual({});
    const d = replayAllEvents([ev("PAYSLIP_DELETED", { id: "", schemaVersion: 1 }, "del-vazio")]);
    expect(d.quarantine.map((q) => [q.id, q.kind])).toEqual([["del-vazio", "invalid_payload"]]);
  });

  it("R4: valores negativos (descontos/estornos), kind válido e source conhecido são aceitos", () => {
    const r = replayAllEvents([
      ev("PAYSLIP_RECORDED", slip({ grossSalary: -1, netSalary: -2, deductions: [{ name: "Estorno", value: -3 }] }), "neg"),
      ev("PAYSLIP_RECORDED", slip({ id: "p13", period: "2026-12", kind: "thirteenth", source: "manual" }), "k13"),
      ev("PAYSLIP_RECORDED", slip({ id: "pm", period: "2026-11", kind: "monthly", source: "ocr" }), "km"),
    ]);
    expect(r.quarantine).toEqual([]);
    expect(Object.keys(r.domain.payslips).sort()).toEqual(["p1", "p13", "pm"]);
  });

  it("R4: specs antigas mantêm o comportamento (texto vazio continua aceito onde já era)", () => {
    expect(validatePayload("ACCOUNT_DELETED", { id: "" })).toBeNull();
    expect(validatePayload("STREAK_UPDATED", { currentStreak: 1, longestStreak: 1, lastActiveDate: "" })).toBeNull();
  });

  it("R10: timestamp empatado — o desempate da ordem total decide, em qualquer ordem de chegada", () => {
    const at = T0 + 999_000;
    const fromA = { ...ev("PAYSLIP_RECORDED", slip({ id: "pa", netSalary: 1 }), "r-a", at), deviceId: "dev-a" };
    const fromB = { ...ev("PAYSLIP_RECORDED", slip({ id: "pb", netSalary: 2 }), "r-b", at), deviceId: "dev-b" };
    const one = replayAllEvents([fromA, fromB]);
    const two = replayAllEvents([fromB, fromA]);
    // (timestamp, deviceId, id): "dev-b" vem depois de "dev-a" e substitui.
    expect(Object.keys(one.domain.payslips)).toEqual(["pb"]);
    expect(stateOf(two)).toEqual(stateOf(one));
  });
});
