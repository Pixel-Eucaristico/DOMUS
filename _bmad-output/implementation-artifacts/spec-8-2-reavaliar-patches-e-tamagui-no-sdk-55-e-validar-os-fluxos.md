---
title: 'Story 8.2: Reavaliar patches e Tamagui no SDK 55 e validar os fluxos'
type: 'chore'
created: '2026-11-25'
status: 'done'
baseline_commit: 'ac90617dbe8c60145b8c15783f973d76a3a7345f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/memoria-baseline-sdk-54.md'
  - '{project-root}/docs/migracao-sdk-55.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Story 8.1 subiu o DOMUS para o Expo SDK 55 compilando em release, mas deixou 3 patches arquivados sem decisão (`expo-asset`, `expo-audio`, `react-native-keyboard-controller`), a Tamagui em pré-release (`^2.0.0-rc.26`), `rn-tourguide` sem uso e sem validação funcional nem medição de memória no Android 16.

**Approach:** Decidir o destino dos 5 patches e da Tamagui (`^2.0.0-rc.26` vs estável `2.7.7`), recompilar o APK release SDK 55, validar no Samsung Galaxy Tab S9 FE (`SM-X510`, Android 16) todos os fluxos essenciais do FR-1 e medir o pico de memória das 8 telas comparando com `docs/memoria-baseline-sdk-54.md` (teto +20%), registrando tudo em `docs/reavaliacao-sdk-55.md`.

## Boundaries & Constraints

**Always:**
- Registrar decisão e motivo objetivo para todos os 5 patches e para a Tamagui em `docs/reavaliacao-sdk-55.md`, eliminando `docs/patches-sdk-55-pendentes/` ao final.
- Garantir que `SoundManager` não roube foco de áudio no Android (via `setAudioModeAsync({ interruptionMode: "mixWithOthers" })` ou patch `expo-audio@55.0.18`), com comentário atualizado em `src/services/SoundManager.ts` e teste automatizado.
- Manter Hermes padrão do SDK 55, `targetSdkVersion=36`, `package-lock.json` sincronizado e `expo-doctor`/`eslint`/`tsc`/`vitest`/`expo export --platform web` verdes.
- Medir `dumpsys meminfo` nas mesmas 8 telas da baseline no `SM-X510`; se qualquer tela ultrapassar +20% `TOTAL PSS`, bloquear e investigar antes de encerrar.
- Trabalhar e commitar direto na branch `dev`; textos e docs em pt-BR com acentos completos.

**Never:**
- Não alterar `packages/sync`, `replit.*` nem editar manualmente `android/` ou `ios/`.
- Não antecipar SDK 56/57 (8.3–8.6), login Google (8.7–8.9) nem Tamagui major `3.x` (avaliar apenas `2.7.7` estável vs manter `^2.0.0-rc.26`).
- Não manter guards mortos em `patches/__tests__/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| 5 patches no SDK 55 | 2 em `patches/` + 3 em `docs/patches-sdk-55-pendentes/` | `expo-asset` removido (PR `#42184`); `rn-tourguide` e patch removidos se 0 usos confirmados; `expo-audio` resolvido via API ou patch `55.0.18` com teste; `gifted-chat` mantido; `keyboard-controller` portado para `1.20.7` ou removido após teste no `SM-X510` | Se chamadas de voz (`useVoiceRecorder`/`VoiceOutputService`/`ai-chat`) sobrescreverem `interruptionMode`, restaurar `"mixWithOthers"` ou manter patch |
| Tamagui `2.0.0-rc.26` vs `2.7.7` | `tamagui`, `@tamagui/core`, `@tamagui/config` | Testar upgrade para `2.7.7` estável em `tsc`, `vitest`, web export e APK release | Se `2.7.7` quebrar RN `0.83`/React `19.2`/`@tamagui/config/v5`, manter `^2.0.0-rc.26` registrando erro exato |
| Fluxos FR-1 no Android 16 | APK release SDK 55 final no `SM-X510` | Abas (retrato/paisagem), introduções/Voltar/`BackHandler`, teclado/chat `DOMUS IA`, câmera/OCR, backup local/Drive, sync Nostr, `expo-share-intent` e foco de áudio sem crash no `logcat` | Qualquer crash (ex.: `dispatchGetDisplayList`) bloqueia até correção e revalidação |
| Teto +20% memória | 3 amostras `dumpsys meminfo` nas 8 telas da Story 8.1 | Pico `TOTAL PSS` de cada tela ≤ +20% da baseline SDK 54 (global ≤ `364.481 KB` / `355,9 MB`) | Exceder +20% bloqueia até investigação |

</frozen-after-approval>

## Code Map

- `patches/` e `docs/patches-sdk-55-pendentes/` -- 5 patches a decidir (`expo-asset`, `expo-audio`, `react-native-keyboard-controller`, `react-native-gifted-chat`, `rn-tourguide`).
- `patches/__tests__/keyboardControllerPatch.test.ts` e `giftedChatPatch.test.ts` -- Validação dos patches ativos; alinhar `keyboardControllerPatch.test.ts` à decisão final.
- `src/services/SoundManager.ts` (L74–94), `app/ai-chat.tsx:525`, `src/hooks/useVoiceRecorder.ts:29,42,60`, `src/services/VoiceOutputService.ts:179` -- Callers de `expo-audio` / `setAudioModeAsync`.
- `package.json`, `package-lock.json`, `tamagui.config.ts` -- Tamagui (`^2.0.0-rc.26` → avaliar `2.7.7`), `rn-tourguide` (`^3.3.2`, 0 imports).
- `docs/reavaliacao-sdk-55.md` -- Novo documento com decisões de patches e Tamagui, causa do APK universal (`216 MB`), evidências FR-1 no `SM-X510` e tabela de memória SDK 54 vs SDK 55 (% delta).

## Tasks & Acceptance

**Execution:**
- [x] `patches/`, `docs/patches-sdk-55-pendentes/`, `src/services/SoundManager.ts` e `package.json` -- Executar destino dos 5 patches (remover `expo-asset` e `rn-tourguide` sem uso; resolver `expo-audio` via `setAudioModeAsync` ou patch `55.0.18` com teste; manter `gifted-chat`; decidir `keyboard-controller` com teste no `SM-X510`), removendo `docs/patches-sdk-55-pendentes/` -- Encerra pendências de patches da 8.1.
- [x] `package.json`, `package-lock.json` e `tamagui.config.ts` -- Avaliar upgrade de `tamagui`/`@tamagui/core`/`@tamagui/config` para `2.7.7` estável (ou manter `^2.0.0-rc.26` com motivo) e sincronizar `package-lock.json` -- Define versão estável ou justificada da Tamagui.
- [x] `android/` (`npx expo prebuild --clean --platform android`) e `patches/__tests__/` -- Recompilar APK release SDK 55 (`assembleRelease`, JDK 17), validar `aapt2 dump badging` (`targetSdkVersion=36`), inspecionar tamanho do APK (`216 MB`) e confirmar `expo-doctor`, `eslint`, `tsc`, `vitest` e `expo export --platform web` verdes -- Gera artefato final pronto para validação.
- [x] `docs/reavaliacao-sdk-55.md` -- Instalar APK final no `SM-X510` (Android 16), validar todos os fluxos FR-1 + `expo-share-intent` + foco de áudio no `logcat`, medir 3 amostras `dumpsys meminfo` nas 8 telas comparando com `docs/memoria-baseline-sdk-54.md` (≤ +20%) e consolidar relatório -- Valida estabilidade e orçamento de memória do SDK 55.

**Acceptance Criteria:**
- Given o SDK 55 compilando na `dev`, when concluo a reavaliação, then cada um dos 5 patches está removido, atualizado em `patches/` ou mantido com motivo em `docs/reavaliacao-sdk-55.md` (sem `docs/patches-sdk-55-pendentes/`), a Tamagui está em `2.7.7` estável ou mantida com motivo, e o foco de áudio do `SoundManager` tem teste automatizado.
- Given o APK release SDK 55 final no `SM-X510` (Android 16), when executo todos os fluxos FR-1, then operam sem crash/erro fatal no `logcat`, `expo-doctor`/`eslint`/`tsc`/`vitest`/`expo export --platform web` estão verdes e nenhuma das 8 telas ultrapassa +20% de `TOTAL PSS` sobre a linha de base SDK 54.

## Implementation Notes

- **5 patches reavaliados (`docs/patches-sdk-55-pendentes/` removida):** `expo-asset` removido (PR `#42184` upstream); `rn-tourguide` + patch removidos (0 imports no repo); `expo-audio` substituído por `setAudioModeAsync({ interruptionMode: "mixWithOthers" })` em `SoundManager.ts` e callers de voz (`app/ai-chat.tsx`, `src/hooks/useVoiceRecorder.ts`, `src/services/VoiceOutputService.ts`) com 5 testes em `src/services/__tests__/soundManager.test.ts`; `react-native-keyboard-controller` removido após evidência no `SM-X510` de que Android 16 bloqueia reflection em `ViewGroup.mChildren` via `hiddenapi` (`max-target-p`) e `1.20.7` rodou com 0 crashes/0 `hiddenapi`; `react-native-gifted-chat+3.3.2.patch` mantido.
- **Tamagui:** atualizada de `^2.0.0-rc.26` para `^2.7.7` estável (`tamagui`, `@tamagui/core`, `@tamagui/config`) com ajuste mínimo de `@ts-expect-error` em `src/components/tamagui/TButton.tsx`.
- **Android 16 (`SM-X510`) & memória:** APK release SDK 55 final (`216.078.546` bytes — `.so` sem compressão por alinhamento de página 16 KB nas 4 ABIs) validado em todos os fluxos FR-1 + `expo-share-intent` + `dumpsys audio` com 0 erros no `logcat`. Todas as 8 telas passaram no teto de +20% (pico global `301.391 KB` / `294,3 MB` = `-0,77%` vs SDK 54; variação entre `-15,32%` e `+3,27%`), consolidado em [reavaliacao-sdk-55.md](../../docs/reavaliacao-sdk-55.md).

## Spec Change Log

## Review Triage Log

| ID | Camada | Local / Assunto | Veredito | Rota | Evidência |
|---|---|---|---|---|---|
| BH-1 | blind-hunter | `useVoiceRecorder.ts` (`stopRecording` sem `try/finally`) | `high` | `patch` | Confirmado: se `recorder.stop()` lançar erro, `interruptionMode` ficava preso em `"doNotMix"`; corrigido em `voiceRecorderLifecycle.ts` com `try/finally` + teste comportamental. |
| BH-2 | blind-hunter | `useVoiceRecorder.ts` (sem cleanup no unmount) | `high` | `patch` | Confirmado: sair do chat gravando deixava `AudioModule` em `"doNotMix"`; adicionado `useEffect` cleanup chamando `cancelVoiceRecording`. |
| BH-3 | blind-hunter | `SoundManager.ts` (race em `init()` concorrente + retry de `setAudioModeAsync`) | `high` | `patch` | Confirmado: `isLoaded` só era marcado após `await`; adicionado `initPromise`, `initGeneration` (contra `unload()`) e retry em `play()` quando `audioModeConfigured === false`. |
| BH-4 | blind-hunter | `SoundManager.ts` / `reavaliacao-sdk-55.md` (`AudioPlayer.kt` sonification) | `low` | `patch` | Confirmado: o patch antigo trocava `AudioAttributes.DEFAULT` por `USAGE_ASSISTANCE_SONIFICATION`; comentário e relatório atualizados para refletir explicitamente o retorno a `AudioAttributes.DEFAULT` com `handleAudioFocus = false`. |
| BH-5 | blind-hunter | `ai-chat.tsx` leak de player + `VoiceOutputService` `fallbackSequential` | `medium` | `patch` | Confirmado: extraído `playVoiceReplay` liberando o player em `didJustFinish` e garantindo `VOICE_PLAYBACK_AUDIO_MODE` em `fallbackSequential`. |
| BH-6 | blind-hunter | `soundManager.test.ts` blind spots no scanner estático + falta de testes comportamentais | `medium` | `patch` | Confirmado: scanner atualizado com remoção de comentários, balanceamento de parênteses e escopo `app/`+`src/`+`packages/`; adicionados testes executáveis de `voiceRecorderLifecycle` e `playVoiceReplay`. |
| BH-7 | blind-hunter | `TButton.tsx` `@ts-expect-error` vs `onlyAllowShorthands: false` | `low` | `defer` | Confirmado: segue o mesmo padrão já existente em `TCard.tsx`/`TInput.tsx`; alterar `tamagui.config.ts` afeta todo o app e fica diferido para limpeza dedicada. |
| BH-8 | blind-hunter | Perda da guarda upstream de `EdgeToEdgeReactViewGroup.kt` ao deletar `keyboardControllerPatch.test.ts` | `medium` | `patch` | Confirmado: restaurada asserção em `src/components/__tests__/keyboardScroll.test.ts` exigindo `Handler(Looper.getMainLooper()).post {` + `view.removeSelf()` e ausência de reflection em `mChildren`. |
| BH-9 | blind-hunter | Links quebrados em `docs/migracao-sdk-55.md` e entradas antigas em `deferred-work.md` | `medium` / `false` | `patch` (`migracao-sdk-55.md`) | Confirmado para `docs/migracao-sdk-55.md` (links e banner atualizados para `reavaliacao-sdk-55.md`); `false` para `deferred-work.md` (regra de step-04 proíbe editar entradas existentes). |
| BH-10 | blind-hunter | `sprint-status.yaml` em `in-progress` vs spec `in-review` | `false` | rejeitado | `step-05-present.md` atualiza `sprint-status.yaml` para `review` após concluir a revisão. |
| BH-11 | blind-hunter | Detalhes de evidência nas Seções 4 e 6 de `docs/reavaliacao-sdk-55.md` | `low` | `patch` | Confirmado: Seções 4 e 6 refinadas para distinguir smoke de tela vs round-trip já validado em `checklist-android-16.md`, escopo de câmera/foco de áudio e `expo config --type prebuild`. |
| EC-1 | edge-case-hunter | `SoundManager.ts:88-139` (race de `init()` concorrente) | `high` | `patch` | Mesma causa raiz de BH-3: deduplicado com `initPromise`. |
| EC-2 | edge-case-hunter | `SoundManager.ts:121-135` (`unload()` durante `await setAudioModeAsync`) | `high` | `patch` | Mesma causa raiz de BH-3: protegido por contador `initGeneration`. |
| EC-3 | edge-case-hunter | `SoundManager.ts:121-125` (`play()` sem retry após falha em `init()`) | `high` | `patch` | Mesma causa raiz de BH-3: adicionado `audioModeConfigured` com retry em `play()`. |
| EC-4 | edge-case-hunter | `useVoiceRecorder.ts:48-58` (`stop()` rejeita antes de restaurar modo) | `high` | `patch` | Mesma causa raiz de BH-1: corrigido com `try/finally` em `stopVoiceRecording`. |
| EC-5 | edge-case-hunter | `useVoiceRecorder.ts:18-82` (unmount gravando deixa `doNotMix`) | `high` | `patch` | Mesma causa raiz de BH-2: adicionado `useEffect` cleanup no unmount. |
| EC-6 | edge-case-hunter | `useVoiceRecorder.ts:23-46` (double `startRecording` enquanto ativo) | `medium` | `patch` | Confirmado: adicionado `if (state.active) return false;` em `startVoiceRecording` + teste. |
| EC-7 | edge-case-hunter | `soundManager.test.ts:136-154` (chamadas não-inline ignoradas pelo regex) | `medium` | `patch` | Mesma causa raiz de BH-6: substituído por parser balanceado com whitelist das constantes exportadas. |
| VG-1 | verification-gap | `useVoiceRecorder` testado apenas por regex de texto | `high` | `patch` | Pré-verificado (`disposition: patch`): lógica extraída para `voiceRecorderLifecycle.ts` e executada diretamente em `soundManager.test.ts`. |
| VG-2 | verification-gap | `VoiceOutputService.speak` e replay de voz em `ai-chat.tsx` sem teste executável | `medium` | `patch` | Pré-verificado (`disposition: patch`): extraído `playVoiceReplay` com constante compartilhada `VOICE_PLAYBACK_AUDIO_MODE` coberta em runtime por `soundManager.test.ts`. |
| VG-3 | verification-gap | `useVoiceRecorder.ts:53-57` + `ai-chat.tsx:426-427` (`stopRecording` sem `try/finally` e `isTranscribing` preso) | `high` | `patch` | Mesma causa raiz de BH-1/EC-4: adicionado `try/finally` em `stopVoiceRecording` e `try/catch` resetando `isTranscribing` em `ai-chat.tsx`. |
| VG-4 | verification-gap | `useVoiceRecorder` sem cleanup no unmount | `high` | `patch` | Mesma causa raiz de BH-2/EC-5: cleanup no unmount adicionado em `useVoiceRecorder.ts`. |

## Design Notes

- **Tamagui `2.7.7`:** Última versão estável da linha `2.x` (mantém `@tamagui/config/v5` sem salto breaking para `3.x`).
- **Foco de áudio (`expo-audio`):** Conferir em `AudioModule.kt` se `setAudioModeAsync` preserva `interruptionMode` quando omitido pelos callers de voz.

## Verification

**Commands:**
- `npx expo-doctor` -- expected: 20/20 checks passed.
- `npx eslint .` e `npx expo lint` -- expected: 0 erros.
- `Remove-Item expo-env.d.ts -ErrorAction SilentlyContinue; npx tsc --noEmit` -- expected: exit 0.
- `npx vitest run` -- expected: 0 falhas novas (incluindo patches e `SoundManager`).
- `npx expo export --platform web` -- expected: exit 0.
- `npx expo prebuild --clean --platform android` + `.\gradlew.bat assembleRelease` (JDK 17) + `aapt2 dump badging` -- expected: `BUILD SUCCESSFUL` e `targetSdkVersion:'36'`.

**Manual checks (if no CLI):**
- Evidências de fluxos FR-1 e tabela SDK 54 vs SDK 55 (≤ +20% `TOTAL PSS`) no `SM-X510` em `docs/reavaliacao-sdk-55.md`.
