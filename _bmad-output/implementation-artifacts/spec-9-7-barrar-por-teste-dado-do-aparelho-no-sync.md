---
title: 'Story 9.7: Barrar por teste dado do aparelho no sync'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_revision: 'c878ac5e335c643777f14965abee5aa7d8bb5589'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Embora `ALLOWED_SETTING_KEYS` restrinja `SETTING_CHANGED` às chaves sincronizáveis, não existe uma suíte de testes dedicada que barre explicitamente todas as chaves locais do aparelho (PIN/biometria, consentimentos, tour, anúncio do dia, tokens, `deviceId`, cursores de sync e segredos) e exija que a allowlist permaneça idêntica às chaves `vira evento` de `docs/inventario-dados.md`.

**Approach:** Criar `src/modules/security/__tests__/settingsSyncGuard.test.ts` verificando que `ALLOWED_SETTING_KEYS` em `packages/settings/src/types.ts` é a fonte única canônica e coincide exatamente (ida e volta) com as entradas `vira evento` de `docs/inventario-dados.md`, além de testar que todas as chaves não sincronizáveis/segredos são recusadas por `isAllowedSettingKey`, `createSettingChangedEvent`, `settingsReducer` e `replayAllEvents`.

## Boundaries & Constraints

**Always:**
- Validar igualdade bidirecional exata entre `ALLOWED_SETTING_KEYS` (`packages/settings/src/types.ts`) e as chaves classificadas como `vira evento` em `docs/inventario-dados.md` (acrescentar uma chave na allowlist sem atualizar o inventário falha o teste).
- Testar explicitamente a recusa de: PIN/biometria (`domus_security_settings_v1`), consentimento de telemetria (`domus_analytics_settings_v1`, `domus_personalized_ads_v1`, `domus_external_lookups_v1`, `AIDataPermissions`), tour (`domus_welcome_done_v1`, `domus_screen_intro_v1_*`), anúncio do dia (`domus_daily_ad_last_v1`), tokens/segredos (`domus_gdrive_tokens_v1`, `domus_ocr_cloud_vision_api_key`, `domus_ai_key_*`, `domus_auto_backup_device_key`, `domus_nostr_group_code`, `domus_strong_group_secret_v1`, `domus_ai_tokens_v1`, `domus_ai_tokens_monthly_v1`), `deviceId` (`domus_device_id`), cursores/estado de sync (`domus_last_sync_ts`, `domus_nostr_last_push_hash`, `domus_group_push_hashes_v1`, `domus_sync_group_tracking_v1`, `@domus:handled_remote_markers`, `domus_relay_cursor_v1`, `domus_nostr_last_pull_ts`, `domus_legacy_cutoff_warning_sent_*`) e `domus_is_catholic_v1`.
- Verificar dinamicamente que **toda** entrada de `docs/inventario-dados.md` cuja classe não seja `vira evento` é recusada.
- Verificar estaticamente que `ALLOWED_SETTING_KEYS` não está duplicada em outro módulo de produção (`packages/`, `src/`, `app/`).

**Never:**
- Alterar `packages/sync`, `ios/`, `android/` ou `replit.*`.
- Usar `vi.mock("react-native")` nos testes.
- Importar outro arquivo `*.test.ts` (manter `settingsSyncGuard.test.ts` autossuficiente).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Recusa de chaves locais explícitas | `domus_security_settings_v1`, `domus_analytics_settings_v1`, `domus_welcome_done_v1`, `domus_daily_ad_last_v1`, `domus_gdrive_tokens_v1`, `domus_device_id`, `domus_relay_cursor_v1`, `domus_is_catholic_v1` etc. | `isAllowedSettingKey` retorna `false`, `createSettingChangedEvent` lança erro, `settingsReducer` e `replayAllEvents` não gravam em `settings.values` | `createSettingChangedEvent` lança erro |
| Recusa dinâmica de todo o inventário fora de `vira evento` | Todas as entradas de `docs/inventario-dados.md` com classe `não sincroniza`, `não sincroniza (consentimento por aparelho)`, `é segredo` ou `usa outro canal` | Nenhuma chave é aceita por `isAllowedSettingKey` nem por `createSettingChangedEvent` | `createSettingChangedEvent` lança erro |
| Igualdade bidirecional `ALLOWED_SETTING_KEYS` ↔ `docs/inventario-dados.md` | `ALLOWED_SETTING_KEYS` vs. linhas `vira evento` de `docs/inventario-dados.md` | Conjuntos idênticos (mesmo tamanho e mesmas chaves); acrescentar chave em `ALLOWED_SETTING_KEYS` sem atualizar o inventário falha o teste | Nenhum |
| Fonte única da allowlist | Arquivos `.ts`/`.tsx` em `packages/`, `src/`, `app/` | Apenas `packages/settings/src/types.ts` define `ALLOWED_SETTING_KEYS` | Nenhum |

</intent-contract>

## Code Map

- `packages/settings/src/types.ts` -- `ALLOWED_SETTING_KEYS` (linhas 16-25), `isAllowedSettingKey` (linhas 31-33) e `createSettingChangedEvent` (linhas 56-73).
- `packages/settings/src/reducer.ts` -- `settingsReducer` (linhas 22-62).
- `docs/inventario-dados.md` -- Tabela canônica de chaves fora do log (classes `vira evento`, `não sincroniza`, `não sincroniza (consentimento por aparelho)`, `é segredo`, `usa outro canal`).
- `src/modules/security/__tests__/settingsSyncGuard.test.ts` -- Novo arquivo de teste Vitest a criar cobrindo toda a matriz I/O.

## Tasks & Acceptance

**Execution:**
- `src/modules/security/__tests__/settingsSyncGuard.test.ts` -- Criar suíte Vitest que verifica igualdade bidirecional entre `ALLOWED_SETTING_KEYS` e as chaves `vira evento` de `docs/inventario-dados.md`, unicidade da definição de `ALLOWED_SETTING_KEYS` no código de produção, e recusa completa (`isAllowedSettingKey`, `createSettingChangedEvent`, `settingsReducer`, `replayAllEvents`) de todas as chaves de PIN/biometria, consentimentos, tour, anúncio do dia, tokens/segredos, `deviceId`, cursores de sync e demais chaves fora de `vira evento` -- Garante que nenhum dado local do aparelho possa entrar no sync via `SETTING_CHANGED`.

**Acceptance Criteria:**
- Given tentativas de gerar ou aplicar `SETTING_CHANGED` com chaves de PIN/biometria, consentimento de telemetria, tour, anúncio do dia, tokens, `deviceId` ou cursores de sync, when executada a suíte de testes, then todas são recusadas e não entram no estado de `settings`.
- Given `ALLOWED_SETTING_KEYS` em `packages/settings/src/types.ts` e `docs/inventario-dados.md`, when comparadas na suíte de testes, then coincidem exatamente com as entradas `vira evento` e qualquer chave nova sem atualização do inventário falha o teste.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 6 findings — high 0, medium 0, low 4, false 2, maybe-false 0
- findings:
  - `[low]` `[patch]` `rawCell` não utilizado e alias entre parênteses em `docs/inventario-dados.md` ignorado na checagem dinâmica (`settingsSyncGuard.test.ts`) — substituído por `extractBacktickKeys` incluindo todos os aliases do inventário.
  - `[low]` `[patch]` Varredura de `ALLOWED_SETTING_KEYS` cobria apenas `.ts`/`.tsx` (`settingsSyncGuard.test.ts`) — ampliada para `.js`/`.jsx`/`.mjs`/`.cjs`.
  - `[low]` `[patch]` `replayAllEvents` no helper `assertKeyRejectedEverywhere` não verificava `quarantine` nem preservação de preferência válida (`settingsSyncGuard.test.ts`) — adicionada seed válida `domus_theme_mode_v1: "dark"` e asserção de `quarantine: []`.
  - `[false]` `[reject]` Subcampos sensíveis dentro das chaves `vira evento` — já cobertos pelas suítes específicas das Stories 9.4, 9.5 e 9.6 (`syncedAISettings.test.ts`, `syncedOCRConfig.test.ts`, `syncedDriveBackupPref.test.ts`).
  - `[low]` `[patch]` Entradas de borda (`" domus_security_settings_v1 "`, `"__proto__"`, `"constructor"`) ausentes (`settingsSyncGuard.test.ts`) — adicionadas a `EXPLICIT_LOCAL_AND_SECRET_KEYS`.
  - `[false]` `[reject]` `Object.freeze(ALLOWED_SETTING_KEYS)` — `ALLOWED_SETTING_KEY_SET` é um `Set` privado instanciado na carga do módulo; mutação externa do array não afeta `isAllowedSettingKey`.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit` -- **passou**: 0 erros (`eslint`: 0 erros, 13 warnings; `tsc --noEmit`: 0 erros).
- `npx vitest run --maxWorkers=2` -- **passou**: `134 passed (134)` arquivos de teste, `3027 passed (3027)` testes passando.

## Auto Run Result

- **Story:** `9-7-barrar-por-teste-dado-do-aparelho-no-sync`
- **Status:** `done`
- **Resumo:** Criada suíte autossuficiente `src/modules/security/__tests__/settingsSyncGuard.test.ts` garantindo igualdade bidirecional entre `ALLOWED_SETTING_KEYS` e `docs/inventario-dados.md` (`vira evento`), unicidade da allowlist e recusa completa de todas as chaves locais do aparelho e segredos.
- **Arquivos alterados:**
  - `src/modules/security/__tests__/settingsSyncGuard.test.ts` — testes de paridade com inventário, fonte única da allowlist e recusa explícita/dinâmica de chaves locais e segredos
- **Review findings:** 4 entradas `low` corrigidas (patches aplicados), 0 `medium`, 0 `high`, 2 `false` rejeitadas.
- **Follow-up review recommended:** `false` (0 entradas `high`/`medium` corrigidas).
- **Checks:** `eslint .` (0 errors), `tsc --noEmit` (0 errors), `vitest run --maxWorkers=2` (134 files / 3027 tests passed)
