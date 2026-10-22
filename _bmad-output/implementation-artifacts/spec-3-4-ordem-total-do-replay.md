---
title: 'Story 3.4: ordem total do replay em memória e no SQLite'
type: 'bugfix'
created: '2026-10-22'
status: 'in-progress'
baseline_commit: 'd393bc8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-2-quarentena-no-replay.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A ordem do replay só usa `timestamp`. Dois eventos com o mesmo horário (comum em lotes, como as categorias padrão, ou em aparelhos diferentes) ficam na ordem de chegada, que muda de aparelho para aparelho e entre a memória e o SQLite. Como o estado vem da ordem dos eventos, dois aparelhos podem mostrar saldos diferentes para o mesmo log.

**Approach:** Um único comparador puro `(timestamp, deviceId, id)` usado em todo lugar que ordena o log: no SQLite (`ORDER BY timestamp, deviceId, id`), nos `sort` da memória e dentro do próprio `replayAllEvents`, que passa a ordenar uma cópia antes de aplicar. Assim o estado não depende da ordem do array.

## Boundaries & Constraints

**Always:** comparador puro e testável no vitest; `timestamp` comparado como número (texto convertido; não finito = 0, como o `eventSortKey` da 3.2); `deviceId` e `id` comparados como texto por código (sem `localeCompare`, que muda com o idioma do aparelho); empate total mantém a ordem (sort estável); o replay ordena uma cópia e nunca altera o array recebido; a ordem do SQLite e a da memória são a mesma para o mesmo log. O `deviceId` usado no desempate é o já normalizado na memória ("local" → id do aparelho); o SQLite usa o gravado, então a memória reordena depois de normalizar.

**Never:** reescrever `timestamp`, `deviceId` ou `id` de eventos gravados; mudar regras de timestamp no futuro (Story 3.5) ou o cursor dos relays (3.6).

## I/O & Edge-Case Matrix

| Cenário | Entrada | Resultado |
|---|---|---|
| Mesmo horário, aparelhos diferentes | A(t, "dev-b", "1"), B(t, "dev-a", "2") | B antes de A em qualquer ordem de chegada |
| Mesmo horário e aparelho | ids "b" e "a" | "a" antes de "b" |
| Três ordens de chegada | mesmo conjunto embaralhado 3 vezes | mesmo estado (deep-equal) |
| SQLite × memória | log gravado e recarregado | mesmo estado que o da memória |
| Timestamp texto / não finito | "1700000000000" / NaN | ordenados como número / como 0 |

</frozen-after-approval>

## Code Map

- `packages/storage/src/eventStore.ts` -- `SELECT_ALL_SQL`, `SELECT_SINCE_SQL`
- `src/hooks/useEventStore.ts` -- três `sort`, hidratação e `restoreFromBackup`
- `src/hooks/useGamificationEffects.ts`, `src/context/AppStateProvider.tsx` -- `sort` ao acrescentar eventos
- `src/context/localEventLog.ts` -- `eventSortKey`
- `src/context/replay.ts` -- `replayAllEvents`

## Tasks & Acceptance

**Execution:**
- [ ] Comparador único (`compareEvents`) e uso em todos os `sort`, no SQL e no replay
- [ ] Testes da matriz, incluindo 3 ordens de chegada e o recarregamento do SQLite (com o SQL do `eventStore` num SQLite de teste, se viável; senão, comparando a ordem do SQL simulada)

**Acceptance Criteria:**
- Given o mesmo conjunto de eventos em 3 ordens de chegada, when há replay, then o estado é o mesmo
- Given um log recarregado do SQLite, when há replay, then o estado é igual ao da memória

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas
