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
- [x] Replay puro com isolamento por evento e Quarentena + testes da matriz
- [x] `AppStateProvider` usa o módulo e expõe a Quarentena; DebugTools mostra quantidade e lista (`id`, tipo, motivo)

**Acceptance Criteria:**
- Given um evento de payload nulo no log, when o app abre, then abre, o evento está na Quarentena e o estado é o mesmo sem ele
- Given um evento de tipo desconhecido, when há replay, then ele fica na Quarentena e não é apagado do log

## Spec Change Log

- **Conferência local mais tolerante (revisão):** o `validateEnvelope` da 3.1 vale para o que chega pelo sync. No replay do log local, a conferência é só de forma (`id` e `type` texto não vazio, `payload` objeto), depois de normalizar valores antigos (timestamp texto → número; `deviceId` vazio/espaços → id do aparelho). Horário fora de 2020–2100 ou em segundos não vai para a Quarentena: eventos criados com o relógio errado continuam valendo, como antes.
- **Payload por tipo:** "payload sem campo que o reducer lê" passa a ser conferido antes do reducer (campos que o reducer usa, com tipo certo), porque a maioria dos reducers não lança erro e grava `NaN`/`undefined`.

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Relógio antes de 2020 manda eventos locais para a Quarentena e somem do app | high | **patch** (Change Log): conferência local só de forma, com normalização. |
| Categorias padrão recriadas sem fim quando os eventos não aplicam | high | **patch**: o efeito só cria se não há nenhum `CATEGORY_CREATED` no log, e uma vez por sessão. Mesmo cuidado nos efeitos de troféu. |
| Payload sem campo não lança erro: `TRANSACTION_CREATED {}` derruba o `budget`, `XP_GAINED {}` deixa XP `NaN` e trava em `getLevelInfo` | high | **patch**: conferência de payload por tipo (os 37 tipos) antes do reducer; `getLevelInfo` protegido contra valor não finito; teste com `{}` para cada tipo. |
| Eventos do sync antigo (antes da 3.1) com timestamp texto/segundos ou `deviceId` em branco | medium | **patch** pela mesma normalização. |
| `restoreFromBackup` não migra `deviceId`/payload texto como a hidratação | low | **patch**: mesma migração. |
| Item que não é objeto no backup da web apaga o log inteiro na hidratação; `e.id?.startsWith` com id não texto | medium | **patch**: item ruim é pulado (vai para a Quarentena), o resto carrega. |
| Teste com eventos do `createEvent` (inclusive `deviceId "local"`) | medium (gap) | **patch**. |
| Corte e escape do motivo sem teste; escape diferente entre 3.1 e replay | low | **patch**. |
| Lista da Quarentena sem limite no DebugTools | low | **patch**: mostra as 50 primeiras e o total. |
| "Sem efeito parcial" sem caso real (nenhum tipo em dois mapas) | low | **defer**: testar quando um tipo for compartilhado. |
| Quarentena não persistida; ligação no `AppStateProvider` e DebugTools sem teste | low (gap) | **defer**: precisa de render com `react-native`; conferido no DebugTools. |
| Em release o usuário não vê a Quarentena | low | **defer** (D30): aviso ao usuário fica para outra story. |

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas

## Implementation Notes

- **Módulo puro:** `src/context/replay.ts` (sem `react-native`) exporta `replayAllEvents(events)` → `{ domain, gamification, onboarding, season, wishlist, quarantine }`, `KNOWN_EVENT_TYPES`, `UNKNOWN_TYPE_REASON` e o tipo `QuarantineEntry` (`id`, `type`, `kind`, `reason`). `kind` ∈ `invalid_envelope` | `unknown_type` | `reducer_error` — facilita a Story 3.3 reprocessar só os de tipo desconhecido.
- **Por evento, na ordem do log:** (1) `validateEnvelope` da 3.1 — recusado vai para a Quarentena com motivo em pt-BR derivado do `reason` (ex.: "envelope inválido: payload ausente ou não é objeto"); `id`/`type` vêm do diagnóstico da 3.1 ou `"?"`. (2) Tipo fora da união `EVENT_TYPES ∪ GAMIFICATION_EVENTS ∪ ONBOARDING_EVENTS ∪ SEASON_EVENTS ∪ WISHLIST_EVENTS ∪ PERSONALITY_EVENTS` → "tipo desconhecido". (3) Todos os reducers que casam o tipo calculam o próximo estado dentro de um `try`; os cinco estados só são confirmados juntos se nenhum lançar (sem efeito parcial — os reducers já são imutáveis). Erro → motivo `erro no reducer: <Nome>: <mensagem>`, cortado em 160 code points e com caracteres de controle escapados; o payload nunca é lido para montar o motivo. `ARCHETYPE_UPDATED` (personalidade, sem reducer aqui) continua ignorado e fora da Quarentena.
- **Mudança de comportamento intencional:** eventos que antes eram aplicados apesar de envelope inválido (ex.: timestamp em segundos ou fora de 2020–2100, `deviceId` vazio, payload não objeto) agora vão para a Quarentena. Eventos locais (`Date.now()`, `deviceId` real ou `"local"`) e o seed do demo passam.
- **Provider:** `AppStateProvider` chama o módulo no mesmo `useMemo` (log real ou eventos do demo) e expõe `quarantine` no contexto — derivado, só em memória, nunca persistido; o log não é alterado.
- **DebugTools:** aba "state" ganhou a seção "Quarentena (N)" com a lista (`tipo`, `id`, `motivo`) ou "Nenhum evento em quarentena.".
- **Testes:** `src/context/__tests__/replay.test.ts` (9 casos) cobre todas as linhas da matriz, comparando com uma cópia da implementação anterior (`legacyReplay`) no log saudável e em `DEMO_SEED_EVENTS`; inclui demo com evento defeituoso, item que não é objeto, e garante que o motivo não contém o conteúdo do payload.
- **Verificação:** `npx vitest run` → 60 arquivos, 1161 testes passando; `npx tsc --noEmit` → sem erros (exit 0).
