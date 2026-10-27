import type { PayslipChartPoint, PayslipHistorySummary } from "@packages/domain";
import { formatCurrency } from "@/src/utils/formatCurrency";

/**
 * Story 11.6: textos da tela de histórico do holerite. Sem `react-native`, para
 * rodar no vitest.
 */

const MINUS = "−";

/** Valor monetário; não finito (dados antigos) vira "—". */
export function moneyOrDash(value: number): string {
  return Number.isFinite(value) ? formatCurrency(value) : "—";
}

/** 20,0% a partir de pontos percentuais (20). */
export function formatPercentPoints(points: number): string {
  return `${points.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export type NetTrend = "up" | "down" | "flat";

export interface NetChangeView {
  trend: NetTrend;
  /** "+R$ 200,00 (+5,0%)", "−R$ 200,00 (−4,8%)" ou "Primeiro holerite salvo". */
  text: string;
  /** "em relação a 08/2026", ou null sem anterior. */
  reference: string | null;
}

export function netChangeView(summary: PayslipHistorySummary): NetChangeView {
  const { previous, netChange, netChangePct } = summary;
  if (!previous || netChange === null) return { trend: "flat", text: "Primeiro holerite salvo", reference: null };
  const trend: NetTrend = netChange > 0 ? "up" : netChange < 0 ? "down" : "flat";
  const sign = trend === "up" ? "+" : trend === "down" ? MINUS : "";
  let text = `${sign}${formatCurrency(Math.abs(netChange))}`;
  if (netChangePct !== null) text += ` (${sign}${formatPercentPoints(Math.abs(netChangePct))})`;
  const [y, m] = previous.period.split("-");
  return { trend, text, reference: `em relação a ${m}/${y}` };
}

/** "média de 7 competências" / "média de 1 competência". */
export function averageLabel(windowCount: number): string {
  return `média de ${windowCount} ${windowCount === 1 ? "competência" : "competências"}`;
}

/** "2 empregadores", ou null com um só. */
export function employersLabel(count: number): string | null {
  return count > 1 ? `${count} empregadores` : null;
}

/** "09/2026: líquido R$ 4.000,00, bruto R$ 5.000,00" (acessibilidade da barra). */
export function chartBarAccessibilityLabel(p: PayslipChartPoint): string {
  return `${p.fullLabel}: líquido ${formatCurrency(p.net)}, bruto ${formatCurrency(p.gross)}`;
}

/** "09/2026 · líquido R$ 4.000,00 · bruto R$ 5.000,00" (detalhe sob o gráfico). */
export function chartBarDetail(p: PayslipChartPoint): string {
  return `${p.fullLabel} · líquido ${formatCurrency(p.net)} · bruto ${formatCurrency(p.gross)}`;
}
