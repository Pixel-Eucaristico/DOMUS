import type {
  TransactionPayload,
  CategoryPayload,
} from "../../../events/src/types";
import type {
  MonthlySummary,
  ConsultationResult,
  FinancialSnapshot,
  UserProfile,
  ConsultationDecision,
  ConsultationRisk,
} from "../types";

// ─── Keyword Dictionary (Portuguese + English) ────────────────────────────────

const KEYWORD_MAP: Record<string, string[]> = {
  alimentação: [
    "mercado", "supermercado", "padaria", "restaurante", "lanchonete",
    "ifood", "rappi", "uber eats", "ubereats", "burger", "pizza", "sushi",
    "comida", "almoço", "jantar", "café", "cafeteria", "hortifruti",
    "açougue", "sorveteria", "doces", "bakery", "food", "lunch", "dinner",
  ],
  transporte: [
    "uber", "99pop", "99taxi", "gasolina", "combustível", "combustivel",
    "posto", "estacionamento", "pedágio", "pedagio", "metrô", "metro",
    "ônibus", "onibus", "transporte", "táxi", "taxi", "carshare",
    "bike", "patinete", "parking", "fuel", "gas station",
  ],
  moradia: [
    "aluguel", "condomínio", "condominio", "iptu", "energia", "luz",
    "água", "agua", "gás", "gas", "internet", "tv a cabo", "reforma",
    "manutenção", "manutencao", "faxina", "limpeza", "móveis", "moveis",
    "rent", "utilities", "cleaning",
  ],
  saúde: [
    "farmácia", "farmacia", "médico", "medico", "hospital", "exame",
    "plano de saúde", "plano saude", "dentista", "remédio", "remedio",
    "consulta", "ortopedista", "psicólogo", "psicologo", "academia",
    "pharmacy", "doctor", "health", "medicine", "gym",
  ],
  lazer: [
    "cinema", "teatro", "show", "netflix", "spotify", "amazon prime",
    "disney", "hbo", "globo play", "jogos", "game", "viagem", "hotel",
    "resort", "pousada", "parque", "museu", "barzinho", "balada",
    "entertainment", "travel", "movie",
  ],
  vestuário: [
    "roupa", "sapato", "tênis", "tenis", "vestuário", "vestuario",
    "calçado", "calcado", "camiseta", "calça", "calca", "vestido",
    "moda", "loja", "boutique", "zara", "renner", "c&a", "riachuelo",
    "clothes", "shoes", "fashion",
  ],
  educação: [
    "escola", "faculdade", "curso", "livro", "material escolar",
    "mensalidade", "universidade", "pós", "pos", "idiomas", "coworking",
    "workshop", "certificação", "certificacao", "book", "education",
  ],
  tecnologia: [
    "celular", "smartphone", "computador", "notebook", "tablet",
    "acessório", "acessorio", "eletrônico", "eletronico", "apple",
    "samsung", "kabum", "pichau", "info", "tech", "software",
    "assinatura", "subscription",
  ],
};

// ─── FinancialAnalysisEngine ──────────────────────────────────────────────────

export class FinancialAnalysisEngine {
  /**
   * Generates a complete monthly summary using only local deterministic logic.
   * Insights are rule-based strings in Portuguese.
   */
  static generateMonthlySummary(
    transactions: TransactionPayload[],
    categories: Record<string, CategoryPayload>,
    month: string,
  ): MonthlySummary {
    const monthTxs = transactions.filter(
      (t) => t.status !== "pending" && t.date?.startsWith(month),
    );

    const totalIncome = monthTxs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);

    const totalExpenses = monthTxs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    const savingsRate =
      totalIncome > 0
        ? Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100)
        : 0;

    // Top expense categories
    const byCat = new Map<string, number>();
    for (const tx of monthTxs.filter((t) => t.type === "expense")) {
      const name = categories[tx.categoryId]?.name ?? "Outros";
      byCat.set(name, (byCat.get(name) ?? 0) + tx.amount);
    }
    const topExpenseCategories = Array.from(byCat.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    // Budget adherence: penalise overspend
    let budgetAdherence = 100;
    if (totalIncome > 0) {
      const ratio = totalExpenses / totalIncome;
      if (ratio > 1) budgetAdherence = 0;
      else if (ratio > 0.8) budgetAdherence = Math.round((1 - ratio) * 500);
      else budgetAdherence = Math.round((1 - ratio / 0.8) * 100);
      budgetAdherence = Math.max(0, Math.min(100, budgetAdherence));
    }

    const insights = FinancialAnalysisEngine.buildInsights(
      totalIncome,
      totalExpenses,
      savingsRate,
      topExpenseCategories,
    );

    return {
      month,
      totalIncome,
      totalExpenses,
      savingsRate,
      topExpenseCategories,
      budgetAdherence,
      insights,
      isLocalFallback: true,
    };
  }

  /**
   * Simulates the balance impact of buying an item at `itemPrice`.
   */
  static simulatePurchaseImpact(
    snapshot: FinancialSnapshot,
    itemPrice: number,
  ): {
    projectedBalance: number;
    monthsToSave: number;
    canAffordNow: boolean;
    safeToSpend: number;
  } {
    const monthlySurplus = Math.max(
      0,
      snapshot.monthlyIncome - snapshot.monthlyExpenses,
    );
    // "safe to spend" = 20% of monthly surplus (leaves savings room)
    const safeToSpend = monthlySurplus * 0.2;
    const projectedBalance = snapshot.totalBalance - itemPrice;
    const canAffordNow =
      projectedBalance >= 0 && snapshot.totalBalance >= itemPrice;

    const monthsToSave =
      monthlySurplus > 0 ? Math.ceil(itemPrice / monthlySurplus) : 999;

    return {
      projectedBalance,
      monthsToSave,
      canAffordNow,
      safeToSpend,
    };
  }

  /**
   * Deterministic fallback for ConsultationResult.
   * Decision rules:
   *   - canAffordNow && savingsRate >= 20  → Buy, Low
   *   - canAffordNow && savingsRate < 20   → Delay, Medium
   *   - monthsToSave <= 3                  → Delay, Medium
   *   - else                               → Avoid, High
   */
  static generateFallbackConsultation(
    snapshot: FinancialSnapshot,
    profile: UserProfile,
    itemPrice: number,
  ): ConsultationResult {
    const impact = FinancialAnalysisEngine.simulatePurchaseImpact(
      snapshot,
      itemPrice,
    );

    let decision: ConsultationDecision;
    let risk: ConsultationRisk;
    let recommendation: string;
    let behaviorInsight: string;
    let confidence: number;

    if (impact.canAffordNow && snapshot.savingsRate >= 20) {
      decision = "Buy";
      risk = "Low";
      recommendation = "Saldo e taxa de poupança permitem essa compra com segurança.";
      behaviorInsight = "Você mantém bom controle financeiro. Compra dentro dos limites seguros.";
      confidence = 0.82;
    } else if (impact.canAffordNow && snapshot.savingsRate < 20) {
      decision = "Delay";
      risk = "Medium";
      recommendation = `Aguarde ${Math.min(impact.monthsToSave, 2)} mês(es) para aumentar a reserva antes de comprar.`;
      behaviorInsight = "Taxa de poupança abaixo de 20%. Fortaleça a reserva primeiro.";
      confidence = 0.75;
    } else if (impact.monthsToSave <= 3) {
      decision = "Delay";
      risk = "Medium";
      recommendation = `Em ${impact.monthsToSave} mês(es) você terá o valor necessário poupando o excedente mensal.`;
      behaviorInsight = "Objetivo próximo. Vale esperar para não comprometer o orçamento.";
      confidence = 0.78;
    } else {
      decision = "Avoid";
      risk = "High";
      recommendation = `Compra comprometeria o orçamento. Considere opções mais baratas ou prazo maior.`;
      behaviorInsight =
        profile.impulseScore > 60
          ? "Padrão de compras impulsivas detectado. Revise antes de decidir."
          : "Sem saldo suficiente e prazo longo para acumular o valor.";
      confidence = 0.7;
    }

    return {
      decision,
      risk,
      recommendation,
      behaviorInsight,
      confidence,
      isLocalFallback: true,
      tokensUsed: 0,
    };
  }

  /**
   * Rule-based local transaction classification.
   * Returns the best matching category or null if no confident match.
   */
  static classifyTransactionLocally(
    description: string,
    availableCategories: CategoryPayload[],
  ): { categoryId: string; confidence: number } | null {
    const lower = description.toLowerCase();

    for (const [domainName, keywords] of Object.entries(KEYWORD_MAP)) {
      const matched = keywords.filter((kw) => lower.includes(kw));
      if (matched.length === 0) continue;

      // Find the best matching category by name similarity
      const cat = availableCategories.find(
        (c) =>
          c.name.toLowerCase().includes(domainName) ||
          domainName.includes(c.name.toLowerCase()),
      );

      if (cat) {
        const confidence = Math.min(0.95, 0.6 + matched.length * 0.1);
        return { categoryId: cat.id, confidence };
      }
    }

    return null;
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private static buildInsights(
    income: number,
    expenses: number,
    savingsRate: number,
    topCats: Array<{ name: string; amount: number }>,
  ): string[] {
    const insights: string[] = [];

    if (income === 0) {
      insights.push("Nenhuma receita registrada neste mês.");
      return insights;
    }

    if (savingsRate >= 20) {
      insights.push(
        `✓ Taxa de poupança de ${Math.round(savingsRate)}% — acima da meta de 20%.`,
      );
    } else if (savingsRate > 0) {
      insights.push(
        `⚠ Taxa de poupança de ${Math.round(savingsRate)}% — abaixo da meta de 20%.`,
      );
    } else {
      insights.push("✗ Gastos superaram as receitas neste mês.");
    }

    const ratio = income > 0 ? (expenses / income) * 100 : 0;
    if (ratio > 90) {
      insights.push("Gastos comprometem mais de 90% da renda. Revise o orçamento.");
    }

    if (topCats.length > 0) {
      const top = topCats[0]!;
      insights.push(
        `Maior gasto: ${top.name} (R$ ${top.amount.toFixed(2)}).`,
      );
    }

    return insights;
  }
}
