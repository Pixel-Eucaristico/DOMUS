---
title: 'Story 8.6: Reavaliar patches e Tamagui no SDK 57 e validar fluxos e memória no Android 16'
type: 'chore'
created: '2026-11-26'
status: 'done'
baseline_commit: '34d3ab77f027bda13ca1370c16552af3e84fcfb0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/memoria-baseline-sdk-54.md'
  - '{project-root}/docs/reavaliacao-sdk-55.md'
  - '{project-root}/docs/migracao-sdk-57.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O DOMUS está compilando no Expo SDK 57 (`expo@57.0.34`, `react-native@0.86.3`, Hermes V1) com 2 patches ativos (`react-native-gifted-chat+3.3.2.patch` e `react-native-sprinkle-toast+1.0.1.patch`) e Tamagui `^2.7.7`, mas ainda falta fechar a reavaliação final de patches/Tamagui no SDK 57, comprovar no aparelho real Android 16 (`SM-X510`) que todos os fluxos FR-1 (incluindo `react-native-view-shot@5.1.0`, `expo-share-intent@8.0.1`, splash `imageWidth: 200` e câmera com `useIsFocused` de `expo-router`) operam sem regressão, e medir as 8 telas contra o teto de `+20%` sobre a baseline SDK 54.

**Approach:** Decidir formalmente cada patch ativo (`react-native-sprinkle-toast` — remover dependência sem uso + patch; `react-native-gifted-chat` — inspecionar `3.6.0` upstream e manter ou atualizar com justificativa) e `tamagui` (`^2.7.7` última `2.x` estável vs `3.x` major fora de escopo), recompilar o APK release final SDK 57 (`targetSdkVersion=36`), validar no `SM-X510` (Android 16) todos os fluxos FR-1 + novidades do SDK 57 e executar a coleta de memória nas 8 telas × 3 amostras (`dumpsys meminfo`), registrando decisões, evidências e comparativo completo em `docs/reavaliacao-sdk-57.md`.

## Boundaries & Constraints

**Always:**
- Registrar decisão e motivo técnico objetivo para cada patch em `patches/` e para a Tamagui em `docs/reavaliacao-sdk-57.md`.
- Se remover `react-native-sprinkle-toast`, remover também `patches/react-native-sprinkle-toast+1.0.1.patch`, `patches/__tests__/sprinkleToastPatch.test.ts`, `<ToastProvider>` em `app/_layout.tsx`, atualizar a guarda estrutural em `src/components/__tests__/keyboardScroll.test.ts` (preservando a invariante de `{children}` como primeiro filho sem banner antes) e sincronizar `package-lock.json`.
- Medir memória nas mesmas 8 telas × 3 amostras (intervalo de 3 s, `dumpsys meminfo br.com.pixeleucaristico.domus`) no `SM-X510` comparando com `docs/memoria-baseline-sdk-54.md` (teto `+20%` `TOTAL PSS` por tela e global `364.481 KB` / `355,9 MB`).
- Validar todos os fluxos FR-1 no `SM-X510` com `logcat` limpo (0 `FATAL EXCEPTION` / `Fatal signal` / `hiddenapi`), incluindo `captureRef` (`react-native-view-shot@5.1.0`), `expo-share-intent@8.0.1`, splash `imageWidth: 200`, câmera (`useIsFocused` de `expo-router`), teclado/IA, áudio e `BackHandler`.
- Trabalhar/commitar direto na `dev`; textos e docs em pt-BR com acentos.

**Never:**
- Não alterar `packages/sync`, `replit.*` nem editar manualmente `android/` ou `ios/`.
- Não migrar `tamagui` para `3.x` (salto major breaking) nem alterar o engine Hermes padrão do SDK 57.
- Não iniciar Stories 8.7–8.9 (login Google / Credential Manager) nem instalar `@tanstack/intent`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| `react-native-sprinkle-toast` sem uso | 0 chamadas à API de toast; apenas `<ToastProvider>` em `app/_layout.tsx:412` | Pacote, patch e teste removidos; `AppContainer` mantém `{children}` primeiro filho de `<ResponsiveLayoutProvider>` com guarda em `keyboardScroll.test.ts` | Sincronizar `package-lock.json` e validar `postinstall`/`tsc`/`eslint`/`vitest` |
| `react-native-gifted-chat` (`3.3.2` vs `3.6.0`) | Inspeção upstream de `<KeyboardProvider>` e tipos RN `0.86` | Decisão registrada (manter `3.3.2` + patch ou atualizar sem quebrar Story 13.5) com testes `giftedChatPatch.test.ts` + `keyboardScroll.test.ts` verdes | Se `3.6.0` mantiver `<KeyboardProvider>` aninhado ou quebrar sentinela, manter `3.3.2` |
| Tamagui (`^2.7.7` vs `3.3.3`) | `2.7.7` já é última `2.x` estável; `3.x` é major | Mantida em `^2.7.7` com motivo técnico e validação visual/funcional no SDK 57 (Android 16 + web) | Corrigir apenas eventual quebra visual/runtime no SDK 57 |
| Memória 8 telas + FR-1 no `SM-X510` | APK release final SDK 57 (`targetSdkVersion=36`) no Android 16 | 8/8 telas ≤ `+20%` `TOTAL PSS` vs SDK 54 (pico global ≤ `364.481 KB`); FR-1 + `captureRef` + `ACTION_SEND` + câmera + áudio + `logcat` 0 fatais | Se qualquer tela exceder `+20%` ou falhar FR-1, investigar e corrigir antes de encerrar |

</frozen-after-approval>

## Code Map

- `package.json` / `package-lock.json` -- Remover `react-native-sprinkle-toast`; manter `tamagui`/`@tamagui/*` `^2.7.7`; reavaliar `react-native-gifted-chat` (`3.3.2`).
- `app/_layout.tsx:61,411-416` -- Remover import e wrapper `<ToastProvider>`, mantendo `{children}` e `<Scanlines />` sob `<ResponsiveLayoutProvider>`.
- `src/components/__tests__/keyboardScroll.test.ts:1293,1326-1327,2565-2568,2619` -- Atualizar guarda `rootNavViolations` de `ToastProvider` para `ResponsiveLayoutProvider` preservando a invariante R4.
- `patches/react-native-sprinkle-toast+1.0.1.patch` e `patches/__tests__/sprinkleToastPatch.test.ts` -- Remover se `react-native-sprinkle-toast` for removido.
- `patches/react-native-gifted-chat+3.3.2.patch` e `patches/__tests__/giftedChatPatch.test.ts` -- Patch ativo a reavaliar.
- `docs/reavaliacao-sdk-57.md` -- Novo relatório final da Story 8.6 (decisões de patches/Tamagui, evidências FR-1, tabela comparativa de memória SDK 54 vs 55 vs 57 e gates automatizados).

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `app/_layout.tsx`, `patches/`, `keyboardScroll.test.ts` -- Reavaliar os 2 patches (`react-native-sprinkle-toast` remoção limpa; `react-native-gifted-chat` checar `3.6.0` upstream e decidir) e `tamagui@^2.7.7`, sincronizando `package-lock.json` e rodando `expo-doctor`, `eslint`, `expo lint`, `tsc`, `vitest` e `expo export --platform web` -- Reduz patches ao mínimo indispensável com todos os gates JS/web verdes.
- [x] `android/` (`prebuild` + `assembleRelease`) -- Gerar APK release final do SDK 57 (`targetSdkVersion=36` via `aapt2 dump badging`) e instalar no `SM-X510` (`RX2X101N87Y`) -- Garante que a validação em aparelho rode sobre o binário final pós-reavaliação.
- [x] `SM-X510` (Android 16) -- Validar todos os fluxos FR-1 (abas retrato/paisagem, `ScreenIntroModal`, `BackHandler` em `Holerites`, `DOMUS IA` + teclado `1.21.9`, câmera/QR com `useIsFocused` de `expo-router`, compartilhamento `captureRef` em `Temporada`/troféu com `react-native-view-shot@5.1.0`, `Backup & Restauração`, `Sincronizar`, `expo-share-intent@8.0.1`, splash `imageWidth: 200`, `dumpsys audio` e `logcat` 0 fatais) -- Comprova ausência de regressão funcional no Android 16.
- [x] `SM-X510` + `docs/reavaliacao-sdk-57.md` -- Medir memória (`dumpsys meminfo`, 8 telas × 3 amostras, intervalo 3 s) comparando contra `docs/memoria-baseline-sdk-54.md` (teto `+20%`) e consolidar `docs/reavaliacao-sdk-57.md` -- Entrega evidência completa de memória, patches, Tamagui e FR-1 no SDK 57.

**Acceptance Criteria:**
- Given o SDK 57 na `dev`, when concluo a reavaliação de patches e Tamagui, then cada patch e a Tamagui têm decisão e motivo registrados em `docs/reavaliacao-sdk-57.md` e `expo-doctor`, `eslint`, `expo lint`, `tsc`, `vitest` e `expo export --platform web` passam sem novas falhas.
- Given o APK release final SDK 57 instalado no `SM-X510` (Android 16), when executo todos os fluxos FR-1 + novidades do SDK 57 (`captureRef`, `ACTION_SEND`, câmera, splash, áudio), then todos funcionam sem crash, sem erro fatal/`hiddenapi` no `logcat` e com `targetSdkVersion=36`.
- Given a medição de memória das 8 telas × 3 amostras no `SM-X510`, when comparo com `docs/memoria-baseline-sdk-54.md`, then todas as 8 telas e o pico global ficam ≤ `+20%` em `TOTAL PSS` e as leituras brutas estão registradas em `docs/reavaliacao-sdk-57.md`.

## Implementation Notes

- `react-native-sprinkle-toast@1.0.1` removido de `package.json`/`package-lock.json`, junto com `patches/react-native-sprinkle-toast+1.0.1.patch`, `patches/__tests__/sprinkleToastPatch.test.ts` e `<ToastProvider>` em `app/_layout.tsx`; guarda R4 em `src/components/__tests__/keyboardScroll.test.ts` atualizada para `ResponsiveLayoutProvider`.
- `react-native-gifted-chat` mantido em `3.3.2` + `patches/react-native-gifted-chat+3.3.2.patch` após inspeção upstream da `3.6.0` (que ainda monta `<KeyboardProvider>` por padrão, remove `src/` em favor de `lib/` ESM quebrando a sentinela da Story 13.5, entrou em modo de manutenção apontando para `@kesha-antonov/react-native-chat` e mira RN `0.88.1` / `gesture-handler ~3.3.0`).
- `tamagui` / `@tamagui/*` mantido em `^2.7.7` (última `2.x` estável no npm; `3.x` é major fora do escopo), validado sem regressões no SDK 57 (web + Android 16).
- APK release final (`229.676.206` bytes, `targetSdkVersion='36'`) validado no `SM-X510` (Android 16): todos os fluxos FR-1 + `captureRef` (`react-native-view-shot@5.1.0`), `expo-share-intent@8.0.1`, splash `imageWidth: 200`, câmera (`useIsFocused` de `expo-router`), `dumpsys audio` (0 foco roubado) e `logcat` (0 fatais/`hiddenapi` do DOMUS) passaram; memória 8/8 telas ≤ `+20%` (`-5,09%` a `+5,63%`; pico global `316.958 KB` / `309,5 MB` = `+4,35%` vs baseline SDK 54). Evidências consolidadas em `docs/reavaliacao-sdk-57.md`.

## Spec Change Log

## Review Triage Log

- `BH-1` (`docs/reavaliacao-sdk-57.md`, Seção 4.1 "Comportamento do Hermes V1"): `low` → `patch` — Conversões para MB usaram divisão por `1.000` em vez de `1.024` (`34,7 MB vs 67,5 MB`, `78,0–107,7 MB vs 59,3–84,9 MB`, `73,0–78,9 MB vs 89,3–95,1 MB`); corrigir para manter coerência com `1 MB = 1.024 KB`.
- `BH-2` (`docs/reavaliacao-sdk-57.md`, Seção 3, linhas 4, 7, 8 e 9): `low` → `patch` — Qualificar explicitamente que `Backup & Restauração`/`Drive` e `Sync Nostr` foram *smoke* de UI no aparelho (sem round-trip de rede ao vivo por ausência de par/chaves configuradas no tablet; `fetch` global exercitado ao vivo na Amazon via `ACTION_SEND` e em suítes Vitest para Nostr/IA).
- `BH-3` (`docs/reavaliacao-sdk-57.md` Seção 1 e `package.json`/`app.json` — `react-native-vision-camera@4.7.3`): `low` → `defer` — Dependência nativa pré-existente sem patch em `patches/` e fora do escopo congelado; registrar decisão explícita de manter sem alteração na Story 8.6 e diferir avaliação de remoção para `deferred-work.md`.
- `BH-4` (`docs/reavaliacao-sdk-57.md` Seções 1 e 3 — `react-native-google-mobile-ads` e `@react-native-firebase/*`): `low` → `defer` — Desalinhamento pré-existente de range (`@react-native-firebase/app: "^23.8.6"` vs `^23.8.8` nos demais) roteado para `defer`; registrar em `docs/reavaliacao-sdk-57.md` que Ads e Firebase compilaram e executaram no APK SDK 57 com 0 erros no `logcat`.
- `BH-5` (`docs/reavaliacao-sdk-57.md`, Seção 5): `low` → `patch` — Preservar explicitamente a pendência de `build-ios.yml` transferida da Story 8.5 (`ShareExtension` de `expo-share-intent@8.0.1` alinhando `IPHONEOS_DEPLOYMENT_TARGET` com `ios.deploymentTarget: "16.4"` no runner macOS).
- `BH-6` (`docs/reavaliacao-sdk-57.md`, Seção 1, item 2): `low` → `patch` — Corrigir `"patch mínimo de 3 hunks"` para `"patch mínimo em 3 arquivos (7 hunks)"` (`index.tsx`: 3, `types.ts`: 2, `GiftedChatContext.ts`: 2).
- `BH-7` (`src/components/__tests__/keyboardScroll.test.ts:1326`): `low` → `patch` — Flexibilizar a regex para `/<\s*ResponsiveLayoutProvider\b[^>]*>([\s\S]*?)\{\s*children\s*\}/` evitando falso positivo caso `ResponsiveLayoutProvider` receba props no futuro (wrappers externos são pré-existentes e fora do escopo).
- `BH-8` (`patches/__tests__/giftedChatPatch.test.ts`): `low` → `patch` — Adicionar guarda confirmando que `patches/` contém exatamente 1 arquivo `.patch` aprovado (`react-native-gifted-chat+3.3.2.patch`), `package-lock.json` fixa `3.3.2`, `postinstall` executa `patch-package` e o `GiftedChatContext.ts` instalado aplica `ColorSchemeName | null | undefined`.
- `BH-9` (`_bmad-output/implementation-artifacts/sprint-status.yaml:123` e `ROADMAP.md:292`): `low` → `patch` — Atualizar `8-6` para `review` no Step 5 e atualizar a nota desatualizada sobre `react-native-sprinkle-toast` em `ROADMAP.md:292`.

## Design Notes

- **Foco na Story 8.6:** `react-native-sprinkle-toast` tem 0 usos da API de toast (só `<ToastProvider>`), permitindo eliminar 1 dependência e 1 patch; `tamagui` já está na última `2.x` estável (`2.7.7`).

## Verification

**Commands:**
- `npx expo-doctor` (0 erros)
- `npx eslint .` e `npx expo lint` (0 erros)
- `Remove-Item expo-env.d.ts -ErrorAction SilentlyContinue; npx tsc --noEmit` (exit 0)
- `npx vitest run` (0 falhas novas)
- `npx expo export --platform web` (exit 0)
- `npx expo prebuild --clean --platform android` + `.\gradlew.bat assembleRelease --max-workers=2` + `aapt2 dump badging` (`targetSdkVersion:'36'`)
- `adb -s RX2X101N87Y` — FR-1 + `dumpsys audio` + `logcat` + `dumpsys meminfo` (8 telas × 3 amostras, ≤ `+20%` vs SDK 54)
