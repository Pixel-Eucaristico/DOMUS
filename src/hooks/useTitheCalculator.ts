import { useState } from "react";
import { useAppState } from "@/src/context/AppStateProvider";
import type { TransactionPayload } from "@packages/events/src/types";

// ─── período helpers ──────────────────────────────────────────────────────────

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

function currentMonthRange(): [string, string] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const mm = String(m).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return [`${y}-${mm}-01`, `${y}-${mm}-${d}`];
}

function lastNDaysRange(days: number): [string, string] {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return [fmt(start), fmt(end)];
}

// ─── cálculo da base ──────────────────────────────────────────────────────────

function calcBase(
  transactions: TransactionPayload[],
  startDate: string,
  endDate: string,
  baseType: "gross" | "net",
): number {
  const inRange = transactions.filter(
    (tx) => tx.date >= startDate && tx.date <= endDate,
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
  customDays: string;
  setCustomDays: (v: string) => void;
  result: TitheCalculateResult | null;
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useTitheCalculator(): UseTitheCalculatorResult {
  const { domain } = useAppState();

  const [percentage, setPercentage] = useState("10");
  const [baseType, setBaseType] = useState<TitheBaseType>("gross");
  const [periodType, setPeriodType] = useState<TithePeriodType>("previous_month");
  const [customDays, setCustomDays] = useState("30");

  // Computado inline — sempre fresco a cada render
  const pct = parseFloat(percentage.replace(",", "."));
  let result: TitheCalculateResult | null = null;

  if (pct > 0) {
    const days = parseInt(customDays, 10) || 30;
    const [startDate, endDate] =
      periodType === "previous_month"
        ? previousMonthRange()
        : periodType === "current_month"
          ? currentMonthRange()
          : lastNDaysRange(days);

    const txList = Object.values(domain.transactions);
    const base = calcBase(txList, startDate, endDate, baseType);
    result = { amount: parseFloat((base * (pct / 100)).toFixed(2)), base };
  }

  return {
    percentage, setPercentage,
    baseType, setBaseType,
    periodType, setPeriodType,
    customDays, setCustomDays,
    result,
  };
}
