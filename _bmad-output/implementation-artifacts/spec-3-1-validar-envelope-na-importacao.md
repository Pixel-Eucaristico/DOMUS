---
title: 'Story 3.1: validar o envelope e o tipo na importação'
type: 'bugfix'
created: '2026-10-22'
status: 'done'
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
- [x] Função pura de validação + testes cobrindo a matriz
- [x] Aplicar em `parseSyncPayload` (por item) e em `importEvents`

**Acceptance Criteria:**
- Given eventos recebidos pelo sync, when algum tem envelope malformado, then só os válidos são gravados e o resto do lote segue
- Given um tipo bem formado e desconhecido, when chega pelo sync, then é gravado

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Nenhum evento produzido hoje é recusado | — | Dois revisores enumeraram todos os pontos que criam eventos. |
| A validação não tem teste de ligação em `parseSyncPayload` nem em `importEvents` | medium (gap) | **patch** (aplicado): `parseSyncPayload` exportado e testado; o laço do `importEvents` vira helper puro (`selectEventsToImport`) testado com lote misto e ids repetidos. |
| `timestamp` absurdo (1e300) aceito e gravado como cursor do sync | medium | Trava a assinatura ao vivo. **patch** (aplicado): inteiro seguro entre 01/01/2020 e 01/01/2100 em ms (também recusa segundos); a regra de relógio fica para a 3.5. |
| O mesmo aviso repetido a cada pull (8 s) | medium-low | **patch** (aplicado): avisar uma vez por evento do relay na sessão e logar o total por pull. |
| O aparelho que envia não confere antes de publicar | medium-low | Os outros recusam para sempre e os aparelhos divergem. **patch** (aplicado): `publishSyncEvents` pula e avisa o envelope inválido. |
| `id`/`type` só com espaços aceitos | low | **patch** (aplicado). |
| Log sem escapar quebra de linha; corte de 64 parte emoji | low | **patch** (aplicado). |
| Asserções dentro de `if` no teste | low | **patch** (aplicado). |
| Campos extras do envelope descartados | low | **defer** para a 3.8: o SQLite só guarda os 6 campos hoje, então nada se perde agora. |
| Versões anteriores a 03/2026 não verificadas (clone raso) | low | **reject**: o formato do `publishSyncEvents` é o mesmo desde a v1.4.0. |

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas

## Implementation Notes

- `packages/events/src/validateEnvelope.ts` (exportado em `packages/events/index.ts`): `validateEnvelope` devolve `{ ok: true, event }` normalizado (só os 6 campos; `signature` ausente ou não texto vira `""`) ou `{ ok: false, reason, id?, type? }`. `id`/`type`/`deviceId` recusados se vazios ou só espaços (o valor original é preservado). `timestamp` precisa ser inteiro seguro em ms em [01/01/2020, 01/01/2100) (`MIN_/MAX_ENVELOPE_TIMESTAMP_MS`); recusa 1e300, segundos e frações. `partitionEnvelopes` valida item a item; `describeRejection` loga só id/type/motivo, com caracteres de controle escapados e corte em 64 code points (`Array.from`).
- `src/modules/syncPayload.ts` (puro): `parseSyncPayloadDetailed` não lança em JSON malformado; `selectEventsToImport(events, existingIds)` é o laço do `importEvents` (valida, ignora ids já gravados e repetidos no lote, mantém a ordem, não muta `existingIds`, conta descartes e repetidos); `createWarnOnce` (Set limitado a 1000, esquece os mais antigos); `describePullDiscards` gera a linha "N descartados de M".
- `nostrSync.ts`: `parseSyncPayload(decrypted, relayEventId?)` exportado; avisos por item saem uma vez por evento do relay na sessão; `pullSyncEvents` loga uma linha de total por pull quando há descartes; `publishSyncEvents` valida antes de publicar e pula (com aviso id/type/motivo) o envelope inválido — o retorno conta só os publicados.
- `useEventStore.importEvents` chama `selectEventsToImport` e grava exatamente `toAppend`; retorno = nº de eventos novos.
- Testes: `packages/events/__tests__/validateEnvelope.test.ts`, `src/modules/__tests__/syncPayload.test.ts`, `src/modules/__tests__/nostrSync.test.ts` (mocka `nostr-tools/pool`; publish → pull ponta a ponta, lote misto + JSON malformado num evento do relay, aviso único por evento). `npx vitest run`: 59 arquivos / 1152 testes passando; `npx tsc --noEmit`: 0 erros.
- Campos extras do envelope continuam descartados (defer para a 3.8, conforme o triage).
