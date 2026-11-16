---
title: 'Story 9.3: Sincronizar tema, som e modo de apoio'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_revision: '191b867ca77fe4d98c7f50c240449ddd0c06f96f'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Cobertura automatizada de hooks React Native (`useThemePreferences` e `useSupportModes`) sem harness de renderização RN no Vitest.
    evidence: |-
      `useThemePreferences.ts` importa `react-native` (`useColorScheme`) e `useSupportModes.ts` importa `AppStateProvider.tsx` / `SoundManager.ts`, não podendo ser executados diretamente no Vitest conforme `AGENTS.md`.
    location: >-
      src/hooks/useThemePreferences.ts, src/hooks/useSupportModes.ts
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Tema (`domus_theme_mode_v1`), som (`domus_sound_enabled_v1`) e modos de apoio (`domus_support_modes_v2`) são lidos e gravados apenas no `AsyncStorage` local de cada aparelho, fazendo com que alterações em um aparelho não se propaguem para os demais do grupo de sync.

**Approach:** Extrair funções puras de resolução e seed inicial para `src/modules/settings/syncedPreferences.ts`, conectar `AppStateProvider` (`settings` de `replayAllEvents`, `SettingsEvent` e `initialSyncReady`), atualizar `useThemePreferences` e `useSupportModes` / `MonetizationSettingsStore` para ler do estado do log (com cache local em `AsyncStorage`) e emitir eventos `SETTING_CHANGED`, mantendo `domus_is_catholic_v1` estritamente fora do log.

## Boundaries & Constraints

**Always:**
- Usar `SETTINGS_EVENTS.SETTING_CHANGED`, `createSettingChangedEvent` e `SettingsState` de `@packages/settings`.
- Manter a lógica pura de parsing, resolução e decisão de seed inicial em módulo livre de `react-native` (`src/modules/settings/syncedPreferences.ts`) para permitir testes determinísticos no Vitest sem `vi.mock("react-native")`.
- Aguardar `!loading && initialSyncReady && !isDemoActive && Boolean(deviceId)` antes de emitir eventos de seed inicial na primeira abertura, evitando sobrescrever preferências já sincronizadas do grupo após o primeiro pull.
- Manter `domus_is_catholic_v1` fora de `SETTING_CHANGED` (apenas `AsyncStorage`, escopo do Épico 10).
- Garantir que `resetApp()` limpe o armazenamento local de tema/som sem reemitir eventos `SETTING_CHANGED` para o log recém-zerado.

**Never:**
- Alterar `packages/sync`, `ios/`, `android/` ou `replit.*`.
- Usar `vi.mock("react-native")` nos testes.
- Sincronizar `domus_is_catholic_v1`, `domus_daily_ad_last_v1` ou `domus_support_mode_v1` (legado) como evento `SETTING_CHANGED`.
- Quebrar os testes existentes de `MonetizationSettingsStore` (`loadSupportModes` / `saveSupportModes` / `supportModes.test.ts`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Resolução de tema pelo log | `settings.values.domus_theme_mode_v1` = `"dark"` (ou valor inválido `"neon"`) | Retorna `"dark"` para valor válido (`"system" \| "light" \| "dark"`); retorna `undefined` para ausente/inválido | Sem erro; mantém valor atual/padrão |
| Resolução de som pelo log | `settings.values.domus_sound_enabled_v1` = `false` (ou `"false"` / inválido) | Retorna `false` para booleano (ou `"true"`/`"false"` legado) e `undefined` se inválido | Sem erro; mantém valor atual/padrão |
| Resolução de modos de apoio pelo log | `settings.values.domus_support_modes_v2` = `["banners", "invalido", "daily_ad"]` (ou `[]`) | Filtra para `ALL_SUPPORT_MODES` (`["banners", "daily_ad"]`); se vazio ou não-array, retorna `["links"]` (ou `undefined` se não-array) | Sem erro; fallback seguro para `["links"]` |
| Primeira abertura sem eventos (seed inicial) | `initialSyncReady = true`, `allEvents` sem `SETTING_CHANGED` para tema/som/apoio, `AsyncStorage` com `theme="dark"`, `sound=false`, `support=["banners"]` | Gera exatamente 3 eventos `SETTING_CHANGED` com os valores atuais locais | Sem erro; `appendGenerated` evita duplicação |
| Aparelho novo entrando em grupo já existente | `initialSyncReady = true`, `allEvents` já possui `SETTING_CHANGED` de `domus_theme_mode_v1` | Não gera seed para `domus_theme_mode_v1`; adota o valor vindo do log | Sem erro |
| Isolamento de `domus_is_catholic_v1` | Seed inicial ou alteração de `setIsCatholic(true)` | Nenhum evento `SETTING_CHANGED` é emitido com chave `domus_is_catholic_v1` | Nenhum |

</intent-contract>

## Code Map

- `packages/settings/src/types.ts` -- `createSettingChangedEvent`, `SettingsState`, `SettingsEvent`, `AllowedSettingKey`.
- `src/modules/settings/syncedPreferences.ts` -- Novo módulo puro (sem `react-native`) com resolvers (`resolveThemeModeFromSettings`, `resolveSoundEnabledFromSettings`, `resolveSupportModesFromSettings`) e `buildSettingsSeedEvents` para o seed da primeira abertura.
- `src/context/AppStateProvider.tsx` -- `AnyEvent` (linha 46), `AppStateContextValue` (linha 48), desestruturação de `replayAllEvents` (linha 134), `useThemePreferences` (linha 211), `resetApp` (linha 298) e `value` (linha 308): conectar `settings`, `setThemeMode`/`setSoundEnabled` emitindo `SETTING_CHANGED`, sincronizar `domus_support_modes_v2` com `MonetizationSettingsStore`, e rodar o seed inicial após `initialSyncReady`.
- `src/hooks/useThemePreferences.ts` -- `useThemePreferences` (linhas 13-118): aceitar `syncedThemeMode?: ThemeMode`, `syncedSoundEnabled?: boolean`, `onSyncThemeMode?: (mode: ThemeMode) => void`, `onSyncSoundEnabled?: (enabled: boolean) => void` e método `resetLocalPreferences` sem emitir evento; manter `domus_is_catholic_v1` intacto em `AsyncStorage`.
- `src/modules/monetization/MonetizationSettingsStore.ts` -- `publishSupportModes` / `syncSupportModesFromLog` (linhas 22-86): permitir atualizar cache/assinantes e cache `AsyncStorage` a partir do estado do log sem loop de reemissão.
- `src/hooks/useSupportModes.ts` -- `useSupportModes` (linhas 37-75): ler preferência opcional do contexto (`useAppStateOptional`) e ao alternar modo via `toggleMode`, emitir `SETTING_CHANGED` para `domus_support_modes_v2` quando dentro do `AppStateProvider` (mantendo fallback direto para `saveSupportModes`).
- `src/modules/settings/__tests__/syncedPreferences.test.ts` -- Novo arquivo de testes Vitest cobrindo toda a matriz I/O e propagação entre dois aparelhos via `replayAllEvents`.

## Tasks & Acceptance

**Execution:**
- `src/modules/settings/syncedPreferences.ts` -- Criar módulo puro com `resolveThemeModeFromSettings`, `resolveSoundEnabledFromSettings`, `resolveSupportModesFromSettings` e `buildSettingsSeedEvents` (verificando ausência de `SETTING_CHANGED` prévio por chave em `allEvents` e normalizando valores atuais/padrões sem incluir `domus_is_catholic_v1`) -- Permite leitura determinística das preferências no log e seed seguro na primeira abertura.
- `src/modules/monetization/MonetizationSettingsStore.ts` -- Exportar `applySyncedSupportModes(modes: SupportMode[])` que publica para assinantes e persiste no cache `AsyncStorage` quando houver mudança real -- Permite que atualizações vindas do log reflitam imediatamente em `MonetizationHosts` e `SupportModeSelector`.
- `src/hooks/useThemePreferences.ts` -- Aceitar valores sincronizados (`syncedThemeMode`, `syncedSoundEnabled`) e callbacks de emissão (`onSyncThemeMode`, `onSyncSoundEnabled`), refletindo atualizações remotas do log (inclusive `soundManager.setEnabled`) e expondo `resetLocalPreferences()` para o `resetApp`, mantendo `domus_is_catholic_v1` exclusivamente local -- Integra tema e som ao log mantendo cache local rápido e preferência religiosa isolada.
- `src/context/AppStateProvider.tsx`, `src/hooks/useSupportModes.ts` -- Incluir `SettingsEvent` em `AnyEvent` e `settings: SettingsState` + `setSupportModes` em `AppStateContextValue` (com `useAppStateOptional`), conectar `useThemePreferences` ao dispatch de `SETTING_CHANGED`, aplicar `resolveSupportModesFromSettings(settings)` via `applySyncedSupportModes`, executar o seed inicial de tema/som/apoio uma vez após `!loading && initialSyncReady && !isDemoActive && deviceId` via `appendGenerated`, e fazer `useSupportModes.toggleMode` despachar `SETTING_CHANGED` quando dentro do provider -- Completa a leitura e escrita reativa das 3 preferências no log de eventos com propagação automática pelo `SyncProvider`.
- `src/modules/settings/__tests__/syncedPreferences.test.ts` -- Criar suíte Vitest cobrindo todos os cenários da matriz I/O: resolução de tema/som/apoio, convergência entre 2 aparelhos via `replayAllEvents` na ordem FR-16, seed na primeira abertura sem evento, não-sobrescrita quando já existe evento do grupo, e garantia de que `domus_is_catholic_v1` nunca gera evento -- Valida todos os ACs da Story 9.3.

**Acceptance Criteria:**
- Given um usuário com dois aparelhos pareados no mesmo grupo, when altera tema, som ou modo de apoio em um aparelho, then o evento `SETTING_CHANGED` correspondente é gravado no log e aplicado no outro aparelho após o replay sem configuração manual adicional.
- Given a primeira abertura após a atualização sem eventos prévios no log para tema, som ou modo de apoio, when `initialSyncReady` libera após o boot, then os valores atuais locais são gravados como eventos `SETTING_CHANGED` no log.
- Given qualquer alteração ou seed inicial de `domus_is_catholic_v1`, when inspecionados os eventos emitidos, then `domus_is_catholic_v1` nunca aparece em nenhum evento `SETTING_CHANGED`.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 15 findings — high 0, medium 7, low 3, false 5, maybe-false 0
- findings:
  - `[medium]` `[patch]` StrictMode / cleanup race em `hasRunSettingsSeedRef` (`AppStateProvider.tsx`) — adicionado `completed` no `useEffect` para restaurar `hasRunSettingsSeedRef.current = false` se o cleanup ocorrer antes da conclusão do seed.
  - `[medium]` `[patch]` Corrida entre seed pendente e `resetApp()` (`AppStateProvider.tsx`) — adicionado `seedEpochRef` incrementado em `resetApp()` e verificado após o `Promise.all`.
  - `[medium]` `[patch]` `resetApp()` não limpava `supportModes` (`AppStateProvider.tsx`, `MonetizationSettingsStore.ts`) — criado `resetLocalSupportModes()` e chamado em `resetApp()`.
  - `[medium]` `[patch]` Modo demo persistia preferências no `AsyncStorage` (`AppStateProvider.tsx`, `useThemePreferences.ts`, `MonetizationSettingsStore.ts`) — passado `isDemoActive` / `persist = !isDemoActive` para não sobrescrever preferências locais reais.
  - `[false]` `[reject]` Preferências mantidas quando `synced*` é `undefined` — comportamento intencional antes da chegada do primeiro evento; `resetApp()` limpa explicitamente via `resetLocalPreferences()` / `resetLocalSupportModes()`.
  - `[low]` `[patch]` `onSyncThemeMode`/`onSyncSoundEnabled` após `AsyncStorage.setItem` sem `try/catch` (`useThemePreferences.ts`) — callback de sync movido para antes da persistência best-effort com `try/catch`.
  - `[low]` `[patch]` `savedTheme` hidratado sem validação (`useThemePreferences.ts`) — validado contra `"system" | "light" | "dark"`.
  - `[low]` `[patch]` `applySyncedSupportModes` sem deduplicação (`MonetizationSettingsStore.ts`) — deduplicação adicionada no filtro de modos válidos.
  - `[false]` `[reject]` Chaves duplicadas entre módulos — `MonetizationSettingsStore` e `useThemePreferences` preservam constantes locais compatíveis com `dataInventory.test.ts`.
  - `[medium]` `[patch]` Falta de testes para `applySyncedSupportModes` e `resetLocalSupportModes` (`supportModes.test.ts`) — cobertura adicionada em `src/modules/monetization/__tests__/supportModes.test.ts`.
  - `[false]` `[reject]` `(ECH-1)` agrupado com StrictMode race acima — mesma causa raiz, corrigido com `completed`.
  - `[false]` `[reject]` `(ECH-2)` agrupado com `resetApp()` supportModes acima — mesma causa raiz, corrigido com `resetLocalSupportModes()`.
  - `[false]` `[reject]` `(VG-1)` agrupado com cobertura de `applySyncedSupportModes` acima — corrigido em `supportModes.test.ts`.
  - `[medium]` `[defer]` `(VG-2)` `useThemePreferences` sem teste unitário em Vitest — importa `react-native` (`useColorScheme`); sem harness RN configurado.
  - `[medium]` `[defer]` `(VG-3)` `useSupportModes` sem teste unitário em Vitest — importa `react-native` transitivamente; sem harness RN configurado.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit` -- **passou**: 0 erros (`eslint`: 0 erros, 12 warnings pré-existentes; `tsc --noEmit`: 0 erros).
- `npx vitest run --maxWorkers=2` -- **passou**: `129 passed (129)` arquivos de teste, `2993 passed (2993)` testes passando.

## Auto Run Result

- **Story:** `9-3-sincronizar-tema-som-e-modo-de-apoio`
- **Status:** `done`
- **Resumo:** Tema (`domus_theme_mode_v1`), som (`domus_sound_enabled_v1`) e modos de apoio (`domus_support_modes_v2`) passam a ser lidos do estado derivado do log (`settings` em `replayAllEvents`) e emitidos como eventos `SETTING_CHANGED`, com seed inicial na primeira abertura após `initialSyncReady` e isolamento completo de `domus_is_catholic_v1`.
- **Arquivos alterados:**
  - `src/modules/settings/syncedPreferences.ts` — resolvers puros e `buildSettingsSeedEvents`
  - `src/modules/monetization/MonetizationSettingsStore.ts` — `applySyncedSupportModes` e `resetLocalSupportModes`
  - `src/hooks/useThemePreferences.ts` — sincronização de tema/som com o log, `resetLocalPreferences`, validação na hidratação e isolamento de modo demo / `domus_is_catholic_v1`
  - `src/context/AppStateProvider.tsx` — exposição de `settings` / `setSupportModes` / `useAppStateOptional`, seed inicial pós-`initialSyncReady` com guarda contra StrictMode/reset, e limpeza em `resetApp`
  - `src/hooks/useSupportModes.ts` — delegação para `AppStateProvider.setSupportModes` com fallback local
  - `src/modules/settings/__tests__/syncedPreferences.test.ts` e `src/modules/monetization/__tests__/supportModes.test.ts` — testes unitários e de convergência FR-16
- **Review findings:** 5 entradas `medium` e 3 `low` corrigidas (patches aplicados), 2 `medium` adiadas (`useThemePreferences` e `useSupportModes` sem harness RN no Vitest), 5 `false` rejeitadas/agrupadas.
- **Follow-up review recommended:** `true` (5 entradas `medium` corrigidas; risco residual específico: wiring de hooks React Native `useThemePreferences` e `useSupportModes` e propagação ponta a ponta em dois aparelhos via Nostr não são exercitados em Vitest puro).
- **Checks:** `eslint .` (0 errors), `tsc --noEmit` (0 errors), `vitest run --maxWorkers=2` (129 files / 2993 tests passed)
