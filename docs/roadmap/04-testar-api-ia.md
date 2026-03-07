# Tarefa 04 - Corrigir e Melhorar APIs de IA (CONCLUIDA)

## Prioridade: MEDIO | Urgencia: MEDIA
## Status: CONCLUIDA | Commit: 76d5af1

---

## Problema Original
- Adapters com bugs (Gemini nao tratava content blocked, Claude faltava header mobile, timeout curto)
- OpenRouter removido — substituido por DeepSeek e Qwen
- Apenas 1 chave de API por vez (perdia ao trocar provider)
- System prompt generico, sem contexto financeiro brasileiro
- Erros engolidos silenciosamente (usuario via fallback sem saber o motivo)
- Cotacao USD/BRL hardcoded em R$ 5,50
- Sem opcao de budget mensal

## O Que Foi Feito

### Adapters Corrigidos e Adicionados
| Adapter | Endpoint | Modelos |
|---------|----------|---------|
| OpenAI | `api.openai.com/v1/chat/completions` | gpt-5-mini / gpt-4.1 |
| Gemini | `generativelanguage.googleapis.com/v1beta` | gemini-2.5-flash / gemini-2.5-pro |
| Claude | `api.anthropic.com/v1/messages` | claude-haiku-4-5 / claude-sonnet-4-6 |
| **DeepSeek** (novo) | `api.deepseek.com/chat/completions` | deepseek-chat / deepseek-reasoner |
| **Qwen** (novo) | `dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions` | qwen3.5-flash / qwen3.5-plus |
| ChatGPT OAuth | `chatgpt.com/backend-api/codex/responses` | gpt-5.1-codex-mini / gpt-5.4 |

### Bugs Corrigidos
- GeminiAdapter: tratamento de `candidates` vazio (content blocked) e `finishReason: SAFETY`
- ClaudeAdapter: header `anthropic-dangerous-direct-browser-access: true` para React Native
- Timeout: 15s -> 30s para modelos de IA
- `AbortSignal.timeout()` substituido por `timeoutSignal()` compativel com Hermes/RN
- `useAISettings`: restaura `customBudgets`, `budgetMode`, `monthlyBudgets`, `billingDay` do storage
- `getEffectiveDailyBudget`: chamado com argumentos na ordem correta
- `AIUsageDashboard`: props de budget mensal passadas corretamente

### Features Adicionadas
- **Multi-provider API keys**: cada provider armazena sua chave independentemente
- **Budget mensal**: modo diario/mensal com billing cycle configuravel (dia 1-28)
- **Conversao bidirecional**: inputs Tokens / R$ / US$ com live conversion
- **Cotacao real USD/BRL**: 3 APIs com fallback (AwesomeAPI -> DolarAPI -> ExchangeRate-API), cache 30min
- **System prompt**: consultor financeiro brasileiro (CDI, Selic, IPCA, regra 50/30/20)
- **Erro visivel**: mensagem de erro real mostrada ao usuario com fallback local
- **Atalho**: link para config de IA na tela de configuracoes gerais

### Refatoracao
- `BudgetCostSection` extraido para `src/components/ai/BudgetCostSection.tsx`
- `ai-settings.tsx`: 948 -> 467 linhas
- Import nao usado removido (`MonthlyTokenUsage` em `AISettings.ts`)
- Timer leak corrigido no `timeoutSignal`

## Arquivos Alterados (21)

### Novos
- `packages/ai/src/adapters/DeepSeekAdapter.ts`
- `packages/ai/src/adapters/QwenAdapter.ts`
- `src/components/ai/BudgetCostSection.tsx`

### Modificados
- `packages/ai/src/types.ts` — AIProvider union + AI_MODELS + MonthlyTokenUsage
- `packages/ai/index.ts` — exports DeepSeek/Qwen
- `packages/ai/__tests__/adapters.test.ts` — testes DeepSeek/Qwen/ChatGPT OAuth
- `src/modules/ai/domain/AISettings.ts` — BudgetMode, monthly helpers, provider themes
- `src/modules/ai/application/TokenTracker.ts` — monthly tracking + isOverMonthlyBudget
- `src/modules/ai/application/AIClientService.ts` — monthly budget params
- `src/modules/ai/application/AIProviderFactory.ts` — cases deepseek/qwen
- `src/modules/ai/application/ConsultantChatUseCase.ts` — system prompt + monthly params
- `src/modules/ai/application/ClassifyTransactionsUseCase.ts` — monthly params
- `src/modules/ai/application/GenerateMonthlySummaryUseCase.ts` — monthly params
- `src/modules/ai/infrastructure/TokenPricingService.ts` — 3 APIs + timeoutSignal + pricing
- `src/components/ai/AIUsageDashboard.tsx` — monthly cycle display
- `src/components/ai/AIUsageBar.tsx` — .toFixed(2) BRL
- `src/components/ai/ProviderSelector.tsx` — DeepSeek/Qwen chips
- `src/components/ai/APIKeyManager.tsx` — labels deepseek/qwen
- `src/hooks/useAISettings.ts` — restore budget fields + ALL_PROVIDERS
- `app/ai-settings.tsx` — refatorado, usa BudgetCostSection extraido
- `app/about.tsx` — atalho para AI settings

## Testes
```
5 test suites, 83 tests passing:
- adapters.test.ts ........... 13 tests (OpenAI, Gemini, Claude, DeepSeek, Qwen, ChatGPT OAuth)
- intentClassifier.test.ts ... 20 tests
- profileCalculator.test.ts .. 12 tests
- toon.test.ts ............... 21 tests
- SecureKeyService.test.ts ... 17 tests
```

## Precos por 1M Tokens (USD)
| Provider | Fast | Smart |
|----------|------|-------|
| OpenAI | $0.40 | $4.00 |
| Gemini | $0.15 | $2.50 |
| Claude | $1.00 | $9.00 |
| DeepSeek | $0.35 | $0.35 |
| Qwen | $0.10 | $0.39 |
