import type { BudgetBreakdown } from "../../domain/src/transactions";
import type { XpSource, XpGainedPayload, BudgetFeedback } from "./types";

const XP_TABLE: Record<XpSource, number> = {
  transaction_logged: 5,
  budget_adherence: 10,
  mission_completed: 30,
  daily_consistency: 10,
  streak_bonus: 15,
  season_bonus: 50,
};

export function getXpForAction(source: XpSource): number {
  return XP_TABLE[source] ?? 0;
}

export function calculateBudgetAdherenceXp(
  budget: BudgetBreakdown,
  previousBudget?: BudgetBreakdown,
): number {
  const { needsPercent, wantsPercent, savingsPercent, totalIncome } = budget;

  // If no transactions at all, no XP.
  if (budget.needs === 0 && budget.wants === 0 && budget.savings === 0 && totalIncome === 0) {
    return 0;
  }

  let xp = 0;

  // 1. Financial Health Bonus: If user is within BOTH spending limits, give a small bonus.
  if (needsPercent <= 50 && wantsPercent <= 30) {
    xp += 5; // Balanced bonus for staying in control
  }

  // 2. Reward for Savings (Goal is >= 20%)
  if (savingsPercent >= 20) {
    const extra = savingsPercent - 20;
    xp += 10; // Base reward for meeting the goal
    xp += Math.floor(extra / 2); // 1 XP for every 2% extra saved
  } else if (budget.savings > 0) {
    // Small bonus for ANY categorized savings
    xp += 3;
  }

  // 3. Monthly Improvement Bonus:
  // If previous budget exists and current month improved adherence
  if (
    previousBudget &&
    (previousBudget.needs > 0 || previousBudget.wants > 0 || previousBudget.savings > 0 || previousBudget.totalIncome > 0)
  ) {
    if (budget.adherenceScore > previousBudget.adherenceScore) {
      xp += 5; // +5 XP bonus for month-over-month improvement
    }
  }

  // Penalties removed in Tarefa 17: overspending in Needs (>50%) or Wants (>30%)
  // never deducts XP. Minimum XP is always 0.
  return Math.max(0, Math.round(xp));
}

export function getBudgetFeedback(
  budget: BudgetBreakdown,
  previousBudget?: BudgetBreakdown,
): BudgetFeedback {
  const { needsPercent, wantsPercent, savingsPercent, totalIncome } = budget;
  const hasData = budget.needs > 0 || budget.wants > 0 || budget.savings > 0 || totalIncome > 0;

  if (!hasData) {
    return {
      status: "empty",
      title: "Sem registros no mês",
      message: "Comece a registrar suas receitas e despesas para acompanhar seu orçamento 50/30/20.",
      tips: ["Cadastre despesas fixas como moradia e contas no grupo Necessidades."],
      improved: false,
    };
  }

  const hasPrevious = !!(
    previousBudget &&
    (previousBudget.needs > 0 || previousBudget.wants > 0 || previousBudget.savings > 0 || previousBudget.totalIncome > 0)
  );
  const improved = hasPrevious && budget.adherenceScore > previousBudget.adherenceScore;

  const isBalanced = needsPercent <= 50 && wantsPercent <= 30;
  const isSavingsGoalMet = savingsPercent >= 20;

  if (isBalanced && isSavingsGoalMet) {
    return {
      status: "perfect",
      title: "Orçamento em Perfeito Equilíbrio!",
      message: "Parabéns! Suas finanças estão exatamente alinhadas com a regra 50/30/20.",
      tips: ["Mantenha a consistência nos próximos meses para acumular bônus de streak."],
      improved,
    };
  }

  if (isBalanced) {
    return {
      status: "good",
      title: "Gastos sob Controle",
      message: "Suas necessidades e desejos estão dentro das metas! Seu próximo passo é alcançar 20% em poupança.",
      tips: ["Tente direcionar uma fatia maior de receitas para a reserva de emergência ou investimentos."],
      improved,
    };
  }

  // Needs attention: overspent in needs (>50%) or wants (>30%)
  const overspentParts: string[] = [];
  if (needsPercent > 50) overspentParts.push(`Necessidades (${needsPercent}% / meta 50%)`);
  if (wantsPercent > 30) overspentParts.push(`Desejos (${wantsPercent}% / meta 30%)`);

  return {
    status: "needs_attention",
    title: "Atenção ao Equilíbrio 50/30/20",
    message: `Os gastos com ${overspentParts.join(" e ")} ultrapassaram a meta sugerida. Não há desconto de pontos — aproveite para calibrar seus próximos dias!`,
    tips: [
      "A regra 50/30/20 recomenda destinar até 50% para despesas essenciais, 30% para lazer e 20% para o futuro.",
      "Revisar assinaturas e gastos de impulso é uma ótima forma de recuperar o equilíbrio sem sacrifícios.",
    ],
    improved,
  };
}

export function calculateStreakBonusXp(currentStreak: number): number {
  if (currentStreak >= 30) return 50;
  if (currentStreak >= 14) return 30;
  if (currentStreak >= 7) return 20;
  if (currentStreak >= 3) return 10;
  return 0;
}

export function createXpPayload(
  source: XpSource,
  overrideAmount?: number,
  seasonId?: string,
): XpGainedPayload {
  return {
    amount: overrideAmount ?? getXpForAction(source),
    source,
    seasonId,
  };
}
