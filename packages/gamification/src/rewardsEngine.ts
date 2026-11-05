import type { BudgetBreakdown, TransactionPayload, CategoryGroup } from "../../domain/src/transactions";
import { calculate503020 } from "../../domain/src/transactions";
import type {
  FeatureKey,
  LevelReward,
  QuickAnalysisData,
  AnnualReportData,
  MonthSummary,
} from "./types";

export const LEVEL_REWARDS_CONFIG: Array<Omit<LevelReward, "isUnlocked">> = [
  {
    level: 2,
    title: "Análise Rápida: Desejos vs Necessidades",
    description: "Diagnóstico visual instantâneo e proporção entre gastos essenciais e estilo de vida.",
    featureKey: "quick_analysis",
    icon: "pie-chart",
  },
  {
    level: 5,
    title: "Expansão Litúrgica",
    description: "Desbloqueio de novos símbolos nos headers: Terço, Vela da Vigília, Cruz Celta e Coroa Mariana.",
    featureKey: "liturgical_expansion",
    icon: "sun",
  },
  {
    level: 10,
    title: "Relatório Anual & Metas Personalizadas",
    description: "Visão consolidada da evolução dos 12 meses do ano e autonomia para simular novas divisões orçamentárias.",
    featureKey: "annual_report_and_custom_budget",
    icon: "trending-up",
  },
];

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function getLevelRewards(currentLevel: number): LevelReward[] {
  return LEVEL_REWARDS_CONFIG.map((reward) => ({
    ...reward,
    isUnlocked: currentLevel >= reward.level,
  }));
}

export function isFeatureUnlocked(featureKey: FeatureKey, currentLevel: number): boolean {
  const config = LEVEL_REWARDS_CONFIG.find((r) => r.featureKey === featureKey);
  if (!config) return false;
  return currentLevel >= config.level;
}

export function calculateQuickAnalysis(budget: BudgetBreakdown): QuickAnalysisData {
  const { needs, wants, needsPercent, wantsPercent } = budget;
  const hasExpenses = needs > 0 || wants > 0;

  if (!hasExpenses) {
    return {
      status: "empty",
      needsAmount: 0,
      wantsAmount: 0,
      needsPercent: 0,
      wantsPercent: 0,
      ratio: 0,
      ratioFormatted: "R$ 0,00 para R$ 1,00",
      diagnosis: "Sem despesas registradas",
      tip: "Cadastre seus primeiros gastos para acompanhar a proporção entre sobrevivência e estilo de vida.",
    };
  }

  const ratio = needs > 0 ? wants / needs : (wants > 0 ? 2.0 : 0);
  const ratioFormatted = `R$ ${ratio.toFixed(2).replace(".", ",")} em desejos para cada R$ 1,00 em necessidades`;

  if (ratio <= 0.3) {
    return {
      status: "frugal",
      needsAmount: needs,
      wantsAmount: wants,
      needsPercent,
      wantsPercent,
      ratio,
      ratioFormatted,
      diagnosis: "Perfil Frugal e Consciente",
      tip: "Você mantém um controle muito rígido sobre desejos. Se suas metas essenciais e poupança estiverem em dia, permita-se pequenas celebrações sem culpa!",
    };
  }

  if (ratio <= 0.6) {
    return {
      status: "balanced",
      needsAmount: needs,
      wantsAmount: wants,
      needsPercent,
      wantsPercent,
      ratio,
      ratioFormatted,
      diagnosis: "Equilíbrio Saudável",
      tip: "Sua proporção está perfeitamente alinhada com os padrões 50/30/20. Você cuida do presente sem comprometer o essencial.",
    };
  }

  if (ratio <= 1.0) {
    return {
      status: "lifestyle_heavy",
      needsAmount: needs,
      wantsAmount: wants,
      needsPercent,
      wantsPercent,
      ratio,
      ratioFormatted,
      diagnosis: "Estilo de Vida Elevado",
      tip: "Seus gastos de estilo de vida estão próximos aos gastos essenciais. Verifique assinaturas e compras por impulso para evitar apertos futuros.",
    };
  }

  return {
    status: "critical",
    needsAmount: needs,
    wantsAmount: wants,
    needsPercent,
    wantsPercent,
    ratio,
    ratioFormatted,
    diagnosis: "Atenção: Desejos Superam Necessidades",
    tip: "No momento, você gasta mais com supérfluos do que com contas essenciais. Priorize cobrir necessidades e formar uma reserva básica de emergência.",
  };
}

export function calculateAnnualReport(
  transactions: TransactionPayload[],
  categories: Record<string, { group: CategoryGroup }>,
  year: number,
): AnnualReportData {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalSavings = 0;
  let sumAdherence = 0;
  let monthsWithActivity = 0;

  let bestSavingMonth: string | undefined;
  let maxSavings = -1;

  let lowestExpenseMonth: string | undefined;
  let minExpenses = Infinity;

  const months: MonthSummary[] = [];

  for (let m = 0; m < 12; m++) {
    const monthBudget = calculate503020(transactions, categories, m, year);
    const monthExpenses = monthBudget.needs + monthBudget.wants;
    const hasData = monthBudget.needs > 0 || monthBudget.wants > 0 || monthBudget.savings > 0 || monthBudget.totalIncome > 0;

    totalIncome += monthBudget.totalIncome;
    totalExpenses += monthExpenses;
    totalSavings += monthBudget.savings;

    if (hasData) {
      sumAdherence += monthBudget.adherenceScore;
      monthsWithActivity++;

      if (monthBudget.savings > maxSavings && monthBudget.savings > 0) {
        maxSavings = monthBudget.savings;
        bestSavingMonth = MONTH_NAMES[m];
      }

      if (monthExpenses < minExpenses && monthExpenses > 0) {
        minExpenses = monthExpenses;
        lowestExpenseMonth = MONTH_NAMES[m];
      }
    }

    months.push({
      month: m,
      monthName: MONTH_NAMES[m] ?? `Mês ${m + 1}`,
      totalIncome: monthBudget.totalIncome,
      totalExpenses: monthExpenses,
      savings: monthBudget.savings,
      adherenceScore: monthBudget.adherenceScore,
    });
  }

  const averageAdherenceScore = monthsWithActivity > 0 ? Math.round(sumAdherence / monthsWithActivity) : 0;

  return {
    year,
    totalIncome,
    totalExpenses,
    totalSavings,
    averageAdherenceScore,
    bestSavingMonth,
    lowestExpenseMonth,
    months,
  };
}
