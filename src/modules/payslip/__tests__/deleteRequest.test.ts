import { describe, it, expect, vi } from "vitest";
import { EVENT_TYPES } from "@packages/events";
import type { StoredPayslip } from "@packages/domain";
import type { AppConfirmParams } from "@/src/services/appAlert";
import { buildDeletePayslipRequest, createDeletePayslipFlow } from "../deleteRequest";

/** Story 11.6 (R2/R10 da revisão): exclusão do holerite fora da tela. */

function slip(over: Partial<StoredPayslip> = {}): StoredPayslip {
  return {
    id: "p1",
    period: "2026-09",
    company: "ACME LTDA",
    grossSalary: 5000,
    netSalary: 4000,
    deductions: [],
    recordedAt: 1,
    ...over,
  };
}

const RECEITA = "A receita “Salário (09/2026)” lançada por ele continua no extrato; exclua-a por lá, se quiser.";

describe("buildDeletePayslipRequest", () => {
  it("confirmação destrutiva e só PAYSLIP_DELETED, sem a frase da receita quando ela não existe", () => {
    const r = buildDeletePayslipRequest(slip({ transactionId: "t1" }), {}, "dev-1");
    expect(r.confirm).toEqual({
      title: "Excluir holerite?",
      message: "O holerite de 09/2026 de ACME LTDA sai do histórico, do gráfico e dos totais.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    expect(r.events).toHaveLength(1);
    expect(r.events[0]).toMatchObject({ type: EVENT_TYPES.PAYSLIP_DELETED, payload: { id: "p1" }, deviceId: "dev-1" });
  });

  it("receita que ainda existe: a mensagem a cita; nenhum evento mexe na receita", () => {
    const r = buildDeletePayslipRequest(slip({ transactionId: "t1" }), { t1: { id: "t1" } }, null);
    expect(r.confirm.message).toContain(RECEITA);
    expect(r.events.map((e) => e.type)).toEqual([EVENT_TYPES.PAYSLIP_DELETED]);
    expect(r.events[0]!.deviceId).toBe("local");
  });

  it("sem transactionId: sem a frase da receita", () => {
    expect(buildDeletePayslipRequest(slip(), { t1: {} }, "d").confirm.message).not.toContain("receita");
  });
});

function setup(confirmImpl: () => Promise<boolean>) {
  const dispatch = vi.fn();
  const onDeleted = vi.fn();
  const onError = vi.fn();
  const confirm = vi.fn<(params: AppConfirmParams) => Promise<boolean>>(confirmImpl);
  const run = createDeletePayslipFlow({
    getTransactions: () => ({ t1: {} }),
    getDeviceId: () => "dev-1",
    ask: confirm,
    dispatch,
    onDeleted,
    onError,
  });
  return { run, dispatch, onDeleted, onError, confirm };
}

describe("createDeletePayslipFlow", () => {
  it("confirmar despacha exatamente um PAYSLIP_DELETED", async () => {
    const f = setup(async () => true);
    await f.run(slip({ transactionId: "t1" }));
    expect(f.confirm).toHaveBeenCalledTimes(1);
    expect(f.confirm.mock.calls[0]![0].message).toContain(RECEITA);
    expect(f.dispatch).toHaveBeenCalledTimes(1);
    expect(f.dispatch.mock.calls[0]![0]).toMatchObject({ type: EVENT_TYPES.PAYSLIP_DELETED, payload: { id: "p1" } });
    expect(f.onDeleted).toHaveBeenCalledTimes(1);
    expect(f.onError).not.toHaveBeenCalled();
  });

  it("cancelar não despacha nada", async () => {
    const f = setup(async () => false);
    await f.run(slip());
    expect(f.dispatch).not.toHaveBeenCalled();
    expect(f.onDeleted).not.toHaveBeenCalled();
  });

  it("toque duplo abre uma confirmação só", async () => {
    let answer!: (v: boolean) => void;
    const f = setup(() => new Promise<boolean>((r) => (answer = r)));
    const first = f.run(slip());
    const second = f.run(slip());
    answer(true);
    await Promise.all([first, second]);
    expect(f.confirm).toHaveBeenCalledTimes(1);
    expect(f.dispatch).toHaveBeenCalledTimes(1);
  });

  it("R10: falha na confirmação ou no despacho vai para onError e libera a trava", async () => {
    const f = setup(async () => {
      throw new Error("host caiu");
    });
    await expect(f.run(slip())).resolves.toBeUndefined();
    expect(f.onError).toHaveBeenCalledTimes(1);
    expect(f.dispatch).not.toHaveBeenCalled();
    f.confirm.mockImplementation(async () => true);
    f.dispatch.mockImplementationOnce(() => {
      throw new Error("reducer");
    });
    await f.run(slip());
    expect(f.onError).toHaveBeenCalledTimes(2);
    expect(f.onDeleted).not.toHaveBeenCalled();
    await f.run(slip());
    expect(f.onDeleted).toHaveBeenCalledTimes(1);
  });
});
