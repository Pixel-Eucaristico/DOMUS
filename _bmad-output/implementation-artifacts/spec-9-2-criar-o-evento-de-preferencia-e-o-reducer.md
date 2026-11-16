---
title: 'Story 9.2: Criar o evento de preferência e o reducer'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_revision: 'fbdc8544448e65c13f25786be95def3e2aaeaf0e'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - "Wiring de `settings` e `SettingsEvent` em `src/context/AppStateProvider.tsx` (escopo das Stories 9.3+)"
---

<intent-contract>

## Intent

**Problem:** As preferências do usuário existem apenas em `AsyncStorage`/`SecureStore` locais e não possuem um tipo de evento nem reducer puro no log para convergir entre aparelhos.

**Approach:** Criar o pacote puro `packages/settings` (sem `react`, `react-native` nem `expo`) definindo o evento `SETTING_CHANGED` (com `key`, `value` e `schemaVersion`), a allowlist canônica de chaves sincronizáveis e `settingsReducer`, registrando `SETTING_CHANGED` em `SCHEMA_REGISTRY`, `PAYLOAD_SPECS` e roteando-o em `replayAllEvents`.

## Boundaries & Constraints

**Always:**
- Manter `packages/settings` 100% puro: nenhum import de `react`, `react-native` ou `expo*`, e sem `Date.now` / `Math.random` / IO no reducer.
- Usar a allowlist canônica das chaves classificadas como `vira evento` em `docs/inventario-dados.md` (`domus_theme_mode_v1`, `domus_sound_enabled_v1`, `domus_support_modes_v2`, `domus_notification_settings_v1`, `@domus:ocr_config`, `domus_ai_settings_v1`, `domus_ai_custom_prices`).
- Garantir que `settingsReducer` aplique o último evento pela ordem total `(timestamp, deviceId, id)` (FR-16), ignore chaves desconhecidas sem lançar erro e ignore `schemaVersion` futura sem falha.
- Registrar `SETTING_CHANGED` em `SCHEMA_REGISTRY` (`current: 1, stamp: true`), `PAYLOAD_SPECS` (`{ key: str }`) e `KNOWN_EVENT_TYPES` / `replayAllEvents`.

**Never:**
- Alterar `packages/sync`, `ios/`, `android/` ou `replit.*`.
- Usar `vi.mock("react-native")` nos testes.
- Migrar telas/hooks de tema, som, IA, OCR ou Drive nesta story (escopo das Stories 9.3–9.6).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Último evento vence pela ordem FR-16 | Dois `SETTING_CHANGED` para `domus_theme_mode_v1` em ordem de chegada invertida (`t2: "dark"` seguido de `t1: "light"`, ou empate de `timestamp` resolvido por `deviceId`/`id`) | `replayAllEvents` ordena por `(timestamp, deviceId, id)` e `replayed.settings.values["domus_theme_mode_v1"]` vale `"dark"` | Nenhum erro esperado |
| Chave desconhecida | `SETTING_CHANGED` com `key: "chave_desconhecida_futuro"` e `value: 123` | `settingsReducer` e `replayAllEvents` ignoram a chave sem alterar `state.values`, sem lançar erro e sem mandar à Quarentena | Nenhum erro esperado |
| Versão futura (`schemaVersion > 1`) | `SETTING_CHANGED` com `schemaVersion: 99` no `replayAllEvents` ou direto no `settingsReducer` | Aparelho com versão antiga ignora o evento sem falha (em `replayAllEvents`, vai para `quarantine` como `future_schema_version` sem quebrar; em `settingsReducer`, retorna `state` inalterado) | Nenhum erro esperado |
| Pureza do pacote | Imports de todos os arquivos em `packages/settings/` | Nenhum import de `react`, `react-native` ou `expo` | Teste falha se houver import proibido |

</intent-contract>

## Code Map

- `packages/events/src/schemaVersion.ts` -- `SCHEMA_REGISTRY` (linha 64): registrar `SETTING_CHANGED: { current: 1, stamp: true }`.
- `packages/events/src/factory.ts` -- `createEvent` usado pelos criadores de eventos dos pacotes.
- `src/context/replayValidation.ts` -- `PAYLOAD_SPECS` (linhas 168-215): registrar `SETTING_CHANGED: { key: str }`.
- `src/context/replay.ts` -- `ReplayResult` (linha 62), `KNOWN_EVENT_TYPES` (linha 91), `ReplayReducers` (linha 122), `DEFAULT_REDUCERS` (linha 294) e `replayAllEvents` (linha 390): rotear `SETTINGS_TYPES` para `reducers.settings` e retornar `settings` em `ReplayResult`.
- `packages/settings/` -- Novo pacote puro a criar (`index.ts`, `src/types.ts`, `src/reducer.ts`, `__tests__/settings.test.ts`).

## Tasks & Acceptance

**Execution:**
- `packages/settings/src/types.ts`, `packages/settings/src/reducer.ts`, `packages/settings/index.ts` -- Criar pacote puro `packages/settings` com `SETTINGS_EVENTS.SETTING_CHANGED`, `ALLOWED_SETTING_KEYS`, `CURRENT_SETTING_SCHEMA_VERSION = 1`, `createInitialSettingsState`, `createSettingChangedEvent`, `isAllowedSettingKey` e `settingsReducer` -- Fornece o evento versionado e reducer puro livre de `react`/`react-native`/`expo`.
- `packages/events/src/schemaVersion.ts`, `src/context/replayValidation.ts`, `src/context/replay.ts` -- Registrar `SETTING_CHANGED` em `SCHEMA_REGISTRY` (`current: 1, stamp: true`), `PAYLOAD_SPECS` (`{ key: str }`), `KNOWN_EVENT_TYPES` e rotear em `replayAllEvents` retornando `settings` no `ReplayResult` -- Integra `SETTING_CHANGED` ao replay determinístico do app.
- `packages/settings/__tests__/settings.test.ts` -- Criar testes unitários e de integração com `replayAllEvents` cobrindo toda a matriz I/O (ordem FR-16, chave desconhecida ignorada sem erro, `schemaVersion` futura ignorada sem falha, allowlist e verificação estática de ausência de imports `react`/`react-native`/`expo`) -- Valida todos os ACs da Story 9.2.

**Acceptance Criteria:**
- Given eventos `SETTING_CHANGED` em ordem arbitrária de chegada no log, when `replayAllEvents` processa os eventos, then para cada chave sincronizável vale o valor do último evento pela ordem total `(timestamp, deviceId, id)`.
- Given um evento `SETTING_CHANGED` com chave desconhecida ou `schemaVersion` superior à suportada, when processado pelo reducer ou pelo replay, then é ignorado sem erro nem falha no app.
- Given todos os arquivos de `packages/settings`, when inspecionados seus imports, then não importam `react`, `react-native` nem `expo`.

## Spec Change Log

## Review Triage Log

- **Edge Case Hunter (`576ffcbc`)**: sem achados.
- **Verification Gap (`8cb12f58`)**: sem achados.
- **Intent Alignment (`df518f83`)**: alinhamento A confirmado; observações sobre caminho genérico `unknown_type` em versões antigas e guarda redundante de `schemaVersion` em `settingsReducer` mantidas intencionalmente para defesa em uso direto do reducer.
- **Blind Hunter (`6754378d`)**:
  - `[corrigido]` `createSettingChangedEvent` restringido para `key: AllowedSettingKey` com validação em runtime (`isAllowedSettingKey`).
  - `[corrigido]` `PAYLOAD_SPECS.SETTING_CHANGED` em `src/context/replayValidation.ts` atualizado para `{ key: { kind: "string", nonEmpty: true } }`.
  - `[corrigido]` `settingsReducer` passa a ignorar eventos com `payload.value === undefined` sem gravar chave indefinida.
  - `[falso-positivo / intencional]` guarda de `schemaVersion` e `CURRENT_SETTING_SCHEMA_VERSION = 1` em `packages/settings` mantidos para manter o package puro desacoplado de `packages/events/src/schemaVersion.ts` e seguro em chamadas diretas ao reducer.
  - `[adiado]` wiring em `AppStateProvider.tsx` pertence às Stories 9.3+.
  - `[corrigido]` testes ampliados em `packages/settings/__tests__/settings.test.ts` cobrindo `0`, `""`, rejeição de chave inválida em `createSettingChangedEvent` e `payload.value === undefined`.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit` -- **passou**: 0 erros (`eslint`: 0 erros, 12 warnings pré-existentes; `tsc --noEmit`: 0 erros).
- `npx vitest run --maxWorkers=2` -- **passou**: `128 passed (128)` arquivos de teste, `2984 passed (2984)` testes passando.

## Auto Run Result

- **Story:** `9-2-criar-o-evento-de-preferência-e-o-reducer`
- **Status:** `done`
- **Checks:** `eslint .` (0 errors), `tsc --noEmit` (0 errors), `vitest run --maxWorkers=2` (128 files / 2984 tests passed)
