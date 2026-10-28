---
title: 'Story 13.3: fazer os modais com formulário subirem'
type: 'bugfix'
created: '2026-10-27'
status: 'in-progress'
baseline_commit: 'd569c98d4380f156163c1cdb1df3e7aae547b7a4'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-20-teclado.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-13-1-sistema-unico-de-teclado.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-13-2-padronizar-a-rolagem-das-telas-com-campos.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Os quatro formulários em modal (nova transação da tela inicial, `TransactionBottomSheet`; formulário de conta, `AccountFormModal`; criação de lista, `CreateListModal`; adição de item da lista de desejos, `AddItemModal`) usam o `KeyboardSafeView`. Desde a Story 13.1 ele recebe a altura do teclado, mas cada modal o monta de um jeito e a montagem tem três defeitos:

- A folha não encolhe (`flexShrink` padrão 0 no RN). Quando folha + teclado passam da altura da tela, a folha vaza: o cabeçalho sai por cima da tela ou a parte de baixo fica atrás do teclado.
- O campo focado não é levado para a área visível dentro da folha.
- O botão de salvar fica no fim da rolagem, longe do campo. Com o teclado aberto, sobra uma faixa do tamanho de `insets.bottom` entre a folha e o teclado, porque a altura do teclado já inclui a barra de navegação.

O `ScrollView` da nova transação também não tem `keyboardShouldPersistTaps`, então o primeiro toque em "Salvar" com o teclado aberto só fecha o teclado.

**Approach:** Um único invólucro de folha com teclado, construído sobre o `KeyboardSafeView`, que é a convenção do spine para modais. Ele traz:

- cabeçalho fixo;
- rolagem que encolhe;
- rodapé com o botão principal logo acima do teclado;
- desconto da área segura de baixo;
- ajuste explícito da rolagem até o campo focado.

As contas ficam em funções puras testadas, como o `parsedFooterLayout.ts` da 13.2. Os quatro modais trocam só o contêiner. A guarda estática `keyboardScroll.test.ts` passa a exigir esse invólucro nesses quatro arquivos e a contabilizar todo modal com campo.

## Boundaries & Constraints

**Always:**
- Um só sistema de teclado: o keyboard-controller com o `KeyboardProvider` da raiz (13.1). O modal sobe pelo `KeyboardSafeView`, como manda o spine, e nunca soma uma segunda compensação na mesma árvore (`KeyboardAwareScrollView`/Compat, `KeyboardAvoidingView` da biblioteca ou do RN, `KeyboardStickyView`).
- Folga de pelo menos 8 dp entre o campo focado e o teclado (FR-29).
- Ao fechar o teclado, a folha volta ao tamanho e à posição de antes, sem espaço sobrando.
- A web continua funcionando: lá não há evento de teclado, então o espaçador fica em 0.
- Texto de UI em pt-BR com acentos.
- Alerta só por `appAlert`/`appConfirm`. O `AppAlertHost` dentro dos modais fica.
- Nenhuma View animada maior que a tela (Mali, `docs/tour-crash-fixes.md`). O espaçador nunca passa da altura do teclado, e o fundo escuro continua `absoluteFillObject`.
- Nenhuma mudança em `android/`, `ios/` ou `packages/sync`.
- Telas despacham eventos. A lógica dos formulários (hooks, validação, eventos) não muda.

**Never:**
- Mexer nas buscas e diálogos em modal (Story 13.4): `CategoryPickerModal`, `StoreGridModal`, `AccountPicker` compacto (inclusive o aberto de dentro da nova transação), `SelectionModal`, "APAGAR TUDO", `WelcomeCarousel`, `DebugTools`, nem o diálogo de excluir conta aninhado no `AccountFormModal`, que não tem campo.
- Mexer no chat da IA (13.5) ou na barra da chave da NF (13.6).
- Trocar a biblioteca de teclado ou aplicar novo patch nela.
- Mudar a animação de entrada e saída dos modais além do necessário para o contêiner.

## I/O & Edge-Case Matrix

| Cenário | Antes (leitura do código, baseline `d569c98`) | Depois |
|---|---|---|
| Nova transação: focar "Valor" ou "Descrição" | folha (até 85%) não encolhe; vai para o topo da tela e a parte de baixo fica atrás do teclado | folha encolhe entre a barra de status e o teclado; campo visível; "Salvar" no rodapé, logo acima do teclado |
| Nova transação: focar um campo no fim (itens, parcelas, "Repetir a cada (dias)") | pode ficar atrás do teclado | a rolagem leva o campo para cima do rodapé, com folga ≥ 8 dp |
| Conta de cartão ou objetivo de poupança: focar "Dia de vencimento", "Aporte" ou "Dia do aporte" | folha vaza por cima; cabeçalho sai da tela | idem nova transação; "Criar conta"/"Salvar" no rodapé |
| Criar lista (`autoFocus`) | sobe, com faixa de `insets.bottom` entre os botões e o teclado | sobe com a folga padrão, sem a faixa |
| Adicionar item: focar "Preço", "EAN" ou "NCM" | folha (até 92%) vaza; botão no fim da rolagem | campo visível; "Adicionar à lista"/"Salvar alterações" no rodapé (só quando válido, como hoje) |
| Tocar em "Salvar" com o teclado aberto | nova transação: 1º toque só fecha o teclado | funciona no 1º toque (rodapé fora da rolagem; rolagem com `keyboardShouldPersistTaps="handled"`) |
| Fechar o teclado (voltar, "concluído") | espaçador volta a 0 | volta a 0; folha no tamanho natural; sem faixa em branco |
| Janela baixa (paisagem, fonte grande) com teclado aberto | folha vaza | se o rodapé fixo deixar menos de 48 dp para o campo, o rodapé vai para o fim da rolagem (D-3) |
| Abrir modal aninhado (data, categoria, loja, conta) com o teclado aberto | ? (não testado) | teclado fecha, espaçador 0; ao voltar, sem sobra (checklist) |
| Web | espaçador 0 | igual; rodapé visível sem rolar |

</frozen-after-approval>

## O que as Stories 13.1 e 13.2 já fizeram

- 13.1: um único `KeyboardProvider` (`statusBarTranslucent`, `navigationBarTranslucent`) em `app/_layout.tsx`, envolvendo todos os `Modal` do app, e o `react-native-avoid-softinput` removido. Com isso o `KeyboardSafeView` passou a receber eventos dentro dos modais.
- 13.2: a rolagem de **tela** com campo é o `KeyboardAwareScrollViewCompat`, com os padrões em `components/keyboardScrollDefaults.ts` (`KEYBOARD_BOTTOM_OFFSET = 50`, `SCROLL_BOTTOM_PADDING = 32`, `withKeyboardScrollDefaults`). O rodapé do `ParsedScreen` sobe com o teclado por conta da função pura `parsedFooterLayout.ts` (`MIN_FIELD_SPACE = 48`). A guarda `src/components/__tests__/keyboardScroll.test.ts` cobre 8 telas.
- A guarda da 13.2 isenta da descoberta todo componente com `<Modal` ou `<KeyboardSafeView` (`SELF_MANAGED = /<(Modal|KeyboardSafeView)\b/`). Por isso os quatro modais desta story nunca foram checados.

## Pesquisa: `KeyboardSafeView` dentro do `Modal` do RN

**Como o teclado chega ao modal (keyboard-controller 1.18.5, RN 0.81.5, nova arquitetura):**

- O `Modal` do RN abre em outra janela (um `Dialog`), mas o conteúdo dele continua na árvore React, debaixo do provider da raiz. O `useKeyboardHandler` do `KeyboardSafeView` lê o contexto normalmente.
- Os eventos nativos chegam pelo `ModalAttachedWatcher` (`android/.../modal/ModalAttachedWatcher.kt`). Ele escuta o `topShow` de cada `Modal`, liga um `KeyboardAnimationCallback` no `decorView` da janela do diálogo e repassa os eventos para o `KeyboardControllerView` da raiz.
  - No Android 12 ou mais, o callback principal fica suspenso enquanto o modal está aberto. Abaixo do 12, os eventos já vêm da janela principal.
  - Ao abrir o modal, a posição do teclado é sincronizada em 0. Ao fechar (`setOnDismissListener`), ela é sincronizada de novo e o callback principal volta.
- O mesmo watcher põe a janela do modal em `SOFT_INPUT_ADJUST_NOTHING`. A janela do modal **nunca encolhe**, então só o app pode fazer o conteúdo subir. Hoje isso é o espaçador do `KeyboardSafeView`.
- `statusBarTranslucent` e `navigationBarTranslucent` do `Modal`: no RN 0.81 os getters devolvem `field || isEdgeToEdgeFeatureFlagOn` (`ReactModalHostView.kt`). Com o `edgeToEdgeEnabled=true` do SDK 54 (conferido na 13.1), o modal já é de tela inteira, de ponta a ponta. Passar as props não muda nada e não é preciso. As coordenadas da janela do modal são as da tela, e a altura do teclado já inclui a barra de navegação.
- Web: o `registerEventHandler` da biblioteca é um NOOP (`event-handler.web.js`), então o espaçador fica em 0.

**Por que o modal não usa o `KeyboardAwareScrollViewCompat` da 13.2:**

O `KeyboardAwareScrollView` compensa o teclado sozinho:
- acrescenta ao fim do conteúdo uma `Reanimated.View` com `paddingBottom = teclado + 1`;
- rola o campo comparando a posição dele na janela com `altura da janela − teclado`.

Dentro de uma folha que o `KeyboardSafeView` já ergueu, o campo seria compensado duas vezes (rolagem a mais e faixa do tamanho do teclado no fim). É o mesmo erro de "subir duas vezes" que a 13.5 corrige no chat.

Sem o espaçador, as folhas curtas (criar lista, conta comum) ficariam com a área rolável atrás do teclado. Por isso o padrão de modal é **erguer a folha** (o `KeyboardSafeView`, como diz o spine) e **ajustar a rolagem por dentro**, sem `KeyboardAwareScrollView`.

**Comportamento nativo que ajuda (a confirmar no aparelho):** o `ReactScrollView` estende o `ScrollView` do Android e chama `super.onSizeChanged`. Quando a área rolável encolhe e o campo focado estava visível, o Android rola para mantê-lo visível, sem margem. Ao trocar de campo, o `requestChildFocus` chama `scrollToChild`. O ajuste explícito no fim da animação (abaixo) garante a folga mínima e não depende desse detalhe.

## Auditoria dos modais (baseline `d569c98`)

| Modal | Onde abre | Contêiner hoje | Folha | Campos | Botão principal | Rolagem | Faixa/sobra | Mudança |
|---|---|---|---|---|---|---|---|---|
| `src/components/transaction/TransactionBottomSheet.tsx` | Início → FAB "Cadastro" (e atalho de transferência) — `app/(tabs)/index.tsx` | `Modal transparent` > `View flex` > fundo `absoluteFill` + `KeyboardSafeView style={flex}` (sem `justifyContent`) > `View flex` + `Animated.View` | folha de baixo, `maxHeight: "85%"`, `paddingBottom: max(insets.bottom, 20)`; desliza de `Dimensions.get("window").height` | Valor, Descrição, dízimo (Percentual, dias), itens (`ItemsSection`: descrição, qtd, UN, preço), busca de categoria inline (`CategorySelectorGrid`), parcelas (`InstallmentSelector`), "Repetir a cada (dias)"; `AccountPicker` compacto e `DatePickerField` abrem modal próprio (13.4 / sem campo) | "Salvar" no **fim** da rolagem | `ScrollView` **sem** `keyboardShouldPersistTaps` | folha não encolhe; com `flex-start` o excesso vai para baixo (fundo da folha atrás do teclado); faixa de `insets.bottom` | `KeyboardSheet`; "Salvar" no rodapé; `return null` quando invisível continua |
| `src/components/shared/AccountFormModal.tsx` | aba Contas → "+" ou tocar numa conta — `app/(tabs)/accounts.tsx` | `Modal transparent` > `View modalRoot (flex-end)` > fundo + `KeyboardSafeView style={modalRoot}` > `View flex` + `Animated.View` | folha de baixo, `maxHeight: "90%"`, `padding: 24`, `paddingBottom: max(insets.bottom, 24)` | Nome, Saldo inicial **ou** Limite/Fechamento/Vencimento (cartão), Aporte e Dia do aporte (`SavingsGoalSection`) | "Criar conta"/"Salvar" no fim da rolagem; "Excluir conta" logo abaixo (edição) | `ScrollView` com `handled` | com cartão + objetivo, folha alta: com `flex-end` o excesso sai por cima (cabeçalho fora da tela); faixa de `insets.bottom` | `KeyboardSheet`; "Criar conta"/"Salvar" no rodapé; "Excluir conta" fica no fim da rolagem; o `Modal` de excluir (sem campo, com `ScrollView` horizontal) fica |
| `src/components/wishlist/CreateListModal.tsx` | aba Lista de desejos e `/wishlist` → "Criar primeira lista" ou "+" | `Modal transparent` > `View kav (flex-end)` > fundo + `KeyboardSafeView style={kav}` > `View flex` + `Animated.View` | cartão de baixo, sem `maxHeight`, `paddingBottom: max(insets.bottom, 24)`; mola de 600 | Nome da lista (`autoFocus`, Enter confirma) | "Cancelar" + "Criar Lista" logo abaixo do campo (sem rolagem) | nenhuma | provavelmente já sobe; faixa de `insets.bottom` | `KeyboardSheet`: botões no rodapé; corpo com um campo |
| `src/components/wishlist/AddItemModal.tsx` | `/wishlist/[listId]` → "+" (ou `?addItem=1`); editar item | `Modal transparent` > `View kav (flex-end)` > fundo + `KeyboardSafeView style={kav}` > `View flex` + `Animated.View`; `WishlistSearchWebView`, `SelectionModal` e `StoreGridModal` fora do `KeyboardSafeView` | folha de baixo, `maxHeight: "92%"`, `paddingBottom: max(insets.bottom, 20)` | Link, Nome, Preço, Quantidade (`TextInput` do RN), EAN e NCM (avançado), peças do kit (`ProductFormCard`); `CategoryPickerModal`/`StoreGridModal` (13.4) | "Cancelar" + "Adicionar à lista"/"Salvar alterações" (só quando válido) no fim da rolagem | `ScrollView` com `handled`; um `ScrollView` horizontal (poupança) | folha alta: excesso sai por cima; faixa de `insets.bottom` | `KeyboardSheet`; ações no rodapé; o horizontal fica |

Sobre "espaço em branco ao fechar":
- Nos quatro modais, o espaçador volta a 0 no `onEnd` com altura 0, e o `Modal` do RN desmonta os filhos quando fica invisível. Por isso cada abertura começa com o espaçador em 0.
- O risco que sobra está no watcher nativo quando há modal aninhado com o teclado aberto: o callback principal volta no `dismiss` do modal de dentro enquanto o de fora segue aberto. Isso fica na checklist (itens 7 e 8). Se aparecer sobra, o conserto vai no próprio `KeyboardSheet` (zerar no `onShow`/foco), sem patch na biblioteca.
- A faixa que existe hoje aparece com o teclado **aberto**: é o `paddingBottom` da folha somado a um teclado que já inclui a barra de navegação.

## Padrão proposto (formulário em modal)

**`src/components/shared/KeyboardSheet.tsx` (novo, D-2)**

É o contêiner único de folha com formulário dentro de `Modal`. O modal continua dono do `<Modal>`, do fundo escuro (`absoluteFillObject`) e da animação de entrada e saída. Ele passa ao `KeyboardSheet`:
- `sheetStyle`: o `Animated.Value` do RN para o `translateY` e as cores;
- `maxHeightRatio`: 0,85, 0,90 ou 0,92, como hoje;
- `header`, `children` (os campos) e `footer` (o botão principal).

Estrutura:

- **Raiz:** `KeyboardSafeView` com `flex: 1`, `justifyContent: "flex-end"` e `paddingTop: insets.top + SHEET_TOP_GAP`. Assim a folha nunca entra embaixo da barra de status.
- **Folha:** `Animated.View` com `flexShrink: 1`, `minHeight: 0`, `maxHeight: maxHeightRatio × janela`, `paddingBottom: max(insets.bottom, base)`. É ela que encolhe quando o espaçador cresce.
- **Cabeçalho:** fixo, medido no `onLayout`.
- **Rolagem:** `ScrollView` vertical, com `keyboardShouldPersistTaps="handled"`, `flexShrink: 1`, `onScroll`/`onLayout` para a posição.
- **Rodapé:** fixo, abaixo da rolagem, medido no `onLayout`. Com a folha erguida, ele fica logo acima do teclado. Quando `computeKeyboardSheetLayout` disser que não cabe, o mesmo `footer` é renderizado no fim da rolagem (D-3).
- **Ajuste até o campo:** no `onEnd` do teclado com altura > 0, o `KeyboardSheet` mede:
  - o campo focado (`TextInput.State.currentlyFocusedInput()` → `measureInWindow`);
  - a área rolável (`measureInWindow`).

  Em seguida rola `computeFocusScrollDelta(...)`. A troca de campo com o teclado aberto fica com o `requestChildFocus` nativo, e o ajuste do `onEnd` não faz nada se o campo já estiver visível.

**`src/components/shared/KeyboardSafeView.tsx` (ajuste, sem mudar o uso)**

- Ganha a prop opcional `liftDiscount`, que é quanto descontar do teclado. O espaçador passa a ser `keyboardLift(e.height, liftDiscount)`, uma função *worklet* pura.
- O `KeyboardSheet` passa `liftDiscount = paddingBottom da folha − SHEET_KEYBOARD_GAP`. Assim o conteúdo da folha fica a `SHEET_KEYBOARD_GAP` do teclado, sem a faixa de `insets.bottom`.
- Sem a prop, o comportamento é o de hoje. O `KeyboardSafeView` continua sendo o único lugar com `useKeyboardHandler` para modais.

**`src/components/shared/keyboardSheetLayout.ts` (novo, sem `react-native`, testável no vitest)**

- `SHEET_KEYBOARD_GAP = 12`: folga entre o conteúdo da folha e o teclado (≥ 8 dp do FR-29).
- `SHEET_TOP_GAP = 8`: folga abaixo da barra de status.
- `MIN_FIELD_SPACE = 48`: o mesmo valor da 13.2. Ele vai para `components/keyboardScrollDefaults.ts`, e o `parsedFooterLayout.ts` passa a reexportá-lo, sem mudar os testes dele.
- `keyboardLift(keyboardHeight, liftDiscount)`, com `"worklet"`: devolve `max(teclado − desconto, 0)` e 0 para entradas inválidas. A curva é contínua: com teclado 0, o resultado é 0.
- `computeKeyboardSheetLayout({ windowHeight, keyboardHeight, insetTop, sheetPaddingBottom, headerHeight, footerHeight, maxHeightRatio })` devolve `{ lift, sheetMaxHeight, scrollSpace, footerPinned }`:
  - `lift` = `keyboardLift(keyboardHeight, sheetPaddingBottom − SHEET_KEYBOARD_GAP)`;
  - `sheetMaxHeight` = `min(maxHeightRatio × windowHeight, windowHeight − insetTop − SHEET_TOP_GAP − lift)`;
  - `footerPinned` = `false` só quando o teclado está aberto e `scrollSpace < MIN_FIELD_SPACE`.

  O `KeyboardSheet` usa o resultado (com `useKeyboardState` e `useWindowDimensions`, como o `ParsedScreen`) para decidir onde fica o rodapé. O encolhimento em si fica com o Yoga (`flexShrink`), sem conta por quadro.
- `computeFocusScrollDelta({ inputTop, inputBottom, viewportTop, viewportBottom, gap })` devolve quanto rolar:
  - positivo se o campo passa do fundo da área menos a folga;
  - negativo se ele está acima do topo mais a folga;
  - 0 se já está visível;
  - se o campo é mais alto que a área, alinha pelo topo (campo multiline).

**Nos quatro modais (Code Map):** o miolo `KeyboardSafeView` > `View flex` > `Animated.View` > `ScrollView` vira `<KeyboardSheet header={…} footer={…}>{campos}</KeyboardSheet>`. Saem os estilos `spacer`/`flex` de dentro do `KeyboardSafeView` e o `paddingBottom` extra do corpo que servia ao botão no fim. A lógica e o texto ficam iguais.

## Decisões do dono (aprovadas em 28/10: D-1 a, D-2 a, D-3 a)

- **D-1: onde fica o botão de salvar.**
  - (a) No rodapé fixo da folha, fora da rolagem, logo acima do teclado. "Excluir conta" e os botões secundários ficam na rolagem.
  - (b) No fim da rolagem, alcançável rolando, como na 13.2.

  O critério diz "o campo focado **e o botão de salvar** ficam acima do teclado", e a nova transação é longa. **Recomendado: (a).**
- **D-2: forma do padrão.**
  - (a) Componente novo `KeyboardSheet` sobre o `KeyboardSafeView`, com as funções puras em `keyboardSheetLayout.ts`. Os quatro modais só trocam o contêiner, e a guarda exige o componente.
  - (b) Só corrigir o `KeyboardSafeView` e ajustar à mão os estilos de cada modal (`flexShrink`, desconto do inset, rodapé, ajuste até o campo). Isso repete a lógica 4 vezes e dificulta a guarda e o reuso na 13.4.

  **Recomendado: (a).**
- **D-3: janela baixa com o teclado aberto** (paisagem, fonte do sistema 1,3 ou 2,0, celular ≤ 640 dp).
  - (a) Se o rodapé fixo deixar menos de 48 dp para o campo (`footerPinned = false`), o rodapé vai para o fim da rolagem. O campo fica visível, e o botão fica alcançável rolando. É a mesma regra do `parsedFooterLayout`.
  - (b) O rodapé fica sempre fixo, mesmo que o campo fique quase sem espaço.

  **Recomendado: (a).**

## Code Map

- `src/components/shared/KeyboardSafeView.tsx` -- prop `liftDiscount` e espaçador por `keyboardLift`
- `src/components/shared/KeyboardSheet.tsx` (novo) -- contêiner de folha com cabeçalho, rolagem, rodapé e ajuste até o campo
- `src/components/shared/keyboardSheetLayout.ts` (novo) -- `keyboardLift`, `computeKeyboardSheetLayout`, `computeFocusScrollDelta`, constantes
- `components/keyboardScrollDefaults.ts` -- recebe `MIN_FIELD_SPACE`; `src/components/invoice/parsedFooterLayout.ts` reexporta
- `src/components/transaction/TransactionBottomSheet.tsx`, `src/components/shared/AccountFormModal.tsx`, `src/components/wishlist/CreateListModal.tsx`, `src/components/wishlist/AddItemModal.tsx` -- usar o `KeyboardSheet`; botão principal no `footer`
- `src/components/shared/__tests__/keyboardSheetLayout.test.ts` (novo) -- funções puras
- `src/components/__tests__/keyboardScroll.test.ts` -- novo bloco "modais com formulário (Story 13.3)"
- Referência: `src/components/invoice/parsedFooterLayout.ts` e o teste dele (estilo da função pura e das sondas)

## Tasks & Acceptance

**Execution:**
- [x] `keyboardSheetLayout.ts` e testes:
  - `keyboardLift`: teclado 0 dá 0; desconto maior que o teclado dá 0; valores negativos, `NaN` e `Infinity` dão 0; a curva é contínua e monótona.
  - `computeKeyboardSheetLayout`: retrato 412×900 com teclado de 320; paisagem 800×360 com teclado de 200 (`footerPinned = false`); limite exato de 48; teclado fechado sempre com `footerPinned = true` e `lift = 0`.
  - `computeFocusScrollDelta`: campo abaixo, acima, já visível, maior que a área; a folga é respeitada.
- [x] `MIN_FIELD_SPACE` em `keyboardScrollDefaults.ts`, reexportado pelo `parsedFooterLayout.ts`; os testes da 13.2 continuam passando sem mudança.
- [x] `KeyboardSafeView` com `liftDiscount` (opcional; sem a prop, igual a hoje)
- [x] `KeyboardSheet` conforme o padrão; rodapé no lugar decidido por `footerPinned` (D-3)
- [x] Os quatro modais com o `KeyboardSheet` e o botão principal no `footer` (D-1); fundo, animação, `AppAlertHost` e modais aninhados como estão
- [x] Guarda (`keyboardScroll.test.ts`, bloco novo; ver "Guarda")
- [x] Playwright no build web (ver Verification)
- [x] Itens desta story na checklist da Story 13.7 (ver Verification)

**Guarda: como a 13.3 aperta o `SELF_MANAGED` (só nestes arquivos)**

- `MODAL_FORMS` = os quatro arquivos da auditoria. Cada um:
  1. importa `KeyboardSheet` de `@/src/components/shared/KeyboardSheet` e o renderiza exatamente uma vez, dentro de `<Modal>` (`jsxUsesInsideModal`);
  2. passa `footer=` ao `KeyboardSheet`;
  3. não renderiza `<KeyboardSafeView` direto, nem `KeyboardAwareScrollViewCompat`, `KeyboardAwareScrollView`, `KeyboardAvoidingView` (de qualquer origem) ou `KeyboardStickyView`. Isso evita a compensação dupla;
  4. não tem rolagem crua vertical (`ScrollView`/`FlatList`/`SectionList` sem `horizontal`). As exceções têm nome e contagem, como o `SCROLL_EXCEPTIONS`: o horizontal do diálogo de excluir conta no `AccountFormModal` e o horizontal de poupança no `AddItemModal`.
- Só `src/components/shared/KeyboardSheet.tsx` renderiza `<KeyboardSafeView`. Um uso novo fora dele falha e aponta o arquivo.
- **Descoberta de modais:** todo arquivo de `app/`, `src/` ou `components/` com `<Modal` e campo (`hasField`) precisa estar em `MODAL_FORMS` ou em `MODAL_PENDING`, com o motivo:
  - `CategoryPickerModal`, `StoreGridModal`, `AccountPicker`, `app/about.tsx` ("APAGAR TUDO"), `WelcomeCarousel` e `DebugTools` → Story 13.4;
  - `app/sync.tsx` → modal do QR sem campo; os campos estão na tela, coberta pela 13.2.

  A 13.4 esvazia a parte dela da lista.
- **`SELF_MANAGED`:** deixa de ser o regex `/<(Modal|KeyboardSafeView)\b/`. Um componente com campo só é tratado como "cuida do teclado sozinho" na descoberta de telas da 13.2 se estiver em `MODAL_FORMS` (e passar nas regras acima) ou em `MODAL_PENDING`. Um componente novo com `<Modal` e campo, fora das duas listas, passa a falhar.
- Auto-teste com trechos que devem e não devem casar:
  - `KeyboardSheet` fora de `Modal`;
  - sem `footer`;
  - `KeyboardAwareScrollViewCompat` dentro do modal;
  - `ScrollView` vertical, e o `horizontal`, que passa;
  - `<KeyboardSafeView` num arquivo novo;
  - `<Modal` + `TInput` fora das listas.

**Acceptance Criteria:**
- Given o `KeyboardSafeView` funcionando com o provider da raiz, when abro a nova transação da tela inicial, o formulário de conta, a criação de lista ou a adição de item e foco qualquer campo, then o campo fica acima do teclado com folga ≥ 8 dp e o botão de salvar fica visível acima do teclado (no rodapé; em janela baixa, alcançável rolando — D-3)
- Given o teclado aberto num desses modais, when toco no botão de salvar, then o toque funciona na primeira vez
- Given o teclado aberto, when fecho o teclado, then a folha volta ao tamanho e à posição de antes, sem espaço em branco, e sem faixa entre a folha e o teclado enquanto ele está aberto
- Given um desses modais com `KeyboardAwareScrollViewCompat`, `KeyboardAvoidingView`, rolagem vertical crua ou sem `KeyboardSheet`, ou um modal novo com campo fora das listas, when rodo `npx vitest run`, then a guarda falha apontando o arquivo

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|

## Verification

**Comandos**
- `npx vitest run` e `npx tsc --noEmit`: sem falhas novas em relação ao baseline. A 13.2 fechou com os dois limpos: 93 arquivos e 1853 testes.
- `npx eslint` nos arquivos tocados, sem avisos
- `npx expo export --platform web` com exit 0
- Sondas da guarda, com arquivos temporários revertidos depois:
  - `KeyboardSafeView` direto num dos quatro;
  - `KeyboardAwareScrollViewCompat` no `AddItemModal`;
  - `ScrollView` vertical no `CreateListModal`;
  - `KeyboardSheet` sem `footer`;
  - `<Modal` + `TInput` num arquivo novo.

  A guarda precisa acusar todas.
- Sonda da função pura: trocar `computeKeyboardSheetLayout` pela regra "rodapé sempre fixo" faz os casos de paisagem e de limite falharem.

**Web (Playwright, Chromium headless, build exportado com fallback de SPA, `localStorage` com carrossel, introduções e aviso de consultas já vistos; 412×900 e 800×360)**
- `/` → FAB → "Cadastro": a folha "Nova Transação" abre; "Salvar" visível dentro da janela sem rolar; focar "Valor" e "Descrição"; clicar em "Salvar" com o formulário vazio mostra o `appAlert` de validação, e não o alerta nativo.
- `/accounts` → "+": "Nova conta"; trocar para cartão e ligar o objetivo de poupança; "Criar conta" visível sem rolar; criar a conta e conferir que ela aparece na lista.
- `/wishlist` → "Criar primeira lista" (ou o "+" do cabeçalho): o campo recebe o foco; "Criar Lista" visível; criar.
- `/wishlist/<id>?addItem=1` (ou "+" na lista criada): "Adicionar Item"; preencher nome e preço; "Adicionar à lista" visível sem rolar; abrir "avançado" e focar NCM; adicionar e conferir o item na lista.
- Em todas: o topo da folha fica abaixo do topo da janela, a folha não passa do fundo e não há faixa vazia entre a folha e o fim da janela. Sem erro de página.
- A web não simula o teclado (espaçador 0). O teste prova o rodapé, o primeiro toque e o layout, não a subida.

**Aparelho (itens para a checklist da Story 13.7, Android 16)**
1. Nova transação (Início → "Cadastro"): focar Valor, Descrição, os campos dos itens (com 3 ou mais itens), Parcelas e "Repetir a cada (dias)". O campo fica acima do rodapé, "Salvar" fica logo acima do teclado, sem faixa entre eles, e responde no 1º toque.
2. Nova transação, despesa "Dízimo": focar Percentual e "Últimos quantos dias?". O campo fica visível.
3. Conta nova de cartão, com objetivo de poupança: focar Nome, Limite, Fechamento, Vencimento, Aporte e Dia do aporte. O cabeçalho "Nova conta" não sai da tela, e "Criar conta" fica acima do teclado.
4. Editar conta: "Salvar" no rodapé, "Excluir conta" no fim da rolagem; o diálogo de excluir abre e fecha sem deixar sobra.
5. Criar lista: o teclado abre junto com o cartão (`autoFocus`); "Criar Lista" logo acima do teclado; Enter cria a lista.
6. Adicionar item: focar Link, Nome, Preço, Quantidade, EAN e NCM, e um campo de peça no modo kit. "Adicionar à lista" fica acima do teclado assim que o formulário fica válido.
7. Com o teclado aberto, abrir um modal aninhado (data na nova transação, categoria no item, loja, conta de destino na transferência) e voltar. Sem faixa em branco, e o teclado volta a erguer a folha ao focar de novo.
8. Fechar cada modal com o teclado aberto (botão voltar, X, tocar no fundo) e reabrir. A folha abre no tamanho normal, sem sobra.
9. Fechar o teclado (voltar ou "concluído") em cada modal. A folha volta ao tamanho e à posição de antes.
10. Paisagem, fonte do sistema 1,3 e 2,0, e celular com até 640 dp: repetir 1, 3 e 6. O campo focado fica visível, e o botão de salvar fica no rodapé ou, se não couber, no fim da rolagem (D-3).
11. Trocar de campo numérico para texto (e o contrário) com o teclado aberto. A folha acompanha a altura do teclado sem pular.
12. Navegação de 3 botões e por gestos: sem faixa entre a folha e o teclado e sem conteúdo sob a barra de navegação com o teclado fechado.
13. Se houver aparelho com Android 7 a 10, repetir 1, 5 e 7 (no Android < 12 os eventos vêm da janela principal).

## Implementation Notes

**Arquivos**
- Novos: `src/components/shared/KeyboardSheet.tsx`, `src/components/shared/keyboardSheetLayout.ts`, `src/components/shared/__tests__/keyboardSheetLayout.test.ts`.
- Alterados: `src/components/shared/KeyboardSafeView.tsx` (`liftDiscount` e espaçador por `keyboardLift`), `components/keyboardScrollDefaults.ts` (recebe `MIN_FIELD_SPACE`), `src/components/invoice/parsedFooterLayout.ts` (reexporta; teste da 13.2 sem mudança), os quatro modais (`TransactionBottomSheet`, `AccountFormModal`, `CreateListModal`, `AddItemModal`) e `src/components/__tests__/keyboardScroll.test.ts` (bloco "modais com formulário (Story 13.3)" e auto-testes).
- Os modais só trocaram o contêiner: `header` (alça/título/fechar), campos como `children`, botão principal no `footer`. Fundo `absoluteFillObject`, animação de entrada/saída, `AppAlertHost`, `return null` da nova transação e modais aninhados (`WishlistSearchWebView`, `SelectionModal`, `StoreGridModal`, `CategoryPickerModal`, diálogo de excluir conta) ficaram como estavam. "Excluir conta" ficou no fim da rolagem; "Cancelar" foi junto com o botão principal no rodapé em `CreateListModal` e `AddItemModal` (era a mesma linha de ações).

**Testes**
- `keyboardSheetLayout.test.ts`: 27 testes (`keyboardLift`, `computeKeyboardSheetLayout` com retrato 412×900/teclado 320, paisagem 800×360/teclado 200, limite exato 48/47, teclado fechado; `computeFocusScrollDelta`).
- `keyboardScroll.test.ts`: de 74 para 95 testes (bloco da 13.3 + auto-testes dos detectores).
- Suite: 94 arquivos, 1901 testes, todos passando (baseline 93/1853). `npx tsc --noEmit`: 0 erros. `npx eslint` nos arquivos tocados: sem avisos. `npx expo export --platform web`: exit 0.
- Sondas da guarda (arquivos temporários, revertidos): `<KeyboardSafeView` direto no `CreateListModal` (acusado no bloco do modal e em "só o KeyboardSheet renderiza o KeyboardSafeView"); `KeyboardAwareScrollViewCompat` no `AddItemModal`; `ScrollView` vertical no `CreateListModal` ("ScrollView vertical"); `KeyboardSheet` sem `footer` no `AccountFormModal`; `ProbeModal.tsx` novo com `<Modal` + `TInput` ("todo componente com <Modal e campo…"). Todas acusadas.
- Sonda da função pura: `footerPinned = true` fixo faz falhar "paisagem 800×360" e "limite exato".
- Playwright (Chromium headless, build exportado, 412×900 e 800×360): nova transação ("Salvar" visível sem rolar, foco em Valor e Descrição, toque em "Salvar" vazio mostra o `appAlert` "Valor inválido"), nova conta (cartão, depois poupança com objetivo; "Criar conta" visível; conta criada aparece), criar lista (campo com foco; "Criar Lista" visível; lista criada), adicionar item (nome e preço; "Adicionar à lista" visível; avançado + foco no NCM; item adicionado). Em todas: topo da folha ≥ 0, fundo da folha = fundo da janela (±1 px), sem erro de página e sem diálogo nativo.

**Decisões além da spec**
- `KeyboardSafeView` ganhou também a prop `pointerEvents`; o `KeyboardSheet` passa `"box-none"` na raiz, e o espaçador é `pointerEvents="none"`. Antes a raiz do `KeyboardSafeView` cobria a tela acima da folha e engolia o toque no fundo escuro (fechar tocando fora).
- O ajuste até o campo usa o `useKeyboardState` (atualiza no `keyboardDidShow`, fim da animação) com um atraso de 60 ms para o espaçador e o Yoga assentarem, em vez de um segundo `useKeyboardHandler`: o `KeyboardSafeView` continua o único com handler. Só rola se o campo focado estiver dentro do conteúdo desta rolagem (campo de modal aninhado fica de fora).
- `headerHeight` é medido como `y + height` do cabeçalho (inclui o `paddingTop` da folha).
- `CreateListModal` não tinha `maxHeight`; passa `maxHeightRatio={1}` (a folha fica limitada só pela barra de status + `SHEET_TOP_GAP`).
- Rodapé com `paddingTop: 12` no `KeyboardSheet`; saíram os `marginTop` dos botões e o `paddingBottom: 32` do corpo da nova transação.
- Guarda: `horizontal={expressão}` ou `horizontal={false}` conta como rolagem vertical; só `horizontal` e `horizontal={true}` passam.

**Checklist para a Story 13.7 (aparelho)**: os itens 1 a 13 da seção "Aparelho" acima, mais:
14. Tocar no fundo escuro acima da folha fecha o modal (efeito do `pointerEvents="box-none"`), com e sem teclado aberto.
15. Ao focar um campo no fim da nova transação, a rolagem leva o campo para cima do rodapé sem "pulo" duplo (ajuste do `KeyboardSheet` somado ao `requestChildFocus` nativo).
