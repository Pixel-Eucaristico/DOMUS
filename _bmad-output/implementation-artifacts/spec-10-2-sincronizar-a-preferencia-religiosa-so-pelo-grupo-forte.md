---
title: 'Story 10.2: Sincronizar a preferência religiosa só pelo Grupo forte'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_revision: 'dcd38f40aed2c9f8536f753171fad9f54dacaca5'
review_loop_iteration: 1
followup_review_recommended: true
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - 'Teste de integração React Native para useThemePreferences e AppStateProvider (sem harness RN no Vitest)'
  - 'Seed automático imediato de domus_is_catholic_v1 ao fazer upgrade para Grupo forte na mesma sessão (sem reiniciar/pull)'
---

<intent-contract>

## Intent

**Problem:** A preferência religiosa (`domus_is_catholic_v1`) hoje fica restrita ao `AsyncStorage` de cada aparelho para não vazar no Grupo antigo (sem criptografia forte), fazendo com que tema e conquistas ligadas a essa preferência divergissem entre aparelhos mesmo quando o usuário já usa Grupo forte.

**Approach:** Promover `domus_is_catholic_v1` para `ALLOWED_SETTING_KEYS` e `docs/inventario-dados.md` (`vira evento`), bloquear sua publicação e importação no Grupo antigo em `src/modules/syncPayload.ts` (`partitionOldGroupEvents` e `selectOldGroupPushEvents`, inclusive durante coexistência), e conectar `useThemePreferences` e `AppStateProvider` para emitir/semear `SETTING_CHANGED` de `domus_is_catholic_v1` exclusivamente quando houver Grupo forte ativo.

## Boundaries & Constraints

**Always:**
- Adicionar `"domus_is_catholic_v1"` em `ALLOWED_SETTING_KEYS` (`packages/settings/src/types.ts`) e atualizar `docs/inventario-dados.md` para `vira evento` (exclusivo do Grupo forte).
- Garantir em `src/modules/syncPayload.ts` (`isOldGroupPublishableEvent`, `partitionOldGroupEvents`, `selectOldGroupPushEvents` e `selectEventsToImport` com `isStrongGroup: false`) que `SETTING_CHANGED` com `payload.key === "domus_is_catholic_v1"` **nunca** seja publicado nem aceito pelo Grupo antigo, inclusive durante a Janela de convivência.
- Permitir `SETTING_CHANGED` de `domus_is_catholic_v1` normalmente em `selectStrongGroupPushEvents` e `selectEventsToImport(..., { isStrongGroup: true })`.
- Sem Grupo forte ativo, não emitir `SETTING_CHANGED` de `domus_is_catholic_v1` nem no `setIsCatholic` nem no seed inicial (mantendo a preferência apenas local em `AsyncStorage`).
- Atualizar os testes de allowlist e inventário (`packages/settings/__tests__/settings.test.ts`, `src/modules/security/__tests__/dataInventory.test.ts`, `src/modules/security/__tests__/settingsSyncGuard.test.ts`) para refletir a promoção de `domus_is_catholic_v1` com restrição ao Grupo forte.

**Never:**
- Alterar `packages/sync`, `ios/`, `android/` ou `replit.*`.
- Usar `vi.mock("react-native")` nos testes.
- Publicar `domus_is_catholic_v1` no canal legado (Grupo antigo) em qualquer circunstância.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Push no Grupo antigo durante coexistência ou legado | Lista com transação + `SETTING_CHANGED` de `domus_theme_mode_v1` + `SETTING_CHANGED` de `domus_is_catholic_v1` | `selectOldGroupPushEvents` exclui `domus_is_catholic_v1` e mantém transação e `domus_theme_mode_v1` | Sem erro |
| Importação pelo Grupo antigo | `selectEventsToImport(events, new Set(), warn, { isStrongGroup: false })` contendo `SETTING_CHANGED` de `domus_is_catholic_v1` | Evento de `domus_is_catholic_v1` é descartado (`excluded >= 1`, ausente em `toAppend`) | Avisa apenas id/type, nunca payload |
| Push e importação no Grupo forte | `selectStrongGroupPushEvents` e `selectEventsToImport(..., { isStrongGroup: true })` com `SETTING_CHANGED` de `domus_is_catholic_v1` | Evento de `domus_is_catholic_v1` é publicado e importado normalmente (`excluded === 0`) | Sem erro |
| Seed inicial sem vs. com Grupo forte | `buildSettingsSeedEvents` com `isCatholic: true`: (a) `isStrongGroup: false`; (b) `isStrongGroup: true` | (a) não emite `SETTING_CHANGED` para `domus_is_catholic_v1`; (b) emite `SETTING_CHANGED` com `value: true` | Sem erro |
| Resolução e convergência FR-16 | Dois eventos `SETTING_CHANGED` de `domus_is_catholic_v1` (`false` em `t1`, `true` em `t2 > t1`) via `replayAllEvents` | `resolveIsCatholicFromSettings(replayed.settings)` retorna `true`; valores inválidos retornam `undefined` | Sem erro |

</intent-contract>

## Code Map

- `packages/settings/src/types.ts` -- `ALLOWED_SETTING_KEYS` (linhas 16-25): adicionar `"domus_is_catholic_v1"`.
- `docs/inventario-dados.md` -- Linha `domus_is_catholic_v1`: atualizar classe para `vira evento` com motivo explícito de sincronização exclusiva no Grupo forte (Story 10.2).
- `src/modules/syncPayload.ts` -- `OLD_GROUP_EXCLUDED_SETTING_KEYS`, `isOldGroupPublishableEvent`, `partitionOldGroupEvents` (linhas 73-83) e `selectOldGroupPushEvents` (linhas 90-95): filtrar `SETTING_CHANGED` cuja `payload.key` esteja em `OLD_GROUP_EXCLUDED_SETTING_KEYS` (`"domus_is_catholic_v1"`) no Grupo antigo, preservando `selectStrongGroupPushEvents` e `isStrongGroup: true`.
- `src/modules/settings/syncedPreferences.ts` -- `IS_CATHOLIC_SETTING_KEY`, `resolveIsCatholicFromSettings`, e `buildSettingsSeedEvents` (aceitando `isCatholic?: boolean | string | null` e `isStrongGroup?: boolean` para semear `domus_is_catholic_v1` somente quando `isStrongGroup === true`).
- `src/hooks/useThemePreferences.ts` -- `ThemePreferencesInput` e `useThemePreferences`: aceitar `syncedIsCatholic?: boolean | null`, `isDemoActive?: boolean` e `onSyncIsCatholic?: (value: boolean) => void`, aplicando `syncedIsCatholic` do log e chamando `onSyncIsCatholic` em `setIsCatholic`.
- `src/context/AppStateProvider.tsx` -- `AppStateProvider`: resolver `syncedIsCatholic`, conectar `handleSyncIsCatholic` verificando `loadStrongGroupSecret()` + `parseGroupSecret` antes de despachar `SETTING_CHANGED` (se não houver Grupo forte ativo ou se `isDemoActive`, não despacha evento), e incluir `isCatholic` + `isStrongGroup` no seed inicial pós-`initialSyncReady`.
- `packages/settings/__tests__/settings.test.ts`, `src/modules/security/__tests__/dataInventory.test.ts`, `src/modules/security/__tests__/settingsSyncGuard.test.ts` -- Atualizar expectativas para as 9 chaves canônicas (`domus_is_catholic_v1` como `vira evento`).
- `src/modules/settings/__tests__/syncedPreferences.test.ts` e `src/modules/__tests__/syncPayload.test.ts` -- Adicionar testes cobrindo toda a matriz I/O (bloqueio no Grupo antigo em push/import, permissão no Grupo forte, seed condicional por `isStrongGroup` e convergência FR-16).

## Tasks & Acceptance

**Execution:**
- `packages/settings/src/types.ts`, `docs/inventario-dados.md`, `packages/settings/__tests__/settings.test.ts`, `src/modules/security/__tests__/dataInventory.test.ts`, `src/modules/security/__tests__/settingsSyncGuard.test.ts` -- Promover `"domus_is_catholic_v1"` para `ALLOWED_SETTING_KEYS` e `vira evento` (exclusivo do Grupo forte) e alinhar os testes de inventário/allowlist -- Mantém fonte única canônica e paridade de inventário.
- `src/modules/syncPayload.ts` -- Adicionar `OLD_GROUP_EXCLUDED_SETTING_KEYS = ["domus_is_catholic_v1"]` e `isOldGroupPublishableEvent`, aplicando em `partitionOldGroupEvents` e `selectOldGroupPushEvents` -- Impede que qualquer evento `SETTING_CHANGED` de `domus_is_catholic_v1` saia ou entre pelo Grupo antigo, inclusive durante coexistência.
- `src/modules/settings/syncedPreferences.ts`, `src/hooks/useThemePreferences.ts`, `src/context/AppStateProvider.tsx` -- Adicionar `resolveIsCatholicFromSettings` e seed condicional (`isStrongGroup === true`) em `syncedPreferences.ts`, sincronizar `isCatholic` em `useThemePreferences.ts` e guardar emissão em `AppStateProvider.tsx` por `loadStrongGroupSecret()` + `parseGroupSecret` -- Garante que sem Grupo forte a preferência continue estritamente no aparelho e com Grupo forte acompanhe os demais aparelhos.
- `src/modules/settings/__tests__/syncedPreferences.test.ts`, `src/modules/__tests__/syncPayload.test.ts` -- Cobrir toda a matriz I/O: exclusão no Grupo antigo (`selectOldGroupPushEvents` e `selectEventsToImport` com `isStrongGroup: false`), aceitação no Grupo forte (`selectStrongGroupPushEvents` e `isStrongGroup: true`), seed condicional (`isStrongGroup` false vs true) e convergência FR-16 -- Valida todos os ACs da Story 10.2.

**Acceptance Criteria:**
- Given `domus_is_catholic_v1` alterada ou semeada com Grupo forte ativo, when ocorre push ou importação, then o evento `SETTING_CHANGED` é publicado e importado **apenas** no Grupo forte e nunca no Grupo antigo (inclusive durante coexistência).
- Given um aparelho sem Grupo forte ativo, when `domus_is_catholic_v1` é alterada ou semeada, then nenhum evento `SETTING_CHANGED` de `domus_is_catholic_v1` é emitido e a preferência permanece local em `AsyncStorage`.

## Spec Change Log

## Review Triage Log

- **Edge Case Hunter (`fa29bfb8`)**
  - `loadStrongGroupSecret().catch(() => null)` no boot seed de `AppStateProvider.tsx` (`medium`) -> **corrigido**.
  - Corrida com `isDemoActiveRef` em `handleSyncIsCatholic` (`medium`) -> **corrigido** com leitura de `isDemoActiveRef.current` dentro de `syncIsCatholicIfStrongGroup`.
  - Seed automático ao ingressar no Grupo forte na mesma sessão -> **adiado** (mais seguro aguardar pull ou reinício para evitar sobrescrever escolha remota).
- **Verification Gap (`6936b102`)**
  - Extração e teste unitário de `syncIsCatholicIfStrongGroup` (`medium`) -> **corrigido** em `src/modules/settings/syncedPreferences.ts` e `src/modules/settings/__tests__/syncedPreferences.test.ts`.
  - Teste do hook `useThemePreferences` (`medium`) -> **adiado** (sem harness `react-native` no Vitest; lógica pura coberta por `syncedPreferences.test.ts`).
- **Blind Hunter (`135a526c`)**
  - `resetLocalPreferences()` não resetava `isCatholic` nem removia `IS_CATHOLIC_KEY` (`low`) -> **corrigido** em `src/hooks/useThemePreferences.ts`.
  - Hidratação de `savedCatholic` fora de `"true" | "false"` (`low`) -> **corrigido** em `src/hooks/useThemePreferences.ts`.
  - Teste explícito de exclusão de `domus_is_catholic_v1` no Grupo antigo em `settingsSyncGuard.test.ts` (`low`) -> **corrigido** em `src/modules/security/__tests__/settingsSyncGuard.test.ts`.
- **Intent Alignment (`8934194d`)**
  - Leitura canônica (A / C1) implementada fielmente.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit && npx vitest run --maxWorkers=2` -- passou após os ajustes finais (`eslint`: 0 erros, 13 warnings pré-existentes; `tsc --noEmit`: 0 erros; `vitest`: 134 arquivos, 3038 testes passando).

## Auto Run Result

- **Story:** `10-2-sincronizar-a-preferência-religiosa-só-pelo-grupo-forte`
- **Status:** `done` (`followup_review_recommended: true` — risco residual: wiring RN em `useThemePreferences` / `AppStateProvider` não montado no Vitest)
- **Commit:** pendente nesta execução (ver histórico git para o hash final).
