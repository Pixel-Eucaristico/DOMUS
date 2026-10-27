import { payslipKindOf } from "./reducer";
import { formatPayslipPeriodLabel, payslipIncomeDescription } from "./payslipReview";
import { PAYSLIP_PERIOD_PATTERN } from "./payslips";
import type { StoredPayslip } from "./state";

/**
 * Story 11.6: histórico, resumo, série do gráfico e total por desconto dos
 * holerites, derivados de `domain.payslips` a cada render (nunca persistidos).
 * Puro (AD-3): sem relógio nem sorteio, sem `react-native`, sem o parser (R4).
 *
 * Decisões do dono (27/10):
 * - 1a: vários empregadores na mesma competência são somados (bruto, líquido e
 *   descontos); `count` diz quantos holerites entraram.
 * - 2a: o 13º fica fora do histórico mensal (resumo e gráfico); entra no total
 *   por desconto e na lista.
 * - 3a: o total por desconto usa as últimas 12 competências mensais salvas,
 *   mais o 13º cuja competência caia nesse intervalo.
 */

/** Quantas competências mensais entram no resumo, no gráfico e nos totais. */
export const PAYSLIP_HISTORY_WINDOW = 12;

/** Nome da linha que fecha bruto − líquido quando as rubricas lidas não bastam. */
export const UNDETAILED_DEDUCTIONS_LABEL = "Descontos sem detalhe";

export interface PayslipHistoryEntry {
  /** Competência `YYYY-MM`. */
  period: string;
  gross: number;
  net: number;
  /** bruto − líquido. */
  deductionsTotal: number;
  /** Quantos holerites (empregadores) entraram na competência. */
  count: number;
  ids: string[];
}

export interface PayslipHistorySummary {
  latest: PayslipHistoryEntry;
  /** A competência mensal salva anterior (mesmo que não seja o mês seguido). */
  previous: PayslipHistoryEntry | null;
  netChange: number | null;
  /** Em pontos percentuais (5 = 5%); `null` sem anterior ou com líquido anterior 0. */
  netChangePct: number | null;
  averageNet: number;
  /** Quantas competências entraram na média (até 12). */
  windowCount: number;
  /** (Σbruto − Σlíquido) / Σbruto, em fração (0,2 = 20%), 4 casas; 0 com Σbruto 0. */
  deductionRate: number;
}

export interface PayslipChartPoint {
  period: string;
  /** `MM/AA`, sob a barra. */
  label: string;
  /** `MM/AAAA`, no detalhe e na acessibilidade. */
  fullLabel: string;
  net: number;
  gross: number;
  /** Em [0, 1] sobre o maior valor da janela. */
  netRatio: number;
  grossRatio: number;
  count: number;
}

export interface PayslipDeductionTotal {
  name: string;
  value: number;
  /** Em [0, 1] sobre o maior total, para a barra proporcional. */
  ratio: number;
}

/** Janela das últimas competências mensais (inclusiva), ou `null` sem mensal. */
export interface PayslipHistoryWindow {
  from: string;
  to: string;
}

type PayslipSource = Readonly<Record<string, StoredPayslip>> | readonly StoredPayslip[];

function listOf(payslips: PayslipSource): StoredPayslip[] {
  return (Array.isArray(payslips) ? payslips : Object.values(payslips)) as StoredPayslip[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/** Holerite com competência válida e bruto/líquido finitos (D38: dados antigos). */
function usable(p: StoredPayslip | null | undefined): p is StoredPayslip {
  return (
    !!p &&
    typeof p.period === "string" &&
    PAYSLIP_PERIOD_PATTERN.test(p.period) &&
    finite(p.grossSalary) &&
    finite(p.netSalary)
  );
}

function clamp01(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n >= 1 ? 1 : n;
}

/** Competências mensais em ordem crescente, somando os empregadores (1a); sem 13º (2a). */
export function buildPayslipHistory(payslips: PayslipSource): PayslipHistoryEntry[] {
  const byPeriod = new Map<string, { gross: number; net: number; ids: string[] }>();
  for (const p of listOf(payslips)) {
    if (!usable(p) || payslipKindOf(p) === "thirteenth") continue;
    const entry = byPeriod.get(p.period) ?? { gross: 0, net: 0, ids: [] };
    entry.gross += p.grossSalary;
    entry.net += p.netSalary;
    entry.ids.push(p.id);
    byPeriod.set(p.period, entry);
  }
  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, e]) => ({
      period,
      gross: round2(e.gross),
      net: round2(e.net),
      deductionsTotal: round2(e.gross - e.net),
      count: e.ids.length,
      ids: [...e.ids].sort(),
    }));
}

function lastWindow(history: readonly PayslipHistoryEntry[]): PayslipHistoryEntry[] {
  return history.slice(-PAYSLIP_HISTORY_WINDOW);
}

/** Primeira e última competência da janela de 12, ou `null` sem mensal. */
export function payslipHistoryWindow(history: readonly PayslipHistoryEntry[]): PayslipHistoryWindow | null {
  const w = lastWindow(history);
  if (w.length === 0) return null;
  return { from: w[0]!.period, to: w[w.length - 1]!.period };
}

/** Resumo sobre a janela das últimas 12 competências mensais; `null` sem mensal. */
export function summarizePayslipHistory(history: readonly PayslipHistoryEntry[]): PayslipHistorySummary | null {
  const w = lastWindow(history);
  if (w.length === 0) return null;
  const latest = w[w.length - 1]!;
  const previous = w.length > 1 ? w[w.length - 2]! : null;
  const netChange = previous ? round2(latest.net - previous.net) : null;
  const netChangePct =
    previous && netChange !== null && previous.net !== 0 ? round2((netChange / Math.abs(previous.net)) * 100) : null;
  const sumNet = w.reduce((s, e) => s + e.net, 0);
  const sumGross = w.reduce((s, e) => s + e.gross, 0);
  return {
    latest,
    previous,
    netChange,
    netChangePct,
    averageNet: round2(sumNet / w.length),
    windowCount: w.length,
    deductionRate: sumGross > 0 ? Math.round(((sumGross - sumNet) / sumGross) * 10000) / 10000 : 0,
  };
}

/** Barras das últimas 12 competências mensais salvas (sem buraco para mês sem holerite). */
export function payslipChartSeries(history: readonly PayslipHistoryEntry[]): PayslipChartPoint[] {
  const w = lastWindow(history);
  const max = w.reduce((m, e) => Math.max(m, e.gross, e.net), 0);
  return w.map((e) => {
    const [y, m] = e.period.split("-");
    return {
      period: e.period,
      label: `${m}/${y!.slice(2)}`,
      fullLabel: `${m}/${y}`,
      net: e.net,
      gross: e.gross,
      netRatio: max > 0 ? clamp01(e.net / max) : 0,
      grossRatio: max > 0 ? clamp01(e.gross / max) : 0,
      count: e.count,
    };
  });
}

/** Chave de agrupamento: sem acento, caixa, pontuação nem espaço repetido. */
export function deductionKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function newestFirst(a: StoredPayslip, b: StoredPayslip): number {
  return (
    b.period.localeCompare(a.period) ||
    Number(payslipKindOf(b) === "thirteenth") - Number(payslipKindOf(a) === "thirteenth") ||
    (b.recordedAt ?? 0) - (a.recordedAt ?? 0)
  );
}

/** Holerites que entram nos totais: os mensais da janela e o 13º dentro dela (3a). Só 13º: todos. */
function inDeductionWindow(p: StoredPayslip, window: PayslipHistoryWindow | null, windowIds: ReadonlySet<string>): boolean {
  if (payslipKindOf(p) === "thirteenth") {
    return !window || (p.period >= window.from && p.period <= window.to);
  }
  return windowIds.has(p.id);
}

/**
 * Soma por desconto, do maior para o menor (empate por nome). O nome exibido é
 * o do holerite mais recente do grupo. Bruto − líquido acima da soma das linhas
 * vira "Descontos sem detalhe"; diferença negativa é ignorada.
 */
export function payslipDeductionTotals(
  payslips: PayslipSource,
  history: readonly PayslipHistoryEntry[] = buildPayslipHistory(payslips),
): PayslipDeductionTotal[] {
  const window = payslipHistoryWindow(history);
  const windowIds = new Set(lastWindow(history).flatMap((e) => e.ids));
  // Do mais antigo ao mais novo: o último nome visto é o do mais recente.
  const list = listOf(payslips)
    .filter((p) => usable(p) && inDeductionWindow(p, window, windowIds))
    .sort((a, b) => newestFirst(b, a));
  const groups = new Map<string, { name: string; value: number }>();
  const add = (rawName: string, value: number) => {
    const name = rawName.trim() || "Desconto sem nome";
    const key = deductionKey(name) || name;
    const g = groups.get(key) ?? { name, value: 0 };
    g.name = name;
    g.value += value;
    groups.set(key, g);
  };
  for (const p of list) {
    let lineSum = 0;
    for (const d of Array.isArray(p.deductions) ? p.deductions : []) {
      if (!d || !finite(d.value)) continue;
      lineSum += d.value;
      add(typeof d.name === "string" ? d.name : "", d.value);
    }
    const missing = round2(p.grossSalary - p.netSalary - lineSum);
    if (missing > 0) add(UNDETAILED_DEDUCTIONS_LABEL, missing);
  }
  const rows = [...groups.values()]
    .map((g) => ({ name: g.name, value: round2(g.value) }))
    .filter((g) => g.value !== 0)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "pt-BR"));
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);
  return rows.map((r) => ({ ...r, ratio: max > 0 ? clamp01(r.value / max) : 0 }));
}

/** Título do total por desconto (3a); só 13º salvo: "Descontos do 13º salário". */
export function payslipDeductionTitle(history: readonly PayslipHistoryEntry[]): string {
  return history.length > 0 ? `Descontos nas últimas ${PAYSLIP_HISTORY_WINDOW} competências` : "Descontos do 13º salário";
}

/** Todos os holerites, do mais novo ao mais antigo (mesma ordem da lista da 11.5). */
export function sortPayslipsNewestFirst(payslips: PayslipSource): StoredPayslip[] {
  return listOf(payslips)
    .filter((p) => !!p && typeof p.period === "string")
    .sort(newestFirst);
}

/** Empresa, ou o CNPJ, ou "Empresa não informada". */
export function payslipEmployerLabel(p: Pick<StoredPayslip, "company" | "cnpj">): string {
  return (typeof p.company === "string" ? p.company.trim() : "") || p.cnpj || "Empresa não informada";
}

/**
 * Texto da confirmação de exclusão. A receita lançada nunca é apagada; quando
 * ela ainda existe no extrato, a mensagem avisa.
 */
export function deletePayslipMessage(p: StoredPayslip, incomeStillExists: boolean): string {
  const company = (typeof p.company === "string" ? p.company.trim() : "") || p.cnpj;
  let message = `O holerite de ${formatPayslipPeriodLabel(p)}${company ? ` de ${company}` : ""} sai do histórico, do gráfico e dos totais.`;
  if (incomeStillExists) {
    const description = payslipIncomeDescription({
      period: p.period,
      ...(payslipKindOf(p) === "thirteenth" ? { kind: "thirteenth" as const } : {}),
    });
    message += ` A receita “${description}” lançada por ele continua no extrato; exclua-a por lá, se quiser.`;
  }
  return message;
}
