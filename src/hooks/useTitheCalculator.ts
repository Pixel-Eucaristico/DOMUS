import { useMemo, useState } from "react";
import { useAppState } from "@/src/context/AppStateProvider";
import type { AccountPayload, TransactionPayload } from "@packages/events/src/types";

// ─── período helpers ──────────────────────────────────────────────────────────

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Retorna [início, fim] do mês anterior em "YYYY-MM-DD". */
function previousMonthRange(): [string, string] {
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const mm = String(prevMonth).padStart(2, "0");
  const lastDay = new Date(prevYear, prevMonth, 0).getDate();
  return [
    `${prevYear}-${mm}-01`,
    `${prevYear}-${mm}-${String(lastDay).padStart(2, "0")}`,
  ];
}

/** Retorna [início, fim] do mês atual (1º até hoje) em "YYYY-MM-DD". */
function currentMonthRange(): [string, string] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const mm = String(m).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return [`${y}-${mm}-01`, `${y}-${mm}-${d}`];
}

/** Retorna [início, fim] dos últimos N dias (incluindo hoje) em "YYYY-MM-DD". */
function lastNDaysRange(days: number): [string, string] {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return [fmt(start), fmt(end)];
}

// ─── cálculo da base ──────────────────────────────────────────────────────────

/**
 * Soma receitas confirmadas no período, filtrando apenas contas corrente e carteira.
 * Contas poupança/objetivo não entram no cálculo do dízimo.
 */
function calcBase(
  transactions: TransactionPayload[],
  accounts: Record<string, AccountPayload>,
  startDate: string,
  endDate: string,
  baseType: "gross" | "net",
): number {
  const ALLOWED_TYPES = ["checking", "wallet"];

  const inRange = transactions.filter(
    (tx) =>
      tx.status === "confirmed" &&
      tx.date >= startDate &&
      tx.date <= endDate &&
      ALLOWED_TYPES.includes(accounts[tx.accountId]?.type ?? ""),
  );

  const income = inRange
    .filter((tx) => tx.type === "income")
    .reduce((s, tx) => s + tx.amount, 0);

  if (baseType === "gross") return income;

  const expenses = inRange
    .filter((tx) => tx.type === "expense")
    .reduce((s, tx) => s + tx.amount, 0);

  return Math.max(0, income - expenses);
}

// ─── tipos ────────────────────────────────────────────────────────────────────

export type TithePeriodType = "previous_month" | "current_month" | "custom";
export type TitheBaseType = "gross" | "net";

export interface TitheCalculateResult {
  amount: number;
  base: number;
}

export interface UseTitheCalculatorResult {
  percentage: string;
  setPercentage: (v: string) => void;
  baseType: TitheBaseType;
  setBaseType: (v: TitheBaseType) => void;
  periodType: TithePeriodType;
  setPeriodType: (v: TithePeriodType) => void;
  /** Número de dias para o período customizado (ex: "30" = últimos 30 dias) */
  customDays: string;
  setCustomDays: (v: string) => void;
  /** Resultado calculado dinamicamente — null se percentual inválido ou base = 0. */
  result: TitheCalculateResult | null;
}

// ─── hook ─────────────────────────────────────────────────────────────────────

/**
 * Gerencia o estado da calculadora de dízimo/oferta.
 * O `result` é reativo — atualiza automaticamente conforme os parâmetros mudam.
 * Só conta receitas de contas corrente e carteira (exclui poupança/objetivo).
 */
export function useTitheCalculator(): UseTitheCalculatorResult {
  const { domain } = useAppState();

  const [percentage, setPercentage] = useState("10");
  const [baseType, setBaseType] = useState<TitheBaseType>("gross");
  const [periodType, setPeriodType] = useState<TithePeriodType>("previous_month");
  const [customDays, setCustomDays] = useState("30");

  const result = useMemo<TitheCalculateResult | null>(() => {
    const pct = parseFloat(percentage.replace(",", "."));
    if (!pct || pct <= 0) return null;

    const days = parseInt(customDays, 10) || 30;

    const [startDate, endDate] =
      periodType === "previous_month"
        ? previousMonthRange()
        : periodType === "current_month"
          ? currentMonthRange()
          : lastNDaysRange(days);

    const txList = Object.values(domain.transactions);
    const base = calcBase(txList, domain.accounts, startDate, endDate, baseType);
    const amount = parseFloat((base * (pct / 100)).toFixed(2));

    return { amount, base };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage, baseType, periodType, customDays, domain.transactions, domain.accounts]);

  return {
    percentage, setPercentage,
    baseType, setBaseType,
    periodType, setPeriodType,
    customDays, setCustomDays,
    result,
  };
}
