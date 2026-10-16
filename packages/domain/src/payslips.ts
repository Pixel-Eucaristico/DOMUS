import type {
  PayslipPayload,
  PayslipRecordedEvent,
  PayslipDeletedEvent,
} from "../../events/src/types";
import { EVENT_TYPES } from "../../events/src/types";
import { createEvent, generateId } from "../../events/src/factory";
import type { AppState, StoredPayslip } from "./state";

export type RecordPayslipParams = Omit<PayslipPayload, "id"> & { id?: string };

export function recordPayslipEvent(
  params: RecordPayslipParams,
  deviceId: string = "local",
): PayslipRecordedEvent {
  const payload: PayslipPayload = { ...params, id: params.id ?? generateId() };
  return createEvent<PayslipRecordedEvent>(EVENT_TYPES.PAYSLIP_RECORDED, payload, deviceId);
}

export function deletePayslipEvent(
  id: string,
  deviceId: string = "local",
): PayslipDeletedEvent {
  return createEvent<PayslipDeletedEvent>(EVENT_TYPES.PAYSLIP_DELETED, { id }, deviceId);
}

/** Holerites em ordem cronológica (competência mais antiga primeiro) */
export function getPayslipHistory(state: Pick<AppState, "payslips">): StoredPayslip[] {
  return Object.values(state.payslips).sort(
    (a, b) => a.period.localeCompare(b.period) || a.recordedAt - b.recordedAt,
  );
}

export interface PayslipSummary {
  count: number;
  latest: StoredPayslip | null;
  averageNet: number;
  averageGross: number;
  /** Variação do líquido da última competência em relação à anterior */
  netChange: number | null;
  netChangePct: number | null;
  /** Percentual médio do bruto que vai para descontos (0..1) */
  deductionRate: number;
  /** Total acumulado por desconto (INSS, IRRF, ...), maior primeiro */
  deductionTotals: { name: string; value: number }[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function deductionKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarizePayslips(history: StoredPayslip[]): PayslipSummary {
  const count = history.length;
  if (count === 0) {
    return {
      count: 0,
      latest: null,
      averageNet: 0,
      averageGross: 0,
      netChange: null,
      netChangePct: null,
      deductionRate: 0,
      deductionTotals: [],
    };
  }

  const latest = history[count - 1]!;
  const previous = count > 1 ? history[count - 2]! : null;
  const sumNet = history.reduce((s, p) => s + p.netSalary, 0);
  const sumGross = history.reduce((s, p) => s + p.grossSalary, 0);

  const totals = new Map<string, { name: string; value: number }>();
  for (const p of history) {
    for (const d of p.deductions) {
      const key = deductionKey(d.name);
      const entry = totals.get(key) ?? { name: d.name, value: 0 };
      entry.value += d.value;
      totals.set(key, entry);
    }
  }

  const netChange = previous ? round2(latest.netSalary - previous.netSalary) : null;
  const netChangePct =
    previous && previous.netSalary > 0 ? round2((netChange! / previous.netSalary) * 100) : null;

  return {
    count,
    latest,
    averageNet: round2(sumNet / count),
    averageGross: round2(sumGross / count),
    netChange,
    netChangePct,
    deductionRate: sumGross > 0 ? round2((sumGross - sumNet) / sumGross) : 0,
    deductionTotals: [...totals.values()]
      .map((t) => ({ name: t.name, value: round2(t.value) }))
      .sort((a, b) => b.value - a.value),
  };
}

/** "2026-03" → "mar/2026" */
export function formatPayslipPeriod(period: string): string {
  const [year, month] = period.split("-");
  const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const idx = Number(month) - 1;
  return names[idx] && year ? `${names[idx]}/${year}` : period;
}
