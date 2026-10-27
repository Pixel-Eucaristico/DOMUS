import { deletePayslipEvent, deletePayslipMessage, type StoredPayslip } from "@packages/domain";
import type { AppConfirmParams } from "@/src/services/appAlert";
import { createSingleFlight } from "./singleFlight";

/**
 * Story 11.6 (R2/R10 da revisão): a exclusão de holerite fora da tela, para ser
 * testada no vitest (sem `react-native`). A receita lançada nunca é apagada: o
 * único evento é `PAYSLIP_DELETED`.
 */

export type PayslipDeletedEvent = ReturnType<typeof deletePayslipEvent>;

export interface DeletePayslipRequest {
  confirm: AppConfirmParams;
  events: [PayslipDeletedEvent];
}

/** Confirmação e eventos da exclusão; a mensagem cita a receita só se ela ainda existe. */
export function buildDeletePayslipRequest(
  p: StoredPayslip,
  transactions: Readonly<Record<string, unknown>>,
  deviceId: string | null | undefined,
): DeletePayslipRequest {
  const incomeStillExists = !!p.transactionId && !!transactions[p.transactionId];
  return {
    confirm: {
      title: "Excluir holerite?",
      message: deletePayslipMessage(p, incomeStillExists),
      confirmLabel: "Excluir",
      destructive: true,
    },
    events: [deletePayslipEvent(p.id, deviceId ?? "local")],
  };
}

export interface DeletePayslipFlowDeps {
  /** Lidos na hora do toque (o extrato pode ter mudado desde o render). */
  getTransactions: () => Readonly<Record<string, unknown>>;
  getDeviceId: () => string | null | undefined;
  ask: (params: AppConfirmParams) => Promise<boolean>;
  dispatch: (event: PayslipDeletedEvent) => void;
  /** Depois de despachar (som de sucesso). */
  onDeleted?: () => void;
  /** Falha ao montar, confirmar ou despachar (R10): a tela avisa com `appAlert`. */
  onError: (err: unknown) => void;
}

/**
 * Excluir com trava: o toque duplo abre uma confirmação só. Cancelar não
 * despacha nada; confirmar despacha exatamente `[PAYSLIP_DELETED]`.
 */
export function createDeletePayslipFlow(deps: DeletePayslipFlowDeps): (p: StoredPayslip) => Promise<void> {
  const flight = createSingleFlight();
  return async (p) => {
    await flight.run(async () => {
      try {
        const request = buildDeletePayslipRequest(p, deps.getTransactions(), deps.getDeviceId());
        if (!(await deps.ask(request.confirm))) return;
        for (const event of request.events) deps.dispatch(event);
        deps.onDeleted?.();
      } catch (err) {
        deps.onError(err);
      }
    });
  };
}
