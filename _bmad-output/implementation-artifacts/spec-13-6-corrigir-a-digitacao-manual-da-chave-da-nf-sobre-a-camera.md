---
title: 'Story 13.6: corrigir a digitação manual da chave da NF sobre a câmera'
type: 'bugfix'
created: '2026-10-28'
status: 'done'
baseline_commit: '5181e97'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-20-teclado.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-13-1-sistema-unico-de-teclado.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-13-2-padronizar-a-rolagem-das-telas-com-campos.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-13-3-fazer-os-modais-com-formulario-subirem.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-13-4-fazer-as-buscas-e-dialogos-em-modal-subirem.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Na tela de QR da importação de nota (`QrScanScreen`, estado `"qr"` de `app/import-invoice.tsx`), "Digitar Chave" troca a barra de baixo pelo campo da chave de acesso (44 dígitos, `autoFocus`, `keyboardType="number-pad"`) com "Cancelar" e "Consultar SEFAZ". A 13.1 já prendeu essa barra ao teclado com `KeyboardStickyView` e `offset={{ closed: 0, opened: insets.bottom }}`, como correção mínima. Ficaram três buracos:

- **Teclado mais baixo que `insets.bottom`** (teclado físico com só a faixa de sugestões, teclado flutuante, alguns teclados de terceiros): `translateY = −teclado + insets.bottom` fica positivo e a barra **desce** para fora da tela. É o R3 da 13.2, corrigido só no `ParsedScreen` e deixado para cá.
- **Janela baixa** (paisagem — o `app.json` tem `"orientation": "default"` —, fonte do sistema grande, celular pequeno): a barra erguida (~170 dp + `insets.bottom`) passa por cima do cabeçalho com o X e as abas e, no limite, empurra o próprio campo para cima da borda da tela. Nenhum cálculo olha a altura da janela.
- **Nada protege a regra.** A guarda `keyboardScroll.test.ts` só cita o `QrScanScreen` como exceção de descoberta ("Story 13.6"). Trocar o `KeyboardStickyView`, somar um `KeyboardAvoidingView` ou voltar ao `opened: insets.bottom` literal passa sem aviso.

**Approach:** O mesmo molde do rodapé do `ParsedScreen` (13.2, `parsedFooterLayout.ts`): uma função pura sem `react-native` decide o `offset.opened` (limitado pela altura do teclado) e se a barra entra em modo compacto quando não cabe entre o cabeçalho e o teclado. O `QrScanScreen` lê a janela (`useWindowDimensions`), o teclado (`useKeyboardState`) e as alturas medidas no `onLayout`, e passa o resultado ao `KeyboardStickyView`. A conta do `offset.opened` passa a ter um lugar só, usado pelas duas telas. A guarda ganha um bloco para o `QrScanScreen`.

## Boundaries & Constraints

**Always:**
- Um só sistema de teclado: o keyboard-controller com o `KeyboardProvider` da raiz (13.1). Na barra, só o `KeyboardStickyView`; nenhuma segunda compensação na tela (`KeyboardAvoidingView`, `KeyboardAwareScrollView`/Compat, `KeyboardSafeView`).
- O `KeyboardStickyView` da barra **nunca** é desligado (`enabled={false}`): diferente do rodapé do `ParsedScreen`, aqui o campo mora dentro da barra; desligar esconderia o campo.
- Com o teclado aberto, o campo e os dois botões ficam visíveis acima do teclado, com folga ≥ 8 dp (FR-29); hoje a folga é o `paddingBottom` de 20.
- Ao fechar o teclado, a barra volta exatamente para onde estava (`bottom: 0`, `paddingBottom: insets.bottom + 20`), sem pular no meio da animação.
- Nenhuma View animada maior que a tela (Mali, `docs/tour-crash-fixes.md`): a barra é o único `Animated.View` (translação), a câmera continua `absoluteFill` e o escurecimento continua com `flex`.
- Texto de UI em pt-BR com acentos; os textos atuais não mudam. Alerta só por `appAlert` (a validação "Chave Inválida" fica no `useInvoiceScanner`).
- Nenhuma mudança em `android/`, `ios/` ou `packages/sync`. Nenhuma dependência nova.

**Never:**
- Mexer no chat da IA (13.5) nem nos arquivos dele: `src/components/ai/`, `app/ai-chat.tsx`. A guarda `src/components/__tests__/keyboardScroll.test.ts` está sendo alterada pela 13.5 — a 13.6 só começa depois do commit da 13.5 (ver Riscos, R-5).
- Mudar o comportamento do rodapé do `ParsedScreen` (só a conta do `offset.opened` sai para o módulo comum, com o mesmo resultado).
- Trocar a biblioteca de teclado ou aplicar patch nela.
- Mudar a validação de 44 dígitos, a consulta à SEFAZ ou o fluxo QR/galeria/OCR, salvo o que as decisões D-2 e D-3 aprovarem.
- Tornar o QR disponível na web (hoje o botão fica desabilitado com "Disponível no app Android").

## I/O & Edge-Case Matrix

| Cenário | Antes (leitura do código, baseline `b4ecf1b`) | Depois |
|---|---|---|
| Retrato, "Digitar Chave" (abre com `autoFocus`) | a barra sobe junto do teclado, 20 dp acima dele | igual |
| Teclado mais baixo que `insets.bottom` (teclado físico, flutuante) | `translateY` positivo: a barra desce e sai da tela | `opened = min(insets.bottom, teclado)`: a barra fica no lugar ou sobe, nunca desce |
| Paisagem / fonte 2,0 / celular ≤ 640 dp: a barra erguida não cabe entre o cabeçalho e o teclado | a barra cobre o X e as abas; no limite, o campo passa da borda de cima | modo compacto (D-1): o campo e os botões ficam inteiros na janela |
| Paisagem com o editor de tela cheia do Android (IME em modo *extract*) | a chave aparece na caixa do teclado; o botão de ação do teclado não faz nada | D-1: o botão de ação do teclado consulta, como "Consultar SEFAZ" |
| Colar a chave copiada do DANFE (com espaços, 54 caracteres) | `maxLength={44}` corta antes do `onChangeText`: sobram ~36 dígitos e "Chave Inválida" | D-2 |
| QR legível na frente da câmera enquanto se digita | a leitura dispara e troca de tela no meio da digitação | D-3 |
| "Cancelar" ou troca de aba com o teclado aberto | o campo desmonta; o teclado pode ficar aberto sem foco | o teclado fecha (`KeyboardController.dismiss()`) e a barra volta sem sobra |
| Fechar o teclado (voltar do Android) com a barra da chave aberta | a barra desce com o teclado | igual |
| Sem permissão de câmera | "Câmera sem permissão" + "Permitir Câmera" no meio; a barra da chave funciona | igual |
| Web | o botão "QR Code" do `IdleScreen` fica desabilitado; o `QrScanScreen` não abre | igual |

</frozen-after-approval>

## O que as Stories 13.1 a 13.4 já fizeram

- **13.1:** `KeyboardProvider` translúcido na raiz; o `react-native-avoid-softinput` saiu. A barra do `QrScanScreen` virou `KeyboardStickyView` com `offset={{ closed: 0, opened: insets.bottom }}` (a altura do teclado da biblioteca já inclui a barra de navegação; o offset desconta o `insets.bottom` do `paddingBottom`).
- **13.2:** o rodapé do `ParsedScreen` também é `KeyboardStickyView`. A conta ficou em `src/components/invoice/parsedFooterLayout.ts` (`computeParsedFooterLayout`), com o R3 (`openedOffset = min(inset, teclado)` com teclado aberto; `inset` com ele fechado) e o R1 (desligar o rodapé em janela baixa). A guarda lista `app/import-invoice.tsx` em `DISCOVERY_EXCEPTIONS` com o motivo "… QrScanScreen (KeyboardStickyView, Story 13.6)".
- **13.3/13.4:** contêineres de modal (`KeyboardSheet`, `KeyboardListSheet`). Não se aplicam: o `QrScanScreen` não é modal, é um estado da rota.

## Auditoria do `QrScanScreen` (baseline `b4ecf1b`)

- **Rota:** `app/import-invoice.tsx`, estado `"qr"`, aberto pelo botão "QR Code" do `IdleScreen` (desabilitado na web). A tela inteira esconde o cabeçalho "Importar NF" (`fullscreenState`). Recebe `insets` de `useSafeAreaInsets()` e o estado `manualChave` do `useInvoiceScanner`.
- **Câmera:** `CameraView` (expo-camera 17) em `StyleSheet.absoluteFill`, montada só com permissão e com a rota focada (`useIsFocused`). `onBarcodeScanned` fica ligado o tempo todo; o tipo vem da aba (`["qr"]` ou `["code128", "code39", "pdf417"]`). Sem animação própria.
- **Escurecimento:** `View absoluteFill` com `pointerEvents="none"` e quatro `fade` (`flex: 1`) em volta de um quadrado de 260 dp de altura. Nada maior que a tela; nada animado.
- **Cabeçalho:** `position: absolute; top: 0`, `paddingTop: insets.top + 8`; X (40 dp) e abas "QR Code"/"Cód. Barras" (trocar de aba fecha a barra da chave). Altura ≈ `insets.top + 60`.
- **Dica:** "Aponte para…", `top: 50%` + 60, `pointerEvents="none"`; a barra erguida passa por cima dela (aceitável).
- **Barra de baixo:** `KeyboardStickyView` com `position: absolute; bottom: 0`, `paddingTop: 24`, `paddingBottom: insets.bottom + 20`, fundo `rgba(0,0,0,0.6)`. Fechada: "Galeria" e "Digitar Chave". Aberta (`showKeyInput`):
  - `TextInput` com `keyboardType="number-pad"`, `maxLength={44}`, `autoFocus`, fonte monoespaçada 14 com `letterSpacing: 1`, uma linha (44 caracteres ≈ 410 dp, mais largos que o campo de ~340 dp em 412 de largura: a chave rola na horizontal);
  - contador `{n}/44 dígitos` (conta só dígitos);
  - "Cancelar" (fecha a barra) e "Consultar SEFAZ" (`handleManualChave`: tira o que não é dígito, exige 44, senão `appAlert` "Chave Inválida"; com 44, abre a consulta da SEFAZ-SP na WebView).
  - Sem `returnKeyType`/`onSubmitEditing`; sem `disableFullscreenUI` (no Android em paisagem o sistema pode abrir o editor de tela cheia).
  - Altura aberta ≈ 24 + 43 (campo) + 10 + 12 (contador) + 10 + 4 + ~44 (botões) + 20 = **~167 dp + `insets.bottom`**.
- **Máscara/colar:** não há máscara. Colar funciona pelo toque longo; o `maxLength={44}` conta caracteres, então uma chave colada com espaços (formato do DANFE, 11 blocos de 4) é cortada antes de chegar ao estado. O `expo-clipboard` já está nas dependências, mas não é usado aqui.
- **Paisagem:** janela de ~412 dp de altura e teclado numérico de ~200 dp: sobram ~212 dp; tirando o cabeçalho (~60–84), sobram ~130–150 para uma barra de ~167. A barra cobre o cabeçalho; com fonte 1,3+ o campo sai pela borda de cima.
- **Web:** inalcançável pela interface (botão desabilitado; não há parâmetro de URL para o estado `"qr"`). O `KeyboardStickyView` na web não se move (teclado 0).

## Padrão proposto

### 1. Um lugar só para o `offset.opened`

`stickyOpenedOffset(insetBottom, keyboardHeight)` num módulo puro comum (proposta: `src/components/shared/keyboardStickyOffset.ts`, sem `react-native`): `teclado > 0 ? min(inset, teclado) : inset`, com entradas não finitas ou negativas valendo 0. O `computeParsedFooterLayout` passa a chamá-la (mesmo resultado; os 13 testes dele passam sem mudança).

### 2. Conta pura da barra: `src/components/invoice/qrKeyBarLayout.ts` (novo)

`computeQrKeyBarLayout({ windowHeight, keyboardHeight, insetBottom, topBarHeight, fullBarHeight })` devolve `{ openedOffset, compact }`:

- `openedOffset = stickyOpenedOffset(insetBottom, keyboardHeight)`.
- A faixa que a barra erguida ocupa acima do teclado é `fullBarHeight − openedOffset`.
- `compact` só é `true` com o teclado aberto e `fullBarHeight − openedOffset > windowHeight − keyboardHeight − topBarHeight`.
- `fullBarHeight` é sempre a altura da barra **não compacta** (medida no `onLayout` só quando `compact` é `false`, como o `listSheetHeaderHeight` da 13.4), para a decisão não alternar quando a barra encolhe.
- `MIN_KEY_GAP = 8` exportado só para os testes conferirem a folga do FR-29.

Se a D-2 (b) for aprovada, o mesmo módulo ganha `normalizeChaveInput(text)`: só dígitos, no máximo 44.

### 3. `QrScanScreen`

- Lê a altura-alvo do teclado pelo `useKeyboardTargetHeight` (`useKeyboardHandler` com `onStart`/`onEnd`, repassado por `runOnJS`; revisão R2/R4) e a altura do contêiner pelo `onLayout` (R5), mede o cabeçalho e o conteúdo da barra no `onLayout` (estado local de UI, nada de domínio) e chama `computeQrKeyBarLayout`.
- `KeyboardStickyView` com `offset={{ closed: 0, opened: keyBarLayout.openedOffset }}`, sem `enabled`.
- Modo compacto (D-1 a): o cabeçalho (X e abas) e a dica somem enquanto a barra estiver compacta; o `paddingTop` da barra cai de 24 para 8. Fechar continua por "Cancelar" e pelo voltar do Android. Ao fechar o teclado, tudo volta.
- `returnKeyType="search"` e `onSubmitEditing` chamando o mesmo handler de "Consultar SEFAZ" (D-1 a: serve ao editor de tela cheia do Android em paisagem e ao botão de ação do teclado em retrato).
- "Cancelar" e a troca de aba chamam `KeyboardController.dismiss()` antes de esconder o campo.
- D-2 e D-3 conforme a decisão.
- A altura-alvo chega no `onStart`, no começo da animação (o `useKeyboardState` só atualiza no `keyboardDidShow`/`keyboardDidHide`, depois dela: revisão R2). Entre o primeiro quadro e o `onStart`, `openedOffset = insets.bottom` com o teclado ainda em 0, como hoje; como o `KeyboardStickyView` interpola o `opened` pelo progresso, a barra nunca desce nesse intervalo além de uma fração de quadro.

### 4. Guarda: bloco "barra da chave da NF (Story 13.6)" em `keyboardScroll.test.ts`

Sobre `src/components/invoice/QrScanScreen.tsx`, com comentários removidos (`stripComments`):

1. Importa `KeyboardStickyView` de `react-native-keyboard-controller` e o renderiza **uma** vez.
2. O campo (`TextInput`/`TInput`) e o botão de consulta ficam **dentro** do `<KeyboardStickyView>…</KeyboardStickyView>`.
3. `offset` com `opened:` igual à expressão exata `keyBarLayout.openedOffset` (como o `BOTTOM_OFFSET_EXCEPTIONS` da 13.2); `insets.bottom` literal no `opened` acusa.
4. Nenhuma prop `enabled=` no `KeyboardStickyView`.
5. Nenhuma das `SECOND_KEYBOARD_SYSTEMS` (menos o próprio `KeyboardStickyView`) nem `AvoidSoftInput` no arquivo.
6. Usa `computeQrKeyBarLayout`.
7. O motivo de `app/import-invoice.tsx` em `DISCOVERY_EXCEPTIONS` passa a citar a regra (sem "Story 13.6" pendente).
8. `parsedFooterLayout.ts` e `qrKeyBarLayout.ts` importam `stickyOpenedOffset` e não repetem a conta `Math.min(inset…`.

Auto-testes: um trecho que casa e um que não casa para cada regra (campo fora do sticky; `opened: insets.bottom`; `enabled={false}`; `KeyboardAvoidingView` em volta; dois `KeyboardStickyView`; alias de import).

## Decisões do dono (aprovadas em 28/10: D-1 a, D-2 b, D-3 b)

- **D-1: barra em janela baixa (paisagem, fonte grande, celular pequeno).**
  - (a) Modo compacto pela função pura: quando a barra erguida não cabe entre o cabeçalho e o teclado, o cabeçalho e a dica somem e o `paddingTop` cai para 8. O botão de ação do teclado consulta (`onSubmitEditing`), o que também cobre o editor de tela cheia que o Android abre em paisagem.
  - (b) Só o `openedOffset` (R3); em janela baixa a barra cobre o cabeçalho, como hoje. Fica na checklist.
  - (c) Igual à (a) e ainda `disableFullscreenUI` no campo, para o app (e não o teclado) mostrar a chave em paisagem.

  A (b) não garante o campo com fonte 1,3+ em paisagem, e o FR-29 pede o campo sempre visível. A (c) troca uma tela do sistema que funciona por um layout nosso apertado. **Recomendado: (a).**
- **D-2: chave colada com espaços (formato do DANFE).**
  - (a) Como está: `maxLength={44}` corta a chave colada.
  - (b) `normalizeChaveInput` no `onChangeText` (só dígitos, até 44) e sem `maxLength` no campo; o contador e a validação não mudam. Chave colada com espaços, pontos ou quebras de linha vira os 44 dígitos.
  - (c) A (b) e ainda exibir em blocos de 4 numa caixa de 2 linhas, para ver a chave inteira e comparar com o DANFE.

  A (b) conserta um erro real com uma função pura testável e não mexe na altura da barra. A (c) melhora a leitura, mas aumenta a barra (piora a D-1) e traz o risco de o cursor pular ao editar no meio do texto formatado; vai para o `deferred-work.md`. **Recomendado: (b).**
- **D-3: câmera lendo enquanto se digita a chave.**
  - (a) Como está: um QR na frente da câmera dispara a leitura no meio da digitação.
  - (b) Pausar a leitura com a barra da chave aberta (`onBarcodeScanned={showKeyInput ? undefined : …}`); a imagem da câmera continua.
  - (c) Desmontar a `CameraView` com a barra aberta (economiza bateria e GPU, mas a tela fica preta atrás da barra).

  A (b) evita perder o que foi digitado, com uma linha, e mantém a câmera de fundo que dá nome à story. **Recomendado: (b).**

## Code Map

- `src/components/shared/keyboardStickyOffset.ts` (novo): `stickyOpenedOffset`
- `src/components/invoice/qrKeyBarLayout.ts` (novo): `computeQrKeyBarLayout`, `MIN_KEY_GAP` e, com D-2 (b), `normalizeChaveInput`
- `src/components/invoice/QrScanScreen.tsx`: medidas, `offset` pela função, modo compacto, `returnKeyType`/`onSubmitEditing`, `KeyboardController.dismiss()`, D-2, D-3
- `src/components/invoice/parsedFooterLayout.ts`: usa `stickyOpenedOffset` (sem mudar o resultado)
- `src/components/invoice/__tests__/qrKeyBarLayout.test.ts` (novo); `src/components/shared/__tests__/keyboardStickyOffset.test.ts` (novo)
- `src/components/__tests__/keyboardScroll.test.ts`: bloco da 13.6 e motivo novo em `DISCOVERY_EXCEPTIONS`
- Sem mudança: `app/import-invoice.tsx`, `src/hooks/useInvoiceScanner.ts` (validação), `ParsedScreen.tsx`, `IdleScreen.tsx`

## Tasks & Acceptance

**Execution:**
- [x] Esperar o commit da 13.5 e atualizar o `baseline_commit` desta spec. (A 13.6 partiu do `HEAD` `5181e97`, com a 13.5 e a revisão dela commitadas; o frontmatter ficou como estava, por instrução do dono — ver Implementation Notes.)
- [x] `stickyOpenedOffset` e testes; `parsedFooterLayout.ts` passa a usá-la e os 13 testes dele seguem verdes.
- [x] `computeQrKeyBarLayout` (e `normalizeChaveInput`, se D-2 b) e testes:
  - retrato 412×900, teclado 300 (com a barra de navegação), inset 24, cabeçalho 84, barra 191: `openedOffset = 24`, `compact = false`, topo da barra (900 − 300 − 167 = 433) abaixo do cabeçalho;
  - teclado fechado: `openedOffset = inset` e `compact = false` mesmo em janela baixa;
  - R3: teclado 16 com inset 24 → `openedOffset = 16` (`translateY` nunca positivo);
  - paisagem 900×412, teclado 200, inset 0, cabeçalho 60, barra 167 → `compact = true`;
  - limite exato: sobra igual à faixa → `false`; um a mais → `true`;
  - entradas inválidas (NaN, negativas) valem 0;
  - `normalizeChaveInput`: chave com espaços (54 caracteres) → 44 dígitos; mais de 44 dígitos → os 44 primeiros; letras e pontos saem; vazio → vazio.
- [x] `QrScanScreen` conforme o padrão e as decisões. Textos, validação e fluxo de consulta iguais.
- [x] Guarda (bloco da 13.6), com auto-testes e sondas.
- [x] Itens desta story na checklist da Story 13.7 (Verification).

**Acceptance Criteria:**
- Given a tela de QR da importação de nota com o campo da chave em `autoFocus`, when o teclado abre, then a barra inferior com o campo, "Cancelar" e "Consultar SEFAZ" sobe acima do teclado, com folga ≥ 8 dp.
- Given um teclado mais baixo que a barra de navegação (teclado físico, flutuante), when o campo está focado, then a barra nunca desce abaixo da posição fechada.
- Given uma janela baixa (paisagem, fonte 2,0), when foco o campo, then o campo e os dois botões ficam inteiros na janela (D-1).
- Given o teclado aberto, when toco "Cancelar", troco de aba ou fecho o teclado, then a barra volta ao fundo sem espaço sobrando.
- Given o `QrScanScreen` sem o `KeyboardStickyView`, com o campo fora dele, com `opened: insets.bottom` literal, com `enabled=` ou com segunda compensação, when rodo `npx vitest run`, then a guarda falha apontando o arquivo.

## Riscos e notas para a implementação

- **R-1, editor de tela cheia em paisagem.** Com o `disableFullscreenUI` no padrão (`false`), o Android pode cobrir o app com a caixa do teclado. Não se sabe se o keyboard-controller informa altura nesse modo; a barra pode subir por trás. Conferir no aparelho (item 4) e, se a barra piscar, reabrir a D-1 (c).
- **R-2, medidas no primeiro quadro.** Com `autoFocus`, o teclado pode abrir antes de o `onLayout` medir o contêiner, o cabeçalho e o conteúdo da barra. Com qualquer medida em 0, `compact = false` e `fits = true`, e o `opened` é o de hoje; a altura-alvo do teclado chega no `onStart` (não no fim da animação), então o compacto é decidido no começo da subida. Conferir que não pisca nem pula (item 3).
- **R-3, alternância do compacto.** A decisão usa sempre a altura não compacta (`fullBarHeight`), e a janela/teclado só mudam por evento; o compacto não deve alternar sozinho. Teste puro do limite e item de aparelho girando a tela.
- **R-4, render por tecla.** O `useKeyboardTargetHeight` só muda o estado no `onStart`/`onEnd` de abrir e fechar (`setState` com o mesmo valor não renderiza); digitar não move o teclado.
- **R-5, conflito com a 13.5.** O `keyboardScroll.test.ts` está sendo alterado pela 13.5 na árvore de trabalho. Começar a 13.6 depois do commit dela e partir do `HEAD` novo.
- **R-6, web.** O `QrScanScreen` não abre na web; não há Playwright desta tela. O Playwright fica só como regressão do `ParsedScreen`, que passa a usar `stickyOpenedOffset`.

## Spec Change Log

- 28/10, revisão R11: `baseline_commit` passa a `5181e97`; §3, R-2 e R-4 descrevem a altura-alvo do teclado (`useKeyboardTargetHeight`, R2) e o contêiner medido (R5). O texto congelado do Approach ainda cita `useWindowDimensions` e `useKeyboardState`; a implementação segue a revisão (R2, R5), sem mudar a intenção.

## Verification

**Comandos**
- `npx vitest run` e `npx tsc --noEmit`: sem falhas novas em relação ao baseline (comparar com o `HEAD` depois da 13.5).
- `npx eslint` nos arquivos tocados, sem avisos.
- `npx expo export --platform web` com exit 0.
- Sondas das funções puras (revertidas depois):
  - `stickyOpenedOffset` devolvendo sempre `inset` → falha o caso R3 (nas duas telas);
  - `compact` sempre `false` → falham paisagem e limite;
  - `compact` calculado com a altura atual em vez da `fullBarHeight` → falha o teste de não alternar;
  - `normalizeChaveInput` sem tirar espaços → falha a chave colada.
- Sondas da guarda (revertidas depois; cada uma precisa falhar):
  - `KeyboardStickyView` trocado por `View` no `QrScanScreen`;
  - `opened: insets.bottom` literal;
  - `enabled={false}` no `KeyboardStickyView`;
  - `TextInput` movido para fora da barra;
  - `KeyboardAvoidingView` em volta da tela;
  - `Math.min(inset…` copiado no `parsedFooterLayout.ts` sem a função comum.

**Web (Playwright, Chromium headless, build exportado com fallback de SPA, 412×900 e 800×360)**

O `QrScanScreen` não abre na web (botão "QR Code" desabilitado), então não há teste da barra. Só regressão:
- `/import-invoice`: o botão "QR Code" aparece desabilitado com "Disponível no app Android"; sem erro de página.
- `/import-invoice` → "Lançar manualmente": o `ParsedScreen` abre, e "Total da Nota" e "Confirmar Importação" ficam dentro da janela, como no Playwright da 13.2.

**Aparelho (itens para a checklist da Story 13.7, Android 16)**

1. Importar NF → QR Code → "Digitar Chave": o teclado numérico abre sozinho e a barra (campo, contador, "Cancelar", "Consultar SEFAZ") fica logo acima dele, sem cobrir nada e sem faixa vazia.
2. Digitar 44 dígitos: o contador chega a 44/44; "Consultar SEFAZ" abre a consulta. Com menos dígitos, aparece o alerta do app "Chave Inválida" (não o nativo). Repetir pelo botão de ação do teclado (D-1 a).
3. Abrir a barra da chave pela primeira vez depois de abrir o app, em retrato e em paisagem: a barra não pisca nem pula ao subir, e em paisagem já sobe compacta (sem subir cheia e encolher no fim; R-2, revisão R2).
4. Paisagem: repetir 1 e 2. Com o editor de tela cheia do sistema, a chave aparece na caixa do teclado e o botão de ação consulta; sem ele, o campo e os botões ficam inteiros na janela (D-1). Girar com o teclado aberto: a barra se ajusta sem alternar (R-3).
5. Fonte do sistema 1,3 e 2,0 e celular com até 640 dp: repetir 1; o campo e os botões ficam visíveis (modo compacto).
6. Teclado físico (Bluetooth) ou teclado flutuante do Gboard: focar o campo; a barra não desce para fora da tela (R3).
7. Com o teclado aberto: tocar "Cancelar"; depois reabrir e trocar para "Cód. Barras". Nos dois casos o teclado fecha e a barra volta ao fundo sem sobra.
8. Colar a chave copiada com espaços (D-2): o campo fica com os 44 dígitos e o contador mostra 44/44.
9. Com um QR de NFC-e na frente da câmera, abrir a barra e digitar (D-3): nada é lido até fechar a barra; depois de "Cancelar", o QR é lido.
10. Sem permissão de câmera: "Digitar Chave" funciona igual.
11. Navegação de 3 botões e por gestos: repetir 1 (a folga até o teclado é a mesma).
12. Fluidez num aparelho com GPU Mali fraca: abrir e fechar o teclado sobre a câmera sem travar nem piscar.
13. Câmera (revisão R1): abrir e fechar a barra da chave várias vezes; a imagem da câmera não pisca nem fica preta (a câmera não é recriada).
14. Fonte 1,3 e 2,0 em paisagem num celular de 640×360 dp (revisão R3): com o teclado aberto, campo e botões ficam numa linha, sem o contador, inteiros na janela; ao fechar o teclado, a barra volta empilhada.
15. Android 7 a 14 com navegação de 3 botões (revisão R5): repetir 1, 4 e 5; a barra fica logo acima do teclado e o compacto entra só quando não cabe.
16. Tela dividida (revisão R5): com o app na metade de baixo e na de cima, repetir 1; a barra não passa da borda do app.
17. Girar com o teclado aberto, ida e volta (revisão R8): o compacto entra e sai uma vez, sem alternar.
18. Colar a chave com prefixo numérico, ex.: "Nº 123 Série 1 — Chave: 5206 0433 …" (revisão R6): o campo fica com os 44 dígitos da chave. Com 44 dígitos no campo, digitar mais um (no fim ou no meio): o valor não muda.
19. Teclado físico: Enter com a chave completa consulta; com a chave incompleta, aparece "Chave Inválida" e o teclado continua aberto (revisão R7).
20. Tecla de ação do teclado com chave de 44 dígitos e dígito verificador errado (revisão R6): "Chave Inválida" do app, sem abrir a SEFAZ; o teclado continua aberto.

## Implementation Notes

**Base:** `HEAD` `5181e97` (13.5 e a revisão dela commitadas), agora também no `baseline_commit` (revisão R11). O plano foi refeito sobre o `keyboardScroll.test.ts` atual (com o bloco da 13.5). As correções da revisão (R1–R11) estão em "Revisão aplicada", abaixo; a lista de arquivos já descreve o estado final.

**Arquivos**
- `src/components/shared/keyboardStickyOffset.ts` (novo): `stickyOpenedOffset(insetBottom, keyboardHeight)` e `keyboardTargetHeight(eventHeight)`, sem import.
- `src/components/shared/useKeyboardTargetHeight.ts` (novo, R2/R4): altura-alvo do teclado por `useKeyboardHandler` (`onStart` e `onEnd` em worklet, `runOnJS` para o estado; a conta `keyboardTargetHeight` fica do lado do JS), valor inicial de `KeyboardController.state()`.
- `src/components/invoice/qrKeyBarLayout.ts` (novo): `computeQrKeyBarLayout` (entrada `containerHeight`, saída `{ openedOffset, compact, fits }`), `keyBarFullHeight`, `nextKeyContentHeight`, `normalizeChaveInput(text, previous)`, `MIN_KEY_GAP`, `KEY_BAR_PADDING_TOP` (24), `KEY_BAR_COMPACT_PADDING_TOP` (8), `KEY_BAR_PADDING_BOTTOM` (20), `CHAVE_DIGITS` (44).
- `src/components/invoice/parsedFooterLayout.ts`: `openedOffset` passa a vir de `stickyOpenedOffset` (os 13 testes dele passam sem mudança).
- `src/components/invoice/ParsedScreen.tsx` (R2/R4): `useKeyboardTargetHeight()` no lugar do `useKeyboardState`; a conta do rodapé é a mesma.
- `packages/parsers/src/chaveAcesso.ts` (novo, R6) e export em `packages/parsers/index.ts`: `isValidChaveAcesso`, `chaveAcessoCheckDigit` (módulo 11, pesos 2–9, valor ASCII − 48 como no CNPJ alfanumérico), `CHAVE_ACESSO_LENGTH`. Não havia validador de chave em `packages/parsers` (só o DV do CNPJ, privado, no `payslipParser.ts`).
- `src/hooks/useInvoiceScanner.ts` (R6): `handleManualChave` confere o DV com `isValidChaveAcesso` depois dos 44 dígitos e antes de abrir a SEFAZ; erro pelo `appAlert` "Chave Inválida" ("O dígito verificador não confere. Confira os 44 dígitos da chave de acesso.").
- `src/components/invoice/QrScanScreen.tsx`: altura-alvo do teclado (`useKeyboardTargetHeight`) e altura do contêiner pelo `onLayout` (sem `useWindowDimensions`); altura do cabeçalho e do conteúdo da barra no `onLayout` (o conteúdo guardado por `nextKeyContentHeight`); `offset={{ closed: 0, opened: keyBarLayout.openedOffset }}` sem `enabled`; modo compacto (cabeçalho e dica somem, `paddingTop` 24 → 8) e, se nem a compacta cabe, uma linha (campo e botões lado a lado, sem o contador, mesma árvore para o campo não remontar); `returnKeyType="search"` + `submitBehavior="submit"` + `onSubmitEditing` no mesmo handler do "Consultar SEFAZ"; "Cancelar" e troca de aba chamam `KeyboardController.dismiss()` antes de fechar o campo; D-2 b (`onChangeText` com `normalizeChaveInput(text, manualChave)`, sem `maxLength`); D-3 b com handler de leitura estável (`useCallback` sem dependências, travado por `showKeyInputRef`, que muda junto com o estado ao abrir e fechar). Textos e fluxo da consulta iguais.
- `src/components/invoice/__tests__/qrKeyBarLayout.test.ts` (novo, 24 testes), `src/components/shared/__tests__/keyboardStickyOffset.test.ts` (novo, 5 testes) e `packages/parsers/__tests__/chaveAcesso.test.ts` (novo, 5 testes).
- `src/components/__tests__/keyboardScroll.test.ts`: bloco "barra da chave da NF (Story 13.6)" (4 testes de regra: `qrKeyBarViolations` no `QrScanScreen`, `stickyOffsetUserViolations` nos 2 usuários, `stickyOffsetModuleViolations` no módulo comum, motivo de `app/import-invoice.tsx` citando `QR_KEY_BAR` sem "Story 13.6") e 14 auto-testes (padrão passa, comentário não conta, `View` no lugar do sticky, campo fora, "Consultar SEFAZ" fora, `opened: insets.bottom`, sem `offset`, `closed ≠ 0`, `enabled`/`enabled={false}`, spread, `KeyboardAvoidingView` em volta/importado/com alias, Compat, `AvoidSoftInput`, dois sticky, alias/namespace/`KeyboardStickyView` de outro módulo, sem `computeQrKeyBarLayout`, `jsxElementRanges`, `Math.min(inset…` copiado, módulo comum com import). Depois da revisão: mais 4 testes de regra (`qrKeyBarWiringViolations` no `QrScanScreen`; `keyboardTargetUserViolations` no `QrScanScreen` e no `ParsedScreen`; `keyboardTargetHookViolations` no hook; `manualChaveValidationViolations` no `useInvoiceScanner`; 5 casos ao todo), o `offset` por variável local resolvida e a recusa de mutação/reatribuição do `keyBarLayout` no `qrKeyBarViolations`, e 24 auto-testes novos (`keyboardScroll.test.ts` com 274).

**Decisões além da spec**
- **Altura não compacta pelo conteúdo, não pela barra inteira.** Em vez de medir a barra só quando não está compacta, o `onLayout` mede o conteúdo da barra da chave (campo, contador, botões), que é o mesmo nos dois modos, e `keyBarFullHeight(conteúdo, inset)` soma os paddings do modo não compacto (24 + 20 + inset). Mesmo resultado que a spec pede (`fullBarHeight` é sempre a altura não compacta), sem medida velha: com `autoFocus` a barra pode abrir já compacta, e a medida "só quando não compacta" ficaria com a altura da barra Galeria/Digitar Chave. Sem medida (0), `compact = false` (R-2). A sonda "compact com a altura atual" virou: `keyBarFullHeight` com o `paddingTop` compacto → falham 3 testes, entre eles o de não alternar.
- `compact` também exige `fullBarHeight > 0` (primeiro quadro igual ao de hoje).
- A guarda também exige `closed: 0` no `offset`, barra sem `{...spread}` e o `<KeyboardStickyView` pelo import nomeado sem alias (namespace e homônimo de outro módulo acusam); o módulo comum fica sem import.
- O cabeçalho some por desmontagem (`{!compact && …}`): a última medida dele fica guardada para a decisão.

**Verificação (primeira entrega, commit 956f1f0)**
- `npx vitest run`: 98 arquivos, 2145 testes passando (baseline 96/2109; +2 arquivos, +36 testes: 14 + 4 das funções puras, 18 da guarda; `keyboardScroll.test.ts` 245).
- `npx tsc --noEmit`: 0 erros (sem `expo-env.d.ts`). `npx eslint` nos 7 arquivos tocados: sem avisos.
- `npx expo export --platform web`: exit 0.
- Sondas das funções puras (revertidas): `stickyOpenedOffset` sempre `inset` → 3 falhas (R3 nas duas telas e no módulo); `compact` sempre `false` → 4 falhas (paisagem, limite, entradas, não alternar); `keyBarFullHeight` com `paddingTop` compacto → 3 falhas; `normalizeChaveInput` mantendo espaços → 2 falhas.
- Sondas da guarda (revertidas), todas falham: `KeyboardStickyView` → `View`; `opened: insets.bottom`; `enabled={false}`; `TextInput` fora da barra; `KeyboardAvoidingView` em volta da tela; `Math.min(inset…` copiado no `parsedFooterLayout.ts`.
- Playwright (Chromium headless, build exportado com fallback de SPA, perfil novo com "Pular" no carrossel), 412×900 e 800×360: `/import-invoice` com "QR Code" desabilitado e "Disponível no app Android" (o clique não sai da tela); "Lançar manualmente" abre o `ParsedScreen` com "Total da Nota" e "Confirmar Importação" dentro da janela; sem erro de página.

**Revisão aplicada (R1–R11, 28/10)**
- **R1:** a câmera recebe sempre `handleBarcodeScanned` (`useCallback(…, [])`), que sai cedo com `showKeyInputRef.current`; a ref muda junto com o estado em `openKeyInput`/`closeKeyInput`, e o último `onBarcodeScanned` do pai fica numa ref sincronizada por `useEffect`. O `barcodeScannerEnabled` (`!!onBarcodeScanned` no `expo-camera` 17, `build/utils/props.js`) fica sempre `true`: o Android não refaz o `setShouldScanBarcodes` nem a câmera.
- **R2/R4:** `useKeyboardTargetHeight` (compartilhado) no `QrScanScreen` e no `ParsedScreen`. Usa `useKeyboardHandler` (o mesmo do `KeyboardSafeView`; no 1.18.5 ele também liga o `adjustResize` ao montar e volta ao modo padrão ao desmontar). O `onStart` traz a altura final, então `opened ≤ alvo` vale em toda a animação: o `KeyboardStickyView` faz `translateY = −p·alvo + p·opened` (teste R4 em `qrKeyBarLayout.test.ts`).
- **R3:** `computeQrKeyBarLayout` devolve `fits` (a compacta cabe entre o topo do contêiner e o teclado); sem caber, uma linha. Testes a 360 dp de altura com conteúdo de fonte 1,0/1,3/2,0 (123/160/200) e o limite exato; `nextKeyContentHeight` mantém a medida empilhada durante o layout de uma linha, para não alternar.
- **R5:** a altura vem do `onLayout` do contêiner (`containerHeight`); `compact` exige o contêiner medido. Com a barra de navegação fora do contêiner (Android ≤ 14, 3 botões), o `insets.bottom` é 0 e a conta `contêiner − teclado − cabeçalho` continua certa.
- **R6:** `normalizeChaveInput(text, previous)`: até 44 dígitos, só os dígitos; acima disso, a única sequência de exatamente 44 dígitos formada por blocos separados só por espaços, quebras de linha ou pontos (prefixo numérico, sufixo, "NFe" colado); sem uma sequência única (ambígua, ou 45 dígitos seguidos), o valor anterior — nunca monta chave com dígitos de fora e não descarta o último dígito ao digitar no meio. DV pelo `isValidChaveAcesso` antes da consulta.
- **R7:** `submitBehavior="submit"`: a tecla de ação consulta sem fechar o teclado; com chave inválida, o alerta aparece e o teclado fica.
- **R8:** coberto por R2 (decisão no `onStart`) e R5 (contêiner medido de novo ao girar); item 17 do checklist.
- **R9:** `qrKeyBarWiringViolations` exige campo único sem `maxLength`, `normalizeChaveInput` no `onChangeText`, `onSubmitEditing` + `returnKeyType` + `submitBehavior="submit"`, `s.topBar` e `s.hintWrap` dentro de `{!compact && (…)}`, `paddingBottom: insets.bottom + …` na barra, `onBarcodeScanned` da câmera como identificador de um `useCallback(…, [])` com `if (showKeyInputRef.current) return`, as duas atribuições da ref, a altura-alvo e o contêiner medido; `qrKeyBarViolations` resolve `offset={variável}` e recusa `keyBarLayout` mutado (`.x =`, `["x"] =`, `Object.assign`) ou reatribuído (`let`, segunda atribuição).
- **R10/R11:** itens 13–20 no checklist e item 3 corrigido; §3, R-2 e R-4 corrigidos; `baseline_commit` `5181e97`.
- **Para o `deferred-work.md`:** o campo continua só numérico (`number-pad` e filtro de dígitos). Se a chave passar a ter letras na parte do CNPJ (CNPJ alfanumérico), o `chaveAcessoCheckDigit` já calcula, mas a entrada e a regra de 44 dígitos precisam mudar.

**Verificação (depois da revisão)**
- `npx vitest run`: 99 arquivos, 2190 testes passando (antes da revisão 98/2145; +1 arquivo, +45 testes: `qrKeyBarLayout.test.ts` 14 → 24, `keyboardStickyOffset.test.ts` 4 → 5, `chaveAcesso.test.ts` 5 novos, `keyboardScroll.test.ts` 245 → 274).
- `npx tsc --noEmit`: 0 erros (sem `expo-env.d.ts`). `npx eslint --max-warnings 0` nos 9 arquivos tocados do app: sem avisos (`packages/` fica fora do eslint pelo ignore do projeto).
- `npx expo export --platform web`: exit 0.
- Sondas (revertidas), cada uma derruba ao menos um teste: R1 handler com ternário; R1 sem a trava da ref; R2 `useKeyboardState` de volta no `ParsedScreen`; R2 hook sem `runOnJS` no `onStart`; R2/R4 `keyboardTargetHeight` sem filtrar negativo/NaN; R3 `fits` sempre `true` (4 falhas); R3 `nextKeyContentHeight` com a medida de uma linha; R5 `useWindowDimensions` de volta; R5 compacto sem exigir o contêiner medido (2 falhas); R6 `normalizeChaveInput` antigo (3 falhas); R6 sem o DV no `useInvoiceScanner`; R6 pesos 2–10 (2 falhas); R7 sem `submitBehavior`; R9 `maxLength` de volta; R9 `keyBarLayout.openedOffset = insets.bottom`; R9 cabeçalho fora do `{!compact && …}`.
- Playwright (mesmo roteiro, build novo), 412×900 e 800×360: `/import-invoice` com "QR Code" desabilitado e "Disponível no app Android"; "Lançar manualmente" abre o `ParsedScreen` (agora com o `useKeyboardTargetHeight`) com "Total da Nota" e "Confirmar Importação" dentro da janela; sem erro de página.

**Checklist para a Story 13.7 (aparelho, Android 16 e, no item 15, Android 7–14):** os 20 itens de "Aparelho" acima, com atenção a: 3 (primeiro teclado, já compacto em paisagem); 4 (R-1, editor de tela cheia em paisagem: se a barra piscar por trás, reabrir a D-1 c); 5 e 14 (fonte 1,3/2,0, compacto e uma linha); 6 (teclado físico/flutuante, R3); 7 (`KeyboardController.dismiss()` no "Cancelar" e na troca de aba); 8 e 18 (colar com espaços e com prefixo numérico); 9 e 13 (QR não lido com a barra aberta, câmera sem piscar); 15 e 16 (3 botões, tela dividida); 17 (girar sem alternar); 2, 19 e 20 (tecla de ação e Enter consultam; chave incompleta ou com DV errado mostra o alerta do app e mantém o teclado).

## Review Triage Log

Revisão única com três lentes (adversarial, casos de borda, lacunas de verificação), 28/10, sobre o commit 956f1f0. 1 High, 4 Med, 6 Low.

| # | Achado | Sev. | Decisão |
|---|--------|------|---------|
| R1 | Pausa da D-3 com `onBarcodeScanned={… ? undefined : …}` liga/desliga `barcodeScannerEnabled` e recria a câmera (CameraX `unbindAll`) a cada abertura e fechamento da barra | High | **patch**: handler estável sempre passado, com trava por `ref` (`showKeyInputRef`); a câmera não é recriada; item no checklist "sem piscar a imagem ao abrir/fechar a barra" — **Aplicado** |
| R2 | `useKeyboardState` só atualiza no `didShow`/`didHide`: o compacto é decidido depois da animação e a barra pula | Med | **patch**: altura-alvo do teclado vinda de `useKeyboardHandler({ onStart })` (via `runOnJS`) num hook compartilhado, usado pela barra da chave e pelo `ParsedScreen`; corrigir o texto da spec (R-2, §3) — **Aplicado** |
| R3 | Compacto não garante que o campo caiba (640×360, fonte 1,3: topo em −8) | Med | **patch**: função devolve `fits`; sem caber, layout de uma linha (campo e botões lado a lado) e contador oculto; testes com fonte 1,3 e 2,0 a 360dp de altura — **Aplicado** |
| R4 | "Nunca desce" só vale com o teclado parado (altura 0 durante a abertura) | Low | **patch**: resolvido pela altura do `onStart` do R2 (vale também para o `ParsedScreen`); corrigir o comentário — **Aplicado** |
| R5 | Limite do compacto mistura `useWindowDimensions` com a área real (Android ≤14 com barra de 3 botões; tela dividida) | Low | **patch**: medir o contêiner com `onLayout` em vez de `useWindowDimensions`; itens no checklist (Android 10–14 com 3 botões; tela dividida) — **Aplicado** |
| R6 | `normalizeChaveInput` monta chave errada quando o texto colado tem outros dígitos; digitar no meio com 44 descarta o último | Low | **patch**: com mais de 44 dígitos, usar a sequência de 44 dígitos seguidos (ignorando espaços e pontos) se houver, senão manter o valor anterior; digitação além de 44 mantém o valor anterior; validar o dígito verificador (módulo 11) antes da consulta, com "Chave Inválida"; testes — **Aplicado** |
| R7 | `onSubmitEditing` fecha o teclado mesmo com chave incompleta | Low | **patch**: `submitBehavior="submit"` — **Aplicado** |
| R8 | Compacto pode alternar depois de girar com teclado aberto | Low | **patch**: coberto pelo R2/R5; item no checklist — **Aplicado** |
| R9 | Guarda não cobre a fiação da D-1/D-2/D-3; burla por mutação e falso positivo com variável | Med | **patch**: guarda exige sem `maxLength`, `normalizeChaveInput` no `onChangeText`, handler de scan estável com trava, `onSubmitEditing` + `returnKeyType`, cabeçalho condicionado ao `compact`, `paddingBottom` com `insets.bottom`; aceitar `offset` por variável local resolvida; recusar atribuição ao resultado do layout — **Aplicado** |
| R10 | Checklist do aparelho incompleto | Low | **patch**: itens da revisão (piscar da câmera, pulo do compacto, Android 7–14/3 botões, tela dividida, colar com prefixo numérico, Enter do teclado físico, envio de chave inválida pela tecla de ação); corrigir o item 3 — **Aplicado** |
| R11 | Texto da spec desatualizado | Low | **patch**: corrigir R-2, §3 e as notas; `baseline_commit` passa a `5181e97` — **Aplicado** |
