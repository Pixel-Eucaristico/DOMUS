# Decisão da Biblioteca do Novo Login Google e Autorização do Drive (Story 8.7)

**Story:** 8.7 — Decidir a biblioteca do novo login do Google (FR-4)  
**Data:** 26/11/2026  
**Commit base (SDK 57 validado):** `29886e20ef25f69a3426331812dba86f88cd3891` (branch `dev`)  
**Escopo:** Decisão técnica e aprovação por escrito do dono antes da migração (Story 8.8). **Nenhum código do aplicativo é alterado nesta story.**  
**Contexto atual no DOMUS:**
- `package.json:37`: `@react-native-google-signin/google-signin@^16.1.2` (API "Original", usa `GoogleSignInClient` legado do Android, deprecado pelo Google).
- `src/modules/backup/infrastructure/GoogleNativeAuth.ts`: pede apenas o escopo `https://www.googleapis.com/auth/drive.appdata`, obtém `accessToken` via `getTokens()` / `signInSilently()` e invalida token expirado via `clearCachedAccessToken()` — **sem `client_secret` no app**.
- `src/modules/backup/infrastructure/GoogleOAuthWeb.ts`: fluxo web independente (popup OAuth implícito), já funcional e desacoplado do módulo nativo.
- Plataforma alvo: **Expo SDK 57 (`~57.0.34`)**, React Native `0.86.3`, New Architecture, Android `minSdk=24` / `targetSdk=36` (Gradle `9.3.1`, Kotlin `2.1.20`), iOS `deploymentTarget=16.4`.

---

## 1. Arquitetura Exigida pelo Google no Android Moderno

Na migração oficial do Google (`play-services-auth` legado → APIs modernas), autenticação e autorização foram separadas:

1. **Autenticação (quem é o usuário):** **Android Credential Manager** (`androidx.credentials` + `googleid`), exibindo a folha nativa do sistema (`GetGoogleIdOption` / `GetSignInWithGoogleOption`) e retornando o perfil/e-mail e `idToken`.
2. **Autorização de escopos OAuth (`drive.appdata`):** **`Identity.getAuthorizationClient(activity)`** (`com.google.android.gms:play-services-auth`), solicitando `https://www.googleapis.com/auth/drive.appdata` via `AuthorizationRequest` e devolvendo `accessToken` (com consentimento incremental via `PendingIntent` na 1ª vez e concessão silenciosa nas renovações, sem `client_secret`).
3. **No iOS:** o SDK oficial do Google (`GoogleSignIn` / `GIDSignIn`, Apache-2.0) continua suportado e ativo, aceitando `additionalScopes: ["https://www.googleapis.com/auth/drive.appdata"]` e `restorePreviousSignIn`.

---

## 2. Comparativo das Candidatas (Verificadas em Código-Fonte e Registros)

Todas as candidatas abaixo foram auditadas diretamente nos registros npm, documentação oficial e/ou inspeção dos tarballs publicados em 26/11/2026:

| Candidata | Custo | Licença | Credential Manager (Android) | `AuthorizationClient` (`drive.appdata`) | iOS (`GIDSignIn`) | Compatibilidade Expo SDK 57 | Veredito |
|---|---|---|---|---|---|---|---|
| **1. Módulo Expo local próprio (`modules/domus-google-auth`)** | **$0 (grátis)** | Código próprio + SDKs oficiais Google (**Apache-2.0**) | ✅ Sim (`androidx.credentials:1.5.0` + `googleid:1.1.1`) | ✅ Sim (`Identity.getAuthorizationClient` em `play-services-auth:21.4.0`, com `setAccount`, `PendingIntent` e invalidação de cache sem API legada) | ✅ Sim (`GoogleSignIn` pod oficial + `additionalScopes`) | ✅ **Total** — nativo via `expo-modules-core@57.0.26` (autolinking local em `modules/`, New Arch, Gradle 9.3.1, Kotlin 2.1.20, `targetSdk=36`) | ⭐ **Recomendada** |
| **2. `@react-native-google-signin/google-signin` Universal (`universal-sign-in.com`)** | **US$ 79/ano** (Personal) ou **US$ 249/ano** (Team)* | **Comercial / proprietária** (registry privado `.npmrc`; self-host permitido após cancelar, sem updates) | ✅ Sim (`GoogleOneTapSignIn`) | ✅ Sim (`requestAuthorization({ scopes: ['.../drive.appdata'] })`) | ✅ Sim (`addScopes` + renovação automática) | ✅ **Sim** — TurboModule / New Arch + Expo config plugin oficial | Viável (paga + registry privado na CI) |
| **3. `expo-google-credential-auth@0.2.0`** (`github.com/sagnik2001/expo-google-credential-auth`) | **$0 (grátis)** | **MIT** | ✅ Sim (`androidx.credentials:1.3.0`) | ⚠️ Parcial — chama `Identity.getAuthorizationClient`, mas sem `setAccount` nem `clearCachedAccessToken` isolado; `revokeAccess` ainda chama o legado `GoogleSignIn.getClient()` | ✅ Sim (`GIDSignIn` + `addScopes`) | ⚠️ **Provável, não validada** — usa `expo-module-gradle-plugin` (`peer expo:"*"`), mas `devDependencies` em SDK 55 / RN 0.82 e versão `0.2.0` (mantenedor único) | Alternativa open-source imatura |
| **4. `@react-native-google-signin/google-signin@17.0.0` (pública / Original)** | $0 | MIT | ❌ Não (inspeção do tarball `17.0.0` confirmou `GoogleSignInClient` legado) | ❌ Não | ✅ Sim | ✅ Sim | ❌ **Não resolve** (API legada) |
| **5. `@thoughtbot/react-native-social-auth@0.4.0`** | $0 | MIT | ✅ Sim (`androidx.credentials:1.5.0`) | ❌ **Não** — inspeção de `GoogleSignInModule.kt:36-40,125` confirmou que ignora `scopes` no Android e retorna `accessToken: null` fixo | ✅ Sim (só `idToken`) | ✅ Sim (`targetSdk=36`) | ❌ **Descartada** (não acessa Drive no Android) |
| **6. `@pricava/react-native-google-credential@1.0.4`** | $0 | MIT | ✅ Sim | ❌ **Não** — focado em `idToken` (Clerk/Firebase/Supabase); sem `AuthorizationClient` no Android e `additionalScopes: nil` no iOS (`PricavaGoogleCredential.mm:160`) | ✅ Sim (só `idToken`) | ✅ Sim | ❌ **Descartada** (não acessa Drive) |
| **7. `expo-auth-session` / `react-native-app-auth@9.1.0` (OAuth PKCE)** | $0 | MIT | ❌ Não (usa Chrome Custom Tabs / navegador) | ❌ Não (contraria FR-4 / Story 8.8; exige gerir `refresh_token` e piora UX nativa) | ⚠️ via `ASWebAuthenticationSession` | ✅ Sim (`expo-auth-session@~57.0.17` já instalado) | ❌ **Descartada** (fora do requisito Credential Manager + `AuthorizationClient`) |

*\*Nota sobre o custo da Universal Sign-In: a documentação oficial (`universal-sign-in.com`) lista US$ 79/ano (Personal) e US$ 249/ano (Team, até 15 devs), mencionando também possibilidade de licença inclusa para clientes de planos pagos da EAS (a confirmar caso o projeto possua assinatura EAS elegível).*

---

## 3. Análise Detalhada das 3 Opções Viáveis

### Opção 1 (Recomendada): Módulo Expo Local Próprio (`modules/domus-google-auth`)
- **Como funciona:** Módulo Expo local criado em `modules/domus-google-auth/` usando a **Expo Modules API** do próprio SDK 57 (`expo-modules-core@57.0.26`, autolinking automático em `npx expo prebuild --clean`, sem mexer manualmente em `android/` ou `ios/`).
  - **Android (~180–220 linhas de Kotlin):** `CredentialManager` (`androidx.credentials:1.5.0` + `googleid:1.1.1`) para `signIn`/`signOut`, mais `Identity.getAuthorizationClient(activity)` (`play-services-auth:21.4.0`) para `authorizeDrive(scopes, accountEmail?)` com resolução via `OnActivityResult` do Expo, renovação silenciosa sem `client_secret` e limpeza de cache de token (`clearCachedAccessToken` / `revokeAccess`) sem nenhuma referência à API legada `GoogleSignInClient`.
  - **iOS (~120 linhas de Swift):** `GoogleSignIn` CocoaPod (mesmo SDK oficial do Google já compatível com `GoogleService-Info.plist` e `ios.deploymentTarget: "16.4"`), expondo a mesma interface TypeScript (`signIn`, `authorizeDrive`, `signOut`, `revokeAccess`).
  - **Web:** mantém intacto `src/modules/backup/infrastructure/GoogleOAuthWeb.ts`.
- **Prós:**
  - **Custo $0 permanente**, sem assinatura anual em dólar e sem risco de mudança de licença ou cobrança futura.
  - **Zero token privado na CI:** `npm ci` no GitHub Actions (`gate.yml`, `build-android.yml`, `build-ios.yml`) continua funcionando sem configurar secrets de registry privado no `.npmrc`.
  - **Contrato exato do DOMUS:** suporta `setAccount(email)` (evita ambiguidade multi-conta no Android), invalidação de token `401` e remoção completa de `getTokens()` legado com API mínima e auditável.
  - **Compatibilidade nativa com SDK 57+:** compila com o `expo-module-gradle-plugin` do próprio SDK instalado.
- **Contras:**
  - ~320 linhas de código nativo (Kotlin + Swift) mantidas no próprio repositório DOMUS (porém código pequeno, focado exclusivamente em 4 métodos e usando apenas APIs estáveis do Google).

### Opção 2: `@react-native-google-signin/google-signin` Universal (Paga)
- **Prós:**
  - Biblioteca madura e amplamente testada (mesmo mantenedor da Original), com `GoogleOneTapSignIn` (Credential Manager) + `requestAuthorization` (`AuthorizationClient`) + iOS + Config Doctor.
  - Menos código nativo próprio no repositório DOMUS.
- **Contras:**
  - **Custo recorrente:** US$ 79/ano (Personal) ou US$ 249/ano (Team) para manter atualizações em futuros SDKs (ou dependência de plano pago da EAS).
  - **Registry privado (`.npmrc`):** exige token secreto configurado em todo ambiente local e nos workflows do GitHub Actions (`Gate`, `build-android.yml`, `build-ios.yml`).
  - **Licença proprietária:** vendor lock-in para uma funcionalidade pontual (apenas 1 escopo `drive.appdata` de backup).

### Opção 3: `expo-google-credential-auth@0.2.0` (MIT, Comunidade)
- **Prós:**
  - Grátis (MIT), já estruturada como Expo Module com Credential Manager + `AuthorizationClient`.
- **Contras:**
  - **Imatura (`0.2.0`, mantenedor único)** e ainda baseada em SDK 55 / `credentials:1.3.0` / `play-services-auth:21.3.0`.
  - Ainda importa e invoca o legado `GoogleSignIn.getClient()` dentro de `revokeAccess`, e não suporta `setAccount` nem limpeza isolada de token em cache — exigiria `patch-package` (reintroduzindo um patch que acabamos de eliminar na Story 8.6).

---

## 4. Recomendação Técnica

Recomenda-se a **Opção 1 — Módulo Expo local próprio (`modules/domus-google-auth`)** pelos seguintes motivos:
1. O DOMUS usa Google Sign-In para um único caso de uso bem delimitado (autenticar conta + obter `accessToken` para `drive.appdata` no backup do Drive, sem `client_secret`).
2. Nenhuma biblioteca open-source madura hoje cobre Android `CredentialManager` + `AuthorizationClient` sem chamar a API legada ou exigir patches; a única biblioteca pronta madura (`Universal Sign-In`) é comercial (**US$ 79/ano** + registry privado na CI).
3. Um Expo Module local de ~200 linhas Kotlin + ~120 linhas Swift sobre os SDKs oficiais do Google (Apache-2.0) elimina custo recorrente, elimina token privado no `npm ci`, remove 100% da API legada e acompanha automaticamente os upgrades futuros do Expo SDK via `expo-modules-core`.

---

## 5. Aprovação do Dono

- **Status:** ✅ Aprovada por escrito pelo dono (Story 8.7 concluída; Story 8.8 liberada para implementação).
- **Escolha aprovada:** **Opção 1 — Módulo Expo local próprio (`modules/domus-google-auth`)** via Expo Modules API v57 ($0, SDKs oficiais do Google sob Apache-2.0, Android Credential Manager + `Identity.getAuthorizationClient` para `drive.appdata` + iOS `GIDSignIn`, sem token privado na CI).
- **Data da aprovação:** 26/11/2026
