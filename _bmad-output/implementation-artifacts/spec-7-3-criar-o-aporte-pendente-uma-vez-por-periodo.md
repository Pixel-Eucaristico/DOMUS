---
title: 'Story 7.3: Criar o aporte pendente uma vez por período'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_revision: '5e43aa8c98122bc70fc64c30ad4761e7874f8cb7'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-7-context.md'
  - '_bmad-output/implementation-artifacts/spec-7-2-rodar-os-efeitos-so-depois-do-primeiro-pull.md'
warnings: []
deferred:
  - summary: >-
      Teste de caller do efeito cobre só a recorrência mensal; quinzenal e semanal têm teste só das chaves puras.
    evidence: |-
      verification-gap: nenhum teste de evaluateSavingsGoalScheduleEffect com recorrência semanal ou quinzenal.
    location: >-
      src/modules/__tests__/bootEffectsGate.test.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** `evaluateSavingsGoalScheduleEffect` (`src/modules/bootEffectsGate.ts`) cria o aporte pendente com `generateId()` (id do evento e `payload.id` aleatórios) e só confere o log local. Dois aparelhos que geram o aporte do mesmo período (offline, ou o pull ainda não trouxe o do outro) resultam em duas transações pendentes e o saldo da poupança dobra ao efetivar ambas.

**Approach:** Dar ao evento `TRANSACTION_CREATED` do aporte o `id` determinístico `savings:{accountId}:{período}` (e o mesmo valor em `payload.id`), de modo que o `INSERT OR IGNORE`/dedup por id do log colapse os aportes do mesmo período numa só transação. Período: mensal → `YYYY-MM`; quinzenal → `YYYY-MM-Q1` (dias 1–15) ou `YYYY-MM-Q2` (16–fim); semanal → data da segunda-feira da semana (`YYYY-MM-DD`). Funções puras e testadas no módulo sem `react-native`.

## Boundaries & Constraints

**Always:**
- Manter a lógica em `src/modules/bootEffectsGate.ts` (sem `react-native`); exportar `savingsContributionPeriodKey(recurrence, now)` e `savingsContributionEventId(accountId, recurrence, now)`.
- `event.id` e `payload.id` do aporte são iguais a `savings:{accountId}:{período}`.
- Manter a checagem `alreadyScheduledInPeriod` (por descrição e data), que cobre aportes antigos com id aleatório.
- Efetivar o aporte continua sendo `TRANSACTION_UPDATED { id, status: "confirmed" }` sobre o mesmo id; não cria transação nova.
- Um aporte excluído no período não é recriado por outro aparelho com o mesmo id (o id deixa a marca de exclusão do reducer / já existe no log).

**Never:**
- Não alterar `packages/sync`, o reducer de domínio, nem o XP de transação pendente (Story 7.4).
- Não mudar `recuperação de XP` nem `categorias padrão` (Stories 7.5/7.6).
- Não usar `vi.mock("react-native")`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mesmo período, dois aparelhos | Aparelhos A e B (log vazio de aporte) chamam `evaluateSavingsGoalScheduleEffect` para a mesma conta e mês | Ambos geram evento com o mesmo `id` `savings:{conta}:{YYYY-MM}`; `appendGenerated`/`mergeImported` do log de B com o evento de A resulta em 1 só evento e 1 só transação no `replayAllEvents` | Sem erro |
| Períodos distintos | Mensal em meses diferentes; quinzenal Q1 vs Q2; semanal em semanas diferentes | Ids distintos | Sem erro |
| Efetivar | Aporte pendente confirmado via `TRANSACTION_UPDATED` | Uma única transação confirmada, saldo da conta soma o valor uma vez | Sem erro |
| Aporte antigo (id aleatório) no período | Transação `Aporte poupança:` pendente/confirmada no período com id aleatório | Efeito não gera novo aporte (`alreadyScheduledInPeriod`) | Sem erro |
| Conta com id contendo `:` | `accountId` com `:` | id continua `savings:{accountId}:{período}` sem alteração | Sem erro |

</intent-contract>

## Code Map

- `src/modules/bootEffectsGate.ts` -- `evaluateSavingsGoalScheduleEffect` (l. 330–401) usa `createEvent` + `generateId()`; helpers de período `currentFortnight`, `currentWeek`, `monthlyContributionDate`, `alreadyScheduledInPeriod`.
- `src/hooks/useSavingsGoalScheduler.ts` -- hook que despacha os eventos gerados via `dispatchDomainEvent`; não deve mudar.
- `src/context/localEventLog.ts` -- `appendDispatched`/`mergeImported`: ids repetidos são descartados (fica o primeiro).
- `src/components/transaction/PendingTransactionsList.tsx` -- efetiva aporte com `updateTransactionEvent(id, {status:"confirmed"})`; só leitura.
- `src/modules/__tests__/bootEffectsGate.test.ts` -- suíte existente; acrescentar testes de aporte determinístico.

## Tasks & Acceptance

**Execution:**
- `src/modules/bootEffectsGate.ts` -- criar `savingsContributionPeriodKey` e `savingsContributionEventId`; em `evaluateSavingsGoalScheduleEffect`, sobrescrever `event.id` e `payload.id` com o id determinístico -- colapsar aportes do mesmo período entre aparelhos.
- `src/modules/__tests__/bootEffectsGate.test.ts` -- testes: ids por recorrência/período, dois aparelhos gerando o mesmo aporte resultam em 1 transação após `mergeImported` + `replayAllEvents`, efetivar não duplica, aporte antigo com id aleatório não é recriado.

**Acceptance Criteria:**
- Given dois aparelhos que geram o aporte do mesmo período, when os logs são mesclados, then resulta uma só transação.
- Given o aporte pendente efetivado uma vez, when o replay roda, then não há duplicata e o saldo soma o valor uma vez.

## Spec Change Log

## Review Triage Log

### 2026-11-13 — Review pass
- verdicts: 17 findings — high 0, medium 1, low 3, false 0, maybe-false 0, rejected-as-negligible/design 13 (graded low)
- findings:
  - `[medium]` `[patch]` Aporte excluído não recriado pelo mesmo id: sem teste (blind-hunter, verification-gap, edge-case-hunter, intent-alignment) — Adicionado teste "aporte excluído no período não ressuscita…" (`TRANSACTION_DELETED` + `mergeImported` do evento de outro aparelho + `replayAllEvents` sem a transação); passa.
  - `[low]` `[defer]` Teste de caller só cobre recorrência mensal (verification-gap) — a lógica reaproveita funções puras já testadas (chaves quinzenal/semanal cobertas em teste puro); registrado em `deferred`.
  - `[low]` `[reject]` Fuso horário diferente entre aparelhos perto da virada do período (blind-hunter, edge-case-hunter, verification-gap) — mesma semântica de data local já usada por `currentWeek`/`currentFortnight`/`alreadyScheduledInPeriod` desde antes da story; fix exigiria novo conceito de fuso compartilhado; fora do intent (id por `{período}`).
  - `[low]` `[reject]` Mudança de recorrência/valor/dia dentro do mesmo período gera ids diferentes ou colisão de id (blind-hunter, edge-case-hunter) — `alreadyScheduledInPeriod` confere por prefixo+data dentro do período da nova recorrência; colisão por id é o comportamento pedido (um aporte por conta e período); fix adicionaria ramos.
  - `[low]` `[reject]` Divisão Q1/Q2 vs `currentFortnight` (blind-hunter) — ambos usam `getDate() <= 15`; verificado no código, não diverge.
  - `[low]` `[reject]` `accountId` com `:` poderia colidir (blind-hunter, edge-case-hunter) — ids de conta são `generateId()` (base36, sem `:`); colisão teórica sem caminho alcançável.
  - `[low]` `[reject]` Sobrescrita redundante de `id` após `createEvent` / `signature` (blind-hunter) — `createEvent` define `signature: ""`, nada assina o id; sobrescrita é necessária porque `createEvent` gera o id do evento.
  - `[low]` `[reject]` Data da transação (`txDate`) depende de qual evento sobrevive ao dedup (edge-case-hunter) — resultado pertence ao mesmo período; aceitável e inerente ao id por período.
  - `[low]` `[reject]` Aportes legados com id aleatório fora do casamento por descrição/data podem duplicar uma vez (blind-hunter) — fora do escopo; migração de legado não é pedida e `alreadyScheduledInPeriod` cobre o caso comum.
  - `[low]` `[reject]` Hook e caminho de sync reais não executados nos testes (intent-alignment) — o hook importa `react-native` (não testável em vitest, AGENTS.md); o hook não foi alterado; o dedup por id está coberto via `mergeImported`.
  - `[low]` `[reject]` Spec ainda `in-progress` / logs vazios / verificação não evidenciada (blind-hunter) — artefato de processo, verificação foi executada (ver Auto Run Result).
  - `[low]` `[reject]` Demais itens repetidos (id sem componente de valor; compatibilidade do id com limites de sync; ressurreição após compactação de log) — sem log com compactação no app; ids são strings livres no SQLite/Nostr; sem dano demonstrado.

## Auto Run Result

- **Resumo:** Aporte pendente agora tem `id` e `payload.id` iguais a `savings:{accountId}:{período}` (mensal `YYYY-MM`, quinzenal `YYYY-MM-Q1|Q2`, semanal segunda-feira `YYYY-MM-DD`), colapsando aportes do mesmo período entre aparelhos via dedup por id.
- **Arquivos:** `src/modules/bootEffectsGate.ts` (funções `savingsContributionPeriodKey`/`savingsContributionEventId` e id determinístico); `src/modules/__tests__/bootEffectsGate.test.ts` (5 testes novos).
- **Revisão:** 1 patch aplicado (teste de exclusão), 1 deferido, demais rejeitados com motivo no log.
- **Follow-up review recomendado:** `false`.
- **Verificação:** `vitest` (18 arquivos, 399 testes), `eslint` e `tsc --noEmit` limpos.
- **Riscos residuais:** fuso horário diferente perto da virada do período pode gerar ids distintos; aportes legados com id aleatório só são cobertos por `alreadyScheduledInPeriod`.

## Verification

**Commands:**
- `npx vitest run src/modules/__tests__/bootEffectsGate.test.ts src/context/__tests__` -- expected: todos passam.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros.
- `npx eslint src/modules/bootEffectsGate.ts src/modules/__tests__/bootEffectsGate.test.ts` -- expected: 0 erros e 0 warnings.
