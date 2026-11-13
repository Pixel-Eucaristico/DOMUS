---
title: 'Story 7.4: Não dar XP a transação pendente'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_revision: 'e533e1aac27d1e0a30b57cc8b5d77ae2a994bad1'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-7-context.md'
  - '_bmad-output/implementation-artifacts/spec-7-3-criar-o-aporte-pendente-uma-vez-por-periodo.md'
warnings: []
deferred:
  - summary: >-
      A ligação da regra de elegibilidade ao hook `dispatchDomainEvent` não tem teste direto (o hook importa react-native).
    evidence: |-
      verification-gap: nenhum teste exercita o hook; só a função pura e o replay. Extrair toda a decisão de XP/streak em função pura permitiria testar o caminho de despacho.
    location: >-
      src/hooks/useGamificationEffects.ts:304
    severity: low
---

<intent-contract>

## Intent

**Problem:** `dispatchDomainEvent` (`src/hooks/useGamificationEffects.ts`, l. 269–449) concede XP (`XP_GAINED`) e streak (`STREAK_UPDATED`) a todo `TRANSACTION_CREATED`, inclusive a transação gerada com `status: "pending"` (aporte automático da Story 7.3). O usuário ganha XP e streak sem ter feito nada, e a confirmação posterior (`TRANSACTION_UPDATED` com `status: "confirmed"`) não concede nada.

**Approach:** Extrair a decisão para uma função pura `transactionRewardEligibility` em módulo novo sem `react-native` (`src/modules/transactionRewards.ts`): o evento é elegível a XP e streak quando é `TRANSACTION_CREATED` com status ausente/`"confirmed"`, ou `TRANSACTION_UPDATED` que muda uma transação existente de `"pending"` para confirmada (status ausente/`"confirmed"`). No hook, usar essa decisão no lugar de `event.type === TRANSACTION_CREATED` para o XP e o streak. A idempotência por `transactionId` do reducer de gamificação garante que o XP da confirmação seja concedido uma vez.

## Boundaries & Constraints

**Always:**
- Módulo puro em `src/modules/transactionRewards.ts` (sem `react-native`), testado no Vitest.
- Pendente (`status: "pending"`) no `TRANSACTION_CREATED`: sem XP e sem streak.
- Confirmação de pendente: concede XP (e streak) uma única vez; o `XP_GAINED` leva `transactionId` do evento.
- Exclusão continua sem descontar XP (regra existente no hook); excluir pendente não gera XP nem streak.
- Edição que não muda o status de pendente para confirmado (ex.: editar valor de confirmada, ou editar pendente que segue pendente) não concede XP nem streak.
- Manter a cota diária de 5 registros e o bônus de orçamento como estão.

**Never:**
- Não alterar `packages/gamification` reducer, `packages/sync` nem a derivação de nível/streak (Stories 7.8/7.9).
- Não alterar a geração do aporte (Story 7.3) nem o XP de recuperação (7.5).
- Não usar `vi.mock("react-native")`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Criar pendente | `TRANSACTION_CREATED` com `status: "pending"` | `{ awardXp: false, updateStreak: false }` | Sem erro |
| Criar confirmada | `TRANSACTION_CREATED` com `status: "confirmed"` ou sem `status` | `{ awardXp: true, updateStreak: true }` | Sem erro |
| Confirmar pendente | `TRANSACTION_UPDATED` `{ status: "confirmed" }` sobre transação existente `pending` | `{ awardXp: true, updateStreak: true }` | Sem erro |
| Editar confirmada | `TRANSACTION_UPDATED` sobre transação já confirmada (ou sem status) | `{ awardXp: false, updateStreak: false }` | Sem erro |
| Editar pendente mantendo pendente | `TRANSACTION_UPDATED` sem `status` sobre `pending` | `{ awardXp: false, updateStreak: false }` | Sem erro |
| Atualizar transação inexistente | `TRANSACTION_UPDATED` com id não encontrado | `{ awardXp: false, updateStreak: false }` | Sem erro |
| Excluir pendente ou confirmada | `TRANSACTION_DELETED` | `{ awardXp: false, updateStreak: false }` | Sem erro |
| Confirmar duas vezes | Dois `XP_GAINED` com o mesmo `transactionId` no replay | XP somado uma só vez | Sem erro |

</intent-contract>

## Code Map

- `src/hooks/useGamificationEffects.ts` -- `dispatchDomainEvent` (l. 269–449): XP só em `TRANSACTION_CREATED` (l. 307), streak só em `TRANSACTION_CREATED` (l. 349); `existing` já vem de `domain.transactions` (l. 288). Importa `react-native` indireto (`soundManager`): não testar direto.
- `packages/gamification/src/reducer.ts` -- `XP_GAINED` idempotente por `transactionId` (l. 36–54); só leitura.
- `src/components/transaction/PendingTransactionsList.tsx` -- confirma via `updateTransactionEvent(id, {status: "confirmed"})`; só leitura.
- `src/modules/bootEffectsGate.ts` -- padrão de módulo puro e de testes (referência).
- `src/modules/__tests__/bootEffectsGate.test.ts` -- referência para testes com `replayAllEvents`.

## Tasks & Acceptance

**Execution:**
- `src/modules/transactionRewards.ts` -- criar `transactionRewardEligibility({ eventType, payload, existing })` devolvendo `{ awardXp, updateStreak }` conforme a matriz -- isolar a regra em função pura.
- `src/hooks/useGamificationEffects.ts` -- usar `transactionRewardEligibility` (com `domain.transactions[event.payload.id]` como `existing`, lido antes de aplicar o evento previsto) para decidir XP e streak no lugar de `event.type === TRANSACTION_CREATED` -- pendente não paga; confirmação paga.
- `src/modules/__tests__/transactionRewards.test.ts` -- testar todas as linhas da matriz; incluir teste de replay: pendente sem `XP_GAINED`, confirmação com `XP_GAINED` (mesmo `transactionId`) soma XP uma vez, dois `XP_GAINED` iguais somam uma vez, exclusão da pendente mantém o XP.

**Acceptance Criteria:**
- Given uma transação pendente criada, when o hook processa o evento, then não há `XP_GAINED` nem `STREAK_UPDATED`.
- Given a confirmação da pendente, when o hook processa o evento, then há um `XP_GAINED` com o `transactionId` e o XP é concedido uma vez.

## Spec Change Log

## Review Triage Log

### 2026-11-13 — Review pass
- verdicts: 20 findings — high 0, medium 0, low 5 (3 patched, 1 deferred, 1 rejected), false 3, rejected-as-design/negligible 12 (graded low)
- findings:
  - `[low]` `[patch]` Módulo compara tipos com strings literais em vez de `EVENT_TYPES` (blind-hunter) — importado `EVENT_TYPES` em `transactionRewards.ts`.
  - `[low]` `[patch]` Nome do teste "excluir a pendente" enganoso, pois exclui confirmada (blind-hunter) — renomeado para "excluir a transação confirmada mantém o XP".
  - `[low]` `[patch]` Status desconhecido (`cancelled`) sem teste (blind-hunter, edge-case-hunter) — adicionado teste "status desconhecido não concede".
  - `[low]` `[defer]` Decisão ligada ao hook sem teste direto (verification-gap, intent-alignment, blind-hunter) — o hook importa `react-native` (não testável no vitest); a regra está extraída e testada; extrair a decisão inteira de XP/streak fica como evolução; registrado em `deferred`.
  - `[false]` `[reject]` "O diff não toca `dispatchDomainEvent`" (intent-alignment) — o diff altera os gates de XP e streak dentro de `dispatchDomainEvent` (`useGamificationEffects.ts`, l. 269+).
  - `[false]` `[reject]` "Estado `existing` pode já ser o pós-evento" (blind-hunter) — `domain` vem do fechamento do render (replay anterior); `dispatch` não atualiza `domain` de forma síncrona; a leitura é pré-evento.
  - `[false]` `[reject]` "Testes de replay passariam antes do diff" como lacuna da regra (intent-alignment) — a regra nova é coberta pelos testes da função pura; os de replay confirmam a idempotência pedida no AC ("XP concedido uma vez").
  - `[low]` `[reject]` Dois confirm rápidos antes do re-render emitem streak/level duplicados (blind-hunter, edge-case-hunter, verification-gap) — XP dedup por `transactionId` no reducer; streak é idempotente no mesmo dia; `LEVEL_UP` é legado (Story 7.8); fix exigiria ref/estado novo.
  - `[low]` `[reject]` Cota diária de 5 aplica à confirmação e pode zerar o XP com streak atualizado (edge-case-hunter, blind-hunter) — regra anti-farm existente; aplicar à confirmação é coerente (XP só no dia em que o usuário age).
  - `[low]` `[reject]` Streak/XP creditados no dia da confirmação, não na data da transação (blind-hunter) — intencional: "XP só de gasto confirmado" e o usuário age na confirmação.
  - `[low]` `[reject]` `payload.id` ausente em evento malformado (edge-case-hunter) — `UPDATED` sem id vira `existing` indefinido → sem XP; `CREATED` sem id já é inválido na validação de envelope.
  - `[low]` `[reject]` `UPDATED` sem `status` com `existing` legado sem status não paga (blind-hunter, edge-case-hunter) — correto: só `status: "confirmed"` explícito confirma, como em `PendingTransactionsList`.
  - `[low]` `[reject]` Spec fala "status ausente" em UPDATED e o código exige `confirmed` (edge-case-hunter) — discrepância de redação no spec, comportamento é o correto; fix seria editar este spec.
  - `[low]` `[reject]` Confirmação de outro aparelho paga XP neste (blind-hunter) — o hook só roda no dispatch local; eventos importados não passam por ele (Epic 7 Context).
  - `[low]` `[reject]` Higiene de testes (`let n` compartilhado, `as never`, cópias `{...ELIGIBLE}`) e ausência de changelog (blind-hunter) — sem dano; padrão dos testes vizinhos.

## Auto Run Result

- **Resumo:** Nova função pura `transactionRewardEligibility` (`src/modules/transactionRewards.ts`): `TRANSACTION_CREATED` pendente não paga XP nem streak; confirmada paga; `TRANSACTION_UPDATED` paga só na transição `pending` → `confirmed`; exclusão e demais casos não pagam. `dispatchDomainEvent` usa a decisão para XP e streak. XP da confirmação é idempotente por `transactionId` (reducer existente).
- **Arquivos:** `src/modules/transactionRewards.ts` (regra pura), `src/hooks/useGamificationEffects.ts` (gates de XP e streak), `src/modules/__tests__/transactionRewards.test.ts` (testes da matriz e de replay).
- **Revisão:** 3 patches de baixa gravidade aplicados, 1 deferido, demais rejeitados com motivo.
- **Follow-up review recomendado:** `false`.
- **Verificação:** `vitest` (src/modules, packages/gamification, src/context), `tsc --noEmit` e `eslint` limpos.
- **Riscos residuais:** a ligação da regra ao hook não tem teste direto; duplo toque rápido em "confirmar" pode emitir `STREAK_UPDATED` duplicado no mesmo dia (sem efeito de XP).

## Verification

**Commands:**
- `npx vitest run src/modules/__tests__/transactionRewards.test.ts src/modules/__tests__/bootEffectsGate.test.ts packages/gamification` -- expected: todos passam.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros.
- `npx eslint src/modules/transactionRewards.ts src/modules/__tests__/transactionRewards.test.ts src/hooks/useGamificationEffects.ts` -- expected: 0 erros e 0 warnings.
