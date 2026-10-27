---
title: 'Story 13.2: padronizar a rolagem das telas com campos'
type: 'bugfix'
created: '2026-10-27'
status: 'in-progress'
baseline_commit: '16d00049b8ffaecd43adc9604be1b8011e909dc6'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-20-teclado.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-13-1-sistema-unico-de-teclado.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Depois da Story 13.1, todas as telas com campo já sobem com o teclado, mas cada uma de um jeito. Quatro telas importam o `KeyboardAwareScrollView` direto da biblioteca (add-transaction, ai-settings, backup, about) e quatro usam o `KeyboardAwareScrollViewCompat` (ocr-settings, sync, `ParsedScreen`, `PayslipReview`). O `bottomOffset={50}` e o `keyboardShouldPersistTaps="handled"` se repetem em cada tela, a folga no fim da rolagem varia (40, 100, 140, `insets.bottom + 24`, `insets.bottom + 32`) e, em duas telas, o botão principal fica num rodapé fixo fora da rolagem (ocr-settings, `ParsedScreen`). Com o edge-to-edge do Android 16 a janela não encolhe, então esse rodapé fica atrás do teclado e não dá para alcançá-lo rolando. Nada impede que uma tela nova com campo volte a usar `ScrollView` puro.

**Approach:** Um único componente de rolagem para telas, o `KeyboardAwareScrollViewCompat` (o critério da story pede "a partir de"), com os padrões dentro dele: `bottomOffset` comum, `keyboardShouldPersistTaps="handled"` e uma folga fixa no fim do conteúdo. Todas as telas com campo usam esse componente, sem repetir as props. O botão principal fica alcançável com o teclado aberto, seja no fim da rolagem, seja num rodapé que sobe com o teclado (D-1). Um teste estático (como o `noNativeAlert.test.ts`) barra o `KeyboardAwareScrollView` importado direto e o `ScrollView` puro em tela com campo.

## Boundaries & Constraints

**Always:** um só componente de rolagem para telas com campo; só o keyboard-controller (`KeyboardProvider` da raiz, Story 13.1); web continua caindo para `ScrollView`; nenhuma tela que sobe hoje deixa de subir; texto de UI em pt-BR com acentos; alerta só por `appAlert`/`appConfirm`; nenhuma View maior que a tela animada (usar `absoluteFillObject` se preciso); nenhuma mudança em `android/` ou `ios/`.

**Never:** mexer em formulário dentro de `Modal` (Stories 13.3 e 13.4: `TransactionBottomSheet`, `AccountFormModal`, `CreateListModal`, `AddItemModal`, `CategoryPickerModal`, `StoreGridModal`, `AccountPicker` compacto, "APAGAR TUDO", `WelcomeCarousel`, `DebugTools`); mexer no chat da IA (Story 13.5); mexer na barra da chave manual do `QrScanScreen` (Story 13.6, já com `KeyboardStickyView` desde a 13.1); trocar a biblioteca de teclado; mudar a lógica dos formulários (eventos, validação, gravação).

## I/O & Edge-Case Matrix

| Cenário | Antes | Depois |
|---|---|---|
| Foco no último campo de qualquer tela da lista | sobe, com folga diferente por tela | sobe com a mesma folga (`bottomOffset` padrão) |
| Tocar num botão com o teclado aberto | funciona (prop repetida em cada tela) | funciona no 1º toque (padrão do componente) |
| Botão "Salvar Configurações" (ocr-settings) com o teclado aberto | atrás do teclado | alcançável (D-1) |
| Rodapé "Importar" da nota (`ParsedScreen`) com o teclado aberto | atrás do teclado | alcançável (D-1) |
| Fechar o teclado | volta | volta, sem espaço sobrando |
| Tela nova com campo e `ScrollView` puro | passa | o teste estático falha |
| Web | `ScrollView` | igual, sem props de teclado chegando ao DOM |

</frozen-after-approval>

## O que a Story 13.1 já fez

- `KeyboardProvider` único na raiz (`app/_layout.tsx`); `react-native-avoid-softinput` removido.
- Troca mínima antecipada da 13.2 (Spec Change Log da 13.1, 24/10/2026): `ocr-settings`, `sync` e `ParsedScreen` passaram de `ScrollView` para `KeyboardAwareScrollViewCompat` com `bottomOffset={50}` e `keyboardShouldPersistTaps="handled"`. Esta story só padroniza o que sobrou nelas (props repetidas, folga e rodapé fixo).
- A `PayslipReview` (Story 11.5) já nasceu com o `KeyboardAwareScrollViewCompat` e com os botões dentro da rolagem. É o modelo a seguir.
- `components/KeyboardAwareScrollViewCompat.tsx` hoje: cai para `ScrollView` na web, já tem `keyboardShouldPersistTaps="handled"` como padrão, não tem `bottomOffset` padrão, não repassa `ref`, repassa todas as props (inclusive `bottomOffset`) ao `ScrollView` da web e ainda tem o comentário `// template`.

## Auditoria das telas (baseline `16d0004`)

| Tela | Rolagem hoje | `keyboardShouldPersistTaps` | Botão principal | Folga no fim | Conflitos | Mudança |
|---|---|---|---|---|---|---|
| `app/add-transaction.tsx` | `KeyboardAwareScrollView` direto | `handled` (prop) | "Salvar/Atualizar transação" no fim da rolagem + ✓ no topo | `insets.bottom + 32` (sem `SafeAreaView`) | `AccountPicker` em modo lista (busca inline, sem rolagem aninhada); `CategoryPickerModal` e `SelectionModal` são modais (13.4 / sem campo) | Trocar pelo componente padrão; tirar `keyboardShouldPersistTaps` e `bottomOffset` repetidos; folga padrão |
| `app/ai-settings.tsx` (`APIKeyManager`, `BudgetCostSection`) | `KeyboardAwareScrollView` direto, dentro de `SafeAreaView` com `edges={["top","bottom"]}` | `handled` (prop) | Botões inline ("Salvar chave", salvar orçamento por `onSubmitEditing`) | `padding: 16` + `spacer` de 24 | Nenhum | Trocar pelo componente padrão; tirar props repetidas; o `spacer` sai se a folga padrão cobrir |
| `app/backup.tsx` (`PasswordInputComponent`) | `KeyboardAwareScrollView` direto, dentro de `SafeAreaView` (todas as bordas) | `handled` (prop) | "Exportar e compartilhar" / "Verificar e restaurar" inline, logo abaixo das senhas | `paddingBottom: 40` | `ConfirmRestoreModal` e `ScreenIntroModal` sem campo | Trocar pelo componente padrão; tirar props repetidas |
| `app/about.tsx` (`ContactForm`, multiline) | `KeyboardAwareScrollView` direto com `ref={scrollRef}` e `scrollEventThrottle`, dentro de `SafeAreaView` | `handled` (prop) | "Enviar mensagem" inline, abaixo do campo multiline | `paddingBottom: 40` | `scrollRef` não é usado em lugar nenhum; modal "APAGAR TUDO" é da 13.4 | Trocar pelo componente padrão; tirar `scrollRef` e `scrollEventThrottle` sem uso; conferir o cursor no campo multiline |
| `app/ocr-settings.tsx` | `KeyboardAwareScrollViewCompat` (13.1) | `handled` (prop) | "Salvar Configurações" em **rodapé fixo fora da rolagem** | `paddingBottom: 100` (espaço do rodapé) | Nenhum | Tirar props repetidas; botão alcançável conforme D-1 |
| `app/sync.tsx` | `KeyboardAwareScrollViewCompat` (13.1) | `handled` (prop) | "Entrar" ao lado do código (`autoFocus`) | `insets.bottom + webBottomInset + 24` | `ScrollView` do modal do QR (sem campo; fica como está) | Tirar props repetidas; folga padrão |
| `ParsedScreen` (`app/import-invoice.tsx`) | `KeyboardAwareScrollViewCompat` (13.1) | `handled` (prop) | Total + "Cancelar"/"Importar" em **rodapé fixo fora da rolagem** | `paddingBottom: 140` | Itens em `.map` (sem `FlatList`); `AccountPicker` em modo lista; `ProductFormCard` abre `CategoryPickerModal` (13.4) | Tirar props repetidas; rodapé alcançável conforme D-1 |
| `PayslipReview` (`app/payslips.tsx`) | `KeyboardAwareScrollViewCompat` (11.5) | `handled` (prop) | "Salvar holerite" no fim da rolagem | `bottomInset + 32` | Nenhum | Tirar props repetidas; já está no padrão |
| `QrScanScreen` (`app/import-invoice.tsx`) | sem rolagem; barra com `KeyboardStickyView` (13.1) | — | Barra inferior | — | — | Fora (13.6) |
| `app/ai-chat.tsx` | GiftedChat | — | — | — | — | Fora (13.5) |

Outras rotas em `app/` sem campo próprio (`security-settings`, `payslips` fora da revisão, `transactions`, abas, `wishlist/*`, `transaction-detail`, `category-detail`): campos só em modais (13.3/13.4). O `IdleScreen` da nota usa `ScrollView` sem campo.

## Padrão proposto

`components/KeyboardAwareScrollViewCompat.tsx` (D-2) passa a ser **o** componente de rolagem de tela com campo:

- `bottomOffset` padrão = constante exportada `KEYBOARD_BOTTOM_OFFSET = 50` (o valor que todas as telas já usam; bem acima da folga mínima de 8 dp do FR-29). A tela pode sobrescrever só com motivo (rodapé que sobe, D-1).
- `keyboardShouldPersistTaps="handled"` padrão (já existe).
- Folga no fim do conteúdo conforme D-3 (recomendado: constante `SCROLL_BOTTOM_PADDING = 32` exportada, somada pela tela a `insets.bottom` quando ela não está num `SafeAreaView` com a borda de baixo).
- Na web, tirar as props do teclado (`bottomOffset`, `extraKeyboardSpace`, `disableScrollOnKeyboardHide`, `enabled`) antes de repassar ao `ScrollView`.
- Sair o comentário `// template`; um comentário curto em pt-BR diz que é o componente único de rolagem de tela com campo (Epic 13).
- Sem `forwardRef` por ora: nenhuma tela usa `ref` (o `scrollRef` do about não é usado).

Fora do componente: `KeyboardAwareScrollView` importado direto da biblioteca só no próprio Compat.

## Decisões do dono (aprovadas em 27/10: D-1 c, D-2 a, D-3 a)

- **D-1 — Rodapé fixo com o botão principal (ocr-settings e `ParsedScreen`):** (a) o rodapé vira `KeyboardStickyView` e sobe com o teclado, com `bottomOffset` somando a altura do rodapé; (b) o botão vai para o fim da rolagem, como na `PayslipReview`; (c) misto: ocr-settings em (b) (formulário curto, um botão só) e `ParsedScreen` em (a) (a lista de itens pode ser longa e o total + "Importar" precisam ficar à vista sem rolar). **Recomendado: (c).**
- **D-2 — Onde fica o componente:** (a) manter `components/KeyboardAwareScrollViewCompat.tsx` e o nome, só acrescentando os padrões (quatro telas já importam; o critério diz "a partir de"); (b) criar `src/components/shared/KeyboardScrollScreen.tsx` e apagar o Compat. **Recomendado: (a).**
- **D-3 — Folga no fim da rolagem:** (a) constante `SCROLL_BOTTOM_PADDING = 32` exportada pelo componente e usada pela tela (`insets.bottom + SCROLL_BOTTOM_PADDING` sem `SafeAreaView` de baixo; só a constante com ele); (b) o componente soma a folga e `insets.bottom` sozinho ao `contentContainerStyle` (prop `safeBottom`), com risco de somar o inset duas vezes nas telas com `SafeAreaView`. **Recomendado: (a).**

## Code Map

- `components/KeyboardAwareScrollViewCompat.tsx` -- componente padrão (padrões, limpeza na web)
- `app/add-transaction.tsx`, `app/ai-settings.tsx`, `app/backup.tsx`, `app/about.tsx` -- trocar o import direto pelo componente padrão
- `app/ocr-settings.tsx`, `app/sync.tsx`, `src/components/invoice/ParsedScreen.tsx`, `src/components/payslip/PayslipReview.tsx` -- tirar props repetidas, folga padrão, rodapé (D-1)
- `src/components/__tests__/keyboardScroll.test.ts` (novo) -- guarda estática
- `src/services/__tests__/noNativeAlert.test.ts` -- referência de estilo (leitura dos arquivos, `stripComments`)

## Tasks & Acceptance

**Execution:**
- [ ] Componente padrão com `KEYBOARD_BOTTOM_OFFSET`, `keyboardShouldPersistTaps="handled"`, folga (D-3) e props de teclado fora do `ScrollView` da web
- [ ] add-transaction, ai-settings, backup e about usam o componente padrão; `scrollRef` e `scrollEventThrottle` sem uso saem do about
- [ ] ocr-settings, sync, `ParsedScreen` e `PayslipReview` sem `bottomOffset`/`keyboardShouldPersistTaps` repetidos
- [ ] Botão principal de ocr-settings e `ParsedScreen` alcançável com o teclado aberto (D-1)
- [ ] Teste estático `keyboardScroll.test.ts`:
  - só `components/KeyboardAwareScrollViewCompat.tsx` importa `KeyboardAwareScrollView` de `react-native-keyboard-controller`;
  - uma lista fixa de telas com campo (as 8 da auditoria) importa e renderiza `KeyboardAwareScrollViewCompat` e não importa `ScrollView` de `react-native` (exceção nomeada: o modal do QR em `sync.tsx`);
  - descoberta: todo arquivo em `app/` que usa `TInput`/`TextInput`/`AppTextInput`/`onChangeText` ou importa um componente de `src/components` com campo e sem `Modal`/`KeyboardSafeView` está na lista ou numa lista de exceções com motivo (`ai-chat` → 13.5; `import-invoice` → via `ParsedScreen`/`QrScanScreen`);
  - nenhuma tela da lista passa `keyboardShouldPersistTaps` diferente de `"handled"`;
  - auto-teste com trechos de código que devem e não devem casar, como no `noNativeAlert.test.ts`.
- [ ] Conferir no build web com Playwright (ver Verification)
- [ ] Itens desta story na checklist da Story 13.7 (ver Verification)

**Acceptance Criteria:**
- Given o componente de rolagem padrão, when abro add-transaction, ai-settings, backup, about, ocr-settings, sync, a revisão da nota (`ParsedScreen`) ou a revisão do holerite, then a tela usa esse componente sem repetir `bottomOffset` nem `keyboardShouldPersistTaps`
- Given qualquer campo dessas telas focado, when o teclado abre, then o campo fica visível acima do teclado com a folga padrão, e o botão principal fica alcançável (rolando ou no rodapé que sobe, D-1)
- Given o teclado aberto, when toco num botão da tela, then o toque funciona na primeira vez
- Given o teclado aberto, when fecho o teclado, then a tela volta sem espaço sobrando
- Given uma tela com campo que importa `KeyboardAwareScrollView` direto ou usa `ScrollView` puro, when rodo `npx vitest run`, then o teste estático falha apontando o arquivo

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|

## Verification

**Comandos**
- `npx vitest run` e `npx tsc --noEmit`: sem falhas novas em relação ao baseline (o baseline da 13.1 fechou com os dois limpos)
- `npx expo export --platform web` com exit 0

**Web (Playwright, Chromium headless, 412×900, no build exportado)**
- Abrir `/add-transaction`, `/ai-settings`, `/backup`, `/about`, `/ocr-settings` e `/sync` sem erro de página.
- Em cada uma, focar o último campo, rolar até o botão principal e conferir que ele está visível e responde ao clique ("Salvar transação", "Salvar chave", "Exportar e compartilhar", "Enviar mensagem", "Salvar Configurações", "Entrar").
- A web não simula o teclado: isso prova a rolagem e o alcance do botão, não a subida. `ParsedScreen` e `PayslipReview` precisam de nota/holerite carregado e ficam só no aparelho.

**Aparelho (itens para a checklist da Story 13.7, Android 16)**
1. add-transaction: focar valor, descrição e "a cada N dias" (recorrência); o campo fica acima do teclado e "Salvar transação" é alcançável rolando.
2. ai-settings: focar a chave de API de cada provedor e os campos de orçamento; "Salvar chave" responde no 1º toque com o teclado aberto.
3. backup: focar as duas senhas da exportação e a senha da importação; "Exportar e compartilhar" e "Verificar e restaurar" alcançáveis.
4. about: escrever várias linhas no campo multiline do contato; o cursor fica acima do teclado e "Enviar mensagem" é alcançável.
5. ocr-settings: focar a chave do Cloud Vision; "Salvar Configurações" alcançável com o teclado aberto (D-1).
6. sync: tocar em "Entrar"; o código (`autoFocus`) e o botão ao lado ficam acima do teclado.
7. Importar nota, `ParsedScreen`: editar o último item, adicionar item e buscar conta; o total e "Importar" alcançáveis com o teclado aberto (D-1).
8. Holerite, revisão: focar o último campo; "Salvar holerite" alcançável.
9. Em todas: fechar o teclado não deixa faixa em branco; repetir em paisagem com navegação de 3 botões.

## Implementation Notes
