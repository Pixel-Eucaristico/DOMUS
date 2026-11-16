---
title: 'Story 14.2: Evitar sobreposição de botões e colisões nas listas'
type: 'bugfix'
created: '2026-11-16'
status: 'done'
baseline_revision: '6fdf645171b782c9e536e4214b8019773f331288'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Testes de renderização e geometria em runtime para HomeScreen, TransactionsScreen, RecentTransactionsList e GamificationWidget
    evidence: |-
      Vitest neste repositório não carrega react-native (AGENTS.md) e não há @testing-library/react-native.
    location: >-
      app/(tabs)/index.tsx:307, app/transactions.tsx:308-321, src/components/transaction/RecentTransactionsList.tsx:113, src/components/gamification/GamificationWidget.tsx:69-77
    severity: medium
  - summary: >-
      Adotar formatDatePtBr em transactions-by-category/[categoryId].tsx e NotificationScheduler.ts
    evidence: |-
      Fora do escopo da Story 14.2 (RecentTransactionsList e app/transactions.tsx); ambos ainda formatam tx.date inline.
    location: >-
      app/transactions-by-category/[categoryId].tsx:111, src/modules/notifications/application/NotificationScheduler.ts:324
    severity: low
  - summary: >-
      Evitar sobreposição do HomeFab sobre Cobranças pendentes no meio da viewport antes de rolar até o fim
    evidence: |-
      paddingBottom +164 garante que o usuário role acima do FAB, mas enquanto PendingTransactionsList passa pela faixa inferior direita o FAB continua flutuando por cima.
    location: >-
      app/(tabs)/index.tsx:307,590-594
    severity: low
---

<intent-contract>

## Intent

**Problem:** Quatro colisões visuais afetam as listas e telas principais: (1) em `app/transactions.tsx`, `txMain` não tem `minWidth: 0`, `txSub` não quebra linha e `txRight` não tem `flexShrink: 0`, permitindo que textos longos invadam o botão `Efetivar`; (2) na Home (`app/(tabs)/index.tsx`), `paddingBottom` de `insets.bottom + webBottomInset + 100` é menor que o topo do `HomeFab` (`+ 140`), cobrindo o valor/confirmar de `Cobranças pendentes` e a última linha de `Últimas transações`; (3) `RecentTransactionsList.tsx` exibe `tx.date` bruto em `YYYY-MM-DD`; e (4) `GamificationWidget.tsx` fixa `width: 42` + `numberOfLines={1}` nos troféus de `Minha Jornada`, cortando a primeira palavra no meio.

**Approach:** Corrigir os layouts flex (`minWidth: 0`, `flexWrap: "wrap"`, `flexShrink: 0`) em `app/transactions.tsx`, aumentar `paddingBottom` da `ScrollView` da Home para `insets.bottom + webBottomInset + 164` (acima do topo do FAB em `+ 140`), criar o helper puro `src/utils/formatDate.ts` (`formatDatePtBr`) para exibir datas `DD/MM/AAAA` em `RecentTransactionsList.tsx` e `app/transactions.tsx`, e remover `width: 42` em `GamificationWidget.tsx` usando `flex: 1, minWidth: 0` e `numberOfLines={2}`.

## Boundaries & Constraints

**Always:**
- Em `app/transactions.tsx`, `txMain` deve ter `minWidth: 0`, `txSub` deve permitir quebra (`flexWrap: "wrap"`), os textos filhos devem encolher (`flexShrink: 1`), e `txRight` (valor + botão `Efetivar`) deve ter `flexShrink: 0`.
- Em `app/(tabs)/index.tsx`, `paddingBottom` do `ScrollView` deve superar o topo do `HomeFab` (`80 + 60 = 140`) com folga (`insets.bottom + webBottomInset + 164`).
- Em `RecentTransactionsList.tsx`, toda data `YYYY-MM-DD` deve ser formatada para pt-BR (`DD/MM/AAAA`) via `formatDatePtBr`.
- Em `GamificationWidget.tsx` (`Minha Jornada`), os rótulos das conquistas recentes não devem usar largura fixa de `42px` nem cortar na primeira palavra (`flex: 1, minWidth: 0`, `numberOfLines={2}`).

**Never:**
- Nunca usar `vi.mock("react-native")` no Vitest (`AGENTS.md`).
- Nunca alterar fuso horário ao formatar datas `YYYY-MM-DD` (usar parse textual direto para evitar deslocamento de dia).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Data ISO padrão | `formatDatePtBr("2026-11-16")` | `"16/11/2026"` | Sem erro |
| Data já formatada ou vazia/inválida | `formatDatePtBr("16/11/2026")`, `""`, `"invalida"` | Retorna `"16/11/2026"`, `""`, `"invalida"` sem lançar erro | Fallback seguro |
| Data ISO com horário | `formatDatePtBr("2026-11-16T14:30:00Z")` | `"16/11/2026"` | Sem erro |
| Rolagem acima do FAB na Home | `HomeFab` em `bottom: +80` + altura `60` (`+140`) | `ScrollView` `paddingBottom` (`+164`) > `+140` | Sem erro |
| Layout de linha pendente e `Minha Jornada` | `txMain`/`txSub`/`txRight` em `app/transactions.tsx` e troféus em `GamificationWidget.tsx` | `minWidth: 0`, `flexWrap: "wrap"`, `flexShrink: 0` aplicados; sem `width: 42` em `GamificationWidget.tsx` | Sem erro |

</intent-contract>

## Code Map

- `app/transactions.tsx:268-339,410-453` -- `txRow`, `txMain`, `txSub`, `txRight`, `efetivarBtn` e formatação inline de data na linha 318.
- `app/(tabs)/index.tsx:295-301,590-594` -- `ScrollView` `paddingBottom: insets.bottom + webBottomInset + 100` e `<HomeFab bottom={insets.bottom + webBottomInset + 80} />` (`60px` de altura em `src/components/shared/HomeFab.tsx:246-263`).
- `src/components/transaction/RecentTransactionsList.tsx:111-113` -- Renderização de `tx.date` em `Últimas transações`.
- `src/components/gamification/GamificationWidget.tsx:72-95,149-160` -- `recentAchsColumn`, `achsRow` e `<Text style={{ ..., width: 42 }} numberOfLines={1}>`.

## Tasks & Acceptance

**Execution:**
- `src/utils/formatDate.ts` -- Criar módulo puro (sem `react-native`) com `formatDatePtBr(dateStr: string): string` que converte `YYYY-MM-DD` (ou prefixo ISO `YYYY-MM-DDT...`) em `DD/MM/AAAA` sem depender de fuso horário, mantendo fallback seguro para entradas vazias ou inválidas -- Centraliza formatação pt-BR testável no Vitest.
- `src/components/transaction/RecentTransactionsList.tsx` e `app/transactions.tsx` -- Usar `formatDatePtBr(tx.date)` em `RecentTransactionsList.tsx:111-113` e `app/transactions.tsx:318`; em `app/transactions.tsx`, adicionar `minWidth: 0` em `txMain`, `flexWrap: "wrap"`, `columnGap: 4`, `rowGap: 2` em `txSub` (com `flexShrink={1}` nos `<TText>` filhos), e `flexShrink: 0` em `txRight` -- Impede colisão de textos longos com o botão `Efetivar` e exibe datas em pt-BR.
- `app/(tabs)/index.tsx` -- Aumentar `paddingBottom` do `ScrollView` de `insets.bottom + webBottomInset + 100` para `insets.bottom + webBottomInset + 164` -- Garante que `Cobranças pendentes` e a última linha de `Últimas transações` possam rolar completamente acima do `HomeFab` (`+140`).
- `src/components/gamification/GamificationWidget.tsx` -- Substituir o container fixo de cada conquista por `style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 2 }}` e o `<Text>` por `style={{ fontSize: 9, lineHeight: 12, color: theme.secondaryText, textAlign: "center" }}` com `numberOfLines={2}` (removendo `width: 42`) -- Evita corte no meio da primeira palavra das conquistas em `Minha Jornada`.
- `src/utils/__tests__/formatDate.test.ts` -- Testar `formatDatePtBr` para toda a matriz I/O e validar estruturalmente os ajustes de colisão/FAB/datas/`Minha Jornada` nos 4 arquivos alterados -- Garante regressão zero sem `vi.mock("react-native")`.

**Acceptance Criteria:**
- Given a tela `app/transactions.tsx` com transação pendente de conta/transferência longa, when a linha exibe conta de origem, destino, data e o botão `Efetivar`, then o texto quebra ou encolhe dentro de `txMain` sem invadir `txRight`/`Efetivar`.
- Given a tela Início (`app/(tabs)/index.tsx`), when o usuário rola até o fim da lista, then `paddingBottom` libera espaço acima do `HomeFab` para que `Cobranças pendentes` e a última linha de `Últimas transações` fiquem visíveis sem cobertura.
- Given `RecentTransactionsList.tsx` e `GamificationWidget.tsx`, when exibidos na Home, then `Últimas transações` mostra datas `DD/MM/AAAA` e as conquistas de `Minha Jornada` não cortam no meio da primeira palavra.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 10 findings — high 0, medium 3, low 7, false 0, maybe-false 0
- findings:
  - `[low]` `[patch]` `formatDatePtBr` aceitava strings não-string, ignorava `YYYY-MM-DD HH:MM:SS` e formatava datas inválidas como `"2026-02-30"` — adicionada guarda `typeof !== "string"`, regex `(?:[T\s].*)?` e validação `Date.UTC` em `src/utils/formatDate.ts` + testes em `src/utils/__tests__/formatDate.test.ts`.
  - `[medium]` `[patch]` `RecentTransactionsList.tsx` não tinha `minWidth: 0` em `txInfo`, `flexWrap: "wrap"` em `txDescRow`, `flexShrink={1}` na descrição nem `flexShrink={0}` no valor — aplicados todos em `src/components/transaction/RecentTransactionsList.tsx`.
  - `[low]` `[patch]` `app/transactions.tsx:310-316` repetia `acc?.name` em transferências com `!accountId` e tinha espaço extra após `•` — protegido com `!accountId && tx.type !== "transfer"` e removido o espaço final.
  - `[low]` `[reject]` `tx.returnDate` na linha 304 usa formato curto `DD/MM` intencionalmente no badge de retorno.
  - `[low]` `[reject]` `formatDatePtBr` casos de borda (mesma causa raiz do item 1) — corrigida.
  - `[low]` `[reject]` Testes estáticos via `fs.readFileSync` — padrão adotado no repo sem `vi.mock("react-native")`.
  - `[low]` `[patch]` `recentAchsColumn` em `GamificationWidget.tsx:149` sem `minWidth: 0` — adicionado `minWidth: 0`.
  - `[medium]` `[defer]` Testes de renderização em runtime para as telas/componentes alterados — adiado por ausência de harness RN no Vitest.
  - `[low]` `[defer]` `transactions-by-category/[categoryId].tsx` e `NotificationScheduler.ts` ainda formatam data inline — adiados (fora do escopo da Story 14.2).
  - `[medium]` `[defer]` Divergência de superfície (runtime RN vs verificação estática) e sobreposição no meio da viewport do `HomeFab` antes da rolagem final — adiados.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit && npx vitest run --maxWorkers=2` -- passou após os ajustes finais (`eslint`: 0 erros, 14 warnings; `tsc --noEmit`: 0 erros; `vitest`: 142 arquivos, 3119 testes passando).

## Auto Run Result

- **Summary:** Corrigidas as colisões de layout em `app/transactions.tsx` (linha pendente / `Efetivar`), `RecentTransactionsList.tsx`, `app/(tabs)/index.tsx` (folga de `paddingBottom` acima do `HomeFab`) e `GamificationWidget.tsx` (`Minha Jornada` sem `width: 42`), além de padronizar datas em pt-BR (`DD/MM/AAAA`) via `formatDatePtBr`.
- **Files changed:**
  - `src/utils/formatDate.ts` — helper puro `formatDatePtBr` com validação `Date.UTC` e suporte a `YYYY-MM-DD` / ISO / espaço.
  - `src/components/transaction/RecentTransactionsList.tsx` — uso de `formatDatePtBr(tx.date)` e guardas flex (`minWidth: 0`, `flexWrap: "wrap"`, `flexShrink`).
  - `app/transactions.tsx` — uso de `formatDatePtBr(tx.date)`, guardas `minWidth: 0`/`flexWrap: "wrap"`/`flexShrink` contra invasão de `Efetivar` e remoção de duplicação de conta em transferências.
  - `app/(tabs)/index.tsx` — `paddingBottom: insets.bottom + webBottomInset + 164` para rolar acima do `HomeFab`.
  - `src/components/gamification/GamificationWidget.tsx` — `recentAchsColumn` com `minWidth: 0`, itens com `flex: 1, minWidth: 0` e rótulo com `numberOfLines={2}` sem `width: 42`.
  - `src/utils/__tests__/formatDate.test.ts` — 8 testes cobrindo `formatDatePtBr`, casos de borda e verificação estrutural dos 4 arquivos.
- **Review breakdown:** 4 itens corrigidos por patch (1 `medium`, 3 `low`), 3 adiados (`medium`/`low`), 3 rejeitados (`low`).
- **Follow-up review recommendation:** `false` (apenas 1 entrada `medium` corrigida por patch).
- **Verification:** `eslint` (0 erros), `tsc --noEmit` (0 erros) e `vitest run --maxWorkers=2` (142 arquivos, 3119 testes passando).
