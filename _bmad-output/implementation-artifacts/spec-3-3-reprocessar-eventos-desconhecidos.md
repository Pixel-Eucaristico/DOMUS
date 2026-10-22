---
title: 'Story 3.3: reprocessar eventos desconhecidos depois de atualizar o app'
type: 'feature'
created: '2026-10-22'
status: 'in-progress'
baseline_commit: '715334e'
route: 'one-shot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-2-quarentena-no-replay.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-22-tipo-desconhecido.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Um aparelho com versão antiga recebe pelo sync eventos de um tipo que ele ainda não conhece. Esses eventos não podem se perder: quando o usuário atualizar o app, eles têm de passar a valer.

**Approach:** Com as Stories 3.1 e 3.2, o evento de tipo desconhecido já é gravado no log e o estado é sempre refeito a partir do log inteiro, então uma versão que conhece o tipo o aplica na próxima abertura, sem migração. Esta story prova isso com testes e fecha as brechas: nenhum caminho do app apaga ou reescreve um evento desconhecido, e a Quarentena distingue "tipo desconhecido" (vai ser reprocessado) dos outros motivos (continua em Quarentena).

## Boundaries & Constraints

**Always:** o replay aceita, só para teste, o conjunto de tipos conhecidos e os reducers por injeção (sem mudar o comportamento do app); o evento reprocessado entra na ordem em que está no log, com o seu `timestamp` original; um evento que passa a ser conhecido mas tem payload inválido vai para a Quarentena como `invalid_payload`; só `restoreFromBackup` e "resetar app" apagam o log, como hoje.

**Never:** apagar, reescrever ou mover eventos do log para reprocessar; guardar a Quarentena; tela nova.

## I/O & Edge-Case Matrix

| Cenário | Versão antiga | Versão nova |
|---|---|---|
| Tipo novo válido | Quarentena "tipo desconhecido"; evento no log | aplicado, Quarentena vazia |
| Tipo novo com payload ruim | Quarentena "tipo desconhecido" | Quarentena `invalid_payload` |
| Outro motivo (envelope inválido) | Quarentena | continua em Quarentena |
| Ordem | eventos A (conhecido), X (novo), B (conhecido) | estado igual ao de aplicar A, X, B nessa ordem |
| Sync | X chega pelo relay | gravado (Story 3.1) e aplicado após a atualização |

</frozen-after-approval>

## Code Map

- `src/context/replay.ts` -- `replayAllEvents`, `KNOWN_EVENT_TYPES`, Quarentena
- `src/modules/syncPayload.ts` -- importação (Story 3.1)
- `src/hooks/useEventStore.ts`, `packages/storage/src/eventStore.ts` -- únicos pontos que apagam o log

## Tasks & Acceptance

**Execution:**
- [ ] Injeção opcional de tipos e reducers no replay (padrão = os do app) e testes da matriz
- [ ] Teste de ponta a ponta: evento novo passa por `selectEventsToImport` e pelo replay "antigo" e "novo"

**Acceptance Criteria:**
- Given um evento de tipo desconhecido na Quarentena, when abro uma versão que conhece o tipo, then ele é aplicado
- Given um evento inválido por outro motivo, when atualizo, then continua em Quarentena

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas
