# Migração Direta para o Expo SDK 57 (Stories 8.3 + 8.5)

**Stories:** 8.3 (requisitos técnicos consolidados) + 8.5 — Atualizar direto para o Expo SDK 57 e aplicar codemod do `expo-router`  
**Data:** 26/11/2026  
**Commit base (SDK 55 validado):** `b512513c6836f2b635a036edb3852b3714456af2` (branch `dev`)  
**Referências anteriores:** [docs/memoria-baseline-sdk-54.md](./memoria-baseline-sdk-54.md) · [docs/migracao-sdk-55.md](./migracao-sdk-55.md) · [docs/reavaliacao-sdk-55.md](./reavaliacao-sdk-55.md)  
**Engine JS:** Hermes padrão do SDK 57 (`hermesEnabled=true`, Hermes V1 com correção da regressão de memória via `expo@57.0.34 >= 57.0.9`)  
**Arquitetura:** Nova Arquitetura (padrão obrigatório no SDK 57)

> **Motivo do salto direto 55 → 57:** Conforme a orientação oficial `expo-upgrade` e aprovação explícita do dono em 26/11/2026, o salto intermediário pelo SDK 56 (Stories 8.3/8.4) foi pulado porque o SDK 56 e versões `expo@<=57.0.8` apresentam regressão de memória no Hermes V1 com `react-native-worklets`/`react-native-reanimated`. Os requisitos técnicos da Story 8.3 (codemod do `expo-router`, validação do `fetch` global e verificação do `expo-sqlite`) foram consolidados nesta entrega; o SDK 58 (`latest: 58.0.26`) permanece fora do escopo.

---

## 1. Resumo das Atualizações de Pacotes

A atualização partiu de `npx expo install expo@^57 --fix` (fixando `expo` em `~57.0.34`, dist-tag `sdk-57`), seguida de alinhamento de peer dependencies e sincronização do `package-lock.json` via `npm install`.

### 1.1 Principais versões alteradas

| Pacote | SDK 55 (antes) | SDK 57 (depois) | Versão resolvida (`node_modules`) | Observação |
|---|---|---|---|---|
| `expo` | `~55.0.32` | `~57.0.34` | `57.0.34` | Estável SDK 57 (`>= 57.0.9`, sem SDK 58) |
| `react` / `react-dom` | `19.2.0` | `19.2.3` | `19.2.3` | Alinhado ao SDK 57 |
| `react-native` | `0.83.10` | `0.86.3` | `0.86.3` | Remove `StyleSheet.absoluteFillObject` em tipos e runtime |
| `expo-router` | `~55.0.18` | `~57.0.32` | `57.0.32` | `useIsFocused` migrado diretamente para `expo-router` |
| `expo-modules-core` | `55.0.27` (transitivo) | transitivo hoisted | `57.0.26` | Hoisted na raiz; `.npmrc` preservado |
| `expo-build-properties` | `~55.0.18` | `~57.0.24` | `57.0.24` | Exigiu `ios.deploymentTarget: "16.4"`; Android `24/36/36` mantido |
| `expo-share-intent` | `6.1.1` | `8.0.1` | `8.0.1` | Resolveu `ERESOLVE` (`6.1.1` exigia `peer expo@"^55"`; `8.0.1` declara `peer expo@"^57"`) |
| `lottie-react-native` | `~7.3.4` | `~7.3.8` | `7.3.8` | Alinhado a `bundledNativeModules.json` |
| `react-native-gesture-handler` | `~2.30.0` | `~2.32.0` | `2.32.0` | Alinhado ao SDK 57 |
| `react-native-keyboard-controller` | `1.20.7` | `1.21.9` | `1.21.9` | Fórmula `keyboardY` e `Handler.post { view.removeSelf() }` preservados |
| `react-native-reanimated` | `4.2.1` | `4.5.1` | `4.5.1` | Alinhado ao SDK 57 |
| `react-native-safe-area-context` | `~5.6.2` | `~5.7.0` | `5.7.0` | Alinhado ao SDK 57 |
| `react-native-screens` | `~4.23.0` | `~4.26.0` | `4.26.2` | Alinhado ao SDK 57 |
| `react-native-sprinkle-toast` | `^1.0.1` | `1.0.1` | `1.0.1` | Fixado exato com patch para `StyleSheet.absoluteFill` |
| `react-native-svg` | `15.15.3` | `15.15.4` | `15.15.4` | Alinhado ao SDK 57 |
| `react-native-view-shot` | `4.0.3` | `5.1.0` | `5.1.0` | Salto major para TurboModule (`NativeRNViewShot`); validar `captureRef` na Story 8.6 |
| `react-native-webview` | `13.16.0` | `13.16.1` | `13.16.1` | Alinhado ao SDK 57 |
| `react-native-worklets` | `0.7.4` | `0.10.1` | `0.10.1` | Alinhado ao SDK 57 |
| `babel-preset-expo` | `~55.0.8` | `~57.0.0` | `57.0.17` | `devDependencies` |
| `eslint-config-expo` | `~55.0.1` | `~57.0.2` | `57.0.2` | `devDependencies` (trouxe `eslint-plugin-react-hooks@7.1.1`) |
| `typescript` | `~5.9.2` | `~6.0.3` | `6.0.3` | `devDependencies` (deprecou `baseUrl` no `tsconfig.json`) |
| `zod-validation-error` | `^3.4.0` (direta, sem uso) | *(removida da raiz)* | `4.0.2` (transitiva) | Removida dependência direta sem uso; destravou `./v4` para `eslint-plugin-react-hooks@7.1.1` |
| `tamagui` / `@tamagui/*` | `^2.7.7` | `^2.7.7` | `2.7.7` | **Mantido intacto** — reavaliação reservada à Story 8.6 |

Demais módulos `expo-*` (`expo-asset`, `expo-audio`, `expo-auth-session`, `expo-blur`, `expo-camera`, `expo-clipboard`, `expo-constants`, `expo-crypto`, `expo-dev-client`, `expo-document-picker`, `expo-file-system`, `expo-font`, `expo-glass-effect`, `expo-haptics`, `expo-image`, `expo-image-manipulator`, `expo-image-picker`, `expo-linear-gradient`, `expo-linking`, `expo-local-authentication`, `expo-notifications`, `expo-secure-store`, `expo-sharing`, `expo-splash-screen`, `expo-sqlite`, `expo-status-bar`, `expo-symbols`, `expo-system-ui`, `expo-web-browser`) foram atualizados para as versões `~57.0.*` recomendadas pelo `expo install --fix`.

### 1.2 Conflitos de peer e lockfile resolvidos

1. **`expo-share-intent@6.1.1` (`ERESOLVE`):** declarava `peer expo@"^55"`, bloqueando `npm install` com `expo@57.0.34`. Atualizado para `expo-share-intent@8.0.1`, que declara `peer expo@"^57"`, `expo-linking >=57.0.1` e `expo-constants >=57.0.3`. Confirmado no prebuild Android (`[expo-share-intent] add android filters (text/*)`) e em `android/app/src/main/AndroidManifest.xml` (linha 52: `<data android:mimeType="text/*"/>`).
2. **`zod-validation-error@3.5.4` (`ERR_PACKAGE_PATH_NOT_EXPORTED` no ESLint):** `eslint-config-expo@57.0.2` trouxe `eslint-plugin-react-hooks@7.1.1`, que importa `zod-validation-error/v4` e declara `"zod-validation-error": "^3.5.0 || ^4.0.0"`. A dependência direta não utilizada `"zod-validation-error": "^3.4.0"` em `package.json` (0 imports no repositório) forçava o npm a dedupar `3.5.4`, que não exporta `./v4`. Ao remover a dependência não utilizada da raiz e atualizar o transitivo via `npm update zod-validation-error`, o `package-lock.json` resolveu `zod-validation-error@4.0.2` (compatível com `zod@3.25.76`), normalizando `npx eslint .` e `npx expo lint`.

---

## 2. Requisitos Técnicos da Story 8.3 (Consolidados)

### 2.1 Codemod `expo-router` e verificação de `@deprecated`

- Executado o codemod oficial: `npx --yes expo-codemod sdk-56-expo-router-react-navigation-replace src` (`0 errors`, `405 skipped`, `2 ok`), reescrevendo:
  - `src/components/invoice/OcrScanScreen.tsx` (`@react-navigation/native` → `expo-router/react-navigation`)
  - `src/components/invoice/QrScanScreen.tsx` (`@react-navigation/native` → `expo-router/react-navigation`)
- **Auditoria de `@deprecated` em `expo-router@57.0.32`:** a inspeção de `node_modules/expo-router/build/react-navigation/core/index.d.ts` (linhas 107–110) revelou que `useIsFocused` em `expo-router/react-navigation` é um shim marcado como:
  ```ts
  /**
   * @deprecated Import `useIsFocused` from `expo-router` instead. Will be removed in a future SDK.
   */
  export { useIsFocused } from './useIsFocused';
  ```
- Já em `node_modules/expo-router/build/exports.d.ts` (linha 20), `useIsFocused` é exportado diretamente de `"expo-router"` sem `@deprecated`. Portanto, ambos os arquivos (`OcrScanScreen.tsx` e `QrScanScreen.tsx`) foram ajustados para importar `useIsFocused` diretamente de `"expo-router"`.
- Confirmado via `git grep "@react-navigation" -- app src packages scripts plugins`: **0 imports restantes de `@react-navigation/*`**.
- **Notas adicionais de `@deprecated` (acompanhamento não bloqueante):**
  - `Tabs` importado de `"expo-router"` foi marcado `@deprecated` em `node_modules/expo-router/build/exports.d.ts:41-44` (`Use import { Tabs } from 'expo-router/js-tabs' instead`); o app usa `NativeTabs` em `app/(tabs)/_layout.tsx` (nenhum uso bloqueante na 8.5, mas acompanhar se algum ponto futuro ou auxiliar importar `Tabs`).
  - `runOnJS` de `"react-native-reanimated"` está deprecado em favor de `scheduleOnRN` de `"react-native-worklets"` (`0.10.1`); mantido intacto na 8.5 (funcional no SDK 57) e registrado como limpeza posterior não bloqueante.

### 2.2 Verificação do `expo-sqlite` (`copy()` / `move()`)

- Busca completa no repositório (`git grep -n "sqlite" -- app src packages scripts plugins`) confirmou uso único de `expo-sqlite` em `packages/storage/src/sqliteAdapter.ts`, chamando apenas `openDatabaseSync`, `runSync`, `getAllSync` e `getFirstSync`.
- **0 ocorrências de `copy()` ou `move()`** no `expo-sqlite` — nenhuma adaptação necessária.

### 2.3 Validação do `fetch` global (Nostr e IA)

- Todas as suítes de sincronização Nostr (`src/modules/__tests__/nostrSync.test.ts`, `threeDeviceSyncSimulation.test.ts`, `syncCoordinator.test.ts`, `strongGroup/*`) e de IA (`src/modules/ai/**/*`, `src/services/__tests__/ocrConfigService.test.ts`) passaram integralmente em `npx vitest run` sem necessidade de adaptação de contratos. Validação de rede real em aparelho permanece reservada à Story 8.6.

---

## 3. Inventário de Patches (`patch-package`)

Nenhum patch falhou na aplicação do `postinstall` (`docs/patches-sdk-57-pendentes/` não precisou ser criada). O projeto encerra a Story 8.5 com **2 patches ativos** em `patches/`, ambos aplicados com sucesso no `npm install`:

| Patch | Versão | Status | Motivo técnico objetivo |
|---|---|---|---|
| `patches/react-native-gifted-chat+3.3.2.patch` | `3.3.2` | ✅ Aplicado e atualizado | Mantém a remoção do `<KeyboardProvider>` aninhado (Story 13.5) e a tipagem `ColorSchemeName \| null \| undefined` em `GiftedChatContext.ts`. Atualizado no SDK 57 para remover `{/* @ts-expect-error */}` em `src/GiftedChat/index.tsx:329`, que se tornou diretiva não usada (`TS2578`) após a correção de tipos do `KeyboardAvoidingView` em `react-native-keyboard-controller@1.21.9`. Coberto por `patches/__tests__/giftedChatPatch.test.ts`. |
| `patches/react-native-sprinkle-toast+1.0.1.patch` | `1.0.1` | ✅ Novo patch (RN `0.86.3`) | Em React Native `0.86.3`, `StyleSheet.absoluteFillObject` foi removido tanto da tipagem (`TS2551`) quanto do runtime (`StyleSheetExports.js` exporta apenas `StyleSheet.absoluteFill`). Como `react-native-sprinkle-toast@1.0.1` aponta `main`/`types` diretamente para `src/*.tsx` usando `...StyleSheet.absoluteFillObject` em `Sprinkles.tsx`, `ToastItem.tsx` e `ToastProvider.tsx`, o patch substitui essas 3 ocorrências por `...StyleSheet.absoluteFill` (evitando quebra de tipo e overlay sem posicionamento absoluto em runtime). Versão fixada em `"1.0.1"` em `package.json`; coberto por `patches/__tests__/sprinkleToastPatch.test.ts`. **Nota para Story 8.6:** atualmente o app apenas monta `<ToastProvider>` em `app/_layout.tsx` com **0 chamadas à API de toast** — forte candidato à remoção definitiva (pacote + patch) na Story 8.6. |

> **Nota sobre `react-native-vision-camera@4.7.3`:** o pacote ainda referencia `StyleSheet.absoluteFillObject` internamente, mas não é importado nem renderizado pelo app em produção (permanece sem impacto de tipo/runtime); manter no radar caso venha a ser reativado.

---

## 4. Quebras Diretas do SDK 57 / RN 0.86 / TS 6 Corrigidas

1. **`app.json` — `ios.deploymentTarget` (`"15.1"` → `"16.4"`):** exigido por `expo-build-properties@57.0.24` (`ios.deploymentTarget needs to be at least version 16.4`). Android preservado intacto (`minSdkVersion: 24`, `compileSdkVersion: 36`, `targetSdkVersion: 36`).
2. **`app.json` — migração da chave raiz `"splash"` para o plugin `expo-splash-screen`:** no schema do SDK 57, `expo-doctor` rejeita a propriedade raiz legada `"splash"` (`Additional property "splash" is not allowed`). A configuração (`image`, `imageWidth: 200`, `resizeMode`, `backgroundColor` e `dark`) foi movida integralmente para a entrada `["expo-splash-screen", { ... }]` em `plugins` — definindo explicitamente `"imageWidth": 200` para evitar o fallback padrão `100` de `getAndroidSplashConfig`/`getIosSplashConfig` que encolheria o ícone. Protegida por `plugins/__tests__/appConfigSdk57.test.ts`.
3. **Remoção de `StyleSheet.absoluteFillObject` no React Native `0.86.3` (19 arquivos do app + `react-native-sprinkle-toast`):** substituídas todas as 20 ocorrências em `app/about.tsx` e em 18 componentes sob `src/components/` por `StyleSheet.absoluteFill` (compatível com RN `0.86.3` e `react-native-web@~0.21.0`, que retorna objeto plano de estilo).
4. **`tsconfig.json` (TypeScript `6.0.3`):** removida a opção deprecada `"baseUrl": "."` (`TS5101`), mantendo intactos os aliases `paths` (`./*`, `./shared/*`, `./packages/*`).
5. **`eslint.config.js` (`eslint-config-expo@57.0.2` / `eslint-plugin-react-hooks@7.1.1`):** a atualização do `eslint-plugin-react-hooks` v5 → v7 habilitou 5 novas regras de React Compiler que acusaram **199 erros pré-existentes** no código do app (`react-hooks/refs`: 147 — em grande parte falsos positivos em custom hooks que retornam objeto contendo refs junto com estado; `react-hooks/set-state-in-effect`: 33; `react-hooks/immutability`: 11; `react-hooks/purity`: 6; `react-hooks/preserve-manual-memoization`: 2). Essas 5 novas regras foram explicitamente definidas como `"off"` em `eslint.config.js` com comentário rastreável, mantendo `react-hooks/rules-of-hooks` (`"error"`), `react-hooks/exhaustive-deps` (`"warn"`) e todas as demais regras do projeto intactas.
6. **`src/components/__tests__/keyboardScroll.test.ts` (sentinela da Story 13.5):** após confirmar estaticamente em `react-native-keyboard-controller@1.21.9` que a fórmula de `KeyboardAvoidingView/index.tsx` (`screenHeight - keyboard.heightWhenOpened.value - keyboardVerticalOffset`, `automaticOffset = false` por padrão) e `EdgeToEdgeReactViewGroup.kt:191` (`Handler(Looper.getMainLooper()).post { view.removeSelf() }`) foram preservados, a versão esperada da sentinela foi atualizada de `1.20.7` para `1.21.9`.

---

## 5. Evidências de Verificação

| Verificação | Comando | Resultado | Detalhes |
|---|---|---|---|
| **Postinstall / Patches** | `npm install` (`postinstall: patch-package`) | ✅ Passou (exit `0`) | `react-native-gifted-chat@3.3.2 ✔`, `react-native-sprinkle-toast@1.0.1 ✔` |
| **Expo Doctor** | `npx expo-doctor` | ✅ Passou (exit `0`) | `21/21 checks passed. No issues detected!` |
| **Lint (paridade CI `gate.yml`)** | `npx eslint .` | ✅ Passou (exit `0`) | `0 errors`, `14 warnings` pré-existentes |
| **Lint (Expo)** | `npx expo lint` | ✅ Passou (exit `0`) | `0 errors`, `10 warnings` pré-existentes |
| **TypeScript** | `Remove-Item expo-env.d.ts -ErrorAction SilentlyContinue; npx tsc --noEmit` | ✅ Passou (exit `0`) | `0` erros (TypeScript `6.0.3`) |
| **Testes unitários** | `npx vitest run` | ✅ 0 falhas novas (`154/156` arquivos, `3236/3238` testes após inclusão dos testes de patch e config SDK 57) | Apenas as 2 falhas Windows locais pré-existentes: `plugins/__tests__/withReleaseSigning.test.ts:83` (CRLF vs LF) e `packages/season/__tests__/season.test.ts:156` (fuso UTC-3) |
| **Export Web (paridade CI)** | `npx expo export --platform web` | ✅ Passou (exit `0`) | `Web Bundled 31714ms` (`3766` módulos, `React Compiler enabled`, `wa-sqlite.wasm` empacotado); `dist/` removido após a verificação |
| **Config Plugins / Prebuild JSON** | `npx expo config --type prebuild --json` | ✅ Passou (exit `0`) | Plugins Android e iOS resolvidos sem erro (`ios.deploymentTarget=16.4`, `expo-splash-screen` `imageWidth=200`, `expo-share-intent@8.0.1`) |
| **Prebuild Android limpo** | `npx expo prebuild --clean --platform android` | ✅ Passou (exit `0`) | `withReleaseSigning`, `withGwpAsan` (`gwpAsanMode="always"`), `withOrientationFix`, `expo-share-intent` (`text/*`) e `hermesEnabled=true` confirmados em `android/` |
| **Build Android Release** | `$env:JAVA_HOME='.../jdk-17'; Set-Location android; .\gradlew.bat assembleRelease --max-workers=2` | ✅ Passou (`BUILD SUCCESSFUL`) | Gradle `9.3.1`, NDK `27.1.12297006`, Kotlin `2.1.20`, `1525` tasks; APK gerado em `android/app/build/outputs/apk/release/app-release.apk` (`229.858.402` bytes / `219,2 MiB`, já com `imageWidth: 200` na splash) |
| **Inspeção do APK (`aapt2`)** | `aapt2 dump badging android/app/build/outputs/apk/release/app-release.apk` | ✅ Passou | `package: name='br.com.pixeleucaristico.domus' versionCode='12' versionName='1.9.0' compileSdkVersion='36'`, `minSdkVersion:'24'`, `targetSdkVersion:'36'` |

---

## 6. Pendências Transferidas para a Story 8.6

- **Medição de memória no `SM-X510` (Android 16) com Hermes V1 do SDK 57 (`expo@57.0.34`):** repetir o protocolo completo das 8 telas de [docs/memoria-baseline-sdk-54.md](./memoria-baseline-sdk-54.md) contra o teto de `+20%` (`TOTAL PSS`) sobre a linha de base SDK 54 (`364.481 KB` / `355,9 MB` global), comprovando na prática ausência da regressão de memória do Hermes V1 com `react-native-reanimated@4.5.1` e `react-native-worklets@0.10.1`.
- **Validação manual dos fluxos essenciais (FR-1) no Android 16:** abas principais em retrato/paisagem, `ScreenIntroModal` e `BackHandler`, teclado e chat `DOMUS IA` (`GiftedChat@3.3.2` + `react-native-keyboard-controller@1.21.9`), câmera/OCR (`OcrScanScreen` e `QrScanScreen` usando `useIsFocused` de `expo-router`), compartilhamento de imagem de cartões de troféu/temporada via `captureRef` (`react-native-view-shot@5.1.0` — salto major para TurboModule `NativeRNViewShot`), splash screen migrada para o plugin `expo-splash-screen` (`imageWidth: 200`), `expo-share-intent@8.0.1` (`ACTION_SEND` `text/*`), backup/Drive e sync Nostr real (validando o `fetch` global em rede real).
- **Reavaliação final de patches, bibliotecas e Tamagui no SDK 57:** decidir manutenção de `patches/react-native-gifted-chat+3.3.2.patch`, avaliar **remoção definitiva** de `react-native-sprinkle-toast@1.0.1` + seu patch (o app só monta `<ToastProvider>` em `app/_layout.tsx` com 0 chamadas à API de toast), confirmar que `react-native-vision-camera@4.7.3` (ainda com `absoluteFillObject` interno) segue sem uso ativo, e reavaliar `tamagui@^2.7.7` no SDK 57.
- **Verificação de build iOS (`build-ios.yml`):** no runner macOS, confirmar que o target `ShareExtension` gerado por `expo-share-intent@8.0.1` herda/alinha `IPHONEOS_DEPLOYMENT_TARGET` compatível com `ios.deploymentTarget: "16.4"`.
- **Dívida técnica opcional (fora do bloqueio do Epic 8):** acompanhar a adoção gradual das 5 regras de React Compiler do `eslint-plugin-react-hooks@7.1.1` desabilitadas temporariamente em `eslint.config.js` (`refs`, `set-state-in-effect`, `immutability`, `purity`, `preserve-manual-memoization`), além das deprecações não bloqueantes `Tabs` (`expo-router` → `expo-router/js-tabs`) e `runOnJS` (`react-native-reanimated` → `scheduleOnRN` de `react-native-worklets`).
