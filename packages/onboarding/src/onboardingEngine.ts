import type {
  DayMission,
  DifficultyLevel,
  OnboardingStep,
  OnboardingState,
} from "./types";
import { ONBOARDING_STEPS } from "./types";

const MISSIONS_NORMAL: DayMission[] = [
  {
    day: 1,
    steps: [ONBOARDING_STEPS.CREATE_ACCOUNT],
    description: "Crie sua primeira conta bancaria",
  },
  {
    day: 2,
    steps: [ONBOARDING_STEPS.SET_INCOME],
    description: "Registre sua renda mensal",
  },
  {
    day: 3,
    steps: [ONBOARDING_STEPS.LOG_EXPENSE],
    description: "Registre um gasto do dia",
  },
  {
    day: 4,
    steps: [ONBOARDING_STEPS.REVIEW_BUDGET],
    description: "Revise seu orcamento 50/30/20",
  },
  {
    day: 5,
    steps: [ONBOARDING_STEPS.SET_GOAL],
    description: "Defina uma meta financeira",
  },
  {
    day: 6,
    steps: [ONBOARDING_STEPS.LOG_3_TRANSACTIONS],
    description: "Registre 3 transacoes do dia",
  },
  {
    day: 7,
    steps: [ONBOARDING_STEPS.CHECK_503020],
    description: "Verifique sua aderencia ao 50/30/20",
  },
];

const MISSIONS_EASY: DayMission[] = [
  {
    day: 1,
    steps: [ONBOARDING_STEPS.CREATE_ACCOUNT],
    description: "Crie sua primeira conta",
  },
  {
    day: 2,
    steps: [ONBOARDING_STEPS.SET_INCOME],
    description: "Informe quanto voce ganha",
  },
  {
    day: 3,
    steps: [ONBOARDING_STEPS.LOG_EXPENSE],
    description: "Anote um gasto qualquer",
  },
  {
    day: 4,
    steps: [ONBOARDING_STEPS.LOG_EXPENSE],
    description: "Anote mais um gasto",
  },
  {
    day: 5,
    steps: [ONBOARDING_STEPS.REVIEW_BUDGET],
    description: "Veja como esta seu orcamento",
  },
  {
    day: 6,
    steps: [ONBOARDING_STEPS.SET_GOAL],
    description: "Pense em uma meta simples",
  },
  {
    day: 7,
    steps: [ONBOARDING_STEPS.CHECK_503020],
    description: "Confira sua divisao de gastos",
  },
];

const MISSIONS_CHALLENGING: DayMission[] = [
  {
    day: 1,
    steps: [ONBOARDING_STEPS.CREATE_ACCOUNT, ONBOARDING_STEPS.SET_INCOME],
    description: "Crie conta e registre renda",
  },
  {
    day: 2,
    steps: [ONBOARDING_STEPS.LOG_EXPENSE, ONBOARDING_STEPS.LOG_EXPENSE],
    description: "Registre pelo menos 2 gastos",
  },
  {
    day: 3,
    steps: [ONBOARDING_STEPS.REVIEW_BUDGET],
    description: "Analise seu orcamento atual",
  },
  {
    day: 4,
    steps: [ONBOARDING_STEPS.SET_GOAL, ONBOARDING_STEPS.LOG_EXPENSE],
    description: "Defina meta e registre gastos",
  },
  {
    day: 5,
    steps: [ONBOARDING_STEPS.LOG_3_TRANSACTIONS],
    description: "Registre todas as transacoes do dia",
  },
  {
    day: 6,
    steps: [ONBOARDING_STEPS.CHECK_503020],
    description: "Avalie sua aderencia ao 50/30/20",
  },
  {
    day: 7,
    steps: [ONBOARDING_STEPS.CHECK_503020, ONBOARDING_STEPS.REVIEW_BUDGET],
    description: "Revisao completa do mes",
  },
];

export function getMissionsForDifficulty(
  difficulty: DifficultyLevel,
): DayMission[] {
  switch (difficulty) {
    case "easy":
      return MISSIONS_EASY;
    case "challenging":
      return MISSIONS_CHALLENGING;
    default:
      return MISSIONS_NORMAL;
  }
}

export function getMissionForDay(
  day: number,
  difficulty: DifficultyLevel,
): DayMission | null {
  const missions = getMissionsForDifficulty(difficulty);
  return missions.find((m) => m.day === day) ?? null;
}

export function getCurrentDay(startDate: string, today: string): number {
  const start = new Date(startDate);
  const current = new Date(today);
  const diffMs = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(diffDays + 1, 1), 7);
}

export function isOnboardingComplete(state: OnboardingState): boolean {
  return state.finished || state.completedDays.length >= 7;
}

export function getDayProgress(
  state: OnboardingState,
  day: number,
): { completed: number; total: number; percent: number } {
  const mission = getMissionForDay(day, state.difficulty);
  if (!mission) return { completed: 0, total: 0, percent: 0 };

  const completedForDay = mission.steps.filter((step) =>
    state.completedSteps.includes(step),
  ).length;

  return {
    completed: completedForDay,
    total: mission.steps.length,
    percent:
      mission.steps.length > 0
        ? Math.round((completedForDay / mission.steps.length) * 100)
        : 0,
  };
}

export function getOverallProgress(state: OnboardingState): number {
  return Math.round((state.completedDays.length / 7) * 100);
}
