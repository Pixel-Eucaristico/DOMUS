import type {
  TransactionPayload,
  AccountPayload,
  CategoryPayload,
} from "@packages/events/src/types";
import {
  ProfileCalculator,
  FinancialAnalysisEngine,
  TOONSerializer,
  TOONParser,
  IntentClassifier,
} from "@packages/ai";
import type { ChatMessage, ConsultationResult, AIIntent } from "@packages/ai";
import { generateId } from "@packages/events/src/factory";
import { AIClientService } from "./AIClientService";
import { ConfidenceValidator } from "./ConfidenceValidator";
import type { AISettings } from "../domain/AISettings";

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "Você é o DOMUS, um assistente financeiro pessoal brasileiro. " +
  "Ajude o usuário a tomar decisões financeiras inteligentes com base em seus dados reais. " +
  "NUNCA solicite: CPF, nome completo, número de conta, número de cartão ou IDs internos. " +
  "Responda APENAS em formato TOON exatamente como especificado. " +
  "Use português para todas as strings visíveis ao usuário. " +
  "Seja conciso, prático e empático.";

/** Maximum conversation turns to include in the context sent to the AI. */
const MAX_HISTORY_MESSAGES = 6;

// ─── ConsultantChatUseCase ────────────────────────────────────────────────────

export class ConsultantChatUseCase {
  /**
   * Processes a user message and returns an assistant ChatMessage.
   * Never throws — always returns a valid ChatMessage (local fallback on error).
   */
  static async execute(
    userMessage: string,
    history: ChatMessage[],
    transactions: TransactionPayload[],
    accounts: AccountPayload[],
    categories: Record<string, CategoryPayload>,
    wishlistItemPrice: number | null,
    settings: AISettings,
  ): Promise<ChatMessage> {
    const intent: AIIntent = IntentClassifier.classify(userMessage);
    const profile = ProfileCalculator.compute(transactions, accounts);
    const snapshot = ProfileCalculator.buildSnapshot(
      transactions,
      accounts,
      categories,
    );

    // Offline or AI disabled → local fallback immediately
    if (!settings.isEnabled || !settings.hasApiKey) {
      return ConsultantChatUseCase.buildLocalFallback(
        intent,
        snapshot,
        profile,
        wishlistItemPrice,
      );
    }

    // Build TOON request based on detected intent
    const toonRequest =
      intent === "purchase_advice" && wishlistItemPrice !== null
        ? TOONSerializer.buildConsultationRequest({
            profile,
            snapshot,
            goalDescription: `R$ ${wishlistItemPrice.toFixed(2)}`,
            question: userMessage,
          })
        : TOONSerializer.buildSummaryRequest(snapshot, ConsultantChatUseCase.currentMonth());

    // Build message list: system + last N history + user TOON
    const historySlice = history.slice(-MAX_HISTORY_MESSAGES);
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...historySlice.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: toonRequest },
    ];

    try {
      const cacheKey = await AIClientService.computeCacheKey(messages);
      const tier = intent === "purchase_advice" ? "smart" : ("fast" as const);

      const response = await AIClientService.complete({
        provider: settings.provider,
        modelTier: tier,
        messages,
        cacheKey,
      });

      let textContent: string;

      if (intent === "purchase_advice") {
        const consultation = TOONParser.parseConsultationResponse(
          response.content,
        );
        ConfidenceValidator.assertAcceptable(consultation);
        textContent = ConsultantChatUseCase.formatConsultation(consultation);
      } else {
        const summary = TOONParser.parseSummaryResponse(
          response.content,
          ConsultantChatUseCase.currentMonth(),
        );
        textContent = summary.insights.join("\n") || response.content;
      }

      return {
        id: generateId(),
        role: "assistant",
        content: textContent,
        timestamp: Date.now(),
        tokensUsed: response.tokensUsed,
        isLocalFallback: false,
      };
    } catch {
      return ConsultantChatUseCase.buildLocalFallback(
        intent,
        snapshot,
        profile,
        wishlistItemPrice,
      );
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private static buildLocalFallback(
    intent: AIIntent,
    snapshot: ReturnType<typeof ProfileCalculator.buildSnapshot>,
    profile: ReturnType<typeof ProfileCalculator.compute>,
    itemPrice: number | null,
  ): ChatMessage {
    let content: string;

    if (intent === "purchase_advice" && itemPrice !== null) {
      const result = FinancialAnalysisEngine.generateFallbackConsultation(
        snapshot,
        profile,
        itemPrice,
      );
      content = ConsultantChatUseCase.formatConsultation(result);
    } else if (intent === "monthly_summary") {
      const sr = Math.round(snapshot.savingsRate);
      content =
        `📊 Saldo atual: R$ ${snapshot.totalBalance.toFixed(2)}\n` +
        `Renda mensal: R$ ${snapshot.monthlyIncome.toFixed(2)}\n` +
        `Gastos do mês: R$ ${snapshot.monthlyExpenses.toFixed(2)}\n` +
        `Taxa de poupança: ${sr}%`;
    } else {
      content =
        "Olá! Sou o DOMUS, seu assistente financeiro. " +
        "Configure sua chave de API em Configurações → IA para respostas personalizadas. " +
        "No modo offline, posso ajudar com análises básicas e simulações de compra.";
    }

    return {
      id: generateId(),
      role: "assistant",
      content,
      timestamp: Date.now(),
      isLocalFallback: true,
    };
  }

  private static formatConsultation(result: ConsultationResult): string {
    const icons: Record<ConsultationResult["decision"], string> = {
      Buy: "✅",
      Delay: "⏳",
      Avoid: "❌",
    };
    const riskLabels: Record<ConsultationResult["risk"], string> = {
      Low: "baixo",
      Medium: "médio",
      High: "alto",
    };

    const icon = icons[result.decision];
    const risk = riskLabels[result.risk];

    return (
      `${icon} **${result.decision}** — risco ${risk}\n\n` +
      `${result.recommendation}\n\n` +
      `_${result.behaviorInsight}_`
    );
  }

  private static currentMonth(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
}
