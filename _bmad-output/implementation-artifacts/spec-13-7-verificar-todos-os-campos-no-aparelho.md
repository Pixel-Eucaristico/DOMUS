---
title: 'Story 13.7: Verificar todos os campos no aparelho'
type: 'chore'
created: '2026-11-25'
status: 'done'
baseline_commit: 'a88548f97539d2786e641efc37cfe3aaace2b1ea'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-20-teclado.md'
  - '{project-root}/docs/checklist-android-16.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** As Stories 13.1 a 13.6 unificaram o teclado no `react-native-keyboard-controller` e protegeram cada superfície com testes estáticos e Playwright web, mas o comportamento real do teclado virtual no Android 16 (subida de campos, folga mínima de 8 dp, botão principal no 1º toque, fechamento sem faixa em branco e modais aninhados) ainda não foi validado ponta a ponta no aparelho.

**Approach:** Executar no Samsung Galaxy Tab S9 FE (`SM-X510`, Android 16 / API 36, retrato e paisagem) e no navegador web a verificação de todos os grupos de locais com campos da Sprint Change Proposal de 20/10/2026 (telas com formulário, modais com formulário, modais de busca/diálogo, chat da IA, barra de chave da NF sobre a câmera e revisão de holerite), corrigir qualquer cobertura de campo ou regressão real encontrada e salvar o resultado com evidências em `docs/checklist-teclado-android-16.md`, vinculado a `docs/checklist-android-16.md`.

**Decisões do dono (25/11/2026):**
- Aparelho físico alvo: Samsung Galaxy Tab S9 FE (`SM-X510`, `RX2X101N87Y`, Android 16 / API 36) em retrato e paisagem + navegador web (`412×900` e `800×360`); subitens de celular ≤ 640 dp e Android 7–10 registrados como `N/A (sem aparelho)`.
- `DebugTools` (`__DEV__`) validado no build `debug` no `SM-X510` (reinstalando o APK `release` ao final) e `WelcomeCarousel` (onboarding) validado no navegador web limpo sem apagar os dados do tablet.

## Boundaries & Constraints

**Always:** validar todos os locais da tabela §1 da Sprint Change Proposal (telas, modais com formulário, buscas/diálogos, chat da IA, `QrScanScreen` e `PayslipReview`); garantir folga ≥ 8 dp acima do teclado, botão principal alcançável no 1º toque e restauração sem faixa em branco ao fechar o teclado (FR-29); manter um único sistema de teclado (`react-native-keyboard-controller`, sem `KeyboardAvoidingView` do RN nem `AvoidSoftInput`); manter textos em pt-BR com acentos e usar apenas `appAlert`/`appConfirm`; manter `npx tsc --noEmit`, `npx eslint .` e `npx vitest run` sem novas falhas.

**Never:** editar `android/`, `ios/`, `packages/sync`, `replit.*` ou `.gitlab-ci.yml`; adicionar nova dependência sem aprovação; subir o Expo SDK (Epic 8); mudar `version` ou `versionCode` (Story 1.6); dar `git push` sem confirmação do dono; expor valores de segredos em logs ou docs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Telas com formulário (`add-transaction`, `ai-settings`, `backup`, `about`, `ocr-settings`, `sync`, `ParsedScreen`, `PayslipReview`) | Focar campos do topo ao fim em retrato e paisagem no Android 16 e no navegador | Campo focado fica ≥ 8 dp acima do teclado; botão principal alcançável no 1º toque; fechar o teclado não deixa faixa vazia | Se algum campo ficar encoberto ou botão inacessível, corrigir no componente/layout, atualizar testes e revalidar no aparelho |
| Modais com formulário (`TransactionBottomSheet`, `AccountFormModal`, `CreateListModal`, `AddItemModal`) | Abrir modal, focar campos (incl. `autoFocus` e itens/peças), tocar no fundo escuro com teclado aberto e fechar | Folha sobe acima do teclado com cabeçalho preservado e botão principal no rodapé/rolagem; 1º toque no fundo só fecha o teclado, 2º fecha o modal; reabrir vem sem sobra | Corrigir `KeyboardSheet`/modal se houver faixa em branco, corte ou fechamento acidental |
| Buscas e diálogos em modal (`CategoryPickerModal`, `StoreGridModal`, `AccountPicker` compacto, "APAGAR TUDO", `WelcomeCarousel`, `DebugTools`) | Focar busca/campo, filtrar até 0 resultados, abrir modal aninhado com teclado aberto | Campo e lista/botões ficam acima do teclado; modal aninhado fecha sem quebrar o modal pai; fechar teclado restaura o tamanho original | Corrigir `KeyboardListSheet`/modal se a busca perder foco ou sobrar espaço |
| Chat da IA (`app/ai-chat.tsx`) | Focar caixa com/sem banner de chave, digitar 5+ linhas, enviar com teclado aberto, entrar/sair repetidamente | Caixa cola acima do teclado sem deslocamento duplo; cabeçalho visível; sair 5–10x sem crash `null child`; modais da 13.3 continuam subindo depois | Corrigir `chatKeyboardLayout`/`ai-chat.tsx` se houver lacuna, corte ou crash |
| Chave manual da NF sobre a câmera (`QrScanScreen`) | Abrir `Importar NF` → `QR Code` → `Digitar Chave` em retrato e paisagem; colar chave com espaços; acionar `Cancelar` e troca de aba | Barra sobe acima do teclado (`autoFocus`), modo compacto funciona em janela baixa, colagem normaliza 44 dígitos, `Cancelar`/aba fecha o teclado sem piscar a câmera | Corrigir `qrKeyBarLayout`/`QrScanScreen` se a barra cobrir o cabeçalho ou descer fora da tela |

</frozen-after-approval>

## Code Map

- `docs/checklist-teclado-android-16.md` (novo) -- checklist completa de verificação dos 5 grupos de campos no Android 16 e no navegador, referenciada por `docs/checklist-android-16.md`
- `docs/checklist-android-16.md` -- adicionar link cruzado para `docs/checklist-teclado-android-16.md` ("anda junto da checklist da Story 1.3")
- `components/KeyboardAwareScrollViewCompat.tsx`, `app/add-transaction.tsx`, `app/ai-settings.tsx`, `app/backup.tsx`, `app/about.tsx`, `app/ocr-settings.tsx`, `app/sync.tsx`, `src/components/invoice/ParsedScreen.tsx`, `src/components/payslip/PayslipReview.tsx` -- telas com formulário (13.2)
- `src/components/shared/KeyboardSheet.tsx`, `src/components/transactions/TransactionBottomSheet.tsx`, `src/components/shared/AccountFormModal.tsx`, `src/components/wishlist/CreateListModal.tsx`, `src/components/wishlist/AddItemModal.tsx` -- modais com formulário (13.3)
- `src/components/shared/KeyboardListSheet.tsx`, `src/components/shared/CategoryPickerModal.tsx`, `src/components/wishlist/StoreGridModal.tsx`, `src/components/shared/AccountPicker.tsx`, `src/components/tour/WelcomeCarousel.tsx`, `src/components/debug/DebugTools.tsx` -- buscas e diálogos em modal (13.4)
- `app/ai-chat.tsx`, `src/components/ai/chatKeyboardLayout.ts`, `patches/react-native-gifted-chat+3.3.2.patch` -- chat da IA com provider único (13.5)
- `src/components/invoice/QrScanScreen.tsx`, `src/components/invoice/qrKeyBarLayout.ts` -- chave manual sobre câmera (13.6)
- `src/components/__tests__/keyboardScroll.test.ts` -- suíte guarda do Epic 13 (não enfraquecer)

## Tasks & Acceptance

**Execution:**
- [x] `SM-X510` (Android 16, APK `release` já instalado com `a88548f` e recompilado pós-correção) -- testar em retrato e paisagem (com teclado virtual real aberto/fechado e `adb logcat` limpo) todos os 5 grupos de campos: 8 telas de formulário, 4 modais com formulário, buscas/diálogos (incl. aninhados e `__DEV__` no build `debug`), chat da IA (texto longo, 5 ciclos abrir/fechar, 5 ciclos sair/entrar) e `QrScanScreen` (chave manual + 44 dígitos + Cancelar/aba) -- provar FR-29 em hardware Android 16 real
- [x] Build web (`npx expo export --platform web` + verificação automatizada no navegador em `412×900` e `800×360`) -- validar renderização, foco, alcance do botão principal e ausência de erros de página nos grupos alcançáveis na web (incl. `WelcomeCarousel`) -- cumprir o critério "no Android 16 e no navegador"
- [x] Correções pontuais em `app/` ou `src/components/` -- corrigido o bug real de `0 px` do `<FlashList>` no `CategoryPickerModal` e no `StoreGridModal` (`maxHeightRatio` → `heightRatio` no `KeyboardListSheet`), adicionada guarda estática em `keyboardScroll.test.ts` e revalidado no APK `release` no `SM-X510` -- garantir 100% dos campos utilizáveis
- [x] `docs/checklist-teclado-android-16.md` e `docs/checklist-android-16.md` -- registrar cada local da tabela §1 (+ `PayslipReview`) com evidência de Android 16 (retrato/paisagem) e web, bug/correção revalidada e link cruzado com a checklist da Story 1.3 -- cumprir os dois ACs da Story 13.7

**Acceptance Criteria:**
- Given a lista completa de locais com campo da Sprint Change Proposal de 20/10/2026 (mais `PayslipReview`), when cada grupo é testado no Android 16 real com teclado virtual aberto e no navegador web, then nenhum campo fica coberto pelo teclado, o botão principal fica alcançável e fechar o teclado não deixa faixa em branco.
- Given a execução concluída (com eventuais correções revalidadas), when a documentação é salva, then `docs/checklist-teclado-android-16.md` registra o resultado de cada campo no Android 16 e na web e está vinculada a `docs/checklist-android-16.md`.
- Given eventuais correções de código aplicadas, when rodam `npx tsc --noEmit`, `npx eslint .` e `npx vitest run` (em especial `keyboardScroll.test.ts`), then não há erros de tipo, erros de lint nem novas falhas.

## Implementation Notes

- **Bug real encontrado no Android 16 (`SM-X510`) e corrigido:**
  - `src/components/shared/CategoryPickerModal.tsx` e `src/components/wishlist/StoreGridModal.tsx` renderizavam `<FlashList>` dentro de `<KeyboardListSheet maxHeightRatio={...}>` (sem `heightRatio`). Sem altura definida no contêiner flex, `@shopify/flash-list` v2 colapsava para `0 px` no Android nativo, ocultando itens e `ListEmptyComponent`.
  - Corrigido passando `heightRatio={0.8}` em `CategoryPickerModal.tsx` e `heightRatio={0.75}` em `StoreGridModal.tsx`, documentando o contrato em `KeyboardListSheet.tsx` e adicionando regra estática + teste unitário em `src/components/__tests__/keyboardScroll.test.ts` (`FlashList em KeyboardListSheet sem heightRatio=`).
  - APK `release` recompilado (`assembleRelease -PreactNativeArchitectures=arm64-v8a`), reinstalado no `SM-X510` e ambos os modais revalidados visualmente com sucesso.
- **Cobertura no aparelho (`SM-X510`, Android 16 / API 36) e web (`412×900` e `800×360`):**
  - Todos os 5 grupos da tabela §1 (+ `PayslipReview`) validados e registrados com medições de folga (`clearance_dp`) em `docs/checklist-teclado-android-16.md`, vinculado em `docs/checklist-android-16.md`.
  - `DebugTools` e `ocr-settings` (`__DEV__`) validados no build `debug` conectado ao Metro; `app-release.apk` final reinstalado no tablet e `accelerometer_rotation = 1` restaurado ao fim.
  - `WelcomeCarousel` validado em navegador web limpo sem apagar dados do tablet; celular ≤ 640 dp e Android 7–10 registrados como `N/A (sem aparelho)` conforme decisão do dono.

## Spec Change Log

## Review Triage Log

| # | Layer | Location | Verdict | Route | Evidence & Action |
|---|---|---|---|---|---|
| 1 | edge-case-hunter | `src/components/__tests__/keyboardScroll.test.ts:903-905` | medium | patch | Confirmado: `!/(?:^|\s)heightRatio\s*=/.test(tag.attrs)` aceitava `heightRatio={undefined}`, `0` e ternário com `undefined`. Corrigido validando literal numérico em `(0, 1]` em `tag.exprs.heightRatio` + testes negativos. |
| 2 | edge-case-hunter | `src/components/__tests__/keyboardScroll.test.ts:901-902` | medium | patch | Confirmado: `listExpr` não expandia variáveis/componentes locais (`expandLocalJsx`) nem aliases de `FlashList`. Corrigido usando `expandLocalJsx(listExpr, source)` e resolução de aliases + testes unitários. |
| 3 | edge-case-hunter | `docs/checklist-teclado-android-16.md:73` | medium | patch | Confirmado: `y=1357..1504` vs `ime_top=1521` dá `17 px` (`7,6 dp` em `scale=2,25`), `1 px` abaixo de `18 px` (`8 dp`) por arredondamento de `CHAT_KEYBOARD_GAP (2 dp) + inputRow paddingVertical (6 dp)` (texto interno com `paddingBottom: 8 dp` fica a `15,6 dp`). Documentado de forma transparente na checklist sem quebrar a constante da 13.5. |
| 4 | edge-case-hunter | `docs/checklist-teclado-android-16.md:28-63` | medium | patch | Confirmado: faltava evidência em paisagem para modais e especificação clara de quais telas foram medidas só em retrato. Coletada evidência real em paisagem (`2304×1440`) no `SM-X510` para `AccountFormModal`, `StoreGridModal` e `OleriteCapturePreviewModal` (além de `CategoryPickerModal`, `ai-chat` e `QrScanScreen`) e explicitado o escopo por linha na checklist. |
| 5 | blind-hunter | `src/components/olerite/OleriteCapturePreviewModal.tsx` | medium | patch | Confirmado: modal presente em `MODAL_FORMS` ausente da checklist. Validado no `SM-X510` em retrato (`+156,9 dp`, `Salvar Leitura` visível) e paisagem (`+120,9 dp`) e adicionado à §2 da checklist. |
| 6 | blind-hunter | `docs/checklist-teclado-android-16.md` (`ai-chat` `+7,6 dp`) | medium | patch | Mesmo ponto do item #3 (arredondamento de `1 px` na borda externa do `EditText` em `scale=2,25` sobre `2 + 6 = 8 dp`). Esclarecido explicitamente na §4 da checklist. |
| 7 | blind-hunter | `docs/checklist-teclado-android-16.md` (aninhamento, paisagem, colagem e envio) | medium | patch | Confirmado: faltava evidência gravada de modal aninhado sobre `KeyboardSheet`, envio com teclado aberto no chat e normalização com espaços no `QrScanScreen`. Todos executados no `SM-X510` (bateria 8) e registrados na checklist. |
| 8 | blind-hunter | `src/components/__tests__/keyboardScroll.test.ts:787-817` | high | patch | Confirmado: `keyboardListSheetViolations` não protegia `{ height }` nem `listFill: { flexGrow: 1 }` no `KeyboardListSheet.tsx`. Extraído `listSheetSize` em `keyboardSheetLayout.ts` (+ testes unitários) e exigido `listSheetSize(…)`, `listFill: { flexGrow: 1 }` e `fillList && s.listFill` em `keyboardListSheetViolations`. |
| 9 | blind-hunter | `src/components/__tests__/keyboardScroll.test.ts:901-905` | medium | patch | Mesmo grupo dos itens #1 e #2 (validação de `tag.exprs.heightRatio`, `expandLocalJsx` e aliases de `FlashList`). Corrigido e coberto por testes. |
| 10 | blind-hunter | `src/components/shared/KeyboardListSheet.tsx:45-52,138` | medium | patch | Confirmado para `heightRatio` sem clamp (`<= 0`, `> 1`, `NaN`): resolvido no `listSheetSize` em `keyboardSheetLayout.ts` (clampa para `(0, 1]` e cai em `maxHeightRatio` para valores inválidos). Parte de união discriminada nas props rejeitada como `low` para não alterar superfície pública em `patch`. |
| 11 | blind-hunter | `StoreGridModal.tsx` / `CategoryPickerModal.tsx` (trade-off R-5) | low | patch | Confirmado como trade-off intencional: `@shopify/flash-list` v2 colapsa para `0 px` no Android nativo sem altura definida (`heightRatio`). Documentada a exceção intencional ao R-5 na §6 da checklist. |
| 12 | blind-hunter | `docs/checklist-teclado-android-16.md` §7 (lista de testes e `vitest` completo) | medium | patch | Confirmado: `infoTipPlacement.test.ts` é do Epic 11 e faltavam `keyboardScrollDefaults.test.ts`, `keyboardControllerPatch.test.ts` e o resultado da suíte inteira (`npx vitest run`). Corrigido na §7 da checklist. |
| 13 | blind-hunter | `sprint-status.yaml:178` (`in-progress`) e `CreateListModal` `autoFocus` | false / medium | rejected / defer | `sprint-status.yaml` em `in-progress` durante `step-04-review` é `false` (o `step-05-present.md` sincroniza para `review` após a revisão). Já o `autoFocus` do `CreateListModal` no Android 16 (vs `CategoryPickerModal`, que abriu o IME automaticamente) foi esclarecido na checklist e registrado como `D49` em `deferred-work.md`. |
| 14 | verification-gap | `KeyboardListSheet.tsx:131-138,162` (contrato `heightRatio`/`listFill`) | high | patch | Pré-verificado (mesmo grupo do item #8): extraído `listSheetSize` em `keyboardSheetLayout.ts`, testado em `keyboardSheetLayout.test.ts` (69 testes) e amarrado em `keyboardListSheetViolations` (`keyboardScroll.test.ts`, 279 testes). |
| 15 | verification-gap | `src/components/__tests__/keyboardScroll.test.ts:901-905` (`heightRatio={undefined}`/`0`) | medium | patch | Pré-verificado (mesmo grupo do item #1): `modalListViolations` agora valida `tag.exprs.heightRatio` como literal numérico em `(0, 1]` com testes para `undefined`, `0`, `1.5` e condicional. |

## Verification

**Commands:**
- `npx vitest run src/components/__tests__/keyboardScroll.test.ts src/components/shared/__tests__/ src/components/invoice/__tests__/ src/components/ai/__tests__/chatKeyboardLayout.test.ts src/components/tour/__tests__/welcomeCarouselLayout.test.ts` -- expected: 100% passando
- `npx expo export --platform web` -- expected: exit 0
- `npx tsc --noEmit` -- expected: 0 erros (sem `expo-env.d.ts`)
- `npx eslint .` -- expected: 0 erros

**Manual checks (if no CLI):**
- Inspeção visual das capturas no `SM-X510` (Android 16) com o teclado virtual aberto em cada grupo de campos e no navegador web, com `adb logcat` sem erros fatais do app.
