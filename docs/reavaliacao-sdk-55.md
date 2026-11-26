# Reavaliação de Patches, Tamagui e Validação no Expo SDK 55 (Story 8.2)

**Story:** 8.2 — Reavaliar patches e Tamagui no SDK 55 e validar os fluxos  
**Data:** 25/11/2026  
**Commit base (Story 8.1):** `ac90617dbe8c60145b8c15783f973d76a3a7345f` (branch `dev`)  
**Referências:** [docs/memoria-baseline-sdk-54.md](./memoria-baseline-sdk-54.md) · [docs/migracao-sdk-55.md](./migracao-sdk-55.md)  
**Plataforma validada:** Expo SDK `~55.0.32` · React Native `0.83.10` · React `19.2.0` · Hermes padrão (`hermesEnabled=true`, sem Hermes V1) · Tamagui `^2.7.7` (estável)  
**Artefato medido:** `android/app/build/outputs/apk/release/app-release.apk` (`versionName=1.9.0`, `versionCode=12`, `minSdkVersion=24`, `compileSdkVersion=36`, `targetSdkVersion=36`, `216.078.546` bytes)  
**Aparelho validado:** Samsung Galaxy Tab S9 FE (`SM-X510`, serial `RX2X101N87Y`, Android 16 / API 36)

---

## 1. Decisão Final dos 5 Patches (`patches/`)

A pasta temporária `docs/patches-sdk-55-pendentes/` criada na Story 8.1 foi totalmente esvaziada e removida; restou apenas **1 patch ativo** em `patches/` (`react-native-gifted-chat+3.3.2.patch`).

| # | Pacote / Patch original | Decisão | Motivo técnico objetivo |
|---|---|---|---|
| 1 | `expo-asset+12.0.13.patch` (`12.0.13` → `55.0.20`) | **Removido** | O PR `expo/expo#42184` (esquema `https://` derivado de `manifestBaseUrl` em `AssetSources.js`) já foi incorporado upstream em `expo-asset@55.0.20`. |
| 2 | `rn-tourguide+3.3.2.patch` + dependência `rn-tourguide` | **Removido** | `git grep` em `app/`, `src/`, `packages/`, `scripts/` e `plugins/` confirmou **0 imports** no projeto (o tour foi substituído por `ScreenIntroModal`). Pacote e patch removidos sem impacto. |
| 3 | `expo-audio+1.1.1.patch` (`1.1.1` → `55.0.18`) | **Removido (substituído por API oficial)** | Em `expo-audio@55.0.18`, `AudioPlayer.kt` mantém `AudioAttributes.DEFAULT` com `handleAudioFocus = false` (descartando a classificação legada `USAGE_ASSISTANCE_SONIFICATION`, aceitável para os efeitos curtos de UI), e `AudioModule.requestAudioFocus()` faz early-return quando `interruptionMode == MIX_WITH_OTHERS`. `SoundManager.init()` chama `setAudioModeAsync({ interruptionMode: "mixWithOthers" })` (com deduplicação de `init()`, guarda de `unload()` e retry no `play()` se `init()` falhar), e os callers de voz (`voiceRecorderLifecycle.ts` / `useVoiceRecorder.ts`, `VoiceOutputService.ts`, `app/ai-chat.tsx`) preservam/restauram `"mixWithOthers"` inclusive em erro e desmontagem. Coberto por testes comportamentais em `src/services/__tests__/soundManager.test.ts` e confirmado no `SM-X510` via `dumpsys audio`. |
| 4 | `react-native-keyboard-controller+1.18.5.patch` (`1.18.5` → `1.20.7`) | **Removido (evidência no Android 16)** | Ao portar e testar `cleanNullChildren()` no `SM-X510` (Android 16 / `targetSdkVersion=36`), o `logcat` revelou que o Android 16 **bloqueia via `hiddenapi`** o acesso por reflection a `ViewGroup.mChildren` (`api=max-target-p`, `denied`), tornando `cleanNullChildren()` um no-op silencioso que gerava erro `E hiddenapi` no `logcat`. Na `1.20.7`, `EdgeToEdgeReactViewGroup.kt` já preserva `Handler(Looper.getMainLooper()).post { view.removeSelf() }` upstream (protegido por teste em `src/components/__tests__/keyboardScroll.test.ts`); removendo o patch, todos os fluxos de teclado, rotação, modais, `BackHandler` e Voltar na `Início` rodaram no `SM-X510` com **0 crashes e 0 linhas `hiddenapi`/`FATAL` no `logcat`**. |
| 5 | `react-native-gifted-chat+3.3.2.patch` (`3.3.2`) | **Mantido e atualizado** | Necessário por dois motivos ativos: (1) remove o `<KeyboardProvider>` aninhado do `GiftedChatWrapper` (Story 13.5 — sistema único de teclado na raiz) e (2) corrige a assinatura de `GiftedChatContext.ts` (`import type { ColorSchemeName } from 'react-native'` e `getColorScheme(): ColorSchemeName \| null \| undefined`) para compatibilidade com RN `0.83.10`. Coberto por `patches/__tests__/giftedChatPatch.test.ts` e `src/components/__tests__/keyboardScroll.test.ts`. |

---

## 2. Reavaliação da Tamagui (`^2.0.0-rc.26` → `^2.7.7` estável)

- **Decisão:** **Atualizada para versão estável `^2.7.7`** (`tamagui`, `@tamagui/core` e `@tamagui/config`), mantendo a linha `2.x` e `@tamagui/config/v5` (sem salto breaking para `3.x`).
- **Ajuste necessário:** em `src/components/tamagui/TButton.tsx`, movida a anotação `@ts-expect-error` de `fontFamily` (agora tipado corretamente em `2.7.7`) para `borderRadius` (`@tamagui/config/v5` define `onlyAllowShorthands: true` para `'rounded'`, mantendo `borderRadius` válido em runtime).
- **Validação:** `tsc --noEmit` (0 erros), `eslint` / `expo lint` (0 erros), `vitest` (0 falhas novas), `expo export --platform web` (exit 0), `assembleRelease` Android verde e inspeção visual no `SM-X510` nas abas e modais (`Início`, `Contas`, `Desejos`, `Temporada`, `DOMUS IA`, `Sincronizar`, `Configurações`, `Backup & Restauração`, `Importar NF`, `Nova Lista de Desejos`).

---

## 3. Causa do Tamanho do APK Universal (`216 MB`)

A inspeção do ZIP de `android/app/build/outputs/apk/release/app-release.apk` (`216.078.546` bytes / `206,1 MiB`, 1.926 entradas) mostrou que o aumento frente ao APK universal do SDK 54 (`96,9 MB`) ocorre por **armazenamento sem compressão (`compress_type=0 / STORED`)** das bibliotecas nativas `.so` e do `assets/index.android.bundle` (exigência de alinhamento de página de **16 KB** no Android 15/16 com `useLegacyPackaging=false` no AGP/RN `0.83`):

- `lib/`: **150,15 MiB** (72,9% do APK universal), distribuídos entre as **4 ABIs** embutidas no APK local (`x86_64`: 42,33 MiB, `x86`: 42,22 MiB, `arm64-v8a`: 39,46 MiB, `armeabi-v7a`: 26,15 MiB), liderados por `libmlkit_google_ocr_pipeline.so` (~10–11 MiB/ABI), `libreactnative.so` (~6 MiB/ABI) e `libbarhopper_v3.so` (~5,6–5,8 MiB/ABI).
- `assets/`: **23,95 MiB** (`assets/index.android.bundle` = 21,89 MiB `STORED`).
- **Impacto na Play Store:** no **AAB** (`bundleRelease`) publicado na Play Store, cada aparelho baixa apenas sua ABI (ex.: `arm64-v8a`) e a Play aplica compressão na entrega, eliminando o overhead das outras 3 ABIs (~111 MiB).

---

## 4. Validação dos Fluxos Essenciais (FR-1) no `SM-X510` (Android 16)

| # | Fluxo validado | Status | Evidência no `SM-X510` (APK release SDK 55 final) |
|---|---|---|---|
| 1 | **Abas principais (`Início`, `Contas`, `Desejos`, `Temporada`) em retrato e paisagem** | ✅ Passou | Todas as 4 abas abertas e inspecionadas em retrato (`1440×2304`) e paisagem (`2304×1440`) respeitando barra de status e barra de tarefas One UI; `0` erros no `logcat`. |
| 2 | **Introdução por tela (`ScreenIntroModal`), Voltar na `Início` e `BackHandler` em `Holerites`** | ✅ Passou | `Configurações` → `Ver Dicas das Telas` reativou `ScreenIntroModal` em `Contas` (`Contas & Cartões` / `Entendi!`) e fechou via Voltar. Em `Holerites` → `Preencher à mão` (`Revisar holerite`), 1º Voltar retornou para `Holerites` e 2º Voltar retornou para `Início`. Voltar na `Início` + relançamento funcionou sem crash. |
| 3 | **Teclado e chat `DOMUS IA` (`GiftedChat` + `keyboard-controller@1.20.7`)** | ✅ Passou | Foco no campo de texto, digitação (`TesteSDK55`), rotação retrato ↔ paisagem com teclado ativo e fechamento limpo do teclado e da tela sem deslocamento duplo nem erro. |
| 4 | **Câmera / OCR / Scanner NF-e (`Importar NF` → `QR Code` e `Holerites`)** | ✅ Passou | `Importar NF` → `QR Code` abriu o preview real da câmera (`expo-camera`: `QR Code`, `Cód. Barras`, `Galeria`, `Digitar Chave`) e `Holerites` abriu com opções `Câmera` e `Preencher à mão`, `0` erros no `logcat` (fluxo OCR ML Kit em cupom físico segue idêntico à nota de `docs/checklist-android-16.md`). |
| 5 | **Backup local, restauração e Google Drive** | ✅ Passou | `Backup & Restauração` abriu e alternou entre `Exportar`, `Restaurar` e `Drive` sem erros no `logcat` (smoke de telas/abas; round-trip completo de export/restore/Drive já validado no mesmo aparelho em `docs/checklist-android-16.md`). |
| 6 | **Sync Nostr** | ✅ Passou | `Sincronizar` abriu exibindo estado local (`28 eventos`, `6 relays`, `Criar grupo`, `Entrar`, `Escanear QR Code`) sem travar a UI nem erros no `logcat` (smoke de tela; round-trip completo já validado em `docs/checklist-android-16.md`). |
| 7 | **`expo-share-intent@6.1.1` (`ACTION_SEND` `text/plain`)** | ✅ Passou | Intent `ACTION_SEND` com URL da Amazon abriu o modal `Adicionar à Lista` (`Lista13` / `Cancelar`) no DOMUS sem erro. |
| 8 | **Foco de áudio (`SoundManager` sem patch `expo-audio`)** | ✅ Passou | Trocas rápidas de aba disparando efeitos sonoros seguidas de `adb shell dumpsys audio` confirmaram `DOMUS` ausente da pilha `Audio Focus stack entries` (`0` roubo de foco); transições `"doNotMix"` → `"mixWithOthers"` do ciclo de voz estão cobertas por testes comportamentais em `src/services/__tests__/soundManager.test.ts`. |
| 9 | **`logcat` (`FATAL EXCEPTION`, `Fatal signal`, `dispatchGetDisplayList`, `hiddenapi`)** | ✅ Passou | **0 linhas** fatais, de erro JS ou de `hiddenapi` durante todas as medições e fluxos FR-1. |

---

## 5. Comparação de Memória — SDK 54 vs SDK 55 (Teto +20% `TOTAL PSS`)

Coleta com a mesma metodologia de [docs/memoria-baseline-sdk-54.md](./memoria-baseline-sdk-54.md) (`adb shell dumpsys meminfo br.com.pixeleucaristico.domus`, 3 amostras com intervalo de 3 s por tela no `SM-X510`, orientação paisagem `2304×1440`, mesma base local de 28 eventos).

> **Regra de agregação:** os valores de cada coluna na tabela resumida representam o pico independente entre as 3 amostras da tela (como na baseline SDK 54); o critério de aprovação do Epic 8 avalia o pico de `TOTAL PSS` frente ao teto de +20%.

### 5.1 Resumo Comparativo por Tela

| Tela / Fluxo | Baseline SDK 54 (`TOTAL PSS`) | SDK 55 Final (`TOTAL PSS`) | Pico `TOTAL RSS` SDK 55 | Variação `TOTAL PSS` | Teto +20% (`TOTAL PSS`) | Status |
|---|---:|---:|---:|---:|---:|---|
| **Início** | 281.014 KB (274,4 MB) | 290.214 KB (**283,4 MB**) | 399.405 KB (390,0 MB) | **+3,27%** | 337.217 KB (329,3 MB) | ✅ PASS |
| **Contas** | 241.725 KB (236,1 MB) | 240.961 KB (**235,3 MB**) | 346.669 KB (338,5 MB) | **-0,32%** | 290.070 KB (283,3 MB) | ✅ PASS |
| **Desejos** | 240.528 KB (234,9 MB) | 240.272 KB (**234,6 MB**) | 345.701 KB (337,6 MB) | **-0,11%** | 288.634 KB (281,9 MB) | ✅ PASS |
| **Temporada** | 259.842 KB (253,8 MB) | 257.310 KB (**251,3 MB**) | 362.973 KB (354,5 MB) | **-0,97%** | 311.810 KB (304,5 MB) | ✅ PASS |
| **DOMUS IA** | **303.734 KB (296,6 MB)** | **301.391 KB (294,3 MB)** | **408.113 KB (398,5 MB)** | **-0,77%** | **364.481 KB (355,9 MB)** | ✅ PASS |
| **Backup & Restauração** | 290.924 KB (284,1 MB) | 272.451 KB (**266,1 MB**) | 378.373 KB (369,5 MB) | **-6,35%** | 349.109 KB (340,9 MB) | ✅ PASS |
| **Sincronizar** | 301.851 KB (294,8 MB) | 299.013 KB (**292,0 MB**) | 405.785 KB (396,3 MB) | **-0,94%** | 362.221 KB (353,7 MB) | ✅ PASS |
| **Importar NF / Câmera** | 298.585 KB (291,6 MB) | 252.835 KB (**246,9 MB**) | 362.358 KB (353,9 MB) | **-15,32%** | 358.302 KB (349,9 MB) | ✅ PASS |

- **Pico global SDK 55:** `301.391 KB` (**294,3 MB** em `DOMUS IA`) vs baseline SDK 54 `303.734 KB` (**296,6 MB**) → **-0,77%** (muito abaixo do teto global de +20%, `364.481 KB` / `355,9 MB`).
- **Todas as 8 telas passaram**, com 7 de 8 consumindo **menos** memória que no SDK 54 e maior variação positiva de apenas `+3,27%` (`Início` no 1º sample pós-cold-start, estabilizando em `258,5 MB` nas amostras #2 e #3).

### 5.2 Leituras Brutas SDK 55 (3 Amostras por Tela)

| Tela / Fluxo | Amostra | `TOTAL PSS` (KB / MB) | `TOTAL RSS` (KB / MB) | `Java Heap` (KB) | `Native Heap` (KB) | `Graphics` (KB) | `Code` (KB) | `Private Other` (KB) | `System` (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Início** | #1 | **290.214 (283,4 MB)** | **399.405 (390,0 MB)** | 27.932 | 79.512 | 60.021 | 77.088 | 29.984 | 12.777 |
| **Início** | #2 | 265.501 (259,3 MB) | 375.401 (366,6 MB) | 16.820 | 61.396 | 60.021 | 77.088 | 34.348 | 12.964 |
| **Início** | #3 | 264.751 (258,5 MB) | 374.653 (365,9 MB) | 16.496 | 60.976 | 60.021 | 77.088 | 34.344 | 12.962 |
| **Contas** | #1 | **240.961 (235,3 MB)** | **346.669 (338,5 MB)** | 20.556 | 62.156 | 24.629 | 85.828 | 35.408 | 9.440 |
| **Contas** | #2 | 237.317 (231,8 MB) | 343.029 (335,0 MB) | 16.912 | 62.156 | 24.629 | 85.828 | 35.412 | 9.436 |
| **Contas** | #3 | 236.991 (231,4 MB) | 342.701 (334,7 MB) | 16.604 | 62.156 | 24.629 | 85.832 | 35.408 | 9.438 |
| **Desejos** | #1 | **240.272 (234,6 MB)** | **345.701 (337,6 MB)** | 20.116 | 61.608 | 24.629 | 85.972 | 35.444 | 9.555 |
| **Desejos** | #2 | 236.238 (230,7 MB) | 341.701 (333,7 MB) | 16.996 | 61.068 | 24.629 | 85.968 | 35.052 | 9.577 |
| **Desejos** | #3 | 235.930 (230,4 MB) | 341.393 (333,4 MB) | 16.708 | 61.068 | 24.629 | 85.968 | 35.048 | 9.577 |
| **Temporada** | #1 | **257.310 (251,3 MB)** | **362.973 (354,5 MB)** | 21.032 | 67.328 | 32.225 | 86.816 | 37.300 | 9.661 |
| **Temporada** | #2 | 252.524 (246,6 MB) | 358.709 (350,3 MB) | 19.104 | 67.348 | 30.173 | 86.208 | 37.080 | 9.847 |
| **Temporada** | #3 | 251.536 (245,6 MB) | 357.729 (349,3 MB) | 18.124 | 67.364 | 30.173 | 86.208 | 37.064 | 9.855 |
| **DOMUS IA** | #1 | **301.391 (294,3 MB)** | **408.113 (398,5 MB)** | 33.748 | 83.832 | 40.505 | 86.664 | 43.788 | 10.118 |
| **DOMUS IA** | #2 | 288.051 (281,3 MB) | 394.777 (385,5 MB) | 20.640 | 83.596 | 40.505 | 86.668 | 43.784 | 10.122 |
| **DOMUS IA** | #3 | 287.362 (280,6 MB) | 394.089 (384,9 MB) | 19.712 | 83.876 | 40.505 | 86.668 | 43.760 | 10.121 |
| **Backup & Restauração** | #1 | 268.645 (262,3 MB) | 373.881 (365,1 MB) | 23.180 | 69.616 | 48.613 | 84.904 | 29.560 | 9.888 |
| **Backup & Restauração** | #2 | **272.451 (266,1 MB)** | **378.373 (369,5 MB)** | 22.652 | 69.612 | 48.613 | 84.900 | 33.764 | 10.074 |
| **Backup & Restauração** | #3 | 272.408 (266,0 MB) | 378.321 (369,5 MB) | 22.604 | 69.612 | 48.613 | 84.900 | 33.776 | 10.067 |
| **Sincronizar** | #1 | **299.013 (292,0 MB)** | **405.785 (396,3 MB)** | 27.944 | 86.164 | 40.209 | 87.196 | 44.532 | 10.220 |
| **Sincronizar** | #2 | 290.277 (283,5 MB) | 397.053 (387,7 MB) | 19.740 | 85.632 | 40.209 | 87.196 | 44.532 | 10.220 |
| **Sincronizar** | #3 | 288.793 (282,0 MB) | 395.569 (386,3 MB) | 18.612 | 85.312 | 40.209 | 87.196 | 44.512 | 10.220 |
| **Importar NF / Câmera** | #1 | 247.352 (241,6 MB) | 356.086 (347,7 MB) | 21.840 | 68.148 | 47.318 | 65.724 | 26.960 | 14.038 |
| **Importar NF / Câmera** | #2 | **252.835 (246,9 MB)** | **362.358 (353,9 MB)** | 22.884 | 67.916 | 47.318 | 65.808 | 31.236 | 14.365 |
| **Importar NF / Câmera** | #3 | 252.570 (246,7 MB) | 361.958 (353,5 MB) | 22.872 | 67.840 | 47.318 | 65.680 | 31.240 | 14.312 |

---

## 6. Verificações Automatizadas (Estado Final)

- `npx expo-doctor`: **20/20 checks passed**
- `npx eslint .` e `npx expo lint`: **0 erros**
- `Remove-Item expo-env.d.ts -ErrorAction SilentlyContinue; npx tsc --noEmit`: **0 erros**
- `npx vitest run`: **0 falhas novas** (inclui `src/services/__tests__/soundManager.test.ts` e `patches/__tests__/giftedChatPatch.test.ts`; apenas as 2 falhas pré-existentes exclusivas de Windows CRLF/UTC-3)
- `npx expo export --platform web`: **exit 0** (3.633 módulos)
- `npx expo config --type prebuild --json`: **exit 0** (config plugins Android e iOS resolvidos sem erro; geração nativa de `ios/` ocorre no runner macOS de `build-ios.yml`)
- `npx expo prebuild --clean --platform android` + `.\gradlew.bat assembleRelease` (JDK 17) + `aapt2 dump badging`: **`BUILD SUCCESSFUL`**, `versionCode='12'`, `versionName='1.9.0'`, `minSdkVersion='24'`, `targetSdkVersion='36'`, `compileSdkVersion='36'`
