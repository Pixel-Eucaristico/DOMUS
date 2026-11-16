---
title: 'Story 9.5: Sincronizar a configuração do OCR sem a chave'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_revision: 'd7967089f9102a45aded7a43c1c32cdae4786737'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Wiring reativo em `AppStateProvider.tsx` (`applySyncedOCRConfig`, `registerOCRConfigSyncListener` e seed inicial) não exercitado diretamente em renderização React Native no Vitest.
    evidence: |-
      `AppStateProvider.tsx` depende de `react-native` e não há harness de renderização RN configurado no Vitest conforme `AGENTS.md`.
    location: >-
      src/context/AppStateProvider.tsx
    severity: medium
---

<intent-contract>

## Intent

**Problem:** A configuração do OCR (`@domus:ocr_config`) mistura preferências sincronizáveis (`preferredProvider`, `cloudVisionEndpoint`, `visionAIProvider`) com `cloudVisionApiKey`, ficando restrita ao armazenamento local de cada aparelho.

**Approach:** Criar o módulo puro `src/services/syncedOCRConfig.ts` com sanitização estrita por allowlist (excluindo `cloudVisionApiKey` e qualquer campo de chave), integrar `OCRConfigService` (`saveConfig`, `loadConfig`, `applySyncedOCRConfig`, `registerOCRConfigSyncListener`, `resetLocalOCRConfig`) ao evento `SETTING_CHANGED` (`@domus:ocr_config`) em `AppStateProvider`, incluindo seed inicial pós-`initialSyncReady`.

## Boundaries & Constraints

**Always:**
- Usar `SETTINGS_EVENTS.SETTING_CHANGED`, `createSettingChangedEvent` e `SettingsState` de `@packages/settings`.
- Sanitizar `@domus:ocr_config` por allowlist explícita (`pickSyncedOCRConfig`) contendo apenas `preferredProvider`, `cloudVisionEndpoint` e `visionAIProvider`.
- Garantir que `cloudVisionApiKey` (e qualquer campo de chave/segredo) **nunca** entre em nenhum evento `SETTING_CHANGED`, mesmo quando `saveConfig` recebe `cloudVisionApiKey` junto de `preferredProvider`.
- Não emitir evento `SETTING_CHANGED` quando `setCloudVisionApiKey`, `clearCloudVisionApiKey` ou `saveConfig({ cloudVisionApiKey })` alterarem apenas a chave.
- Manter `src/services/syncedOCRConfig.ts` livre de `react-native` e `expo-secure-store` para testes unitários diretos no Vitest.
- Aguardar `!loading && initialSyncReady && !isDemoActive && Boolean(deviceId)` antes do seed inicial.

**Never:**
- Alterar `packages/sync`, `ios/`, `android/` ou `replit.*`.
- Usar `vi.mock("react-native")` nos testes.
- Sobrescrever ou apagar `domus_ocr_cloud_vision_api_key` no `SecureStore` / `webSecrets` ao aplicar configuração sincronizada vinda do log.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sanitização estrita de `OCRConfig` | `{ preferredProvider: "cloudvision", cloudVisionEndpoint: "https://vision.example.com", visionAIProvider: "gemini", cloudVisionApiKey: "AIzaSecret", apiKey: "x" }` | `pickSyncedOCRConfig` retorna `{ preferredProvider: "cloudvision", cloudVisionEndpoint: "https://vision.example.com", visionAIProvider: "gemini" }`; nenhum campo de chave aparece no objeto | Descarta campos inválidos/extras |
| Alteração exclusiva da chave não emite evento | `OCRConfigService.setCloudVisionApiKey("AIzaSecret")` ou `saveConfig({ cloudVisionApiKey: "AIzaSecret" })` | `hasSyncedOCRConfigChanged` retorna `false`; `registerOCRConfigSyncListener` não é chamado; chave é gravada apenas no armazenamento seguro | Sem erro |
| Alteração mista de provedor + chave | `OCRConfigService.saveConfig({ preferredProvider: "cloudvision", cloudVisionApiKey: "AIzaSecret" })` | `registerOCRConfigSyncListener` recebe apenas `{ preferredProvider: "cloudvision" }`, sem `cloudVisionApiKey` | Sem erro |
| Aplicação de evento remoto sem loop | `OCRConfigService.applySyncedOCRConfig({ preferredProvider: "vision_ai", visionAIProvider: "claude" })` | Atualiza `loadConfig()` / `AsyncStorage` preservando `cloudVisionApiKey` local do `SecureStore` e **não** dispara `registerOCRConfigSyncListener` | Sem erro; no-op se igual |
| Seed inicial após `initialSyncReady` | `allEvents` sem evento `@domus:ocr_config`; config local com `preferredProvider: "cloudvision"` e `cloudVisionApiKey: "AIzaSecret"` | `buildOCRConfigSeedEvents` gera 1 evento `SETTING_CHANGED` sem `cloudVisionApiKey`; não duplica se já houver evento no log | Sem erro |
| Convergência entre dois aparelhos via `replayAllEvents` | Aparelho A muda `preferredProvider` para `"tesseract"` (`t1`) e Aparelho B muda para `"vision_ai"` (`t2 > t1`) | `replayAllEvents` converge ambos para `"vision_ai"` pela ordem FR-16, sem `cloudVisionApiKey` em nenhum evento | Sem erro; `quarantine` vazio |

</intent-contract>

## Code Map

- `src/services/syncedOCRConfig.ts` -- Novo módulo puro (sem `react-native` nem `expo-secure-store`) com `OCR_CONFIG_SETTING_KEY`, `SyncedOCRConfig`, `pickSyncedOCRConfig`, `hasSyncedOCRConfigChanged`, `resolveOCRConfigFromSettings` e `buildOCRConfigSeedEvents`.
- `src/services/ocrConfigService.ts` -- `OCRConfigService` (linhas 82-211): adicionar `registerOCRConfigSyncListener`, `getSyncedOCRConfigSnapshot`, `applySyncedOCRConfig(config, persist)`, `invalidateSyncedOCRConfigCache()` e `resetLocalOCRConfig()`; notificar listeners em `saveConfig` apenas quando `hasSyncedOCRConfigChanged(config)` for verdadeiro (emitindo sempre `pickSyncedOCRConfig(newConfig)` sem `cloudVisionApiKey`), e respeitar cache em `loadConfig()`.
- `src/context/AppStateProvider.tsx` -- `AppStateProvider` (linhas 250-500): resolver `syncedOCRConfig` de `settings`, aplicar via `OCRConfigService.applySyncedOCRConfig(syncedOCRConfig, !isDemoActive)` (e invalidar cache se `undefined && !isDemoActive`), registrar `OCRConfigService.registerOCRConfigSyncListener` (com guarda `!isDemoActive`) para despachar `SETTING_CHANGED` de `@domus:ocr_config`, incluir `buildOCRConfigSeedEvents` no seed inicial pós-`initialSyncReady` e chamar `OCRConfigService.resetLocalOCRConfig()` em `resetApp`.
- `src/services/__tests__/syncedOCRConfig.test.ts` -- Novo arquivo de testes Vitest cobrindo toda a matriz I/O, incluindo garantia explícita de que nenhum campo de chave (`cloudVisionApiKey`, `*key*`) aparece em qualquer payload de evento, além de testes de `OCRConfigService` (listener, loop prevention, preservação de chave segura e modo demo).

## Tasks & Acceptance

**Execution:**
- `src/services/syncedOCRConfig.ts` -- Criar módulo puro com allowlist (`preferredProvider`, `cloudVisionEndpoint`, `visionAIProvider`), `pickSyncedOCRConfig`, `hasSyncedOCRConfigChanged`, `resolveOCRConfigFromSettings` e `buildOCRConfigSeedEvents` -- Garante fronteira estrita contra vazamento de `cloudVisionApiKey`.
- `src/services/ocrConfigService.ts` -- Adicionar `registerOCRConfigSyncListener`, `getSyncedOCRConfigSnapshot`, `applySyncedOCRConfig`, `invalidateSyncedOCRConfigCache` e `resetLocalOCRConfig`; atualizar `saveConfig` e `loadConfig` para emitir apenas quando campos sincronizáveis mudarem e aplicar estado do log preservando a chave segura local -- Integra `@domus:ocr_config` ao log sem quebrar a migração/preservação de `cloudVisionApiKey`.
- `src/context/AppStateProvider.tsx` -- Conectar `syncedOCRConfig`, `applySyncedOCRConfig`, `registerOCRConfigSyncListener` (guardado por `!isDemoActive`), seed inicial pós-`initialSyncReady` e `resetLocalOCRConfig()` em `resetApp` -- Propaga configuração de OCR entre aparelhos no grupo de sync.
- `src/services/__tests__/syncedOCRConfig.test.ts` -- Criar suíte Vitest cobrindo toda a matriz I/O, verificação de ausência de `cloudVisionApiKey` / campos de chave em eventos, `OCRConfigService` listener/no-loop/demo-mode e convergência FR-16 -- Valida todos os ACs da Story 9.5.

**Acceptance Criteria:**
- Given `@domus:ocr_config` com provedor, endpoint, provedor de visão e `cloudVisionApiKey`, when o provedor preferido, endpoint ou provedor de visão é alterado em um aparelho, then um evento `SETTING_CHANGED` é emitido sem `cloudVisionApiKey` e aplicado nos demais aparelhos pelo replay FR-16.
- Given qualquer alteração de `cloudVisionApiKey` ou seed inicial de `@domus:ocr_config`, when inspecionados os payloads dos eventos gerados, then nenhum campo de chave (`cloudVisionApiKey` ou similar) aparece em nenhum evento e o teste falha caso apareça.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 17 findings — high 0, medium 6, low 1, false 10, maybe-false 0
- findings:
  - `[medium]` `[patch]` `applySyncedOCRConfig` sobrescrevia `OCR_CONFIG_KEY` antes de migrar chave legada em `AsyncStorage` (`ocrConfigService.ts`) — adicionado `await this.loadConfig()` antes da gravação quando `cachedSyncedOCRConfig === null`.
  - `[medium]` `[patch]` `applySyncedOCRConfig` marcava `cachedSyncedOCRConfigPersisted = true` antes do `await AsyncStorage.setItem` (`ocrConfigService.ts`) — movido para após `setItem` com `try/catch`.
  - `[false]` `[reject]` `resetLocalOCRConfig` não apaga `OCR_API_KEY_SECURE_KEY` — consistente com `resetApp()` no app (chaves seguras locais permanecem no dispositivo até remoção explícita).
  - `[medium]` `[patch]` Limpar `cloudVisionEndpoint` ou `visionAIProvider` em `saveConfig` não emitia evento (`ocrConfigService.ts`) — atualizado para emitir também quando `"cloudVisionEndpoint" in config || "visionAIProvider" in config`.
  - `[false]` `[reject]` Validação de `https://` em `cloudVisionEndpoint` — restringiria endpoints customizados/locais já aceitos por `OCRConfigService`.
  - `[medium]` `[patch]` `getSyncedOCRConfigSnapshot` emitia `DEFAULT_CONFIG` (`mlkit`) mesmo sem `OCR_CONFIG_KEY` salvo (`ocrConfigService.ts`) — passou a retornar `null` quando `OCR_CONFIG_KEY` ainda não foi salvo.
  - `[low]` `[patch]` `setPreferredProvider` tipado como `OCRProvider` sem `"vision_ai"` (`ocrConfigService.ts`) — ampliado para `OCRProvider | "vision_ai"`.
  - `[medium]` `[patch]` Lacunas de testes em `syncedOCRConfig.test.ts` (`saveConfig` pós-sync, transição `persist=false -> true`, `resetLocalOCRConfig`, limpeza de endpoint, migração legada e `null`/`{}`) — cobertura adicionada em `src/services/__tests__/syncedOCRConfig.test.ts`.
  - `[false]` `[reject]` `(ECH-1..6)` agrupados com os patches acima (mesmas causas raiz já corrigidas).
  - `[false]` `[reject]` `(VG-1..3)` agrupados com a ampliação de testes em `syncedOCRConfig.test.ts` acima.
  - `[medium]` `[defer]` `(IA-1)` Wiring em `AppStateProvider.tsx` sem teste de renderização React Native no Vitest (sem harness RN configurado).

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit` -- **passou**: 0 erros (`eslint`: 0 erros, 13 warnings; `tsc --noEmit`: 0 erros).
- `npx vitest run --maxWorkers=2` -- **passou**: `132 passed (132)` arquivos de teste, `3018 passed (3018)` testes passando.

## Auto Run Result

- **Story:** `9-5-sincronizar-a-configuração-do-ocr-sem-a-chave`
- **Status:** `done`
- **Resumo:** `@domus:ocr_config` sincroniza `preferredProvider`, `cloudVisionEndpoint` e `visionAIProvider` via `SETTING_CHANGED` com allowlist estrita; `cloudVisionApiKey` permanece isolada em `SecureStore` / `webSecrets` e nunca entra em nenhum evento.
- **Arquivos alterados:**
  - `src/services/syncedOCRConfig.ts` — allowlist estrita, `pickSyncedOCRConfig`, `hasSyncedOCRConfigChanged`, `resolveOCRConfigFromSettings` e `buildOCRConfigSeedEvents`
  - `src/services/ocrConfigService.ts` — `registerOCRConfigSyncListener`, `getSyncedOCRConfigSnapshot`, `applySyncedOCRConfig` (com migração prévia de chave legada e guarda de persistência), `invalidateSyncedOCRConfigCache`, `resetLocalOCRConfig` e emissão ao limpar endpoint/visionAIProvider
  - `src/context/AppStateProvider.tsx` — aplicação de `syncedOCRConfig`, registro de listener com guarda `!isDemoActive`, seed inicial pós-`initialSyncReady` e limpeza em `resetApp`
  - `src/services/__tests__/syncedOCRConfig.test.ts` — cobertura de allowlist, ausência de campos de chave, `OCRConfigService`, migração legada, modo demo, reset e convergência FR-16
- **Review findings:** 5 entradas `medium` e 1 `low` corrigidas (patches aplicados), 1 `medium` adiada (`AppStateProvider.tsx` sem harness RN no Vitest), 10 `false` rejeitadas/agrupadas.
- **Follow-up review recommended:** `true` (5 entradas `medium` corrigidas; risco residual específico: wiring de efeitos em `AppStateProvider.tsx` e propagação ponta a ponta entre aparelhos não exercitados em Vitest puro).
- **Checks:** `eslint .` (0 errors), `tsc --noEmit` (0 errors), `vitest run --maxWorkers=2` (132 files / 3018 tests passed)
