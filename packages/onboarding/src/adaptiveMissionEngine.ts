import type { DifficultyLevel, OnboardingState } from "./types";

export interface AdaptiveResult {
  shouldAdjust: boolean;
  newDifficulty: DifficultyLevel;
  reason: string;
}

export function evaluatePerformance(state: OnboardingState): AdaptiveResult {
  if (state.currentDay < 3) {
    return { shouldAdjust: false, newDifficulty: state.difficulty, reason: "" };
  }

  const expectedDays = state.currentDay - 1;
  const completionRate =
    expectedDays > 0 ? state.completedDays.length / expectedDays : 0;

  if (completionRate < 0.4 && state.difficulty !== "easy") {
    return {
      shouldAdjust: true,
      newDifficulty: "easy",
      reason: "Ajustando para facilitar - sem pressao, no seu ritmo",
    };
  }

  if (completionRate < 0.6 && state.difficulty === "challenging") {
    return {
      shouldAdjust: true,
      newDifficulty: "normal",
      reason: "Reduzindo intensidade para manter motivacao",
    };
  }

  if (completionRate >= 0.9 && state.difficulty === "easy" && state.currentDay >= 4) {
    return {
      shouldAdjust: true,
      newDifficulty: "normal",
      reason: "Voce esta indo muito bem! Aumentando o desafio",
    };
  }

  if (completionRate >= 0.95 && state.difficulty === "normal" && state.currentDay >= 5) {
    return {
      shouldAdjust: true,
      newDifficulty: "challenging",
      reason: "Excelente progresso! Vamos acelerar",
    };
  }

  return { shouldAdjust: false, newDifficulty: state.difficulty, reason: "" };
}

export function shouldNeverPunish(): boolean {
  return true;
}

export function getEncouragementMessage(
  completionRate: number,
  difficulty: DifficultyLevel,
): string {
  if (completionRate >= 0.9) return "Fantastico! Voce esta arrasando!";
  if (completionRate >= 0.7) return "Muito bem! Continue assim!";
  if (completionRate >= 0.5) return "Bom progresso! Cada passo conta!";
  if (completionRate >= 0.3) return "Sem pressa! O importante e comecar.";
  return "Estamos aqui para ajudar. Um passo de cada vez!";
}
