import { describe, it, expect } from "vitest";
import { replayAllEvents } from "../replay";
import { appendDispatched } from "../localEventLog";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import {
  buildPayslipHistory,
  buildPayslipSaveEvents,
  createAccountEvent,
  deletePayslipEvent,
  summarizePayslipHistory,
  type PayslipReviewValues,
} from "@packages/domain";

/**
 * Story 11.6: excluir um holerite que lançou receita tira o holerite do
 * histórico, mas a receita e o saldo ficam; tudo passa no replay sem Quarentena.
 */

const T0 = 1_792_627_200_000;

function values(over: Partial<PayslipReviewValues> = {}): PayslipReviewValues {
  return {
    period: "2026-09",
    company: "ACME LTDA",
    grossSalary: 5000,
    netSalary: 4000,
    earnings: [],
    deductions: [{ name: "INSS", value: 600 }],
    source: "manual",
    ...over,
  };
}

function replay(batch: readonly { type: string; payload: unknown }[]) {
  let log: SyncEvent[] = [];
  batch.forEach((e, i) => {
    log = appendDispatched(log, { ...e, timestamp: T0 + i * 1000 } as unknown as SyncEvent, "dev-a").events;
  });
  return replayAllEvents(log, { now: T0 + 600_000, currentDeviceId: "dev-a" });
}

describe("replayAllEvents — excluir holerite (Story 11.6)", () => {
  it("o holerite sai do resumo; a receita e o saldo ficam; sem Quarentena", () => {
    const acc = createAccountEvent({ name: "Banco", type: "checking", balance: 1000 }, "dev-a");
    const [aug] = buildPayslipSaveEvents(values({ period: "2026-08", netSalary: 3800 }), { deviceId: "dev-a" });
    const [sep, income] = buildPayslipSaveEvents(values(), {
      income: { accountId: acc.payload.id, date: "2026-10-05" },
      deviceId: "dev-a",
    });
    const saved = [acc, aug, sep, income!];

    const before = replay(saved);
    expect(before.quarantine).toEqual([]);
    expect(summarizePayslipHistory(buildPayslipHistory(before.domain.payslips))?.latest.net).toBe(4000);
    expect(before.domain.accounts[acc.payload.id]?.balance).toBe(5000);

    const after = replay([...saved, deletePayslipEvent(sep.payload.id, "dev-a")]);
    expect(after.quarantine).toEqual([]);
    expect(after.domain.payslips[sep.payload.id]).toBeUndefined();
    const summary = summarizePayslipHistory(buildPayslipHistory(after.domain.payslips));
    expect(summary?.latest.period).toBe("2026-08");
    expect(summary?.previous).toBeNull();
    expect(after.domain.transactions[income!.payload.id]).toBeDefined();
    expect(after.domain.accounts[acc.payload.id]?.balance).toBe(5000);
  });

  it("excluir o último holerite zera o histórico; regravar a mesma vaga gera id novo e volta", () => {
    const [first] = buildPayslipSaveEvents(values(), { deviceId: "dev-a" });
    const [again] = buildPayslipSaveEvents(values({ netSalary: 4100 }), { deviceId: "dev-a" });
    expect(again.payload.id).not.toBe(first.payload.id);

    const emptied = replay([first, deletePayslipEvent(first.payload.id, "dev-a")]);
    expect(buildPayslipHistory(emptied.domain.payslips)).toEqual([]);

    const back = replay([first, deletePayslipEvent(first.payload.id, "dev-a"), again]);
    expect(back.quarantine).toEqual([]);
    expect(summarizePayslipHistory(buildPayslipHistory(back.domain.payslips))?.latest.net).toBe(4100);
  });
});
