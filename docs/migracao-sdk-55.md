# Migração para o Expo SDK 55 (Story 8.1)

**Story:** 8.1 — Medir a linha de base e atualizar para o Expo SDK 55  
**Data:** 25/11/2026  
**Commit base (SDK 54):** `f06162f61a02d3dea678b281907b1347ca3b41cc` (branch `dev`)  
**Linha de base de memória (SDK 54):** [docs/memoria-baseline-sdk-54.md](./memoria-baseline-sdk-54.md)  
**Engine JS:** Hermes padrão do SDK 55 (`hermesEnabled=true`, sem opt-in em Hermes V1)  
**Arquitetura:** Nova Arquitetura (padrão obrigatório no SDK 55)

---

## 1. Resumo das Atualizações de Pacotes

A atualização partiu de `npx expo install expo@^55 --fix` (após a medição da linha de base SDK 54 no `SM-X510`).

### 1.1 Principais versões alteradas

| Pacote | SDK 54 (antes) | SDK 55 (depois) | Observação |
|---|---|---|---|
| `expo` | `~54.0.37` | `~55.0.32` | SDK alvo da Story 8.1 |
| `react` / `react-dom` | `19.1.0` | `19.2.0` | Alinhado ao SDK 55 |
| `react-native` | `0.81.5` | `0.83.10` | Alinhado ao SDK 55 |
| `expo-router` | `~6.0.24` | `~55.0.18` | Novo esquema de versionamento por SDK |
| `expo-asset` | `~12.0.13` | `~55.0.20` | Patch `12.0.13` arquivado para Story 8.2 |
| `expo-audio` | `~1.1.1` | `~55.0.18` | Patch `1.1.1` arquivado para Story 8.2 |
| `expo-build-properties` | `~1.0.10` | `~55.0.18` | `minSdk=24`, `compileSdk=36`, `targetSdk=36` mantidos |
| `expo-share-intent` | `5.1.1` | `6.1.1` | Resolução de conflito `ERESOLVE` (`5.1.1` exigia `peer expo@"^54"`; `6.1.1` declara `peer expo@"^55"`) |
| `lottie-react-native` | `~7.3.1` | `~7.3.4` | Alinhado a `bundledNativeModules.json` |
| `react-native-gesture-handler` | `~2.28.0` | `~2.30.0` | Alinhado ao SDK 55 |
| `react-native-keyboard-controller` | `1.18.5` | `1.20.7` | Patch `1.18.5` arquivado para Story 8.2; fórmula do `KeyboardAvoidingView` verificada |
| `react-native-reanimated` | `~4.1.1` | `4.2.1` | Alinhado ao SDK 55 |
| `react-native-safe-area-context` | `~5.6.0` | `~5.6.2` | Alinhado a `bundledNativeModules.json` |
| `react-native-screens` | `~4.16.0` | `~4.23.0` | Alinhado ao SDK 55 |
| `react-native-svg` | `15.12.1` | `15.15.3` | Alinhado ao SDK 55 |
| `react-native-view-shot` | `^4.0.3` | `4.0.3` | Alinhado a `bundledNativeModules.json` |
| `react-native-web` | `^0.21.0` | `~0.21.0` | Alinhado a `bundledNativeModules.json` |
| `react-native-webview` | `13.15.0` | `13.16.0` | Alinhado ao SDK 55 |
| `react-native-worklets` | `0.5.1` | `0.7.4` | Alinhado ao SDK 55 |
| `@types/react` | `~19.1.10` | `~19.2.10` | `devDependencies` |
| `babel-plugin-react-compiler` | `^19.0.0-beta-e993439-20250117` | *(removido)* | Redundante: `babel-preset-expo@55.0.25` já inclui `babel-plugin-react-compiler@^1.0.0` |
| `babel-preset-expo` | `^54.0.12` | `~55.0.8` | `devDependencies` (resolve `55.0.25`) |
| `eslint-config-expo` | `~10.0.0` | `~55.0.1` | `devDependencies` |
| `tamagui` / `@tamagui/*` | `^2.0.0-rc.26` | `^2.0.0-rc.26` | **Mantido intacto** — reavaliação reservada à Story 8.2 |

Demais módulos `expo-*` (`expo-auth-session`, `expo-blur`, `expo-camera`, `expo-clipboard`, `expo-constants`, `expo-crypto`, `expo-dev-client`, `expo-document-picker`, `expo-file-system`, `expo-font`, `expo-glass-effect`, `expo-haptics`, `expo-image`, `expo-image-manipulator`, `expo-image-picker`, `expo-linear-gradient`, `expo-linking`, `expo-local-authentication`, `expo-notifications`, `expo-secure-store`, `expo-sharing`, `expo-splash-screen`, `expo-sqlite`, `expo-status-bar`, `expo-symbols`, `expo-system-ui`, `expo-web-browser`) foram atualizados para as versões `~55.0.*` recomendadas pelo `expo install --fix`, com `package-lock.json` sincronizado via `npm install`.

### 1.2 Conflitos de peer e lockfile resolvidos

1. **`expo-share-intent@5.1.1` (`ERESOLVE`):** declarava `peer expo@"^54"`, bloqueando `npm install` com `expo@55.0.32`. Atualizado para `expo-share-intent@6.1.1`, que declara `peer expo@"^55"`, `expo-linking >=55.0.7` e `expo-constants >=55.0.7`. Verificado no `android/app/src/main/AndroidManifest.xml` gerado pelo prebuild que o filtro `<action android:name="android.intent.action.SEND"/>` com `<data android:mimeType="text/*"/>` foi preservado (linhas 50–53) e que `app/_layout.tsx` segue compatível com a API `useShareIntent()` (`hasShareIntent`, `shareIntent`, `resetShareIntent`).
2. **Hoisting de `expo-modules-core@55.0.27` e `.npmrc`:** o `package-lock.json` migrado mantinha `expo-modules-core` aninhado em `node_modules/expo/node_modules/expo-modules-core`, impedindo o TypeScript de resolver `import { PermissionResponse } from 'expo-modules-core'` dentro de `expo-notifications` (`TS2339: Property 'status' does not exist on type 'NotificationPermissionsStatus'` em `src/modules/notifications/infrastructure/NotificationService.ts`). Ao remover a cópia aninhada e regenerar `package-lock.json` com `npm install`, `expo-modules-core@55.0.27` foi elevado para `node_modules/expo-modules-core` e os erros de tipo desapareceram sem alterar `NotificationService.ts`. Adicionado `.npmrc` mínimo na raiz (`public-hoist-pattern[]=expo-modules-core`) para garantir resolução determinística em instalações locais via `pnpm` sem afetar `npm ci`.

---

## 2. Inventário dos 5 Patches (`patch-package`)

Após instalar o SDK 55, `npx patch-package` (executado no `postinstall`) produziu:
- **2 patches aplicados com sucesso** (`react-native-gifted-chat@3.3.2`, `rn-tourguide@3.3.2`);
- **3 patches que falharam** por mudança de versão dos pacotes (`expo-asset`, `expo-audio`, `react-native-keyboard-controller`), movidos intactos para `docs/patches-sdk-55-pendentes/` para destravar `postinstall`/`npm ci` e subsidiar a decisão final na **Story 8.2**.

### 2.1 Patches ativos em `patches/`

| Patch | Versão | Status | Observação |
|---|---|---|---|
| `patches/react-native-gifted-chat+3.3.2.patch` | `3.3.2` | ✅ Aplicado | Mantida a remoção do `KeyboardProvider` interno (Story 13.5) e acrescido ajuste de tipo `import type { ColorSchemeName } from 'react-native'` + `getColorScheme(): ColorSchemeName \| null \| undefined` em `src/GiftedChatContext.ts` para compatibilidade com RN `0.83` (que incluiu `'unspecified'` em `ColorSchemeName`). Coberto por `patches/__tests__/giftedChatPatch.test.ts`. |
| `patches/rn-tourguide+3.3.2.patch` | `3.3.2` | ✅ Aplicado | Aplicou sem conflito; reavaliação funcional permanece na Story 8.2. |

### 2.2 Patches incompatíveis arquivados em `docs/patches-sdk-55-pendentes/`

#### 1) `expo-asset+12.0.13.patch` (`12.0.13` → `55.0.20`)
- **Diff preservado em:** [docs/patches-sdk-55-pendentes/expo-asset+12.0.13.patch](./patches-sdk-55-pendentes/expo-asset+12.0.13.patch)
- **Erro exato do `patch-package`:**
```text
**ERROR** Failed to apply patch for package expo-asset at path
  
    node_modules/expo-asset

  This error was caused because expo-asset has changed since you
  made the patch file for it. This introduced conflicts with your patch,
  just like a merge conflict in Git when separate incompatible changes are
  made to the same piece of code.
...
  Info:
    Patch file: patches/expo-asset+12.0.13.patch
    Patch was made for version: 12.0.13
    Installed version: 55.0.20
```
- **Nota factual para a Story 8.2:** inspeção de `node_modules/expo-asset/build/AssetSources.js` (linhas 37–41) em `55.0.20` mostra que o PR `expo/expo#42184` já foi incorporado upstream (`const scheme = manifestBaseUrl?.startsWith('https://') ? 'https://' : 'http://';`). A decisão formal de descarte definitivo cabe à Story 8.2.

#### 2) `expo-audio+1.1.1.patch` (`1.1.1` → `55.0.18`)
- **Diff preservado em:** [docs/patches-sdk-55-pendentes/expo-audio+1.1.1.patch](./patches-sdk-55-pendentes/expo-audio+1.1.1.patch)
- **Erro exato do `patch-package`:**
```text
**ERROR** Failed to apply patch for package expo-audio at path
  
    node_modules/expo-audio

  This error was caused because expo-audio has changed since you
  made the patch file for it. This introduced conflicts with your patch,
  just like a merge conflict in Git when separate incompatible changes are
  made to the same piece of code.
...
  Info:
    Patch file: patches/expo-audio+1.1.1.patch
    Patch was made for version: 1.1.1
    Installed version: 55.0.18
```
- **Nota factual para a Story 8.2:** em `expo-audio@55.0.18`, `AudioModule.kt` (linha 61) ainda inicializa `private var interruptionMode: InterruptionMode? = null` e `AudioPlayer.kt` (linha 52) ainda usa `.setAudioAttributes(AudioAttributes.DEFAULT, false)`. Reavaliar na Story 8.2 se o patch será recriado sobre `55.0.18` ou substituído por configuração via API de `expo-audio`.

#### 3) `react-native-keyboard-controller+1.18.5.patch` (`1.18.5` → `1.20.7`)
- **Diff preservado em:** [docs/patches-sdk-55-pendentes/react-native-keyboard-controller+1.18.5.patch](./patches-sdk-55-pendentes/react-native-keyboard-controller+1.18.5.patch)
- **Erro exato do `patch-package`:**
```text
**ERROR** Failed to apply patch for package react-native-keyboard-controller at path
  
    node_modules/react-native-keyboard-controller

  This error was caused because react-native-keyboard-controller has changed since you
  made the patch file for it. This introduced conflicts with your patch,
  just like a merge conflict in Git when separate incompatible changes are
  made to the same piece of code.
...
  Info:
    Patch file: patches/react-native-keyboard-controller+1.18.5.patch
    Patch was made for version: 1.18.5
    Installed version: 1.20.7
```
- **Nota factual para a Story 8.2:** em `1.20.7`, `EdgeToEdgeReactViewGroup.kt` preserva `Handler(Looper.getMainLooper()).post { view.removeSelf() }` (linha 194), mas **não** inclui `cleanNullChildren()` em `dispatchDraw`. A Story 8.2 deve testar no `SM-X510` (Android 16) se o RN `0.83.10` + `1.20.7` ainda reproduzem o crash `dispatchGetDisplayList` ou se o patch precisa ser portado para `1.20.7`. Além disso, confirmou-se estaticamente que a fórmula de offset em `src/components/KeyboardAvoidingView/index.tsx` (`keyboardY = screenHeight - keyboard.heightWhenOpened.value - keyboardVerticalOffset`) permaneceu idêntica na `1.20.7`.

---

## 3. Quebras Diretas do SDK 55 Corrigidas

1. **`app/(tabs)/_layout.tsx` (`NativeTabs`):** migrados `Icon` e `Label` importados separadamente de `expo-router/unstable-native-tabs` para `<NativeTabs.Trigger.Icon>` e `<NativeTabs.Trigger.Label>`, mantendo apenas `import { NativeTabs } from "expo-router/unstable-native-tabs"`.
2. **`app.json` (schema do SDK 55):** removida a propriedade `"newArchEnabled": true`, que passou a falhar no `expo-doctor` (`Additional property "newArchEnabled" is not allowed`) porque a Nova Arquitetura é obrigatória no SDK 55. Mantidos intactos `expo-build-properties` (`minSdkVersion: 24`, `compileSdkVersion: 36`, `targetSdkVersion: 36`), `reactCompiler: true` e todos os plugins customizados (`withGwpAsan`, `withOrientationFix`, `withReleaseSigning`).
3. **`patches/react-native-gifted-chat+3.3.2.patch` (+ `patches/__tests__/giftedChatPatch.test.ts`):** adicionado `import type { ColorSchemeName } from 'react-native'` e `getColorScheme(): ColorSchemeName | null | undefined` em `src/GiftedChatContext.ts` para resolver `TS2322` (`Type '"unspecified"' is not assignable to type '"light" | "dark" | null | undefined'`) introduzido pelo tipo `ColorSchemeName` do React Native `0.83.10`, preservando `null` e `undefined` sem introduzir import em runtime.
4. **`patches/__tests__/keyboardControllerPatch.test.ts` e `src/components/__tests__/keyboardScroll.test.ts`:** atualizados para refletir `react-native-keyboard-controller@1.20.7`, verificar explicitamente o estado real do patch (ativo em `patches/` ou arquivado em `docs/patches-sdk-55-pendentes/` para a Story 8.2) e manter a guarda do post assíncrono em `EdgeToEdgeReactViewGroup.kt`.

---

## 4. Evidências de Verificação

| Verificação | Comando | Resultado | Detalhes |
|---|---|---|---|
| **Postinstall / Patches** | `npm install` (`postinstall: patch-package`) | ✅ Passou (exit `0`) | `react-native-gifted-chat@3.3.2 ✔`, `rn-tourguide@3.3.2 ✔` |
| **Expo Doctor** | `npx expo-doctor` | ✅ Passou (exit `0`) | `20/20 checks passed. No issues detected!` |
| **Lint (Expo)** | `npx expo lint` | ✅ Passou (exit `0`) | `0 errors`, `10 warnings` pré-existentes |
| **Lint (paridade CI `gate.yml`)** | `npx eslint .` | ✅ Passou (exit `0`) | `0 errors`, `14 warnings` pré-existentes |
| **Export Web (paridade CI)** | `npx expo export --platform web` | ✅ Passou (exit `0`) | `Web Bundled 4152ms` (`3633` módulos, `React Compiler enabled`, `wa-sqlite.wasm` empacotado); `dist/` removido após a verificação |
| **Prebuild / Config Plugins iOS (paridade CI)** | `npx expo prebuild --platform ios --clean --no-install` + `npx expo config --type prebuild --json` | ⚠️ Geração nativa iOS pulada no Windows / ✅ Config plugins OK | No Windows, `expo prebuild --platform ios` pula a geração de arquivos nativos (`Skipping generating the iOS native project files. Run npx expo prebuild again from macOS or Linux...`); pasta `ios/` removida/inexistente. `npx expo config --type prebuild --json` retornou exit `0` com `ios.bundleIdentifier=br.com.pixeleucaristico.domus`. Geração completa de `ios/` será validada no runner macOS de `build-ios.yml`. |
| **TypeScript** | `Remove-Item expo-env.d.ts -ErrorAction SilentlyContinue; npx tsc --noEmit` | ✅ Passou (exit `0`) | `0` erros |
| **Testes unitários** | `npx vitest run` | ✅ 0 falhas novas (`151/153` arquivos, `3220/3222` testes) | Apenas as 2 falhas Windows locais já conhecidas (pré-existentes no SDK 54): `plugins/__tests__/withReleaseSigning.test.ts:83` (CRLF vs LF no Windows) e `packages/season/__tests__/season.test.ts:156` (fuso local UTC-3 para `"2026-03-01T00:00:00.000Z"`). |
| **Prebuild Android limpo** | `npx expo prebuild --clean --platform android` | ✅ Passou (exit `0`) | `withReleaseSigning`, `withGwpAsan` (`gwpAsanMode="always"`), `withOrientationFix` e `hermesEnabled=true` (Hermes padrão, sem Hermes V1) confirmados em `android/` |
| **Build Android Release** | `$env:JAVA_HOME='.../jdk-17'; cd android; .\gradlew.bat assembleRelease` | ✅ Passou (`BUILD SUCCESSFUL` em `23m 41s`) | Gradle `9.0.0`, `1485 actionable tasks: 1485 executed`, APK gerado em `android/app/build/outputs/apk/release/app-release.apk` (`215.967.054` bytes) |
| **Inspeção do APK (`aapt2`)** | `aapt2 dump badging android/app/build/outputs/apk/release/app-release.apk` | ✅ Passou | `package: name='br.com.pixeleucaristico.domus' versionCode='12' versionName='1.9.0' compileSdkVersion='36'`, `minSdkVersion:'24'`, `targetSdkVersion:'36'` |

---

## 5. Pendências Transferidas para a Story 8.2

> [!WARNING]
> **Não cortar release para o Google Play a partir da `dev` antes da conclusão da Story 8.2.** Enquanto os patches arquivados em `docs/patches-sdk-55-pendentes/` não forem reavaliados e decididos, builds gerados da `dev` no SDK 55 **não** contam com os ajustes anteriores de `expo-audio` (atributos de som/interrupção) nem de `react-native-keyboard-controller` (`cleanNullChildren()` em `EdgeToEdgeReactViewGroup.kt` para o Android 16).

- Decidir o destino final de cada um dos 3 patches arquivados em `docs/patches-sdk-55-pendentes/` (`expo-asset`, `expo-audio`, `react-native-keyboard-controller`) e reavaliar `rn-tourguide` e `react-native-gifted-chat`.
- Reavaliar a Tamagui (mantida em `^2.0.0-rc.26` nesta story).
- Validar manualmente o `expo-share-intent@6.1.1` no Android 16 (compartilhar URL da Amazon / Mercado Livre via intent `text/*` para abrir o `ShareToWishlistModal`).
- Instalar o APK release SDK 55 no `SM-X510` (Android 16), medir o pico de memória das 8 telas contra a linha de base de [docs/memoria-baseline-sdk-54.md](./memoria-baseline-sdk-54.md) (regra do teto de +20%) e validar manualmente os fluxos essenciais (abas, introduções, teclado/chat, câmera/OCR, backup/Drive e sync Nostr).
