---
title: 'Story 14.3: Corrigir contraste de botões bege e padronizar cor dos campos'
type: 'bugfix'
created: '2026-11-16'
status: 'done'
baseline_revision: '0e2071601c97ffcd940fb80c71d437f68a676e9b'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Testes de renderização em runtime para TButton, TInput e telas/componentes ajustados no tema escuro
    evidence: |-
      Vitest neste repositório não monta react-native/tamagui (AGENTS.md) e não há @testing-library/react-native.
    location: >-
      src/components/tamagui/TButton.tsx, src/components/tamagui/TInput.tsx, app/(tabs)/index.tsx, app/add-transaction.tsx, src/components/wishlist/AddItemModal.tsx, src/components/about/ContactForm.tsx, src/components/gamification/TrophyAlbumView.tsx, src/components/gamification/SurpriseTrophyCard.tsx
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Em temas escuros com `primaryColor` bege claro (ex.: `CATHOLIC_DARK_THEMES.explorer` `#C9B896`, `organizer` `#B8A888`, `DARK_THEMES.independent` `#D6D3D1`), vários componentes sobre `theme.primaryColor` fixam texto branco (`#FFF` / `rgba(255,255,255,0.7)`), tornando ilegíveis os cards da Home (`XP Total`, `Nível`, `Streak`, `Saldo total`), a tab selecionada de `Editar transação` e o botão `+ Adicionar à lista`; além disso, `TInput` recebe a prop errada `background=` (em vez de `backgroundColor=`) em *Fale Conosco*, *Editar transação* (`Valor (R$)`) e *Configurações de OCR*, exibindo o azul-marinho `#1E293B` do `tamagui.config.ts`, e o texto do `ÁLBUM 2026` na tela `Temporada` usa `theme.secondaryText` com `opacity={0.6}`/`0.7` sobre fundo escuro.

**Approach:** Criar utilitário puro de contraste WCAG em `packages/theme/src/contrast.ts` (`isLightColor`, `getContrastTextColor`, `getOnPrimaryTokens`), aplicá-lo nos cards da Home, na tab selecionada de `app/add-transaction.tsx`, em `TButton` e em `+ Adicionar à lista` (`AddItemModal.tsx`) / `ContactForm.tsx`, trocar `background=` por `backgroundColor=` nos `<TInput>` divergentes (`ContactForm.tsx`, `app/add-transaction.tsx`, `app/ocr-settings.tsx`), e remover a atenuação por `opacity` baixa no `ÁLBUM 2026` (`TrophyAlbumView.tsx` e `SurpriseTrophyCard.tsx`).

## Boundaries & Constraints

**Always:**
- Usar `getContrastTextColor` / `getOnPrimaryTokens` (derivado da luminância relativa WCAG) sempre que texto/ícone estiver sobre `theme.primaryColor`: retornar texto escuro de alto contraste (`#1A1814` e variações `rgba(26,24,20,...)`) para fundos claros/bege (`#C9B896`, `#B8A888`, `#D6D3D1`, etc.) e texto claro (`#FFFFFF`) para cores primárias escuras.
- Padronizar todos os `<TInput>` de `ContactForm.tsx` (`Nome`, `E-mail`, `Assunto`), `app/add-transaction.tsx` (`Valor (R$)`) e `app/ocr-settings.tsx` usando `backgroundColor=` (nunca `background=`) para respeitar a superfície do tema ativo sem vazar `#1E293B`.
- Aumentar a legibilidade do `ÁLBUM 2026` (`TrophyAlbumView.tsx`) e do texto explicativo em `SurpriseTrophyCard.tsx` no tema escuro removendo `opacity: 0.6` / `0.7` sobre `theme.secondaryText`.
- Manter o helper `contrast.ts` livre de `react-native` para ser testado diretamente no Vitest.

**Never:**
- Nunca usar `vi.mock("react-native")` no Vitest (`AGENTS.md`).
- Nunca quebrar o contraste branco de temas escuros/claros onde `primaryColor` é escuro (ex.: `#1A73E8`, `#2E7D32`, `#0D9488`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| `primaryColor` bege/claro (`CATHOLIC_DARK_THEMES` / `independent`) | `"#C9B896"`, `"#B8A888"`, `"#D6D3D1"`, `"#8AA0B0"` | `isLightColor` retorna `true`; `getContrastTextColor` retorna `"#1A1814"`; `getOnPrimaryTokens` retorna texto/ícones escuros | Sem erro |
| `primaryColor` escuro | `"#0D9488"`, `"#1E3A5F"`, `"#2E7D32"`, `"#6366F1"` | `isLightColor` retorna `false`; `getContrastTextColor` retorna `"#FFFFFF"` | Sem erro |
| Formato `#RGB` ou entrada inválida | `"#FFF"`, `"#000"`, `""`, `"invalid"` | `"#FFF"` -> `"#1A1814"`; `"#000"` -> `"#FFFFFF"`; inválido -> fallback `"#FFFFFF"` sem lançar erro | Fallback seguro |
| Campos de texto no tema escuro | `ContactForm.tsx`, `app/add-transaction.tsx`, `app/ocr-settings.tsx` | Usam `backgroundColor={theme.background}` ou `backgroundColor="transparent"`, sem `background=` ignorado pelo Tamagui | Sem erro |
| `ÁLBUM 2026` no tema escuro | `TrophyAlbumView.tsx` e `SurpriseTrophyCard.tsx` | Sem `opacity={0.6}`/`0.7` reduzindo contraste sobre `theme.secondaryText` | Sem erro |

</intent-contract>

## Code Map

- `packages/theme/index.ts`, `packages/theme/src/themeEngine.ts` -- Exportação de temas (`CATHOLIC_DARK_THEMES.explorer` `#C9B896`, `DARK_THEMES.independent` `#D6D3D1`, etc.).
- `app/(tabs)/index.tsx:370-394,422-431,671-699` -- Cards `statCard` (`XP Total`, `Nível`, `Streak`) e `balanceCard` (`Saldo total`) sobre `theme.primaryColor`.
- `app/add-transaction.tsx:144-172,186-202` -- Tab selecionada (`TX_TYPES`) com `#FFF` hardcoded e `<TInput background="transparent">` em `Valor (R$)`.
- `src/components/tamagui/TButton.tsx:23-37` -- `variant.primary` com `color: "#FFFFFF"` fixo; adaptar cor de texto quando `backgroundColor` hex claro é passado.
- `src/components/wishlist/AddItemModal.tsx:127-134` -- Botão `+ Adicionar à lista` com `backgroundColor={theme.primaryColor}` e ícone `#fff`.
- `src/components/about/ContactForm.tsx:117-135,206-218` -- Botão de envio sobre `theme.primaryColor` e `<TInput background={theme.background}>` em `Nome`, `E-mail`, `Assunto`.
- `app/ocr-settings.tsx:267` -- `<TInput background="transparent">`.
- `src/components/gamification/TrophyAlbumView.tsx:59-68` e `src/components/gamification/SurpriseTrophyCard.tsx:264-266,319` -- Texto `ÁLBUM 2026` e explicação com `opacity: 0.6` / `0.7`.

## Tasks & Acceptance

**Execution:**
- `packages/theme/src/contrast.ts` e `packages/theme/index.ts` -- Criar e exportar `isLightColor`, `getContrastTextColor` e `getOnPrimaryTokens` baseados em luminância relativa WCAG (`#1A1814` sobre fundos claros/bege e `#FFFFFF` sobre fundos escuros) -- Centraliza contraste acessível sem `react-native`.
- `src/components/tamagui/TButton.tsx` -- Quando `variant` for `"primary"` (ou undefined) e `backgroundColor` for string hex sem `color` explícito, aplicar `getContrastTextColor(backgroundColor)` automaticamente -- Corrige `+ Adicionar à lista` e demais botões primários temáticos.
- `app/(tabs)/index.tsx`, `app/add-transaction.tsx`, `src/components/wishlist/AddItemModal.tsx`, `src/components/about/ContactForm.tsx` -- Aplicar `getOnPrimaryTokens(theme.primaryColor)` nos cards `XP Total`, `Nível`, `Streak`, `Saldo total`, na tab selecionada de `Editar transação` e nos ícones/textos dos botões `+ Adicionar à lista` e `Enviar` -- Garante alto contraste em todos os temas bege/escuros.
- `src/components/about/ContactForm.tsx`, `app/add-transaction.tsx`, `app/ocr-settings.tsx` -- Trocar `background=` por `backgroundColor=` nos `<TInput>` (`backgroundColor={theme.background}` no `ContactForm.tsx` e `backgroundColor="transparent"` nos demais) -- Remove o fundo azul-marinho `#1E293B` divergente.
- `src/components/gamification/TrophyAlbumView.tsx` e `src/components/gamification/SurpriseTrophyCard.tsx` -- Remover `opacity={0.6}` de `ÁLBUM 2026` (usando `theme.textColor` ou `theme.secondaryText` sem atenuação) e elevar legibilidade do texto explicativo em `SurpriseTrophyCard.tsx` (removendo `opacity: 0.7` ou usando `theme.textColor` / `0.9`) -- Garante leitura confortável no tema escuro.
- `packages/theme/__tests__/contrast.test.ts` -- Testar `isLightColor`, `getContrastTextColor` e `getOnPrimaryTokens` contra todas as paletas de `themeEngine.ts` (incluindo `CATHOLIC_DARK_THEMES` e `DARK_THEMES`), e validar estruturalmente que `ContactForm.tsx`, `app/add-transaction.tsx` e `app/ocr-settings.tsx` usam `backgroundColor=` em `<TInput>` e que `TrophyAlbumView.tsx` não usa `opacity={0.6}` em `ÁLBUM` -- Cobre toda a matriz I/O no Vitest.

**Acceptance Criteria:**
- Given os cards bege claros da Home (`XP Total`, `Nível`, `Streak`, `Saldo total`), a tab selecionada de `Editar transação` e o botão `+ Adicionar à lista` no tema escuro com `primaryColor` bege, when renderizados, then texto e ícones usam cor escura de alto contraste derivada de `getOnPrimaryTokens`/`getContrastTextColor`.
- Given os campos `Nome`, `E-mail`, `Assunto` em *Fale Conosco* e `Valor (R$)` em *Editar transação*, when renderizados no tema escuro, then todos usam `backgroundColor=` do tema sem fundo `#1E293B` divergente.
- Given a tela `Temporada`, when `ÁLBUM 2026` e seu texto explicativo são exibidos no tema escuro, then não têm `opacity` reduzida (`0.6`/`0.7`) comprometendo o contraste.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 12 findings — high 0, medium 5, low 7, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` `TButtonBase` em `src/components/tamagui/TButton.tsx` passava `variant={undefined}`/`backgroundColor={undefined}`, ignorava `bg` e não adaptava ícones brancos sobre `primaryColor` claro — extraído `resolvePrimaryButtonTextColor` em `contrast.ts`, aplicado spread condicional e `React.cloneElement` em ícones `#fff`/`#ffffff` quando texto é `#1A1814`, além de atualizar `app/add-transaction.tsx:476`.
  - `[medium]` `[patch]` `parseHexRgb` em `packages/theme/src/contrast.ts` ignorava `#RGBA`, descartava alpha de `#RRGGBBAA` e usava limiar `0.25` acima de `0.198` — adicionados `#RGBA`, rejeição de alpha `< 128` e limiar `0.198`.
  - `[medium]` `[patch]` `TInput` (`src/components/tamagui/TInput.tsx`) permitia que `background=` caísse silenciosamente para `#1E293B` — envolvido em `TInputBase` mapeando `background` para `backgroundColor` quando indefinido.
  - `[low]` `[patch]` `packages/theme/__tests__/contrast.test.ts` não testava todas as paletas `DARK_THEMES`, `#RGBA`/`#FFFFFF33` nem `resolvePrimaryButtonTextColor` — adicionados todos os casos.
  - `[low]` `[reject]` `TButton` com `variant="danger"` — `theme.danger` é escuro; quando `backgroundColor` claro for usado, `primary` cobre os botões principais.
  - `[low]` `[reject]` `s.statValue`/`s.balanceValue` no `StyleSheet` de `app/(tabs)/index.tsx` — sobrescritos inline por `onPrimary.text`.
  - `[medium]` `[defer]` `TButton`, `TInput` e telas alteradas sem teste de renderização em runtime no Vitest — adiado por ausência de harness RN/Tamagui.
  - `[medium]` `[defer]` Divergência de superfície entre testes unitários/estáticos e renderização visual — coberta pelo item adiado acima.
  - `[low]` `[reject]` `app/add-transaction.tsx:476` e outros ícones brancos (mesma causa raiz do item 1) — corrigida via `TButtonBase` + `add-transaction.tsx:476`.
  - `[low]` `[reject]` `TInput` em outros arquivos — `TInputBase` agora protege todos os callers automaticamente.
  - `[low]` `[reject]` `TButton` `variant={undefined}` (mesma causa raiz do item 1) — corrigida.
  - `[low]` `[reject]` `contrast.ts` `#RGBA` (mesma causa raiz do item 2) — corrigida.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit` -- passou (`eslint`: 0 erros, 14 warnings pré-existentes; `tsc --noEmit`: 0 erros).
- `npx vitest run --maxWorkers=2` + `npx vitest run src/modules/security/__tests__/noSecretInAsyncStorage.test.ts` -- 143/143 arquivos e 3126/3126 testes passando (142/143 no run paralelo + `noSecretInAsyncStorage.test.ts` 53/53 isolado após timeout de 5000ms sob contenção).

## Auto Run Result

- **Summary:** Corrigido contraste de botões, tabs e cards sobre `primaryColor` bege/claro com utilitário WCAG (`packages/theme/src/contrast.ts`), padronizada a prop `backgroundColor` em `<TInput>` (com fallback defensivo em `TInput.tsx`) e removida a atenuação por opacidade baixa no `ÁLBUM 2026` da tela `Temporada`.
- **Files changed:**
  - `packages/theme/src/contrast.ts` e `packages/theme/index.ts` — `getRelativeLuminance`, `isLightColor` (limiar `0.198`, suporte a `#RGB`/`#RGBA`/`#RRGGBB`/`#RRGGBBAA` com alpha >= 128), `getContrastTextColor`, `getOnPrimaryTokens` e `resolvePrimaryButtonTextColor`.
  - `src/components/tamagui/TButton.tsx` — resolução automática de contraste em `TButtonBase` (inclusive `bg` e ícones `#fff` sobre fundo claro).
  - `src/components/tamagui/TInput.tsx` — `TInputBase` mapeando `background` para `backgroundColor`.
  - `app/(tabs)/index.tsx`, `app/add-transaction.tsx`, `src/components/wishlist/AddItemModal.tsx`, `src/components/about/ContactForm.tsx`, `app/ocr-settings.tsx` — uso de `onPrimary` / `getContrastTextColor` e `backgroundColor=`.
  - `src/components/gamification/TrophyAlbumView.tsx` e `src/components/gamification/SurpriseTrophyCard.tsx` — remoção de `opacity` baixa no `ÁLBUM 2026` e texto explicativo.
  - `packages/theme/__tests__/contrast.test.ts` — 7 testes cobrindo paletas, `#RGBA`/transparência, `resolvePrimaryButtonTextColor` e validações estruturais.
- **Review breakdown:** 4 itens corrigidos por patch (3 `medium`, 1 `low`), 2 adiados (`medium` agrupados em renderização RN/Tamagui), 6 rejeitados (`low`).
- **Follow-up review recommendation:** `true` (3 entradas `medium` corrigidas por patch; risco residual: renderização visual RN/Tamagui não montada no Vitest).
- **Verification:** `eslint` (0 erros), `tsc --noEmit` (0 erros), `vitest` (142/143 no run paralelo + `noSecretInAsyncStorage.test.ts` 53/53 isolado).
