import type { PayslipLinePayload, PayslipSource } from "@packages/events/src/types";
import { PAYSLIP_PERIOD_PATTERN } from "@packages/domain/src/payslips";
import { normalizeCompany } from "@packages/domain/src/reducer";
import type { PayslipReviewValues } from "@packages/domain/src/payslipReview";
import {
  normalizeCnpj,
  parseBRL,
  readPayslipPeriod,
  type PayslipParseResult,
} from "@packages/parsers/src/payslipParser";

/**
 * Story 11.5: rascunho da revisão do holerite — o texto que o usuário vê e
 * edita, a leitura desse texto e o estado dos campos (erros visíveis, 13º).
 * Puro, sem `react-native`: a tela `PayslipReview` só liga estas peças. Fica em
 * `src/` e não em `packages/domain` porque lê o texto com `packages/parsers`
 * (R4 da revisão: o domínio não depende do parser).
 */

/** Rascunho da revisão: o texto dos campos como o usuário vê e edita. */
export interface PayslipDraft {
  company: string;
  /** CNPJ digitado (opcional), numérico ou alfanumérico. */
  cnpj: string;
  /** Competência digitada, `MM/AAAA` (aceita `13/AAAA` e `13º/AAAA`). */
  period: string;
  /** Chave "13º salário". */
  thirteenth: boolean;
  /** O usuário mexeu na chave do 13º: ela para de acompanhar a competência. */
  thirteenthTouched?: boolean;
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
export type PayslipDraftErrors = Partial<Record<PayslipDraftField, string>>;
export type PayslipTouched = Partial<Record<PayslipDraftField, boolean>>;

export const PAYSLIP_DRAFT_FIELDS: readonly PayslipDraftField[] = ["company", "cnpj", "period", "gross", "net"];

export type PayslipDraftValidation =
  | { ok: true; errors: PayslipDraftErrors; values: PayslipReviewValues }
  | { ok: false; errors: PayslipDraftErrors };

/** Limite do nome da empresa (R11). */
export const PAYSLIP_COMPANY_MAX_LENGTH = 120;

export const PAYSLIP_DRAFT_ERRORS = {
  periodEmpty: "Informe a competência (MM/AAAA).",
  periodInvalid: "Competência inválida. Use MM/AAAA.",
  employerMissing: "Informe a empresa ou o CNPJ.",
  companyTooLong: `Use até ${PAYSLIP_COMPANY_MAX_LENGTH} caracteres.`,
  cnpjInvalid: "CNPJ inválido. Confira os 14 caracteres.",
  grossInvalid: "Informe o salário bruto.",
  netInvalid: "Informe o salário líquido.",
  amountInvalid: "Valor inválido.",
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
  return readPayslipPeriod(text)?.thirteenth === true;
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

/**
 * Rascunho a partir da leitura (parser local ou Vision normalizado). O 13º lido
 * aparece como `13/AAAA`, para a competência e a chave dizerem o mesmo (R9).
 */
export function draftFromParse(result: PayslipParseResult, source: PayslipSource): PayslipDraft {
  const thirteenth = result.thirteenth === true;
  const period = periodToInput(result.period);
  const draft: PayslipDraft = {
    company: result.company ?? "",
    cnpj: result.cnpj ?? "",
    period: thirteenth && period ? `13/${period.slice(3)}` : period,
    thirteenth,
    gross: amountInput(result.grossSalary),
    net: amountInput(result.netSalary),
    earnings: (result.earnings ?? []).map((l) => ({ name: l.name, value: l.value })),
    deductions: (result.deductions ?? []).map((l) => ({ name: l.name, value: l.value })),
    source,
  };
  if (typeof result.fgts === "number" && Number.isFinite(result.fgts)) draft.fgts = result.fgts;
  return draft;
}

/**
 * Valor digitado (R10): `null` se vazio, `NaN` se ilegível. Aceita "5.340,91",
 * "5340.91", "R$ 5.340,91" e espaço como separador de milhar ("5 340,91");
 * recusa expoente ("1e3"), sinal ("-10", "10-"), hexadecimal e letras.
 */
export function parseAmountInput(text: string): number | null {
  let s = text.trim().replace(/^r\$\s*/i, "");
  if (!s) return null;
  s = s.replace(/(?<=\d)[\s  ]+(?=\d)/g, "");
  if (!/^\d[\d.,]*$/.test(s)) return NaN;
  const n = parseBRL(s);
  return Number.isFinite(n) && n >= 0 ? round2(n) : NaN;
}

function amountError(n: number | null, empty: string): string | undefined {
  if (n === null) return empty;
  if (Number.isNaN(n)) return PAYSLIP_DRAFT_ERRORS.amountInvalid;
  if (n <= 0) return empty;
  return undefined;
}

/**
 * Validação para salvar: competência válida, líquido > 0 e ≤ bruto, valores
 * legíveis, empresa (até 120 caracteres) ou CNPJ (nome normalizado vazio sem
 * CNPJ nunca casa no reducer, R8 da 11.4) e CNPJ, se preenchido, válido. A
 * competência `13/AAAA` sempre sai como 13º (R9).
 */
export function validatePayslipDraft(draft: PayslipDraft): PayslipDraftValidation {
  const errors: PayslipDraftErrors = {};

  const periodText = draft.period.trim();
  const read = periodText ? readPayslipPeriod(periodText) : null;
  if (!periodText) errors.period = PAYSLIP_DRAFT_ERRORS.periodEmpty;
  else if (!read || !PAYSLIP_PERIOD_PATTERN.test(read.period)) errors.period = PAYSLIP_DRAFT_ERRORS.periodInvalid;

  const cnpjText = draft.cnpj.trim();
  const cnpj = cnpjText ? normalizeCnpj(cnpjText) : null;
  if (cnpjText && !cnpj) errors.cnpj = PAYSLIP_DRAFT_ERRORS.cnpjInvalid;

  const company = draft.company.trim();
  if (company.length > PAYSLIP_COMPANY_MAX_LENGTH) errors.company = PAYSLIP_DRAFT_ERRORS.companyTooLong;
  else if (!cnpjText && normalizeCompany(company) === "") errors.company = PAYSLIP_DRAFT_ERRORS.employerMissing;

  const gross = parseAmountInput(draft.gross);
  const net = parseAmountInput(draft.net);
  const grossError = amountError(gross, PAYSLIP_DRAFT_ERRORS.grossInvalid);
  const netError = amountError(net, PAYSLIP_DRAFT_ERRORS.netInvalid);
  if (grossError) errors.gross = grossError;
  if (netError) errors.net = netError;
  else if (!grossError && (net as number) > (gross as number)) errors.net = PAYSLIP_DRAFT_ERRORS.netAboveGross;

  if (Object.keys(errors).length > 0 || !read) return { ok: false, errors };

  const values: PayslipReviewValues = {
    period: read.period,
    company,
    grossSalary: gross as number,
    netSalary: net as number,
    earnings: draft.earnings.map((l) => ({ name: l.name, value: l.value })),
    deductions: draft.deductions.map((l) => ({ name: l.name, value: l.value })),
    source: draft.source,
  };
  if (draft.thirteenth || read.thirteenth) values.kind = "thirteenth";
  if (cnpj) values.cnpj = cnpj;
  if (typeof draft.fgts === "number" && Number.isFinite(draft.fgts)) values.fgts = draft.fgts;
  return { ok: true, errors, values };
}

// ─── Estado da revisão (R7, R9) ───────────────────────────────────────────────

/**
 * Edição de um campo. A chave do 13º acompanha a competência enquanto o
 * usuário não mexe nela; depois, uma competência `13/AAAA` ainda a liga (R9).
 */
export function updateDraftField(draft: PayslipDraft, field: PayslipDraftField, text: string): PayslipDraft {
  const next: PayslipDraft = { ...draft, [field]: text };
  if (field === "period") {
    const thirteenthInput = isThirteenthPeriodInput(text);
    if (!draft.thirteenthTouched) next.thirteenth = thirteenthInput;
    else if (thirteenthInput) next.thirteenth = true;
  }
  return next;
}

/**
 * Toque na chave do 13º. Desligar com a competência `13/AAAA` troca a
 * competência por `12/AAAA` (o mensal de dezembro), para a chave e o texto não
 * se contradizerem (R9).
 */
export function toggleDraftThirteenth(draft: PayslipDraft, value: boolean): PayslipDraft {
  const next: PayslipDraft = { ...draft, thirteenth: value, thirteenthTouched: true };
  if (!value) {
    const read = readPayslipPeriod(draft.period);
    if (read?.thirteenth) next.period = periodToInput(read.period);
  }
  return next;
}

/** Campo já preenchido pela leitura mostra o erro de saída; vazio, só depois de mexer. */
export function initialTouched(draft: PayslipDraft): PayslipTouched {
  return {
    company: draft.company.trim() !== "" || draft.cnpj.trim() !== "",
    cnpj: draft.cnpj.trim() !== "",
    period: draft.period.trim() !== "",
    gross: draft.gross.trim() !== "",
    net: draft.net.trim() !== "",
  };
}

/** Todos os campos marcados: o toque em Salvar mostra todos os erros (R7). */
export function touchAllFields(): PayslipTouched {
  return Object.fromEntries(PAYSLIP_DRAFT_FIELDS.map((f) => [f, true])) as PayslipTouched;
}

/** Erros que a tela mostra: só dos campos mexidos (a falta de empresa/CNPJ aparece ao mexer em um dos dois). */
export function visibleDraftErrors(errors: PayslipDraftErrors, touched: PayslipTouched): PayslipDraftErrors {
  const out: PayslipDraftErrors = {};
  for (const f of PAYSLIP_DRAFT_FIELDS) {
    const show = touched[f] || (f === "company" && touched.cnpj);
    if (show && errors[f]) out[f] = errors[f];
  }
  return out;
}

export type PayslipSubmitDecision =
  | { action: "save"; values: PayslipReviewValues }
  | { action: "showErrors"; touched: PayslipTouched; message: string };

export const PAYSLIP_SUBMIT_ERROR = "Confira os campos destacados.";

/**
 * Toque em Salvar (R7): o botão fica sempre pressionável; com erro, marca
 * todos os campos para mostrar todos os erros, inclusive "Informe a empresa ou
 * o CNPJ" num campo que o usuário não tocou.
 */
export function decidePayslipSubmit(validation: PayslipDraftValidation): PayslipSubmitDecision {
  if (validation.ok) return { action: "save", values: validation.values };
  return { action: "showErrors", touched: touchAllFields(), message: PAYSLIP_SUBMIT_ERROR };
}
