import { describe, it, expect } from "vitest";
import { replayAllEvents } from "../replay";
import { appendDispatched } from "../localEventLog";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { buildPayslipSaveEvents, createAccountEvent } from "@packages/domain";
import { emptyPayslipDraft, validatePayslipDraft, type PayslipDraft } from "@/src/modules/payslip/reviewDraft";

/**
 * Story 11.5: tudo o que o salvar da revisão despacha passa no replay do app
 * (carimbo do `appendDispatched`, conferência do payload) sem Quarentena.
 */

const T0 = 1_792_627_200_000;

function draft(over: Partial<PayslipDraft> = {}): PayslipDraft {
  return {
    ...emptyPayslipDraft(),
    company: "ACME LTDA",
    cnpj: "11.222.333/0001-81",
    period: "09/2026",
    gross: "5.000,00",
    net: "4.000,00",
    deductions: [{ name: "INSS", value: 600 }],
    earnings: [{ name: "SALARIO", value: 5000 }],
    fgts: 400,
    source: "vision",
    ...over,
  };
}

function save(d: PayslipDraft, income?: { accountId: string; date: string }) {
  const r = validatePayslipDraft(d);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return buildPayslipSaveEvents(r.values, { income, deviceId: "dev-a" });
}

describe("replayAllEvents — salvar da revisão do holerite (Story 11.5)", () => {
  it("holerite, 13º e receita entram sem Quarentena; receita soma no saldo", () => {
    const acc = createAccountEvent({ name: "Banco", type: "checking", balance: 1000 }, "dev-a");
    const batch = [
      acc,
      ...save(draft(), { accountId: acc.payload.id, date: "2026-10-05" }),
      ...save(draft({ period: "13/2026", thirteenth: true }), { accountId: acc.payload.id, date: "2026-12-20" }),
      ...save(draft({ source: "manual", company: "", earnings: [], fgts: undefined, net: "4.100,00" })),
    ];
    let log: SyncEvent[] = [];
    batch.forEach((e, i) => {
      log = appendDispatched(log, { ...e, timestamp: T0 + i * 1000 } as unknown as SyncEvent, "dev-a").events;
    });
    const r = replayAllEvents(log, { now: T0 + 60_000, currentDeviceId: "dev-a" });
    expect(r.quarantine).toEqual([]);
    const slips = Object.values(r.domain.payslips);
    expect(slips).toHaveLength(2);
    expect(slips.find((p) => p.kind === "thirteenth")?.transactionId).toBeTruthy();
    expect(slips.find((p) => p.kind === undefined)?.netSalary).toBe(4100);
    expect(r.domain.accounts[acc.payload.id]?.balance).toBe(9000);
  });
});
