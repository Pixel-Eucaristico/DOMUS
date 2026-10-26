import type {
  PayslipPayload,
  PayslipLinePayload,
  PayslipSource,
  PayslipRecordedEvent,
  PayslipDeletedEvent,
} from "../../events/src/types";
import { EVENT_TYPES } from "../../events/src/types";
import { createEvent, generateId } from "../../events/src/factory";

/**
 * Story 11.4: criadores puros dos eventos de holerite. Só montam o evento; quem
 * despacha é a tela (Story 11.5). Ids só por `generateId`/`createEvent` (AD-3);
 * valores monetários arredondados a 2 casas (AD-7). Campos fora da lista (nome
 * do funcionário, CPF, `confidence`, `warnings` do parser) nunca entram.
 */

/** Competência `YYYY-MM` com mês 01–12. */
export const PAYSLIP_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface RecordPayslipParams {
  /** Id de um holerite já gravado, para regravá-lo; ausente = novo id. */
  id?: string;
  period: string;
  company: string;
  cnpj?: string;
  grossSalary: number;
  netSalary: number;
  deductions: readonly PayslipLinePayload[];
  earnings?: readonly PayslipLinePayload[];
  fgts?: number;
  source?: PayslipSource;
  transactionId?: string;
}

function roundMoney(value: number, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Holerite: valor inválido em ${field}`);
  }
  return Math.round(value * 100) / 100;
}

function lines(list: readonly PayslipLinePayload[], field: string): PayslipLinePayload[] {
  return list.map((l, i) => ({ name: l.name, value: roundMoney(l.value, `${field}[${i}].value`) }));
}

export function recordPayslipEvent(
  params: RecordPayslipParams,
  deviceId: string = "local",
): PayslipRecordedEvent {
  if (typeof params.period !== "string" || !PAYSLIP_PERIOD_PATTERN.test(params.period)) {
    throw new Error("Holerite: competência inválida (use AAAA-MM)");
  }
  const payload: PayslipPayload = {
    id: params.id ?? generateId(),
    period: params.period,
    company: params.company.trim(),
    grossSalary: roundMoney(params.grossSalary, "grossSalary"),
    netSalary: roundMoney(params.netSalary, "netSalary"),
    deductions: lines(params.deductions, "deductions"),
  };
  const cnpj = params.cnpj?.trim();
  if (cnpj) payload.cnpj = cnpj;
  if (params.earnings !== undefined) payload.earnings = lines(params.earnings, "earnings");
  if (params.fgts !== undefined) payload.fgts = roundMoney(params.fgts, "fgts");
  if (params.source !== undefined) payload.source = params.source;
  if (params.transactionId !== undefined) payload.transactionId = params.transactionId;
  return createEvent<PayslipRecordedEvent>(EVENT_TYPES.PAYSLIP_RECORDED, payload, deviceId);
}

export function deletePayslipEvent(id: string, deviceId: string = "local"): PayslipDeletedEvent {
  return createEvent<PayslipDeletedEvent>(EVENT_TYPES.PAYSLIP_DELETED, { id }, deviceId);
}
