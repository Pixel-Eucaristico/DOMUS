---
title: 'Story 7.9: Derivar o streak do log'
type: 'refactor'
created: '2026-11-16'
status: 'done'
baseline_revision: '7239ded22472cdfc53ed5aa0171ae125c7e1a7ec'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Testes de integração do streak em streakDerivation.test.ts exercitam mergeImported + replayAllEvents em vez de nostrSync + AppStateProvider
    evidence: >-
      Padrão do épico para testes determinísticos sem react-native; AppStateProvider lê gamification.currentStreak diretamente de replayAllEvents.
    location: >-
      packages/gamification/__tests__/streakDerivation.test.ts:244
    severity: medium
  - summary: >-
      Flag updateStreak em TransactionRewardEligibility tornou-se não utilizada em produção
    evidence: >-
      Mantida para não quebrar src/modules/__tests__/transactionRewards.test.ts durante a Story 7.9.
    location: >-
      src/modules/transactionRewards.ts:10
    severity: low
---

<intent-contract>

## Intent

**Problem:** `STREAK_UPDATED` grava `currentStreak`, `longestStreak` e `lastActiveDate` calculados localmente em um aparelho e o último evento a chegar no sync sobrescreve o estado, fazendo aparelhos com histórico offline diferente perderem a sequência ou divergirem.

**Approach:** Derivar `currentStreak`, `longestStreak` e `lastActiveDate` diretamente das datas civis (`YYYY-MM-DD`) das transações confirmadas no log via função pura em `streakEngine.ts` aplicada ao final de `replayAllEvents`, ignorar eventos `STREAK_UPDATED` antigos no `gamificationReducer` (sem enviá-los à Quarentena) e parar de emitir novos eventos `STREAK_UPDATED` em `domainEventEffects.ts`.

## Boundaries & Constraints

**Always:**
- Manter `STREAK_UPDATED` reconhecido em `KNOWN_EVENT_TYPES` e `PAYLOAD_SPECS` (`src/context/replayValidation.ts`) para que eventos `STREAK_UPDATED` antigos no histórico passem sem ir para a Quarentena.
- Considerar apenas transações confirmadas (`!tx.status || tx.status === "confirmed"`) e não excluídas (`domain.transactions` após replay) com data `YYYY-MM-DD` válida.
- Deduplicar datas iguais no mesmo dia e ordenar cronologicamente em aritmética civil (UTC, imune a fuso/horário de verão).
- Manter `calculateStreakFromDates` e `calculateStreakFromTransactions` puros em `packages/gamification/src/streakEngine.ts` (sem `react-native`).

**Never:**
- Alterar `packages/sync`, `ios/`, `android/` ou `replit.*`.
- Usar `vi.mock("react-native")` nos testes.
- Alterar a lógica de derivação de nível ou fórmula de XP na exclusão (escopo das Stories 7.8 e 7.10).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dois aparelhos com histórico offline diferente | Aparelho A tem transações confirmadas em `2026-11-10` e `2026-11-11` (streak 2) e `STREAK_UPDATED` antigo; Aparelho B tem em `2026-11-12` e `2026-11-13` (streak 2) | Após sync (`mergeImported` + `replayAllEvents`), ambos convergem para `currentStreak: 4`, `longestStreak: 4`, `lastActiveDate: "2026-11-13"` | Nenhum erro esperado |
| Evento `STREAK_UPDATED` antigo no log | Log contém `STREAK_UPDATED` legado com `currentStreak: 99, longestStreak: 99` e nenhuma transação (ou apenas 1 transação) | `replayAllEvents` ignora o payload de `STREAK_UPDATED` sem ir à Quarentena e deriva o streak real das transações | Nenhum erro esperado |
| Transação pendente vs confirmada e transação excluída | Transação `status: "pending"` em `2026-11-14` não conta; após `TRANSACTION_UPDATED` para `confirmed`, passa a contar; após `TRANSACTION_DELETED`, deixa de contar | `currentStreak` ignora pendentes e excluídas | Nenhum erro esperado |
| Lacuna de dias e múltiplas transações no mesmo dia | Transações em `11-01`, `11-02`, `11-02`, `11-03`, `11-06` | `longestStreak: 3`, `currentStreak: 1`, `lastActiveDate: "2026-11-06"` | Ignora datas malformadas sem lançar erro |

</intent-contract>

## Code Map

- `packages/gamification/src/streakEngine.ts` -- Motor puro de streak (`updateStreak`, `createInitialStreak`, `isStreakActive`); adicionar `calculateStreakFromDates` e `calculateStreakFromTransactions`.
- `packages/gamification/src/reducer.ts` -- `gamificationReducer` (linhas 100-108): `case GAMIFICATION_EVENTS.STREAK_UPDATED` hoje grava `currentStreak`, `longestStreak` e `lastActiveDate` do payload.
- `src/context/replay.ts` -- `replayAllEvents` (linhas 391-413): ao final do loop de eventos, derivar `gamification.currentStreak`, `longestStreak` e `lastActiveDate` de `domain.transactions` via `calculateStreakFromTransactions`.
- `src/context/replayValidation.ts` -- Linha 171 mantém `STREAK_UPDATED` reconhecido para não mandar eventos antigos à Quarentena.
- `src/modules/domainEventEffects.ts` -- Linhas 202-218 hoje emitem `GAMIFICATION_EVENTS.STREAK_UPDATED`.
- `packages/gamification/__tests__/gamification.test.ts` -- Linhas 644-695, 739-755, 806-825, 861-880 testam `STREAK_UPDATED` no reducer.
- `packages/__tests__/integration.test.ts` -- Linhas 224-228 e 370-371 testam `STREAK_UPDATED` no reducer.
- `src/modules/__tests__/domainEventEffects.test.ts` -- Linhas 315 e 351 verificam emissão de `STREAK_UPDATED`.

## Tasks & Acceptance

**Execution:**
- `packages/gamification/src/streakEngine.ts` -- Exportar `calculateStreakFromDates(dates)` e `calculateStreakFromTransactions(transactions)` usando conjunto único ordenado de datas `YYYY-MM-DD` confirmadas -- Fornece derivação determinística do streak a partir das transações.
- `packages/gamification/src/reducer.ts` -- Alterar `case GAMIFICATION_EVENTS.STREAK_UPDATED` para ignorar `currentStreak`, `longestStreak` e `lastActiveDate` do payload (mantendo apenas `processedEventIds`) -- Ignora `STREAK_UPDATED` antigo sem sobrescrever o estado.
- `src/context/replay.ts` -- Ao final de `replayAllEvents`, recalcular `currentStreak`, `longestStreak` e `lastActiveDate` a partir de `domain.transactions` com `calculateStreakFromTransactions` -- Garante convergência determinística em todos os aparelhos e telas.
- `src/modules/domainEventEffects.ts` -- Parar de emitir `GAMIFICATION_EVENTS.STREAK_UPDATED` e, no fallback demo (`!useLogEvents`), atualizar o streak estimado de `nextDomain.transactions` -- Evita gerar novos eventos absolutos de streak mantendo conquistas `streak_*` reativas.
- `packages/gamification/__tests__/gamification.test.ts`, `packages/__tests__/integration.test.ts`, `src/modules/__tests__/domainEventEffects.test.ts` e `packages/gamification/__tests__/streakDerivation.test.ts` -- Atualizar testes antigos que esperavam mutação por `STREAK_UPDATED` e criar `streakDerivation.test.ts` cobrindo toda a matriz I/O (dois aparelhos com histórico offline diferente, `STREAK_UPDATED` legado ignorado sem quarentena, pendentes/excluídas e lacunas/mesmo dia).

**Acceptance Criteria:**
- Given eventos `STREAK_UPDATED` antigos gravados no log, when `replayAllEvents` processa o histórico, then eles são ignorados sem ir para a Quarentena e o streak é derivado exclusivamente das transações confirmadas.
- Given dois aparelhos com históricos offline em dias distintos e valores diferentes de streak antes do sync, when sincronizam os logs, then ambos exibem exatamente o mesmo `currentStreak`, `longestStreak` e `lastActiveDate`.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 7 findings — high 0, medium 2, low 3, false 2, maybe-false 0
- findings:
  - `[medium]` `[patch]` Derivação de `streak_*` em modo demo (`!useLogEvents`) sem cobertura de teste em `domainEventEffects.test.ts` — adicionado teste para `useLogEvents: false` desbloqueando `streak_3`.
  - `[low]` `[patch]` Falta guarda para `null`/`undefined` em runtime em `calculateStreakFromDates` e `calculateStreakFromTransactions` — adicionada guarda `if (!dates)` / `if (!transactions)` em `packages/gamification/src/streakEngine.ts`.
  - `[low]` `[reject]` `STREAK_UPDATED` ainda adiciona `event.id` a `processedEventIds` no reducer — consistente com `LEVEL_UP` na Story 7.8 e exigido por `gamification.test.ts`.
  - `[false]` `[reject]` `currentStreak` não checa `today` nem corta datas futuras no `replayAllEvents` — `replayAllEvents` deve ser função pura determinística do log (sem depender do relógio), e `isStreakActive` trata a verificação relativa a hoje.
  - `[low]` `[defer]` Flag `updateStreak` em `TransactionRewardEligibility` — mantida por compatibilidade com `transactionRewards.test.ts`, registrada em `deferred`.
  - `[false]` `[reject]` `PAYLOAD_SPECS.STREAK_UPDATED` ainda valida payloads malformados — eventos legados válidos passam sem Quarentena (como testado em `streakDerivation.test.ts`).
  - `[medium]` `[defer]` `streakDerivation.test.ts` exercita `mergeImported` + `replayAllEvents` em vez de UI/Nostr end-to-end — registrado em `deferred`.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint .`: 0 erros (12 warnings pré-existentes fora dos arquivos da story).
- `npx tsc --noEmit`: 0 erros.
- `npx vitest run --maxWorkers=2`: 125 arquivos / 2953 testes passando (incluindo `streakDerivation.test.ts`, `gamification.test.ts`, `integration.test.ts` e `domainEventEffects.test.ts`).

## Auto Run Result

- **Resumo:** Streak (`currentStreak`, `longestStreak`, `lastActiveDate`) passou a ser derivado exclusivamente das datas civis (`YYYY-MM-DD`) das transações confirmadas no log ao final de `replayAllEvents`, ignorando eventos `STREAK_UPDATED` legados sem enviá-los à Quarentena e parando de emitir novos `STREAK_UPDATED`.
- **Arquivos alterados:**
  - `packages/gamification/src/streakEngine.ts` e `packages/gamification/index.ts` — `calculateStreakFromDates` e `calculateStreakFromTransactions`.
  - `packages/gamification/src/reducer.ts` — `STREAK_UPDATED` ignora payload legado.
  - `src/context/replay.ts` — `replayAllEvents` deriva streak de `domain.transactions`.
  - `src/modules/domainEventEffects.ts` — remove emissão de `STREAK_UPDATED` e recalcula streak estimado no modo demo.
  - `packages/gamification/__tests__/streakDerivation.test.ts` + testes atualizados (`gamification.test.ts`, `integration.test.ts`, `domainEventEffects.test.ts`, `replay.test.ts`, `replay.schemaVersion.test.ts`, `threeDeviceSyncSimulation.test.ts`).
- **Triagem da revisão:** 2 patches aplicados, 2 itens em `deferred`, 1 rejeitado (`low`) e 2 refutados (`false`).
