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
import { buildFinancialContext } from "./AIContextBuilder";
import type { ContextData } from "./AIContextBuilder";
import type { AISettings } from "../domain/AISettings";
import { hasActiveKey } from "../domain/AISettings";
import type { GeminiAudioAttachment } from "@packages/../packages/ai/src/adapters/GeminiAdapter";

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  `Voce e o DOMUS, consultor financeiro pessoal brasileiro inspirado na filosofia do canal "Dinheiro Com Voce" (William Ribeiro).

PERSONALIDADE:
- Didatico, direto e transparente, com humor leve e ironico ("estilo tiozao gente boa")
- Cetico com modas passageiras, pragmatico e baseado em dados
- Se algo for uma cilada financeira, avise de forma clara e honesta
- Use analogias do dia a dia como se explicasse a um amigo num cafe

MENTALIDADE FINANCEIRA:
- Prioridade absoluta: Reserva de Emergencia (6-12 meses de custos fixos em liquidez diaria)
- Formula: Aporte + Tempo + Rentabilidade. O que enriquece e o trabalho e aporte constante
- Descomplicacao: se o investidor nao entende o que comprou, nao deve ter aquele ativo
- Foco em ativos geradores de renda passiva (FIIs, acoes de dividendos)
- Critico de taxas abusivas, titulos de capitalizacao e promessas de enriquecimento rapido
- Conhecimento: Tesouro Direto (Selic, IPCA+), CDBs, LCIs/LCAs (FGC), FIIs, Value Investing
- Matematica financeira: juros compostos e impacto real da inflacao (IPCA) no poder de compra

Quando receber dados financeiros estruturados, responda no formato TOON especificado abaixo.
Para perguntas gerais ou saudacoes, responda em texto livre de forma natural e acolhedora.
Voce tem acesso aos dados financeiros reais do usuario (transacoes, contas, categorias, notas fiscais) quando ele autoriza. Use esses dados para dar respostas precisas e personalizadas.

FORMATO consultation_response:
consultation_response:
decision | risk | recommendation | behavior_insight | confidence
{Buy|Delay|Avoid} | {Low|Medium|High} | {texto} | {texto} | {0.0-1.0}

FORMATO summary_response:
summary_response:
month | savings_rate | budget_adherence
{YYYY-MM} | {0-100} | {0-100}
insights:
- {insight 1}
- {insight 2}

REGRAS:
- Moeda: BRL (R$)
- Contexto: mercado financeiro brasileiro (CDI, Selic, IPCA)
- Prioridades: reserva de emergencia > quitar dividas > investir > renda passiva
- Regra 50/30/20: 50% necessidades, 30% desejos, 20% poupanca/investimento
- NUNCA solicite CPF, nome completo, numero de conta, cartao ou IDs internos
- NUNCA de recomendacoes diretas de compra/venda (conteudo educativo)
- NUNCA apoie piramides financeiras ou esquemas de enriquecimento rapido
- Seja conciso, pratico e empatico
- Use portugues brasileiro para todas as strings visiveis ao usuario`;

/** Maximum conversation turns to include in the context sent to the AI. */
const MAX_HISTORY_MESSAGES = 6;

// ─── ConsultantChatUseCase ────────────────────────────────────────────────────

export class ConsultantChatUseCase {
  /**
   * Processes a user message and returns an assistant ChatMessage.
   * On API error, returns a fallback message that includes the error reason.
   */
  static async execute(
    userMessage: string,
    history: ChatMessage[],
    contextData: ContextData,
    wishlistItemPrice: number | null,
    settings: AISettings,
    audioAttachment?: GeminiAudioAttachment,
  ): Promise<ChatMessage> {
    const { transactions, accounts, categories } = contextData;
    const intent: AIIntent = IntentClassifier.classify(userMessage);
    const profile = ProfileCalculator.compute(transactions, accounts);
    const snapshot = ProfileCalculator.buildSnapshot(
      transactions,
      accounts,
      categories,
    );

    // Offline or AI disabled → local fallback immediately
    if (!settings.isEnabled || !hasActiveKey(settings)) {
      return ConsultantChatUseCase.buildLocalFallback(
        intent,
        snapshot,
        profile,
        wishlistItemPrice,
      );
    }

    // Build rich financial context from real data (based on permissions)
    const financialContext = buildFinancialContext(
      settings.dataPermissions,
      contextData,
    );

    // Build the user content based on detected intent
    let userContent: string;
    if (intent === "purchase_advice" && wishlistItemPrice !== null) {
      userContent = TOONSerializer.buildConsultationRequest({
        profile,
        snapshot,
        goalDescription: `R$ ${wishlistItemPrice.toFixed(2)}`,
        question: userMessage,
      });
    } else if (intent === "monthly_summary") {
      userContent = TOONSerializer.buildSummaryRequest(
        snapshot,
        ConsultantChatUseCase.currentMonth(),
      );
    } else {
      // General chat — send the user's actual message with context
      const ctx =
        `[Contexto: saldo R$ ${snapshot.totalBalance.toFixed(2)}, ` +
        `renda R$ ${snapshot.monthlyIncome.toFixed(2)}/mes, ` +
        `gastos R$ ${snapshot.monthlyExpenses.toFixed(2)}/mes, ` +
        `poupanca ${Math.round(snapshot.savingsRate)}%]\n\n`;
      userContent = ctx + userMessage;
    }

    // Append detailed financial data if user granted permissions
    if (financialContext) {
      userContent += financialContext;
    }

    // Build message list: system + last N history + user content
    const historySlice = history.slice(-MAX_HISTORY_MESSAGES);
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...historySlice.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: userContent },
    ];

    try {
      const cacheKey = await AIClientService.computeCacheKey(messages);
      const tier = intent === "purchase_advice" ? "smart" : ("fast" as const);

      const response = await AIClientService.complete({
        provider: settings.provider,
        modelTier: tier,
        messages,
        cacheKey,
        openaiAuthMethod: settings.openaiAuthMethod,
        customBudgets: settings.customBudgets,
        budgetMode: settings.budgetMode,
        monthlyBudgets: settings.monthlyBudgets,
        billingDay: settings.billingDay,
        audioAttachment,
      });

      let textContent: string;

      if (intent === "purchase_advice") {
        const consultation = TOONParser.parseConsultationResponse(
          response.content,
        );
        ConfidenceValidator.assertAcceptable(consultation);
        textContent = ConsultantChatUseCase.formatConsultation(consultation);
      } else if (intent === "monthly_summary") {
        const summary = TOONParser.parseSummaryResponse(
          response.content,
          ConsultantChatUseCase.currentMonth(),
        );
        textContent = summary.insights.join("\n") || response.content;
      } else {
        // General chat — use AI response directly (no TOON parsing)
        textContent = response.content;
      }

      return {
        id: generateId(),
        role: "assistant",
        content: textContent,
        timestamp: Date.now(),
        tokensUsed: response.tokensUsed,
        isLocalFallback: false,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";

      const fallback = ConsultantChatUseCase.buildLocalFallback(
        intent,
        snapshot,
        profile,
        wishlistItemPrice,
      );

      fallback.content =
        `Erro ao consultar ${settings.provider}: ${errorMessage}\n\n` +
        `Mostrando analise local:\n\n${fallback.content}`;

      return fallback;
    }
  }

  /**
   * Generates a warm, personalized welcome message using the AI.
   * Falls back to a static message if the API call fails or is unavailable.
   */
  static async generateWelcome(
    contextData: ContextData,
    settings: AISettings,
  ): Promise<ChatMessage> {
    const financialContext = buildFinancialContext(
      settings.dataPermissions,
      contextData,
    );

    // No AI available → static fallback
    if (!settings.isEnabled || !hasActiveKey(settings)) {
      return {
        id: generateId(),
        role: "assistant",
        content: ConsultantChatUseCase.buildStaticWelcome(contextData, settings),
        timestamp: Date.now(),
        isLocalFallback: true,
      };
    }

    const hasData = financialContext.length > 0;
    const welcomePrompt = hasData
      ? `Gere uma saudacao curta e calorosa como consultor financeiro DOMUS. ` +
        `O usuario acabou de abrir o chat. Use os dados abaixo para personalizar: ` +
        `comente sobre conquistas, streak, saldo, gastos recentes ou itens da lista de desejos — ` +
        `o que for mais relevante e interessante. ` +
        `Tom: acolhedor, como alguem que conhece bem a pessoa e esta feliz em reencontra-la. ` +
        `NAO use a palavra "amigo". NAO repita a mesma estrutura sempre. ` +
        `Seja criativo e varie o estilo a cada vez. ` +
        `Use markdown (negrito, italico) para destaque. ` +
        `Maximo 4-5 linhas. Termine oferecendo ajuda de forma natural.` +
        financialContext
      : `Gere uma saudacao curta e calorosa como consultor financeiro DOMUS. ` +
        `O usuario acabou de abrir o chat mas ainda nao liberou acesso aos dados financeiros. ` +
        `De boas-vindas de forma acolhedora e explique brevemente que voce pode ajudar mais ` +
        `se ele liberar acesso aos dados em Configuracoes. ` +
        `Tom: caloroso e convidativo, sem pressionar. ` +
        `NAO use a palavra "amigo". ` +
        `Use markdown (negrito, italico) para destaque. ` +
        `Maximo 3-4 linhas.`;

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: welcomePrompt },
    ];

    try {
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

      return {
        id: generateId(),
        role: "assistant",
        content: response.content,
        timestamp: Date.now(),
        tokensUsed: response.tokensUsed,
        isLocalFallback: false,
      };
    } catch {
      return {
        id: generateId(),
        role: "assistant",
        content: ConsultantChatUseCase.buildStaticWelcome(contextData, settings),
        timestamp: Date.now(),
        isLocalFallback: true,
      };
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private static buildStaticWelcome(
    contextData: ContextData,
    settings: AISettings,
  ): string {
    const lines: string[] = [];
    lines.push("**Ola! Sou o DOMUS, seu consultor financeiro.**\n");

    const { dataPermissions } = settings;

    if (dataPermissions.gamification) {
      const g = contextData.gamification;
      if (g.currentStreak > 0) {
        lines.push(`Voce esta com um streak de **${g.currentStreak} dias** consecutivos!`);
      }
      if (g.level > 1) {
        lines.push(`Nivel **${g.level}** com **${g.totalXp.toLocaleString("pt-BR")} XP**.`);
      }
    }

    if (dataPermissions.accounts && contextData.accounts.length > 0) {
      const total = contextData.accounts.reduce((s, a) => s + a.balance, 0);
      lines.push(`\nSaldo total: **R$ ${total.toFixed(2)}** em ${contextData.accounts.length} conta${contextData.accounts.length > 1 ? "s" : ""}.`);
    }

    lines.push("\nComo posso te ajudar hoje?");
    return lines.join("\n");
  }

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
        `Saldo atual: R$ ${snapshot.totalBalance.toFixed(2)}\n` +
        `Renda mensal: R$ ${snapshot.monthlyIncome.toFixed(2)}\n` +
        `Gastos do mes: R$ ${snapshot.monthlyExpenses.toFixed(2)}\n` +
        `Taxa de poupanca: ${sr}%`;
    } else {
      const sr = Math.round(snapshot.savingsRate);
      content =
        "Ola! Sou o DOMUS, seu assistente financeiro.\n\n" +
        `Seu saldo atual: R$ ${snapshot.totalBalance.toFixed(2)}\n` +
        `Taxa de poupanca: ${sr}%\n\n` +
        "Pergunte sobre seus gastos, peca uma analise mensal ou conselho antes de uma compra.";
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
      Medium: "medio",
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
