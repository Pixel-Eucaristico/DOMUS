# Tarefa 04 - Testar Todas as APIs de IA

## Prioridade: MEDIO | Urgencia: MEDIA
## Estimativa: ~2h | Arquivos: adapters + testes

---

## Problema
Existem 3 adapters de IA configurados (OpenAI, Gemini, Claude) e precisam ser validados end-to-end para garantir que funcionam corretamente.

## Adapters Configurados

### 1. OpenAI Adapter
- **Arquivo:** `packages/ai/src/adapters/OpenAIAdapter.ts`
- **Endpoint:** `https://api.openai.com/v1/chat/completions`
- **Modelos:**
  - Fast: `gpt-4.1-mini`
  - Smart: `gpt-4.1`
- **Auth:** `Authorization: Bearer {apiKey}`

### 2. Gemini Adapter
- **Arquivo:** `packages/ai/src/adapters/GeminiAdapter.ts`
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`
- **Modelos:**
  - Fast: `gemini-2.5-flash`
  - Smart: `gemini-2.5-pro`
- **Auth:** API key na URL

### 3. Claude Adapter
- **Arquivo:** `packages/ai/src/adapters/ClaudeAdapter.ts`
- **Endpoint:** `https://api.anthropic.com/v1/messages`
- **Modelos:**
  - Fast: `claude-haiku-4-5-20251001`
  - Smart: `claude-sonnet-4-6`
- **Auth:** `x-api-key: {apiKey}`, `anthropic-version: 2023-06-01`
- **Peculiaridade:** Merge de mensagens consecutivas do mesmo role (Anthropic exige alternancia user/assistant)

## Testes Existentes
- `packages/ai/__tests__/profileCalculator.test.ts` - calculo de perfil
- `packages/ai/__tests__/intentClassifier.test.ts` - classificacao de intencao
- `packages/ai/__tests__/toon.test.ts` - personalidade TOON
- `src/modules/ai/infrastructure/__tests__/SecureKeyService.test.ts` - seguranca

## Cenarios para Testar

### Por Adapter
1. Request formatado corretamente (headers, body)
2. Resposta parseada corretamente
3. Tratamento de erros (401, 429 rate limit, 500)
4. Timeout handling
5. Token counting na resposta

### Infraestrutura
1. CircuitBreaker abre apos 3 falhas consecutivas
2. CircuitBreaker reseta apos 30s
3. Cache retorna resposta identica para mesma pergunta
4. TokenTracker respeita limite diario de 50.000 tokens
5. AIProviderFactory instancia adapter correto por provider

### Integracao
1. AIClientService pipeline completo (cache -> connectivity -> budget -> circuit -> auth -> request)
2. Fallback quando provider falha
3. Retry logic (1 retry)

## Como Executar
```bash
npx vitest run packages/ai/__tests__/
npx vitest run src/modules/ai/infrastructure/__tests__/
```

## Arquivos Chave
- `packages/ai/src/adapters/` - 3 adapters
- `packages/ai/src/circuit/CircuitBreaker.ts`
- `packages/ai/src/cache/CacheService.ts`
- `src/modules/ai/application/AIClientService.ts` - orquestracao
- `src/modules/ai/application/AIProviderFactory.ts` - factory
- `src/modules/ai/application/TokenTracker.ts` - controle de tokens
- `src/modules/ai/domain/AISettings.ts` - configuracoes
