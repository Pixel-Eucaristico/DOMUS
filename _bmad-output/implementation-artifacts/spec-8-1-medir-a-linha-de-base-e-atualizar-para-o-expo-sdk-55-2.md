---
title: 'Story 8.1: Medir a linha de base e atualizar para o Expo SDK 55'
type: 'chore'
created: '2026-11-25'
status: 'done'
baseline_commit: 'f06162f61a02d3dea678b281907b1347ca3b41cc'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O DOMUS está no Expo SDK 54 (`~54.0.37` / React Native `0.81.5`) sem linha de base formal de memória no Android 16. Subir o SDK sem registrar o consumo atual impede detectar regressões acima de +20% e isola mal falhas de patches e módulos nativos.

**Approach:** Medir o pico de memória do build release SDK 54 nas telas principais no Samsung Galaxy Tab S9 FE (`SM-X510`, Android 16) em `docs/memoria-baseline-sdk-54.md`, atualizar para o Expo SDK 55 via `npx expo install expo@^55 --fix`, corrigir quebras diretas do SDK 55, documentar os patches que falharem para a Story 8.2 e validar `expo-doctor`, `vitest`, `expo lint`, `tsc` e build Android release na branch `dev`.

## Boundaries & Constraints

**Always:**
- Medir e gravar a linha de base SDK 54 no Android 16 **antes** de alterar qualquer dependência.
- Manter o engine Hermes padrão do SDK 55 (sem opt-in em Hermes V1).
- Sincronizar `package-lock.json` após mudanças de pacotes (`npm install --package-lock-only --ignore-scripts` ou `npm`) para manter `npm ci` verde na CI.
- Registrar em `docs/migracao-sdk-55.md` cada patch que falhar no `patch-package` com o erro exato, preservando seu diff para a Story 8.2.
- Trabalhar e commitar direto na branch `dev`; textos e docs em pt-BR com acentos completos.

**Never:**
- Não alterar `packages/sync`, `replit.*` nem editar manualmente `android/` ou `ios/` (apenas `plugins/`, `patches/` ou `npx expo prebuild --clean`).
- Não antecipar escopo da Story 8.2 (não trocar Tamagui `2.0.0-rc.26` nem decidir o mérito final dos patches além de destravar `postinstall`/build).
- Não antecipar SDK 56/57 nem login do Google (Stories 8.3–8.9), nem quebrar `withReleaseSigning` ou `targetSdkVersion: 36`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Baseline SDK 54 | APK release SDK 54 no `SM-X510` (Android 16) | `dumpsys meminfo br.com.pixeleucaristico.domus` (`TOTAL PSS`, `TOTAL RSS`, heaps e `Graphics`) nas 4 abas + fluxos pesados salvo em `docs/memoria-baseline-sdk-54.md` | Se APK ausente/desatualizado, compilar/instalar no commit base antes do upgrade |
| Upgrade SDK 55 | `npx expo install expo@^55 --fix` | Pacotes Expo, RN, React, `babel-preset-expo` e peer deps alinhados ao SDK 55 com `npx expo-doctor` verde | Resolver conflitos de peer/nativos compatíveis e registrar em `docs/migracao-sdk-55.md` |
| Patch incompatível | `npx patch-package` após SDK 55 | Erro exato e versão antiga/nova registrados em `docs/migracao-sdk-55.md` | Patch que quebre `postinstall` é movido para `docs/patches-sdk-55-pendentes/` para reavaliação na Story 8.2 |
| Quebra `NativeTabs` | `app/(tabs)/_layout.tsx` com `Icon`/`Label` de `expo-router/unstable-native-tabs` | Migrado para `<NativeTabs.Trigger.Icon>` e `<NativeTabs.Trigger.Label>` sem erro de lint/tipo | Ajustar props adicionais se `expo-router` SDK 55 exigir, preservando comportamento |

</frozen-after-approval>

## Code Map

- `package.json` / `package-lock.json` -- Dependências SDK 54 (`expo: ~54.0.37`, `react-native: 0.81.5`, `expo-router: ~6.0.24`, `babel-preset-expo: ^54.0.12`, `postinstall: patch-package`) e lockfile do `npm ci`.
- `app.json` -- Config Expo (`newArchEnabled: true`, `expo-build-properties` API 24/36, `reactCompiler: true`, plugins).
- `babel.config.js` / `metro.config.js` -- `unstable_transformImportMeta: true` e extensão `.wasm`; preservar `.wasm`.
- `app/(tabs)/_layout.tsx` (L3, L12–33) -- `NativeTabs`, `Icon`, `Label` de `expo-router/unstable-native-tabs` (migrar para `NativeTabs.Trigger.*`).
- `patches/` -- 5 patches atuais: `expo-asset+12.0.13.patch` (TODO de remoção no SDK 55), `expo-audio+1.1.1.patch`, `react-native-gifted-chat+3.3.2.patch`, `react-native-keyboard-controller+1.18.5.patch`, `rn-tourguide+3.3.2.patch`.
- `patches/__tests__/keyboardControllerPatch.test.ts` -- Valida o patch de `react-native-keyboard-controller`; só ajustar se o pacote mudar de versão no SDK 55.
- `plugins/withGwpAsan.js`, `withOrientationFix.js`, `withReleaseSigning.js` -- Config plugins do `prebuild`; manter intactos salvo quebra direta no SDK 55.
- `docs/memoria-baseline-sdk-54.md` / `docs/migracao-sdk-55.md` -- Novos registros de linha de base e migração/patches.

## Tasks & Acceptance

**Execution:**
- [x] `docs/memoria-baseline-sdk-54.md` -- Coletar via ADB (`dumpsys meminfo`) no `SM-X510` (release SDK 54) 3 leituras por tela em `Início`, `Contas`, `Desejos`, `Temporada`, `DOMUS IA`, `Backup & Restauração`, `Sincronizar` e `Importar NF / Câmera`, gravando picos e metodologia -- Define referência para o teto de +20% (Stories 8.2/8.4).
- [x] `package.json` e `package-lock.json` -- Rodar `npx expo install expo@^55 --fix`, alinhar `devDependencies` (`babel-preset-expo`, `eslint-config-expo`, `@types/react`) e atualizar `package-lock.json` -- Sobe o projeto ao SDK 55 compatível com `npm ci`.
- [x] `patches/` e `docs/migracao-sdk-55.md` -- Rodar `npx patch-package`, registrar erro exato de cada um dos 5 patches que falhar, mover patches bloqueantes para `docs/patches-sdk-55-pendentes/` (mantendo diffs intactos) e documentar em `docs/migracao-sdk-55.md` -- Destrava `postinstall` e entrega insumo completo para a Story 8.2.
- [x] `app/(tabs)/_layout.tsx` e `app.json` -- Migrar `NativeTabs` para `NativeTabs.Trigger.*` e corrigir quebras diretas de `expo-doctor`, `tsc` e `expo lint` -- Garante diagnóstico, tipos e lint limpos no SDK 55.
- [x] `android/` (via `npx expo prebuild --clean --platform android`) e `docs/migracao-sdk-55.md` -- Gerar Android limpo, rodar `gradlew.bat assembleRelease` (JDK 17), validar `targetSdkVersion=36` com `aapt2 dump badging` e consolidar evidências finais em `docs/migracao-sdk-55.md` -- Comprova build Android release verde no SDK 55.

**Acceptance Criteria:**
- Given o SDK 54 verde na `dev`, when concluo o upgrade para o SDK 55 após medir a linha de base no `SM-X510`, then `docs/memoria-baseline-sdk-54.md` existe com picos reproduzíveis por tela e `npx expo-doctor` retorna 0 erros.
- Given o projeto no SDK 55, when rodo `npx vitest run`, `npx expo lint` e `npx tsc --noEmit` (sem `expo-env.d.ts`), then terminam sem falhas novas (anotando as 2 falhas Windows CRLF/TZ já conhecidas se ocorrerem localmente).
- Given o projeto no SDK 55, when executo `npx expo prebuild --clean --platform android` e `assembleRelease`, then o build Android release termina verde com `targetSdkVersion=36` e os patches que não aplicaram estão listados com seus erros em `docs/migracao-sdk-55.md`.

## Implementation Notes

- **Baseline SDK 54 (`SM-X510`, Android 16):** coletado em [memoria-baseline-sdk-54.md](../../docs/memoria-baseline-sdk-54.md) antes do upgrade; pico global `303.734 KB` (`296,6 MB` `TOTAL PSS` em `DOMUS IA`), teto global +20% `364.481 KB` (`355,9 MB`).
- **Upgrade SDK 55:** `expo` `~55.0.32`, `react` `19.2.0`, `react-native` `0.83.10`, `expo-router` `~55.0.18`, `expo-share-intent` `6.1.1` (conflito `ERESOLVE` com `5.1.1`), `react-native-keyboard-controller` `1.20.7`; `expo-modules-core@55.0.27` elevado na raiz via `npm install` para resolver `TS2339` em `expo-notifications`.
- **Patches:** 3 patches incompatíveis arquivados intactos em `docs/patches-sdk-55-pendentes/` com erros registrados em [migracao-sdk-55.md](../../docs/migracao-sdk-55.md); `react-native-gifted-chat+3.3.2.patch` recebeu ajuste de tipo `getColorScheme(): ColorSchemeName | undefined` para RN `0.83.10`; testes `patches/__tests__/keyboardControllerPatch.test.ts` e `src/components/__tests__/keyboardScroll.test.ts` atualizados para `1.20.7`.
- **Verificações:** `expo-doctor` `20/20`, `expo lint` `0` erros, `tsc --noEmit` `0` erros, `vitest` `3220/3222` (apenas 2 falhas Windows CRLF/UTC-3 pré-existentes), `expo prebuild --clean --platform android` + `assembleRelease` (`BUILD SUCCESSFUL`, `targetSdkVersion='36'`).

## Spec Change Log

## Review Triage Log

| ID | Camada | Local / Assunto | Veredito | Rota | Evidência |
|---|---|---|---|---|---|
| BH-1 | blind-hunter | `package.json` (`babel-plugin-react-compiler` beta) | `medium` | `patch` | Confirmado: `babel-preset-expo@55.0.25` já declara `babel-plugin-react-compiler: ^1.0.0`, tornando o pin beta de jan/2025 em `devDependencies` redundante e fonte de skew com React `19.2.0`. |
| BH-2 | blind-hunter | `patches/__tests__/keyboardControllerPatch.test.ts` (guarda `1.18.5`) | `medium` | `patch` + `defer` | Confirmado: o bloco `if (installedVersion === "1.18.5")` é código morto com `1.20.7` instalado; ajustar o teste para explicitar o estado pendente de `1.20.7` (Story 8.1) e diferir restauração/decisão do patch para a Story 8.2. |
| BH-3 | blind-hunter | Regressões em `dev` por arquivar patches `expo-audio` e `keyboard-controller` | `medium` | `patch` (doc) + `defer` | Confirmado: ambos foram arquivados por desenho da Story 8.1 (decisão de mérito excluída pela intent congelada para a Story 8.2); adicionar aviso explícito em `docs/migracao-sdk-55.md` para não cortar release Play antes da Story 8.2 e registrar em `deferred-work.md`. |
| BH-4 | blind-hunter | `patches/react-native-gifted-chat+3.3.2.patch` (import de valor `ColorSchemeName`) | `high` | `patch` | Confirmado: `GiftedChatContext.ts` não importava `react-native` em runtime; trocar para `import type { ColorSchemeName } from 'react-native'` (evita import runtime/ESM/Vitest) e cobrir o hunk no teste do patch. |
| BH-5 | blind-hunter | Hoisting frágil de `expo-modules-core` sob `pnpm` | `medium` | `patch` | Confirmado: `AGENTS.md` usa `pnpm` localmente e o repo não tinha `.npmrc` com hoisting para `expo-modules-core`; adicionar `.npmrc` com `public-hoist-pattern[]=expo-modules-core` torna o fix determinístico em `pnpm` e `npm`. |
| BH-6 | blind-hunter | Alinhamento de `package.json` com `bundledNativeModules.json` | `low` | `patch` | Confirmado: `lottie-react-native` (`~7.3.4`), `react-native-safe-area-context` (`~5.6.2`), `react-native-web` (`~0.21.0`) e `react-native-view-shot` (`4.0.3`) tinham faixas mais antigas/amplas em `package.json`. |
| BH-7 | blind-hunter | Sentinela `CHAT_SENTINEL_VERSIONS` (`1.20.7`) em `keyboardScroll.test.ts` | `low` | `defer` | Confirmado: atualizar a sentinela foi necessário para manter `vitest` verde na Story 8.1 após conferência estática da fórmula; validação em aparelho Android 16 está explicitamente atribuída à Story 8.2. |
| BH-8 | blind-hunter | Paridade de verificação com CI (`eslint .`, `expo export --platform web`, prebuild iOS) | `medium` | `patch` | Confirmado: `npx eslint .` (`0` erros) e `npx expo export --platform web` (`exit 0`, 3633 módulos) já validados; rodar `expo prebuild --platform ios --clean --no-install` (limpando `ios/` depois) e registrar todas as evidências em `docs/migracao-sdk-55.md`. |
| BH-9 | blind-hunter | Verificação e handoff de `expo-share-intent` (`5.1.1 → 6.1.1`) | `low` | `patch` | Confirmado: `AndroidManifest.xml:49-53` gerou `ACTION_SEND`/`text/*` e `app/_layout.tsx:244` compila com `0` erros, mas faltava registrar essa checagem e incluir `expo-share-intent` na Seção 5 de `docs/migracao-sdk-55.md`. |
| BH-10 | blind-hunter | Reprodutibilidade/agregação em `docs/memoria-baseline-sdk-54.md` | `low` | `patch` | Confirmado: sequência de sessão e dataset já constam na Seção 1, mas faltava explicitar a regra de máximo independente por coluna na Seção 2 e esclarecer na Seção 4 que a medição de câmera cobriu o caminho `QR Code` (`expo-camera`), não OCR ML Kit. |
| BH-11 | blind-hunter | `sprint-status.yaml`, spec antiga `blocked` e `AGENTS.md` | `low` / `false` | `defer` (`AGENTS.md`) | `false` para `sprint-status.yaml` (atualizado no step-05) e spec `-2.md` (regra explícita do step-01); `low` → `defer` para atualizar `AGENTS.md` (arquivo de contexto de agente, conforme regra de triagem). |
| EC-1 | edge-case-hunter | `patches/__tests__/keyboardControllerPatch.test.ts:50-56` (skip silencioso) | `medium` | `patch` + `defer` | Mesma causa raiz de BH-2/VG-1: remover o bloco morto `if (installedVersion === "1.18.5")` em favor de asserção explícita do estado `1.20.7` pendente da Story 8.2. |
| EC-2 | edge-case-hunter | `patches/react-native-gifted-chat+3.3.2.patch:60-78` (`null` removido de `getColorScheme`) | `high` | `patch` | Confirmado em `Appearance.d.ts`: no RN `0.83.10`, `ColorSchemeName = 'light' | 'dark' | 'unspecified'` (sem `null`), enquanto `Appearance.getColorScheme()` retorna `ColorSchemeName | null | undefined`; corrigir assinatura no patch. |
| EC-3 | edge-case-hunter | Remoção de `patches/expo-audio+1.1.1.patch` (foco de áudio Android) | `medium` | `defer` | Mesma causa raiz de BH-3/VG-2: regressão conhecida e reservada à Story 8.2 pela intent congelada; registrada em `deferred-work.md` e destacada em `docs/migracao-sdk-55.md`. |
| EC-4 | edge-case-hunter | Remoção de `patches/react-native-keyboard-controller+1.18.5.patch` (`cleanNullChildren`) | `medium` | `defer` | Mesma causa raiz de BH-3/VG-1: proteção removida temporariamente até validação em Android 16 na Story 8.2; registrada em `deferred-work.md` e destacada em `docs/migracao-sdk-55.md`. |
| VG-1 | verification-gap | Proteção `cleanNullChildren` ausente com teste verde em `keyboardControllerPatch.test.ts` | `medium` | `patch` + `defer` | Pré-verificado (`disposition: defer`): corrigir o guard morto no teste agora (`patch`) e deferir a reavaliação/porte do patch no Android 16 para a Story 8.2 (`defer`). |
| VG-2 | verification-gap | Regressão de foco de áudio em `SoundManager` sem teste após arquivar `expo-audio` patch | `medium` | `defer` | Pré-verificado (`disposition: defer`): Story 8.2 decide entre recriar o patch `expo-audio@55.0.18` ou configurar `setAudioModeAsync({ interruptionMode: "mixWithOthers" })` em `SoundManager.ts` com teste automatizado. |

## Design Notes

- **Escopo 54 → 55:** Mantém saltos incrementais do Epic 8 com Hermes padrão do SDK 55 (sem Hermes V1); eventual decisão sobre SDK 56 fica para a Story 8.3.
- **Patches bloqueantes:** Arquivar em `docs/patches-sdk-55-pendentes/` mantém `npm ci` e o release build verdes sem perder o diff nem antecipar o mérito da Story 8.2.

## Verification

**Commands:**
- `npx expo-doctor` -- expected: 0 erros.
- `npx expo lint` -- expected: 0 erros.
- `npx vitest run` -- expected: 0 falhas novas.
- `Remove-Item expo-env.d.ts -ErrorAction SilentlyContinue; npx tsc --noEmit` -- expected: exit 0.
- `npx expo prebuild --clean --platform android` + `.\gradlew.bat assembleRelease` (JDK 17) + `aapt2 dump badging` -- expected: `BUILD SUCCESSFUL` e `targetSdkVersion:'36'`.
