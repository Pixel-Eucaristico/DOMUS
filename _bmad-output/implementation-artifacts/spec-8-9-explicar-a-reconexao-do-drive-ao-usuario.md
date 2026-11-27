---
title: 'Story 8.9: Detectar conexão antiga, explicar a reconexão única do Drive e listar o backup existente'
type: 'feature'
created: '2026-11-26'
status: 'done'
baseline_commit: '27907c640892d9d3439d3971d1b769c54dec72d0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-8-migrar-o-login-e-a-autorizacao-do-drive.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Usuários que já tinham o Google Drive conectado pela API legada (pré-Story 8.8) possuem `DriveTokens` sem `authProvider: "credential-manager"`. Sem detecção e aviso claro, ao precisarem reconectar uma vez no novo login (Credential Manager + `AuthorizationClient`), podem achar que perderam o backup na nuvem — e hoje a aba `Drive` em `app/backup.tsx` não lista os backups salvos em `appDataFolder` após a reconexão.

**Approach:** Implementar detecção pura de conexão legada (`isLegacyDriveConnection` em `driveTokens.ts`), expor `needsLegacyReconnect` + e-mail anterior em `driveBackupActions.ts` e `useGoogleDriveBackup.ts`, adicionar `GoogleDriveService.listBackups()` em `appDataFolder` (`id`, `name`, `modifiedTime`, `size`, com retry `401`), exibir na aba `Drive` de `app/backup.tsx` mensagem em pt-BR com acentuação completa explicando a reconexão única e garantindo que o backup existente não foi apagado, listar o backup anterior após reconectar, cobrir em Vitest e validar no `SM-X510` (Android 16).

## Boundaries & Constraints

**Always:**
- Detectar conexão legada apenas no nativo (`!isWeb()`): `tokens !== null && (tokens.native === true || !!tokens.refreshToken) && tokens.authProvider !== "credential-manager"`. Nunca disparar na web (`GoogleOAuthWeb.ts`).
- Quando `needsLegacyReconnect === true`, apresentar `isConnected === false` na UI e em `GoogleDriveService.isConnected()` **sem apagar** `lastSyncAt`, `FILE_ID_KEY`, e-mail anterior nem o arquivo no Drive até o usuário reconectar ou desconectar.
- Exibir texto em pt-BR com **acentuação completa** informando que é preciso reconectar uma vez e que o backup existente não foi apagado (sem usar `Alert.alert`/`window.alert`).
- Após reconectar (e ao abrir conectado), listar o backup anterior em `appDataFolder` (`GoogleDriveService.listBackups()`) e exibi-lo no card do Google Drive (nome, data/hora pt-BR e tamanho formatado).
- Manter zero `client_secret`, zero `@react-native-google-signin`, zero `getTokens()`; commitar direto na `dev`.

**Never:**
- Não alterar `packages/sync`, `replit.*` nem editar manualmente `android/` ou `ios/`.
- Não duplicar banners quando `needsLegacyReconnect` e `needsLocalDriveLogin` (Story 9.6) coincidirem: priorizar o aviso de reconexão legada.
- Não usar `vi.mock("react-native")` no Vitest.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Conexão legada (nativo) | `DriveTokens` com `native: true` (ou `refreshToken`) sem `authProvider: "credential-manager"`, `!isWeb()` | `isLegacyDriveConnection` = `true`; `loadDriveState()` retorna `isConnected: false`, `needsLegacyReconnect: true`, `email`/`lastSyncAt` preservados; UI exibe banner pt-BR de reconexão + garantia de backup intacto + CTA `"Reconectar Google Drive"` | Não executa auto-backup nem apaga `LAST_SYNC_KEY`/`FILE_ID_KEY` |
| Sessão moderna ou Web | `authProvider: "credential-manager"` (nativo) ou `isWeb() === true` | `isLegacyDriveConnection` = `false`; `needsLegacyReconnect` = `false` | Falha em `listBackups()` (offline/rede) mantém conexão ativa sem crash |
| Reconexão concluída | Usuário reconecta via Credential Manager + `AuthorizationClient` | Grava `authProvider: "credential-manager"`, `needsLegacyReconnect: false`, `isConnected: true`, chama `listBackups()` e lista o backup anterior (`domus-backup.domusbackup`, data/hora e tamanho) | Retry único em `401` via `refreshAccessTokenOnUnauthorized()`; erro de rede preserva `lastSyncAt` |
| Upload após reconexão | `performDriveUpload(content)` | Envia backup para `appDataFolder` e atualiza `remoteBackups` e `lastSyncAt` | Erro exibido via `syncError` mantendo sessão |
| Acentuação pt-BR | Copy de reconexão e listagem | 100% das strings com acentuação pt-BR completa verificada em teste | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/backup/infrastructure/driveTokens.ts` -- Adicionar `isLegacyDriveConnection(tokens, isWebPlatform)` (puro).
- `src/modules/backup/infrastructure/GoogleDriveService.ts` -- Adicionar `DriveBackupFile { id, name, modifiedTime, size }` e `listBackups()` em `appDataFolder` (`orderBy=modifiedTime desc`, retry `401`, sync de `FILE_ID_KEY`); retornar `false` em `isConnected()` quando `isLegacyDriveConnection(tokens, isWeb())` for `true`.
- `src/modules/backup/domain/driveReconnectCopy.ts` (novo, puro) -- Textos pt-BR com acentuação completa (título, aviso de reconexão legada, CTA) e formatador de tamanho/data do backup listado.
- `src/modules/backup/application/driveBackupActions.ts` -- Estender `LoadedDriveState` (`needsLegacyReconnect`, `remoteBackups`), atualizar `loadDriveState()`, `computeNeedsLocalDriveLogin()`, `performDriveConnect()` e `performDriveUpload()`.
- `src/hooks/useGoogleDriveBackup.ts` e `app/backup.tsx:297-405` -- Expor `needsLegacyReconnect`/`remoteBackups` e renderizar o banner de reconexão + lista do backup existente na aba `Drive`.
- Testes: `driveTokens.test.ts`, `GoogleDriveService.test.ts`, `driveBackupActions.test.ts` e novo `driveReconnectCopy.test.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `driveTokens.ts` e `driveReconnectCopy.ts` -- Implementar `isLegacyDriveConnection` e textos/formatadores pt-BR com acentuação completa -- Isola detecção e copy em módulos puros testáveis no Vitest.
- [x] `GoogleDriveService.ts` -- Implementar `listBackups()` em `appDataFolder` (`id`, `name`, `modifiedTime`, `size`) com retry `401` e ajuste de `isConnected()` para sessão legada -- Permite listar o backup anterior após reconexão e evita auto-backup silencioso em sessão antiga.
- [x] `driveBackupActions.ts`, `useGoogleDriveBackup.ts` e `app/backup.tsx` -- Integrar `needsLegacyReconnect` e `remoteBackups` na carga, conexão/reconexão, upload e UI da aba `Drive` -- Exibe explicação clara de reconexão e lista o backup anterior após reconectar.
- [x] Testes, gates e `SM-X510` -- Cobrir toda a matriz em Vitest (`driveTokens.test.ts`, `GoogleDriveService.test.ts`, `driveBackupActions.test.ts`, `driveReconnectCopy.test.ts`), rodar `eslint`, `expo lint`, `tsc`, `vitest`, `expo export --platform web`, recompilar APK release SDK 57 e validar no `SM-X510` (Android 16) a aba `Drive` com backup listado e `logcat` limpo -- Fecha a Story 8.9 e conclui o Epic 8.

**Acceptance Criteria:**
- Given sessão nativa legada (`DriveTokens` sem `authProvider: "credential-manager"`), when o app carrega o estado do Drive, then detecta `needsLegacyReconnect: true` e exibe mensagem pt-BR com acentuação completa explicando que é preciso reconectar uma vez e que o backup existente não foi apagado.
- Given reconexão concluída via Credential Manager + `AuthorizationClient`, when a aba `Drive` atualiza, then o aviso some e o backup anterior salvo em `appDataFolder` continua listado (nome, data/hora e tamanho).
- Given todos os gates (`eslint`, `expo lint`, `tsc --noEmit`, `vitest`, `expo export --platform web`, APK release e validação no `SM-X510`), then todos passam sem novas falhas e com `logcat` limpo.

## Implementation Notes

- Adicionada detecção pura `isLegacyDriveConnection` em [driveTokens.ts](../../src/modules/backup/infrastructure/driveTokens.ts) e copy pt-BR com acentuação completa + formatadores em [driveReconnectCopy.ts](../../src/modules/backup/domain/driveReconnectCopy.ts).
- Adicionado `GoogleDriveService.listBackups()` em [GoogleDriveService.ts](../../src/modules/backup/infrastructure/GoogleDriveService.ts) consultando `appDataFolder` (`orderBy=modifiedTime desc`, retry único `401`, sync de `FILE_ID_KEY`), e bloqueio de `isConnected()`/`getValidAccessToken()`/`refreshAccessTokenOnUnauthorized()` em sessão nativa legada preservando `lastSyncAt`/`FILE_ID_KEY`/e-mail.
- Integrados `needsLegacyReconnect`, `remoteBackups`, `isLoadingBackups`, `backupsLoadError` e `refreshBackups` em [driveBackupActions.ts](../../src/modules/backup/application/driveBackupActions.ts), [driveBackupState.ts](../../src/modules/backup/application/driveBackupState.ts), [useGoogleDriveBackup.ts](../../src/hooks/useGoogleDriveBackup.ts) e [backup.tsx](../../app/backup.tsx).
- Patches da revisão aplicados: timeout de 15 s em `listBackupsInternal()`, isolamento de metadados (`LAST_SYNC_KEY`/`FILE_ID_KEY` + `tokenSessionEpoch`) ao trocar de conta Google, guarda `!nextPageToken`, validação estrita de `getLastSyncAt()` e guarda JSX contra `0`/`NaN`, mensagens pt-BR distintas para offline e 401/403, hidratação local imediata sem flash desconectado, controlador puro testável (`driveBackupState.ts`) com proteção contra unmount/corridas, `appConfirm` no desconectar legado, indicador âmbar na aba `Drive` e acessibilidade.
- Validado após patches com `145/145` testes de backup (`3307/3309` no total, 0 falhas novas), `tsc`/`eslint`/`expo lint` `0` erros, `expo export --platform web`, APK release SDK 57 (`BUILD SUCCESSFUL`) e `SM-X510` (Android 16) listando ao vivo `domus-backup.domusbackup` (`26/11/2026, 18:38 · 8,6 KB`, `0` erros no `logcat`).

## Spec Change Log

## Review Triage Log

| # | Layer | Location | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | blind-hunter | `driveBackupActions.ts:55-87`, `useGoogleDriveBackup.ts:43-80`, `app/backup.tsx:334-376` | `medium` | `patch` | Verificado: `loadDriveState()` aguarda `fetchRemoteBackupsSafe()` antes de hidratar `isConnected`, fazendo usuários conectados verem o estado desconectado durante a rede e impedindo que `backupsLoading` apareça no mount. |
| 2 | blind-hunter | `GoogleDriveService.ts:151-153`, `driveBackupActions.ts:272-275`, `useGoogleDriveBackup.ts:84-117` | `medium` | `patch` | Verificado: `listBackupsInternal()` faz `fetch` sem `AbortController`/timeout, podendo travar `connect()` em `"Aguardando…"` ou `refreshBackups()` indefinidamente se a API do Drive travar. |
| 3 | blind-hunter | `driveBackupActions.ts:150-189,264-283`, `GoogleDriveService.ts:191-198,206-208` | `high` | `patch` | Verificado: `saveTokens()` não limpa `LAST_SYNC_KEY`/`FILE_ID_KEY` nem avança `tokenSessionEpoch` ao trocar de conta Google na reconexão, vazando metadados da conta anterior e permitindo escrita corrida de `FILE_ID_KEY`. |
| 4 | blind-hunter | `app/backup.tsx:373-404` | `medium` | `patch` | Verificado: o bloco `if / else if` renderiza `drive.backupsLoadError` apenas quando `remoteBackups.length === 0`, ocultando erros de atualização quando já há backups em cache. |
| 5 | blind-hunter | `app/backup.tsx:50,66-83` | `low` | `patch` | Verificado: a aba `Drive` não exibe indicador visual na barra de abas de `app/backup.tsx` quando `needsLegacyReconnect` é `true`; adicionar ponto âmbar na aba `Drive` é correção direta (banner em outras telas fora do escopo da Story 8.9). |
| 6 | blind-hunter | `useGoogleDriveBackup.ts:135-156` | `medium` | `patch` | Verificado: `refreshBackups()` ignora `state.isConnected === false`, não coordena chamadas sobrepostas por sequência, sobrescreve `remoteBackups` em erro de rede e não guarda contra unmount. |
| 7 | blind-hunter | `driveBackupActions.ts:39-53`, `driveReconnectCopy.ts:15-16` | `medium` | `patch` | Verificado: `fetchRemoteBackupsSafe()` retorna `"Sua conexão continua ativa"` tanto em offline quanto em HTTP 401/403 (autorização revogada), informando o usuário incorretamente. |
| 8 | blind-hunter | `driveTokens.ts:34-51` | `false` | `reject` | Refutado: a fórmula `(tokens.native === true || !!tokens.refreshToken) && tokens.authProvider !== "credential-manager"` está fixada no `<frozen-after-approval>` e cobre todos os formatos nativos pré-8.8; o único chamador de produção de `isDriveConnected` é `GoogleDriveService.isConnected()`, que já checa `isLegacyDriveConnection` antes. |
| 9 | blind-hunter | `driveBackupActions.ts:55-65,336-354` | `low` | `patch` | Verificado: `loadDriveState()` lê `TOKENS_KEY` 3 vezes em paralelo, `performDriveUpload()` chama `isOnline()` duas vezes e não protege `getLastSyncAt()` com `.catch(() => null)`. |
| 10 | blind-hunter | `app/backup.tsx:314-316,445-450`, `GoogleDriveService.ts:326-329` | `high` | `patch` | Verificado: `getLastSyncAt()` retorna `0` ou `NaN` para valores inválidos e `{drive.lastSyncAt && <Text>...}` em `<View>` crasha o React Native; além disso a linha 315 formata a data sem usar `formatBackupModifiedTime`. |
| 11 | blind-hunter | `GoogleDriveService.ts:146-198` | `low` | `patch` | Verificado: `listBackupsInternal()` remove `FILE_ID_KEY` mesmo se houver `nextPageToken` (paginação); guardar a remoção com `!data?.nextPageToken` evita limpar o cache indevidamente. |
| 12 | blind-hunter | `app/backup.tsx:360-370,463-496`, `useGoogleDriveBackup.ts:119-133` | `low` | `patch` | Verificado: `"Desconectar conta anterior"` remove sessão sem `appConfirm` e grava `setDriveBackupPref({ enabled: false })` mesmo se `clearTokens()` falhar; hint genérico duplica o banner legado e botões novos carecem de `accessibilityLabel`. |
| 13 | blind-hunter | `useGoogleDriveBackup.ts`, `driveBackupActions.test.ts`, `GoogleDriveService.test.ts` | `medium` | `patch` | Verificado: faltam testes para transições/corridas de `useGoogleDriveBackup`, troca de conta na reconexão e `listBackups()` concorrente com `clearTokens()`. |
| 14 | edge-case-hunter | `app/backup.tsx:445-450` | `high` | `patch` | Verificado: mesma causa raiz do #10 (`0`/`NaN` renderizado fora de `<Text>` em `View`). |
| 15 | edge-case-hunter | `app/backup.tsx:373-404` | `medium` | `patch` | Verificado: mesma causa raiz do #4 (`backupsLoadError` suprimido quando `remoteBackups.length > 0`). |
| 16 | edge-case-hunter | `useGoogleDriveBackup.ts:144-147` | `medium` | `patch` | Verificado: mesma causa raiz do #6 (`refreshBackups` sem ramo `else` para `state.isConnected === false`). |
| 17 | edge-case-hunter | `useGoogleDriveBackup.ts:135-156` | `medium` | `patch` | Verificado: `refreshBackups` sobreposto a `uploadContent` ou outro `refreshBackups` pode sobrescrever a lista pós-upload com resultado antigo ou desligar `isLoadingBackups` cedo. |
| 18 | edge-case-hunter | `useGoogleDriveBackup.ts:119-133` | `medium` | `patch` | Verificado: `disconnect()` antes do término do `loadDriveState()` inicial incrementa `sessionEpochRef` e faz o `finally` pular `setIsDriveStateLoaded(true)`, travando `isDriveStateLoaded` em `false`. |
| 19 | edge-case-hunter | `useGoogleDriveBackup.ts:84-117` | `medium` | `patch` | Verificado: `connect()` não captura `sessionEpochRef` antes de `await performDriveConnect()`, permitindo que um `connect()` obsoleto ressuscite o estado após `disconnect()` concorrente. |
| 20 | edge-case-hunter | `GoogleDriveService.ts:151-153` | `medium` | `patch` | Verificado: mesma causa raiz do #2 (`listBackupsInternal` sem `AbortController` timeout). |
| 21 | edge-case-hunter | `driveBackupActions.ts:55-87` | `medium` | `patch` | Verificado: mesma causa raiz do #1 (`loadDriveState` bloqueia hidratação local aguardando rede). |
| 22 | edge-case-hunter | `driveBackupActions.ts:264-283` | `high` | `patch` | Verificado: mesma causa raiz do #3 (troca de conta Google na reconexão preserva `lastSyncAt` e `FILE_ID_KEY` da conta anterior). |
| 23 | verification-gap | `GoogleDriveService.ts:141,191-198` | `medium` | `patch` | Pré-verificado: guarda de `tokenSessionEpoch` em `listBackups()` concorrente com `clearTokens()` sem teste em `GoogleDriveService.test.ts`. |
| 24 | verification-gap | `GoogleDriveService.ts:124-135,170-189` | `medium` | `patch` | Pré-verificado: sanitização de payload de `listBackups()` (`parseDriveFileSize` com `""`/negativo/não-numérico, itens inválidos e `files` ausente) sem teste. |
| 25 | verification-gap | `GoogleDriveService.ts:156-164` | `medium` | `patch` | Pré-verificado: caminho de não-retry em HTTP 401 de `listBackups()` (web ou `getNativeAccessToken` retornando `null`) sem teste. |
| 26 | verification-gap | `useGoogleDriveBackup.ts` | `medium` | `patch` | Pré-verificado: transições de estado, coordenação de `sessionEpochRef`, `refreshBackups()` e repasse de `needsLegacyReconnect` para `computeNeedsLocalDriveLogin` sem cobertura de teste. |
| 27 | verification-gap | `useGoogleDriveBackup.ts:24,49-72`, `driveBackupActions.ts:78` | `medium` | `patch` | Verificado: mesma causa raiz do #1 (flash desconectado no mount e `backupsLoading` inalcançável). |
| 28 | verification-gap | `app/backup.tsx:377-399` | `medium` | `patch` | Verificado: mesma causa raiz do #4 (`backupsLoadError` oculto com lista em cache). |
| 29 | verification-gap | `useGoogleDriveBackup.ts:135-156` | `medium` | `patch` | Verificado: mesma causa raiz do #6 (`refreshBackups()` ignora sessão expirada e apaga cache de `remoteBackups` em erro de rede). |

## Design Notes

- `DriveTokens.authProvider === "credential-manager"` (adicionado na Story 8.8) permite detectar determinísticamente qualquer conexão anterior sem precisar alterar o formato salvo no `SecureStore`.

## Verification

**Commands:**
- `npx eslint .` e `npx expo lint` (0 erros)
- `Remove-Item expo-env.d.ts -ErrorAction SilentlyContinue; npx tsc --noEmit` (exit 0)
- `npx vitest run` (0 falhas novas)
- `npx expo export --platform web` (exit 0)
- `.\gradlew.bat assembleRelease --max-workers=2` + `adb -s RX2X101N87Y install -r` + validação da aba `Drive` (backup listado + `logcat` 0 fatais)
