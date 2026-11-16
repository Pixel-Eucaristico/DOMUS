import type { StreakUpdatedPayload } from "./types";

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

function toDays(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Usa UTC em milissegundos para obter dias exatos sem influência de fusos ou horário de verão
  return Math.floor(Date.UTC(y!, m! - 1, d!) / (1000 * 60 * 60 * 24));
}

function daysBetween(a: string, b: string): number {
  return toDays(b) - toDays(a);
}

export function updateStreak(
  current: StreakState,
  activeDate: string,
): StreakUpdatedPayload {
  if (!current.lastActiveDate) {
    return {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: activeDate,
      broken: false,
    };
  }

  if (current.lastActiveDate === activeDate) {
    return {
      currentStreak: current.currentStreak,
      longestStreak: current.longestStreak,
      lastActiveDate: current.lastActiveDate,
      broken: false,
    };
  }

  // Datas retroativas não alteram nem quebram o streak existente
  if (activeDate < current.lastActiveDate) {
    return {
      currentStreak: current.currentStreak,
      longestStreak: current.longestStreak,
      lastActiveDate: current.lastActiveDate,
      broken: false,
    };
  }

  const diff = daysBetween(current.lastActiveDate, activeDate);

  if (diff === 1) {
    const newStreak = current.currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, current.longestStreak),
      lastActiveDate: activeDate,
      broken: false,
    };
  }

  return {
    currentStreak: 1,
    longestStreak: current.longestStreak,
    lastActiveDate: activeDate,
    broken: true,
  };
}

export function createInitialStreak(): StreakState {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: "",
  };
}

export function isStreakActive(
  lastActiveDate: string,
  todayDate: string,
): boolean {
  if (!lastActiveDate) return false;
  const diff = daysBetween(lastActiveDate, todayDate);
  return diff >= 0 && diff <= 1;
}

export interface StreakTransactionInput {
  date?: string;
  status?: string;
}

const CIVIL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidCivilDate(dateStr: string): boolean {
  if (typeof dateStr !== "string" || !CIVIL_DATE_RE.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (m! < 1 || m! > 12 || d! < 1 || d! > 31) return false;
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m! - 1 &&
    dt.getUTCDate() === d
  );
}

/**
 * Deriva `currentStreak`, `longestStreak` e `lastActiveDate` a partir de uma lista
 * de datas civis (`YYYY-MM-DD`), deduplicando o mesmo dia e ordenando em UTC.
 * Datas malformadas são ignoradas sem lançar erro.
 */
export function calculateStreakFromDates(dates: readonly string[]): StreakState {
  if (!dates) return createInitialStreak();
  const uniqueDates = new Set<string>();
  for (const d of dates) {
    if (isValidCivilDate(d)) {
      uniqueDates.add(d);
    }
  }

  if (uniqueDates.size === 0) {
    return createInitialStreak();
  }

  const sorted = Array.from(uniqueDates).sort();
  let currentStreak = 1;
  let longestStreak = 1;
  let lastActiveDate = sorted[0]!;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (daysBetween(prev, curr) === 1) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }
    lastActiveDate = curr;
  }

  return {
    currentStreak,
    longestStreak,
    lastActiveDate,
  };
}

/**
 * Deriva o streak diretamente das transações confirmadas (`!status || status === "confirmed"`).
 */
export function calculateStreakFromTransactions(
  transactions:
    | readonly StreakTransactionInput[]
    | Readonly<Record<string, StreakTransactionInput>>,
): StreakState {
  if (!transactions) return createInitialStreak();
  const list = Array.isArray(transactions)
    ? transactions
    : Object.values(transactions);
  const dates: string[] = [];
  for (const tx of list) {
    if (!tx) continue;
    if (tx.status && tx.status !== "confirmed") continue;
    if (typeof tx.date === "string") {
      dates.push(tx.date);
    }
  }
  return calculateStreakFromDates(dates);
}
