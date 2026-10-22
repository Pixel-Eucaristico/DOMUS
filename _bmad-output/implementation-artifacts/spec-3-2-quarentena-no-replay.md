---
title: 'Story 3.2: isolar cada evento no replay e registrar a Quarentena'
type: 'bugfix'
created: '2026-10-22'
status: 'done'
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
| Relógio antes de 2020 manda eventos locais para a Quarentena e somem do app | high | **patch** (aplicado) (Change Log): conferência local só de forma, com normalização. |
| Categorias padrão recriadas sem fim quando os eventos não aplicam | high | **patch** (aplicado): o efeito só cria se não há nenhum `CATEGORY_CREATED` no log, e uma vez por sessão. Mesmo cuidado nos efeitos de troféu. |
| Payload sem campo não lança erro: `TRANSACTION_CREATED {}` derruba o `budget`, `XP_GAINED {}` deixa XP `NaN` e trava em `getLevelInfo` | high | **patch** (aplicado): conferência de payload por tipo (os 37 tipos) antes do reducer; `getLevelInfo` protegido contra valor não finito; teste com `{}` para cada tipo. |
| Eventos do sync antigo (antes da 3.1) com timestamp texto/segundos ou `deviceId` em branco | medium | **patch** (aplicado) pela mesma normalização. |
| `restoreFromBackup` não migra `deviceId`/payload texto como a hidratação | low | **patch** (aplicado): mesma migração. |
| Item que não é objeto no backup da web apaga o log inteiro na hidratação; `e.id?.startsWith` com id não texto | medium | **patch** (aplicado): item ruim é pulado (vai para a Quarentena), o resto carrega. |
| Teste com eventos do `createEvent` (inclusive `deviceId "local"`) | medium (gap) | **patch** (aplicado). |
| Corte e escape do motivo sem teste; escape diferente entre 3.1 e replay | low | **patch** (aplicado). |
| Lista da Quarentena sem limite no DebugTools | low | **patch** (aplicado): mostra as 50 primeiras e o total. |
| "Sem efeito parcial" sem caso real (nenhum tipo em dois mapas) | low | **defer**: testar quando um tipo for compartilhado. |
| Quarentena não persistida; ligação no `AppStateProvider` e DebugTools sem teste | low (gap) | **defer**: precisa de render com `react-native`; conferido no DebugTools. |
| Em release o usuário não vê a Quarentena | low | **defer** (D30): aviso ao usuário fica para outra story. |

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas

## Implementation Notes

- **Módulo puro:** `src/context/replay.ts` (sem `react-native`) exporta `replayAllEvents(events)` → `{ domain, gamification, onboarding, season, wishlist, quarantine }`, `KNOWN_EVENT_TYPES`, `UNKNOWN_TYPE_REASON`, `MAX_REASON_LENGTH` e `QuarantineEntry` (`id`, `type`, `kind`, `reason`). `kind` ∈ `invalid_envelope` | `unknown_type` | `invalid_payload` | `reducer_error` (a Story 3.3 pode reprocessar só `unknown_type`).
- **Por evento, na ordem do log:**
  1. `validateLocalEvent` (`src/context/replayValidation.ts`): só forma — `id` e `type` texto não vazio (com `trim`), `payload` objeto. Antes normaliza: payload em texto JSON → objeto; timestamp em texto → número quando finito. Timestamp antes de 2020, em segundos ou não finito e `deviceId` vazio **não** recusam. O `validateEnvelope` estrito da 3.1 continua só no sync (não foi afrouxado).
  2. Tipo fora da união dos 6 mapas (37 tipos) → "tipo desconhecido".
  3. `validatePayload` (`PAYLOAD_SPECS`): para cada tipo, os campos que o reducer e as derivações do provider (`calculate503020`, `getLevelInfo`, saldo total) leem, com o tipo primitivo certo (número = finito; aninhados como `item.listId`, `items[i].amount`). Falha → `invalid_payload` com motivo `payload inválido: campo "<caminho>" ausente ou com tipo errado` — nomeia o campo, nunca o valor. `ONBOARDING_FINISHED`, `SEASON_ENDED` e `ARCHETYPE_UPDATED` não leem payload e seguem válidos com `{}`.
  4. Reducers no `try`; os cinco estados só são confirmados juntos. Erro → `reducer_error` com `erro no reducer: <Nome>: <mensagem>`.
- **Texto do diagnóstico:** `id`, `type` e motivos usam o `diagnosticString` da 3.1 (agora exportado, com limite opcional): corte por code points com "…" e mesmo escape (`\n`, `\uXXXX`). `id`/`type` em 64, motivo em 160.
- **`getLevelInfo` / `calculateLevel`:** XP não finito ou negativo vale 0 (antes `NaN` travava num laço infinito).
- **Efeitos (`useGamificationEffects`):** categorias padrão só se o log não tem nenhum `CATEGORY_CREATED` (`hasCategoryEvents`, calculado no provider sobre `allEvents`, inclusive os em Quarentena) e no máximo uma vez por sessão (ref). Troféu mensal, seleção sazonal e conclusão sazonal guardam numa ref o que já despacharam (por modo demo/real + troféu + mês) e não repetem. As guardas são zeradas quando o log fica vazio (ex.: "resetar app"). Fora isso, o comportamento é o mesmo.
- **Hidratação e backup (`useEventStore` + `src/context/localEventLog.ts`):** `normalizeStoredEvents` pula item que não é objeto (registra só os índices) em vez de zerar o log; migra `deviceId` `"local"`/vazio/espaços para o id do aparelho; payload em texto JSON vira objeto. `restoreFromBackup` aplica a mesma normalização em memória; grava os itens (objetos) como vieram do backup, sem reescrever conteúdo, ordenados por `eventSortKey` (texto → número, não finito = 0). `AppStateProvider` confere `typeof e.id === "string"` antes de `startsWith`.
- **Divergência com o Triage Log:** item que não é objeto na hidratação é **pulado** (com log do índice), não colocado na Quarentena: sem `id`/`type` não há o que diagnosticar e manter `null` em `allEvents` quebraria ordenação e outros consumidores.
- **Provider / DebugTools:** `quarantine` exposto no contexto (derivado, só memória). DebugTools, aba "state": "Quarentena (N)" com as 50 primeiras (`tipo`, `id`, `motivo`) e "Mostrando 50 de N eventos." quando passa disso.
- **Limitação conhecida:** as guardas de troféu por sessão no modo demo valem até reiniciar o app (refazer o tour na mesma sessão não redespacha um troféu de demo já despachado).
- **Testes:** `src/context/__tests__/replay.test.ts` (57: matriz, comparação com a implementação anterior em log saudável, `DEMO_SEED_EVENTS` e eventos do `createEvent`; relógio 2019/5e6/texto/NaN; payload `{}` para cada um dos 37 tipos com checagem de `NaN` e das derivações; tipos errados; caminhos aninhados; escape e corte), `replay.reducerError.test.ts` (2, reducer simulado com `vi.mock`: sem efeito parcial e mensagem longa), `localEventLog.test.ts` (6), `packages/gamification/__tests__/levelEngineGuard.test.ts` (5).
- **Verificação:** `npx vitest run` → 63 arquivos, 1222 testes passando; `npx tsc --noEmit` → sem erros (exit 0).
