---
title: 'Story 3.7: aplicar edição e exclusão que chegam antes do alvo'
type: 'bugfix'
created: '2026-10-26'
status: 'in-progress'
baseline_commit: '072231c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-4-ordem-total-do-replay.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Desde a Story 3.4 o replay ordena o log inteiro por `(timestamp, deviceId, id)`, então a ordem de chegada não importa mais. Mas, com relógios diferentes entre aparelhos, uma exclusão ou edição pode ter `timestamp` **menor** que o lançamento que ela altera (ex.: o aparelho que lançou estava adiantado). Hoje o `domainReducer` ignora `TRANSACTION_UPDATED`/`TRANSACTION_DELETED` e `ACCOUNT_UPDATED`/`ACCOUNT_DELETED` quando o alvo ainda não existe: a exclusão se perde e o gasto apagado volta sozinho, com saldo errado.

**Approach:** No `domainReducer`, uma edição ou exclusão sem alvo fica pendente pelo id do alvo (estado derivado, refeito a cada replay). Quando o lançamento ou a conta é criado, as pendências são aplicadas logo em seguida, na ordem em que estavam no log. Uma exclusão pendente deixa o alvo excluído assim que ele chega, com o saldo certo.

## Boundaries & Constraints

**Always:** reducer puro e imutável; pendências e marcas de exclusão vivem só no estado derivado (nunca persistidas, nunca gravadas no log); a ordem total da 3.4 continua valendo; saldo da conta igual nos dois casos de ordem; transação excluída cuja conta também foi excluída não quebra o reducer; pendência que nunca acha alvo não altera nada e não vai para a Quarentena (o alvo pode chegar depois pelo sync).

**Never:** reescrever `timestamp` ou reordenar o log; mudar eventos publicados; mudar o comportamento quando o alvo já existe.

## I/O & Edge-Case Matrix

| Cenário | Ordem no replay | Resultado |
|---|---|---|
| Exclusão antes do lançamento | `TRANSACTION_DELETED(t1)`, depois `TRANSACTION_CREATED(t1)` | t1 excluída; saldo como se nunca tivesse existido |
| Edição antes do lançamento | `TRANSACTION_UPDATED(t1, valor 50)`, depois `CREATED(t1, valor 30)` | t1 com valor 50; saldo com 50 |
| Edição e exclusão antes | `UPDATED`, `DELETED`, depois `CREATED` | t1 excluída; saldo sem ela |
| Ordem normal | `CREATED`, `UPDATED`, `DELETED` | igual a hoje |
| Conta | `ACCOUNT_DELETED(a1)` antes de `ACCOUNT_CREATED(a1)` | a1 excluída |
| Edição de conta antes | `ACCOUNT_UPDATED(a1)` antes de `CREATED(a1)` | a1 com os campos da edição |
| Alvo nunca chega | só `TRANSACTION_DELETED(t9)` | nada muda |
| Mesmo log, outra ordem de chegada | qualquer permutação | mesmo estado (3.4) |

</frozen-after-approval>

## Code Map

- `packages/domain/src/reducer.ts` -- `ACCOUNT_*` e `TRANSACTION_*`
- `packages/domain/src/state.ts` -- `AppState` (estado derivado)
- `src/context/replay.ts` -- replay e testes de ordem

## Tasks & Acceptance

**Execution:**
- [ ] Pendências e marcas de exclusão no estado derivado do domínio; aplicar ao criar o alvo
- [ ] Testes da matriz no pacote do domínio e pelo replay

**Acceptance Criteria:**
- Given uma exclusão que chegou antes do lançamento, when o lançamento chega, then a transação fica excluída e o saldo correto
- Given o mesmo para conta, when a conta é criada depois, then ela fica excluída (ou editada)

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas
