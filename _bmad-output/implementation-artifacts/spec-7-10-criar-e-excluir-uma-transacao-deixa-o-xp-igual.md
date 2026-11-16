---
title: 'Story 7.10: Criar e excluir uma transação deixa o XP igual'
type: 'bugfix'
created: '2026-11-16'
status: 'done'
baseline_revision: '00c28c774f2f3f0db71c6c0b5cac0bf031adc62b'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      reversedTransactionIds mantém limite de 1000 IDs (slice(-999)) no gamificationReducer
    evidence: >-
      Segue o mesmo padrão de processedEventIds e processedTransactionIds; eventos replayed também são deduplicados por event.id em processedEventIds.
    location: >-
      packages/gamification/src/reducer.ts:87
    severity: low
  - summary: >-
      Conquistas permanentes (como first_transaction) desbloqueadas no mesmo evento não são revertidas na exclusão
    evidence: >-
      Escopo da Story 7.10 trata do XP concedido à transação (transaction_logged + bônus de orçamento), não de conquistas permanentes.
    location: >-
      src/modules/domainEventEffects.ts:186
    severity: medium
  - summary: >-
      useGamificationEffects e AppStateProvider não são exercitados diretamente no Vitest
    evidence: >-
      Hooks/contexto importam react-native/expo-router; lógica pura validada via computeDomainEventEffects e replayAllEvents.
    location: >-
      src/hooks/useGamificationEffects.ts:270
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Ao excluir uma transação (`TRANSACTION_DELETED`), `domainEventEffects` não desfaz o XP concedido pela criação daquela transação (e `gamificationReducer` bloqueia um segundo `XP_GAINED` com o mesmo `transactionId` via `processedTransactionIds`), permitindo ganho líquido de XP ao criar e apagar transações repetidamente.

**Approach:** Registrar `transactionId` em cada entrada de `xpHistory` no `gamificationReducer`, permitir no máximo um estorno negativo (`amount < 0`) por `transactionId` via `reversedTransactionIds`, e em `computeDomainEventEffects` emitir um `XP_GAINED` negativo com a soma exata paga àquela transação ao receber `TRANSACTION_DELETED` (mantendo o cálculo atual `0` quando não houver registro com `transactionId` para transações legadas).

## Boundaries & Constraints

**Always:**
- Manter exatamente a mesma fórmula de `calculateBudgetAdherenceXp(nextBudget, prevBudget)` e `getXpForAction("transaction_logged")` na criação.
- Garantir idempotência tanto para concessão positiva (`processedTransactionIds`) quanto para estorno negativo (`reversedTransactionIds`) por `transactionId`, e manter `totalXp` / `seasonXp` nunca negativos (`Math.max(0, ...)`).
- Preservar o comportamento atual (sem dedução de XP) na exclusão de transações cujo `xpHistory` não possui `transactionId` vinculado (transações legadas criadas antes desta mudança ou pendentes sem XP).
- Funcionar igualmente para lançamentos retroativos de meses anteriores.

**Never:**
- Alterar `packages/sync`, `ios/`, `android/` ou `replit.*`.
- Usar `vi.mock("react-native")` nos testes.
- Mudar a fórmula de bônus de orçamento (`calculateBudgetAdherenceXp`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Criar e excluir receita de R$ 3.000 num mês vazio (+10 XP) e repetir o ciclo | Cria receita `tx-1` (+10 XP), exclui `tx-1`, cria `tx-2` (+10 XP), exclui `tx-2` | Após cada exclusão, `totalXp` volta exatamente ao valor anterior; repetir não aumenta XP | Nenhum erro esperado |
| Criar, editar e excluir a mesma transação | Cria despesa `tx-1`, edita valor/descrição (`TRANSACTION_UPDATED`), depois exclui (`TRANSACTION_DELETED`) | Edição não concede XP extra; exclusão desfaz exatamente o XP pago na criação, voltando ao XP inicial | Nenhum erro esperado |
| Lançamento retroativo de mês anterior | Cria transação com `date` de mês anterior, depois exclui | Exclusão desfaz exatamente a soma registrada para aquele `transactionId`, deixando `totalXp` igual | Nenhum erro esperado |
| Transação legada sem `transactionId` no `xpHistory` | `xpHistory` contém `{ amount: 10, source: "transaction_logged", timestamp }` sem `transactionId`; exclui `tx-legacy` | Não emite estorno; `totalXp` permanece inalterado (cálculo atual preservado) | Nenhum erro esperado |
| Exclusão duplicada / replayed para o mesmo `transactionId` | `TRANSACTION_DELETED` ou evento de estorno `-10` aplicado duas vezes | `reversedTransactionIds` garante estorno único; `totalXp` nunca fica negativo | Nenhum erro esperado |

</intent-contract>

## Code Map

- `packages/gamification/src/types.ts` -- `GamificationState.xpHistory` (linha 158) e `GamificationState` (linhas 151-167): adicionar `transactionId?: string` nas entradas de `xpHistory` e `reversedTransactionIds?: string[]` em `GamificationState`.
- `packages/gamification/src/reducer.ts` -- `gamificationReducer` (linhas 49-90): separar idempotência de `amount >= 0` (`processedTransactionIds`) vs `amount < 0` (`reversedTransactionIds`), e gravar `transactionId` em `xpHistory`.
- `src/modules/domainEventEffects.ts` -- `computeDomainEventEffects` (linhas 160-208): ao receber `EVENT_TYPES.TRANSACTION_DELETED`, somar os `amount` de `currentGamification.xpHistory` com `entry.transactionId === event.payload.id`; se soma > 0, emitir `XP_GAINED` com `amount: -sum` e `transactionId: event.payload.id`, atualizando `estimatedNewTotalXp`.
- `src/modules/__tests__/domainEventEffects.test.ts` -- Testes de `computeDomainEventEffects`.
- `packages/gamification/__tests__/xpReversal.test.ts` -- Nova suíte dedicada cobrindo toda a matriz I/O (criar+excluir com receita R$ 3.000 e repetição, criar+editar+excluir, lançamento retroativo, legado sem `transactionId`, idempotência do estorno).

## Tasks & Acceptance

**Execution:**
- `packages/gamification/src/types.ts` e `packages/gamification/src/reducer.ts` -- Registrar `transactionId` em `xpHistory`, inicializar `reversedTransactionIds: []` em `createInitialGamificationState` e permitir um único estorno (`amount < 0`) por `transactionId` no `gamificationReducer` -- Permite rastrear e reverter exatamente o XP concedido a cada transação sem bloquear o estorno por `processedTransactionIds`.
- `src/modules/domainEventEffects.ts` -- No caso `EVENT_TYPES.TRANSACTION_DELETED`, somar `xpHistory` por `transactionId` e emitir `XP_GAINED` negativo quando a soma for positiva (sem alterar quando não houver `transactionId` registrado) -- Garante reversão exata do XP (incluindo bônus de orçamento) preservando legados.
- `packages/gamification/__tests__/xpReversal.test.ts` -- Criar testes unitários e de replay cobrindo criar+excluir (incluindo receita R$ 3.000 num mês vazio e ciclo repetido), criar+editar+excluir, lançamento retroativo de mês anterior, transação legada sem `transactionId` e estorno idempotente -- Cobre todos os ACs da Story 7.10 e a matriz I/O.

**Acceptance Criteria:**
- Given uma transação criada após esta mudança que concedeu `X` XP (5 base + bônus de orçamento), when ela é editada e/ou excluída, then o XP total retorna exatamente ao valor anterior à criação e repetir o ciclo não aumenta o XP.
- Given um lançamento retroativo de mês anterior, when é criado e depois excluído, then o XP total retorna exatamente ao valor anterior.
- Given uma transação legada cujo XP em `xpHistory` não possui `transactionId` de origem, when é excluída, then mantém o comportamento atual na exclusão (sem dedução).

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 7 findings — high 0, medium 4, low 3, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` Cota diária de XP em `domainEventEffects.ts` contava entradas negativas de estorno — corrigido com `entry.amount <= 0` no filtro de `todayXpEntries` e coberto em `xpReversal.test.ts`.
  - `[medium]` `[patch]` `monthlyValue` em `useSeasonData.ts` usava `Math.max(0, h.amount)` ignorando estornos negativos — corrigido para somar `h.amount` e aplicar `Math.max(0, ...)` no total mensal.
  - `[medium]` `[patch]` Falta guarda para `event.payload.id` truthy ao somar `xpHistory` em `domainEventEffects.ts` — adicionada verificação `const txId = event.payload.id`.
  - `[low]` `[defer]` Limite de 1000 IDs em `reversedTransactionIds` — consistente com `processedEventIds`/`processedTransactionIds`, registrado em `deferred`.
  - `[low]` `[reject]` `xpHistory` grava valor bruto quando `totalXp` clampa em `0` — `totalXp` e `seasonXp` já são protegidos por `Math.max(0, ...)`.
  - `[low]` `[patch]` Faltavam testes de cota diária com estorno e exclusão de pendente em `xpReversal.test.ts` — adicionado teste cobrindo 3 ciclos no mesmo dia + transação pendente excluída.
  - `[medium]` `[defer]` Assimetria com `ACHIEVEMENT_UNLOCKED` e wiring de UI/hooks — registrado em `deferred`.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint .`: 0 erros (12 warnings pré-existentes fora dos arquivos da story).
- `npx tsc --noEmit`: 0 erros.
- `npx vitest run --maxWorkers=2`: 126 arquivos / 2961 testes passando (incluindo 8 testes em `xpReversal.test.ts`).

## Auto Run Result

- **Resumo:** Cada concessão de XP por transação (`transaction_logged`) registra `transactionId` em `xpHistory`, e a exclusão (`TRANSACTION_DELETED`) emite um estorno único (`amount < 0`) com a soma exata paga àquela transação, mantendo a fórmula de bônus de orçamento e o comportamento atual (sem dedução) para transações legadas sem `transactionId`.
- **Arquivos alterados:**
  - `packages/gamification/src/types.ts` e `packages/gamification/src/reducer.ts` — `transactionId` em `xpHistory` e `reversedTransactionIds` para estorno idempotente.
  - `src/modules/domainEventEffects.ts` — estorno exato em `TRANSACTION_DELETED`, filtro `entry.amount > 0` na cota diária e guarda de `txId`.
  - `src/hooks/useSeasonData.ts` — soma líquida mensal com estornos negativos antes do clamp em `0`.
  - `packages/gamification/__tests__/xpReversal.test.ts` — 8 testes cobrindo criar+excluir repetido, criar+editar+excluir, lançamento retroativo, legado sem `transactionId`, exclusão duplicada, cota diária e transação pendente.
- **Triagem da revisão:** 4 patches aplicados, 3 itens em `deferred`, 1 rejeitado (`low`).
