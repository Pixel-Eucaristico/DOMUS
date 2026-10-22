---
title: 'Story 3.2: isolar cada evento no replay e registrar a Quarentena'
type: 'bugfix'
created: '2026-10-22'
status: 'in-progress'
baseline_commit: 'b3e5acd'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-22-tipo-desconhecido.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-1-validar-envelope-na-importacao.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `replayAllEvents` (`src/context/AppStateProvider.tsx`) aplica todos os eventos num `useMemo`, sem `try/catch`. Um só evento defeituoso no log (payload nulo, campo faltando) faz um reducer lançar erro e o app não abre — e, pelo sync, isso chega a todos os aparelhos do grupo.

**Approach:** Levar o replay para um módulo puro que aplica cada evento isoladamente: o que lança erro, tem envelope inválido ou tipo desconhecido vai para a Quarentena (`id`, `type`, motivo) e não altera o estado; os demais são aplicados normalmente. A Quarentena é derivada do replay (como o resto do estado), fica em memória e aparece no DebugTools para diagnóstico.

## Boundaries & Constraints

**Always:** replay puro e testável no vitest (sem `react-native`); evento defeituoso não deixa efeito parcial (o estado é o mesmo de um log sem ele); envelope conferido com o `validateEnvelope` da Story 3.1; tipo desconhecido = fora da união de todos os mapas de tipos dos pacotes (domínio, gamificação, onboarding, temporada, wishlist, personalidade) → Quarentena com motivo "tipo desconhecido", sem apagar nem alterar o log (a Story 3.3 reprocessa); tipo conhecido sem reducer neste replay continua ignorado sem ir para a Quarentena; o motivo nunca inclui o conteúdo do payload; mesma ordem de aplicação de hoje.

**Never:** persistir a Quarentena (é estado derivado); apagar ou reescrever eventos do log; mudar reducers ou a ordem total do replay (Story 3.4); tela nova para o usuário final.

## I/O & Edge-Case Matrix

| Cenário | Log | Resultado |
|---|---|---|
| Log saudável | eventos válidos | mesmo estado de hoje, Quarentena vazia |
| Payload nulo | 1 `TRANSACTION_CREATED` com `payload: null` entre válidos | app abre; Quarentena com `id`, tipo e motivo; estado igual ao do log sem ele |
| Reducer lança erro | payload sem campo que o reducer lê | Quarentena com a mensagem do erro; demais aplicados |
| Tipo desconhecido | `FUTURE_EVENT_X` | Quarentena "tipo desconhecido"; evento continua no log |
| Vários defeituosos | 3 ruins espalhados | os 3 na Quarentena, na ordem do log |
| Modo demo | eventos do demo | mesmo replay, mesmo isolamento |

</frozen-after-approval>

## Code Map

- `src/context/AppStateProvider.tsx` -- `replayAllEvents` e o `useMemo` que o chama; contexto exposto às telas
- `packages/events/src/validateEnvelope.ts` -- validação da Story 3.1
- `packages/*/src/types.ts` -- mapas de tipos (`EVENT_TYPES`, `GAMIFICATION_EVENTS`, `ONBOARDING_EVENTS`, `SEASON_EVENTS`, `WISHLIST_EVENTS`, `PERSONALITY_EVENTS`)
- `src/components/debug/DebugTools.tsx` -- onde mostrar a Quarentena

## Tasks & Acceptance

**Execution:**
- [ ] Replay puro com isolamento por evento e Quarentena + testes da matriz
- [ ] `AppStateProvider` usa o módulo e expõe a Quarentena; DebugTools mostra quantidade e lista (`id`, tipo, motivo)

**Acceptance Criteria:**
- Given um evento de payload nulo no log, when o app abre, then abre, o evento está na Quarentena e o estado é o mesmo sem ele
- Given um evento de tipo desconhecido, when há replay, then ele fica na Quarentena e não é apagado do log

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas
