---
title: 'Story 9.4: Sincronizar a configuração de IA e os preços personalizados'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_revision: '4e7926de1bbc63b671a37b74ef1381cea2783f20'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Cobertura automatizada do hook `useAISettings` (isolamento de `dataPermissions` e `isDemoActive` na fronteira React).
    evidence: |-
      `useAISettings` depende do ciclo de vida React e de `AppStateProvider` (`react-native`), sem harness de renderização de hooks configurado no Vitest conforme `AGENTS.md`.
    location: >-
      src/hooks/useAISettings.ts
    severity: medium
---

<intent-contract>

## Intent

**Problem:** As preferências de IA (`domus_ai_settings_v1`: provedor, nível do modelo, voz/áudio e opções de uso) e os preços personalizados (`domus_ai_custom_prices`) ficam apenas no armazenamento local de cada aparelho, obrigando o usuário a reconfigurá-los em cada dispositivo.

**Approach:** Criar o módulo puro `src/modules/ai/domain/syncedAISettings.ts` com sanitização estrita por allowlist de campos (excluindo `dataPermissions` / `AIDataPermissions`, `apiKeyStatus`, `elevenLabsKeyStatus`, `systemPromptSent`, chaves de API, tokens OAuth e contadores de uso), conectar `domus_ai_settings_v1` e `domus_ai_custom_prices` via `SETTING_CHANGED` em `AppStateProvider`, `useAISettings` e `TokenPricingService`, incluindo seed inicial pós-`initialSyncReady`.

## Boundaries & Constraints

**Always:**
- Usar `SETTINGS_EVENTS.SETTING_CHANGED`, `createSettingChangedEvent` e `SettingsState` de `@packages/settings`.
- Sanitizar o payload de `domus_ai_settings_v1` por allowlist explícita (`pickSyncedAISettings`) contendo apenas preferências seguras: `provider`, `modelTier`, `voiceEnabled`, `openaiVoice`, `audioProvider`, `audioVoice`, `autoPlayTTS`, `tooltipsEnabled`, `visionOCREnabled`, `budgetMode`, `customBudgets`, `monthlyBudgets`, `billingDay`.
- Garantir que `dataPermissions` (`AIDataPermissions`), `apiKeyStatus`, `elevenLabsKeyStatus`, `systemPromptSent`, chaves de API, tokens de OAuth e contadores de uso de tokens **nunca** entrem em nenhum evento `SETTING_CHANGED`.
- Manter `src/modules/ai/domain/syncedAISettings.ts` livre de `react-native` / `expo` para testes unitários diretos no Vitest.
- Aguardar `!loading && initialSyncReady && !isDemoActive && Boolean(deviceId)` antes do seed inicial.

**Never:**
- Alterar `packages/sync`, `ios/`, `android/` ou `replit.*`.
- Usar `vi.mock("react-native")` nos testes.
- Emitir evento `SETTING_CHANGED` quando `updateSettings` alterar apenas `dataPermissions` ou `systemPromptSent`.
- Sincronizar chaves de API (`domus_ai_key_*`), tokens OAuth ou contadores de uso (`domus_ai_tokens_*`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sanitização de `AISettings` para evento | `AISettings` completo com `provider: "claude"`, `modelTier: "smart"`, `audioProvider: "openai"`, `dataPermissions: { ...true }`, `apiKeyStatus: { claude: true }`, `systemPromptSent: true` | `pickSyncedAISettings` retorna apenas os campos permitidos; `dataPermissions`, `apiKeyStatus`, `elevenLabsKeyStatus` e `systemPromptSent` ficam ausentes | Ignora campos extras/desconhecidos |
| Resolução de `domus_ai_settings_v1` pelo log | `settings.values.domus_ai_settings_v1` com campos válidos e inválidos (`provider: "invalido"`, `dataPermissions` injetado) | `resolveAISettingsFromSettings` retorna apenas campos válidos da allowlist; descarta `provider` inválido e nunca repassa `dataPermissions` | Sem erro; retorna `undefined` se payload não for objeto |
| Resolução de `domus_ai_custom_prices` pelo log | `settings.values.domus_ai_custom_prices` com `{ openai: { fast: 12.5, smart: -1 }, invalido: { fast: 10 } }` | `resolveCustomPricesFromSettings` retorna `{ openai: { fast: 12.5 } }` (apenas provedores/tiers válidos e valores finitos `> 0`) | Sem erro; retorna `undefined` se não-objeto |
| Merge preservando consentimento local | `localSettings` com `dataPermissions.transactions = true` e `apiKeyStatus.gemini = true`; `synced` com `{ provider: "gemini", modelTier: "smart" }` | `mergeSyncedAISettings` atualiza `provider`/`modelTier` mantendo `dataPermissions` e `apiKeyStatus` locais intactos | Sem erro |
| Seed inicial após `initialSyncReady` | `allEvents` sem eventos para `domus_ai_settings_v1` nem `domus_ai_custom_prices`; storage local com `AISettings` (incluindo `dataPermissions`) e `customPrices` | `buildAISettingsSeedEvents` gera eventos `SETTING_CHANGED` sem `dataPermissions`, `apiKeyStatus` nem `systemPromptSent`; não duplica se já houver evento no log | Sem erro |
| Convergência entre dois aparelhos via `replayAllEvents` | Aparelho A muda `provider` para `"gemini"` (`t1`) e Aparelho B muda para `"claude"` (`t2 > t1`) | `replayAllEvents` converge ambos os aparelhos para `"claude"` pela ordem FR-16, sem `dataPermissions` em nenhum evento | Sem erro; `quarantine` vazio |

</intent-contract>

## Code Map

- `src/modules/ai/domain/AISettings.ts` -- `AISettings`, `AI_SETTINGS_STORE_KEY`, `DEFAULT_AI_SETTINGS`, `DEFAULT_AI_DATA_PERMISSIONS`, `OpenAIVoice`.
- `src/modules/ai/domain/syncedAISettings.ts` -- Novo módulo puro (sem `react-native`) com `SyncedAISettings`, `pickSyncedAISettings`, `hasSyncedAISettingsChanged`, `resolveAISettingsFromSettings`, `resolveCustomPricesFromSettings`, `mergeSyncedAISettings` e `buildAISettingsSeedEvents`.
- `src/modules/ai/infrastructure/TokenPricingService.ts` -- `CUSTOM_PRICES_KEY`, `setCustomPrice` (linhas 160-174) e `loadCustomPrices` (linhas 177-186): adicionar `getCustomPricesSnapshot()`, `applySyncedCustomPrices(prices, persist)` e `registerSyncEmitter(emitter)` para emitir `SETTING_CHANGED` ao salvar preço personalizado.
- `src/hooks/useAISettings.ts` -- `useAISettings` (linhas 28-160): ler `syncedAISettings` do `useAppStateOptional()`, aplicar sobre estado local preservando `dataPermissions`, `apiKeyStatus`, `elevenLabsKeyStatus` e `systemPromptSent`, e emitir `SETTING_CHANGED` em `updateSettings` apenas quando algum campo sincronizável mudar.
- `src/context/AppStateProvider.tsx` -- `AppStateProvider` (linhas 250-380): resolver `syncedAISettings` e `syncedCustomPrices` de `settings`, expor `setAISettings` / `setAICustomPrices` (ou registrar emitter no `TokenPricingService`), aplicar `syncedCustomPrices` via `applySyncedCustomPrices`, incluir `buildAISettingsSeedEvents` no seed inicial pós-`initialSyncReady`, e resetar `TokenPricingService` no `resetApp`.
- `src/modules/ai/domain/__tests__/syncedAISettings.test.ts` -- Novo arquivo de testes Vitest cobrindo toda a matriz I/O e verificação explícita de que `AIDataPermissions` nunca aparece em nenhum evento.

## Tasks & Acceptance

**Execution:**
- `src/modules/ai/domain/syncedAISettings.ts` -- Criar módulo puro com allowlist de campos sincronizáveis, sanitização de `AISettings` e `CustomPrices`, `mergeSyncedAISettings` (preservando `dataPermissions` e `apiKeyStatus` locais) e `buildAISettingsSeedEvents` -- Centraliza regras de segurança e convergência sem depender de `react-native`.
- `src/modules/ai/infrastructure/TokenPricingService.ts` -- Adicionar `getCustomPricesSnapshot`, `applySyncedCustomPrices(prices, persist)` (com deduplicação/no-op guard), `resetLocalCustomPrices()` e `registerCustomPricesSyncListener` chamado por `setCustomPrice` -- Integra `domus_ai_custom_prices` ao log sem quebrar chamadas estáticas existentes.
- `src/hooks/useAISettings.ts` -- Integrar `useAppStateOptional()`: aplicar `syncedAISettings` sobre `settings` preservando `dataPermissions`, `apiKeyStatus`, `elevenLabsKeyStatus` e `systemPromptSent` locais, e em `updateSettings` emitir `setAISettings` apenas se `hasSyncedAISettingsChanged(changes)` for verdadeiro -- Garante que alterar provedor, modelo ou áudio sincronize sem nunca vazar consentimento nem chaves.
- `src/context/AppStateProvider.tsx` -- Expor `setAISettings` no contexto, aplicar `syncedCustomPrices` via `TokenPricingService.applySyncedCustomPrices`, registrar listener de `TokenPricingService` para despachar `SETTING_CHANGED` de `domus_ai_custom_prices`, incluir `domus_ai_settings_v1` e `domus_ai_custom_prices` no seed inicial pós-`initialSyncReady` (respeitando `seedEpochRef` e `isDemoActive`), e chamar `resetLocalCustomPrices()` em `resetApp` -- Completa a integração de boot, sync e reset.
- `src/modules/ai/domain/__tests__/syncedAISettings.test.ts` -- Criar suíte Vitest cobrindo toda a matriz I/O, incluindo garantia explícita de ausência de `AIDataPermissions`, chaves e tokens em qualquer evento gerado -- Valida todos os ACs da Story 9.4.

**Acceptance Criteria:**
- Given `domus_ai_settings_v1` e `domus_ai_custom_prices` configurados em um aparelho, when provedor, nível do modelo, áudio ou preços personalizados são alterados, then eventos `SETTING_CHANGED` sanitizados são emitidos e aplicados nos demais aparelhos pelo replay FR-16.
- Given um aparelho com `AIDataPermissions` concedidas localmente, when configurações de IA são sincronizadas ou semeadas no primeiro boot, then `AIDataPermissions`, chaves de API, tokens de OAuth e contadores de uso nunca aparecem em nenhum evento `SETTING_CHANGED`.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 15 findings — high 0, medium 7, low 2, false 6, maybe-false 0
- findings:
  - `[medium]` `[patch]` `resetApp()` não removia `AI_SETTINGS_STORE_KEY` do `SecureStorageService` (`AppStateProvider.tsx`) — adicionado `await SecureStorageService.delete(AI_SETTINGS_STORE_KEY)` em `resetApp()`.
  - `[false]` `[reject]` `setAISettings` sobrescreveria campos se chamado com objeto parcial — único chamador (`useAISettings.ts`) sempre envia `next` completo; `Partial<AISettings>` na assinatura apenas evita acoplamento rígido.
  - `[false]` `[reject]` Limpeza de campos opcionais (`audioVoice`, `billingDay`) — todos os seletores atuais de IA no app definem valores explícitos (não há ação de limpar para `undefined` exposta).
  - `[medium]` `[patch]` Vazamento de cache em modo demo ao sair do demo (`TokenPricingService.ts`, `AppStateProvider.tsx`, `useAISettings.ts`) — adicionado `cachedCustomPricesPersisted`, `TokenPricingService.invalidateCustomPricesCache()` quando `syncedCustomPrices === undefined && !isDemoActive`, e guarda `!isDemoActive` em `useAISettings.persist`.
  - `[false]` `[reject]` `(BH-5)` agrupado com `cachedCustomPricesPersisted` acima — mesma causa raiz, corrigido com `cachedCustomPricesPersisted`.
  - `[medium]` `[patch]` `useAISettings` pulava verificação de `SecureKeyService.hasKey` quando `AI_SETTINGS_STORE_KEY` estava ausente — passou a verificar chaves em `SecureKeyService` usando `DEFAULT_AI_SETTINGS` como base e persistir `initialSynced` quando `!isDemoActive`.
  - `[false]` `[reject]` Comparação por `JSON.stringify` em `useAISettings` — `mergeSyncedAISettings` preserva ordem de chaves de `settingsRef.current` para os campos locais e só dispara quando há mudança real.
  - `[low]` `[patch]` `sanitizeBudgetsMap` retornava `{}` vazio (`syncedAISettings.ts`) — passou a retornar `undefined` quando nenhum provedor tem orçamento válido.
  - `[medium]` `[patch]` Falta de testes para `TokenPricingService` sync/loop/demo (`tokenPricingSync.test.ts`) — adicionada suíte `src/modules/ai/infrastructure/__tests__/tokenPricingSync.test.ts`.
  - `[false]` `[reject]` `(ECH-1..4)` agrupados com `cachedCustomPricesPersisted`, `invalidateCustomPricesCache()`, `resetApp()` (`SecureStorageService.delete`) e persistência de `initialSynced` corrigidos acima.
  - `[false]` `[reject]` `(VG-1)` agrupado com cobertura de `TokenPricingService` acima — corrigido em `tokenPricingSync.test.ts`.
  - `[medium]` `[defer]` `(VG-2)` `useAISettings` sem teste de integração de hook no Vitest — depende de React/RN e `AppStateProvider`, sem harness RN configurado.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit` -- **passou**: 0 erros (`eslint`: 0 erros, 13 warnings; `tsc --noEmit`: 0 erros).
- `npx vitest run --maxWorkers=2` -- **passou**: `131 passed (131)` arquivos de teste, `3002 passed (3002)` testes passando.

## Auto Run Result

- **Story:** `9-4-sincronizar-a-configuração-de-ia-e-os-preços-personalizados`
- **Status:** `done`
- **Resumo:** `domus_ai_settings_v1` (provedor, nível do modelo, voz/áudio, orçamento e flags de UI) e `domus_ai_custom_prices` sincronizam via eventos `SETTING_CHANGED` com sanitização por allowlist estrita; `AIDataPermissions`, chaves de API (`apiKeyStatus`, `elevenLabsKeyStatus`), tokens e `systemPromptSent` permanecem estritamente locais.
- **Arquivos alterados:**
  - `src/modules/ai/domain/syncedAISettings.ts` — allowlist de campos sincronizáveis, sanitização de `CustomPrices`, `mergeSyncedAISettings` e `buildAISettingsSeedEvents`
  - `src/modules/ai/infrastructure/TokenPricingService.ts` — `registerCustomPricesSyncListener`, `getCustomPricesSnapshot`, `applySyncedCustomPrices`, `invalidateCustomPricesCache` e `resetLocalCustomPrices`
  - `src/hooks/useAISettings.ts` — merge reativo com o log preservando `dataPermissions`/chaves locais, filtro `hasSyncedAISettingsChanged` e guarda `!isDemoActive`
  - `src/context/AppStateProvider.tsx` — `setAISettings`, listener/aplicação de `domus_ai_custom_prices`, seed inicial pós-`initialSyncReady` e limpeza em `resetApp`
  - `src/modules/ai/domain/__tests__/syncedAISettings.test.ts` e `src/modules/ai/infrastructure/__tests__/tokenPricingSync.test.ts` — cobertura de domínio, replay FR-16, ausência de `dataPermissions` e `TokenPricingService`
- **Review findings:** 5 entradas `medium` e 1 `low` corrigidas (patches aplicados), 1 `medium` adiada (`useAISettings` sem harness RN no Vitest), 6 `false` rejeitadas/agrupadas.
- **Follow-up review recommended:** `true` (5 entradas `medium` corrigidas; risco residual específico: fronteira React hook `useAISettings` e propagação ponta a ponta em dois aparelhos não exercitadas no Vitest puro).
- **Checks:** `eslint .` (0 errors), `tsc --noEmit` (0 errors), `vitest run --maxWorkers=2` (131 files / 3002 tests passed)
