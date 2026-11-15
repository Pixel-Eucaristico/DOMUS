---
title: 'Story 7.7: Emitir cada conquista uma vez num parcelamento'
type: 'bugfix'
created: '2026-11-15'
status: 'done'
baseline_revision: '1e4bc874d225f28c540b2c037ee85df75ba27e3d'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Modo demo (useLogEvents: false) ainda lê fallbackDomain/fallbackGamification da closure em laços síncronos
    evidence: >-
      Em useEventStore.ts, isDemoActive delega para dispatchDemoEvent sem atualizar allEventsRef.current; corrigir exigiria ref de estado demo no AppStateProvider.
    location: >-
      src/hooks/useGamificationEffects.ts:279
    severity: medium
  - summary: >-
      Wiring de useGamificationEffects.ts não é exercitado diretamente no Vitest
    evidence: >-
      Nenhum hook em src/hooks/ possui harness no Vitest porque importam react-native/expo-router; lógica pura testada via src/modules/domainEventEffects.ts.
    location: >-
      src/hooks/useGamificationEffects.ts:260
    severity: medium
  - summary: >-
      Toasts múltiplos no mesmo ciclo sobrescrevem estado single-slot e monthlyToasts usa setPendingToast
    evidence: >-
      Comportamento pré-existente em useToastState.ts e useGamificationEffects.ts.
    location: >-
      src/hooks/useGamificationEffects.ts:300
    severity: low
  - summary: >-
      checkNewMonthlyTrophies usa Date() do relógio em vez do parâmetro now
    evidence: >-
      Assinatura pré-existente em packages/gamification/src/achievements.
    location: >-
      src/modules/domainEventEffects.ts:292
    severity: low
---

<intent-contract>

## Intent

**Problem:** Em `src/hooks/useGamificationEffects.ts`, `dispatchDomainEvent` lê `domain` e `gamification` da closure do render do React. Quando `useTransactionForm` despacha várias parcelas ou ocorrências num mesmo laço síncrono antes do próximo render, cada iteração enxerga o mesmo snapshot inicial, repetindo conquistas, troféus mensais e ignorando a cota diária/bônus acumulados de XP.

**Approach:** Extrair o cálculo dos efeitos colaterais de `dispatchDomainEvent` para um módulo puro em `src/modules/domainEventEffects.ts` (sem `react-native`) que, fora do modo demo, reconstrói `domain` e `gamification` via `replayAllEvents(allEventsRef.current)` após o `dispatch` do evento de domínio — enxergando todos os eventos recém-enfileirados no mesmo ciclo.

## Boundaries & Constraints

**Always:**
- Manter `src/modules/domainEventEffects.ts` livre de imports de `react-native`, `expo-*` ou hooks React para permitir testes unitários diretos no Vitest.
- Preservar o comportamento no modo demo (`isDemoActive === true`), usando `domain` e `gamification` de fallback quando `allEventsRef.current` não reflete o estado demo.
- Para `TRANSACTION_UPDATED`, capturar o estado anterior da transação (`existing`) antes de despachar o evento no log para que `transactionRewardEligibility` detecte corretamente a transição `pending -> confirmed`.
- Manter exatamente as mesmas regras de XP (`transactionRewardEligibility`, cota diária de 5 `transaction_logged`, `calculateBudgetAdherenceXp`), streak, level-up, conquistas e troféus mensais.

**Never:**
- Alterar `packages/sync`, `ios/`, `android/` ou `replit.*`.
- Usar `vi.mock("react-native")` nos testes.
- Alterar a lógica de derivação de nível ou streak (escopo das Stories 7.8 e 7.9).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Parcelamento 12x no mesmo ciclo | `createTransactionEvent({ ..., installments: 12 })` despachado em laço síncrono sobre log com conta inicial | Cada conquista (`first_expense`, `ten_transactions`, etc.) e troféu mensal é emitido uma única vez; `totalXp` final igual ao de lançar as 12 parcelas separadamente (respeitando cota diária de 5 e bônus acumulado) | Nenhum erro esperado |
| Recorrência em sequência no mesmo ciclo | Múltiplas transações recorrentes (`recurrence: "monthly"`) despachadas em laço síncrono no mesmo ciclo | Conquistas emitidas uma única vez e `totalXp` idêntico ao despacho separado | Nenhum erro esperado |
| Transição `pending -> confirmed` via `TRANSACTION_UPDATED` | Transação pendente no log atualizada para `status: "confirmed"` | `existing` pré-dispatch tem `status: "pending"`, concedendo XP e streak na confirmação | Nenhum erro esperado |
| Modo demo (`isDemoActive: true`) | `useLogEvents: false` com `fallbackDomain` / `fallbackGamification` | Calcula efeitos sobre `fallbackDomain` + evento aplicado, sem depender de `allEventsRef` | Nenhum erro esperado |
| Evento não-local (`deviceId` de outro aparelho) | `event.deviceId !== "local" && event.deviceId !== deviceId` | Apenas grava o evento no log; não emite efeitos de gamificação | Nenhum erro esperado |

</intent-contract>

## Code Map

- `src/hooks/useGamificationEffects.ts` -- Hook que expõe `dispatchDomainEvent` (linhas 270-456); já recebe `allEventsRef` (linha 54) e `dispatch` (linha 50).
- `src/hooks/useEventStore.ts` -- `dispatch` (linhas 166-200) chama `appendDispatched(allEventsRef.current, syncEvt, deviceId)` e atualiza `allEventsRef.current` síncronamente antes do próximo render.
- `src/context/replay.ts` -- `replayAllEvents(events, options)` (linha 302): função pura que reconstrói `{ domain, gamification, ... }` a partir do log.
- `src/hooks/useTransactionForm.ts` -- Laço de parcelamento (`for (const evt of events) dispatchDomainEvent(evt)`, linhas 374-376).
- `src/modules/transactionRewards.ts` -- `transactionRewardEligibility` (linhas 27-44), módulo puro já existente sem `react-native`.
- `packages/domain/src/transactions.ts` -- `createTransactionEvent` (linha 43), gera array de 12 `TransactionCreatedEvent` para `installments: 12`.

## Tasks & Acceptance

**Execution:**
- `src/modules/domainEventEffects.ts` -- Criar módulo puro com `computeDomainEventEffects` que recebe o log atualizado (`replayAllEvents`) ou fallback demo e retorna `{ gamificationEvents, leveledUp, achievementToasts, monthlyToasts }` -- Permite testar o fluxo completo de parcelamento e recorrência no Vitest sem `react-native`.
- `src/hooks/useGamificationEffects.ts` -- Atualizar `dispatchDomainEvent` para capturar `prevExistingTx` (quando `TRANSACTION_UPDATED`), despachar o evento no log (`allEventsRef.current` atualizado na hora), delegar para `computeDomainEventEffects`, despachar os eventos de gamificação gerados e disparar toasts/som -- Garante que cada iteração de um laço síncrono enxergue o estado acumulado do log.
- `src/modules/__tests__/domainEventEffects.test.ts` -- Criar testes unitários cobrindo parcelamento de 12x, sequência de recorrência, comparação de XP total com lançamentos separados, `TRANSACTION_UPDATED` (`pending -> confirmed`), modo demo e evento não-local -- Valida todos os critérios da Story 7.7 e a matriz I/O.

**Acceptance Criteria:**
- Given um laço síncrono despacha 12 parcelas de uma compra antes do próximo render, when `dispatchDomainEvent` executa os efeitos sobre o estado reconstruído do log (`allEventsRef.current`), then cada conquista desbloqueada é emitida apenas uma vez.
- Given as mesmas 12 parcelas, when comparadas com 12 despachos separados em ciclos distintos, then o `totalXp` final no estado de gamificação é idêntico.
- Given uma sequência de transações recorrentes despachadas no mesmo ciclo, when `computeDomainEventEffects` processa cada evento sobre o log atualizado, then nenhuma conquista é duplicada e o `totalXp` coincide com despachos separados.

## Spec Change Log

## Review Triage Log

### 2026-11-15 — Review pass
- verdicts: 10 findings — high 0, medium 4, low 5, false 1, maybe-false 0
- findings:
  - `[medium]` `[patch]` `dispatchDomainEvent` não verificava se `event.id` já estava em `allEventsRef.current` antes de rodar efeitos — corrigido com `alreadyInLog` em `src/hooks/useGamificationEffects.ts` (pula efeitos quando `dispatch` ignora evento duplicado).
  - `[medium]` `[patch]` `existingForEligibility` caía para `fallbackDomain.transactions[id]` quando `useLogEvents: true` e `prevExistingTx` era `undefined` — corrigido para não recorrer a `fallbackDomain` quando `useLogEvents: true` em `src/modules/domainEventEffects.ts`.
  - `[low]` `[patch]` `isNonLocalEvent` tratava `deviceId === ""` como evento remoto — corrigido para tratar `""` como local em `src/modules/domainEventEffects.ts`.
  - `[low]` `[patch]` Singleton `EMPTY_EFFECTS` retornado diretamente — substituído por `createEmptyEffects()` em `src/modules/domainEventEffects.ts`.
  - `[medium]` `[defer]` Modo demo (`useLogEvents: false`) ainda lê closure em laços síncronos — registrado em `deferred`.
  - `[low]` `[reject]` Segundo replay em `TRANSACTION_UPDATED` — caso raro de evento único; manter `computeDomainEventEffects` puro e desacoplado evita complexidade desnecessária.
  - `[low]` `[defer]` Toasts múltiplos em slot único e `monthlyToasts` via `setPendingToast` — comportamento pré-existente registrado em `deferred`.
  - `[false]` `[reject]` `applyTransactionFallback` diverge de `domainReducer` — apenas atualiza `transactions` para cálculo de `50/30/20` e conquistas, idêntico ao comportamento anterior.
  - `[low]` `[defer]` `checkNewMonthlyTrophies` sem parâmetro `now` — assinatura pré-existente em `packages/gamification`, registrado em `deferred`.
  - `[medium]` `[defer]` Wiring de `useGamificationEffects.ts` não testado diretamente no Vitest (`react-native`) — registrado em `deferred`.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint .`: 0 erros (12 warnings pré-existentes fora dos arquivos da story).
- `npx tsc --noEmit`: 0 erros.
- `npx vitest run --maxWorkers=2`: 123 arquivos / 2942 testes passando (incluindo 6 testes em `src/modules/__tests__/domainEventEffects.test.ts`).

## Auto Run Result

- **Resumo:** Efeitos colaterais de `dispatchDomainEvent` extraídos para o módulo puro `src/modules/domainEventEffects.ts`, reconstruindo `domain` e `gamification` via `replayAllEvents(allEventsRef.current)` após cada `dispatch` fora do modo demo, evitando repetição de conquistas e divergência de XP em parcelamentos e recorrências.
- **Arquivos alterados:**
  - `src/modules/domainEventEffects.ts` — módulo puro `computeDomainEventEffects` com suporte a estado do log atualizado e fallback demo.
  - `src/hooks/useGamificationEffects.ts` — captura `prevExistingTx` para `TRANSACTION_UPDATED`, ignora IDs duplicados e delega efeitos a `computeDomainEventEffects`.
  - `src/modules/__tests__/domainEventEffects.test.ts` — 6 testes cobrindo parcelamento 12x, recorrência em sequência, `pending -> confirmed`, modo demo, evento remoto e guarda de `fallbackDomain`/`deviceId` vazio.
- **Triagem da revisão:** 4 patches aplicados, 4 itens adiados em `deferred`, 1 rejeitado (`low`) e 1 refutado (`false`).
