import type {
  PayslipPayload,
  PayslipLinePayload,
  PayslipSource,
  PayslipKind,
  PayslipRecordedEvent,
  PayslipDeletedEvent,
} from "../../events/src/types";
import { EVENT_TYPES, PAYSLIP_SOURCES, PAYSLIP_KINDS } from "../../events/src/types";

export { PAYSLIP_SOURCES, PAYSLIP_KINDS };
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
  /**
   * `"thirteenth"` para o holerite do 13º salário (o parser marca
   * `thirteenth: true`); ausente ou `"monthly"` = mensal.
   */
  kind?: PayslipKind;
  transactionId?: string;
}

function roundMoney(value: number, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Holerite: valor inválido em ${field}`);
  }
  return Math.round(value * 100) / 100;
}

function fail(message: string): never {
  throw new Error(`Holerite: ${message}`);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Linhas `{name, value}`: `name` texto (aparado), `value` finito arredondado.
 * Toda saída passa no `PAYLOAD_SPECS` do replay (revisão R2).
 */
function lines(list: unknown, field: string): PayslipLinePayload[] {
  if (!Array.isArray(list)) fail(`${field} precisa ser uma lista`);
  return list.map((l: unknown, i: number) => {
    const line = (typeof l === "object" && l !== null ? l : {}) as Partial<PayslipLinePayload>;
    if (typeof line.name !== "string") fail(`${field}[${i}].name precisa ser texto`);
    return { name: line.name.trim(), value: roundMoney(line.value as number, `${field}[${i}].value`) };
  });
}

export function recordPayslipEvent(
  params: RecordPayslipParams,
  deviceId: string = "local",
): PayslipRecordedEvent {
  if (typeof params.period !== "string" || !PAYSLIP_PERIOD_PATTERN.test(params.period)) {
    fail("competência inválida (use AAAA-MM)");
  }
  if (typeof params.company !== "string") fail("empresa precisa ser texto");
  if (params.id !== undefined && !isNonEmptyString(params.id)) fail("id vazio");
  if (params.cnpj !== undefined && params.cnpj !== null && typeof params.cnpj !== "string") {
    fail("CNPJ precisa ser texto");
  }
  if (params.source !== undefined && !PAYSLIP_SOURCES.includes(params.source)) fail("origem desconhecida");
  if (params.kind !== undefined && !PAYSLIP_KINDS.includes(params.kind)) fail("tipo desconhecido");
  if (params.transactionId !== undefined && !isNonEmptyString(params.transactionId)) {
    fail("transactionId vazio");
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
  // Mensal é o padrão: só o 13º leva `kind` no payload (ausente = mensal).
  if (params.kind === "thirteenth") payload.kind = "thirteenth";
  if (params.transactionId !== undefined) payload.transactionId = params.transactionId;
  return createEvent<PayslipRecordedEvent>(EVENT_TYPES.PAYSLIP_RECORDED, payload, deviceId);
}

export function deletePayslipEvent(id: string, deviceId: string = "local"): PayslipDeletedEvent {
  if (!isNonEmptyString(id)) fail("id vazio");
  return createEvent<PayslipDeletedEvent>(EVENT_TYPES.PAYSLIP_DELETED, { id }, deviceId);
}
