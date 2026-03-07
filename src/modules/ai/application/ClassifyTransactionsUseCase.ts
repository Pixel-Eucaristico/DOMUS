import type {
  TransactionPayload,
  CategoryPayload,
} from "@packages/events/src/types";
import {
  FinancialAnalysisEngine,
  TOONSerializer,
  TOONParser,
} from "@packages/ai";
import type { TransactionClassification } from "@packages/ai";
import { AIClientService } from "./AIClientService";
import type { AISettings } from "../domain/AISettings";
import { hasActiveKey } from "../domain/AISettings";

// ─── ClassifyTransactionsUseCase ──────────────────────────────────────────────

export class ClassifyTransactionsUseCase {
  /**
   * Classifies a batch of transactions.
   * Strategy: local keyword match first (≥0.8 confidence) → AI for the rest.
   * Falls back to local for every transaction if AI is disabled or fails.
   * Never throws — always returns a classification for every input.
   */
  static async execute(
    transactions: TransactionPayload[],
    categories: CategoryPayload[],
    settings: AISettings,
  ): Promise<TransactionClassification[]> {
    const results: TransactionClassification[] = [];
    const needsAI: TransactionPayload[] = [];
    const fallbackCategoryId = categories[0]?.id ?? "";

    // 1. Local classification pass
    for (const tx of transactions) {
      const local = FinancialAnalysisEngine.classifyTransactionLocally(
        tx.description ?? tx.categoryId ?? "",
        categories,
      );

      if (local && local.confidence >= 0.8) {
        results.push({
          transactionId: tx.id,
          suggestedCategoryId: local.categoryId,
          confidence: local.confidence,
          isLocalFallback: true,
        });
      } else {
        needsAI.push(tx);
      }
    }

    if (needsAI.length === 0) return results;

    // 2. AI pass for unmatched transactions
    if (settings.isEnabled && hasActiveKey(settings)) {
      try {
        const toon = TOONSerializer.buildClassificationRequest({
          transactions: needsAI.map((tx) => ({
            id: tx.id,
            description: tx.description ?? "",
            amount: tx.amount,
          })),
        });

        const systemPrompt = ClassifyTransactionsUseCase.buildSystemPrompt(categories);
        const messages = [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: toon },
        ];

        const cacheKey = await AIClientService.computeCacheKey(messages);
        const response = await AIClientService.complete({
          provider: settings.provider,
          modelTier: "fast",
          messages,
          cacheKey,
          openaiAuthMethod: settings.openaiAuthMethod,
          customBudgets: settings.customBudgets,
          budgetMode: settings.budgetMode,
          monthlyBudgets: settings.monthlyBudgets,
          billingDay: settings.billingDay,
        });

        const parsed = TOONParser.parseClassificationResponse(
          response.content,
          needsAI.map((t) => t.id),
        );

        // Map AI results back, fallback for any missing
        const aiById = new Map(parsed.map((r) => [r.transactionId, r]));
        for (const tx of needsAI) {
          const aiResult = aiById.get(tx.id);
          if (aiResult) {
            results.push({ ...aiResult, tokensUsed: response.tokensUsed } as typeof aiResult);
          } else {
            results.push(ClassifyTransactionsUseCase.localOrDefault(tx, categories, fallbackCategoryId));
          }
        }
        return results;
      } catch {
        // Fall through to local fallback below
      }
    }

    // 3. Local fallback for AI-unclassified transactions
    for (const tx of needsAI) {
      results.push(ClassifyTransactionsUseCase.localOrDefault(tx, categories, fallbackCategoryId));
    }

    return results;
  }

  private static localOrDefault(
    tx: TransactionPayload,
    categories: CategoryPayload[],
    fallbackId: string,
  ): TransactionClassification {
    const local = FinancialAnalysisEngine.classifyTransactionLocally(
      tx.description ?? "",
      categories,
    );
    return {
      transactionId: tx.id,
      suggestedCategoryId: local?.categoryId ?? fallbackId,
      confidence: local?.confidence ?? 0,
      isLocalFallback: true,
    };
  }

  private static buildSystemPrompt(categories: CategoryPayload[]): string {
    const list = categories
      .map((c) => `${c.id}: ${c.name} (${c.group})`)
      .join("\n");
    return (
      "Você é um classificador de transações financeiras pessoais.\n" +
      "Classifique cada transação em uma das categorias abaixo.\n\n" +
      "Categorias disponíveis:\n" +
      list +
      "\n\n" +
      "Responda APENAS no formato TOON:\n" +
      "classification_response:\n" +
      "transaction_id | category_id | confidence\n" +
      "{id} | {category_id} | {0.0-1.0}"
    );
  }
}
