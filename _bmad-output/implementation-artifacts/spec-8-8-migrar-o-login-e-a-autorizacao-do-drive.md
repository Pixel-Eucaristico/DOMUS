---
title: 'Story 8.8: Migrar login Google e autorização do Drive para Credential Manager e AuthorizationClient'
type: 'feature'
created: '2026-11-26'
status: 'done'
baseline_commit: '5e2fd12be1a5f7dd793b20f4be2e42d9b592ee5b'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/decisao-login-google.md'
  - '{project-root}/.agents/skills/expo-module/SKILL.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O DOMUS ainda usa `@react-native-google-signin/google-signin@^16.1.2` (API "Original" baseada no `GoogleSignInClient` legado e `getTokens()`, deprecados pelo Google). Na Story 8.7 (`docs/decisao-login-google.md`), o dono aprovou por escrito a migração para um **módulo Expo local próprio (`modules/domus-google-auth`)** usando **Android Credential Manager** + **`Identity.getAuthorizationClient`** para o escopo `https://www.googleapis.com/auth/drive.appdata` (e `GIDSignIn` no iOS), sem `client_secret` no app.

**Approach:** Criar o módulo Expo local `modules/domus-google-auth` (Kotlin Android com `androidx.credentials` + `googleid` + `play-services-auth` `AuthorizationClient`; Swift iOS com `GoogleSignIn` + `ExpoAppDelegateSubscriber`; bindings TypeScript + plugin `plugins/withDomusGoogleAuth.js` para iOS `Info.plist`), remover `@react-native-google-signin/google-signin` e todo código legado de `getTokens()`, adaptar `GoogleNativeAuth.ts`, `driveTokens.ts`, `GoogleDriveService.ts`, `driveBackupActions.ts` e testes Vitest, compilar o APK release SDK 57 (`targetSdkVersion=36`) e validar a conexão ao Google Drive + upload de backup completo no Android 16 real (`SM-X510`).

## Boundaries & Constraints

**Always:**
- Usar **apenas** Android **Credential Manager** (`androidx.credentials` + `googleid`) para autenticação e **`Identity.getAuthorizationClient(activity)`** (`play-services-auth`) para autorização do escopo `https://www.googleapis.com/auth/drive.appdata` — **zero referências** a `GoogleSignInClient`, `GoogleSignInOptions`, `getTokens()` ou `@react-native-google-signin/google-signin`.
- Garantir ausência total de `client_secret` do Google no app e no bundle/APK.
- Na renovação silenciosa (`getNativeAccessToken`), chamar `authorizeDrive` com `interactive = false` (retornando `null` se `hasResolution() == true`, sem abrir tela inesperada em background), passando `accountEmail` quando conhecido e limpando token vencido via `clearCachedAccessToken` (`GoogleAuthUtil.clearToken`) quando informado.
- Marcar novas sessões nativas salvas em `DriveTokens` com `authProvider: "credential-manager"` (campo opcional aditivo compatível com tokens existentes, preparando a detecção de sessão legada na Story 8.9).
- Preservar `GoogleOAuthWeb.ts` (fluxo web), `targetSdkVersion=36`, `withReleaseSigning`, `withGwpAsan`, `withOrientationFix` e textos de UI em pt-BR com acentos.
- Trabalhar/commitar direto na `dev`; sincronizar `package-lock.json`.

**Never:**
- Não alterar `packages/sync`, `replit.*` nem editar manualmente `android/` ou `ios/` (gerar `android/` via `npx expo prebuild --clean`).
- Não implementar ainda a UI explicativa de reconexão da Story 8.9 (apenas preservar compatibilidade de detecção via `authProvider`).
- Não usar `Alert.alert`/`window.alert` nem `vi.mock("react-native")` no Vitest.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Conexão nativa (Android 16) | `performDriveConnect(webClientId)` | `signIn(webClientId)` via Credential Manager retorna `email`; `authorizeDrive([drive.appdata], email, true)` via `AuthorizationClient` retorna `accessToken`; salva `DriveTokens` com `native: true`, `authProvider: "credential-manager"`, sem `client_secret` | Cancelamento (`SIGN_IN_CANCELLED`) retorna `{ ok: false, cancelled: true, error: null }`; `DEVELOPER_ERROR`/SHA-1 retorna mensagem pt-BR clara |
| Renovação silenciosa | `getNativeAccessToken(staleToken, accountEmail)` | Se `staleToken`, limpa cache; chama `authorizeDrive([drive.appdata], accountEmail, false)`; retorna novo `accessToken` sem abrir UI se já autorizado | Se `hasResolution()` (precisa consentimento/reconexão) ou erro nativo, retorna `null` sem crash |
| Desconexão | `performDriveDisconnect()` | Chama `signOut()` (`clearCredentialState` no Credential Manager / `GIDSignIn.signOut` no iOS) e limpa tokens no `SecureStore` | Erro no `signOut` nativo é ignorado; erro em `clearTokens` retorna `{ error }` |
| Upload completo no Drive | `GoogleDriveService.uploadBackup(content)` com token `AuthorizationClient` | `POST`/`PATCH` multipart em `appDataFolder` (`domus-backup.domus`) retorna `200`, atualiza `FILE_ID_KEY` e `LAST_SYNC_KEY` | Se `401` com token em cache, limpa cache e tenta 1x renovar antes de falhar; se `404`, limpa `FILE_ID_KEY` e recria |
| Web & ausência do módulo | `Platform.OS === "web"` ou ambiente sem módulo nativo | Web segue `GoogleOAuthWeb.ts`; `getDomusGoogleAuth()` devolve `null` sem crash | `performDriveConnect` retorna mensagem amigável pt-BR |

</frozen-after-approval>

## Code Map

- `modules/domus-google-auth/` (novo) -- Módulo Expo local (`expo-module.config.json`, `index.ts`, `src/types.ts`, `android/build.gradle`, `android/src/main/java/expo/modules/domusgoogleauth/DomusGoogleAuthModule.kt`, `ios/DomusGoogleAuth.podspec`, `ios/DomusGoogleAuthModule.swift`, `ios/DomusGoogleAuthAppDelegateSubscriber.swift`).
- `plugins/withDomusGoogleAuth.js` + `plugins/__tests__/withDomusGoogleAuth.test.ts` (novos) -- Config plugin iOS lendo `CLIENT_ID` e `REVERSED_CLIENT_ID` de `GoogleService-Info.plist` para `Info.plist` (substituindo o plugin `@react-native-google-signin/google-signin` em `app.json:124`).
- `package.json` / `package-lock.json` / `app.json:124` -- Remover `@react-native-google-signin/google-signin` e registrar `"./plugins/withDomusGoogleAuth"`.
- `src/modules/backup/infrastructure/GoogleNativeAuth.ts` -- Migrar para `modules/domus-google-auth` (`signInWithGoogleNative`, `authorizeDriveNative`, `getNativeAccessToken`, `signOutGoogleNative`), removendo `getTokens()` e `GoogleSignin`.
- `src/modules/backup/infrastructure/driveTokens.ts` e `GoogleDriveService.ts` -- Adicionar `authProvider?: "credential-manager"` em `DriveTokens`, passar `tokens.email` ao `NativeTokenProvider(staleAccessToken, accountEmail)` e suportar retry único em HTTP `401`.
- `src/modules/backup/application/driveBackupActions.ts` -- Atualizar `connectDriveNative`, `formatDriveConnectError` e `performDriveDisconnect` para o novo contrato.
- `src/modules/backup/infrastructure/__tests__/driveTokens.test.ts` e `src/modules/backup/application/__tests__/driveBackupActions.test.ts` -- Adaptar e expandir testes + guarda contra `getTokens`/`@react-native-google-signin`/`client_secret`.

## Tasks & Acceptance

**Execution:**
- [x] `modules/domus-google-auth/` e `plugins/withDomusGoogleAuth.js` -- Implementar o módulo Expo local (Android Kotlin Credential Manager + `Identity.getAuthorizationClient` + `GoogleAuthUtil.clearToken`; iOS Swift `GIDSignIn` + `AppDelegateSubscriber`; TypeScript) e config plugin iOS + teste `withDomusGoogleAuth.test.ts` -- Substitui o SDK legado com autolinking nativo SDK 57.
- [x] `package.json`, `package-lock.json`, `app.json` -- Remover `@react-native-google-signin/google-signin`, trocar plugin em `app.json` por `"./plugins/withDomusGoogleAuth"` e sincronizar `package-lock.json` -- Elimina dependência legada do grafo e do CI.
- [x] `GoogleNativeAuth.ts`, `driveTokens.ts`, `GoogleDriveService.ts`, `driveBackupActions.ts` e testes -- Migrar fluxos nativos de conexão, renovação silenciosa, desconexão e retry `401` sem `getTokens()` nem `client_secret`, atualizando `driveTokens.test.ts` e `driveBackupActions.test.ts` -- Fecha a migração JS com cobertura Vitest verde.
- [x] Gates, APK release e `SM-X510` -- Rodar `expo-doctor`, `eslint`, `expo lint`, `tsc`, `vitest`, `expo export --platform web`, `expo config --type prebuild --json`, `expo prebuild --clean --platform android`, `.\gradlew.bat assembleRelease --max-workers=2`, `aapt2 dump badging` (`targetSdkVersion=36`), instalar no `SM-X510` e validar conexão ao Google Drive + upload de backup completo no Android 16 real -- Comprova funcionamento ponta a ponta no aparelho real.

**Acceptance Criteria:**
- Given a escolha aprovada na Story 8.7 (`modules/domus-google-auth`), when concluo a migração, then o app autentica via Android Credential Manager, autoriza `drive.appdata` via `Identity.getAuthorizationClient`, não contém `client_secret` do Google e remove 100% de `@react-native-google-signin/google-signin` e `getTokens()`.
- Given os testes e gates automatizados, when executo `expo-doctor`, `eslint`, `expo lint`, `tsc --noEmit`, `vitest` (incluindo `driveTokens.test.ts`, `driveBackupActions.test.ts` e `withDomusGoogleAuth.test.ts`), `expo config --type prebuild --json` e `expo export --platform web`, then todos passam sem novas falhas.
- Given o APK release SDK 57 instalado no `SM-X510` (Android 16), when conecto o Google Drive e executo um backup completo, then a conexão e o upload concluem com sucesso no aparelho real sem erros fatais no `logcat`.

## Implementation Notes

- `.gitignore` atualizado de `ios/` e `android/` para `/ios/` e `/android/` (orientação do `expo-doctor`) para que `modules/domus-google-auth/android/` e `modules/domus-google-auth/ios/` sejam rastreados pelo Git.
- Adicionado também `src/modules/backup/infrastructure/__tests__/GoogleNativeAuth.test.ts` cobrindo renovação silenciosa (`interactive = false`), limpeza de token expirado, fallback web e ausência de módulo nativo.
- Validação em hardware real (`SM-X510`, serial `RX2X101N87Y`, Android 16 / `targetSdkVersion=36`): desconexão da sessão legada, conexão via Android Credential Manager (`executeGetCredential` → `GoogleIdService`) + `Identity.getAuthorizationClient` (`drive.appdata`), e upload completo de `domus-backup.domusbackup` (`Último sync: 26/11, 16:23`) com 0 erros/fatais no `logcat`.
- Compilação Swift/CocoaPods do módulo iOS (`DomusGoogleAuth.podspec`, `DomusGoogleAuthModule.swift`, `DomusGoogleAuthAppDelegateSubscriber.swift`) não pode ser executada em Windows; autolinking Apple (`expo-modules-autolinking resolve --platform apple --json`) validado e plugin iOS testado no Vitest (`withDomusGoogleAuth.test.ts`).

## Spec Change Log

## Review Triage Log

- `BH-1` (`DomusGoogleAuthModule.kt`, `DomusGoogleAuthModule.swift`, `GoogleNativeAuth.ts`, `driveBackupActions.ts`): `high` → `patch` — No consentimento granular do Google, `AuthorizationClient`/`GIDSignIn` podem devolver `accessToken` sem `drive.appdata` em `grantedScopes`; validar `DRIVE_APPDATA_SCOPE` em `grantedScopes` antes de aceitar o token.
- `BH-2` (`DomusGoogleAuthModule.swift`, `driveTokens.ts`, `GoogleDriveService.ts`): `high` → `patch` — `clearCachedAccessToken` era no-op no iOS e `refreshExpiredAccessToken` aceitava token idêntico ao rejeitado em 401, estendendo `expiresAt` em +30 min; rejeitar `accessToken === tokens.accessToken` em `refreshExpiredAccessToken` e invalidar token marcado no iOS.
- `BH-3` (`DomusGoogleAuthModule.swift`): `high` → `patch` — `authorizeDrive` no iOS ignorava `accountEmail` quando `currentUser`/`restoredUser` pertencia a outra conta; validar correspondência case-insensitive de e-mail antes de reusar usuário.
- `BH-4` (`DomusGoogleAuthModule.swift`): `medium` → `patch` — `restorePreviousSignIn` era chamado antes de configurar `GIDSignIn.sharedInstance.configuration` em cold start quando `GIDClientID` vem de `GoogleService-Info.plist`; configurar `configuration` antes de `restorePreviousSignIn`.
- `BH-5` (`DomusGoogleAuthModule.kt`): `high` → `patch` — Race de lifecycle de `Activity` entre `authorize()` e `addOnSuccessListener` podia travar `pendingAuthPromise` permanentemente se `Activity` fosse destruída; rechecar `appContext.currentActivity` e `!isFinishing && !isDestroyed` antes de reivindicar `pendingAuthPromise`.
- `BH-6` (`DomusGoogleAuthModule.kt`): `medium` → `patch` — Renovação silenciosa (`interactive = false`) falhava sem `currentActivity` mesmo aceitando `Identity.getAuthorizationClient(Context)` com `appContext.reactContext`; usar `currentActivity ?: reactContext` no modo silencioso.
- `BH-7` (`DomusGoogleAuthModule.swift`): `medium` → `patch` — `displayName` encaixotava `Optional` como `Any` (usar `?? NSNull()`), `refreshedUser == nil` resolvia `nil` mesmo em `interactive == true` (rejeitar `AUTH_ERROR`) e faltava guarda `isSigningIn` + validação de `webClientId` em branco no `signIn`.
- `BH-8` (`driveBackupActions.ts`, `GoogleNativeAuth.ts`): `medium` → `patch` — `performDriveDisconnect` não limpava o access token em cache do Play Services via `clearCachedAccessToken`; limpar token armazenado (best-effort) antes de `signOut` e `clearTokens`.
- `BH-9` (`driveBackupActions.ts`): `low` → `patch` — `formatDriveConnectError` deixava `NOT_CONFIGURED`, `NO_ACTIVITY`, `RESOLUTION_REQUIRED` e `AUTH_ERROR` vazarem mensagens técnicas brutas do Expo e citava SHA-1 Android mesmo no iOS; mapear códigos para mensagens pt-BR limpas e conscientes de plataforma.
- `BH-10` (`GoogleDriveService.ts`): `medium` → `patch` — Corrida entre `clearTokens()` e refresh de token em voo podia regravar tokens após desconexão; adicionar contador `tokenSessionEpoch` invalidado em `clearTokens()`.
- `BH-11` (`GoogleDriveService.ts`): `medium` → `patch` — Sem testes unitários para retry `401`/`404` e `Platform.OS` bloqueava Vitest; trocar `Platform.OS` por `isWeb()` e criar `GoogleDriveService.test.ts`.
- `BH-12` (`plugins/withDomusGoogleAuth.js`, `plugins/__tests__/withDomusGoogleAuth.test.ts`): `medium` → `patch` — Derivar `REVERSED_CLIENT_ID` quando `iosClientId` vier por prop sem `iosUrlScheme`, proteger `plist.parse` com `try/catch`, clonar `CFBundleURLTypes` antes de mutar e testar o entrypoint `withDomusGoogleAuth`.
- `BH-13` (`README.md:108`, `docs/setup-google-login.md:9,14`, `src/hooks/useGoogleDriveBackup.ts:12`): `low` → `patch` — Referências residuais a `@react-native-google-signin/google-signin` / `getTokens()` em docs ativos e comentário; atualizar para `modules/domus-google-auth`.
- `VG-1` (`GoogleDriveService.ts` retry `401`/`404` sem teste): `medium` → `patch` — Pre-verified gap (mesma raiz de `BH-11`): usar `isWeb()` e cobrir `uploadBackup` / `refreshAccessTokenOnUnauthorized` em `GoogleDriveService.test.ts`.
- `VG-2` (`plugins/withDomusGoogleAuth.js` entrypoint não executado em teste): `medium` → `patch` — Pre-verified gap (mesma raiz de `BH-12`): testar `withDomusGoogleAuth(config, props)` executando `mods.ios.infoPlist`.
- `VG-3` (`GoogleNativeAuth.ts` `defaultNativeModuleLoader` + `modules/domus-google-auth/index.ts` nunca exercitados): `medium` → `patch` — Pre-verified gap: adicionar teste em `GoogleNativeAuth.test.ts` exercitando `defaultNativeModuleLoader` contra mock de `"expo"` (`requireOptionalNativeModule("DomusGoogleAuth")`).
- `VG-4` (`DomusGoogleAuthModule.kt` / `.swift` sem harness JUnit/XCTest no `gate.yml`): `medium` → `defer` — Pre-verified gap: o repositório não possui infraestrutura de testes unitários nativos Gradle/Xcode no PR gate; registrado em `deferred-work.md`.
- `ECH-1` (`DomusGoogleAuthModule.kt:180-292`): `high` → `patch` — Faltava `.addOnCanceledListener` na `Task` do `AuthorizationClient` (podia deixar `Promise` pendente para sempre); adicionar listener rejeitando `CODE_SIGN_IN_CANCELLED`.
- `ECH-2` (`DomusGoogleAuthModule.kt:199-233`): `high` → `patch` — Mesma causa raiz de `BH-5` (`Activity` destruída antes de `addOnSuccessListener`); validar `!isFinishing && !isDestroyed` antes de `pendingAuthPromise`.
- `ECH-3` (`DomusGoogleAuthModule.kt:73-77`): `medium` → `patch` — `getErrorDialog(...).show()` sem checar `!isFinishing && !isDestroyed` pode lançar `BadTokenException`; proteger na `runOnUiThread`.
- `ECH-4` (`DomusGoogleAuthModule.kt:157-181`): `medium` → `patch` — Mesma causa raiz de `BH-6` (modo silencioso exigir `currentActivity`); usar `reactContext` como fallback quando `!interactive`.
- `ECH-5` (`DomusGoogleAuthModule.kt:142-145`): `medium` → `patch` — `catch (e: Exception)` capturava `CancellationException` de corrotina; relançar `CancellationException` antes.
- `ECH-6` (`DomusGoogleAuthModule.kt:152-173`): `low` → `patch` — Strings em branco em `scopes` lançavam `IllegalArgumentException` em `Scope(it)`; filtrar `trim().filter { it.isNotEmpty() }` e rejeitar `CODE_AUTH_ERROR` se vazio.
- `ECH-7` (`driveBackupActions.ts:105-108`): `high` → `patch` — Mesma causa raiz de `BH-1` (consentimento granular sem `drive.appdata`); validar `grantedScopes.includes(DRIVE_APPDATA_SCOPE)`.
- `ECH-8` (`driveTokens.ts:74-83`): `high` → `patch` — Mesma causa raiz de `BH-2` (token inalterado em 401); rejeitar `accessToken === tokens.accessToken`.
- `ECH-9` (`DomusGoogleAuthModule.swift:117-126`): `high` → `patch` — Mesma causa raiz de `BH-3` (`accountEmail` ignorado no iOS); validar correspondência de e-mail.
- `ECH-10` (`DomusGoogleAuthModule.swift:122-143`): `medium` → `patch` — Mesma causa raiz de `BH-4` (`configuration` nil antes de `restorePreviousSignIn`); configurar antes.
- `ECH-11` (`DomusGoogleAuthModule.swift:73-83`): `medium` → `patch` — Mesma causa raiz de `BH-7` (`refreshedUser == nil` / `tokenString.isEmpty` em modo interativo); rejeitar `AUTH_ERROR`.
- `ECH-12` (`DomusGoogleAuthModule.swift:9-50`): `medium` → `patch` — Mesma causa raiz de `BH-7` (`isSigningIn` + `webClientId` em branco no iOS); adicionar guarda e trim.
- `ECH-13` (`plugins/withDomusGoogleAuth.js:10-26`): `low` → `patch` — Mesma causa raiz de `BH-12` (XML malformado em `plist.parse`); tratar com `try/catch`.

## Design Notes

- `GetSignInWithGoogleOption` no `signIn` interativo garante exibição consistente da folha nativa de escolha de conta mesmo em contas múltiplas ou após dismiss anterior; `AuthorizationRequest.Builder().setAccount(Account(email, "com.google"))` vincula a autorização de `drive.appdata` à conta escolhida.
- `DriveTokens.authProvider = "credential-manager"` é campo opcional aditivo para que a Story 8.9 detecte sessões antigas (`native: true` sem `authProvider === "credential-manager"`).

## Verification

**Commands:**
- `npx expo-doctor` (0 erros)
- `npx eslint .` e `npx expo lint` (0 erros)
- `Remove-Item expo-env.d.ts -ErrorAction SilentlyContinue; npx tsc --noEmit` (exit 0)
- `npx vitest run` (0 falhas novas)
- `npx expo export --platform web` (exit 0)
- `npx expo config --type prebuild --json` (exit 0)
- `npx expo prebuild --clean --platform android` + `.\gradlew.bat assembleRelease --max-workers=2` + `aapt2 dump badging` (`targetSdkVersion:'36'`)
- `adb -s RX2X101N87Y` — conectar Google Drive + backup completo real + `logcat` 0 fatais
