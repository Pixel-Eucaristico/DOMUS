---
title: 'Story 7.6: Categorias sem duplicar entre aparelhos'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_revision: '8a61ffb8ec4b6adc039f8513735a8e00ec82a1db'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-7-context.md'
  - '_bmad-output/implementation-artifacts/spec-7-5-recuperar-o-xp-uma-vez-so.md'
warnings: []
deferred:
  - 'Cobertura de testes unitários para hooks RN (useTransactionForm e useInvoiceConfirm): nenhum dos 37 hooks em src/hooks/ possui harness de teste no Vitest porque importam react-native/expo-router'
  - 'Divergência pré-existente de group em educacao (needs em src/constants/transactionCategories.ts vs savings em packages/domain/src/categories.ts)'
  - 'Colisões extremas de slug em entradas sem alfanuméricos (fallback categoria)'
---

<intent-contract>

## Intent

**Problem:** `createDefaultCategories()` (`packages/domain/src/categories.ts`) gera os eventos `CATEGORY_CREATED` das 13 categorias padrão com `id` aleatório (`generateId()`), e a criação sob demanda no formulário (`src/hooks/useTransactionForm.ts`) gera `id: generateId()` em vez de um identificador estável (o que também faz a categoria "Dízimo / Oferta" receber um `id` aleatório em vez de `"dizimo"`, impedindo que as conquistas e troféus de dízimo a reconheçam). Quando dois aparelhos criam as categorias padrão ou a mesma categoria (ex.: "Restaurantes"), o sync resulta em categorias duplicadas, e uma categoria padrão emitida tardiamente pode sobrescrever uma edição feita em outro aparelho.

**Approach:** Atribuir `id` determinístico `cats:default:{categoryId}` aos eventos de `createDefaultCategories()` e criar `categorySlug(name)` + `createCategoryByNameEvent({ id?, name, group }, deviceId)` em `packages/domain/src/categories.ts` usando slug estável do nome (ou `id` da categoria predefinida, preservando `"dizimo"` para "Dízimo / Oferta" e `"restaurantes"` para "Restaurantes") com `event.id = cats:custom:{catId}`. No `domainReducer` (`packages/domain/src/reducer.ts`), impedir que eventos `cats:default:*` sobrescrevam uma categoria já existente em `state.categories`. Atualizar `useTransactionForm.ts` e `useInvoiceConfirm.ts` para usar `createCategoryByNameEvent`.

## Boundaries & Constraints

**Always:**
- `createDefaultCategories()` gera `id: cats:default:{categoryId}` para cada categoria padrão, preservando timestamps monotonicamente crescentes (`<= Date.now()`) para manter a ordem de criação.
- `categorySlug(name)` normaliza acentos (`NFKD`), converte para minúsculas e gera slug estável `[a-z0-9-]+` (fallback `"categoria"` se vazio).
- `createCategoryByNameEvent({ id?, name, group }, deviceId)` usa `id` explícito quando informado (ou `categorySlug(name)` quando omitido) como `payload.id` e define `event.id = cats:custom:{payload.id}`.
- Em `domainReducer`, um `CATEGORY_CREATED` com `event.id` iniciando em `cats:default:` não sobrescreve `state.categories[cat.id]` se `cat.id` já existir em `state.categories`.
- `useTransactionForm.ts` e `useInvoiceConfirm.ts` passam a usar `createCategoryByNameEvent` ao criar categorias sob demanda, garantindo que "Dízimo / Oferta" receba `payload.id = "dizimo"` e seja reconhecida pelas conquistas de dízimo (`checkNewAchievements`).

**Never:**
- Não alterar `packages/sync` nem o mecanismo de dedup do `EventStore`.
- Não alterar a lista de categorias padrão em `createDefaultCategories()` nem os IDs das conquistas de dízimo (`first_dizimo`, `dizimo_3mo`, `monthly_dizimo`).
- Não usar `vi.mock("react-native")` nos testes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Categorias padrão em dois aparelhos | Aparelhos A e B chamam `createDefaultCategories()` e fazem `mergeImported` | Todos os eventos têm `id = cats:default:{cat.id}`; após merge existem exatamente 13 eventos `CATEGORY_CREATED` e 13 categorias no domínio | Sem erro |
| Categoria padrão não sobrescreve edição | Log tem edição (`CATEGORY_CREATED` não-default para `"alimentacao"` com nome/grupo alterado) antes de `cats:default:alimentacao` | `domainReducer` mantém a edição do outro aparelho intacta | Sem erro |
| Edição após categoria padrão | `cats:default:alimentacao` chega antes da edição não-default para `"alimentacao"` | Edição atualiza `state.categories["alimentacao"]` normalmente | Sem erro |
| Criação sob demanda em dois aparelhos | Aparelho A e B criam categoria "Restaurantes" via `createCategoryByNameEvent` e fazem `mergeImported` | Ambos geram `event.id = "cats:custom:restaurantes"` e `payload.id = "restaurantes"`; merge resulta em 1 só evento e 1 categoria "Restaurantes" | Sem erro |
| Conquista de dízimo com categoria do formulário | Categoria criada com `{ id: "dizimo", name: "Dízimo / Oferta", group: "wants" }` (ou nome `"Dízimo"`) + transação associada a esse `categoryId` | `payload.id === "dizimo"` e `checkNewAchievements` desbloqueia `first_dizimo` | Sem erro |
| Slug com acentos e pontuação | `categorySlug("Café & Pão!")` | `"cafe-pao"` (sem acentos, apenas `[a-z0-9-]`) | Fallback `"categoria"` para string vazia |

</intent-contract>

## Code Map

- `packages/domain/src/categories.ts` -- Definir `DEFAULT_CATEGORY_EVENT_ID_PREFIX`, `CUSTOM_CATEGORY_EVENT_ID_PREFIX`, `defaultCategoryEventId`, `categorySlug`, `createCategoryByNameEvent`; atualizar `createDefaultCategories()` para emitir `id: cats:default:{cat.id}`.
- `packages/domain/src/reducer.ts` -- No caso `EVENT_TYPES.CATEGORY_CREATED`, ignorar sobrescrita quando `event.id` começa com `cats:default:` e `hasOwn(state.categories, cat.id)`.
- `src/hooks/useTransactionForm.ts` -- Substituir `generateId()` + `createEvent(CATEGORY_CREATED, ...)` (linhas 264-270 e 285-291) por `createCategoryByNameEvent`.
- `src/hooks/useInvoiceConfirm.ts` -- Substituir `createEvent(CATEGORY_CREATED, ...)` (linhas 87-93) por `createCategoryByNameEvent`.
- `packages/domain/__tests__/categories.test.ts` -- Nova suíte de testes cobrindo toda a matriz de I/O (categorias padrão em dois aparelhos, não sobrescrever edição, slug estável, criação sob demanda em dois aparelhos e reconhecimento da conquista de dízimo).

## Tasks & Acceptance

**Execution:**
- `packages/domain/src/categories.ts` -- Atualizar `createDefaultCategories()` para `cats:default:{id}` e adicionar `categorySlug` e `createCategoryByNameEvent`.
- `packages/domain/src/reducer.ts` -- Proteger categorias já existentes contra sobrescrita por eventos `cats:default:*`.
- `src/hooks/useTransactionForm.ts` & `src/hooks/useInvoiceConfirm.ts` -- Usar `createCategoryByNameEvent` na criação sob demanda de categorias.
- `packages/domain/__tests__/categories.test.ts` -- Testar todos os cenários da matriz e integração com `checkNewAchievements` (`first_dizimo`).

**Acceptance Criteria:**
- Given dois aparelhos que criam as categorias padrão ou a mesma categoria sob demanda ("Restaurantes"), when os logs são sincronizados (`mergeImported`), then cada categoria aparece uma única vez.
- Given uma categoria editada em outro aparelho, when uma categoria padrão `cats:default:*` é reprocessada depois dela, then a edição não é sobrescrita.
- Given uma categoria "Dízimo / Oferta" criada pelo fluxo do formulário, when uma despesa é lançada nela, then a conquista `first_dizimo` a reconhece.

## Spec Change Log

- Adicionado suporte a `CUSTOM_CATEGORY_EVENT_ID_PREFIX` (`cats:custom:`) na guarda anti-sobrescrita de `CATEGORY_CREATED` em `packages/domain/src/reducer.ts` após triagem da revisão.
- Ajustada busca em `src/hooks/useTransactionForm.ts` para checar `domain.categories[id]` antes de `name` e evitar despachos duplicados no mesmo `handleSave`.

## Review Triage Log

Revisão paralela (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Intent Alignment Auditor) sobre o diff da Story 7.6:

- **[Corrigido — Média]** `domainReducer` só protegia `cats:default:*` contra sobrescrita de edição por evento tardio; adicionada proteção equivalente para `cats:custom:*` quando `hasOwn(state.categories, cat.id)` e teste correspondente em `packages/domain/__tests__/categories.test.ts`.
- **[Corrigido — Média]** `useTransactionForm.ts` buscava categoria existente apenas por `c.name === cat.name`; atualizado para priorizar `domain.categories[cat.id]` (preservando categorias renomeadas e diferenciando `outros`/`outros_rec`) e deduplicar despachos no mesmo `handleSave` com `createdCategoryIds`.
- **[Adiado — Média]** Cobertura de testes direta nos hooks `useTransactionForm` e `useInvoiceConfirm` (`src/hooks/` não possui harness de teste no Vitest devido ao import de `react-native`/`expo-router`).
- **[Adiado — Baixa/Pré-existente]** Divergência pré-existente do campo `group` para `"educacao"` entre `src/constants/transactionCategories.ts` e `packages/domain/src/categories.ts`; fallback `"categoria"` em strings sem caracteres alfanuméricos.

## Verification

- `rm -f expo-env.d.ts && npx eslint .`: 0 erros (12 warnings pré-existentes fora dos arquivos da story).
- `npx tsc --noEmit`: 0 erros.
- `npx vitest run --maxWorkers=2`: 122 arquivos / 2936 testes passando (incluindo 7 testes em `packages/domain/__tests__/categories.test.ts`).

## Auto Run Result

- Status: `done`
- Story 7.6 implementada, revisada, corrigida após triagem e verificada com suíte completa verde.

**Commands:**
- `npx vitest run packages/domain packages/events packages/gamification src/context src/modules` -- expected: todos os testes passam.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros.
- `npx eslint packages/domain/src/categories.ts packages/domain/src/reducer.ts src/hooks/useTransactionForm.ts src/hooks/useInvoiceConfirm.ts` -- expected: 0 erros e 0 warnings.
