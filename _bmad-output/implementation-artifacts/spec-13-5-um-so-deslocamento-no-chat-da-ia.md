---
title: 'Story 13.5: um só deslocamento no chat da IA'
type: 'bugfix'
created: '2026-10-28'
status: 'in-progress'
baseline_commit: '7f8e65b669fc0f1d6013d630f6edcdea2d7e58f9'
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

**Problem:** No chat da IA (`app/ai-chat.tsx`), a caixa de mensagem (`ChatInputBar`, passada como `renderInputToolbar`) sobe pelo `KeyboardAvoidingView` **interno** do GiftedChat 3.3.2. Desde a 13.1 o `ai-chat.tsx` não tem provider próprio e o `AvoidSoftInput` saiu, então só existe esse deslocamento. Mas ele está mal configurado para esta tela:

- O GiftedChat foi feito para ocupar a tela inteira. O `KeyboardAvoidingView` do keyboard-controller 1.18.5 calcula a subida como `max(frame.y + frame.height − (alturaDaJanela − alturaDoTeclado − keyboardVerticalOffset), 0)`. O `frame.y` vem do `onLayout` e é relativo ao pai (0 aqui). O GiftedChat passa `keyboardVerticalOffset={insets.top}`, com as insets do `SafeAreaProvider` **interno** dele, que fica abaixo do cabeçalho (≈ 0).
- Acima do GiftedChat existem a barra de status, o cabeçalho "DOMUS IA", o banner "Configure sua chave…" (quando a IA está desligada), o banner "Lendo o holerite…"/"Escaneando com IA Vision..." e a `AIUsageBar`. Chamando de `chatTop` a distância do topo da janela até o GiftedChat, a caixa sobe **`chatTop` a menos** do que precisa (leitura do código; cerca de 100 a 180 dp, conforme os banners). Isso basta para a caixa inteira (≈ 90 dp) ficar atrás do teclado.
- O GiftedChat 3.3.2 **sempre** monta o próprio `GestureHandlerRootView` > `SafeAreaProvider` > `KeyboardProvider statusBarTranslucent navigationBarTranslucent` (`GiftedChatWrapper`). Não existe `isKeyboardInternallyHandled` nesta versão. O provider interno é o único que alimenta o `KeyboardAvoidingView` dele, porque o contexto mais próximo vence. Na árvore nativa ele é um segundo `EdgeToEdgeReactViewGroup`, com callbacks de insets próprios, enquanto o chat está montado.
- O comportamento `translate-with-padding` translada o conteúdo para cima durante a animação e só aplica o `paddingTop` no fim. Sem recorte, a lista de mensagens (fundo `theme.background`) passa por cima do cabeçalho enquanto o teclado abre. Com o teclado aberto, a faixa transparente transladada fica sobre o cabeçalho e pode roubar o toque de voltar, lixeira e configurações.

**Approach:** Ajustar o deslocamento único que já existe, sem acrescentar outro:

1. Medir `chatTop` com um `View` invólucro (`styles.chatFrame`, `flex: 1`, `overflow: "hidden"`) em volta do `<GiftedChat>`. O `onLayout` dá o `y` relativo ao `SafeAreaView`, que começa no topo da janela (rota sem cabeçalho nativo e sem `presentation: "modal"`). O `y` já inclui o `paddingTop` da área segura.
2. Passar `keyboardAvoidingViewProps={{ keyboardVerticalOffset: chatKeyboardVerticalOffset(chatTop) }}`. Os props do chamador entram depois dos padrões do GiftedChat (conferido no código), então substituem o `insets.top`. O comportamento continua o padrão (`translate-with-padding`).
3. Passar `keyboardProviderProps={CHAT_KEYBOARD_PROVIDER_PROPS}` para o provider interno espelhar o da raiz (`statusBarTranslucent`, `navigationBarTranslucent`) e não refazer o `preload` do teclado (`preload: false`), que a raiz já faz.
4. A conta fica numa função pura (`src/components/ai/chatKeyboardLayout.ts`), com o espelho da fórmula do `KeyboardAvoidingView` 1.18.5 para os testes.
5. A guarda `keyboardScroll.test.ts` ganha o bloco "chat da IA (Story 13.5)". Ele exige o ajuste pelos props do GiftedChat e barra provider próprio e segunda compensação no chat. Também passa a valer para o app inteiro a regra "só o `app/_layout.tsx` monta `KeyboardProvider`". Uma sentinela de versão falha se o GiftedChat ou o keyboard-controller mudarem o que esta conta pressupõe.

## Boundaries & Constraints

**Always:**
- Um só deslocamento: o `KeyboardAvoidingView` interno do GiftedChat, configurado por `keyboardAvoidingViewProps`. O provider interno do GiftedChat só é configurado (`keyboardProviderProps`), nunca desligado (`enabled: false` mataria o deslocamento).
- A caixa fica colada logo acima do teclado. A folga entre o campo de texto e o teclado é de pelo menos 8 dp (FR-29): 6 dp do `paddingVertical` da linha do campo mais `CHAT_KEYBOARD_GAP` (D-3).
- Ao fechar o teclado, a caixa volta para cima da barra de navegação (borda `bottom` do `SafeAreaView`), sem faixa sobrando.
- O `chatTop` acompanha os banners: aparecer ou sumir um banner refaz a medida pelo `onLayout`.
- Na web, o `KeyboardAvoidingView` não se move (o provider vira `View`), e o layout não pode regredir.
- Texto de UI em pt-BR com acentos. Os textos atuais não mudam.
- Alerta só por `appAlert`/`appConfirm` (o chat já segue isso).
- Nenhuma View animada maior que a tela (Mali, `docs/tour-crash-fixes.md`). A translação é a do GiftedChat, do tamanho da área do chat. O invólucro com `overflow: "hidden"` só recorta.
- Nenhuma mudança em `android/`, `ios/` ou `packages/sync`.
- A lógica do chat fica igual: envio, permissões, voz, Vision, holerite (11.5), TTS, glossário e histórico.

**Never:**
- Montar `KeyboardProvider` em `ai-chat.tsx` ou em qualquer componente do chat.
- Acrescentar segunda compensação (`KeyboardAvoidingView` do RN ou da biblioteca, `KeyboardStickyView`, `KeyboardAwareScrollView`/Compat, `KeyboardSafeView`, `Keyboard.addListener` com margem manual).
- Trocar o GiftedChat ou mudar a versão dele ou do keyboard-controller. Aplicar patch neles só se a D-1 (b) for escolhida.
- Mexer na barra da chave da NF (13.6) ou nos modais das 13.3 e 13.4.
- Mudar a aparência da `ChatInputBar` com o teclado fechado.

## I/O & Edge-Case Matrix

| Cenário | Antes (leitura do código, baseline `7f8e65b`) | Depois |
|---|---|---|
| Focar a caixa, IA ligada, sem banner | a caixa sobe `chatTop` a menos (≈ cabeçalho + barra de uso + barra de status); fica parcial ou totalmente atrás do teclado | a caixa fica colada acima do teclado; o campo fica a ≥ 8 dp dele |
| Focar a caixa com o banner "Configure sua chave…" (IA desligada) | falta ainda maior (o banner aumenta o `chatTop`) | igual ao caso anterior; o `chatTop` medido inclui o banner |
| Abrir e fechar o teclado várias vezes | a cada abertura a caixa sobe o mesmo valor errado | sobe sempre até o teclado e volta para cima da barra de navegação |
| Durante a animação de abertura | a lista de mensagens passa por cima do cabeçalho (translação sem recorte) | o invólucro recorta; o cabeçalho continua visível |
| Teclado aberto: tocar em voltar, lixeira ou configurações | o toque pode cair na faixa transparente transladada | o toque chega ao cabeçalho no 1º toque |
| Texto com várias linhas (o campo cresce até 100 dp) | a caixa cresce para baixo do teclado | a caixa cresce para cima; o fim continua colado ao teclado |
| Banner "Lendo o holerite…" aparece e some (11.5) | — | o `onLayout` refaz o `chatTop`; nada fica cortado |
| Tocar no "+" com o teclado aberto (menu de ações em `Modal`) | ? | o menu abre; ao fechar, a caixa fica no lugar certo (aberto ou fechado), sem sobra |
| Navegação de 3 botões e por gestos | — | com o teclado fechado, a caixa fica acima da barra; aberto, colada ao teclado |
| Paisagem ou fonte 2,0 | — | a caixa fica acima do teclado; a lista encolhe até sobrar pouco, como no GiftedChat padrão |
| Sair do chat e voltar (o provider interno desmonta e remonta) | — | sem crash "null child"; as barras de status e de navegação continuam certas nas outras telas |
| Web | caixa no fim da janela, sem teclado | igual (sem regressão) |

</frozen-after-approval>

## O que as Stories 13.1 a 13.4 já fizeram

- **13.1:** um `KeyboardProvider statusBarTranslucent navigationBarTranslucent` na raiz (`app/_layout.tsx`); o `react-native-avoid-softinput` saiu; o `ai-chat.tsx` perdeu o provider próprio. A nota técnica registrou que o GiftedChat 3.3.2 sempre monta o próprio provider e deixou o ajuste para cá (`keyboardProviderProps`/`keyboardAvoidingViewProps`).
- **13.2:** a guarda `src/components/__tests__/keyboardScroll.test.ts` nasceu. O `app/ai-chat.tsx` está em `DISCOVERY_EXCEPTIONS` com o motivo "chat da IA (GiftedChat) — Story 13.5".
- **13.3:** o padrão de funções puras (`keyboardSheetLayout.ts`) com testes, a lista `SECOND_KEYBOARD_SYSTEMS` e a regra "todo `<Modal` com campo está numa lista".
- **13.4:** `KEYBOARD_CONTAINERS`, `MODAL_LISTS`, `MODAL_FIELDS_OUTSIDE`, a resolução de alias de import e de JSX local na guarda, e o roteiro de Playwright no build web exportado.

## Auditoria do chat (baseline `7f8e65b`)

| Peça | Arquivo | Campo | Teclado hoje | Mudança |
|---|---|---|---|---|
| Tela | `app/ai-chat.tsx` | — | `SafeAreaView edges={["top","bottom"]}` > cabeçalho, banners, `AIUsageBar`, `<GiftedChat>`; sem provider próprio, sem `keyboardProviderProps`/`keyboardAvoidingViewProps` (há só o comentário vazio "Keyboard & layout") | invólucro `chatFrame` com `onLayout`; os dois props |
| Caixa de mensagem | `src/components/ai/ChatInputBar.tsx` | `TextInput multiline` ("Pergunte sobre suas finanças..."), `maxHeight 100` | nenhuma compensação própria; sobe com o KAV do GiftedChat | nenhuma (a guarda confere que continua sem compensação) |
| Menu de ações ("+") | `src/components/ai/ChatActionMenu.tsx` | — | `Modal` sem campo; "Escanear nota", "Escanear holerite" (11.5), resumos | nenhuma |
| Escolha de captura | `SelectionModal` (em `ai-chat.tsx`) | — | `Modal` sem campo; câmera ou galeria | nenhuma |
| Holerite (11.5) | `usePayslipScanner` → `router.push("/payslips")` | campos no `PayslipReview` (já em `FIELD_SCREENS`, 13.2) | — | nenhuma |
| Trocar de provedor | `src/components/ai/ProviderSwitchModal.tsx` | — | `Modal fade` sem campo | nenhuma |
| Permissão de dados | `src/components/ai/DataPermissionModal.tsx` | — | `Modal` sem campo | nenhuma |
| Glossário | `src/components/ai/FinancialTooltip.tsx` | — | `Modal statusBarTranslucent` sem campo | nenhuma |
| Sugestões | `src/components/ai/QuickSuggestions.tsx` (`renderChatFooter`) | — | dentro do GiftedChat, sobe junto | nenhuma |
| Banners e uso | `ai-chat.tsx` (IA desligada; "Lendo o holerite…"/"Escaneando…"), `AIUsageBar` | — | acima do GiftedChat; mudam o `chatTop` | entram na medida |

Nenhum `<Modal` do chat tem campo, então a regra da 13.3 ("todo `<Modal` com campo está numa lista") já cobre o chat sem mudança.

**GiftedChat 3.3.2 por dentro** (`node_modules/react-native-gifted-chat/src/GiftedChat/index.tsx`):

- `GiftedChatWrapper`: `GestureHandlerRootView` > `SafeAreaProvider` > `<KeyboardProvider statusBarTranslucent navigationBarTranslucent {...keyboardProviderProps}>` > `GiftedChat`.
- `GiftedChat`: `View` (fill, `onLayout` de inicialização) > `<KeyboardAvoidingView behavior='translate-with-padding' keyboardVerticalOffset={insets.top} style={fill} {...props.keyboardAvoidingViewProps}>` > mensagens e `renderInputToolbar`.
- Os props do chamador vêm depois dos padrões nos dois casos, então substituem `keyboardVerticalOffset` e as flags do provider.
- `KeyboardProviderProps.children` é obrigatório no tipo. O objeto passado precisa de `children: null`, que o filho JSX do wrapper substitui, ou de um tipo `Omit<…, "children">` com conversão. Ver Code Map.

**Provider interno aninhado (keyboard-controller 1.18.5, Android):**

- Cada `KeyboardProvider` é um `EdgeToEdgeReactViewGroup`. Ao ativar, ele põe o seu `OnApplyWindowInsetsListener` no `rootView` (substituindo o da raiz) e acrescenta um `eventView` ao `content`, com um `KeyboardAnimationCallback` próprio e um `ModalAttachedWatcher` próprio.
- Com os dois translúcidos, o listener aplica margens 0 nos dois casos, então trocar o dono do listener não muda o layout.
- O `EdgeToEdgeViewRegistry` guarda o último provider criado, que é o do chat. O `StatusBarManagerCompat` da biblioteca (que substitui o `StatusBarManager` do RN) usa esse registro. O app não chama `StatusBar` direto, mas isso vai para a checklist (V-9).
- Enquanto o chat está aberto, os eventos globais de teclado (`KeyboardEvents`) podem sair em dobro, um de cada callback. Nenhuma tela de baixo da pilha escuta esses eventos com o chat aberto (os contêineres das 13.3/13.4 só existem com o modal visível).
- Ao sair do chat, o `onDetachedFromWindow` do provider interno remove o `eventView` de forma síncrona (patch `react-native-keyboard-controller+1.18.5.patch`). O filho dele é estável (o `GiftedChat`).

## Padrão proposto

### 1. Conta pura: `src/components/ai/chatKeyboardLayout.ts` (novo)

Sem `react-native` (pitfall do vitest no AGENTS.md):

- `CHAT_KEYBOARD_GAP = 2`: com os 6 dp do `paddingVertical` da linha do campo, o campo fica a 8 dp do teclado (D-3).
- `CHAT_KEYBOARD_PROVIDER_PROPS = { statusBarTranslucent: true, navigationBarTranslucent: true, preload: false }`. É o espelho do provider da raiz, sem repetir o `preload`.
- `chatKeyboardVerticalOffset(chatTop: number, gap = CHAT_KEYBOARD_GAP): number` devolve `max(chatTop, 0) + gap`, arredondado para cima. `chatTop` não finito vira 0.
- `giftedChatLift({ windowHeight, keyboardHeight, frameY = 0, frameHeight, keyboardVerticalOffset, progress = 1 })` espelha o `relativeKeyboardHeight` do `KeyboardAvoidingView` 1.18.5: `interpolate(progress, [0,1], [0, max(frameY + frameHeight − (windowHeight − keyboardHeight − offset), 0)])`. Serve só para os testes provarem que o offset produz a caixa colada. A sentinela (Guarda, item 6) liga o espelho ao código da biblioteca.

### 2. `app/ai-chat.tsx`

- Estado `chatTop` (começa em 0) e `onChatFrameLayout = (e) => setChatTop(e.nativeEvent.layout.y)`, que só atualiza quando o valor muda.
- `<View style={styles.chatFrame} onLayout={onChatFrameLayout}>` envolve **só** o `<GiftedChat>`. Os modais continuam irmãos dele, como hoje.
- `styles.chatFrame = { flex: 1, overflow: "hidden" }`:
  - o recorte prende a translação do `translate-with-padding` à área do chat (R-2);
  - o `flex: 1` deixa a altura igual à de hoje.
- No `<GiftedChat>`:
  - `keyboardAvoidingViewProps={{ keyboardVerticalOffset: chatKeyboardVerticalOffset(chatTop) }}` (memoizado pelo `chatTop`);
  - `keyboardProviderProps={CHAT_KEYBOARD_PROVIDER_PROPS}`;
  - sai o comentário vazio `/* ── Keyboard & layout ── */`, que passa a ficar sobre os dois props.
- Nada mais muda: `renderInputToolbar`, `text`, `textInputProps`, modais, banners e a lógica.

### 3. Por que o `y` do `onLayout` basta (D-2 a)

- A rota `ai-chat` tem `headerShown: false` e não usa `presentation: "modal"` (`app/_layout.tsx`), então o `SafeAreaView` começa no topo da janela.
- O `y` de um filho é relativo à borda do pai, padding incluído, então já soma `insets.top`, o cabeçalho, os banners e a `AIUsageBar`.
- A altura da janela que o `KeyboardAvoidingView` usa é a do `content` do Android (edge-to-edge, tela inteira), e a altura do teclado já inclui a barra de navegação (13.1).
- Com o fim do chat em `alturaDaJanela − insets.bottom`, a subida fica `teclado − insets.bottom + gap`, ou seja, colada.

## Decisões do dono (aprovadas em 28/10: D-1 a, D-2 a, D-3 a; D-1 trocada para (b) — patch no GiftedChat — depois da revisão, R1)

- **D-1: o provider interno do GiftedChat.**
  - (a) Manter o provider interno, que a 3.3.2 sempre monta, e só configurá-lo por `keyboardProviderProps` (espelho da raiz, `preload: false`). O `ai-chat.tsx` não tem provider próprio, e o deslocamento é um só (o KAV interno). A guarda barra qualquer outro provider no app.
  - (b) `patches/react-native-gifted-chat+3.3.2.patch` para o `GiftedChatWrapper` não montar `KeyboardProvider` (nem `SafeAreaProvider`/`GestureHandlerRootView`) quando já houver um acima. Fica um só provider nativo. Custa um patch a manter nos saltos de SDK (Epic 8), contraria o "sem patch na biblioteca" das 13.3/13.4, e o offset continua necessário.

  O critério da story pede "sem provider próprio no `ai-chat.tsx`" e "um só deslocamento", e a (a) cumpre os dois sem patch. Os riscos do aninhamento (R-3) vão para a checklist. **Recomendado: (a)**; a (b) fica como saída se a checklist achar problema no aninhamento.
- **D-2: de onde vem o `chatTop`.**
  - (a) `onLayout` do invólucro (`layout.y` relativo ao `SafeAreaView`). É síncrono com o layout, testável e sem chamada nativa. Pressupõe que a tela começa no topo da janela, o que é verdade hoje e fica preso pela guarda (rota sem cabeçalho nativo e sem `presentation: "modal"`).
  - (b) `measureInWindow` no `onLayout`. Funciona com qualquer pai, mas é assíncrono, depende das coordenadas da janela no Android e pode vir errado durante a transição da pilha.

  **Recomendado: (a)**, com o item da guarda sobre as opções da rota.
- **D-3: folga entre a caixa e o teclado.**
  - (a) `CHAT_KEYBOARD_GAP = 2`: a caixa fica praticamente colada e o campo fica a 8 dp do teclado (FR-29).
  - (b) Gap 0: a caixa fica colada, e o campo fica a 6 dp (exceção nomeada ao FR-29 só no chat).
  - (c) Gap 8: a caixa fica a 8 dp, e aparece uma faixa do fundo entre ela e o teclado.

  **Recomendado: (a)**. Cumpre o FR-29 sem faixa visível, porque o fundo atrás é o mesmo `theme.background`.

## Code Map

- `src/components/ai/chatKeyboardLayout.ts` (novo): `CHAT_KEYBOARD_GAP`, `CHAT_KEYBOARD_PROVIDER_PROPS` (tipado como `Omit<KeyboardProviderProps, "children">`, com tipo só importado, ou com `children: null`, conforme o `tsc` aceitar sem `any`), `chatKeyboardVerticalOffset`, `giftedChatLift`.
- `src/components/ai/__tests__/chatKeyboardLayout.test.ts` (novo).
- `app/ai-chat.tsx`: invólucro `chatFrame` com `onLayout`, `keyboardAvoidingViewProps` e `keyboardProviderProps`.
- `src/components/__tests__/keyboardScroll.test.ts`: bloco "chat da IA (Story 13.5)", a regra global do provider único, a sentinela de versão e os auto-testes. `DISCOVERY_EXCEPTIONS["app/ai-chat.tsx"]` passa a apontar para `CHAT_SCREENS`.
- Sem mudança: `ChatInputBar`, `ChatActionMenu`, os modais do chat, `app/_layout.tsx`, `KeyboardSheet`/`KeyboardListSheet`, `node_modules` (salvo D-1 b).

## Tasks & Acceptance

**Execution:**
- [x] `chatKeyboardLayout.ts` e testes:
  - Retrato 412×915: barra de status 32, `chatTop` 125 (sem banner) e 185 (com banner), navegação 48 (3 botões) e 24 (gestos), teclado 336 (já com a barra). Com o offset da função, o fim da caixa (`chatTop + altura − subida`) fica em `915 − 336 − 2`, ou seja, colado com 2 dp.
  - Paisagem 915×412, teclado 200: mesma igualdade, e a subida não passa da altura do chat.
  - `progress = 0` (teclado fechado): subida 0.
  - Regressão documentada: com `keyboardVerticalOffset = 0` (o `insets.top` interno de hoje), a caixa fica `chatTop` abaixo do topo do teclado. O caso prova o defeito.
  - `chatTop` negativo, `NaN` ou fracionário: 0 ou arredondado para cima; o offset nunca fica abaixo do gap.
  - `CHAT_KEYBOARD_PROVIDER_PROPS` com os dois translúcidos `true` e `preload: false`, sem `enabled`.
- [x] `app/ai-chat.tsx` conforme o padrão.
- [x] Guarda (abaixo), com auto-testes e sondas.
- [x] Playwright no build web (Verification).
- [x] Itens desta story na checklist da Story 13.7 (Verification).

**Guarda: bloco "chat da IA (Story 13.5)" em `keyboardScroll.test.ts`**

1. **Provider único no app:** em `DIRS` (`app`, `src`, `components`, `lib`, `constants`), só o `app/_layout.tsx` importa `KeyboardProvider` de `react-native-keyboard-controller` (nomeado, alias, namespace `KC.KeyboardProvider`, `require`, `import()`) ou renderiza `<KeyboardProvider`. O `_layout` renderiza exatamente um. Isso fecha "provider próprio" no chat e em qualquer tela nova.
2. **`CHAT_SCREENS`** = `{ "app/ai-chat.tsx": "GiftedChat com o KAV interno ajustado por props" }`. Em cada um:
   - nenhuma importação de `react-native-keyboard-controller`;
   - nenhum dos `SECOND_KEYBOARD_SYSTEMS`;
   - nem `KeyboardAvoidingView` de `react-native`, nem `Keyboard.addListener`/`useKeyboardHandler`/`useKeyboardAnimation`;
   - exatamente um `<GiftedChat` (alias de import resolvido como no `Modal` da 13.4).
3. **Props do GiftedChat:**
   - `keyboardAvoidingViewProps=` presente, com `keyboardVerticalOffset:` vindo de `chatKeyboardVerticalOffset(`, sem `enabled:` e sem `behavior:`;
   - `keyboardProviderProps=` presente, igual a `CHAT_KEYBOARD_PROVIDER_PROPS` (o identificador, para a conta ficar num lugar só);
   - nenhum `enabled: false` no módulo `chatKeyboardLayout.ts`.
4. **Invólucro:** o `<GiftedChat` está dentro de um `<View` com `onLayout=` e `style={styles.chatFrame}`, e o `chatFrame` do `StyleSheet` tem `overflow: "hidden"` e `flex: 1`.
5. **Rota:** no `app/_layout.tsx`, o `Stack.Screen name="ai-chat"` tem `headerShown: false` e nenhum `presentation:` (pressuposto da D-2 a).
6. **Componentes do chat sem compensação própria:** `ChatInputBar.tsx`, `ChatActionMenu.tsx`, `QuickSuggestions.tsx`, `ProviderSwitchModal.tsx`, `DataPermissionModal.tsx` e `FinancialTooltip.tsx` não usam `SECOND_KEYBOARD_SYSTEMS` nem importam o keyboard-controller.
7. **Sentinela de versão** (lê `node_modules`, que a CI instala com `npm ci`):
   - `react-native-gifted-chat` na `3.3.2` e `react-native-keyboard-controller` na `1.18.5` (`package.json` deles);
   - no `GiftedChat/index.tsx`, `{...props.keyboardAvoidingViewProps}` vem depois de `keyboardVerticalOffset=` e `{...keyboardProviderProps}` vem depois de `navigationBarTranslucent`;
   - no `KeyboardAvoidingView/index.tsx`, a expressão `frame.value.y + frame.value.height - keyboardY` existe.

   Se algum mudar, a guarda falha com a mensagem "rever a Story 13.5 (offset do chat)".
8. **Descoberta:** `DISCOVERY_EXCEPTIONS["app/ai-chat.tsx"]` passa a dizer "chat (CHAT_SCREENS, Story 13.5)", e um teste confere que toda chave de `CHAT_SCREENS` está nas exceções e existe.
9. **Auto-testes:** um trecho que deve casar e outro que não deve, para:
   - `KeyboardProvider` fora do `_layout` (nomeado, alias, namespace, `require`);
   - `<GiftedChat` sem `keyboardAvoidingViewProps`;
   - offset literal (`keyboardVerticalOffset: 0`) em vez da função;
   - `enabled: false` no provider;
   - `KeyboardAvoidingView` do RN no chat;
   - `GiftedChat as Chat`;
   - `chatFrame` sem `overflow: "hidden"`;
   - rota `ai-chat` com `presentation: "modal"`.

**Acceptance Criteria:**
- Given o chat da IA com o provider da raiz, when foco a caixa de mensagem, then a caixa fica colada logo acima do teclado e o campo fica a ≥ 8 dp dele, com ou sem os banners.
- Given o teclado aberto no chat, when fecho o teclado (voltar ou enviar), then a caixa volta para cima da barra de navegação, sem faixa sobrando, e isso se repete igual ao abrir e fechar várias vezes.
- Given o teclado aberto, when toco em voltar, lixeira ou configurações no cabeçalho, then o toque funciona no 1º toque e o cabeçalho continua visível durante a animação.
- Given o `app/ai-chat.tsx`, when rodo `npx vitest run`, then a guarda confirma que não há provider próprio nem segunda compensação e que o GiftedChat é ajustado por `keyboardProviderProps`/`keyboardAvoidingViewProps`. Ela falha apontando o arquivo se alguém montar outro `KeyboardProvider` no app ou se a versão do GiftedChat ou do keyboard-controller mudar.

## Riscos e notas para a implementação

- **R-1, o defeito de hoje vem da leitura do código.** A falta de `chatTop` na subida vem da fórmula da biblioteca e do `insets.top` interno, não de medida no aparelho. O primeiro item da checklist mede o "antes" no APK atual. Se a caixa já estiver colada hoje, a premissa da fórmula está errada: parar e rever antes de mudar o offset.
- **R-2, `translate-with-padding` sem recorte.** No Android, a translação acompanha o `progress` e o `paddingTop` só entra no `onEnd`. O `overflow: "hidden"` do invólucro recorta a lista durante a animação e tira a faixa transparente de cima do cabeçalho. Conferir no aparelho que o indicador "rolar para o fim" e as sugestões não ficam cortados.
- **R-3, provider aninhado (D-1 a).**
  - Listener de insets do `rootView` trocado pelo do chat: sem efeito visível com os dois translúcidos.
  - Eventos globais de teclado em dobro enquanto o chat está aberto.
  - `EdgeToEdgeViewRegistry` apontando para o provider do chat depois de sair.
  - Montar e desmontar a cada visita (crash "null child", Samsung S24, Android 16).

  Tudo vai para a checklist (V-8, V-9). Se algo aparecer, a saída é a D-1 (b).
- **R-4, `children` obrigatório no tipo do `KeyboardProvider`.** O objeto de props não pode ganhar `any`. Usar `Omit<…, "children">` com conversão documentada ou `children: null`; o filho JSX do `GiftedChatWrapper` vence o `children` do spread.
- **R-5, `chatTop` antes do 1º `onLayout`.** Começa em 0 (offset = gap). Se o teclado abrir antes da medida, o que é improvável porque o campo não tem `autoFocus`, a caixa sobe a menos só nessa vez. O `onLayout` do invólucro sempre roda antes da interação.
- **R-6, `tsc` em `node_modules`.** O `npx tsc --noEmit` do baseline tem 5 erros, todos de tipo de estilo: `react-native-gifted-chat/src/Bubble/index.tsx`, `Composer.tsx`, `Message/index.tsx`, `Time.tsx` e `react-native-zoom-reanimated/src/index.tsx`. Eles já existem antes desta story (ambiente depois de reiniciar o contêiner). Esta story **não toca** nesses arquivos: com a D-1 (a), nada em `node_modules` muda; com a (b), o patch mexe só em `GiftedChat/index.tsx`, que não está entre eles. A exigência é não acrescentar nenhum erro.
- **R-7, web móvel.** No navegador do celular quem lida com o teclado é o próprio navegador (viewport visual). Fica fora do escopo e é anotado na 13.7 se der para testar.

## Spec Change Log

—

## Verification

**Comandos**
- `npx vitest run`: o baseline em `7f8e65b` tem 95 arquivos e 2012 testes passando. Sem falhas novas.
- `npx tsc --noEmit`: só os 5 erros de `node_modules` do baseline (R-6), nenhum novo.
- `npx eslint` nos arquivos tocados, sem avisos.
- `npx expo export --platform web` com exit 0.
- Sondas da guarda, com arquivos temporários revertidos depois. A guarda precisa acusar todas:
  - `KeyboardProvider` de volta em `ai-chat.tsx`;
  - `KeyboardProvider` num componente qualquer de `src/`;
  - `keyboardAvoidingViewProps` removido;
  - `keyboardVerticalOffset: insets.top` no lugar da função;
  - `keyboardProviderProps={{ enabled: false }}`;
  - `KeyboardAvoidingView` do RN em volta do `<GiftedChat>`;
  - `overflow: "hidden"` removido do `chatFrame`;
  - `KeyboardStickyView` na `ChatInputBar`;
  - versão do GiftedChat trocada num `package.json` temporário, ou a sentinela apontada para um arquivo falso.
- Sondas das funções: `chatKeyboardVerticalOffset` devolvendo 0, ou o espelho com o sinal do offset trocado, fazem falhar os casos de caixa colada.

**Web (Playwright, Chromium headless, build exportado com fallback de SPA, 412×900 e 800×360)**

A web não simula o teclado, então os testes provam o layout e a ausência de regressão, não a subida.

- `/ai-chat` sem chave (IA desligada):
  - o banner "Configure sua chave de API…" aparece;
  - a caixa ("Pergunte sobre suas finanças...") fica inteira na janela, com o fim no fundo da janela (±1 px);
  - o cabeçalho "DOMUS IA" fica visível.
- Focar a caixa e digitar: o botão de enviar fica habilitado. Digitar 6 linhas: a caixa cresce até o limite e continua inteira na janela.
- Com a caixa focada, clicar em configurações abre `/ai-settings`; voltar e clicar em voltar sai do chat. Isso prova que o invólucro não roubou toque.
- Comparar com o mesmo roteiro num build do `7f8e65b`: o topo e o fim da caixa e do cabeçalho na mesma posição (±1 px).
- Se der para ligar a IA na web (chave de teste no armazenamento do navegador), abrir o "+": o menu aparece, e "Escanear holerite" abre a escolha de captura. Senão, fica só no aparelho.
- Sem erro de página nem diálogo nativo.

**Aparelho (itens para a checklist da Story 13.7, Android 16)**

0. **Antes (APK atual, R-1):** focar a caixa no chat e anotar quanto dela fica atrás do teclado.
1. Focar a caixa (IA ligada): ela fica colada acima do teclado, o campo visível e o enviar alcançável. Fechar o teclado: a caixa volta para cima da barra de navegação. Repetir 5 vezes.
2. IA desligada (banner "Configure sua chave…"): repetir o item 1.
3. Durante a abertura do teclado, o cabeçalho continua visível (a lista não passa por cima). Com o teclado aberto, voltar, lixeira e configurações funcionam no 1º toque.
4. Texto longo (5 ou mais linhas): a caixa cresce para cima e o fim continua colado ao teclado.
5. Enviar com o teclado aberto: a mensagem aparece acima da caixa, e a lista rola até ela. O indicador "rolar para o fim" (chevrons) não fica cortado.
6. "+" com o teclado aberto, depois "Escanear holerite" → câmera → cancelar e voltar ao chat: a caixa fica no lugar, sem sobra. O banner "Lendo o holerite…" aparece e some sem cortar a caixa (11.5).
7. Paisagem, fonte 1,3 e 2,0, navegação de 3 botões e por gestos: repetir 1.
8. Entrar e sair do chat 10 vezes (inclusive com o teclado aberto, saindo pelo voltar), em Samsung com Android 16 se houver: sem crash "null child".
9. Depois de sair do chat: as barras de status e de navegação continuam certas nas outras telas, inclusive depois de trocar o tema. Um modal da 13.3 (nova transação) ainda sobe com o teclado.
10. Glossário ("O que é…?"), troca de provedor e permissão de dados com o teclado aberto: abrem e fecham sem deixar a caixa fora do lugar.
11. Fluidez num aparelho com GPU Mali fraca: abrir e fechar o teclado no chat sem travar nem piscar.

## Implementation Notes

**Arquivos**

- Novo: `src/components/ai/chatKeyboardLayout.ts` (sem import nenhum):
  - `CHAT_KEYBOARD_GAP = 2` (D-3 a);
  - `CHAT_KEYBOARD_PROVIDER_PROPS = { statusBarTranslucent: true, navigationBarTranslucent: true, preload: false, children: null } as const` (R-4: o `children: null` satisfaz o tipo sem `any` nem import de tipo; o filho JSX do `GiftedChatWrapper` vence o do spread);
  - `chatKeyboardVerticalOffset(chatTop, gap)` = `ceil(max(chatTop, 0) + gap)`, com `chatTop` não finito → 0;
  - `giftedChatLift({…})`, espelho do `relativeKeyboardHeight` do KAV 1.18.5 (`progress × max(frameY + frameHeight − (janela − teclado − offset), 0)`).
- `app/ai-chat.tsx`:
  - estado `chatTop` (começa em 0) e `onChatFrameLayout`, que só troca o estado quando o `y` muda;
  - `keyboardAvoidingViewProps` memoizado pelo `chatTop`;
  - `<View style={styles.chatFrame} onLayout={onChatFrameLayout}>` em volta só do `<GiftedChat>` (os modais continuam irmãos);
  - `keyboardAvoidingViewProps={keyboardAvoidingViewProps}` e `keyboardProviderProps={CHAT_KEYBOARD_PROVIDER_PROPS}` sob o comentário "Keyboard & layout";
  - `styles.chatFrame = { flex: 1, overflow: "hidden" }`. O bloco do `<GiftedChat>` foi reindentado um nível (`git diff -w` mostra só a mudança real).
- `src/components/__tests__/keyboardScroll.test.ts`: `CHAT_SCREENS`, `CHAT_COMPONENTS`, a sentinela, os detectores (`keyboardProviderUses`, `countKeyboardProviders`, `giftedChatNames`, `viewRanges`, `resolveLocalValue`, `chatScreenViolations`, `chatLayoutModuleViolations`, `chatRouteViolations`, `chatComponentViolations`, `chatSentinelViolations`), o bloco "chat da IA (Story 13.5)" e os auto-testes. `DISCOVERY_EXCEPTIONS["app/ai-chat.tsx"]` = "chat (CHAT_SCREENS, Story 13.5)".
- Testes: `src/components/ai/__tests__/chatKeyboardLayout.test.ts` (22, novo) e `keyboardScroll.test.ts` (161 → 210).

**Decisões além da spec**

- **Offset memoizado numa variável.** O prop recebe `keyboardAvoidingViewProps` (um `useMemo`), não o objeto literal. A guarda resolve o identificador local (`const x = useMemo(…)` ou `const x = {…}`) e exige `keyboardVerticalOffset: chatKeyboardVerticalOffset(` dentro dele, sem `enabled:` nem `behavior:`. O objeto literal direto no prop também passa.
- **Folga inválida.** `chatKeyboardVerticalOffset` trata `gap` negativo ou `NaN` como 0. Com a folga padrão, o offset nunca fica abaixo de 2.
- **`giftedChatLift`.** O `interpolate(progress, [0,1], [0, r])` do reanimated vira `progress × r`, que é igual no intervalo [0, 1].
- **Regra do provider único.** Por namespace, default, `require` e `import()`, só acusa se o identificador `KeyboardProvider` aparece no arquivo (fora de comentário e string). Assim `KC.KeyboardController.dismiss()` não é falso positivo. `export * from` do keyboard-controller acusa sempre (ninguém faz hoje). `import type` não conta.
- **Guarda do chat, mais estrita que a spec em três pontos:**
  - nas telas de `CHAT_SCREENS` e nos `CHAT_COMPONENTS`, qualquer import do keyboard-controller acusa, inclusive `import type`;
  - `Keyboard.dismiss()` continua permitido (só `Keyboard.addListener` acusa);
  - a tela precisa importar `CHAT_KEYBOARD_PROVIDER_PROPS` e `chatKeyboardVerticalOffset` de `@/src/components/ai/chatKeyboardLayout`.
- **Invólucro.** `viewRanges` casa as aberturas de `<View` só em posição de JSX (um `useRef<View>` não abre elemento) e ignora `<View … />`. Todo `<GiftedChat` precisa estar dentro de um `<View style={styles.chatFrame} onLayout=…>…</View>`.
- **Rota.** Além do `Stack.Screen name="ai-chat"` (exatamente um, `headerShown: false`, sem `presentation:`), a guarda barra `presentation:` no `screenOptions` do `<Stack>`.
- **Sentinela.** Também confere a expressão do `keyboardY` (`screenHeight - keyboard.heightWhenOpened.value - keyboardVerticalOffset`). Arquivo ausente em `node_modules` conta como mudança. Toda mensagem termina com "rever a Story 13.5 (offset do chat)".
- **R-6 desatualizado.** O `npx tsc --noEmit` do baseline hoje tem 0 erros (não 5), e continua com 0.

**Verificação**

- `npx vitest run`: 96 arquivos e 2083 testes passando (baseline: 95 e 2012; +22 do `chatKeyboardLayout.test.ts`, +49 na guarda).
- `npx tsc --noEmit`: 0 erros. `npx eslint` nos arquivos tocados: sem avisos.
- `npx expo export --platform web`: exit 0. O `expo-env.d.ts` não foi gerado.
- Sondas da guarda (as 9 da spec, mais 3 extras; todas acusadas e revertidas):
  - `KeyboardProvider` de volta em `ai-chat.tsx`;
  - `KeyboardProvider as KP` em `AIUsageBar.tsx`;
  - `keyboardAvoidingViewProps` removido;
  - `keyboardVerticalOffset: insets.top`;
  - `keyboardProviderProps={{ enabled: false }}`;
  - `KeyboardAvoidingView` do RN em volta do `<GiftedChat>`;
  - `overflow: "hidden"` removido;
  - `KeyboardStickyView` na `ChatInputBar`;
  - `"version": "3.3.3"` no `package.json` do GiftedChat em `node_modules`;
  - extras: `enabled: false` no `chatKeyboardLayout.ts`, `presentation: "modal"` na rota `ai-chat`, e a fórmula do KAV alterada em `node_modules`.
- Sondas das funções (todas revertidas):
  - `chatKeyboardVerticalOffset` devolvendo 0 e o espelho com o sinal do offset trocado quebram os casos de caixa colada;
  - sem `ceil`, sem o piso em 0, subida sem `max(…, 0)`, `progress` ignorado, `preload: true` e folga 0 quebram 1 a 6 testes cada.
- **Playwright** (Chromium headless, build exportado com fallback de SPA, 412×900 e 800×360; mesmo roteiro num build do `HEAD` b4ecf1b):
  - Roteiro: entrar pela home (botão do robô, para o `router.back` ter pilha), com o aviso de consultas externas ("Manter ligado") e a dica "Entendi!" fechados.
  - O banner "Configure sua chave de API…" aparece, e o cabeçalho "DOMUS IA" fica visível (top 12, bottom 34).
  - A caixa (`ChatInputBar`) vai de 790 a 900 em 412×900 e de 250 a 360 em 800×360: inteira, com o fim no fundo da janela.
  - O enviar começa desabilitado e fica habilitado ao digitar.
  - Com 6 linhas, a caixa continua inteira na janela. Na web, o `textarea` multiline não cresce (56 px antes e depois), então não dá para ver a caixa crescer até o limite.
  - Com a caixa focada, configurações abre `/ai-settings`. Voltar retorna a `/ai-chat`, e o botão de voltar do chat sai para `/`.
  - Sem erro de página nem diálogo nativo.
  - Todos os números são iguais aos do baseline (±0 px).
  - O "+" não foi testado: precisa da IA ligada. Fica para o aparelho (item 6).

**Checklist do aparelho (Story 13.7)**

0. **Antes (APK atual, R-1):** focar a caixa no chat, com e sem o banner "Configure sua chave…", e anotar quanto dela fica atrás do teclado (esperado pela leitura do código: cerca de `chatTop`, 100 a 180 dp). Se a caixa já estiver colada, parar: a premissa da fórmula está errada, e o offset precisa ser revisto antes de instalar este build.
1. Focar a caixa (IA ligada): ela fica colada acima do teclado, o campo visível e o enviar alcançável. Fechar o teclado: a caixa volta para cima da barra de navegação. Repetir 5 vezes.
2. IA desligada (banner "Configure sua chave…"): repetir o item 1.
3. Durante a abertura do teclado, o cabeçalho continua visível (a lista não passa por cima). Com o teclado aberto, voltar, lixeira e configurações funcionam no 1º toque.
4. Texto longo (5 ou mais linhas): a caixa cresce para cima e o fim continua colado ao teclado.
5. Enviar com o teclado aberto: a mensagem aparece acima da caixa, e a lista rola até ela. O indicador "rolar para o fim" (chevrons) e as sugestões não ficam cortados pelo recorte (R-2).
6. "+" com o teclado aberto, depois "Escanear holerite" → câmera → cancelar e voltar ao chat: a caixa fica no lugar, sem sobra. O banner "Lendo o holerite…" aparece e some sem cortar a caixa (11.5).
7. Paisagem, fonte 1,3 e 2,0, navegação de 3 botões e por gestos: repetir 1.
8. Entrar e sair do chat 10 vezes (inclusive com o teclado aberto, saindo pelo voltar), em Samsung com Android 16 se houver: sem crash "null child".
9. Depois de sair do chat: as barras de status e de navegação continuam certas nas outras telas, inclusive depois de trocar o tema (`EdgeToEdgeViewRegistry`, R-3). Um modal da 13.3 (nova transação) ainda sobe com o teclado.
10. Glossário ("O que é…?"), troca de provedor e permissão de dados com o teclado aberto: abrem e fecham sem deixar a caixa fora do lugar.
11. Fluidez num aparelho com GPU Mali fraca: abrir e fechar o teclado no chat sem travar nem piscar.

Se os itens 8 ou 9 falharem por causa do provider aninhado, a saída é a D-1 (b).

## Review Triage Log

Revisão única com três lentes (adversarial, casos de borda, lacunas de verificação), 28/10, sobre o commit 2a16009. 1 High, 4 Med, 6 Low.

| # | Achado | Sev. | Decisão |
|---|--------|------|---------|
| R1 | Dois `KeyboardProvider` vivos: o `ModalAttachedWatcher` do provider interno do GiftedChat sobrescreve o listener de dismiss e o callback de animação do modal; ao sair do chat a raiz pode ficar suspensa, e no caminho chat → holerite → busca de conta/categoria a folha não sobe | High | **patch** (decisão do dono 28/10, troca a D-1 para (b)): patch no `react-native-gifted-chat` 3.3.2 (`patches/`, via patch-package) para não montar `KeyboardProvider` próprio; fica um só provider no app. `keyboardProviderProps` sai; a guarda passa a exigir o patch aplicado (o `GiftedChatWrapper` do `node_modules` sem `KeyboardProvider`) e exatamente um provider no app |
| R2 | Paisagem e fonte 2,0: o espaço acima do teclado (57dp) é menor que a caixa + sugestões; o teste passa por identidade algébrica | Med | **patch**: teste de que o espaço disponível ≥ caixa + rodapé; com teclado aberto e espaço curto, esconder sugestões rápidas e a barra de uso; itens no checklist (paisagem e fonte 2,0 com aviso; teclado em tela cheia em paisagem) |
| R3 | Testes provam álgebra, não a biblioteca | Med | **patch**: spec diz que a prova é o aparelho (itens 0/1) e lista o que o teste não cobre |
| R4 | Burlas da guarda (argumento constante, spread no `keyboardAvoidingViewProps`, `onLayout` vazio, `View` entre o contorno e o `GiftedChat`, spread nas opções da rota, `View` acima do `RootLayoutNav`) | Med | **patch**: argumento = identificador do `useState` setado com `nativeEvent.layout.y`; sem spread nos props; `<GiftedChat` filho direto do contorno; sem spread nas opções da rota; nada renderizado acima do `RootLayoutNav` |
| R5 | Guarda e sentinela não rodam na CI; `react-native-gifted-chat` com `^` | Med | **patch**: fixar `3.3.2` exato no `package.json` e no `package-lock.json` (obrigatório com o patch do R1). CI barrar testes fica no Epic 2 |
| R6 | `overflow: hidden` do contorno é redundante (o GiftedChat já corta); linhas da matriz descrevem defeito que não acontece | Low | **patch**: corrigir R-2 e a matriz; guarda deixa de exigir o `overflow` |
| R7 | `CHAT_KEYBOARD_PROVIDER_PROPS` não faz nada no Android | Low | **patch**: some junto com o R1 |
| R8 | Deslocamento atrasado quando a barra de uso aparece com teclado aberto | Low | **patch**: item no checklist |
| R9 | Estado residual depois que o provider interno desmonta | Low | **patch**: resolvido pelo R1 |
| R10 | Checklist só Android 16 | Low | **patch**: um aparelho Android 9/10 e tela dividida no checklist |
| R11 | "Antes" não medido | Low | **patch**: item 0 do checklist obrigatório antes de fechar a 13.7 |
