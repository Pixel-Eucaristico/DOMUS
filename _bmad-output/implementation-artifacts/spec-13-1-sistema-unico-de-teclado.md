---
title: 'Story 13.1: ligar o sistema único de teclado na raiz'
type: 'bugfix'
created: '2026-10-23'
status: 'done'
baseline_commit: 'aae3863'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O teclado cobre os campos. A causa: o app usa o `react-native-keyboard-controller` (`KeyboardAwareScrollView` em add-transaction, ai-settings, backup e about; `useKeyboardHandler` no `KeyboardSafeView` dos modais), mas o `KeyboardProvider` só existe dentro do chat da IA. Sem o provider na raiz esses componentes não recebem os eventos do teclado e não sobem. Em paralelo, o `_layout` liga o `react-native-avoid-softinput`, um segundo sistema que desloca a tela por conta própria.

**Approach:** Um único `KeyboardProvider` (com `statusBarTranslucent` e `navigationBarTranslucent` para o edge-to-edge do Android 16) envolvendo a navegação em `app/_layout.tsx`; tirar o `react-native-avoid-softinput` do código, do `package.json` e do `package-lock.json` (npm 10); o chat da IA passa a usar o provider da raiz (a Story 13.5 ajusta o GiftedChat).

## Boundaries & Constraints

**Always:** um só sistema de teclado; `package-lock.json` atualizado com npm 10 (a CI roda `npm ci`), e `yarn.lock` revertido se o `npm` mexer nele; nenhuma tela que subia antes deixa de subir; mudança nativa só por config/plugins, nunca editando `android/` ou `ios/`; web continua funcionando (o `KeyboardAwareScrollViewCompat` já cai para `ScrollView` na web).

**Never:** mexer nos formulários de cada tela (Stories 13.2 a 13.6); trocar a biblioteca de teclado.

## I/O & Edge-Case Matrix

| Cenário | Antes | Depois |
|---|---|---|
| Campo no fim de add-transaction | teclado cobre | a tela rola até o campo |
| Modal com `KeyboardSafeView` | espaço não cresce | o espaço cresce com o teclado |
| Chat da IA | provider próprio | provider da raiz, mesma subida |
| Web | `ScrollView` | igual |
| Build | `avoid-softinput` no APK | removido |

</frozen-after-approval>

## Code Map

- `app/_layout.tsx` -- `AvoidSoftInput` (linhas ~407-413) e árvore de providers
- `app/ai-chat.tsx` -- `KeyboardProvider` próprio
- `components/KeyboardAwareScrollViewCompat.tsx`, `src/components/shared/KeyboardSafeView.tsx`
- `package.json`, `package-lock.json`, `app.json` (`softwareKeyboardLayoutMode`)

## Tasks & Acceptance

**Execution:**
- [x] `KeyboardProvider` na raiz; chat sem provider próprio
- [x] Remover `react-native-avoid-softinput` (código, `package.json`, `package-lock.json` com npm 10)
- [x] Conferir no build web que as telas abrem (`/sync` e `/ocr-settings` com Playwright); o teste no aparelho fica na checklist da Story 13.7

**Acceptance Criteria:**
- Given o app aberto, when foco um campo em add-transaction, ai-settings, backup ou about, then a tela sobe até o campo
- Given o projeto, when procuro `avoid-softinput`, then não há referência no código nem nas dependências

## Spec Change Log

- **Regressão corrigida na própria 13.1 (decisão do dono, 24/10/2026):** sem o `AvoidSoftInput`, quatro campos da janela principal ficavam cobertos (o edge-to-edge do Android 16 não redimensiona a janela). A troca mínima vem para cá, antecipando parte das Stories 13.2 e 13.6: `KeyboardAwareScrollView` em `app/ocr-settings.tsx`, `app/sync.tsx` e `ParsedScreen`, e a barra da chave manual do `QrScanScreen` presa acima do teclado (`KeyboardStickyView` ou `KeyboardAvoidingView` da biblioteca).

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Chave manual da NF (`QrScanScreen`), itens da nota (`ParsedScreen`), chave do Cloud Vision (`ocr-settings`) e código do grupo (`sync`) ficam cobertos pelo teclado | high | Só subiam pelo `AvoidSoftInput`; com edge-to-edge, `adjustResize` não age. **patch** (Change Log) — **aplicado** em 24/10/2026. |
| Lista de regressões das notas errada (inclui o que já sobe, falta a importação da nota) | medium | **patch**: lista certa e importação da nota na checklist da 13.7 — **aplicado** em 24/10/2026. |
| Nota falsa: o GiftedChat sempre monta o próprio `KeyboardProvider` | medium | **patch** na nota; a 13.5 configura por `keyboardProviderProps` — **aplicado** em 24/10/2026. |
| O watcher de modais passa a valer em todo modal (Android 7–10 e modal dentro de modal) | low | **defer** para a checklist da 13.7. |
| Margens em paisagem com navegação de 3 botões | low | **defer** para a checklist da 13.7. |
| Desmontagem do provider na raiz (patch da biblioteca, abrir por link) | low | **defer**: conferir no Crashlytics e abrir por link/compartilhamento na 13.7. |
| Sem teste automático de teclado | low (gap) | **defer**: nativo; checklist da 13.7. |

## Verification

- `npx vitest run`, `npx tsc --noEmit` e `npx expo export --platform web` sem falhas novas
- APK de pré-release para o dono testar no aparelho

## Implementation Notes

**O que mudou**

- `app/_layout.tsx`: um único `<KeyboardProvider statusBarTranslucent navigationBarTranslucent>` dentro do `AppContainer`, logo abaixo do `GestureHandlerRootView` e envolvendo `TamaguiProvider` → `SafeAreaProvider` → … → `{children}` + `Scanlines`. Fica sempre montado (o `AppContainer` só some antes das fontes carregarem, como antes) e tem um filho único e estável. Toda a navegação, os hosts pós-splash, o `AppAlertHost` e todos os `Modal` do app ficam dentro dele. Saíram o `useEffect` do `AvoidSoftInput` e o import.
- `app/ai-chat.tsx`: saiu o `KeyboardProvider` próprio e o import. O corpo do JSX só perdeu um nível de indentação (`git diff -w` mostra 3 linhas). O GiftedChat 3.3.2 usa o `react-native-keyboard-controller` por dentro e sempre monta o próprio `KeyboardProvider` (ver Notas técnicas).
- `package.json` / `package-lock.json`: `npm uninstall react-native-avoid-softinput` com npm 10.9.4. O lockfile perdeu só a entrada do pacote e a linha da raiz (−14 linhas). O `react-native-is-edge-to-edge` continua lá porque o keyboard-controller depende dele. O `yarn.lock` não mudou.
- `README.md`: saíram a linha da tabela de dependências e o crédito do avoid-softinput. A entrada antiga do changelog (`feat(keyboard): integrar react-native-avoid-softinput…`) ficou, porque é histórico.
- `app.json`: não tem `softwareKeyboardLayoutMode`. O padrão do Expo (`resize`) gera `android:windowSoftInputMode="adjustResize"`, que é o modo que o keyboard-controller espera. O SDK 54 já gera `edgeToEdgeEnabled=true`. Nada mudou.
- Campos que só subiam pelo `AvoidSoftInput` (Spec Change Log, 24/10/2026):
  - `src/components/invoice/QrScanScreen.tsx`: a barra de baixo (chave manual de 44 dígitos com `autoFocus`) virou `KeyboardStickyView` com os mesmos estilos (`position: absolute; bottom: 0`) e `offset={{ closed: 0, opened: insets.bottom }}`. A altura do teclado da biblioteca já inclui a barra de navegação; o offset desconta o `paddingBottom` (`insets.bottom + 20`) para a barra ficar 20 px acima do teclado, sem sobra. Só a barra se move (nenhum `KeyboardAvoidingView` em volta), então não sobe duas vezes.
  - `src/components/invoice/ParsedScreen.tsx`, `app/ocr-settings.tsx` e `app/sync.tsx`: o `ScrollView` principal virou `KeyboardAwareScrollViewCompat` com `bottomOffset={50}` e `keyboardShouldPersistTaps="handled"`, mantendo `style`, `contentContainerStyle` e `showsVerticalScrollIndicator`. Em `sync.tsx` saiu o `scrollRef`, que não era usado (o Compat não repassa `ref`). O `ScrollView` do modal do QR em `sync.tsx` ficou como estava. Na web o Compat cai para `ScrollView`.

**Notas técnicas**

- `statusBarTranslucent` e `navigationBarTranslucent` existem com esses nomes na 1.18.5. Com edge-to-edge ligado (SDK 54 / RN 0.81), o provider força os dois para `true` (`IS_EDGE_TO_EDGE || prop`), então passar as props não muda nada no Android 16. Em `__DEV__`, o `react-native-is-edge-to-edge` pode mostrar uma única vez o aviso "…values are ignored when using react-native-edge-to-edge". É só um aviso.
- Modais: o `Modal` do RN abre em outra janela (Dialog), mas o conteúdo dele continua na árvore React, debaixo do provider, então o contexto chega até ele. No Android, o `ModalAttachedWatcher` da biblioteca escuta o evento `topShow` de cada `Modal`, liga um callback de insets na janela do Dialog e repassa os eventos para o `KeyboardControllerView` da raiz. É assim que o `useKeyboardHandler` do `KeyboardSafeView` recebe a altura do teclado dentro dos modais. Isso só funciona com um provider montado, que agora existe.
- Risco conhecido (crash "null child at index N"): o `KeyboardControllerView` é o `EdgeToEdgeReactViewGroup`. O commit `8f15e75` (março) já pôs o provider na raiz, e o `230ed4a` corrigiu o crash do Samsung S24 com `patches/react-native-keyboard-controller+1.18.5.patch`. Esse patch continua aplicado (`cleanNullChildren` em `dispatchDraw` e remoção síncrona). Mesmo assim, o provider foi posto onde o único filho direto do view group é estável: `TamaguiProvider`/`RNCSafeAreaProvider`, sempre montados. Nenhum filho condicional entrou na raiz e o slot condicional pós-splash não mudou.
- Efeito visível possível: o `AvoidSoftInput` deslocava a janela inteira em qualquer tela com campo. Na janela principal, os campos que só subiam por ele eram a chave manual da NF no `QrScanScreen`, os itens da nota no `ParsedScreen` (`EditableItemRow`, `AddItemForm`, `ProductFormCard`, busca do `AccountPicker` compacto), a chave do Cloud Vision em `ocr-settings` e o código do grupo em `sync`. Os quatro foram corrigidos nesta story (ver "O que mudou"). As telas que já usavam `KeyboardAwareScrollView` (add-transaction, ai-settings, backup, about — com `ContactForm` e `APIKeyManager` dentro delas) continuam subindo.
- Inputs dentro de `Modal` do RN nunca foram tratados por esta story e podem ficar cobertos: `CategoryPickerModal`, `StoreGridModal`, busca do `AccountPicker` em modal, modal "APAGAR TUDO", `WelcomeCarousel` e `DebugTools`. Esses são das Stories 13.3 e 13.4. As Stories 13.2 e 13.6 continuam no backlog; a 13.6 (chave da NF) e parte da 13.2 (ocr-settings, sync, ParsedScreen) já tiveram a troca mínima aqui, o que deve ser anotado na spec delas quando forem abertas.
- Chat da IA: o GiftedChat 3.3.2 sempre monta o próprio `KeyboardProvider` por dentro, então tirar o provider de `app/ai-chat.tsx` não faz o chat usar o da raiz — o chat fica com um provider aninhado ao da raiz. Sem o `AvoidSoftInput`, o deslocamento do chat é só o do GiftedChat (o `KeyboardAvoidingView` interno dele), sem somar um segundo. Se o chat subir menos (ou deixar de subir duas vezes), é efeito esperado. A Story 13.5 ajusta pelo `keyboardProviderProps` e `keyboardAvoidingViewProps` do GiftedChat.

**Verificação**

- `npx vitest run`: 70 arquivos e 1346 testes passando.
- `npx tsc --noEmit`: exit 0, sem erros.
- `npx expo export --platform web`: exit 0. Na web, o `KeyboardControllerView` é uma `View` com `flex: 1`. Não havia navegador headless no ambiente para abrir as telas, por isso o 3º item fica aberto.
- `CI=1 npx expo prebuild --platform android --no-install` numa cópia limpa: exit 0. Nenhuma ocorrência de `softinput`/`avoid` em `android/`. O `react-native-config` do autolinking lista 21 libs RN, com `react-native-keyboard-controller` e sem `react-native-avoid-softinput`. O manifest tem `windowSoftInputMode="adjustResize"` e o `gradle.properties` tem `edgeToEdgeEnabled=true`.
- Depois dos patches da revisão (24/10/2026): `npx vitest run` com 70 arquivos e 1367 testes passando (exit 0); `npx tsc --noEmit` com exit 0; `npx expo export --platform web` com exit 0. Com o Playwright (Chromium headless, 412×900) no build web exportado, `/sync` e `/ocr-settings` abriram sem erro de página e com o conteúdo esperado ("Sincronizar … Criar grupo … Entrar"; "Configurar OCR … Provedor Preferido … Cloud Vision API").

**O dono precisa testar no aparelho (APK de pré-release, Android 16)**

1. Abrir e fechar o app várias vezes, passar pelo splash, pelo carrossel de boas-vindas e pelo tour, e bloquear e desbloquear. Não pode aparecer o crash "EdgeToEdgeReactViewGroup contains null child".
2. Abrir o app frio por compartilhamento (share intent) e por link (deep link). Mesmo critério do item 1.
3. add-transaction: focar o último campo. A tela rola até o campo.
4. ai-settings, backup e about (formulário de contato): focar os campos de baixo. A tela sobe.
5. Importar nota, câmera: tocar em "Digitar Chave". A barra com o campo e os botões fica logo acima do teclado, sobe uma vez só e volta ao fechar o teclado.
6. Importar nota, nota lida (`ParsedScreen`): editar um item no fim da lista, adicionar item e buscar conta. A tela rola até o campo.
7. ocr-settings: focar a chave do Cloud Vision. sync: tocar em "Entrar" e digitar o código. A tela sobe.
8. Um modal com `KeyboardSafeView`: o espaço cresce com o teclado e encolhe quando ele fecha. Repetir com modal dentro de modal.
9. Chat da IA: a barra de digitação fica acima do teclado, sem sobra nem buraco.
10. Modais sem teclado próprio (`CategoryPickerModal`, `StoreGridModal`, busca do `AccountPicker`, "APAGAR TUDO", `WelcomeCarousel`, `DebugTools`): anotar quais ficam cobertos, para as Stories 13.3 e 13.4.
11. Barras de status e de navegação: o conteúdo não fica escondido nem com faixa errada (edge-to-edge). Repetir em paisagem com navegação de 3 botões.
12. Se houver aparelho com Android 7 a 10: repetir os itens 3, 5 e 8.
