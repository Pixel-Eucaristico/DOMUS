---
title: 'Story 8.3 + 8.5: Atualizar direto para o Expo SDK 57 e aplicar codemod do expo-router'
type: 'chore'
created: '2026-11-26'
status: 'done'
baseline_commit: 'b512513c6836f2b635a036edb3852b3714456af2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/memoria-baseline-sdk-54.md'
  - '{project-root}/docs/reavaliacao-sdk-55.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O DOMUS está validado no SDK 55 (`~55.0.32`). O guia oficial `expo-upgrade` desaconselha parar no SDK 56 (ou `expo@<=57.0.8`) pela regressão de memória do Hermes V1 com `react-native-worklets`/`reanimated`. Por aprovação explícita do dono em 26/11/2026, pulamos o salto do SDK 56 (Stories 8.3/8.4) indo direto para o **Expo SDK 57 (`>= 57.0.9`)**, consolidando os requisitos técnicos da Story 8.3.

**Approach:** Atualizar para **Expo SDK 57** (`npx expo install expo@^57 --fix`, `expo >= 57.0.9`, sem SDK 58 beta), aplicar o codemod `npx expo-codemod sdk-56-expo-router-react-navigation-replace` nos 2 imports de `@react-navigation/native`, confirmar ausência de `expo-sqlite` `copy()`/`move()`, validar compatibilidade do `fetch` global (Nostr/IA), registrar em `docs/migracao-sdk-57.md` qualquer patch que falhar e entregar `expo-doctor`, `eslint`/`expo lint`, `tsc`, `vitest`, `expo export --platform web` e build Android release (`targetSdkVersion=36`) verdes na `dev`.

## Boundaries & Constraints

**Always:**
- Garantir `expo >= 57.0.9` (`57.x` estável, nunca `58` beta) e manter o Hermes padrão do SDK 57.
- Eliminar 100% dos imports de `@react-navigation/*` (`OcrScanScreen.tsx` e `QrScanScreen.tsx`) via codemod oficial (ou `expo-router/react-navigation`), conferindo `@deprecated` na definição do `expo-router`.
- Sincronizar `package-lock.json` (`npm install`) mantendo `npm ci` verde.
- Documentar em `docs/migracao-sdk-57.md` cada patch que falhar no `patch-package` com erro exato, movendo patches bloqueantes para `docs/patches-sdk-57-pendentes/`.
- Trabalhar/commitar direto na `dev`; textos e docs em pt-BR com acentos.

**Never:**
- Não alterar `packages/sync`, `replit.*` nem editar manualmente `android/` ou `ios/`.
- Não antecipar Story 8.6 (validação em aparelho, medição de memória SDK 57, reavaliação final de Tamagui/patches) nem login Google (8.7–8.9).
- Não quebrar `withReleaseSigning`, `withGwpAsan`, `withOrientationFix` nem `targetSdkVersion: 36`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Upgrade 55 → 57 | `npx expo install expo@^57 --fix` | `expo >= 57.0.9`, `expo-*`, `react`, `react-native`, `babel-preset-expo`, `eslint-config-expo` e peer deps (`expo-share-intent`) alinhados; `expo-doctor` verde | Resolver `ERESOLVE`/hoisting (`expo-modules-core`) e registrar em `docs/migracao-sdk-57.md` |
| Codemod `expo-router` (8.3) | `OcrScanScreen.tsx:9` e `QrScanScreen.tsx:8` (`useIsFocused` de `@react-navigation/native`) | Reescritos para `expo-router/react-navigation` (0 imports `@react-navigation/*`), checando `@deprecated` em `expo-router` | Se codemod falhar no Windows, aplicar mapeamento oficial e documentar `@deprecated` |
| `fetch` global + `expo-sqlite` | Rede em Nostr/IA e eventual `copy()`/`move()` no SQLite | Suítes Nostr e IA passam em `vitest`; 0 usos de `expo-sqlite` `copy()`/`move()` confirmados | Adaptar tipos/chamadas quebradas preservando contratos |
| Patch ativo | `patches/react-native-gifted-chat+3.3.2.patch` | Aplica limpo no `postinstall` ou erro exato registrado em `docs/migracao-sdk-57.md` + arquivado em `docs/patches-sdk-57-pendentes/` | Atualizar `patches/__tests__/` apenas se a versão mudar |

</frozen-after-approval>

## Code Map

- `package.json` / `package-lock.json` -- Deps SDK 55 (`expo ~55.0.32`, `react-native 0.83.10`, `expo-router ~55.0.18`, `expo-share-intent 6.1.1`, `tamagui ^2.7.7`, `react-native-keyboard-controller 1.20.7`) e lockfile `npm ci`.
- `src/components/invoice/OcrScanScreen.tsx:9` e `QrScanScreen.tsx:8` -- Únicos 2 imports de `@react-navigation/native` (`useIsFocused`).
- `src/modules/nostrSync.ts`, `src/modules/ai/` + testes -- Consumidores de `fetch` validados no salto.
- `patches/react-native-gifted-chat+3.3.2.patch` e `patches/__tests__/giftedChatPatch.test.ts` -- Único patch ativo.
- `app.json`, `babel.config.js`, `metro.config.js`, `plugins/*` -- Preservar `targetSdkVersion=36`, `.wasm`, `withReleaseSigning`, `withGwpAsan`, `withOrientationFix`.
- `docs/migracao-sdk-57.md` -- Novo relatório de migração e pendências para Story 8.6.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` / `package-lock.json` -- Rodar `npx expo install expo@^57 --fix` (`expo >= 57.0.9`), alinhar `devDependencies`/peer deps (`expo-share-intent`) e sincronizar `package-lock.json` -- Sobe direto para SDK 57 compatível com `npm ci`.
- [x] `OcrScanScreen.tsx` / `QrScanScreen.tsx` -- Rodar `npx expo-codemod sdk-56-expo-router-react-navigation-replace` (ou mapeamento oficial), zerar `@react-navigation/*`, checar `@deprecated` em `useIsFocused` e confirmar 0 usos de `expo-sqlite` `copy()`/`move()` -- Cumpre requisitos técnicos da Story 8.3.
- [x] `patches/`, `app.json`, código/testes -- Checar `npx patch-package`, corrigir quebras diretas do SDK 57 em `expo-doctor`, `tsc --noEmit`, `eslint`/`expo lint`, `vitest` (Nostr/IA/teclado/patches) e `expo export --platform web` -- Garante todos os gates JS/web verdes.
- [x] `android/` e `docs/migracao-sdk-57.md` -- Rodar `expo config --type prebuild --json`, `npx expo prebuild --clean --platform android`, `.\gradlew.bat assembleRelease` (JDK 17), `aapt2 dump badging` (`targetSdkVersion=36`) e redigir `docs/migracao-sdk-57.md` -- Comprova build Android release verde e prepara Story 8.6.

**Acceptance Criteria:**
- Given SDK 55 na `dev`, when concluo upgrade direto para SDK 57 (`expo >= 57.0.9`, sem 58 beta) e codemod `expo-router`, then restam 0 imports `@react-navigation/*`, `npx expo-doctor` passa sem erros e `package-lock.json` está sincronizado.
- Given SDK 57, when rodo `npx eslint .`, `npx expo lint`, `npx tsc --noEmit` (sem `expo-env.d.ts`), `npx vitest run` e `npx expo export --platform web`, then todos passam (anotando apenas as 2 falhas Windows CRLF/UTC-3 pré-existentes se ocorrerem localmente).
- Given SDK 57, when rodo `expo prebuild --clean --platform android` e `assembleRelease`, then o APK release compila com `targetSdkVersion=36` e `docs/migracao-sdk-57.md` registra versões, codemod, status de patches e pendências para Story 8.6.

## Implementation Notes

- Upgrade direto para `expo@57.0.34` (`react@19.2.3`, `react-native@0.86.3`, `expo-router@57.0.32`, `expo-share-intent@8.0.1`, `react-native-keyboard-controller@1.21.9`, `react-native-reanimated@4.5.1`, `react-native-worklets@0.10.1`, `typescript@6.0.3`, `eslint-config-expo@57.0.2`), removendo dependência raiz não usada `zod-validation-error` (`^3.4.0`) que bloqueava `./v4` do `eslint-plugin-react-hooks@7.1.1`.
- Codemod `sdk-56-expo-router-react-navigation-replace` executado; ao confirmar `@deprecated` em `expo-router/react-navigation` para `useIsFocused`, migrado direto para `import { useIsFocused } from "expo-router"` em [OcrScanScreen.tsx](../../src/components/invoice/OcrScanScreen.tsx) e [QrScanScreen.tsx](../../src/components/invoice/QrScanScreen.tsx) (`0` imports `@react-navigation/*`, `0` usos de `expo-sqlite` `copy()`/`move()`).
- Corrigidas quebras diretas do SDK 57/RN 0.86/TS 6: `StyleSheet.absoluteFillObject` → `StyleSheet.absoluteFill` em 19 arquivos + novo patch [react-native-sprinkle-toast+1.0.1.patch](../../patches/react-native-sprinkle-toast+1.0.1.patch) ([sprinkleToastPatch.test.ts](../../patches/__tests__/sprinkleToastPatch.test.ts)), atualização de [react-native-gifted-chat+3.3.2.patch](../../patches/react-native-gifted-chat+3.3.2.patch), `app.json` (`ios.deploymentTarget: "16.4"` e plugin `expo-splash-screen`), remoção de `baseUrl` em `tsconfig.json`, 5 novas regras React Compiler em `eslint.config.js` e sentinela `1.21.9` em [keyboardScroll.test.ts](../../src/components/__tests__/keyboardScroll.test.ts).
- Relatório consolidado em [migracao-sdk-57.md](../../docs/migracao-sdk-57.md); `expo-doctor` (`21/21`), `eslint`, `expo lint`, `tsc`, `vitest`, `expo export --platform web`, `expo config --type prebuild --json`, `expo prebuild --clean --platform android` e `assembleRelease` (`targetSdkVersion='36'`) verdes.

## Spec Change Log

## Review Triage Log

- `ECH-1` (`patches/__tests__/sprinkleToastPatch.test.ts:17-23`): `low` → `patch` — `rawPatch` e `patchLf` são ambos LF no checkout Linux/CI, logo CRLF nunca era exercitado em `parsePatchFile`; construir `patchCrlf` explícito.
- `ECH-2` (`patches/__tests__/sprinkleToastPatch.test.ts:25-31`): `medium` → `patch` — Um único `toMatch(/^\+.*StyleSheet\.absoluteFill\b/m)` passa mesmo se 2 de 3 arquivos perderem a substituição; verificar por arquivo nos 3 hunks.
- `ECH-3` (`app.json:65-76`): `low` → `patch` — Ao migrar `"splash"` raiz para o plugin `expo-splash-screen` sem `imageWidth`, Android e iOS caem no default `100` (`getAndroidSplashConfig.js:10` / `getIosSplashConfig.js:11`); definir `"imageWidth": 200`.
- `BH-1` (`app.json:65-76`): `low` → `patch` — Mesma causa raiz de `ECH-3` (`imageWidth` omitido no plugin `expo-splash-screen`); adicionar `"imageWidth": 200` e documentar em `docs/migracao-sdk-57.md`.
- `BH-2` (`_bmad-output/implementation-artifacts/sprint-status.yaml:120-122`): `low` → `patch` — Conciliar status de `8-3`, `8-4` e `8-5` no encerramento (Step 5) refletindo o pulo aprovado 55 → 57.
- `BH-3` (`eslint.config.js:28-36`): `medium` → `defer` — As 199 violações de `eslint-plugin-react-hooks@7.1.1` (ex.: `app/ocr-settings.tsx:38`, `AppStateProvider.tsx:668`) são pré-existentes e fora do escopo do upgrade; manter `"off"` na Story 8.5 e registrar reabilitação gradual em `deferred-work.md`.
- `BH-4` (`app/(tabs)/_layout.tsx:2` e `runOnJS`): `low` → `defer` — `Tabs` de `"expo-router"` (`exports.d.ts:41-44`) e `runOnJS` de `"react-native-reanimated"` foram marcados `@deprecated`, porém seguem funcionais no SDK 57 (`runOnJS` tem guarda em `keyboardScroll.test.ts`); documentar em `docs/migracao-sdk-57.md` e diferir migração para `expo-router/js-tabs` e `scheduleOnRN`.
- `BH-5` (`package.json:102`, `docs/migracao-sdk-57.md`): `medium` → `patch` — Salto major `react-native-view-shot` `4.0.3` → `5.1.0` (TurboModule `NativeRNViewShot`) com fallback silencioso em `SurpriseTrophyCard.tsx` e `useSeasonData.ts` faltou na Seção 6 de `docs/migracao-sdk-57.md`; adicionar avaliação e item no checklist da Story 8.6.
- `BH-6` (`patches/__tests__/giftedChatPatch.test.ts:16-28`): `low` → `patch` — Rótulo ainda cita `SDK 55 / RN 0.83`, não verifica CRLF explícito, o hunk que remove `{/* @ts-expect-error */}` nem o pin exato `"3.3.2"` em `package.json`; atualizar teste.
- `BH-7` (`patches/__tests__/sprinkleToastPatch.test.ts:25-31`): `medium` → `patch` — Mesma causa raiz de `ECH-2`/`VG-1` (validação parcial dos 3 arquivos e falta de pin exato `"1.0.1"` em `package.json`); fortalecer teste.
- `BH-8` (`docs/migracao-sdk-57.md`, `expo-share-intent@8.0.1` iOS): `low` → `patch` — `withIosShareExtensionXcodeTarget.js` não define `IPHONEOS_DEPLOYMENT_TARGET` explicitamente e iOS não roda em Windows; registrar verificação de `ShareExtension` em `build-ios.yml` na Seção 6 de `docs/migracao-sdk-57.md`.
- `BH-9` (`AGENTS.md:35`, `docs/tour-crash-fixes.md:24`): `low` → `defer` — Instrução de contexto de agente ainda cita `absoluteFillObject` (removido no RN `0.86.3`); roteado para `defer` conforme política de arquivos de contexto (`AGENTS.md`).
- `BH-10` (`docs/migracao-sdk-57.md`): `low` → `patch` — Documentar nas Seções 3 e 6 que `react-native-sprinkle-toast` só monta `<ToastProvider>` em `app/_layout.tsx` (0 chamadas à API de toast — candidato a remoção na Story 8.6) e que `react-native-vision-camera@4.7.3` ainda referencia `absoluteFillObject` internamente (sem import no app).
- `VG-1` (`patches/__tests__/sprinkleToastPatch.test.ts`): `medium` → `patch` — Pre-verified gap: estender teste para validar todos os 3 hunks, os 3 arquivos instalados em `node_modules/react-native-sprinkle-toast/src/`, o pin exato `"1.0.1"` em `package.json` e `package-lock.json` e `patch-package` em `postinstall`.
- `VG-2` (`app.json` config SDK 57 sem teste em `vitest`/`gate.yml`): `medium` → `patch` — Pre-verified gap: adicionar teste puro Node em `plugins/__tests__/appConfigSdk57.test.ts` validando `app.json` com `validateConfig` de `expo-build-properties`, ausência de `expo.splash` raiz, `targetSdkVersion=36`, `ios.deploymentTarget>=16.4` e resolução de `getAndroidSplashConfig`/`getIosSplashConfig`.
- `VG-3` (`react-native-view-shot@5.1.0` `captureRef` sem teste nativo): `medium` → `defer` — Pre-verified gap: `RNViewShot` TurboModule/`findNodeHandle` não executam no Vitest (sem `react-native`); checklist da Story 8.6 atualizado em `docs/migracao-sdk-57.md` e diferido para validação em aparelho na Story 8.6.

## Design Notes

- **Pulo 55 → 57 aprovado (26/11/2026):** Segue `expo-upgrade` para evitar regressão de memória do Hermes V1 no SDK 56, consolidando 8.3 em 8.5 e mantendo validação em aparelho na 8.6.

## Verification

**Commands:**
- `npx expo-doctor` (0 erros)
- `npx eslint .` e `npx expo lint` (0 erros)
- `Remove-Item expo-env.d.ts -ErrorAction SilentlyContinue; npx tsc --noEmit` (exit 0)
- `npx vitest run` (0 falhas novas)
- `npx expo export --platform web` (exit 0)
- `npx expo config --type prebuild --json` (exit 0)
- `npx expo prebuild --clean --platform android` + `.\gradlew.bat assembleRelease` (JDK 17) + `aapt2 dump badging` (`targetSdkVersion:'36'`)
