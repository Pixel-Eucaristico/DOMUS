---
title: 'Story 3.7: aplicar edição e exclusão que chegam antes do alvo'
type: 'bugfix'
created: '2026-10-26'
status: 'done'
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
- [x] Pendências e marcas de exclusão no estado derivado do domínio; aplicar ao criar o alvo
- [x] Testes da matriz no pacote do domínio e pelo replay

**Acceptance Criteria:**
- Given uma exclusão que chegou antes do lançamento, when o lançamento chega, then a transação fica excluída e o saldo correto
- Given o mesmo para conta, when a conta é criada depois, then ela fica excluída (ou editada)

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| `ACCOUNT_UPDATED` pendente traz o saldo derivado do formulário e conta as transações de novo (940 × 970) | high | Sonda p2. **patch**: ao aplicar um `ACCOUNT_UPDATED` pendente, o campo `balance` é ignorado (o resto da edição vale) + teste do caso. **Aplicado.** |
| Checagem de alvo existente usa `state.x[id]` (pega membros do protótipo: `"constructor"`, `"toString"`) | low | Sonda p1. **patch**: `hasOwn` nos quatro ramos + teste que falha hoje. **Aplicado.** |
| Edição velha depois de uma exclusão normal vira pendência permanente; exclusão normal não deixa marca | low | Sonda p3. **patch**: toda exclusão deixa a marca; edição ou exclusão de id marcado é ignorada. **Aplicado.** |
| Pendência de um lançamento em Quarentena (`future_timestamp`) liberado depois | low (gap) | **patch**: teste antes e depois da liberação. **Aplicado.** |
| Teste "todas as permutações" só reconfere a 3.4 | low | **patch**: nome e comentário honestos. **Aplicado.** |
| O formulário de conta grava o saldo derivado no log em toda edição | medium | **defer** (D35): só enviar `balance` quando o usuário mudar o saldo. |
| Transação criada antes da conta (relógio do criador da conta adiantado) fica sem efeito no saldo e a exclusão depois desconta o que nunca entrou | medium | **defer** (D36): mesma causa; story própria. |
| Nota fiscal confirmada antes da importação e eventos da lista de desejos antes do item | low | **defer** (D37): fora do escopo da spec. |
| Custo extra com muitas pendências (~1,5×) | low | **reject**: o reducer já era quadrático; sem caso real. |

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas

## Implementation Notes

- **Estado derivado:** `AppState.outOfOrder?: OutOfOrderState` (`packages/domain/src/state.ts`) com `pendingTransactions`/`pendingAccounts` (id do alvo → eventos `*_UPDATED`/`*_DELETED` na ordem do log) e `deletedTransactions`/`deletedAccounts` (marcas de exclusão, `Record<id, true>`). O campo é opcional e só existe enquanto houver pendência ou marca; quando tudo esvazia ele é removido, então um log sem nada fora de ordem dá exatamente o mesmo `AppState` de antes (nenhum teste de igualdade antigo precisou mudar, e `createInitialState()` continua igual). Nunca é persistido nem gravado no log: é refeito a cada replay. `createInitialOutOfOrderState` e o tipo `OutOfOrderState` são exportados em `packages/domain/index.ts`.
- **Reducer** (`packages/domain/src/reducer.ts`): `*_UPDATED`/`*_DELETED` sem alvo → `queueAccountOp`/`queueTransactionOp` (lista nova, nunca `push`). `*_CREATED` → cria pelo caminho de hoje (saldo incluído) e chama `applyPendingAccountOps`/`applyPendingTransactionOps`, que retira a lista e reaplica cada evento pelo próprio `domainReducer` (o alvo já existe, então vale a lógica de saldo/status de hoje). Uma exclusão pendente encerra a lista.
- **Marca de exclusão (revisão, achado 3):** toda exclusão — normal ou pendente — grava a marca do id (`markAccountDeleted`/`markTransactionDeleted`). Depois da marca, `*_CREATED`, `*_UPDATED` e `*_DELETED` do mesmo id são ignorados (nada fica pendente; o `CREATED` não mexe no saldo). **Decisão:** o id excluído continua excluído — `C, D, U, C` (mesmo id) termina igual a `D, C, C'` (excluído, saldo sem ele). Isso muda o caso antigo "recriar o mesmo id depois de uma exclusão normal" (antes voltava); o app não reaproveita ids (não há desfazer que recrie o mesmo id; `generateId` é único). Consequência: depois de qualquer exclusão o `AppState` passa a ter `outOfOrder` com a marca; as partes públicas não mudam.
- **Saldo de edição de conta pendente (revisão, achado 1):** ao aplicar um `ACCOUNT_UPDATED` pendente, o campo `balance` é retirado do payload (`withoutBalance`) e o resto da edição vale. O formulário de conta grava o saldo derivado que o aparelho via; reaplicá-lo depois da criação contaria de novo as transações já lançadas (940 × 970 na sonda p2). Com o alvo existente, a edição de saldo segue como hoje.
- **Chaves próprias (revisão, achado 2):** a checagem de alvo existente nos quatro ramos `ACCOUNT_UPDATED`/`ACCOUNT_DELETED`/`TRANSACTION_UPDATED`/`TRANSACTION_DELETED` e as consultas às pendências/marcas usam `hasOwnProperty`, para um id como `"constructor"`/`"toString"` não achar algo do protótipo. Os `*_CREATED` não checam alvo existente (sem mudança).
- **Conta excluída:** `applyTransactionToAccounts` já ignora conta ausente; excluir (ou criar) lançamento cuja conta foi excluída não quebra (testado).
- **Pendência sem alvo:** não muda nenhuma parte pública do estado e não vai para a Quarentena (só fica em `outOfOrder`).
- **Testes:** `packages/domain/__tests__/outOfOrder.test.ts` (28: todas as linhas da matriz com saldo, transferência, status pendente/confirmado, exclusão seguida de edição, `C, D, U(99)` sem pendência, `C D U C` × `D C C'`, `"constructor"` e `"toString"` excluídos antes da criação, `balance` da edição pendente ignorado, conta excluída, imutabilidade com `deepFreeze`, ordem trocada × ordem normal com o mesmo estado público) e `src/context/__tests__/replay.outOfOrder.test.ts` (9: relógio do aparelho adiantado pelo `replayAllEvents` para lançamento e conta; renomear conta com `{name, balance: 970}` às T+5m contra criação às T+10m e despesa às T+11m → saldo 970 e nome novo; exclusão pendente de lançamento em Quarentena `future_timestamp` antes e depois da liberação; alvo que nunca chega sem Quarentena; as 120 ordens de chegada — reconfere a ordem total da 3.4 com o saldo da 3.7; log de entrada não alterado).
- **Teste existente ajustado:** `replay.order.test.ts` › "timestamp em texto ou não finito…" afirmava que um `ACCOUNT_UPDATED` com horário NaN (= 0, antes da criação) não tinha efeito — exatamente o comportamento que esta story corrige. Agora a edição vale (nome "Primeiro"; o `balance` da edição pendente é ignorado) e o saldo segue 4800, o que ainda prova que NaN é ordenado como 0 (no fim do log o saldo seria 1).
- **Verificação (depois da revisão):** `npx vitest run` → 74 arquivos / 1478 testes, todos passando (baseline 72 / 1441); `npx tsc --noEmit` → sem erros. Sondas rodadas de novo: p2 → saldo 970 e nome Nubank; Quarentena → pendente antes, excluída depois. A p3 agora lança erro na última linha porque, pela decisão acima, `t1` não existe depois de `C D U C`.

