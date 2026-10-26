import type {
  AccountPayload,
  PayslipLinePayload,
  PayslipSource,
  PayslipRecordedEvent,
  TransactionCreatedEvent,
} from "../../events/src/types";
import { recordPayslipEvent } from "./payslips";
import { createTransactionEvent } from "./transactions";
import { samePayslipSlot } from "./reducer";
import type { StoredPayslip } from "./state";

/**
 * Story 11.5: salvar o holerite revisado. Puro (AD-3): sem `Date.now`, ids só
 * pelos criadores (`recordPayslipEvent`, `createTransactionEvent`); a data da
 * receita entra como parâmetro. A leitura do texto digitado (validação do
 * rascunho) fica em `src/modules/payslip/reviewDraft.ts`: `packages/domain` não
 * depende de `packages/parsers` (R4 da revisão).
 */

/** Categoria da receita lançada a partir do holerite. */
export const PAYSLIP_INCOME_CATEGORY_ID = "salario";

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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Holerites já salvos na mesma vaga (competência + tipo + empregador), pela
 * regra do reducer (`samePayslipSlot`), nunca uma regra própria. Pode haver
 * mais de um: salvar só com o nome casa com todos os holerites desse nome,
 * de qualquer CNPJ, e o reducer substitui todos (R3 da revisão).
 */
export function findPayslipsInSlot(
  payslips: Readonly<Record<string, StoredPayslip>> | readonly StoredPayslip[],
  slot: { period: string; kind?: "thirteenth" | "monthly"; cnpj?: string; company: string },
): StoredPayslip[] {
  const list = (Array.isArray(payslips) ? payslips : Object.values(payslips)) as StoredPayslip[];
  return list.filter((p) => samePayslipSlot(p, slot));
}

/**
 * Decisão 2a: a chave de receita começa ligada só quando há conta elegível e
 * nenhum holerite da vaga já lançou receita.
 */
export function defaultLaunchIncome(hasEligibleAccount: boolean, inSlot: readonly StoredPayslip[]): boolean {
  return hasEligibleAccount && !inSlot.some((p) => !!p.transactionId);
}

/** Contas que podem receber o salário: todas menos cartão de crédito. */
export function incomeEligibleAccounts<T extends Pick<AccountPayload, "type">>(accounts: readonly T[]): T[] {
  return accounts.filter((a) => a.type !== "credit_card");
}

/**
 * Conta padrão da receita (R11): conta corrente primeiro, depois carteira,
 * depois poupança sem meta nem vínculo com cartão, e só então qualquer outra
 * elegível. Na mesma prioridade, a ordem recebida.
 */
export function defaultIncomeAccountId(
  accounts: readonly Pick<AccountPayload, "id" | "type" | "savingsGoalEnabled" | "linkedCreditCardId">[],
): string {
  const rank = (a: (typeof accounts)[number]): number => {
    if (a.type === "checking") return 0;
    if (a.type === "wallet") return 1;
    if (a.type === "savings" && !a.savingsGoalEnabled && !a.linkedCreditCardId) return 2;
    return 3;
  };
  let best: (typeof accounts)[number] | undefined;
  for (const a of incomeEligibleAccounts(accounts)) {
    if (!best || rank(a) < rank(best)) best = a;
  }
  return best?.id ?? "";
}

/** "09/2026" ou "13º salário 2026". */
export function formatPayslipPeriodLabel(p: { period: string; kind?: unknown }): string {
  const [y, m] = p.period.split("-");
  return p.kind === "thirteenth" ? `13º salário ${y}` : `${m}/${y}`;
}

function employerLabel(p: StoredPayslip): string {
  return p.company.trim() || p.cnpj || "este empregador";
}

/**
 * Texto da confirmação de substituição (decisão 2a), listando todos os
 * holerites da vaga (R3).
 */
export function replacePayslipMessage(existing: StoredPayslip | readonly StoredPayslip[]): string {
  const list: readonly StoredPayslip[] = Array.isArray(existing) ? existing : [existing as StoredPayslip];
  let message: string;
  if (list.length <= 1) {
    const one = list[0]!;
    message = `Já existe o holerite de ${formatPayslipPeriodLabel(one)} de ${employerLabel(one)}. Ele será substituído pelo novo.`;
  } else {
    const lines = list.map((p) => `• ${formatPayslipPeriodLabel(p)} de ${employerLabel(p)}${p.cnpj && p.company.trim() ? ` (${p.cnpj})` : ""}`);
    message = `Já existem ${list.length} holerites nesta vaga:\n${lines.join("\n")}\nTodos serão substituídos pelo novo.`;
  }
  if (list.some((p) => !!p.transactionId)) {
    message += list.length > 1
      ? " As receitas já lançadas pelos holerites anteriores continuam no extrato."
      : " A receita já lançada pelo holerite anterior continua no extrato.";
  }
  return message;
}

/**
 * "Salário (09/2026)" ou "13º salário (2026)". Sem o nome da empresa (R2 da
 * revisão): a descrição vai ao contexto da IA e ao Grupo de sync.
 */
export function payslipIncomeDescription(values: Pick<PayslipReviewValues, "period" | "kind">): string {
  const [y, m] = values.period.split("-");
  return values.kind === "thirteenth" ? `13º salário (${y})` : `Salário (${m}/${y})`;
}

/** `YYYY-MM-DD` que existe no calendário ("2026-02-30" e "2026-13-45" não). */
export function isRealIsoDate(date: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1) return false;
  const days = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= days[mo - 1]!;
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
    if (!isRealIsoDate(options.income.date)) throw new Error("Holerite: data da receita inválida");
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
