---
title: 'Story 13.4: fazer as buscas e diálogos em modal subirem'
type: 'bugfix'
created: '2026-10-28'
status: 'in-progress'
baseline_commit: 'a836f8b413766cd5894c1885982dde56206f7416'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-20-teclado.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-13-1-sistema-unico-de-teclado.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-13-2-padronizar-a-rolagem-das-telas-com-campos.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-13-3-fazer-os-modais-com-formulario-subirem.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Seis componentes abrem um `Modal` do RN com campo e não tratam o teclado. Estão no `MODAL_PENDING` da guarda `src/components/__tests__/keyboardScroll.test.ts`:

- busca de categoria (`CategoryPickerModal`);
- busca de loja (`StoreGridModal`);
- busca de conta no modo compacto (`AccountPicker`);
- diálogo "APAGAR TUDO" (`app/about.tsx`);
- chave de IA no onboarding (`WelcomeCarousel`);
- ferramentas de debug (`DebugTools`).

A janela do `Modal` fica em `SOFT_INPUT_ADJUST_NOTHING` (pesquisa da 13.3) e nunca encolhe. Por isso, ao focar o campo, a parte de baixo do modal fica atrás do teclado:

- nas buscas, a lista de resultados e, em janela baixa, o próprio campo;
- no "APAGAR TUDO", o campo e o botão "Resetar";
- no onboarding, a chave e o "Começar Tour!".

Três dessas buscas usam lista virtualizada (`FlashList`). A lista não cabe dentro do `ScrollView` do `KeyboardSheet` da 13.3.

**Approach:** Reusar a base da 13.3: o `KeyboardSafeView` com `liftDiscount`, as funções puras de `keyboardSheetLayout.ts` e o `useSheetBackdropPress`. Em cima dela entram duas formas de contêiner:

1. **Busca em lista** (`KeyboardListSheet`, novo). A folha sobe e encolhe. O cabeçalho com o campo de busca fica sempre fixo. A lista do chamador (`FlashList` ou `ScrollView`) é a parte que encolhe. Não há rolagem até o campo, porque o campo nunca rola.
2. **Formulário curto em diálogo ou tela cheia** (o próprio `KeyboardSheet`, com a nova prop `placement`). O valor `"center"` serve ao "APAGAR TUDO" e o `"fill"` ao `WelcomeCarousel`. Continuam o mesmo rodapé fixo, o ajuste até o campo e a regra de janela baixa (D-3 da 13.3).

A guarda passa a exigir esses contêineres nos seis arquivos. O `MODAL_PENDING` deixa de existir. O `app/sync.tsx` vai para uma lista própria de "modal sem campo, campo na tela", que a guarda confere.

## Boundaries & Constraints

**Always:**
- Um só sistema de teclado: o keyboard-controller com o `KeyboardProvider` da raiz (13.1). O modal sobe pelo `KeyboardSafeView`, e só pelos contêineres padrão (`KeyboardSheet` e `KeyboardListSheet`). Nunca há segunda compensação na mesma árvore (`KeyboardAwareScrollView`/Compat, `KeyboardAvoidingView`, `KeyboardStickyView`).
- Folga de pelo menos 8 dp entre o campo focado (ou a lista, ou o botão) e o teclado (FR-29).
- Ao fechar o teclado, o modal volta ao tamanho e à posição de antes, sem espaço sobrando.
- Na web o espaçador fica em 0, e tudo continua funcionando.
- Texto de UI em pt-BR com acentos. Os textos atuais não mudam, inclusive os em inglês do `DebugTools`, que é só de desenvolvimento.
- Alerta só por `appAlert`/`appConfirm`. O `AppAlertHost` dentro do `WelcomeCarousel` e do `DebugTools` fica.
- Nenhuma View animada maior que a tela (Mali, `docs/tour-crash-fixes.md`):
  - o espaçador nunca passa da altura do teclado;
  - os fundos escuros continuam `absoluteFillObject` ou `flex: 1`;
  - as animações de entrada (`SlideInDown`, `animationType`) continuam sendo de translação.
- Nenhuma mudança em `android/`, `ios/` ou `packages/sync`.
- A lógica fica igual: filtros, seleção, `handleReset`, `handleSaveApiKey`, os overrides de debug e os eventos.

**Never:**
- Mexer no chat da IA (13.5) ou na barra da chave da NF (13.6).
- Trocar a biblioteca de teclado ou aplicar patch nela.
- Trocar `FlashList` por `.map` (a não ser que a D-1 (b) seja escolhida) ou mudar a aparência dos itens.
- Mudar o comportamento dos 4 modais da 13.3, exceto pelo que a prop nova `placement` exigir no `KeyboardSheet`. O padrão é `"bottom"`, igual a hoje.
- Acrescentar fechar tocando fora onde hoje não existe: `CategoryPickerModal`, `WelcomeCarousel` e `DebugTools`. No "APAGAR TUDO", ver R-4.

## I/O & Edge-Case Matrix

| Cenário | Antes (leitura do código, baseline `a836f8b`) | Depois |
|---|---|---|
| Busca de categoria (abre com `autoFocus`) | folha de até 80% presa embaixo; o teclado cobre o fim da lista; com folha alta, o campo fica perto do teclado | a folha sobe e encolhe; o campo fica fixo no topo e a lista aparece entre ele e o teclado, rolável |
| Busca de loja ("Mais lojas..." no adicionar item): focar a busca | grade e aviso atrás do teclado | idem; grade rolável acima do teclado |
| Conta compacta (transferência na nova transação, add-transaction, revisão da nota, holerite): focar "Buscar conta..." | folha de 75% sem `insets.bottom`; lista atrás do teclado | idem; a folha ganha `max(insets.bottom, 20)` embaixo |
| Filtrar até sobrar 0–2 itens | a folha encolhe pelo conteúdo e o topo desce | igual a hoje (a folha segue o conteúdo), presa logo acima do teclado; "Nenhum(a) … encontrado(a)" visível |
| "APAGAR TUDO": focar o campo | cartão centrado (~400 dp); "Resetar" e às vezes o campo atrás do teclado | o cartão se centra na área acima do teclado e encolhe; o texto rola; campo e "Cancelar"/"Resetar" ficam visíveis |
| Onboarding, slide "Assistente Financeiro IA": focar a chave | slide sem rolagem vertical; campo e "Começar Tour!" atrás do teclado em celular ≤ 800 dp | a tela encolhe; o slide rola até o campo (botão ✓ junto dele); "Começar Tour!" fica logo acima do teclado |
| Debug, aba TROPHIES: focar a busca | contêiner com altura fixa de 85%; lista atrás do teclado | a folha encolhe; tier, busca e contagem ficam fixos; a lista ocupa o resto |
| Debug, aba STATE: focar "XP..."/"Saldo..." | campos atrás do teclado em janela baixa | a folha encolhe; a rolagem nativa (`requestChildFocus`) mantém o campo visível |
| Janela baixa (paisagem, fonte 2,0) numa busca | campo atrás do teclado | o título e a alça somem, e a busca e a lista ficam (R-1); sem espaço nem para uma linha, a lista fica com 0 e a busca continua visível |
| Abrir a busca de categoria de dentro de um `KeyboardSheet` (item da nova transação, peça/item do adicionar item) com o teclado aberto | ? | a busca abre com o próprio teclado (`autoFocus`); ao fechar, a folha de baixo volta sem sobra (checklist) |
| Toque no fundo com o teclado aberto (loja, conta) | fecha o modal | o 1º toque só fecha o teclado; o 2º fecha o modal (`useSheetBackdropPress`, R1 da 13.3) |
| Web | sem teclado | igual; layout sem regressão |

</frozen-after-approval>

## O que as Stories 13.1 a 13.3 já fizeram

- **13.1:** um `KeyboardProvider` na raiz, envolvendo todos os `Modal`. O `react-native-avoid-softinput` saiu.
- **13.2:** a rolagem de **tela** é o `KeyboardAwareScrollViewCompat`. O `app/about.tsx` e o `app/sync.tsx` estão no `FIELD_SCREENS`, cobertos na parte da tela.
- **13.3:**
  - `KeyboardSafeView` com `liftDiscount` e `pointerEvents`;
  - `KeyboardSheet` com cabeçalho fixo, rolagem que encolhe, rodapé fixo, ajuste até o campo por `measureLayout`, D-3 e R2;
  - `keyboardSheetLayout.ts`, com `keyboardLift`, `sheetLiftDiscount`, `sheetKeyboardHeight`, `backdropPressAction`, `computeKeyboardSheetLayout`, `computeFocusScrollDelta`/`Target`, `SHEET_KEYBOARD_GAP = 12`, `SHEET_TOP_GAP = 8` e `MIN_FIELD_SPACE = 48`;
  - o `useSheetBackdropPress`;
  - a guarda com `MODAL_FORMS`, `MODAL_PENDING` e as regras "só o `KeyboardSheet` renderiza o `KeyboardSafeView`" e "todo `<Modal` com campo está numa lista".
- **13.3, item 22 do checklist:** a busca inline do `CategorySelectorGrid` está dentro do `TransactionBottomSheet`, sem modal próprio, e já é coberta pelo `KeyboardSheet`. Nesta story ela entra só como item de aparelho (V-5), sem mudança de código.

## Auditoria dos modais (baseline `a836f8b`)

| Componente | Onde abre | Contêiner hoje | Forma | Campo | Lista / rolagem | Confirmação | Aninhamento | Mudança |
|---|---|---|---|---|---|---|---|---|
| `src/components/shared/CategoryPickerModal.tsx` | `ItemsSection` (itens da nova transação, dentro do `KeyboardSheet`), `ProductFormCard` (adicionar item, dentro do `KeyboardSheet`) e `EditableItemRow` (revisão da nota, tela) | `Modal transparent slide` > `View overlay` (flex-end, fundo 0,4) > `TCard maxHeight 80%`, `paddingBottom 30` | folha de baixo | busca (`TextInput`, `autoFocus`) | `FlashList` com `keyboardShouldPersistTaps="handled"`; cerca de 60 linhas (24 categorias e 39 subcategorias) | toque na linha seleciona e fecha | **sim**: abre por cima de um `KeyboardSheet` que pode estar com o teclado aberto | `KeyboardListSheet`: cabeçalho com título, X e busca; `list` = a `FlashList`; sem toque no fundo (como hoje) |
| `src/components/wishlist/StoreGridModal.tsx` | `AddItemModal` → `SelectionModal` "Mais lojas..." | `Modal slide` > `View overlay` > fundo `absoluteFillObject` tocável + `View sheet maxHeight 75%`, `paddingBottom max(insets.bottom, 20)` | folha de baixo | busca (`TextInput`) | `FlashList` com `numColumns={5}`, **sem** `keyboardShouldPersistTaps`; aviso "Mais lojas serão adicionadas em breve." abaixo dela | toque na loja | sim: o `AddItemModal` fica embaixo (com o teclado já fechado pelo `SelectionModal`) | `KeyboardListSheet`: cabeçalho com alça, título, X e busca; `list` = `FlashList` com `handled`; o aviso vai como `ListFooterComponent` (R-2); fundo por `useSheetBackdropPress` (mantém `setQuery("")` no fechar) |
| `src/components/shared/AccountPicker.tsx` (só `CompactAccountPicker`) | gatilho compacto em `TransactionBottomSheet` (transferência, destino), `app/add-transaction.tsx`, `PayslipReview` | `Modal animationType="none"` > fundo `Animated.View absoluteFill` (FadeIn) + `View sheetContainer absoluteFill flex-end` > espaçador `flex:1` + `Animated.View` (SlideInDown) `maxHeight 75%`, `padding 20` **sem** `insets.bottom` | folha de baixo | "Buscar conta..." | `ScrollView` + `.map`, com `handled` | toque na conta | sim, a partir do `TransactionBottomSheet` | `KeyboardListSheet` com `entering`/`exiting` do Reanimated mantidos; `list` = o `ScrollView` atual; fundo por `useSheetBackdropPress`. O modo lista (inline) não muda (`INLINE_FIELD_COMPONENTS`) |
| `app/about.tsx`, diálogo "APAGAR TUDO" | Sobre → "Resetar aplicativo" | `Modal transparent fade` > `View overlay` (centro, padding 20, fundo 0,6) > cartão `maxWidth 420`, `padding 24` | **diálogo centrado** | frase de confirmação (`TextInput`, sem `autoFocus`) | nenhuma | "Cancelar" e "Resetar" (`TButton variant="danger"`, só habilitado com a frase certa), lado a lado, abaixo do campo | o `SelectionModal` de tema e o `ScreenIntroModal` estão no mesmo arquivo, sem campo | `KeyboardSheet placement="center"` (D-2): cabeçalho com ícone e título; corpo com descrição, rótulo e campo; `footer` com a linha "Cancelar"/"Resetar" |
| `src/components/tour/WelcomeCarousel.tsx`, slide 5 "Assistente Financeiro IA" | primeira abertura (`WelcomeCarouselHost` em `app/_layout.tsx`, chave `domus_welcome_done_v1`) | `Modal fade statusBarTranslucent` > `View overlay` (fundo 0,85) > `View container flex:1` com `paddingTop insets.top+16` e `paddingBottom insets.bottom+16` > `ScrollView horizontal pagingEnabled scrollEnabled={false}` (6 slides de `SCREEN_W`) + `bottomBar` | **tela cheia** | chave de API (`TextInput secureTextEntry`) com o botão ✓ ao lado; o slide **não rola** na vertical | o paginador horizontal | ✓ (salvar a chave) inline; "Começar Tour!" na barra de baixo | não | `KeyboardSheet placement="fill"` (D-3): `header` = "Pular"; corpo = o paginador; `footer` = a barra (pontos e "Próximo"/"Começar Tour!") |
| `src/components/debug/DebugTools.tsx` (só com `__DEV__`) | botão flutuante "terminal" (`app/_layout.tsx`) | `Modal slide transparent` > `View modalOverlay` (flex-end) > `View container height 85%` | folha de baixo, altura fixa | aba TROPHIES: busca; aba STATE: "XP..." e "Saldo..." (numéricos) | TROPHIES: `FlashList` (centenas de troféus) com `handled`; as outras abas usam `ScrollView` sem `handled` | sem botão de confirmação: a busca filtra e os campos aplicam ao digitar | o detalhe do troféu é um `Modal` sem campo | `KeyboardListSheet heightRatio={0.85}`: cabeçalho com título, X, abas e, na TROPHIES, tier, busca e contagem; `list` = `FlashList` ou `ScrollView` (com `handled`) conforme a aba |
| `app/sync.tsx`, modal do QR | Sync → "Mostrar QR" | `Modal fade` > `Pressable` > `ScrollView` > cartão | diálogo | **nenhum** (os campos `TInput` estão na tela, coberta pela 13.2) | `ScrollView` (`SCROLL_EXCEPTIONS` da 13.2) | "Fechar" | não | **nenhuma mudança de código**: sai do `MODAL_PENDING` para `MODAL_FIELDS_OUTSIDE`, e a guarda confere que nenhum campo fica dentro de `<Modal>` |

Conferido no baseline: nenhum outro arquivo de `app/`, `src/` ou `components/` com `<Modal` e campo fica fora de `MODAL_FORMS` e `MODAL_PENDING`, porque a guarda da 13.3 passa. O `SelectionModal`, o `QRScannerModal`, o `ScreenIntroModal` e o diálogo de excluir conta não têm campo.

**Notas de aninhamento (13.3, R4/R5):**

- **`CategoryPickerModal` sobre um `KeyboardSheet`.** Ao abrir, o watcher nativo sincroniza o teclado em 0. Depois o `autoFocus` abre o teclado na janela do diálogo de cima.
  - O `KeyboardSafeView` da folha de baixo **também** recebe esses eventos, porque o provider é o mesmo, e sobe por trás do fundo escuro. Isso não aparece, e ao fechar volta a 0.
  - O ajuste até o campo do `KeyboardSheet` de baixo falha no `measureLayout`, porque o campo não é dele, e não rola (R4).
  - O risco que sobra é a sobra de elevação ao voltar. Fica na checklist (V-6), como o R5 da 13.3.
- **`AccountPicker` compacto aberto com o teclado do "Valor" aberto.** O gatilho é um `Pressable` dentro de rolagem `handled`. O teclado continua aberto até o `Modal` tomar o foco da janela e o watcher zerar. A busca não tem `autoFocus`.
- **`StoreGridModal`.** Abre a partir do `SelectionModal` (sem campo), então o teclado do `AddItemModal` já fechou.

## Padrão proposto

### 1. Busca em lista: `src/components/shared/KeyboardListSheet.tsx` (novo, D-1 a)

É o contêiner de folha com busca e lista dentro de `Modal`. O modal continua dono do `<Modal>`, do fundo escuro, do `onRequestClose` e da animação. Props:

- `header`: alça, título, X e o campo de busca. **Sempre fixo.**
- `compactHeader`: só o campo de busca (e o que mais for indispensável), usado em janela baixa (R-1).
- `list`: um único elemento rolável vertical (`FlashList`, `FlatList` ou `ScrollView`), com `keyboardShouldPersistTaps="handled"`.
- `sheetStyle`: cores, cantos e padding horizontal.
- `maxHeightRatio`: 0,80 ou 0,75, como hoje. Ou `heightRatio`, para altura fixa, como no `DebugTools`.
- `basePaddingBottom`.
- `entering`/`exiting` opcionais: a folha é uma `Reanimated.View`, para o `AccountPicker` manter o `SlideInDown`/`SlideOutDown`.

Estrutura:
- **Raiz:** `KeyboardSafeView` com `flex: 1`, `justifyContent: "flex-end"`, `paddingTop: insets.top + SHEET_TOP_GAP`, `pointerEvents="box-none"` e `liftDiscount={sheetLiftDiscount(paddingBottom)}`, como no `KeyboardSheet`.
- **Folha:** `flexShrink: 1`, `minHeight: 0`, `maxHeight` (ou `height`) igual a razão × janela e `paddingBottom: max(insets.bottom, base)`.
- **Cabeçalho:** fixo, medido no `onLayout`.
- **Lista:** o `list` dentro de uma `View` com `flexShrink: 1` e `minHeight: 0`. É ela que encolhe.

Diferenças em relação ao `KeyboardSheet`:
- não tem `ScrollView` próprio nem ajuste até o campo, porque o campo está no cabeçalho fixo e nunca rola;
- não tem rodapé obrigatório, porque a seleção é o toque na linha.

A altura do teclado vem do mesmo padrão R6 (`sheetKeyboardHeight`, começa em 0). Para isso, o `useSheetKeyboardHeight` sai do `KeyboardSheet.tsx` e passa a ser exportado e reusado.

**Conta pura nova em `keyboardSheetLayout.ts`:**

`computeKeyboardListSheetLayout({ windowHeight, keyboardHeight, insetTop, sheetPaddingBottom, headerHeight, compactHeaderHeight, maxHeightRatio })` devolve `{ lift, sheetMaxHeight, listSpace, headerCompact }`.

- `lift` e `sheetMaxHeight` são calculados como no `computeKeyboardSheetLayout`, com o mesmo código interno.
- `listSpace = sheetMaxHeight − cabeçalho − paddingBottom`.
- `headerCompact` só é `true` com o teclado aberto e `listSpace < MIN_LIST_SPACE`. Nesse caso o cabeçalho troca pelo `compactHeader` (R-1).
- `MIN_LIST_SPACE = MIN_FIELD_SPACE = 48`, a altura de uma linha.

### 2. Diálogo e tela cheia: `KeyboardSheet` com `placement` (D-2 a e D-3 a)

`placement: "bottom" | "center" | "fill"`. O padrão é `"bottom"`, e os 4 modais da 13.3 não mudam.

- **`"center"` (diálogo):**
  - a raiz centra a folha (`justifyContent: "center"`, `paddingHorizontal: 20`);
  - a folha recebe `maxWidth` do chamador (420);
  - o espaçador é a altura inteira do teclado (`liftDiscount = 0`, porque o cartão não encosta na borda de baixo), e o cartão se centra na área acima do teclado, com a folga do padding da raiz (≥ 8 dp);
  - `computeKeyboardSheetLayout` ganha `placement`: no centro, `sheetMaxHeight` desconta também o padding de baixo da raiz;
  - D-3 e R2 valem igual.
- **`"fill"` (tela cheia):**
  - a raiz não tem `paddingTop` e a folha tem `flexGrow: 1`, ocupando a tela;
  - o `paddingTop` fica no `sheetStyle` do chamador (`insets.top + 16`) e o `contentContainerStyle` usa `flexGrow: 1`;
  - com o teclado, a folha encolhe pelo espaçador, como no `"bottom"`;
  - o ajuste até o campo é o mesmo (`measureLayout` no conteúdo).
- **`sheetLiftDiscount`:** passa a receber `placement` (`"center"` → 0). Continua o único lugar dessa conta (R9 da 13.3).

### 3. Mudança por modal (Code Map abaixo)

- **`CategoryPickerModal`:**
  - troca o `TCard` pelo `KeyboardListSheet`, com `sheetStyle` de mesma cor, cantos 20 e `paddingTop 16`;
  - `basePaddingBottom = 30`, `maxHeightRatio = 0.8`;
  - `compactHeader` = a barra de busca;
  - a `FlashList` vai como `list`.
- **`StoreGridModal`:**
  - `KeyboardListSheet` com `maxHeightRatio = 0.75` e `basePaddingBottom = 20`;
  - a `FlashList` ganha `keyboardShouldPersistTaps="handled"` e o aviso como `ListFooterComponent`;
  - o fundo tocável usa `useSheetBackdropPress(fechar)`, e o fechar mantém `setQuery("")`.
- **`AccountPicker` compacto:**
  - `KeyboardListSheet` com `entering`/`exiting` atuais, `maxHeightRatio = 0.75` e `basePaddingBottom = 20`;
  - saem o `sheetContainer` e o `spacer: { flex: 1 }`;
  - o fundo com FadeIn fica, e o `Pressable` usa `useSheetBackdropPress(handleClose)`.
- **`app/about.tsx`:**
  - o miolo do `Modal` de reset vira `<KeyboardSheet placement="center" header={ícone + título} footer={<View linha>Cancelar · Resetar</View>}>{descrição, rótulo, campo}</KeyboardSheet>`;
  - o fundo `rgba(0,0,0,0.6)` vira `absoluteFillObject` atrás da folha;
  - o `SelectionModal` de tema e o `ScreenIntroModal` não mudam.
- **`WelcomeCarousel`:**
  - `<KeyboardSheet placement="fill" header={Pular} footer={bottomBar}>{paginador horizontal}</KeyboardSheet>`;
  - os slides continuam `width: SCREEN_W`, e o paginador fica com `scrollEnabled={false}`;
  - a rolagem vertical do `KeyboardSheet` passa a envolver o paginador, e em celular baixo os slides também passam a rolar na vertical (melhora, R-3);
  - "Pular" fica no cabeçalho fixo, como botão absoluto dentro dele.
- **`DebugTools`:**
  - `KeyboardListSheet heightRatio={0.85}`, com o cabeçalho (título, X, abas e, na TROPHIES, tier, busca e contagem) e o `compactHeader` (abas e busca);
  - `list` = a `FlashList` (TROPHIES) ou o `ScrollView` das outras abas, este agora com `keyboardShouldPersistTaps="handled"`;
  - o `Modal` de detalhe do troféu não muda.

## Decisões do dono (aprovadas em 28/10: D-1 a, D-2 a, D-3 a)

- **D-1: padrão das buscas em lista** (categoria, loja, conta, debug).
  - (a) `KeyboardListSheet` novo, irmão do `KeyboardSheet`: busca fixa no cabeçalho, a lista do chamador encolhe, a `FlashList` fica, sem rodapé. Os dois compartilham `keyboardSheetLayout.ts`, o `useSheetKeyboardHeight` e o `useSheetBackdropPress`.
  - (b) Trocar as listas por `.map` dentro do `KeyboardSheet` (são ≤ ~60 itens, salvo o debug) e tornar o `footer` opcional. A grade de 5 colunas vira `flexWrap`, a busca pode entrar na rolagem em janela baixa (R2), e o debug perde a virtualização.

  O critério pede "o campo **e a lista**". Só um cabeçalho sempre fixo garante o campo, e a (b) mexe no contrato e na guarda do `KeyboardSheet`. **Recomendado: (a).**
- **D-2: diálogo "APAGAR TUDO".**
  - (a) Continua diálogo centrado, pelo `KeyboardSheet placement="center"`. A guarda aceita no `footer` de diálogo um botão `variant="danger"` como principal, junto de "Cancelar" na mesma linha (exceção nomeada à R7 da 13.3, só para `placement="center"`).
  - (b) Virar folha de baixo com o `KeyboardSheet` como está: "Resetar" no rodapé e "Cancelar" no fim da rolagem, como na R7.
  - (c) Componente `KeyboardDialog` separado.

  A (a) mantém a forma de confirmação destrutiva que a pessoa conhece e reusa o rodapé, o ajuste e a regra D-3 sem código novo. **Recomendado: (a).**
- **D-3: onboarding (chave de IA) com o teclado aberto.**
  - (a) `KeyboardSheet placement="fill"`: a barra "Próximo"/"Começar Tour!" fica fixa logo acima do teclado e vai para o fim da rolagem em janela baixa (D-3 da 13.3). O slide rola até o campo, com o ✓ ao lado.
  - (b) Igual à (a), mas a barra **some** enquanto o teclado está aberto e volta ao fechar. Sobra mais espaço para o slide, e a confirmação da chave é o ✓ inline.

  A (a) segue o padrão do épico ("o campo e o botão de confirmar"). A (b) ganha cerca de 70 dp em celular baixo. **Recomendado: (a).**

## Code Map

- `src/components/shared/KeyboardListSheet.tsx` (novo): folha de busca em lista
- `src/components/shared/KeyboardSheet.tsx`: `placement` (`"bottom"` | `"center"` | `"fill"`); `useSheetKeyboardHeight` exportado
- `src/components/shared/keyboardSheetLayout.ts`: `computeKeyboardListSheetLayout`, `MIN_LIST_SPACE`, `placement` em `sheetLiftDiscount` e em `computeKeyboardSheetLayout`
- `src/components/shared/CategoryPickerModal.tsx`, `src/components/wishlist/StoreGridModal.tsx`, `src/components/shared/AccountPicker.tsx` (só o compacto), `src/components/debug/DebugTools.tsx`: `KeyboardListSheet`
- `app/about.tsx`: diálogo de reset com `KeyboardSheet placement="center"`
- `src/components/tour/WelcomeCarousel.tsx`: `KeyboardSheet placement="fill"`
- `src/components/shared/__tests__/keyboardSheetLayout.test.ts`: casos novos
- `src/components/__tests__/keyboardScroll.test.ts`: bloco "buscas e diálogos em modal (Story 13.4)"; `MODAL_PENDING` removido
- Sem mudança: `app/sync.tsx`, `CategorySelectorGrid`, os 4 modais da 13.3 (salvo o `placement` padrão), o `KeyboardSafeView`

## Tasks & Acceptance

**Execution:**
- [x] `keyboardSheetLayout.ts` e testes:
  - `computeKeyboardListSheetLayout`: retrato 412×900 com teclado de 320 (lista ≥ 48, cabeçalho cheio); paisagem 800×360 com teclado de 200 (`headerCompact = true`); limites exatos 48 e 47; teclado fechado sempre com `headerCompact = false` e `lift = 0`; `heightRatio` fixo encolhendo com o teclado.
  - `sheetLiftDiscount` com `"center"` dá 0.
  - `computeKeyboardSheetLayout` com `"center"`: o cartão cabe entre a barra de status e o teclado, descontando o padding da raiz.
  - Os testes da 13.3 passam sem mudança, com o padrão `"bottom"`.
- [x] `KeyboardSheet` com `placement`. Com `"bottom"`, o comportamento e a guarda da 13.3 ficam iguais.
- [x] `KeyboardListSheet` conforme o padrão.
- [x] Os 6 componentes conforme "Mudança por modal". A lógica, os textos e os modais aninhados ficam como estão.
- [x] Guarda (ver abaixo), com auto-testes e sondas.
- [x] Playwright no build web (Verification).
- [x] Itens desta story na checklist da Story 13.7 (Verification).

**Guarda: como a 13.4 move os pendentes para regras aplicadas**

- **`KEYBOARD_CONTAINERS`** = `KeyboardSheet.tsx` e `KeyboardListSheet.tsx`. Só eles renderizam `<KeyboardSafeView`. A regra "só o KeyboardSheet…" passa a usar essa lista.
- **`keyboardListSheetViolations`** (no próprio `KeyboardListSheet.tsx`):
  - `flexShrink: 1` na folha e no invólucro da lista;
  - um `KeyboardSafeView` com `liftDiscount={sheetLiftDiscount(…)}`;
  - nenhum `ScrollView`/`FlatList`/`FlashList` próprio;
  - nenhuma outra compensação;
  - sem `useKeyboardState`/`KeyboardController.state()`;
  - usa `useSheetKeyboardHeight` ou os dois eventos.
- **`MODAL_LISTS`** = `CategoryPickerModal`, `StoreGridModal`, `AccountPicker` e `DebugTools`. Cada um:
  1. importa `KeyboardListSheet` e o renderiza uma vez, dentro de `<Modal>`;
  2. passa `header={…}` com um campo dentro da expressão (`hasField` na expressão do `header`; no `DebugTools`, o campo pode estar no `header` ou na rolagem do `list`);
  3. não tem segunda compensação de teclado (as `SECOND_KEYBOARD_SYSTEMS` da 13.3);
  4. toda rolagem vertical (`ScrollView`/`FlatList`/`SectionList`/**`FlashList`**, que entra em `SCROLL_COMPONENTS` só neste bloco) tem `keyboardShouldPersistTaps="handled"` e fica dentro da expressão `list=`. Contagem com nome: 1 em cada, 2 no `DebugTools` (`FlashList` e `ScrollView`, alternando por aba);
  5. se houver fundo tocável, ele passa pelo `useSheetBackdropPress`. `CategoryPickerModal` e `DebugTools` ficam em `NO_BACKDROP`, com o motivo "sem fechar tocando fora hoje";
  6. no `AccountPicker`, as regras valem só no trecho do `<Modal>`, porque o modo lista inline continua no `INLINE_FIELD_COMPONENTS`.
- **`MODAL_FORMS`** ganha `app/about.tsx` e `WelcomeCarousel.tsx`, com estes ajustes nas regras da 13.3:
  - Regra 3 (segunda compensação): passa a valer só **dentro** do `<Modal>` que tem o `KeyboardSheet`. O `about.tsx` continua com o `KeyboardAwareScrollViewCompat` na tela (13.2).
  - `FOOTER_RULES`:
    - `placement="center"` aceita `variant="danger"` como principal e aceita "Cancelar" ao lado (D-2);
    - o `WelcomeCarousel` tem exceção nomeada, porque o rodapé é a barra própria do carrossel com "Próximo"/"Começar Tour!", sem `TButton`.
  - `MODAL_HORIZONTAL_SCROLLS`: o paginador do `WelcomeCarousel` (1 × `ScrollView horizontal`).
  - `NO_BACKDROP`: `WelcomeCarousel` (tela cheia) e `about.tsx` (como hoje, R-4).
- **`MODAL_FIELDS_OUTSIDE`** = `app/sync.tsx`, com o motivo "modal do QR sem campo; campos na tela (13.2)". O detector novo `fieldsInsideModal(source)` usa a mesma varredura do `jsxUsesInsideModal` sobre `FIELD_TAGS` e precisa dar 0. Se um campo entrar no modal do QR, a guarda falha.
- **`MODAL_PENDING` sai.** A descoberta passa a exigir que todo arquivo com `<Modal` e campo esteja em `MODAL_FORMS`, `MODAL_LISTS` ou `MODAL_FIELDS_OUTSIDE`. O teste "os pendentes ainda têm <Modal e campo" vira "cada lista aponta para arquivos que existem e ainda têm `<Modal`".
- **Auto-testes:** um trecho que deve casar e outro que não deve, para cada regra nova:
  - `KeyboardListSheet` fora de `Modal`;
  - `header` sem campo;
  - `FlashList` sem `handled`;
  - `FlashList` fora do `list=`;
  - `KeyboardAvoidingView` dentro do modal de busca;
  - `KeyboardAwareScrollViewCompat` fora do `<Modal>` (passa) e dentro dele (acusa);
  - campo dentro do `<Modal>` de um arquivo de `MODAL_FIELDS_OUTSIDE`;
  - `<Modal` + campo fora das três listas.

**Acceptance Criteria:**
- Given a busca de categoria, a de loja, a de conta (modo compacto) ou a das ferramentas de debug, when foco o campo, then o campo fica acima do teclado com folga ≥ 8 dp e pelo menos uma linha da lista fica visível entre o campo e o teclado. Em janela baixa, o título sai e a busca fica.
- Given o diálogo "APAGAR TUDO", when foco o campo e digito a frase, then o campo e os botões "Cancelar"/"Resetar" ficam visíveis acima do teclado, e "Resetar" funciona no primeiro toque.
- Given o slide da chave de IA no onboarding, when foco o campo, then o campo e o ✓ ficam acima do teclado, e "Começar Tour!" fica logo acima dele (ou alcançável rolando, em janela baixa).
- Given qualquer um desses modais, when fecho o teclado, then o modal volta ao tamanho e à posição de antes, sem espaço em branco.
- Given um desses arquivos sem o contêiner padrão, com segunda compensação, com lista sem `handled`, ou um modal novo com campo fora das listas, when rodo `npx vitest run`, then a guarda falha apontando o arquivo.

## Riscos e notas para a implementação

- **R-1, janela baixa nas buscas.** Paisagem 800×360 com teclado de 200: sobram cerca de 130 dp para a folha. Alça, título e busca somam ~110 dp e deixariam ~20 dp para a lista. Por isso o `compactHeader` (só a busca) entra quando `listSpace < 48`. O X sai junto, e fechar fica pelo voltar do Android ou pelo fundo, nos componentes que têm fundo. Se nem com o cabeçalho compacto houver 48 dp, a busca continua visível e a lista fica com o que sobrar (checklist).
- **R-2, `FlashList` 2.0.2 num invólucro que encolhe.** Hoje ela já vive em contêiner com `maxHeight` (categoria). Conferir no Playwright e no aparelho que as linhas renderizam e rolam quando a área encolhe e volta. Se a v2 pedir altura definida, o invólucro recebe `height = listSpace` medido, sem ultrapassar a janela (Mali).
- **R-3, `WelcomeCarousel` dentro de rolagem vertical.** O paginador horizontal dentro do `ScrollView` vertical do `KeyboardSheet` tem orientações diferentes e é permitido. O `style={{ flex: 1 }}` do paginador vira `flexGrow: 1` no conteúdo. Os slides usam `Dimensions` estático (largura), sem mudança: girar fica fora do escopo, como hoje.
- **R-4, fundo do "APAGAR TUDO".** Hoje tocar fora não fecha. Continua assim, porque não se acrescenta comportamento. Se o dono quiser, é `useSheetBackdropPress` e uma linha na guarda.
- **R-5, a folha da busca segue o conteúdo.** Ao filtrar, a folha encolhe, e com o teclado aberto o campo desce junto com o topo. É o comportamento de hoje sem teclado. Fixar a altura ao focar fica fora do escopo.

## Spec Change Log

## Verification

**Comandos**
- `npx vitest run` e `npx tsc --noEmit`: sem falhas novas em relação ao baseline. A 13.3 fechou com 94 arquivos e 1933 testes passando, e o `tsc` com 0 erros.
- `npx eslint` nos arquivos tocados, sem avisos.
- `npx expo export --platform web` com exit 0.
- Sondas da guarda, com arquivos temporários revertidos depois. A guarda precisa acusar todas:
  - `KeyboardListSheet` trocado por `View` no `StoreGridModal`;
  - `FlashList` sem `keyboardShouldPersistTaps` no `CategoryPickerModal`;
  - busca movida para fora do `header` no `AccountPicker`;
  - `KeyboardAvoidingView` no `DebugTools`;
  - `KeyboardSafeView` direto no `about.tsx`;
  - `TInput` dentro do modal do QR no `sync.tsx`;
  - `ProbeModal.tsx` novo com `<Modal` e `TextInput`.
- Sondas das funções puras:
  - `headerCompact = false` fixo faz falhar os casos de paisagem e de limite;
  - `sheetLiftDiscount("center")` igual ao `"bottom"` faz falhar o caso do diálogo.

**Web (Playwright, Chromium headless, build exportado com fallback de SPA, 412×900 e 800×360)**

A web não simula o teclado (espaçador 0). Os testes provam o layout, a lista visível, o primeiro toque e a ausência de regressão, não a subida.

- **Onboarding:** `localStorage` limpo, sem `domus_welcome_done_v1`. Avançar até o slide "Assistente Financeiro IA", focar a chave e digitar. O ✓ fica habilitado, e "Começar Tour!" fica visível sem rolar em 412×900 (em 800×360, visível ou alcançável rolando). Sem diálogo nativo.
- **`/about` → "Resetar aplicativo":** o cartão aparece centrado e inteiro na janela. Focar o campo; "Resetar" desabilitado; digitar "APAGAR TUDO"; "Resetar" habilitado. Clicar em "Cancelar" fecha. **Não** confirmar o reset (ou confirmar só num perfil descartável).
- **Nova transação (`/` → FAB "Cadastro") → itens → categoria do item:** a busca de categoria abre com o foco no campo. Digitar "mer" filtra, e a 1ª linha fica visível dentro da janela. Tocar numa linha seleciona e fecha, e a folha de baixo continua no lugar.
- **Nova transação → tipo transferência → conta de destino (compacto):** focar "Buscar conta..."; a lista fica visível. Tocar no fundo fecha (sem teclado na web). Reabrir e selecionar.
- **`/wishlist/<id>?addItem=1` → buscar na loja → "Mais lojas...":** "Escolher loja" abre; focar a busca e filtrar; a grade e o aviso ficam dentro da janela. Tocar no fundo fecha. Categoria do item: idem à da nova transação.
- **Em todas:** o topo da folha fica ≥ 0 e a folha não passa do fundo da janela (±1 px). Sem erro de página.
- **`DebugTools`:** só existe com `__DEV__`, então fica fora do build exportado. Conferir em `npx expo start --web` se der. Senão, só no aparelho (V-4).

**Aparelho (itens para a checklist da Story 13.7, Android 16)**

1. Busca de categoria aberta pelo item da nova transação, pela peça do adicionar item e pelo item da revisão da nota: abre com o teclado. Campo fixo e linhas visíveis acima do teclado; a lista rola; tocar numa linha seleciona no 1º toque.
2. Busca de loja ("Mais lojas..."): focar a busca. A grade fica acima do teclado. O 1º toque no fundo só fecha o teclado e o 2º fecha o modal.
3. Conta compacta (transferência na nova transação, add-transaction, holerite): focar a busca. A lista fica visível, sem conteúdo sob a barra de navegação com o teclado fechado (novo `insets.bottom`). O fundo se comporta como no item 2.
4. Debug (build de desenvolvimento): na aba TROPHIES, focar a busca e ver a lista acima do teclado; na aba STATE, focar "XP..." e "Saldo...", e o campo fica visível. Trocar de aba com o teclado aberto não deixa sobra.
5. "APAGAR TUDO": focar o campo. O cartão fica centrado acima do teclado, com o campo, "Cancelar" e "Resetar" visíveis. Digitar a frase e tocar "Resetar" com o teclado aberto funciona no 1º toque (perfil descartável).
6. Aninhados: com o teclado aberto na nova transação (Descrição de um item), abrir a categoria do item, escolher e voltar. A folha da nova transação fica sem faixa em branco, e o teclado volta a erguê-la ao focar de novo. O mesmo vale para a peça no adicionar item.
7. Onboarding (reinstalar ou limpar dados): no slide de IA, focar a chave. O campo e o ✓ ficam acima do teclado, e "Começar Tour!" fica logo acima dele (D-3). Salvar a chave mostra "Chave salva com sucesso!" sem sobra.
8. Fechar cada modal com o teclado aberto (voltar, X, fundo) e reabrir: abre no tamanho normal (R6).
9. Fechar o teclado em cada um: o modal volta ao tamanho e à posição de antes.
10. Paisagem, fonte do sistema 1,3 e 2,0, e celular com até 640 dp: repetir 1, 5 e 7. Nas buscas, o título some e a busca fica (R-1). No diálogo e no onboarding, o rodapé vai para a rolagem quando não cabe.
11. Filtrar até 0 resultados com o teclado aberto: "Nenhuma … encontrada" fica visível acima do teclado (R-5).
12. Navegação de 3 botões e por gestos, Android 7 a 10 se houver: repetir 1 e 5.
13. Fluidez num aparelho com GPU Mali fraca: abrir e fechar o teclado nas buscas sem travar nem piscar.
14. Busca inline do `CategorySelectorGrid` na nova transação (já coberta pelo `KeyboardSheet`, item 22 da 13.3): conferir junto do item 1.

## Implementation Notes

**Arquivos**

- Novo: `src/components/shared/KeyboardListSheet.tsx`: props `header`, `compactHeader`, `list`, `sheetStyle`, `maxHeightRatio`/`heightRatio`, `basePaddingBottom`, `entering`/`exiting`. A folha é uma `Reanimated.View`; o invólucro da lista tem `flexShrink: 1`, mais `flexGrow: 1` com `heightRatio`.
- `src/components/shared/keyboardSheetLayout.ts`:
  - novos: `SheetPlacement`, `DIALOG_EDGE_PADDING = 20`, `MIN_LIST_SPACE`, `sheetPaddingBottomFor`, `sheetRootPadding` e `computeKeyboardListSheetLayout`;
  - `placement` entra em `sheetLiftDiscount` e em `computeKeyboardSheetLayout`;
  - `lift` e altura máxima saem de um `sheetBounds` interno, comum às duas folhas.
- `src/components/shared/KeyboardSheet.tsx`: prop `placement`, com padrão `"bottom"`; `useSheetKeyboardHeight` passa a ser exportado.
- Componentes: `CategoryPickerModal.tsx`, `StoreGridModal.tsx`, `AccountPicker.tsx` (só o compacto), `DebugTools.tsx`, `app/about.tsx` e `WelcomeCarousel.tsx`.
- Testes: `src/components/shared/__tests__/keyboardSheetLayout.test.ts` (64 testes) e `src/components/__tests__/keyboardScroll.test.ts` (145 testes).

**Decisões além da spec**

- **Busca declarada à parte.** A busca fica numa `const searchBar = (<View>…</View>)`, usada no `header` e no `compactHeader`. A guarda resolve um nível desses identificadores (`expandLocalJsx`) antes do `hasField`. Assim a busca não é duplicada, e a sonda "busca fora do header" continua falhando.
- **`compactHeader` obrigatório nos 4.** A guarda confere campo também no `compactHeader`, para a busca continuar visível na janela baixa (R-1).
- **`DebugTools`.** A busca de troféus está no `header`, então não foi preciso aceitar campo no `list` (a spec permitia). `tabsRow` e `trophySearch` viraram `const` de JSX.
- **Diálogo (`"center"`).** A raiz tem `paddingTop: insets.top + 8`, `paddingBottom: 20`, `paddingHorizontal: 20` e `alignItems: "center"`.
  - O `paddingBottom` da folha é só a `base` (24). Não entra `max(insets.bottom, …)`, porque o cartão não encosta na barra de navegação.
  - Com a raiz em `justifyContent: "center"`, o cartão e o espaçador ficam centrados juntos. Assim o centro do cartão cai no centro da área acima do teclado.
  - O cartão usa `maxHeightRatio={1}`; a altura fica limitada pelas margens da raiz.
- **Tela cheia (`"fill"`).** A raiz tem `alignSelf: "stretch"`, porque o overlay do carrossel centra os filhos, e a folha tem `flexGrow: 1`.
  - O `paddingTop` da área segura fica num `View` do `header`, e não no `sheetStyle`. Assim o "Pular" (absoluto) fica exatamente onde estava.
  - O carrossel usa `basePaddingBottom = insets.bottom + 16`, o mesmo de antes.
- **Espaçamentos preservados.** O rodapé do `KeyboardSheet` põe 12 em cima, então o `marginBottom` do campo do "APAGAR TUDO" foi de 20 para 8 e o `paddingTop` da barra do carrossel foi de 16 para 4.
- **Regra 3 de `MODAL_FORMS`.** A segunda compensação é procurada só no `<Modal>` do `KeyboardSheet` (`modalSegments`). Um import só acusa se o componente não é renderizado fora desse trecho.
  - A regra 4 (rolagem vertical crua) também passou a valer só no trecho do modal.
  - `FOOTER_EXCEPTIONS` e `NO_BACKDROP` viraram listas nomeadas, com o motivo.
- **`StoreGridModal`.** O fechar ficou num `handleCancel` (`setQuery("")` e `onCancel()`), usado no fundo, no X e no `onRequestClose`.

**Verificação**

- `npx vitest run`: 94 arquivos e 1988 testes passando (baseline: 1933, mais 55 novos). `npx tsc --noEmit`: 0 erros. `npx eslint` nos 11 arquivos tocados: sem avisos.
- `npx expo export --platform web`: exit 0.
- Sondas da guarda: as 7 da spec falham como esperado (1 ou 2 testes cada) e foram revertidas.
- Sondas das funções: "`headerCompact` sempre `false`" e "`sheetLiftDiscount("center")` igual ao `"bottom"`" quebram 3 testes cada, e foram revertidas.
- **Playwright** (build exportado com fallback de SPA, 412×900 e 800×360): tudo OK, sem erro de página nem diálogo nativo.
  - Onboarding: no slide de IA, a chave é digitada, o ✓ fica habilitado e "Começar Tour!" fica visível sem rolar nos dois tamanhos.
  - "APAGAR TUDO": o cartão fica centrado e inteiro na janela, com "Resetar" desabilitado até a frase certa e os botões lado a lado; "Cancelar" fecha. No baseline, em 800×360, o cartão saía da janela (top −23, bottom 384); agora vai de 8 a 340.
  - Categoria, na nova transação e no adicionar item: "Nenhuma categoria encontrada" aparece com o filtro sem resultado. Com "fru", a linha "Frutas" fica visível na janela; o toque seleciona e fecha, e a folha de baixo continua.
  - Conta de destino, no modo compacto: a lista fica visível, o fundo fecha o modal, e reabrir e selecionar funciona.
  - "Mais lojas...": a grade e o aviso ficam na janela em 412×900, e o fundo fecha.
    - Em 800×360, os cartões da grade medem cerca de 145 dp, porque `CARD_SIZE` vem da largura da tela (`Dimensions`). A 1ª linha começa dentro da janela, a grade rola e o aviso fica no fim da rolagem. A altura de 75% é a de antes.
  - Na web, o `autoFocus` da busca de categoria não pega dentro do `Modal` (o foco fica no gatilho). É igual no baseline, conferido com o mesmo script num build do `HEAD`. O teste foca clicando.
- **`DebugTools`** (`npx expo start --web`):
  - Na TROPHIES, a folha tem 85% da janela, presa embaixo, e a busca filtra.
  - Na STATE, "XP..." fica visível ao focar.
  - Em 800×360, com o teclado fechado, o cabeçalho completo (tier, busca e contagem) deixa quase nada para a lista. É o mesmo de antes, já que o `compactHeader` só entra com o teclado aberto (R-1). Fica para o aparelho.

**Checklist do aparelho (Story 13.7)**

- Os itens 1 a 14 da seção "Aparelho" acima entram na 13.7 como estão.
- Acréscimos:
  - (a) Onboarding em celular baixo: rolar o slide 2 para baixo e tocar "Próximo". O slide seguinte pode abrir rolado, porque a rolagem vertical do `KeyboardSheet` é uma só para todos os slides.
  - (b) `DebugTools` em paisagem com o teclado fechado: a lista de troféus fica quase sem espaço, como antes.
  - (c) "Mais lojas..." em paisagem: os cartões da grade são grandes (`CARD_SIZE` vem da largura), e a grade rola.
  - (d) Na busca de categoria, conferir no aparelho que o `autoFocus` abre o teclado (na web ele não pega, como no baseline).

## Review Triage Log

Revisão única com três lentes (adversarial, casos de borda, lacunas de verificação), 28/10, sobre o commit be77d10. 1 High, 3 Med, 6 Low. `tsc`: 5 erros em `node_modules` (gifted-chat, zoom-reanimated) que já existem no commit anterior; nenhum vem desta story.

| # | Achado | Sev. | Decisão |
|---|--------|------|---------|
| R1 | Trocar para o cabeçalho compacto remonta o campo de busca: o teclado fecha e, em paisagem/fonte grande/celular pequeno, não dá para digitar | High | **patch**: uma só instância do `TextInput` em posição estável — API com `title` recolhível e espaço `search` sempre renderizado (some só a parte sem busca); chamadores declaram a busca uma vez; guarda exige o campo nesse espaço único; item no checklist "depois de compactar, o teclado continua aberto e a digitação segue" |
| R2 | Detecção de campo da guarda rasa (burlas P3/P4/P6, falsos positivos P1/P2, alias de `Modal` P5) | Med | **patch**: resolver identificadores em profundidade limitada, exigir o campo como tag JSX (não `onChangeText`), resolver alias de import do `Modal`; regra do espaço único do R1 substitui a do `compactHeader` |
| R3 | Diálogo central ignora a área segura de baixo com teclado fechado | Med | **patch**: em `"center"`, `paddingBottom` da raiz = 20 + `insets.bottom` e `liftDiscount` = `insets.bottom`; conferir topo `insets.top + 8` sem contar duas vezes; item no checklist |
| R4 | Testes provam aritmética, não comportamento | Med | **patch**: teste da centralização real (folga de cima e de baixo) e teste puro da escolha de layout que cobre o caminho do R1; restante no checklist do aparelho |
| R5 | DebugTools guarda a altura do cabeçalho entre abas | Low | **patch**: medir de novo ao trocar de aba |
| R6 | Código morto (`compactHeaderHeight`, `listSpace`) e texto da spec sobre a folha "seguir o conteúdo" | Low | **patch**: remover e corrigir a spec (inclusive "tsc 0 erros") |
| R7 | Carrossel: uma posição de rolagem para todos os slides | Low | **patch**: `KeyboardSheet` expõe ref da rolagem; `goTo` volta ao topo |
| R8 | "Pular" perde parte da área de toque com fonte grande | Low | **patch**: `minHeight` do cabeçalho cobrindo o botão (ou `zIndex`/`elevation`) |
| R9 | "Mais lojas..." em paisagem não mostra uma linha inteira (anterior à story) | Low | **defer** (D40) |
| R10 | Checklist do aparelho incompleto | Low | **patch**: acrescentar os itens (i)–(vi) da revisão |
