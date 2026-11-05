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
