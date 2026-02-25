import type { StreakUpdatedPayload } from "./types";

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(a: string, b: string): number {
  const dateA = parseDate(a);
  const dateB = parseDate(b);
  const diffMs = Math.abs(dateB.getTime() - dateA.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
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
  return diff <= 1;
}
