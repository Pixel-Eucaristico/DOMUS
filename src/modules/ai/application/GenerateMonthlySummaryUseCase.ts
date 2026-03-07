import type {
  TransactionPayload,
  AccountPayload,
  CategoryPayload,
} from "@packages/events/src/types";
import {
  FinancialAnalysisEngine,
  ProfileCalculator,
  TOONSerializer,
  TOONParser,
} from "@packages/ai";
import type { MonthlySummary } from "@packages/ai";
import { AIClientService } from "./AIClientService";
import type { AISettings } from "../domain/AISettings";
import { hasActiveKey } from "../domain/AISettings";

// ─── GenerateMonthlySummaryUseCase ────────────────────────────────────────────

export class GenerateMonthlySummaryUseCase {
  /**
   * Generates a monthly summary.
   * Always produces a local summary first; attempts AI enhancement if enabled.
   * Always returns — never throws.
   */
  static async execute(
    transactions: TransactionPayload[],
    accounts: AccountPayload[],
    categories: Record<string, CategoryPayload>,
    month: string,
    settings: AISettings,
  ): Promise<MonthlySummary> {
    const localSummary = FinancialAnalysisEngine.generateMonthlySummary(
      transactions,
      categories,
      month,
    );

    if (!settings.isEnabled || !hasActiveKey(settings)) {
      return localSummary;
    }

    try {
      const snapshot = ProfileCalculator.buildSnapshot(
        transactions,
        accounts,
        categories,
      );

      const toon = TOONSerializer.buildSummaryRequest(snapshot, month);
      const systemPrompt =
        "Você é um consultor financeiro pessoal. " +
        "Analise o resumo financeiro e forneça insights práticos em português. " +
        "Responda APENAS no formato TOON:\n" +
        "summary_response:\n" +
        "savings_rate | budget_adherence | insight\n" +
        "{valor} | {0-100} | {frase curta de insight}";

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
      });

      const aiSummary = TOONParser.parseSummaryResponse(response.content, month);

      // Merge AI insights on top of local data
      return {
        ...localSummary,
        savingsRate:
          aiSummary.savingsRate > 0 ? aiSummary.savingsRate : localSummary.savingsRate,
        budgetAdherence:
          aiSummary.budgetAdherence > 0
            ? aiSummary.budgetAdherence
            : localSummary.budgetAdherence,
        insights:
          aiSummary.insights.length > 0
            ? aiSummary.insights
            : localSummary.insights,
        isLocalFallback: false,
      };
    } catch {
      return localSummary;
    }
  }
}
