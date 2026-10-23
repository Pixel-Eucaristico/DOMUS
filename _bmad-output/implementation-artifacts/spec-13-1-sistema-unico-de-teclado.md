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
- [ ] `KeyboardProvider` na raiz; chat sem provider próprio
- [ ] Remover `react-native-avoid-softinput` (código, `package.json`, `package-lock.json` com npm 10)
- [ ] Conferir no build web que as telas abrem; o teste no aparelho fica na checklist da Story 13.7

**Acceptance Criteria:**
- Given o app aberto, when foco um campo em add-transaction, ai-settings, backup ou about, then a tela sobe até o campo
- Given o projeto, when procuro `avoid-softinput`, then não há referência no código nem nas dependências

## Verification

- `npx vitest run`, `npx tsc --noEmit` e `npx expo export --platform web` sem falhas novas
- APK de pré-release para o dono testar no aparelho
