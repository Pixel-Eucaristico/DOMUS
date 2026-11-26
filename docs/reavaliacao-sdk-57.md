# Reavaliação de Patches, Tamagui e Validação no Expo SDK 57 (Story 8.6)

**Story:** 8.6 — Reavaliar patches e Tamagui no SDK 57 e validar fluxos e memória no Android 16  
**Data:** 26/11/2026  
**Commit base (Story 8.5):** `34d3ab77f027bda13ca1370c16552af3e84fcfb0` (branch `dev`)  
**Referências:** [docs/memoria-baseline-sdk-54.md](./memoria-baseline-sdk-54.md) · [docs/reavaliacao-sdk-55.md](./reavaliacao-sdk-55.md) · [docs/migracao-sdk-57.md](./migracao-sdk-57.md)  
**Plataforma validada:** Expo SDK `~57.0.34` · React Native `0.86.3` · React `19.2.3` · Hermes V1 padrão (`hermesEnabled=true`) · New Architecture · Tamagui `^2.7.7` (estável)  
**Artefato medido:** `android/app/build/outputs/apk/release/app-release.apk` (`versionName=1.9.0`, `versionCode=12`, `minSdkVersion=24`, `compileSdkVersion=36`, `targetSdkVersion=36`, `229.676.206` bytes / `219,0 MiB`)  
**Aparelho validado:** Samsung Galaxy Tab S9 FE (`SM-X510`, serial `RX2X101N87Y`, Android 16 / API 36, build `BP4A.251205.006`)

---

## 1. Decisão Final dos Patches (`patches/`)

A reavaliação reduziu `patches/` de **2 patches para 1 único patch ativo** (`patches/react-native-gifted-chat+3.3.2.patch`), eliminando uma dependência externa sem uso real e seu respectivo patch.

| # | Pacote / Patch | Decisão | Motivo técnico objetivo |
|---|---|---|---|
| 1 | `react-native-sprinkle-toast@1.0.1` + `patches/react-native-sprinkle-toast+1.0.1.patch` | **Removido (pacote + patch + teste)** | `git grep` em `app/`, `src/`, `packages/`, `scripts/` e `plugins/` confirmou **0 chamadas à API de toast** (`useToast` / disparo de toasts); o pacote existia apenas como wrapper ocioso `<ToastProvider>` em `app/_layout.tsx` e exigira patch próprio na Story 8.5 pela remoção de `StyleSheet.absoluteFillObject` no RN `0.86.3`. Removidos a dependência de `package.json` (com `package-lock.json` sincronizado via `npm install`), `patches/react-native-sprinkle-toast+1.0.1.patch`, `patches/__tests__/sprinkleToastPatch.test.ts` e `<ToastProvider>` em `app/_layout.tsx`. A guarda estrutural R4 em `src/components/__tests__/keyboardScroll.test.ts` (`rootNavViolations`) foi atualizada de `ToastProvider` para `ResponsiveLayoutProvider`, preservando a invariante de `{children}` como primeiro filho sem banner antes. |
| 2 | `react-native-gifted-chat@3.3.2` + `patches/react-native-gifted-chat+3.3.2.patch` | **Mantido em `3.3.2` com patch** | Inspeção direta do pacote upstream `react-native-gifted-chat@3.6.0` (`npm pack` + análise de `package.json`, `lib/GiftedChat/index.js`, `lib/GiftedChat/types.d.ts`, `lib/GiftedChatContext.d.ts`, `lib/maintenanceNotice.js` e `postinstall.cjs`) revelou que, embora a `3.6.0` introduza a prop opt-out `disableKeyboardProvider?: boolean` e corrija `getColorScheme(): ColorSchemeName \| null \| undefined`, (1) ainda renderiza `<KeyboardProvider>` aninhado por padrão (`disableKeyboardProvider = false`), (2) remove `src/` e publica ESM compilado em `lib/` (`"type": "module"`), quebrando os contratos da sentinela da Story 13.5 (`src/components/__tests__/keyboardScroll.test.ts` e `patches/__tests__/giftedChatPatch.test.ts`), (3) entrou oficialmente em **modo de manutenção** upstream (com aviso em `postinstall.cjs` e `console.warn` em `__DEV__` indicando migração para `@kesha-antonov/react-native-chat`) e (4) foi construída contra `react-native@0.88.1` / `react-native-gesture-handler@~3.3.0` / `react-native-reanimated@4.7.1`. Manter `3.3.2` + o patch de 3 arquivos (7 hunks) (remoção de `<KeyboardProvider>`, `ColorSchemeName` em `GiftedChatContext.ts` e remoção de `@ts-expect-error` obsoleto no `KeyboardAvoidingView`) mantém a Story 13.5 íntegra e validada no SDK 57; eventual troca por `@kesha-antonov/react-native-chat` fica registrada como evolução futura fora do Epic 8. |

> **Auditoria complementar — `react-native-vision-camera@4.7.3`:** confirmado via `git grep` que segue com **0 imports** em `app/`, `src/`, `packages/` e `scripts/` (consta apenas como plugin em `app.json`). Portanto, as referências internas a `StyleSheet.absoluteFillObject` dentro do pacote não são executadas nem tipadas pelo app em produção; mantido intacto por ora na Story 8.6 (eventual remoção adiada para limpeza dedicada).

---

## 2. Reavaliação da Tamagui (`^2.7.7`)

- **Decisão:** **Mantida em `^2.7.7`** (`tamagui`, `@tamagui/core`, `@tamagui/config`) com `@tamagui/config/v5`.
- **Motivo técnico objetivo:** consulta ao registro npm (`npm view tamagui versions --json`) confirmou que `2.7.7` é a **última versão estável da linha `2.x`** (`2.7.3` → `2.7.7`). As versões posteriores pertencem à família major `3.x` (`3.0.0` → `3.3.3`), um salto breaking explicitamente fora do escopo do Epic 8.
- **Validação no SDK 57:** nenhum ajuste adicional de código ou tipagem foi necessário no salto 55 → 57. Validada com `npx tsc --noEmit` (0 erros), `npx eslint .` / `npx expo lint` (0 erros), `npx vitest run` (0 falhas novas), `npx expo export --platform web` (exit 0) e inspeção visual/funcional no `SM-X510` (Android 16) em `TCard`, `TButton`, `TInput`, `TText` e `ScreenIntroModal` (`View`, `Text`, `XStack`, `YStack`) em retrato e paisagem.

---

## 3. Validação dos Fluxos Essenciais (FR-1) e Novidades do SDK 57 no `SM-X510` (Android 16)

Todos os testes abaixo foram executados sobre o **APK release final do SDK 57** (`229.676.206` bytes, `targetSdkVersion='36'`, pós-remoção de `react-native-sprinkle-toast`) instalado no Samsung Galaxy Tab S9 FE (`SM-X510`, Android 16 / API 36).

| # | Fluxo validado | Status | Evidência no `SM-X510` (APK release SDK 57 final) |
|---|---|---|---|
| 1 | **Abas principais (`Início`, `Contas`, `Desejos`, `Temporada`) em retrato e paisagem** | ✅ Passou | Todas as 4 abas abertas e inspecionadas em paisagem (`2304×1440`) e retrato (`1440×2304`), preservando conformidade edge-to-edge com barra de status e barra de tarefas One UI; `0` erros no `logcat`. |
| 2 | **Splash `expo-splash-screen` (`imageWidth: 200`) + `AnimatedSplash`** | ✅ Passou | Capturas na inicialização a frio confirmaram a splash nativa Android 12+ com o ícone DOMUS em tamanho cheio (`imageWidth: 200`, sem encolhimento ao fallback `100`) sobre fundo escuro e transição fluida para o `AnimatedSplash` até `Início`. |
| 3 | **`ScreenIntroModal`, Voltar na `Início` e `BackHandler` em `Holerites`** | ✅ Passou | `ScreenIntroModal` (Tamagui) exibiu e fechou corretamente em `Início`, `Desejos`, `Temporada`, `Sincronizar`, `Configurações` e `Backup`. Em `Holerites` (aberto via página 2 do FAB radial) → `Preencher à mão` (`Revisar holerite`), o **1º Voltar** retornou para `Holerites` e o **2º Voltar** retornou para `Início`. Voltar na `Início` encerrou para o launcher e o relançamento abriu sem crash. |
| 4 | **Teclado e chat `DOMUS IA` (`GiftedChat@3.3.2` + `keyboard-controller@1.21.9`)** | ✅ Passou | Foco no `EditText`, digitação (`TesteSDK57`) e rotação paisagem (`2304×1440`) ↔ retrato (`1440×2304`) com teclado aberto mantiveram a barra de entrada alinhada imediatamente acima do teclado sem deslocamento duplo, lacuna ou sobreposição; fechamento limpo do teclado e da tela (smoke de UI/teclado com análise local ativa, sem chave de API configurada no aparelho; contratos HTTP de provedores de IA validados na suíte `src/modules/ai/**/*`). |
| 5 | **Câmera / Scanner NF-e (`useIsFocused` de `expo-router`) e `Holerites`** | ✅ Passou | `Importar NF` → `QR Code` abriu o preview real da câmera (`expo-camera@57.0.6` com `useIsFocused` importado diretamente de `"expo-router"`, exibindo `QR Code`, `Cód. Barras`, `Galeria`, `Digitar Chave` e moldura de leitura) e retornou via Voltar sem erro; `Holerites` exibiu `Câmera`, `Galeria` e `Preencher à mão`. |
| 6 | **Compartilhamento `captureRef` (`react-native-view-shot@5.1.0` TurboModule)** | ✅ Passou | Em `Temporada`, toque no botão de compartilhamento de `Nível 1` (`handleShareXpLevel` → `captureRef(levelCardRef, { format: "png", quality: 0.9 })` + `Sharing.shareAsync`) abriu o share sheet nativo do Android 16 (`com.android.intentresolver/.ChooserActivityLauncher`) exibindo `"1 imagem"` com miniatura real do PNG capturado (comprovando execução bem-sucedida do TurboModule `NativeRNViewShot`, sem cair no fallback de texto). |
| 7 | **`expo-share-intent@8.0.1` (`ACTION_SEND` `text/plain`) + `fetch` global** | ✅ Passou | Envio de intent `ACTION_SEND` (`text/plain`) com URL da Amazon abriu o modal `Adicionar à Lista` (`Amazon`, `Lista13`, `Cancelar` / `+ Adicionar`) no DOMUS e executou a requisição HTTP real via `fetch` global do SDK 57 (retornando o título HTTP da página consultada, sem erro de rede/runtime). |
| 8 | **Backup local, restauração e Google Drive** | ✅ Passou | `Configurações e Sobre` → `Configurações` → `Backup & Restauração` exibiu `28 eventos no dispositivo` e alternou sem erro entre `Exportar`, `Restaurar` e `Drive`, preservando a conexão prévia do Google Drive e a data do último sync pós-upgrade (smoke de telas/abas; round-trip completo de export/restore/Drive já validado no mesmo aparelho em `docs/checklist-android-16.md`). |
| 9 | **Sync Nostr (`Sincronizar`)** | ✅ Passou | `Sincronizar` abriu exibindo estado local (`28 eventos`, `6 relays`, `Criar grupo`, `Entrar`, `Escanear QR Code`) sem travamento de UI nem erros no `logcat` (smoke de tela sem mutar o banco local de 28 eventos; round-trip completo já validado em `docs/checklist-android-16.md` e contratos Nostr cobertos por `src/modules/__tests__/`). |
| 10 | **Foco de áudio (`SoundManager` / `expo-audio@~57.0.5`)** | ✅ Passou | Após trocas rápidas entre as 4 abas disparando efeitos sonoros, `adb shell dumpsys audio` confirmou a pilha `Audio Focus stack entries` vazia (`br.com.pixeleucaristico.domus` ausente — `0` roubos de foco). |
| 11 | **Módulos nativos críticos (`react-native-google-mobile-ads`, `@react-native-firebase/*`) e `logcat`** | ✅ Passou | `react-native-google-mobile-ads@16.2.2` e `@react-native-firebase/{app,analytics,crashlytics,perf}` compilaram no APK release e inicializaram no boot/navegação do `SM-X510` com **0 ocorrências** de `FATAL EXCEPTION`, `Fatal signal`, `dispatchGetDisplayList`, `hiddenapi` ou erro JS para `br.com.pixeleucaristico.domus` no `logcat`. |

---

## 4. Comparação de Memória — SDK 54 vs SDK 55 vs SDK 57 (Hermes V1, Teto +20% `TOTAL PSS`)

Coleta executada com a mesma metodologia de [docs/memoria-baseline-sdk-54.md](./memoria-baseline-sdk-54.md): `adb shell dumpsys meminfo br.com.pixeleucaristico.domus`, **8 telas × 3 amostras** com intervalo de **3 segundos** entre amostras no `SM-X510` (orientação paisagem `2304×1440`, mesma base local de 28 eventos, 1 conta e 1 lista de desejos; `Início` → `Contas` → `Desejos` → `Temporada` → `DOMUS IA` → `Sincronizar` em sessão contínua pós-cold-start; `Importar NF / Câmera` com preview real de `QR Code` e `Backup & Restauração` em relançamentos limpos imediatos).

> **Regra de agregação:** o valor exibido na tabela comparativa representa o pico de `TOTAL PSS` (e `TOTAL RSS`) entre as 3 amostras da tela; o critério de aprovação do Epic 8 exige que **todas as 8 telas e o pico global** permaneçam **≤ +20% em `TOTAL PSS`** sobre a baseline SDK 54 (`1 MB = 1.024 KB`).

### 4.1 Resumo Comparativo por Tela (SDK 54 vs SDK 55 vs SDK 57)

| Tela / Fluxo | Baseline SDK 54 (`TOTAL PSS`) | SDK 55 Final (`TOTAL PSS`) | SDK 57 Final (`TOTAL PSS`) | Pico `TOTAL RSS` SDK 57 | Variação SDK 57 vs SDK 54 | Teto +20% (`TOTAL PSS`) | Status |
|---|---:|---:|---:|---:|---:|---:|---|
| **Início** | 281.014 KB (274,4 MB) | 290.214 KB (283,4 MB) | 266.715 KB (**260,5 MB**) | 379.379 KB (370,5 MB) | **-5,09%** | 337.217 KB (329,3 MB) | ✅ PASS |
| **Contas** | 241.725 KB (236,1 MB) | 240.961 KB (235,3 MB) | 250.487 KB (**244,6 MB**) | 362.867 KB (354,4 MB) | **+3,62%** | 290.070 KB (283,3 MB) | ✅ PASS |
| **Desejos** | 240.528 KB (234,9 MB) | 240.272 KB (234,6 MB) | 254.079 KB (**248,1 MB**) | 366.301 KB (357,7 MB) | **+5,63%** | 288.634 KB (281,9 MB) | ✅ PASS |
| **Temporada** | 259.842 KB (253,8 MB) | 257.310 KB (251,3 MB) | 272.562 KB (**266,2 MB**) | 385.113 KB (376,1 MB) | **+4,90%** | 311.810 KB (304,5 MB) | ✅ PASS |
| **DOMUS IA** | **303.734 KB (296,6 MB)** | **301.391 KB (294,3 MB)** | 315.970 KB (**308,6 MB**) | 429.233 KB (419,2 MB) | **+4,03%** | **364.481 KB (355,9 MB)** | ✅ PASS |
| **Backup & Restauração** | 290.924 KB (284,1 MB) | 272.451 KB (266,1 MB) | 299.084 KB (**292,1 MB**) | 410.493 KB (400,9 MB) | **+2,80%** | 349.109 KB (340,9 MB) | ✅ PASS |
| **Sincronizar** | 301.851 KB (294,8 MB) | 299.013 KB (292,0 MB) | **316.958 KB (309,5 MB)** | **430.417 KB (420,3 MB)** | **+5,00%** | 362.221 KB (353,7 MB) | ✅ PASS |
| **Importar NF / Câmera** | 298.585 KB (291,6 MB) | 252.835 KB (246,9 MB) | 298.285 KB (**291,3 MB**) | 409.325 KB (399,7 MB) | **-0,10%** | 358.302 KB (349,9 MB) | ✅ PASS |

- **Pico global SDK 57:** `316.958 KB` (**309,5 MB** `TOTAL PSS`, registrado em `Sincronizar`) vs pico global da linha de base SDK 54 `303.734 KB` (**296,6 MB** em `DOMUS IA`) → **`+4,35%`**, com ampla folga frente ao teto global de `+20%` (`364.481 KB` / `355,9 MB`).
- **8 de 8 telas passaram com folga:** a maior variação individual positiva sobre o SDK 54 foi **`+5,63%`** (`Desejos`), enquanto `Início` (`-5,09%`) e `Importar NF / Câmera` (`-0,10%`) consumiram menos memória que no SDK 54.
- **Comportamento do Hermes V1 (`expo@57.0.34` + `reanimated@4.5.1` + `worklets@0.10.1`):** observa-se `Native Heap` moderadamente maior (`78,0–107,7 MB` vs `59,3–84,9 MB` no SDK 54/55), compensado por `Code` menor (`73,0–78,9 MB` vs `89,3–95,1 MB` no SDK 54) e redução de `Graphics` em `Início` (`34,7 MB` vs `67,5 MB`). Em **todas** as 8 telas, `TOTAL PSS` cai e estabiliza nas amostras `#2` e `#3`, comprovando na prática a ausência da regressão/vazamento de memória do Hermes V1 presente no SDK 56 / `expo@<=57.0.8`.

### 4.2 Leituras Brutas SDK 57 (3 Amostras por Tela)

| Tela / Fluxo | Amostra | `TOTAL PSS` (KB / MB) | `TOTAL RSS` (KB / MB) | `Java Heap` (KB) | `Native Heap` (KB) | `Graphics` (KB) | `Code` (KB) | `Private Other` (KB) | `System` (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Início** | #1 | **266.715 (260,5 MB)** | **379.379 (370,5 MB)** | 22.664 | 82.056 | 35.527 | 77.652 | 31.852 | 13.960 |
| **Início** | #2 | 264.986 (258,8 MB) | 377.839 (369,0 MB) | 18.848 | 80.960 | 35.527 | 76.832 | 36.116 | 13.739 |
| **Início** | #3 | 263.990 (257,8 MB) | 376.659 (367,8 MB) | 17.956 | 80.964 | 35.527 | 76.808 | 36.120 | 13.651 |
| **Contas** | #1 | **250.487 (244,6 MB)** | **362.867 (354,4 MB)** | 20.380 | 82.012 | 20.559 | 74.716 | 36.216 | 13.584 |
| **Contas** | #2 | 247.359 (241,6 MB) | 359.655 (351,2 MB) | 18.120 | 81.052 | 20.559 | 74.724 | 36.232 | 13.652 |
| **Contas** | #3 | 247.274 (241,5 MB) | 359.563 (351,1 MB) | 18.044 | 81.052 | 20.559 | 74.724 | 36.232 | 13.659 |
| **Desejos** | #1 | **254.079 (248,1 MB)** | **366.301 (357,7 MB)** | 20.020 | 79.912 | 25.089 | 74.784 | 37.540 | 13.710 |
| **Desejos** | #2 | 252.448 (246,5 MB) | 364.653 (356,1 MB) | 18.396 | 79.912 | 25.089 | 74.784 | 37.536 | 13.735 |
| **Desejos** | #3 | 252.187 (246,3 MB) | 364.393 (355,9 MB) | 18.148 | 79.912 | 25.089 | 74.788 | 37.540 | 13.734 |
| **Temporada** | #1 | **272.562 (266,2 MB)** | **385.113 (376,1 MB)** | 22.832 | 87.092 | 30.905 | 75.596 | 39.236 | 13.909 |
| **Temporada** | #2 | 269.173 (262,9 MB) | 381.725 (372,8 MB) | 19.596 | 87.132 | 30.905 | 75.592 | 39.040 | 13.916 |
| **Temporada** | #3 | 267.045 (260,8 MB) | 379.629 (370,7 MB) | 19.528 | 87.132 | 28.853 | 75.580 | 39.036 | 13.940 |
| **DOMUS IA** | #1 | **315.970 (308,6 MB)** | **429.233 (419,2 MB)** | 30.740 | 105.608 | 41.033 | 76.348 | 45.276 | 14.137 |
| **DOMUS IA** | #2 | 307.015 (299,8 MB) | 420.281 (410,4 MB) | 21.904 | 105.492 | 41.033 | 76.348 | 45.272 | 14.138 |
| **DOMUS IA** | #3 | 306.163 (299,0 MB) | 419.429 (409,6 MB) | 21.080 | 105.492 | 41.033 | 76.348 | 45.260 | 14.138 |
| **Backup & Restauração** | #1 | **299.084 (292,1 MB)** | **410.493 (400,9 MB)** | 27.372 | 90.372 | 48.085 | 80.768 | 36.104 | 13.347 |
| **Backup & Restauração** | #2 | 295.493 (288,6 MB) | 407.661 (398,1 MB) | 19.560 | 90.360 | 48.085 | 80.800 | 40.148 | 13.520 |
| **Backup & Restauração** | #3 | 295.001 (288,1 MB) | 407.169 (397,6 MB) | 19.208 | 90.232 | 48.085 | 80.800 | 40.136 | 13.520 |
| **Sincronizar** | #1 | **316.958 (309,5 MB)** | **430.417 (420,3 MB)** | 26.704 | 110.236 | 38.677 | 76.972 | 47.260 | 14.229 |
| **Sincronizar** | #2 | 310.895 (303,6 MB) | 424.353 (414,4 MB) | 20.948 | 109.932 | 38.677 | 76.972 | 47.256 | 14.230 |
| **Sincronizar** | #3 | 309.998 (302,7 MB) | 423.457 (413,5 MB) | 19.872 | 109.940 | 38.677 | 77.028 | 47.388 | 14.229 |
| **Importar NF / Câmera** | #1 | **298.285 (291,3 MB)** | **409.325 (399,7 MB)** | 28.200 | 90.828 | 50.577 | 76.956 | 34.440 | 13.776 |
| **Importar NF / Câmera** | #2 | 294.646 (287,7 MB) | 406.509 (397,0 MB) | 20.264 | 90.760 | 50.577 | 77.028 | 38.544 | 13.989 |
| **Importar NF / Câmera** | #3 | 293.409 (286,5 MB) | 405.317 (395,8 MB) | 19.964 | 89.744 | 50.577 | 77.048 | 38.560 | 14.028 |

---

## 5. Verificações Automatizadas (Estado Final Pós-Reavaliação)

- `npm install` (`postinstall: patch-package`): **exit 0** — removido `react-native-sprinkle-toast`, `package-lock.json` sincronizado, único patch aplicado: `react-native-gifted-chat@3.3.2 ✔`
- `npx expo-doctor`: **21/21 checks passed. No issues detected!**
- `npx eslint .`: **0 erros** (14 warnings pré-existentes)
- `npx expo lint`: **0 erros** (10 warnings pré-existentes)
- `Remove-Item expo-env.d.ts -ErrorAction SilentlyContinue; npx tsc --noEmit`: **0 erros** (TypeScript `6.0.3`)
- `npx vitest run`: **0 falhas novas** (`153/155` arquivos, `3234/3236` testes; `patches/__tests__/giftedChatPatch.test.ts` e `src/components/__tests__/keyboardScroll.test.ts` 100% verdes; apenas as 2 falhas pré-existentes exclusivas de Windows CRLF/UTC-3 em `plugins/__tests__/withReleaseSigning.test.ts:83` e `packages/season/__tests__/season.test.ts:156`)
- `npx expo export --platform web`: **exit 0** (`3760` módulos empacotados, `React Compiler enabled`; `dist/` removido após a verificação)
- `npx expo config --type prebuild --json`: **exit 0** (config plugins Android e iOS resolvidos sem erro; verificação nativa de `ios/` ocorre no runner macOS de `build-ios.yml`, mantendo a checagem de que o target `ShareExtension` gerado por `expo-share-intent@8.0.1` alinha `IPHONEOS_DEPLOYMENT_TARGET` a `ios.deploymentTarget: "16.4"`)
- `npx expo prebuild --clean --platform android` + `.\gradlew.bat assembleRelease --max-workers=2` (JDK 17) + `aapt2 dump badging`: **`BUILD SUCCESSFUL`** (`1525` tasks, APK `229.676.206` bytes / `219,0 MiB`, `versionCode='12'`, `versionName='1.9.0'`, `minSdkVersion='24'`, `compileSdkVersion='36'`, `targetSdkVersion='36'`)
