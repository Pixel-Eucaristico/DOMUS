---
title: 'Story 3.1: validar o envelope e o tipo na importação'
type: 'bugfix'
created: '2026-10-22'
status: 'in-progress'
baseline_commit: '5c978f4'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-22-tipo-desconhecido.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O sync grava no log qualquer JSON que chega dos relays: `parseSyncPayload` (`src/modules/nostrSync.ts`) só copia os campos, e `importEvents` (`src/hooks/useEventStore.ts`) grava sem checar. Um evento com `payload` nulo ou sem `id` entra no SQLite e pode quebrar o replay em todos os aparelhos do grupo.

**Approach:** Uma função pura que valida o envelope (`id`, `type`, `timestamp`, `deviceId`, `payload`) e é aplicada a cada evento antes de gravar. Envelope malformado é descartado; tipo bem formado e desconhecido é gravado (decisão do dono, Sprint Change de 22/10).

## Boundaries & Constraints

**Always:** validação pura, sem `react-native`, testável no vitest; regras: `id` texto não vazio; `type` texto não vazio; `timestamp` número finito > 0; `deviceId` texto não vazio; `payload` objeto (não nulo, não array); `signature` ausente vira `""`; cada item do lote validado sozinho (um JSON malformado ou um item ruim não derruba os outros); a validação roda em `parseSyncPayload` e de novo em `importEvents` (toda entrada pelo sync); descartes contados e registrados em log de diagnóstico sem o conteúdo do payload.

**Never:** recusar `type` desconhecido; mudar o replay (Story 3.2), timestamps no futuro (3.5) ou `schemaVersion` (3.8); mexer em `packages/sync`; mudar o backup do Drive ou a restauração (outro fluxo).

## I/O & Edge-Case Matrix

| Cenário | Entrada | Resultado |
|---|---|---|
| Evento válido | envelope completo | gravado |
| Payload nulo | `payload: null` | descartado |
| Sem `id` | `id` ausente ou `""` | descartado |
| `type` inválido | ausente, `""`, número | descartado |
| `type` desconhecido | `"FUTURE_EVENT_X"` bem formado | gravado |
| `timestamp` inválido | texto, `NaN`, `0` | descartado |
| Lote misto | 3 válidos + 2 ruins | 3 gravados |
| JSON malformado | texto que não é JSON num evento do relay | ignorado, os demais seguem |
| Sem `signature` | campo ausente | gravado com `""` |

</frozen-after-approval>

## Code Map

- `src/modules/nostrSync.ts` -- `parseSyncPayload`, `pullSyncEvents`, `subscribeToSyncEvents`
- `src/hooks/useEventStore.ts` -- `importEvents`
- `packages/events/src/` -- tipos do envelope (`SyncEvent`); lugar da função pura

## Tasks & Acceptance

**Execution:**
- [ ] Função pura de validação + testes cobrindo a matriz
- [ ] Aplicar em `parseSyncPayload` (por item) e em `importEvents`

**Acceptance Criteria:**
- Given eventos recebidos pelo sync, when algum tem envelope malformado, then só os válidos são gravados e o resto do lote segue
- Given um tipo bem formado e desconhecido, when chega pelo sync, then é gravado

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas
