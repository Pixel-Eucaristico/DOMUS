import { calculate503020 } from "../../domain/src/transactions";
import type { AppState } from "../../domain/src/state";
import type { BudgetBreakdown } from "../../domain/src/transactions";
import type { GamificationState } from "./types";

export type AchievementRarity = "silver" | "gold" | "diamond";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  rarity: AchievementRarity;
  xpReward: number;
  /** Series this trophy belongs to (for progress tracking & infinite tiers) */
  seriesId?: string;
  /** The metric threshold this specific tier represents */
  seriesTarget?: number;
}

/** Defines a series of related achievements with infinite tier support */
export interface AchievementSeries {
  id: string;
  /** Human-readable label for the progress bar */
  label: string;
  /** Unit suffix shown in progress (e.g. "dias", "transações") */
  unit: string;
  /** All defined thresholds in ascending order */
  thresholds: number[];
  /**
   * Spacing applied beyond the last threshold.
   * e.g. if last threshold = 365 and step = 365, next infinite tiers are 730, 1095…
   */
  infiniteStep: number;
}

// ─── Series definitions ───────────────────────────────────────────────────────

export const ACHIEVEMENT_SERIES: AchievementSeries[] = [
  {
    id: "transactions",
    label: "Transações registradas",
    unit: "transações",
    thresholds: [1, 10, 50, 100, 500],
    infiniteStep: 500,
  },
  {
    id: "streak",
    label: "Dias consecutivos de registro",
    unit: "dias",
    thresholds: [3, 7, 14, 30, 90, 365],
    infiniteStep: 365,
  },
  {
    id: "level",
    label: "Nível alcançado",
    unit: "nível",
    thresholds: [5, 10, 20, 50],
    infiniteStep: 50,
  },
  {
    id: "budget_months",
    label: "Meses com 50/30/20 equilibrado",
    unit: "meses",
    thresholds: [1, 3, 6, 12],
    infiniteStep: 12,
  },
  {
    id: "savings_months",
    label: "Meses com poupança ≥ 20%",
    unit: "meses",
    thresholds: [1, 3],
    infiniteStep: 3,
  },
  {
    id: "wants_months",
    label: "Meses com desejos ≤ 30%",
    unit: "meses",
    thresholds: [1, 3],
    infiniteStep: 3,
  },
  {
    id: "dizimo_months",
    label: "Meses com dízimo registrado",
    unit: "meses",
    thresholds: [1, 3],
    infiniteStep: 3,
  },
];

/**
 * Given a series and a current value, returns the next milestone to reach.
 * Beyond all defined thresholds the same infiniteStep spacing is maintained.
 */
export function getNextSeriesTarget(
  series: AchievementSeries,
  currentValue: number,
): number {
  const next = series.thresholds.find((t) => t > currentValue);
  if (next !== undefined) return next;
  const last = series.thresholds[series.thresholds.length - 1];
  const stepsAbove = Math.floor((currentValue - last) / series.infiniteStep) + 1;
  return last + stepsAbove * series.infiniteStep;
}

// ─── All achievements ─────────────────────────────────────────────────────────

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // ── Existing (preserved with seriesId added) ─────────────────────────────
  {
    id: "first_transaction",
    name: "Primeiros Passos",
    description: "Registrou sua primeira transação.",
    rarity: "silver",
    xpReward: 20,
    seriesId: "transactions",
    seriesTarget: 1,
  },
  {
    id: "ten_transactions",
    name: "Organizador",
    description: "Registrou 10 transações.",
    rarity: "silver",
    xpReward: 30,
    seriesId: "transactions",
    seriesTarget: 10,
  },
  {
    id: "first_dizimo",
    name: "Dizimista Fiel",
    description: "Registrou um dízimo ou oferta.",
    rarity: "gold",
    xpReward: 50,
    seriesId: "dizimo_months",
    seriesTarget: 1,
  },
  {
    id: "streak_7",
    name: "Semana de Ouro",
    description: "Manteve 7 dias consecutivos de registro.",
    rarity: "gold",
    xpReward: 50,
    seriesId: "streak",
    seriesTarget: 7,
  },
  {
    id: "streak_30",
    name: "Mês Perfeito",
    description: "Manteve 30 dias consecutivos de registro.",
    rarity: "diamond",
    xpReward: 150,
    seriesId: "streak",
    seriesTarget: 30,
  },
  {
    id: "budget_ok",
    name: "Guardião do Orçamento",
    description: "Manteve gastos dentro dos limites 50/30/20 por 1 mês.",
    rarity: "gold",
    xpReward: 60,
    seriesId: "budget_months",
    seriesTarget: 1,
  },
  {
    id: "level_5",
    name: "Planejador",
    description: "Alcançou o nível 5.",
    rarity: "gold",
    xpReward: 50,
    seriesId: "level",
    seriesTarget: 5,
  },
  {
    id: "level_10",
    name: "Mestre Financeiro",
    description: "Alcançou o nível 10.",
    rarity: "diamond",
    xpReward: 200,
    seriesId: "level",
    seriesTarget: 10,
  },

  // ── Grupo A — Transações (tiers) ─────────────────────────────────────────
  {
    id: "tx_50",
    name: "Cronista",
    description: "Registrou 50 transações.",
    rarity: "gold",
    xpReward: 60,
    seriesId: "transactions",
    seriesTarget: 50,
  },
  {
    id: "tx_100",
    name: "Historiador Financeiro",
    description: "Registrou 100 transações.",
    rarity: "gold",
    xpReward: 100,
    seriesId: "transactions",
    seriesTarget: 100,
  },
  {
    id: "tx_500",
    name: "Guardião do Livro-Caixa",
    description: "Registrou 500 transações.",
    rarity: "diamond",
    xpReward: 250,
    seriesId: "transactions",
    seriesTarget: 500,
  },

  // ── Grupo B — Streak (tiers) ──────────────────────────────────────────────
  {
    id: "streak_3",
    name: "Faísca",
    description: "3 dias consecutivos de registro — o hábito começa aqui.",
    rarity: "silver",
    xpReward: 20,
    seriesId: "streak",
    seriesTarget: 3,
  },
  {
    id: "streak_14",
    name: "Quinzena Consistente",
    description: "Manteve o hábito por 14 dias seguidos.",
    rarity: "gold",
    xpReward: 80,
    seriesId: "streak",
    seriesTarget: 14,
  },
  {
    id: "streak_90",
    name: "Trimestre Disciplinado",
    description: "90 dias consecutivos de registro financeiro.",
    rarity: "diamond",
    xpReward: 350,
    seriesId: "streak",
    seriesTarget: 90,
  },
  {
    id: "streak_365",
    name: "Lendário",
    description: "Um ano inteiro registrando suas finanças todos os dias.",
    rarity: "diamond",
    xpReward: 1000,
    seriesId: "streak",
    seriesTarget: 365,
  },

  // ── Grupo C — 50/30/20 por duração ───────────────────────────────────────
  {
    id: "budget_3mo",
    name: "Equilíbrio em Série",
    description: "3 meses seguidos com necessidades ≤ 50% e desejos ≤ 30%.",
    rarity: "gold",
    xpReward: 120,
    seriesId: "budget_months",
    seriesTarget: 3,
  },
  {
    id: "budget_6mo",
    name: "Mestre do Equilíbrio",
    description: "6 meses consecutivos dentro da regra 50/30/20.",
    rarity: "diamond",
    xpReward: 300,
    seriesId: "budget_months",
    seriesTarget: 6,
  },
  {
    id: "budget_12mo",
    name: "Arquiteto Financeiro",
    description: "Um ano inteiro com orçamento equilibrado — nível de excelência.",
    rarity: "diamond",
    xpReward: 800,
    seriesId: "budget_months",
    seriesTarget: 12,
  },

  // ── Grupo D — Taxa de poupança ≥ 20% ─────────────────────────────────────
  {
    id: "savings_1mo",
    name: "Primeiro Passo para a Riqueza",
    description: "Poupou 20% ou mais da sua renda em um mês.",
    rarity: "silver",
    xpReward: 60,
    seriesId: "savings_months",
    seriesTarget: 1,
  },
  {
    id: "savings_3mo",
    name: "Poupador Consistente",
    description: "3 meses seguidos poupando ≥ 20% da renda.",
    rarity: "gold",
    xpReward: 150,
    seriesId: "savings_months",
    seriesTarget: 3,
  },
  {
    id: "savings_elite",
    name: "Poupador Elite",
    description: "Poupou 30% ou mais da renda em algum mês — acima da meta.",
    rarity: "gold",
    xpReward: 120,
  },

  // ── Grupo E — Controle de desejos ≤ 30% ──────────────────────────────────
  {
    id: "wants_1mo",
    name: "Autocontrole",
    description: "Manteve gastos com desejos abaixo de 30% em um mês.",
    rarity: "silver",
    xpReward: 40,
    seriesId: "wants_months",
    seriesTarget: 1,
  },
  {
    id: "wants_3mo",
    name: "Disciplina nos Gastos",
    description: "3 meses consecutivos com desejos ≤ 30% da renda.",
    rarity: "gold",
    xpReward: 100,
    seriesId: "wants_months",
    seriesTarget: 3,
  },

  // ── Grupo F — Nível infinito ──────────────────────────────────────────────
  {
    id: "level_20",
    name: "Especialista em Finanças",
    description: "Alcançou o nível 20 — dedicação acima da média.",
    rarity: "diamond",
    xpReward: 400,
    seriesId: "level",
    seriesTarget: 20,
  },
  {
    id: "level_50",
    name: "Grão-Mestre",
    description: "Nível 50 — um marco que poucos atingem.",
    rarity: "diamond",
    xpReward: 1000,
    seriesId: "level",
    seriesTarget: 50,
  },

  // ── Grupo G — Uso completo do app ─────────────────────────────────────────
  {
    id: "first_income",
    name: "Primeiro Salário",
    description: "Registrou sua primeira receita — o ponto de partida.",
    rarity: "silver",
    xpReward: 20,
  },
  {
    id: "five_categories_month",
    name: "Vida Completa",
    description: "Usou 5 categorias diferentes em um único mês.",
    rarity: "silver",
    xpReward: 35,
  },
  {
    id: "positive_balance",
    name: "Sempre no Azul",
    description: "Saldo total positivo com ao menos 5 transações registradas.",
    rarity: "gold",
    xpReward: 80,
  },
  {
    id: "dizimo_3mo",
    name: "Ofertante Fiel",
    description: "Registrou dízimo ou oferta em 3 meses distintos.",
    rarity: "gold",
    xpReward: 100,
    seriesId: "dizimo_months",
    seriesTarget: 3,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns how many consecutive months (going back from last month) satisfy checkFn.
 * Stops at the first month that fails or has no income.
 */
export function getConsecutiveMonthsCompliant(
  domain: AppState,
  checkFn: (b: BudgetBreakdown) => boolean,
): number {
  const now = new Date();
  let count = 0;
  for (let i = 1; i <= 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const b = calculate503020(
      Object.values(domain.transactions),
      domain.categories,
      d.getMonth(),
      d.getFullYear(),
    );
    if (b.totalIncome === 0) break;
    if (!checkFn(b)) break;
    count++;
  }
  return count;
}

function isUnlocked(
  id: string,
  domain: AppState,
  gamification: GamificationState,
  budget: BudgetBreakdown,
): boolean {
  const txList = Object.values(domain.transactions);

  switch (id) {
    // ── Original 8 ────────────────────────────────────────────────────────
    case "first_transaction":
      return txList.length >= 1;

    case "ten_transactions":
      return txList.length >= 10;

    case "first_dizimo":
      return txList.some((tx) => tx.categoryId === "dizimo");

    case "streak_7":
      return gamification.currentStreak >= 7 || gamification.longestStreak >= 7;

    case "streak_30":
      return gamification.currentStreak >= 30 || gamification.longestStreak >= 30;

    case "budget_ok":
      return (
        budget.totalIncome > 0 &&
        budget.needsPercent <= 50 &&
        budget.wantsPercent <= 30
      );

    case "level_5":
      return gamification.level >= 5;

    case "level_10":
      return gamification.level >= 10;

    // ── Grupo A — Transações ──────────────────────────────────────────────
    case "tx_50":  return txList.length >= 50;
    case "tx_100": return txList.length >= 100;
    case "tx_500": return txList.length >= 500;

    // ── Grupo B — Streak ──────────────────────────────────────────────────
    case "streak_3":
      return gamification.currentStreak >= 3 || gamification.longestStreak >= 3;
    case "streak_14":
      return gamification.currentStreak >= 14 || gamification.longestStreak >= 14;
    case "streak_90":
      return gamification.currentStreak >= 90 || gamification.longestStreak >= 90;
    case "streak_365":
      return gamification.currentStreak >= 365 || gamification.longestStreak >= 365;

    // ── Grupo C — 50/30/20 por meses ─────────────────────────────────────
    case "budget_3mo":
      return getConsecutiveMonthsCompliant(
        domain,
        (b) => b.needsPercent <= 50 && b.wantsPercent <= 30 && b.totalIncome > 0,
      ) >= 3;
    case "budget_6mo":
      return getConsecutiveMonthsCompliant(
        domain,
        (b) => b.needsPercent <= 50 && b.wantsPercent <= 30 && b.totalIncome > 0,
      ) >= 6;
    case "budget_12mo":
      return getConsecutiveMonthsCompliant(
        domain,
        (b) => b.needsPercent <= 50 && b.wantsPercent <= 30 && b.totalIncome > 0,
      ) >= 12;

    // ── Grupo D — Poupança ────────────────────────────────────────────────
    case "savings_1mo":
      return budget.savingsPercent >= 20 && budget.totalIncome > 0;
    case "savings_3mo":
      return getConsecutiveMonthsCompliant(
        domain,
        (b) => b.savingsPercent >= 20 && b.totalIncome > 0,
      ) >= 3;
    case "savings_elite":
      return (
        (budget.savingsPercent >= 30 && budget.totalIncome > 0) ||
        getConsecutiveMonthsCompliant(
          domain,
          (b) => b.savingsPercent >= 30 && b.totalIncome > 0,
        ) >= 1
      );

    // ── Grupo E — Desejos ─────────────────────────────────────────────────
    case "wants_1mo":
      return budget.wantsPercent <= 30 && budget.totalIncome > 0;
    case "wants_3mo":
      return getConsecutiveMonthsCompliant(
        domain,
        (b) => b.wantsPercent <= 30 && b.totalIncome > 0,
      ) >= 3;

    // ── Grupo F — Nível ───────────────────────────────────────────────────
    case "level_20": return gamification.level >= 20;
    case "level_50": return gamification.level >= 50;

    // ── Grupo G — Uso completo ────────────────────────────────────────────
    case "first_income":
      return txList.some((tx) => tx.type === "income");

    case "five_categories_month": {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const cats = new Set(
        txList
          .filter((tx) => tx.date.startsWith(ym) && tx.categoryId)
          .map((tx) => tx.categoryId as string),
      );
      return cats.size >= 5;
    }

    case "positive_balance": {
      const accounts = (domain as any).accounts ?? {};
      const totalBal = Object.values(accounts).reduce(
        (s: number, a: any) => s + (a.balance ?? 0),
        0,
      );
      return totalBal > 0 && txList.length >= 5;
    }

    case "dizimo_3mo": {
      const months = new Set(
        txList
          .filter((tx) => tx.categoryId === "dizimo")
          .map((tx) => tx.date.slice(0, 7)),
      );
      return months.size >= 3;
    }

    default:
      return false;
  }
}

export function checkNewAchievements(
  domain: AppState,
  gamification: GamificationState,
  budget: BudgetBreakdown,
  alreadyUnlocked: Set<string>,
): Achievement[] {
  return ALL_ACHIEVEMENTS.filter(
    (ach) =>
      !alreadyUnlocked.has(ach.id) &&
      isUnlocked(ach.id, domain, gamification, budget),
  );
}

// ─── Monthly Trophies ("Desafios do Mês") ─────────────────────────────────────

export interface MonthlyTrophyProgress {
  current: number;
  target: number;
  unit: string;
}

export interface MonthlyTrophy {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  /** Emoji/icon hint for display */
  icon: string;
  /** Returns whether the challenge is completed for the given monthKey (YYYY-MM) */
  check: (domain: AppState, budget: BudgetBreakdown, monthKey: string) => boolean;
  /** Returns progress info for the progress bar */
  progress: (domain: AppState, budget: BudgetBreakdown, monthKey: string) => MonthlyTrophyProgress;
}

export const MONTHLY_TROPHIES: MonthlyTrophy[] = [
  {
    id: "monthly_registros",
    name: "Registrador do Mês",
    description: "Registre pelo menos 10 transações neste mês.",
    xpReward: 30,
    icon: "📝",
    check: (domain, _budget, monthKey) => {
      const txList = Object.values(domain.transactions);
      return txList.filter(tx => tx.date.startsWith(monthKey)).length >= 10;
    },
    progress: (domain, _budget, monthKey) => {
      const txList = Object.values(domain.transactions);
      const count = txList.filter(tx => tx.date.startsWith(monthKey)).length;
      return { current: Math.min(count, 10), target: 10, unit: "transações" };
    },
  },
  {
    id: "monthly_equilibrado",
    name: "Mês Equilibrado",
    description: "Mantenha necessidades ≤ 50%, desejos ≤ 30% e poupança ≥ 20% este mês.",
    xpReward: 50,
    icon: "⚖️",
    check: (_domain, budget) => {
      return (
        budget.totalIncome > 0 &&
        budget.needsPercent <= 50 &&
        budget.wantsPercent <= 30 &&
        budget.savingsPercent >= 20
      );
    },
    progress: (domain, budget) => {
      // Score each of 3 rules
      const rules = [
        budget.needsPercent <= 50,
        budget.wantsPercent <= 30,
        budget.savingsPercent >= 20,
      ];
      const completed = rules.filter(Boolean).length;
      return { current: completed, target: 3, unit: "regras" };
    },
  },
  {
    id: "monthly_poupanca",
    name: "Poupança do Mês",
    description: "Poupe 20% ou mais da sua renda este mês.",
    xpReward: 40,
    icon: "💰",
    check: (_domain, budget) => budget.totalIncome > 0 && budget.savingsPercent >= 20,
    progress: (_domain, budget) => ({
      current: Math.min(Math.round(budget.savingsPercent), 20),
      target: 20,
      unit: "%",
    }),
  },
  {
    id: "monthly_controle",
    name: "Controle Total",
    description: "Mantenha gastos com desejos abaixo de 30% este mês.",
    xpReward: 35,
    icon: "🛡️",
    check: (_domain, budget) => budget.totalIncome > 0 && budget.wantsPercent <= 30,
    progress: (_domain, budget) => {
      // Invert: progress = how close to staying under 30%
      const used = Math.min(Math.round(budget.wantsPercent), 30);
      return { current: 30 - used, target: 30, unit: "% folga" };
    },
  },
  {
    id: "monthly_dizimo",
    name: "Oferta Mensal",
    description: "Registre pelo menos um dízimo ou oferta neste mês.",
    xpReward: 45,
    icon: "🙏",
    check: (domain, _budget, monthKey) => {
      const txList = Object.values(domain.transactions);
      return txList.some(tx => tx.categoryId === "dizimo" && tx.date.startsWith(monthKey));
    },
    progress: (domain, _budget, monthKey) => {
      const txList = Object.values(domain.transactions);
      const found = txList.some(tx => tx.categoryId === "dizimo" && tx.date.startsWith(monthKey));
      return { current: found ? 1 : 0, target: 1, unit: "registro" };
    },
  },
  {
    id: "monthly_saldo_positivo",
    name: "No Azul",
    description: "Feche o mês com renda maior que as despesas.",
    xpReward: 40,
    icon: "📈",
    check: (_domain, budget) => budget.totalIncome > 0 && budget.savingsPercent > 0,
    progress: (_domain, budget) => {
      const pct = Math.max(0, Math.min(Math.round(budget.savingsPercent), 100));
      return { current: pct > 0 ? 1 : 0, target: 1, unit: "meta" };
    },
  },
];

/**
 * Returns which monthly trophies are newly completed this month
 * but haven't been recorded yet.
 */
export function checkNewMonthlyTrophies(
  domain: AppState,
  budget: BudgetBreakdown,
  alreadyCompleted: Array<{ id: string; monthKey: string }>,
): MonthlyTrophy[] {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const doneSet = new Set(alreadyCompleted.map(c => `${c.id}:${c.monthKey}`));

  return MONTHLY_TROPHIES.filter(trophy => {
    if (doneSet.has(`${trophy.id}:${monthKey}`)) return false;
    return trophy.check(domain, budget, monthKey);
  });
}
