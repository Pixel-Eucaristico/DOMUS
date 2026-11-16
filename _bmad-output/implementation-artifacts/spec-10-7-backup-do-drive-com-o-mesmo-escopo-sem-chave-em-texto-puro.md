---
title: 'Story 10.7: Backup do Drive com o mesmo escopo, sem chave em texto puro'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_revision: 'a14cb41e90455284db37aa6282d3ed0038bbbd32'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Teste de execução para o wiring de AppStateProvider.restoreFromBackup e fluxo Drive em React Native
    evidence: |-
      AppStateProvider.tsx importa react-native e módulos nativos do Expo que não podem ser montados no Vitest (AGENTS.md).
    location: >-
      src/context/AppStateProvider.tsx:350-372
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Ao restaurar um backup em um aparelho novo (`AppStateProvider.restoreFromBackup`), os gastos, lista de desejos, troféus e preferências sincronizáveis já são restaurados pelo replay do log, mas `restoreFromBackup` ainda não aciona `applyIncomingKeySyncEvents` — impedindo que chaves de IA e OCR cifradas no backup (`KEY_SYNC_UPDATED`) retornem mesmo quando o aparelho novo está no Grupo forte com opt-in ligado — e falta um teste ponta a ponta validando paridade completa de escopo e ausência de chaves em texto puro no arquivo de backup.

**Approach:** Adicionar o helper puro `applyRestoredKeySyncEvents` em `src/modules/strongGroup/keySyncReceiver.ts` (que verifica `!isWeb`, `!isDemoActive`, presença de segredo válido do Grupo forte e `getKeySyncOptIn() === true`), conectá-lo a `restoreFromBackup` em `src/context/AppStateProvider.tsx`, e criar `src/modules/backup/application/__tests__/backupScopeRestore.test.ts` cobrindo exportação, ausência de chaves em texto puro, restauração de gastos/desejos/troféus/preferências e restauração condicional das chaves no aparelho novo.

## Boundaries & Constraints

**Always:**
- `restoreFromBackup` deve preservar gastos, lista de desejos, troféus/gamificação e todas as preferências sincronizáveis (`SETTING_CHANGED`, inclusive `domus_is_catholic_v1` da Story 10.2).
- O arquivo de backup (exportação plana, cifrada ou conteúdo enviado ao Drive) nunca deve conter chaves de IA ou OCR em texto puro — apenas eventos `KEY_SYNC_UPDATED` cifrados com AES-256-GCM (Story 10.4).
- Na restauração de backup em um aparelho novo, as chaves em `KEY_SYNC_UPDATED` só devem ser decifradas e salvas no `SecureStore` se o aparelho for nativo (`!isWeb`), `!isDemoActive`, possuir segredo válido do Grupo forte (`parseGroupSecret`) e estiver com o opt-in ligado (`getKeySyncOptIn() === true`).
- Se o aparelho novo estiver sem Grupo forte, sem opt-in, no modo demo ou no navegador web, todas as outras partes do backup (gastos, desejos, troféus, preferências sincronizáveis) continuam sendo restauradas normalmente, e as chaves são ignoradas.

**Never:**
- Nunca gravar chaves de IA ou OCR em texto puro em `buildExportEvents`, `BackupExportService` ou no payload do Drive.
- Nunca decifrar ou gravar chaves no `SecureStore` durante restauração se faltar Grupo forte ou opt-in, ou se estiver na web.
- Nunca quebrar a restauração do log se `applyRestoredKeySyncEvents` encontrar evento de chave inválido ou de outro grupo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Exportação / arquivo do Drive | Log com gastos, desejos, troféus, `SETTING_CHANGED` e `KEY_SYNC_UPDATED` | `buildExportEvents` + `BackupExportService.exportPlain` e `export` (cifrado) não contêm chaves de IA/OCR em texto puro | Sem erro |
| Paridade de estado após restauração | Backup restaurado via `prepareBackupForStorage` -> `prepareLocalLog` -> `replayAllEvents` | Aparelho novo obtém exatamente os mesmos gastos/contas, lista de desejos, XP/troféus e preferências sincronizáveis (tema, som, modos de apoio, IA, OCR, Drive backup, `isCatholic`) | Sem quarentena |
| Restauração de chaves sem Grupo forte | Aparelho novo com `loadStrongGroupSecret: async () => null` (ou código legado) | `applyRestoredKeySyncEvents` retorna `{ applied: 0, ignored: 2, rejected: 0 }`; `storeAIKey`/`storeOCRKey` não são chamados | Sem erro |
| Restauração de chaves sem opt-in ou na web | Aparelho novo com Grupo forte, mas `optIn: false` ou `isWeb: true` | `applyRestoredKeySyncEvents` ignora chaves (`applied: 0`); estado financeiro, desejos, troféus e preferências continuam restaurados | Sem erro |
| Restauração completa (nativo + Grupo forte + opt-in) | Aparelho novo com mesmo segredo forte e `optIn: true` | `applyRestoredKeySyncEvents` decifra e grava chaves de IA e OCR no `SecureStore` (`applied: 2`) | Chave adulterada é rejeitada sem falhar o restore |

</intent-contract>

## Code Map

- `src/modules/strongGroup/keySyncReceiver.ts` -- Contém `applyIncomingKeySyncEvents`; adicionar `applyRestoredKeySyncEvents` que resolve `isStrongGroup` via `loadStrongGroupSecret()` + `parseGroupSecret` antes de delegar para `applyIncomingKeySyncEvents`.
- `src/context/AppStateProvider.tsx:350-357` -- `restoreFromBackup`: enfileirar `applyRestoredKeySyncEvents` em `keySyncQueueRef.current` após `eventStore.restoreFromBackup(events)`.
- `src/context/localEventLog.ts:148-164,292-295` -- `prepareBackupForStorage`, `prepareLocalLog`, `buildExportEvents`.
- `src/modules/backup/application/BackupExportService.ts:23-129` -- `exportPlain` e `export` (envelope cifrado).
- `src/context/replay.ts` -- `replayAllEvents` reconstruindo `domain`, `wishlist`, `gamification` e `settings`.
- `src/modules/settings/syncedPreferences.ts`, `src/modules/ai/domain/syncedAISettings.ts`, `src/services/syncedOCRConfig.ts`, `src/modules/backup/domain/syncedDriveBackupPref.ts` -- Resolvers de preferências sincronizáveis para validar paridade no teste.

## Tasks & Acceptance

**Execution:**
- `src/modules/strongGroup/keySyncReceiver.ts` -- Exportar `applyRestoredKeySyncEvents` (`ApplyRestoredKeySyncEventsParams`), verificando `!isWeb` e `!isDemoActive`, carregando e validando `loadStrongGroupSecret` com `parseGroupSecret` para derivar `isStrongGroup`, e delegando para `applyIncomingKeySyncEvents` -- Reutiliza todas as guardas da Story 10.5 também na restauração de backup.
- `src/context/AppStateProvider.tsx` -- Atualizar `restoreFromBackup` para, após limpar `handledKeySyncIdsRef.current` e executar `await eventStore.restoreFromBackup(events)`, enfileirar `applyRestoredKeySyncEvents` em `keySyncQueueRef.current` usando os mesmos callbacks `storeAIKey` (`SecureKeyService.storeKey` + `AIClientService.resetBreaker`) e `storeOCRKey` (`saveSecureApiKey`) -- Garante que as chaves só voltem no restore quando Grupo forte e opt-in estiverem ativos.
- `src/modules/backup/application/__tests__/backupScopeRestore.test.ts` -- Criar teste ponta a ponta cobrindo toda a matriz I/O: criação de log completo (gastos, desejos, troféus, todas as preferências sincronizáveis das Epics 9 e 10.2, e chaves cifradas da 10.4), exportação plana e cifrada sem texto puro, restauração e paridade de `replayAllEvents`, e `applyRestoredKeySyncEvents` bloqueado sem Grupo forte/opt-in/web e bem-sucedido com Grupo forte + opt-in -- Valida todos os ACs da Story 10.7.

**Acceptance Criteria:**
- Given um log com gastos, lista de desejos, troféus, preferências sincronizáveis e chaves cifradas (`KEY_SYNC_UPDATED`), when o backup é exportado e restaurado em um aparelho novo, then o estado reconstruído no aparelho novo coincide com o original e nenhuma chave de API aparece em texto puro no arquivo de backup.
- Given um backup restaurado em um aparelho novo, when o aparelho novo não está no Grupo forte ou está sem opt-in (ou na web), then nenhuma chave é decifrada ou salva no `SecureStore`; when o aparelho novo está no mesmo Grupo forte com opt-in ligado, then as chaves voltam para o `SecureStore`.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 10 findings — high 0, medium 5, low 5, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` `handledKeySyncIdsRef.current.clear()` em `restoreFromBackup` (`src/context/AppStateProvider.tsx`) rodava antes do `await` e fora da fila `keySyncQueueRef` e sem guarda de modo demo — adicionada guarda `if (isDemoActiveRef.current) return;` e movido `clear()` para dentro de `runKeySync`.
  - `[medium]` `[patch]` `applyRestoredKeySyncEvents` (`src/modules/strongGroup/keySyncReceiver.ts`) fazia cache de `rawSecret` antes do `getOptIn()` — passado `params.loadStrongGroupSecret` diretamente para `applyIncomingKeySyncEvents`.
  - `[medium]` `[patch]` Mesma causa raiz do item 1 (`BH-1`) — corrigida.
  - `[low]` `[reject]` Passagem de `events` brutos para `applyRestoredKeySyncEvents` — `applyIncomingKeySyncEvents` já valida, filtra, deduplica e ordena os eventos.
  - `[low]` `[reject]` Duplicação de pré-verificação em `applyRestoredKeySyncEvents` — mantendo assinatura independente, não causa defeito ao usuário.
  - `[medium]` `[patch]` `backupScopeRestore.test.ts` não exercitava `BackupExportService.saveLocal` (Drive/auto-backup) nem `BackupImportService.readAndValidate` / `extractEvents` — adicionados ambos os fluxos em `backupScopeRestore.test.ts`.
  - `[low]` `[defer]` Wiring de `AppStateProvider.tsx` sem teste montado no Vitest (mesma causa raiz de VG-1) — adiado.
  - `[low]` `[patch]` Casos de borda em `applyRestoredKeySyncEvents` (lista vazia, exceção em `loadStrongGroupSecret`, `handledIds`) — adicionados em `src/modules/strongGroup/__tests__/keySyncReceiver.test.ts`.
  - `[medium]` `[defer]` `AppStateProvider.restoreFromBackup` sem teste de execução no Vitest — adiado por ausência de harness RN.
  - `[low]` `[reject]` Superfície Drive (`GoogleDriveService`) não modificada — já usa `BackupExportService.saveLocal` + `buildExportEvents`, validados nos testes.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit && npx vitest run --maxWorkers=2` -- passou após os ajustes finais (`eslint`: 0 erros, 14 warnings; `tsc --noEmit`: 0 erros; `vitest`: 140 arquivos, 3103 testes passando).

## Auto Run Result

- **Summary:** Garantida a paridade de escopo do backup (gastos, lista de desejos, troféus e preferências sincronizáveis das Epics 9 e 10.2) sem chaves em texto puro, e conectada a restauração condicional de `KEY_SYNC_UPDATED` em `AppStateProvider.restoreFromBackup` via `applyRestoredKeySyncEvents` (exclusivo para aparelho nativo com Grupo forte + opt-in).
- **Files changed:**
  - `src/modules/strongGroup/keySyncReceiver.ts` — adicionado `applyRestoredKeySyncEvents` derivando `isStrongGroup` de `loadStrongGroupSecret` + `parseGroupSecret` sem cache de segredo.
  - `src/context/AppStateProvider.tsx` — extraído `storeSyncedAIKey` e conectado `applyRestoredKeySyncEvents` dentro de `restoreFromBackup` serializado em `keySyncQueueRef`.
  - `src/modules/backup/application/__tests__/backupScopeRestore.test.ts` — cobertura ponta a ponta de `exportPlain`, `export`, `saveLocal` (Drive/auto-backup), `BackupImportService.readAndValidate`/`extractEvents`, paridade de `replayAllEvents` e restauração condicional de chaves.
  - `src/modules/strongGroup/__tests__/keySyncReceiver.test.ts` — 6 novos testes para `applyRestoredKeySyncEvents`.
- **Review breakdown:** 5 itens corrigidos por patch (3 `medium` + 1 duplicado `medium`, 1 `low`), 2 adiados (`medium` + duplicado `low` para wiring RN de `AppStateProvider.restoreFromBackup`), 3 rejeitados (`low`).
- **Follow-up review recommendation:** `true` (3 entradas `medium` corrigidas por patch; risco residual: wiring React Native de `AppStateProvider.restoreFromBackup` não montado no Vitest).
- **Verification:** `eslint` (0 erros), `tsc --noEmit` (0 erros) e `vitest run --maxWorkers=2` (140 arquivos, 3103 testes passando).
