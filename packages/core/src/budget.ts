import type { Transaction, Category, BudgetBreakdown, CategoryGroup } from "./types";

export function calculate503020(
  transactions: Transaction[],
  categories: Category[],
  month: number,
  year: number,
): BudgetBreakdown {
  const categoryMap = new Map<string, CategoryGroup>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat.group);
  }

  let needs = 0;
  let wants = 0;
  let savings = 0;

  const monthExpenses = transactions.filter((t) => {
    if (t.type !== "expense") return false;
    const txDate = t.date instanceof Date ? t.date : new Date(t.date);
    return txDate.getMonth() === month && txDate.getFullYear() === year;
  });

  for (const tx of monthExpenses) {
    const group = categoryMap.get(tx.categoryId);
    switch (group) {
      case "needs":
        needs += tx.amount;
        break;
      case "wants":
        wants += tx.amount;
        break;
      case "savings":
        savings += tx.amount;
        break;
      default:
        wants += tx.amount;
        break;
    }
  }

  const total = needs + wants + savings;

  return {
    needs,
    wants,
    savings,
    needsPercent: total > 0 ? Math.round((needs / total) * 100) : 0,
    wantsPercent: total > 0 ? Math.round((wants / total) * 100) : 0,
    savingsPercent: total > 0 ? Math.round((savings / total) * 100) : 0,
  };
}

export function getIdeal503020(totalIncome: number): BudgetBreakdown {
  return {
    needs: totalIncome * 0.5,
    wants: totalIncome * 0.3,
    savings: totalIncome * 0.2,
    needsPercent: 50,
    wantsPercent: 30,
    savingsPercent: 20,
  };
}
