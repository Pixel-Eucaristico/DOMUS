---
title: 'Story 13.1: ligar o sistema único de teclado na raiz'
type: 'bugfix'
created: '2026-10-23'
status: 'in-progress'
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
- [ ] Conferir no build web que as telas abrem; o teste no aparelho fica na checklist da Story 13.7

**Acceptance Criteria:**
- Given o app aberto, when foco um campo em add-transaction, ai-settings, backup ou about, then a tela sobe até o campo
- Given o projeto, when procuro `avoid-softinput`, then não há referência no código nem nas dependências

## Verification

- `npx vitest run`, `npx tsc --noEmit` e `npx expo export --platform web` sem falhas novas
- APK de pré-release para o dono testar no aparelho

## Implementation Notes

**O que mudou**

- `app/_layout.tsx`: um único `<KeyboardProvider statusBarTranslucent navigationBarTranslucent>` dentro do `AppContainer`, logo abaixo do `GestureHandlerRootView` e envolvendo `TamaguiProvider` → `SafeAreaProvider` → … → `{children}` + `Scanlines`. Fica sempre montado (o `AppContainer` só some antes das fontes carregarem, como antes) e tem um filho único e estável. Toda a navegação, os hosts pós-splash, o `AppAlertHost` e todos os `Modal` do app ficam dentro dele. Saíram o `useEffect` do `AvoidSoftInput` e o import.
- `app/ai-chat.tsx`: saiu o `KeyboardProvider` próprio e o import. O corpo do JSX só perdeu um nível de indentação (`git diff -w` mostra 3 linhas). O GiftedChat 3.3.2 usa o `react-native-keyboard-controller` por dentro e agora lê o contexto do provider da raiz.
- `package.json` / `package-lock.json`: `npm uninstall react-native-avoid-softinput` com npm 10.9.4. O lockfile perdeu só a entrada do pacote e a linha da raiz (−14 linhas). O `react-native-is-edge-to-edge` continua lá porque o keyboard-controller depende dele. O `yarn.lock` não mudou.
- `README.md`: saíram a linha da tabela de dependências e o crédito do avoid-softinput. A entrada antiga do changelog (`feat(keyboard): integrar react-native-avoid-softinput…`) ficou, porque é histórico.
- `app.json`: não tem `softwareKeyboardLayoutMode`. O padrão do Expo (`resize`) gera `android:windowSoftInputMode="adjustResize"`, que é o modo que o keyboard-controller espera. O SDK 54 já gera `edgeToEdgeEnabled=true`. Nada mudou.

**Notas técnicas**

- `statusBarTranslucent` e `navigationBarTranslucent` existem com esses nomes na 1.18.5. Com edge-to-edge ligado (SDK 54 / RN 0.81), o provider força os dois para `true` (`IS_EDGE_TO_EDGE || prop`), então passar as props não muda nada no Android 16. Em `__DEV__`, o `react-native-is-edge-to-edge` pode mostrar uma única vez o aviso "…values are ignored when using react-native-edge-to-edge". É só um aviso.
- Modais: o `Modal` do RN abre em outra janela (Dialog), mas o conteúdo dele continua na árvore React, debaixo do provider, então o contexto chega até ele. No Android, o `ModalAttachedWatcher` da biblioteca escuta o evento `topShow` de cada `Modal`, liga um callback de insets na janela do Dialog e repassa os eventos para o `KeyboardControllerView` da raiz. É assim que o `useKeyboardHandler` do `KeyboardSafeView` recebe a altura do teclado dentro dos modais. Isso só funciona com um provider montado, que agora existe.
- Risco conhecido (crash "null child at index N"): o `KeyboardControllerView` é o `EdgeToEdgeReactViewGroup`. O commit `8f15e75` (março) já pôs o provider na raiz, e o `230ed4a` corrigiu o crash do Samsung S24 com `patches/react-native-keyboard-controller+1.18.5.patch`. Esse patch continua aplicado (`cleanNullChildren` em `dispatchDraw` e remoção síncrona). Mesmo assim, o provider foi posto onde o único filho direto do view group é estável: `TamaguiProvider`/`RNCSafeAreaProvider`, sempre montados. Nenhum filho condicional entrou na raiz e o slot condicional pós-splash não mudou.
- Efeito visível possível: o `AvoidSoftInput` deslocava a janela inteira em qualquer tela com campo. Telas e componentes com campo de texto sem `KeyboardAwareScrollView`/`KeyboardSafeView`/`KeyboardAvoidingView` podem deixar de subir. Entre eles: `app/ocr-settings.tsx`, `app/sync.tsx`, `CategoryPickerModal`, `StoreGridModal`, `WelcomeCarousel`, `ContactForm`, `APIKeyManager` (alguns ficam dentro de telas que já usam `KeyboardAwareScrollView`). Esses casos são das Stories 13.2 a 13.6. Conferir na checklist da 13.7.
- No chat da IA, o provider próprio não tinha props, mas no edge-to-edge as duas flags já eram forçadas para `true`. Sem o `AvoidSoftInput`, o único deslocamento passa a ser o do GiftedChat, sem somar um segundo deslocamento. Se o chat subir menos (ou deixar de subir duas vezes), é efeito esperado. A Story 13.5 faz o ajuste fino.

**Verificação**

- `npx vitest run`: 70 arquivos e 1346 testes passando.
- `npx tsc --noEmit`: exit 0, sem erros.
- `npx expo export --platform web`: exit 0. Na web, o `KeyboardControllerView` é uma `View` com `flex: 1`. Não havia navegador headless no ambiente para abrir as telas, por isso o 3º item fica aberto.
- `CI=1 npx expo prebuild --platform android --no-install` numa cópia limpa: exit 0. Nenhuma ocorrência de `softinput`/`avoid` em `android/`. O `react-native-config` do autolinking lista 21 libs RN, com `react-native-keyboard-controller` e sem `react-native-avoid-softinput`. O manifest tem `windowSoftInputMode="adjustResize"` e o `gradle.properties` tem `edgeToEdgeEnabled=true`.

**O dono precisa testar no aparelho (APK de pré-release, Android 16)**

1. Abrir e fechar o app várias vezes, passar pelo splash, pelo carrossel de boas-vindas e pelo tour, e bloquear e desbloquear. Não pode aparecer o crash "EdgeToEdgeReactViewGroup contains null child".
2. add-transaction: focar o último campo. A tela rola até ele.
3. ai-settings, backup e about (formulário de contato): focar os campos de baixo. A tela sobe.
4. Um modal com `KeyboardSafeView`: o espaço cresce com o teclado e encolhe quando ele fecha.
5. Chat da IA: a barra de digitação fica acima do teclado, sem sobra nem buraco.
6. Telas sem teclado próprio (ocr-settings, sync, seletores de categoria, grade de lojas): anotar quais deixaram de subir para as Stories 13.2 a 13.6.
7. Barras de status e de navegação: o conteúdo não fica escondido nem com faixa errada (edge-to-edge).

