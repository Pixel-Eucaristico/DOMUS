import { useMemo } from "react";
import { useAppState } from "@/src/context/AppStateProvider";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type TransactionCategory } from "@/src/constants/transactionCategories";
import type { TransactionType } from "@packages/events/src/types";

/**
 * Hook inteligente para sugerir categorias baseadas no histórico.
 */
export function useCategoryIntelligence(type: TransactionType) {
  const { domain } = useAppState();

  const suggestedCategories = useMemo(() => {
    // Pegar todas as transações do tipo atual
    const txs = Object.values(domain.transactions).filter(t => t.type === type);
    
    // Contar frequência de cada categoria
    const counts: Record<string, number> = {};
    txs.forEach(t => {
      counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
    });

    // Ordenar categorias pela frequência
    const sortedIds = Object.keys(counts).sort((a, b) => counts[b]! - counts[a]!);
    
    // Pegar os objetos de categoria correspondentes
    const allPool = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const top3 = sortedIds
      .map(id => allPool.find(c => c.id === id))
      .filter((c): c is TransactionCategory => !!c)
      .slice(0, 3);

    return top3;
  }, [domain.transactions, type]);

  return { suggestedCategories };
}
