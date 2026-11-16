---
title: 'Story 9.6: Sincronizar a preferência do backup no Drive'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_revision: 'af0f59640dc0441057c7d2549ed43c943ccbc011'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Testes automatizados de hook/tela React Native (`useGoogleDriveBackup`, `AppStateProvider` seed e `app/backup.tsx`) sem harness RN no Vitest.
    evidence: |-
      `useGoogleDriveBackup.ts`, `AppStateProvider.tsx` e `app/backup.tsx` importam `react-native` (`Platform`, componentes RN), não podendo ser executados no Vitest conforme `AGENTS.md`.
    location: >-
      src/hooks/useGoogleDriveBackup.ts, src/context/AppStateProvider.tsx, app/backup.tsx
    severity: medium
---

<intent-contract>

## Intent

**Problem:** A preferência "backup do Drive ativo" e o e-mail da conta conectada ficam restritos a cada aparelho, de modo que um segundo aparelho do mesmo grupo não sabe que o backup no Drive está ativo nem pede ao usuário para conectar o Drive nele.

**Approach:** Registrar a chave canônica `domus_gdrive_backup_pref_v1` na allowlist de `@packages/settings` e em `docs/inventario-dados.md`, criar o módulo puro `src/modules/backup/domain/syncedDriveBackupPref.ts` (permitindo apenas `enabled` e `email`, nunca tokens OAuth), conectar `AppStateProvider` e `useGoogleDriveBackup` para emitir/ler `SETTING_CHANGED` e exibir `"Conectar o Drive neste aparelho"` em `app/backup.tsx` quando o backup estiver ativo no grupo mas este aparelho ainda não estiver logado.

## Boundaries & Constraints

**Always:**
- Adicionar `domus_gdrive_backup_pref_v1` em `ALLOWED_SETTING_KEYS` (`packages/settings/src/types.ts`) e em `docs/inventario-dados.md` (`vira evento`).
- Sanitizar o payload por allowlist estrita (`pickSyncedDriveBackupPref`) permitindo apenas `enabled` (`boolean`) e `email` (`string` opcional não vazia).
- Garantir que tokens do Drive (`accessToken`, `refreshToken`, `expiresAt`, `clientId`, `domus_gdrive_tokens_v1`, `domus_auto_backup_device_key`) **nunca** entrem em nenhum evento `SETTING_CHANGED`: cada aparelho faz o próprio login OAuth.
- Exibir exatamente o texto `"Conectar o Drive neste aparelho"` em `app/backup.tsx` quando `driveBackupPref?.enabled === true` e o aparelho local não estiver conectado (`!drive.isConnected`).
- Manter `src/modules/backup/domain/syncedDriveBackupPref.ts` livre de `react-native` / `expo` para testes unitários no Vitest.

**Never:**
- Alterar `packages/sync`, `ios/`, `android/` ou `replit.*`.
- Usar `vi.mock("react-native")` nos testes.
- Sincronizar `domus_gdrive_tokens_v1`, `accessToken`, `refreshToken`, `domus_auto_backup_device_key` ou `domus_auto_backup_last_ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sanitização estrita de preferência do Drive | `{ enabled: true, email: " user@domus.app ", accessToken: "tok", refreshToken: "ref", expiresAt: 999 }` | `pickSyncedDriveBackupPref` retorna `{ enabled: true, email: "user@domus.app" }`; nenhum campo de token aparece | Descarta `email` vazio e tokens |
| Resolução pelo estado do log | `settings.values.domus_gdrive_backup_pref_v1` = `{ enabled: true, email: "a@b.com", accessToken: "x" }` | `resolveDriveBackupPrefFromSettings` retorna `{ enabled: true, email: "a@b.com" }` sem tokens; retorna `undefined` se inválido/ausente | Sem erro |
| Prompt em aparelho sem login | `pref = { enabled: true, email: "a@b.com" }`, `isConnectedOnThisDevice = false` | `shouldPromptDriveConnectOnThisDevice` retorna `true`; em aparelho já conectado (`true`) ou com `enabled = false`, retorna `false` | Nenhum |
| Seed inicial após `initialSyncReady` | `allEvents` sem `domus_gdrive_backup_pref_v1`; `isConnected = true`, `email = "a@b.com"` | `buildDriveBackupPrefSeedEvents` gera 1 evento `SETTING_CHANGED` com `{ enabled: true, email: "a@b.com" }` (sem tokens); se `isConnected = false`, não emite seed | Sem erro |
| Convergência entre dois aparelhos via `replayAllEvents` | Aparelho A liga (`t1`, `{ enabled: true, email: "a@b.com" }`), depois desliga (`t2 > t1`, `{ enabled: false }`) | `replayAllEvents` converge ambos para `{ enabled: false }` pela ordem FR-16, sem tokens em nenhum evento | Sem erro; `quarantine` vazio |

</intent-contract>

## Code Map

- `packages/settings/src/types.ts` -- `ALLOWED_SETTING_KEYS` (linhas 16-24): adicionar `"domus_gdrive_backup_pref_v1"`.
- `packages/settings/__tests__/settings.test.ts` -- `ALLOWED_SETTING_KEYS` (linhas 41-50): atualizar para as 8 chaves canônicas.
- `docs/inventario-dados.md` -- Tabela do inventário: adicionar linha `domus_gdrive_backup_pref_v1` com classe `vira evento` e origem `src/modules/backup/domain/syncedDriveBackupPref.ts`.
- `src/modules/backup/domain/syncedDriveBackupPref.ts` -- Novo módulo puro (sem `react-native`) com `DRIVE_BACKUP_PREF_SETTING_KEY`, `DriveBackupPreference`, `pickSyncedDriveBackupPref`, `resolveDriveBackupPrefFromSettings`, `shouldPromptDriveConnectOnThisDevice` e `buildDriveBackupPrefSeedEvents`.
- `src/context/AppStateProvider.tsx` -- `AppStateContextValue` e `AppStateProvider`: resolver `driveBackupPref`, expor `driveBackupPref` e `setDriveBackupPref` (guardado por `!isDemoActive`), e incluir `buildDriveBackupPrefSeedEvents` no seed inicial pós-`initialSyncReady`.
- `src/hooks/useGoogleDriveBackup.ts` -- `useGoogleDriveBackup` (linhas 15-199): emitir `setDriveBackupPref` ao conectar (`{ enabled: true, email }`) e desconectar (`{ enabled: false }`), e expor `needsLocalDriveLogin` e `syncedAccountEmail`.
- `app/backup.tsx` -- Bloco `!drive.isConnected` (linhas 361-378): exibir `"Conectar o Drive neste aparelho"` (e dica com `drive.syncedAccountEmail` quando presente) quando `drive.needsLocalDriveLogin` for verdadeiro.
- `src/modules/backup/domain/__tests__/syncedDriveBackupPref.test.ts` -- Novo arquivo de testes Vitest cobrindo toda a matriz I/O e ausência de tokens nos eventos.

## Tasks & Acceptance

**Execution:**
- `packages/settings/src/types.ts`, `packages/settings/__tests__/settings.test.ts`, `docs/inventario-dados.md` -- Adicionar `"domus_gdrive_backup_pref_v1"` em `ALLOWED_SETTING_KEYS`, atualizar teste da allowlist e registrar a chave como `vira evento` em `docs/inventario-dados.md` -- Mantém fonte única canônica sincronizada com o inventário.
- `src/modules/backup/domain/syncedDriveBackupPref.ts` -- Criar módulo puro com `pickSyncedDriveBackupPref`, `resolveDriveBackupPrefFromSettings`, `shouldPromptDriveConnectOnThisDevice` e `buildDriveBackupPrefSeedEvents` -- Garante sanitização estrita excluindo qualquer token OAuth.
- `src/context/AppStateProvider.tsx`, `src/hooks/useGoogleDriveBackup.ts`, `app/backup.tsx` -- Expor `driveBackupPref` e `setDriveBackupPref` no `AppStateProvider` (com seed inicial pós-`initialSyncReady` quando conectado localmente), emitir `SETTING_CHANGED` em `connect`/`disconnect` de `useGoogleDriveBackup` e exibir `"Conectar o Drive neste aparelho"` em `app/backup.tsx` quando `needsLocalDriveLogin` for verdadeiro -- Completa a propagação da preferência sem compartilhar tokens.
- `src/modules/backup/domain/__tests__/syncedDriveBackupPref.test.ts` -- Criar suíte Vitest cobrindo toda a matriz I/O, verificação de ausência de tokens em eventos e convergência FR-16 via `replayAllEvents` -- Valida todos os ACs da Story 9.6.

**Acceptance Criteria:**
- Given backup no Google Drive conectado em um aparelho, when outro aparelho do grupo ainda não fez login no Drive, then a preferência sincronizada marca backup ativo e exibe `"Conectar o Drive neste aparelho"` em `app/backup.tsx`.
- Given qualquer emissão ou seed inicial de `domus_gdrive_backup_pref_v1`, when inspecionado o payload do evento `SETTING_CHANGED`, then apenas `enabled` e `email` são incluídos e nenhum token do Drive aparece em nenhum evento.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 11 findings — high 0, medium 3, low 2, false 6, maybe-false 0
- findings:
  - `[low]` `[patch]` Banner em `app/backup.tsx` mencionava "enviar e restaurar backups" quando o Drive apenas envia — texto ajustado para `"enviar o auto-backup"`.
  - `[medium]` `[patch]` Flicker inicial de `needsLocalDriveLogin` antes da leitura assíncrona de `GoogleDriveService.isConnected()` (`useGoogleDriveBackup.ts`) — adicionado estado `isDriveStateLoaded` (com cleanup `mounted`) para aguardar o carregamento inicial.
  - `[false]` `[reject]` `disconnect()` desabilitar `driveBackupPref` — comportamento esperado quando o usuário desconecta o backup no Drive (conectando em outro aparelho reabilita).
  - `[false]` `[reject]` `resetApp()` manter `domus_gdrive_tokens_v1` — tokens OAuth locais (`é segredo`) seguem o mesmo padrão das chaves de API locais.
  - `[false]` `[reject]` Expiração de token implícito na web acionar `needsLocalDriveLogin` — na web com token expirado, o usuário realmente precisa reconectar o Drive.
  - `[false]` `[reject]` `settingsReducer` não validar esquema por chave — `resolveDriveBackupPrefFromSettings` e `pickSyncedDriveBackupPref` garantem a sanitização na escrita e leitura.
  - `[medium]` `[defer]` `(VG-1)` `useGoogleDriveBackup` e `app/backup.tsx` sem testes automatizados de hook/UI no Vitest — importam `react-native`, sem harness RN configurado.
  - `[low]` `[patch]` `setEmail(userEmail)` armazenava `""` se userinfo falhasse em `connectWeb` (`useGoogleDriveBackup.ts`) — alterado para `setEmail(userEmail || null)`.
  - `[false]` `[reject]` `(ECH-1)` agrupado com flicker de `needsLocalDriveLogin` acima — corrigido com `isDriveStateLoaded`.
  - `[medium]` `[defer]` `(VG-2)` `AppStateProvider` seed e `setDriveBackupPref` sem teste de renderização React Native no Vitest — depende de `react-native`, sem harness RN configurado.
  - `[false]` `[reject]` `(IA-1)` observação descritiva sobre acoplamento connect/disconnect e cobertura em Vitest puro.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit` -- **passou**: 0 erros (`eslint`: 0 erros, 13 warnings; `tsc --noEmit`: 0 erros).
- `npx vitest run --maxWorkers=2` -- **passou**: `133 passed (133)` arquivos de teste, `3023 passed (3023)` testes passando.

## Auto Run Result

- **Story:** `9-6-sincronizar-a-preferência-do-backup-no-drive`
- **Status:** `done`
- **Resumo:** Chave canônica `domus_gdrive_backup_pref_v1` registrada em `ALLOWED_SETTING_KEYS` e `docs/inventario-dados.md`; preferência `{ enabled, email? }` sincroniza via `SETTING_CHANGED` sem tokens OAuth, e aparelhos ainda não logados exibem `"Conectar o Drive neste aparelho"` em `app/backup.tsx`.
- **Arquivos alterados:**
  - `packages/settings/src/types.ts`, `packages/settings/__tests__/settings.test.ts`, `docs/inventario-dados.md` — adição de `domus_gdrive_backup_pref_v1` à allowlist canônica e ao inventário
  - `src/modules/backup/domain/syncedDriveBackupPref.ts` — allowlist estrita, `pickSyncedDriveBackupPref`, `resolveDriveBackupPrefFromSettings`, `shouldPromptDriveConnectOnThisDevice` e `buildDriveBackupPrefSeedEvents`
  - `src/context/AppStateProvider.tsx` — exposição de `driveBackupPref`/`setDriveBackupPref` e seed inicial pós-`initialSyncReady`
  - `src/hooks/useGoogleDriveBackup.ts` — emissão de `SETTING_CHANGED` ao conectar/desconectar, `isDriveStateLoaded` contra flicker inicial e `needsLocalDriveLogin`
  - `app/backup.tsx` — exibição de `"Conectar o Drive neste aparelho"` e dica da conta sincronizada quando `needsLocalDriveLogin` é verdadeiro
  - `src/modules/backup/domain/__tests__/syncedDriveBackupPref.test.ts` — testes unitários e convergência FR-16 sem tokens
- **Review findings:** 1 entrada `medium` e 2 `low` corrigidas (patches aplicados), 2 `medium` adiadas (`useGoogleDriveBackup`/`AppStateProvider`/`app/backup.tsx` sem harness RN no Vitest), 6 `false` rejeitadas/agrupadas.
- **Follow-up review recommended:** `false` (apenas 1 entrada `medium` corrigida).
- **Checks:** `eslint .` (0 errors), `tsc --noEmit` (0 errors), `vitest run --maxWorkers=2` (133 files / 3023 tests passed)
