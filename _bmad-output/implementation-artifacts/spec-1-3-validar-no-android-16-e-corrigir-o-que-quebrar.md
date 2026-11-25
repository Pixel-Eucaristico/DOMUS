---
title: 'Story 1.3: Validar no Android 16 e corrigir o que quebrar'
type: 'chore'
created: '2026-11-24'
status: 'done'
baseline_commit: '4ef3eda9c7df6356b3bc5d764d29028955bcd6a8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-2-mirar-a-api-36-no-build-de-release.md'
  - '{project-root}/docs/decisoes-do-dono.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Story 1.2 subiu `compileSdkVersion` e `targetSdkVersion` para 36, mas os efeitos de runtime do Android 16 (edge-to-edge obrigatório, predictive back, redimensionamento em tela grande, bloqueio de HTTP sem cifra e fluxos críticos) ainda não foram validados num aparelho Android 16 real. Além disso, critérios de aparelho das Stories 2.2, 2.3 e 2.6 e itens D6, D15 e D18 foram transferidos para esta checklist.

**Approach:** Remover `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` do `.env` local, compilar e instalar o APK `release` com target API 36 no Samsung Galaxy Tab S9 FE (`SM-X510`, Android 16 / API 36) do dono em retrato e paisagem, executar a checklist completa em ordem (abas principais, introdução por tela, câmera/OCR, backup/Drive, sync e itens transferidos), validar `DebugTools` (2.6) em build `debug`, corrigir eventuais quebras reais encontradas em runtime e salvar a checklist com evidências em `docs/checklist-android-16.md`.

**Decisões do dono (24/11/2026):**
- Remover `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` do `.env` local antes do build; validar Story 1.3 no APK `release` (`assembleRelease`) e validar `DebugTools` (Story 2.6) em build `debug`.
- Aparelho alvo: Samsung Galaxy Tab S9 FE (`SM-X510`, `RX2X101N87Y`), Android 16 (API 36), validado em retrato e paisagem (cobrindo também redimensionamento em tela grande / D6).

## Boundaries & Constraints

**Always:** manter `targetSdkVersion` 36, `compileSdkVersion` 36 e `minSdkVersion` 24; manter todo texto de UI em pt-BR com acentos completos; usar `appAlert`/`appConfirm` (nunca `Alert.alert`); preservar `npx tsc --noEmit`, `npx eslint .` e testes automatizados sem regressão; registrar em `docs/checklist-android-16.md` cada item validado e, se algo reprovar sem correção viável, registrar a decisão explícita do dono.

**Never:** editar `android/` ou `ios/` manualmente (mudança nativa vai em `plugins/` ou `patches/`); alterar `packages/sync`, `replit.*` ou `.gitlab-ci.yml`; subir o Expo SDK (Epic 8); mudar `version` ou `versionCode` (Story 1.6); dar `git push` sem confirmação do dono; expor valores de segredos em logs ou docs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Abas principais e edge-to-edge | Abrir `Início`, `Contas`, `Desejos`, `Temporada` em retrato e paisagem no Android 16 | Nenhuma tela falha; cabeçalhos, listas e barra inferior não ficam sob barras do sistema | Se houver sobreposição ou crash, corrigir layout/insets e revalidar no aparelho |
| Introdução por tela e gesto voltar | Abrir `ScreenIntroModal` / `WelcomeCarousel`, voltar nas abas, na revisão do holerite e no scanner | Modal abre e fecha sem crash Mali; gesto/botão voltar navega conforme esperado com API 36 | Corrigir `BackHandler`/modal se travar ou fechar o app indevidamente |
| Câmera / OCR / NF-e (incl. D18 e 2.2) | Ler NFC-e real (QR ou chave) e capturar holerite/câmera | Permissão funciona, emitente/itens/total/data carregam sem erro; URL `http://` da SEFAZ tratada se falhar por cleartext | Registrar erro de `logcat`; corrigir upgrade para `https://` ou tratamento amigável se reproduzido |
| Backup e Google Drive | Conectar Drive (sem `client_secret`), gerar e restaurar backup local/Drive | Login nativo obtém tokens via `GoogleSignin.getTokens()`, backup/restore completam sem erro | Capturar `logcat` e corrigir falha nativa ou registrar bloqueio |
| Sync Nostr | Abrir tela de sync, criar/parear ou sincronizar grupo | Tela abre sem erro, publica/recebe eventos sem travar a UI | Registrar falha e corrigir se quebrar em runtime |
| Itens transferidos (2.3, 2.6, D15) | Provocar erro HTTP na IA; abrir `DebugTools`, `AnimatedSeasonalTrophy`, `WishlistSearchWebView`; testar PIN PBKDF2 | Erro de IA exibido sem travar; 3 componentes abrem sem erro; tempo do PIN medido (~300 ms) | Corrigir crash ou registrar medição/decisão na checklist |

</frozen-after-approval>

## Code Map

- `app.json` -- declara `compileSdkVersion: 36`, `targetSdkVersion: 36`, `minSdkVersion: 24`, `blockedPermissions` e plugins (`withGwpAsan`, `withOrientationFix`, `withReleaseSigning`)
- `android/app/src/main/AndroidManifest.xml` -- gerado por prebuild (`enableOnBackInvokedCallback="false"`, `windowSoftInputMode="adjustResize"`, `screenOrientation="unspecified"`, remoção de permissões bloqueadas)
- `app/_layout.tsx` e `app/(tabs)/_layout.tsx` -- provedores raiz, barras de sistema e abas (`Início`, `Contas`, `Desejos`, `Temporada`; oculta barra em `isDesktop`)
- `src/components/tour/ScreenIntroModal.tsx`, `src/components/tour/WelcomeCarousel.tsx`, `src/components/shared/TourOverlay.tsx` -- introdução por tela e proteção contra crash Mali (`docs/tour-crash-fixes.md`)
- `app/import-invoice.tsx`, `app/olerite.tsx`, `app/payslips.tsx:71-78` -- câmera/OCR/NF-e e único `BackHandler.addEventListener("hardwareBackPress")` do app
- `app/backup.tsx`, `src/modules/backup/` -- backup local e Google Drive (`GoogleSignin.getTokens()`, sem `client_secret`)
- `app/sync.tsx`, `src/modules/nostrSync.ts` -- sincronização via relays Nostr (Grupo forte e legado)
- `src/modules/security/application/PinAuthService.ts` -- PBKDF2 do PIN (medição de tempo D15)
- `src/components/wishlist/WishlistSearchWebView.tsx`, `AnimatedSeasonalTrophy`, `DebugTools` -- componentes do critério 2.6
- `docs/checklist-android-16.md` -- novo artefato com o resultado da validação no Android 16 (a criar)

## Tasks & Acceptance

**Execution:**
- [x] `.env` -- remover a linha `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` -- impedir vazamento de segredo no bundle local (Stories 1.1 e 1.7)
- [x] `android/` (`./gradlew assembleRelease`) -- compilar o APK `release` com target API 36, confirmar `targetSdkVersion: 36` e ausência de `GOCSPX`/`CLIENT_SECRET` no bundle, e instalar via `adb install -r` no `SM-X510` (`RX2X101N87Y`) -- entregar o binário equivalente ao da Play para validação
- [x] Validação assistida no `SM-X510` (Android 16 / API 36) com `adb logcat` -- percorrer em ordem em retrato e paisagem: abas principais, introdução por tela, gesto voltar, câmera/OCR/NF-e (2.2 e D18), backup/Drive, sync, erro HTTP de IA (2.3), `AnimatedSeasonalTrophy`, `WishlistSearchWebView` (2.6) e tempo do PIN PBKDF2 (D15) -- detectar crashes, sobreposições sob barras do sistema ou regressões reais
- [x] Build `debug` (`./gradlew assembleDebug` / `expo run:android`) -- instalar e validar `DebugTools` (critério 2.6, disponível apenas em `__DEV__`) -- fechar 100% dos critérios transferidos da Story 2.6
- [x] Correções pontuais em `app/`, `src/`, `plugins/` ou `patches/` (somente se algum item reprovar) -- corrigir cada quebra encontrada, adicionar/ajustar testes unitários correspondentes e revalidar no aparelho -- garantir que todos os fluxos funcionem no Android 16
- [x] `docs/checklist-android-16.md` -- registrar aparelho (`SM-X510`, Android 16 / API 36), commit base, variantes de build, resultado de cada item da checklist, medição do PIN (D15) e eventuais decisões do dono -- cumprir AC da Story 1.3 e fechar pendências D6/2.2/2.3/2.6

**Acceptance Criteria:**
- Given o app compilado com target API 36 instalado no aparelho Android 16 do dono, when são abertos em ordem as abas principais, a introdução por tela, a câmera/OCR, o backup e o sync (mais os itens transferidos D6, D15, D18, 2.2, 2.3 e 2.6), then nenhuma tela falha e nenhum conteúdo fica encoberto pelas barras do sistema.
- Given a execução da checklist concluída (com eventuais correções validadas no aparelho), when o resultado é documentado, then `docs/checklist-android-16.md` contém todos os itens, evidências de execução e eventuais decisões registradas pelo dono.
- Given eventuais correções de código aplicadas durante a story, when rodam `npx tsc --noEmit`, `npx eslint .` e `npx vitest run`, then não há erros de tipo, erros de lint nem novas falhas de teste.

## Implementation Notes

- **Crash fatal encontrado e corrigido no Android 16:** pressionar Voltar na tela inicial (`Início`) causava `NullPointerException` em `ViewGroup.dispatchDetachedFromWindow` durante `ActivityThread.handleDestroyActivity`. Causa raiz: `patches/react-native-keyboard-controller+1.18.5.patch` substituía `Handler(Looper.getMainLooper()).post { view.removeSelf() }` por `view.removeSelf()` síncrono em `removeKeyboardCallbacks()`, mutando `mChildren` de `android.R.id.content` durante o `dispatchDetachedFromWindow()`. Corrigido removendo esse hunk do patch (mantendo `cleanNullChildren()` em `dispatchDraw()`), validado com `patch-package --error-on-fail` e `parsePatchFile` em `patches/__tests__/keyboardControllerPatch.test.ts`, e revalidado no APK `release` no `SM-X510` (0 erros no `logcat`).
- **D15 medido, corrigido e revalidado no aparelho:** `PinAuthService.verifyPin` e `setupPin` (30 mil iterações PBKDF2-SHA256 em Hermes no `SM-X510`) levaram ~3–6 s puros (acima do limiar de 300 ms do D15). Extraída orquestração pura em `src/modules/security/application/pinVerificationFlow.ts` com `yieldToPaint()` (macrotask antes do PBKDF2), guarda síncrona contra duplo toque, cancelamento seguro em `RESET`/unmount e tratamento de erro/bloqueio, aplicada em `src/components/security/LockScreen.tsx`, `src/hooks/useSecuritySetup.ts`, `src/modules/security/application/securitySetupReducer.ts` e `app/security-settings.tsx` (`"Salvando PIN…"` / `"Verificando PIN…"` com botão `X` desabilitado), com suítes em `securitySetupReducer.test.ts` e `pinVerificationFlow.test.ts`, e revalidada visualmente no APK `release` no `SM-X510`.
- **D18 reproduzido, corrigido e revalidado no aparelho:** um QR Code `http://` da SEFAZ lido via `Galeria` falhou no WebView em target 36 por bloqueio cleartext (*"Erro ao carregar a página da SEFAZ. Verifique sua conexão."*). Corrigido promovendo `http://` → `https://` em `packages/parsers/src/qrcodeParser.ts` (`upgradeSefazHttpToHttps`, com teste em `packages/parsers/__tests__/qrcodeParser.test.ts`), e revalidado no APK `release` no `SM-X510` (o mesmo QR abriu `https://www.nfce.fazenda.sp.gov.br/...` sem erro).
- **Ajuste solicitado pelo dono durante a sessão:** atualizado o ID de Associado Amazon de `willianquinti-20` para `willianquin03-20` em `packages/wishlist/src/affiliateConfig.ts`, derivado `src/components/monetization/AffiliateLinks.ts` a partir de `AFFILIATE_CONFIG` e coberto por `packages/wishlist/__tests__/affiliateConfig.test.ts`.
- **Checklist gravada:** `docs/checklist-android-16.md` com todos os fluxos validados no `SM-X510` em paisagem e retrato (4 abas, introduções, `app/payslips.tsx` com `BackHandler`, câmera/galeria/D18, backup local + restauração + Drive, sync Nostr, 2.3, 2.6, D6, D15 e D18; leitura de um cupom fiscal NFC-e físico real para Story 2.2 registrada como pendente de cupom físico em mãos do dono).

## Spec Change Log

- **25/11/2026 (pedido direto do dono durante a execução):** Atualizado o ID de Associado Amazon de `willianquinti-20` para `willianquin03-20` em `packages/wishlist/src/affiliateConfig.ts` e derivado `src/components/monetization/AffiliateLinks.ts` a partir de `AFFILIATE_CONFIG` (com teste em `packages/wishlist/__tests__/affiliateConfig.test.ts`).

## Review Triage Log

| ID | Camada | Achado | Veredito | Rota | Evidência verificada |
|---|---|---|---|---|---|
| BH-1 | blind-hunter | `patches/react-native-keyboard-controller+1.18.5.patch` falha no parser do `patch-package` (linha 85 em branco extra) | high | patch | Confirmado: `parsePatchFile` lançava `hunk header integrity check failed`, quebrando `postinstall`/`npm ci`. Linha 85 removida. |
| BH-2 | blind-hunter | `keyboardControllerPatch.test.ts` não valida parse/aplicação do patch | high | patch | Confirmado: teste só checava substrings. Atualizado para rodar `patch-package`'s `parsePatchFile` e validar o `.kt` aplicado. |
| BH-3 | blind-hunter | Estado de espera PBKDF2 em `LockScreen` e `useSecuritySetup` não cede macrotask antes de `pbkdf2Async` | high | patch | Confirmado: `@noble/hashes` usa microtasks (`async () => {}`), podendo travar antes do paint do spinner. Adicionado `yieldToPaint()` (`setTimeout(0)`). |
| BH-4 | blind-hunter | `LockScreen.tsx` não captura erro em `verifyPin` / `loadSettings` | high | patch | Confirmado: `try/finally` sem `catch` gerava unhandled rejection e nenhum feedback ao usuário. Corrigido via `createLockScreenPinVerifier`. |
| BH-5 | blind-hunter | `LockScreen.tsx` limpa `pinVerifying` antes de `loadSettings`, sem guarda `useRef` e com `disabled` redundante | medium | patch | Confirmado: `setPinVerifying(false)` rodava antes de `loadSettings` e `disabled={isPinLocked \|\| pinVerifying}` era morto no ramo `else`. Corrigido. |
| BH-6 | blind-hunter | `useSecuritySetup.ts` sem `try/catch` em outros fluxos `saving`, duplo `loadSettings` e sem contagem de bloqueio na troca de PIN | high | patch | Confirmado: `handlePinConfirm`, `handleChangeConfirmPin`, `handleChooseMethod` e `handleBiometricToDisable` podiam prender `saving: true`; duplicava `loadSettings()` e omitia `locked` em `handleChangeCurrentPin`. Corrigido via `createSecuritySetupRunner` e `try/catch`. |
| BH-7 | blind-hunter | `app/security-settings.tsx` sem texto no spinner e permite cancelar (`X`) com PBKDF2 em voo | medium | patch | Confirmado: `<ActivityIndicator />` vinha sem rótulo e botão `X` disparava `RESET` sem cancelar o efeito em voo. Adicionado rótulo (`Verificando PIN…`/`Salvando PIN…`), botão desabilitado durante `saving` e guarda `requestId` no cancelamento. |
| BH-8 | blind-hunter | `securitySetupReducer.ts` não reseta `saving: false` em outras transições e faltam testes dos hooks/LockScreen | medium | patch | Confirmado: adicionados `saving: false` em todas as transições do reducer e criadas suítes para `pinVerificationFlow` e todas as transições do reducer. |
| BH-9 | blind-hunter | `AffiliateLinks.ts` duplica a tag Amazon e ajuste não estava no `Spec Change Log` | medium | patch | Confirmado: `AffiliateLinks.ts` agora deriva de `AFFILIATE_CONFIG.amazon.tag`; pedido explícito do dono registrado em `Spec Change Log`. |
| BH-10 | blind-hunter | `docs/checklist-android-16.md` e spec citavam token literal proibido pelo `git grep` em `docs/decisoes-do-dono.md` | high | patch | Confirmado para `docs/checklist-android-16.md` (fora de `_bmad-output/`): substituído por descrição sem o token literal; `_bmad-output/` já é excluído no critério da Story 1.1 e o bloco `<frozen-after-approval>` não é editado. |
| BH-11 | blind-hunter | `docs/checklist-android-16.md` omitia retrato em `Contas`/`Desejos`/`Temporada`, `app/payslips.tsx` (`BackHandler`), backup local/restore e revalidação do spinner D15 | high | patch | Confirmado: executados no `SM-X510` com o APK `release` recompilado e documentados com evidência concreta em `docs/checklist-android-16.md`. |
| BH-12 | blind-hunter | Análise D18 (`http://` SEFAZ) imprecisa em `docs/checklist-android-16.md` e decisão do dono/tracking incompletos | high | patch | Confirmado: `qrcodeParser.ts` aceita `http://` SEFAZ e envia ao `WebViewScreen`; corrigida a análise, validado comportamento no aparelho e registrada decisão/pendência real na checklist. |
| VG-1 | verification-gap | Teste do patch do keyboard-controller não valida `parsePatchFile` nem aplicação | high | patch | Pré-verificado (mesma causa raiz de BH-2): coberto por `parsePatchFile` + checagem do `.kt` aplicado em `keyboardControllerPatch.test.ts`. |
| VG-2 | verification-gap | `useSecuritySetup` (busy state e recuperação de erro) sem cobertura automatizada | medium | patch | Pré-verificado: extraído `createSecuritySetupRunner` puro (sem `react-native`) e coberto em `pinVerificationFlow.test.ts`. |
| VG-3 | verification-gap | `LockScreen` (verifying state e guarda de reentrância) sem cobertura automatizada | medium | patch | Pré-verificado: extraído `createLockScreenPinVerifier` puro (sem `react-native`) e coberto em `pinVerificationFlow.test.ts`. |
| VG-4 | verification-gap | Tag Amazon atualizada sem teste cobrindo `AmazonStrategy` e `AFFILIATE_URLS` | medium | patch | Pré-verificado: criado `packages/wishlist/__tests__/affiliateConfig.test.ts`. |
| VG-O1 | verification-gap | Hunk malformado na linha 85 de `react-native-keyboard-controller+1.18.5.patch` | high | patch | Confirmado (mesma causa raiz de BH-1): linha 85 removida. |
| VG-O2 | verification-gap | `LockScreen.tsx` sem `catch` e limpando `pinVerifying` antes de `loadSettings()`/`setPinError()` | high | patch | Confirmado (mesma causa raiz de BH-4/BH-5): corrigido via `createLockScreenPinVerifier`. |
| EC-1 | edge-case-hunter | Linha 85 em branco excede contagem do hunk em `react-native-keyboard-controller+1.18.5.patch` | high | patch | Confirmado (mesma causa raiz de BH-1): linha 85 removida. |
| EC-2 | edge-case-hunter | `LockScreen.tsx:96-101` sem `catch` ao redor de `PinAuthService.verifyPin` | high | patch | Confirmado (mesma causa raiz de BH-4): corrigido via `createLockScreenPinVerifier`. |
| EC-3 | edge-case-hunter | `LockScreen.tsx:96-120` limpa `pinVerifying` antes de `loadSettings()` atualizar bloqueio/erro | medium | patch | Confirmado (mesma causa raiz de BH-5): `setPinVerifying(false)` agora roda no `finally` após `loadSettings` e `setPinError`. |
| EC-4 | edge-case-hunter | `LockScreen.tsx:90-95` sem guarda síncrona de reentrância contra duplo toque durante `Haptics` | medium | patch | Confirmado (mesma causa raiz de BH-5): flag `inFlight` síncrona em `createLockScreenPinVerifier`. |
| EC-5 | edge-case-hunter | `useSecuritySetup.ts:140-175` sem guarda de cancelamento no `RESET` durante `verifyToDisable` | high | patch | Confirmado (mesma causa raiz de BH-7): `requestId` invalidado em `cancel()` no `RESET`/unmount impede `disableLock()` após cancelamento. |
| EC-6 | edge-case-hunter | `useSecuritySetup.ts:141-145` sem guarda síncrona contra duplo toque em `handleVerifyPinToDisable` | medium | patch | Confirmado (mesma causa raiz de BH-6): `inFlight` síncrono em `createSecuritySetupRunner`. |
| EC-7 | edge-case-hunter | `useSecuritySetup.ts:201-225` sem guarda de cancelamento no `RESET` durante `handleChangeCurrentPin` | high | patch | Confirmado (mesma causa raiz de BH-7): `requestId` invalidado em `cancel()` impede `CHANGE_CURRENT_DONE`/`SET_ERROR` obsoletos. |
| EC-8 | edge-case-hunter | `useSecuritySetup.ts:202-206` sem guarda síncrona contra duplo toque em `handleChangeCurrentPin` | medium | patch | Confirmado (mesma causa raiz de BH-6): `inFlight` síncrono em `createSecuritySetupRunner`. |
| EC-9 | edge-case-hunter | `useSecuritySetup.ts:157-168` cai em bloqueio de 30s quando `result.reason === "not_configured"` | medium | patch | Confirmado: `formatPinFailureMessage` trata `"not_configured"` explicitamente. |
| EC-10 | edge-case-hunter | `useSecuritySetup.ts:210-221` omite `locked` (com segundos) e `not_configured` em `handleChangeCurrentPin` | medium | patch | Confirmado (mesma causa raiz de BH-6): `formatPinFailureMessage` trata ambos os casos. |
| EC-11 | edge-case-hunter | `useSecuritySetup.ts:118-137` sem `try/catch` em `handlePinConfirm` prende `saving: true` | high | patch | Confirmado (mesma causa raiz de BH-6): `savePin` envolve `setupPin` em `try/catch` e despacha `SET_ERROR`. |
| EC-12 | edge-case-hunter | `useSecuritySetup.ts:233-250` sem `try/catch` em `handleChangeConfirmPin` prende `saving: true` | high | patch | Confirmado (mesma causa raiz de BH-6): `savePin` envolve `setupPin` em `try/catch` e despacha `SET_ERROR`. |
| EC-13 | edge-case-hunter | `securitySetupReducer.ts:38-74` preserva `saving: true` residual em outras transições | medium | patch | Confirmado (mesma causa raiz de BH-8): todas as transições agora resetam `saving: false`. |
| EC-14 | edge-case-hunter | Claim: abas principais em retrato/paisagem só tinham `Início` em retrato | high | patch | Confirmado (mesma causa raiz de BH-11): validando `Contas`, `Desejos` e `Temporada` em retrato no `SM-X510` e atualizando a checklist. |
| EC-15 | edge-case-hunter | Claim: câmera/OCR/NF-e (2.2 e D18) marcados concluídos apesar de holerite/OCR e `http://` SEFAZ não executados | high | patch | Confirmado (mesma causa raiz de BH-11/BH-12): validando `app/payslips.tsx` (holerite + `BackHandler`) e `http://` SEFAZ (D18) no `SM-X510` e registrando status preciso na checklist. |

## Verification

**Commands:**
- `adb shell getprop ro.build.version.release` e `ro.build.version.sdk` -- expected: `16` e `36`
- `aapt2 dump badging <apk>` (ou inspeção do manifesto/APK) -- expected: `targetSdkVersion:'36'` e ausência de `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` / `GOCSPX` no bundle
- `npx tsc --noEmit` -- expected: 0 erros (sem `expo-env.d.ts`)
- `npx eslint .` -- expected: 0 erros
- `npx vitest run` -- expected: sem novas falhas além da linha de base conhecida de Windows/data

**Manual checks (if no CLI):**
- Inspeção visual e interação direta no aparelho Android 16 em todos os itens de `docs/checklist-android-16.md` com `adb logcat` limpo de exceções fatais.
