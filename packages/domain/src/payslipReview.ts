import type {
  PayslipLinePayload,
  PayslipSource,
  PayslipRecordedEvent,
  TransactionCreatedEvent,
} from "../../events/src/types";
import {
  normalizeCnpj,
  normalizePayslipPeriod,
  parseBRL,
} from "../../parsers/src/payslipParser";
import type { PayslipParseResult } from "../../parsers/src/payslipParser";
import { recordPayslipEvent, PAYSLIP_PERIOD_PATTERN } from "./payslips";
import { createTransactionEvent } from "./transactions";
import { normalizeCompany, samePayslipSlot } from "./reducer";
import type { StoredPayslip } from "./state";

/**
 * Story 11.5: revisão do holerite antes de salvar. Puro (AD-3): sem `Date.now`,
 * ids só pelos criadores (`recordPayslipEvent`, `createTransactionEvent`); a
 * data da receita entra como parâmetro. A tela só liga estas peças.
 */

/** Categoria da receita lançada a partir do holerite. */
export const PAYSLIP_INCOME_CATEGORY_ID = "salario";

/** Rascunho da revisão: o texto dos campos como o usuário vê e edita. */
export interface PayslipDraft {
  company: string;
  /** CNPJ digitado (opcional). */
  cnpj: string;
  /** Competência digitada, `MM/AAAA` (aceita `13/AAAA`). */
  period: string;
  /** Chave "13º salário". */
  thirteenth: boolean;
  /** Valores no formato brasileiro ("5.340,91"). */
  gross: string;
  net: string;
  /** Lidos da imagem; só leitura, vão para o evento como lidos. */
  earnings: PayslipLinePayload[];
  deductions: PayslipLinePayload[];
  fgts?: number;
  source: PayslipSource;
}

export type PayslipDraftField = "company" | "cnpj" | "period" | "gross" | "net";

/** Valores validados, prontos para os criadores de evento. */
export interface PayslipReviewValues {
  period: string;
  kind?: "thirteenth";
  company: string;
  cnpj?: string;
  grossSalary: number;
  netSalary: number;
  earnings: PayslipLinePayload[];
  deductions: PayslipLinePayload[];
  fgts?: number;
  source: PayslipSource;
}

export type PayslipDraftValidation =
  | { ok: true; errors: Partial<Record<PayslipDraftField, string>>; values: PayslipReviewValues }
  | { ok: false; errors: Partial<Record<PayslipDraftField, string>> };

export const PAYSLIP_DRAFT_ERRORS = {
  periodEmpty: "Informe a competência (MM/AAAA).",
  periodInvalid: "Competência inválida. Use MM/AAAA.",
  employerMissing: "Informe a empresa ou o CNPJ.",
  cnpjInvalid: "CNPJ inválido. Confira os 14 dígitos.",
  grossInvalid: "Informe o salário bruto.",
  netInvalid: "Informe o salário líquido.",
  netAboveGross: "O líquido não pode ser maior que o bruto.",
} as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "5340.91" → "5340,91"; 0 ou inválido → "". */
function amountInput(n: number | undefined): string {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n.toFixed(2).replace(".", ",") : "";
}

/** `YYYY-MM` → `MM/AAAA`. */
export function periodToInput(period: string | null | undefined): string {
  if (!period || !PAYSLIP_PERIOD_PATTERN.test(period)) return "";
  const [y, m] = period.split("-");
  return `${m}/${y}`;
}

/** Competência digitada como 13º ("13/2026", "13º/2026", "13º salário 2026"). */
export function isThirteenthPeriodInput(text: string): boolean {
  return /^\s*13(?!\d)/.test(text) && normalizePayslipPeriod(text) !== null;
}

/** Rascunho vazio (preencher à mão). */
export function emptyPayslipDraft(): PayslipDraft {
  return {
    company: "",
    cnpj: "",
    period: "",
    thirteenth: false,
    gross: "",
    net: "",
    earnings: [],
    deductions: [],
    source: "manual",
  };
}

/** Rascunho a partir da leitura (parser local ou Vision normalizado). */
export function draftFromParse(result: PayslipParseResult, source: PayslipSource): PayslipDraft {
  const draft: PayslipDraft = {
    company: result.company ?? "",
    cnpj: result.cnpj ?? "",
    period: periodToInput(result.period),
    thirteenth: result.thirteenth === true,
    gross: amountInput(result.grossSalary),
    net: amountInput(result.netSalary),
    earnings: (result.earnings ?? []).map((l) => ({ name: l.name, value: l.value })),
    deductions: (result.deductions ?? []).map((l) => ({ name: l.name, value: l.value })),
    source,
  };
  if (typeof result.fgts === "number" && Number.isFinite(result.fgts)) draft.fgts = result.fgts;
  return draft;
}

/** Valor digitado: `null` se vazio, `NaN` se ilegível. */
function readAmount(text: string): number | null {
  if (!text.trim()) return null;
  const n = parseBRL(text);
  return Number.isFinite(n) ? round2(n) : NaN;
}

/**
 * Validação para salvar: competência válida, líquido > 0 e ≤ bruto, valores
 * finitos, empresa ou CNPJ (nome normalizado vazio sem CNPJ nunca casa no
 * reducer, R8 da 11.4) e CNPJ, se preenchido, válido.
 */
export function validatePayslipDraft(draft: PayslipDraft): PayslipDraftValidation {
  const errors: Partial<Record<PayslipDraftField, string>> = {};

  const periodText = draft.period.trim();
  const period = periodText ? normalizePayslipPeriod(periodText) : null;
  if (!periodText) errors.period = PAYSLIP_DRAFT_ERRORS.periodEmpty;
  else if (!period || !PAYSLIP_PERIOD_PATTERN.test(period)) errors.period = PAYSLIP_DRAFT_ERRORS.periodInvalid;

  const cnpjText = draft.cnpj.trim();
  const cnpj = cnpjText ? normalizeCnpj(cnpjText) : null;
  if (cnpjText && !cnpj) errors.cnpj = PAYSLIP_DRAFT_ERRORS.cnpjInvalid;

  const company = draft.company.trim();
  if (!cnpjText && normalizeCompany(company) === "") errors.company = PAYSLIP_DRAFT_ERRORS.employerMissing;

  const gross = readAmount(draft.gross);
  const net = readAmount(draft.net);
  const grossOk = gross !== null && Number.isFinite(gross) && gross > 0;
  if (!grossOk) errors.gross = PAYSLIP_DRAFT_ERRORS.grossInvalid;
  if (net === null || !Number.isFinite(net) || net <= 0) errors.net = PAYSLIP_DRAFT_ERRORS.netInvalid;
  else if (grossOk && net > (gross as number)) errors.net = PAYSLIP_DRAFT_ERRORS.netAboveGross;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const values: PayslipReviewValues = {
    period: period as string,
    company,
    grossSalary: gross as number,
    netSalary: net as number,
    earnings: draft.earnings.map((l) => ({ name: l.name, value: l.value })),
    deductions: draft.deductions.map((l) => ({ name: l.name, value: l.value })),
    source: draft.source,
  };
  if (draft.thirteenth) values.kind = "thirteenth";
  if (cnpj) values.cnpj = cnpj;
  if (typeof draft.fgts === "number" && Number.isFinite(draft.fgts)) values.fgts = draft.fgts;
  return { ok: true, errors, values };
}

/**
 * Holerite já salvo na mesma vaga (competência + tipo + empregador), pela regra
 * do reducer (`samePayslipSlot`), nunca uma regra própria.
 */
export function findPayslipInSlot(
  payslips: Readonly<Record<string, StoredPayslip>> | readonly StoredPayslip[],
  slot: { period: string; kind?: "thirteenth" | "monthly"; cnpj?: string; company: string },
): StoredPayslip | undefined {
  const list = Array.isArray(payslips) ? payslips : Object.values(payslips);
  return (list as StoredPayslip[]).find((p) => samePayslipSlot(p, slot));
}

/**
 * Decisão 2a: a chave de receita começa ligada só quando há conta elegível e a
 * vaga não tem holerite que já lançou receita.
 */
export function defaultLaunchIncome(hasEligibleAccount: boolean, inSlot: StoredPayslip | undefined): boolean {
  return hasEligibleAccount && !inSlot?.transactionId;
}

/** "09/2026" ou "13º salário 2026". */
export function formatPayslipPeriodLabel(p: { period: string; kind?: unknown }): string {
  const [y, m] = p.period.split("-");
  return p.kind === "thirteenth" ? `13º salário ${y}` : `${m}/${y}`;
}

/** Texto da confirmação de substituição (decisão 2a). */
export function replacePayslipMessage(existing: StoredPayslip): string {
  const who = existing.company.trim() || existing.cnpj || "este empregador";
  let message = `Já existe o holerite de ${formatPayslipPeriodLabel(existing)} de ${who}. Ele será substituído pelo novo.`;
  if (existing.transactionId) {
    message += " A receita já lançada pelo holerite anterior continua no extrato.";
  }
  return message;
}

/** "Salário (09/2026)" ou "13º salário (2026)", seguida da empresa quando houver. */
export function payslipIncomeDescription(values: Pick<PayslipReviewValues, "period" | "kind" | "company">): string {
  const [y, m] = values.period.split("-");
  const base = values.kind === "thirteenth" ? `13º salário (${y})` : `Salário (${m}/${y})`;
  const company = values.company.trim();
  return company ? `${base} — ${company}` : base;
}

export interface PayslipSaveOptions {
  /** Conta (não cartão) e data `YYYY-MM-DD` da receita; ausente = não lançar. */
  income?: { accountId: string; date: string };
  deviceId?: string;
}

export type PayslipSaveEvents =
  | [PayslipRecordedEvent]
  | [PayslipRecordedEvent, TransactionCreatedEvent];

/**
 * Monta os eventos do salvar: `PAYSLIP_RECORDED` (sempre id novo: o reducer
 * substitui pela vaga) e, com receita, o `TRANSACTION_CREATED` income/`salario`
 * com o líquido, ligado pelo `transactionId`. Despachar nessa ordem.
 */
export function buildPayslipSaveEvents(values: PayslipReviewValues, options: PayslipSaveOptions = {}): PayslipSaveEvents {
  const deviceId = options.deviceId ?? "local";
  let tx: TransactionCreatedEvent | undefined;
  if (options.income) {
    if (!options.income.accountId) throw new Error("Holerite: conta da receita vazia");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(options.income.date)) throw new Error("Holerite: data da receita inválida");
    [tx] = createTransactionEvent(
      {
        accountId: options.income.accountId,
        type: "income",
        amount: round2(values.netSalary),
        categoryId: PAYSLIP_INCOME_CATEGORY_ID,
        date: options.income.date,
        description: payslipIncomeDescription(values),
      },
      deviceId,
    );
  }
  const payslip = recordPayslipEvent(
    {
      period: values.period,
      company: values.company,
      ...(values.cnpj ? { cnpj: values.cnpj } : {}),
      grossSalary: values.grossSalary,
      netSalary: values.netSalary,
      deductions: values.deductions,
      ...(values.earnings.length > 0 ? { earnings: values.earnings } : {}),
      ...(values.fgts !== undefined ? { fgts: values.fgts } : {}),
      source: values.source,
      ...(values.kind === "thirteenth" ? { kind: "thirteenth" as const } : {}),
      ...(tx ? { transactionId: tx.payload.id } : {}),
    },
    deviceId,
  );
  return tx ? [payslip, tx] : [payslip];
}
