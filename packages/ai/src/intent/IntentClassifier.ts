import type { AIIntent } from "../types";

// ─── Keyword Rules ────────────────────────────────────────────────────────────

const INTENT_RULES: Record<Exclude<AIIntent, "unknown">, string[]> = {
  classify_transaction: [
    "categorizar", "classificar", "categoria", "essa compra", "esse gasto",
    "essa despesa", "categorize", "classify", "what category",
    "qual categoria", "tipo de gasto",
  ],
  monthly_summary: [
    "resumo", "resumo do mês", "como fui", "gastei", "gasto mensal",
    "esse mês", "este mês", "visão geral", "balanço", "balanco",
    "análise", "analise", "relatorio", "relatório", "summary",
    "monthly", "overview", "como estou", "situação financeira",
  ],
  purchase_advice: [
    "comprar", "vale a pena", "devo comprar", "posso comprar",
    "tenho dinheiro para", "consigo comprar", "afford", "should i buy",
    "buy now", "purchase", "aquisição", "aquisicao", "investir em",
    "quero comprar", "pensando em comprar", "to buy", "me aconselha",
  ],
};

// ─── IntentClassifier ─────────────────────────────────────────────────────────

export class IntentClassifier {
  /**
   * Classifies a user message as one of the known intents.
   * Uses keyword matching with normalised text.
   * Returns "unknown" when no rule matches.
   */
  static classify(userMessage: string): AIIntent {
    const normalised = IntentClassifier.normalize(userMessage);

    for (const [intent, keywords] of Object.entries(INTENT_RULES) as Array<
      [Exclude<AIIntent, "unknown">, string[]]
    >) {
      for (const kw of keywords) {
        if (normalised.includes(kw)) {
          return intent;
        }
      }
    }

    return "unknown";
  }

  private static normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
