---
title: 'Story 14.4: Corrigir textos, grade de urgência e fluxo do modal de Desejos'
type: 'bugfix'
created: '2026-11-17'
status: 'done'
baseline_revision: '801e49b6e7902405141d5e04dc8652c31ed04e15'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Na tela de detalhes da Lista de Desejos (`app/wishlist/[listId].tsx`), o botão de lixeira no cabeçalho fica sempre habilitado mesmo quando a lista tem `0` itens (e o título não tem fallback `"Desejos"` caso vazio); além disso, no modal `Adicionar Item` (`src/components/wishlist/AddItemModal.tsx`), o placeholder de link (`"Cole o link ou use a lupa para pesquisar"`) é cortado pela largura disponível, os 4 chips de `URGÊNCIA` quebram deixando `"Futuro"` sozinho na 2ª linha, e `footerVisible={isValid}` oculta o botão `"Adicionar à lista"` quando o nome está vazio, deixando `"Cancelar"` como botão principal visível.

**Approach:** Desabilitar o botão de lixeira em `app/wishlist/[listId].tsx` quando `rawItems.length === 0` (com fallback `"Desejos"` no título e contraste WCAG no `+`), e ajustar `src/components/wishlist/AddItemModal.tsx` para usar placeholder curto (`"Cole o link ou toque na lupa"`), grade simétrica 2×2 nos 4 chips de urgência e rodapé sempre visível com `"Adicionar à lista"` desabilitado (`disabled={!isValid}`) enquanto o nome for inválido.

## Boundaries & Constraints

**Always:**
- Em `app/wishlist/[listId].tsx`, o botão de lixeira (`trash-2`) deve ficar desabilitado (`disabled={isWishlistTrashDisabled(rawItems.length)}`) e visualmente atenuado (`opacity: 0.35`, `theme.secondaryText`) quando `rawItems.length === 0`.
- O título da tela de Desejos não deve conter `"Dedejo"` em nenhum arquivo de código e deve ter fallback `"Desejos"` em `app/wishlist/[listId].tsx`.
- Em `src/components/wishlist/AddItemModal.tsx`:
  - O placeholder do campo de link deve ser conciso (`"Cole o link ou toque na lupa"`) com `fontSize={13}` e `paddingHorizontal={12}` para aparecer completo sem corte.
  - Os 4 chips de `URGÊNCIA` (`Prioridade`, `Essencial`, `Planejado`, `Futuro`) devem formar uma grade simétrica 2×2 (`flexBasis: "48%"`, `flexGrow: 1`) sem chip órfão na 2ª linha.
  - O botão principal do `footer` (`"Adicionar à lista"` / `"Salvar alterações"`) deve permanecer sempre visível (`footerVisible` ativo) e ficar `disabled={!isValid}` (opacidade `0.45`) quando o nome estiver vazio/inválido, em vez de sumir e exibir `"Cancelar"` no lugar.

**Never:**
- Nunca usar `vi.mock("react-native")` no Vitest (`AGENTS.md`).
- Nunca manter `"Dedejo"` no código-fonte.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lixeira com 0 itens | `isWishlistTrashDisabled(0)` | Retorna `true`; botão `trash-2` em `app/wishlist/[listId].tsx` fica `disabled` | Sem erro |
| Lixeira com itens | `isWishlistTrashDisabled(3)` | Retorna `false`; botão `trash-2` habilitado | Sem erro |
| Placeholder de link | `WISHLIST_LINK_PLACEHOLDER` | `"Cole o link ou toque na lupa"` (`<= 30` chars) | Sem erro |
| Validação de nome | `isWishlistItemValid("")`, `"a"`, `"  ab  "` | `false`, `false`, `true`; em `AddItemModal.tsx`, footer fica visível e botão fica `disabled={!isValid}` | Sem erro |
| Grade 2×2 de urgência | 4 itens em `URGENCY_ORDER` | `urgencyChip` com `flexBasis: "48%"`, `flexGrow: 1` (2 colunas × 2 linhas simétricas) | Sem erro |

</intent-contract>

## Code Map

- `app/wishlist/[listId].tsx:57,237-256` -- `rawItems`, cabeçalho `{list.name}`, `deleteBtn` (`trash-2`) e `addBtn` (`+`).
- `src/components/wishlist/AddItemModal.tsx:125-135,141-173,196-213,442-450,515-535` -- `footerVisible={isValid}`, `<TInput>` do link, `urgencyRow`/`urgencyChip`, botão `Cancelar`.
- `src/hooks/useAddWishlistItem.ts:133,212` -- `isValid = form.name.trim().length >= 2` (somente leitura; já protege `handleConfirm`).

## Tasks & Acceptance

**Execution:**
- `src/modules/wishlist/wishlistUiHelpers.ts` -- Criar módulo puro (sem `react-native`) exportando `WISHLIST_LINK_PLACEHOLDER = "Cole o link ou toque na lupa"`, `isWishlistTrashDisabled(itemCount: number): boolean` e `isWishlistItemValid(name: string): boolean` -- Permite testar regras da Story 14.4 diretamente no Vitest.
- `app/wishlist/[listId].tsx` -- Usar `isWishlistTrashDisabled(rawItems.length)` para desabilitar e atenuar o botão `trash-2` quando houver `0` itens, usar `{list.name || "Desejos"}` no título, e aplicar `getContrastTextColor(theme.primaryColor)` no ícone `+` de `addBtn` -- Atende aos ACs da tela de Desejos.
- `src/components/wishlist/AddItemModal.tsx` -- Usar `WISHLIST_LINK_PLACEHOLDER` com `fontSize={13}` e `paddingHorizontal={12}` no campo de link; alterar `s.urgencyRow`/`s.urgencyChip` para grade simétrica 2×2 (`flexBasis: "48%"`, `flexGrow: 1`, centralizado); remover `footerVisible={isValid}` mantendo o `footer` sempre visível com `disabled={!isValid}` e `opacity={isValid ? 1 : 0.45}` no `<TButton>` principal -- Corrige corte do placeholder, chip `Futuro` órfão e desaparecimento de `"Adicionar à lista"`.
- `src/modules/wishlist/__tests__/wishlistUiHelpers.test.ts` -- Testar toda a matriz I/O (`isWishlistTrashDisabled`, `isWishlistItemValid`, `WISHLIST_LINK_PLACEHOLDER`), confirmar ausência de `"Dedejo"` em `app/`/`src/`/`packages/`, e validar estruturalmente `AddItemModal.tsx` e `app/wishlist/[listId].tsx` -- Garante regressão zero sem `vi.mock("react-native")`.

**Acceptance Criteria:**
- Given `app/wishlist/[listId].tsx` aberta com 0 itens, when o usuário vê o cabeçalho, then o título exibe o nome da lista (fallback `"Desejos"`, sem `"Dedejo"`) e o ícone de lixeira está desabilitado.
- Given `AddItemModal.tsx` aberto, when o usuário vê o campo de link, os chips de urgência e o botão principal com o nome vazio, then o placeholder cabe sem corte, os 4 chips formam uma grade simétrica 2×2 e o botão `"Adicionar à lista"` permanece visível e desabilitado em vez de ser substituído por `"Cancelar"`.

## Spec Change Log
- `src/hooks/useAddWishlistItem.ts` — Atualizado `isValid` para reutilizar `isWishlistItemValid(form.name)` de `src/modules/wishlist/wishlistUiHelpers.ts`, mantendo a regra de validação única entre o hook e os testes.
- `src/modules/wishlist/wishlistUiHelpers.ts` — Adicionado `getWishlistDisplayTitle` (com trim e fallback `"Desejos"`) e guardas de `Number.isFinite` / `typeof name === "string"` conforme triagem do code review.

## Review Triage Log
- **Intent Alignment Auditor:** `No findings.`
- **Blind Hunter (3 low):**
  - `[fixed]` Adicionados `accessibilityRole="button"`, `accessibilityLabel`, `accessibilityState={{ disabled: trashDisabled }}` em `app/wishlist/[listId].tsx` e extraída variável `trashDisabled`.
  - `[fixed]` Aplicado `{displayTitle}` (`getWishlistDisplayTitle(list.name)`) também na descrição de `ConfirmDeleteModal` em `app/wishlist/[listId].tsx`.
  - `[noted]` Asserções de leitura de arquivo mantidas apenas como checagem mínima estrutural por restrição do Vitest com `react-native` (`AGENTS.md`).
- **Edge Case Hunter (1 medium, 3 low):**
  - `[fixed]` `isWishlistTrashDisabled` agora trata `NaN`/`Infinity` via `!Number.isFinite(itemCount) || itemCount <= 0`.
  - `[fixed]` `isWishlistItemValid` agora verifica `typeof name === "string"`.
  - `[fixed]` Adicionado `getWishlistDisplayTitle` com `.trim()` e fallback `"Desejos"`.
  - `[fixed]` Adicionado `numberOfLines={1}` no `<Text>` dos chips de urgência em `AddItemModal.tsx`.
- **Verification Gap (2 medium, 1 low):**
  - `[fixed]` Adicionados testes unitários para `NaN`/`Infinity`, guarda de tipo e `getWishlistDisplayTitle` com espaços em branco.
  - `[dismissed]` Execução direta de `useAddWishlistItem` em Vitest: o hook importa `react-native` (`Animated`, `Platform`), e `vi.mock("react-native")` é proibido por `AGENTS.md`; a validação é exercida pelo helper puro `isWishlistItemValid`.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit` -- **PASS** (0 erros no `eslint`, 14 warnings pré-existentes fora dos arquivos alterados; 0 erros no `tsc --noEmit`).
- `npx vitest run src/modules/wishlist/__tests__/wishlistUiHelpers.test.ts` -- **PASS** (7/7 testes passando).
- `npx vitest run --maxWorkers=2` -- **PASS** (144/144 arquivos de teste, 3133/3133 testes passando).

## Auto Run Result
- **Status:** `done`
- **Review loop iterations:** `1`
- **Follow-up review recommended:** `false`
