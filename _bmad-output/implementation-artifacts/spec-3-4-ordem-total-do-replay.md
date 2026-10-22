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
- [x] Comparador único (`compareEvents`) e uso em todos os `sort`, no SQL e no replay
- [x] Testes da matriz, incluindo 3 ordens de chegada e o recarregamento do SQLite (com o SQL do `eventStore` num SQLite de teste, se viável; senão, comparando a ordem do SQL simulada)

**Acceptance Criteria:**
- Given o mesmo conjunto de eventos em 3 ordens de chegada, when há replay, then o estado é o mesmo
- Given um log recarregado do SQLite, when há replay, then o estado é igual ao da memória

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Eventos do mesmo aparelho no mesmo milissegundo ficam em ordem aleatória (o `id` desempata pelo sufixo aleatório de `generateId`) | medium | 5.079 de 10.000 pares invertidos; categorias padrão e rajadas de gamificação embaralham. **patch**: `generateId` com contador monotônico de largura fixa logo após o prefixo de tempo, para ids novos ordenarem na ordem de criação; ids antigos mantêm o desempate atual (determinístico). |
| Evento com `deviceId` "local"/vazio vindo de fora (relay ou backup de outro aparelho) vira o id de cada aparelho e a ordem diverge | high | Sonda: saldos 4.900 × 5.000. **patch**: o sync recusa `deviceId` "local" (e vazio, já recusado); o backup exportado leva os eventos normalizados (id real). |
| No mesmo aparelho, evento "local" muda de posição ao reabrir | medium | **patch**: `dispatch` e `importEvents` normalizam antes de ordenar, como a hidratação. |
| Eventos criados com `deviceId` nulo ficam "local" a sessão inteira | low-medium | **patch**: `dispatch` carimba o id do aparelho quando já conhecido. |
| Backup com ids repetidos: memória com dois, SQLite com um | medium | **patch**: `restoreFromBackup` deduplica por id (fica o primeiro, como o `INSERT OR IGNORE`). |
| Horário texto/não inteiro vindo de backup vale aqui mas não é publicado | low | **patch**: texto numérico vira número na restauração. |
| SQL ≠ `compareEvents` para texto não numérico, `Infinity`, `NaN` e caracteres fora do BMP | low | A memória sempre reordena. **patch**: corrigir o comentário do SQL. |
| Testes "SQLite × memória" não falham por ordem do SQL; dublê compara o comparador com ele mesmo | low (gap) | **patch**: teste de ordem de criação no mesmo milissegundo; o resto **defer** (precisa de SQLite real no Node 20). |
| Ligação dos `sort` nos hooks sem teste | low (gap) | **defer**: `react-native`; o replay ordena sozinho e é testado. |

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas

## Implementation Notes

- **Comparador:** `compareEvents`, `eventTimestampKey` e `sortEvents` em `packages/storage/src/eventOrder.ts` (puro, sem dependências), porque o `memoryAdapter` de `packages/storage` também precisa dele e `packages/*` não importa de `src/`. `src/context/localEventLog.ts` reexporta `compareEvents`; `eventSortKey` (3.2) passou a delegar a `eventTimestampKey`. Texto comparado por unidade de código (`a < b ? -1 : a > b ? 1 : 0`); `deviceId`/`id` fora de texto viram `String(v)` (ausente → `""`; `String` que lança → `""`).
- **Uso:** os três `sort` de `useEventStore` (`dispatch`, `importEvents`, `restoreFromBackup`), o de `useGamificationEffects` (categorias padrão), o de `AppStateProvider` (recuperação de XP) e o `memoryAdapter` (dublê do SQLite). A hidratação e o `restoreFromBackup` reordenam em memória **depois** de `normalizeStoredEvents` ("local" → id do aparelho muda o desempate). `replayAllEvents` aplica sobre `sortEvents(events)` (cópia); as `ReplayOptions` da 3.3 seguem iguais. Nenhum outro `sort` ordena o log (`syncStorage.ts` ordena só ids para a assinatura do conjunto).
- **SQLite:** `SELECT_ALL_SQL` e `SELECT_SINCE_SQL` (agora exportados) usam `ORDER BY timestamp ASC, deviceId ASC, id ASC`, sem `COLLATE` (BINARY = `memcmp` dos bytes UTF-8). Para ASCII é idêntico à comparação por unidade de código do JS. Diferenças conhecidas, fora do caso real (ids e deviceIds do app são ASCII): (1) com caracteres não-BMP (emoji, U+10000+) contra caracteres em U+E000–U+FFFF, UTF-8 ordena por code point e o JS por unidade UTF-16 (surrogates D800–DFFF vêm antes de E000); (2) timestamp em texto não numérico fica como TEXT na coluna INTEGER e o SQLite o põe depois de todos os números, enquanto a memória o trata como 0. Por isso a memória sempre reordena com `compareEvents` depois de carregar — o estado nunca depende só da ordem do SELECT.
- **Testes:** `packages/storage/__tests__/eventOrder.test.ts` (desempates, código × idioma, timestamp texto/NaN, valores estranhos, estabilidade, não mutação, `ORDER BY` exato das duas queries, `memoryAdapter`, e o SQL real num SQLite em memória) e `src/context/__tests__/replay.order.test.ts` (log com `ACCOUNT_UPDATED` × `TRANSACTION_CREATED` no mesmo horário em aparelhos diferentes e dois `TRANSACTION_UPDATED` na mesma transação; 3 ordens de chegada → estado deep-equal; entrada não alterada; opções da 3.3; recarregamento pelo dublê e pelo SQLite real → mesmo estado da memória). Não há `better-sqlite3` nem `sql.js`; o SQLite real é o `node:sqlite` embutido do Node ≥ 22.5 (nenhuma dependência nova) — o teste usa `it.skipIf` e é pulado na CI (Node 20), onde vale a checagem da string do SQL e o `memoryAdapter`.
- **Testes existentes ajustados** (a ordem passou a ser a total, não a do array): `replay.test.ts` (ordem das contas com timestamps 5e6 × 1,5e12; comparação com o replay anterior sobre `sortEvents(log)`; ordem da Quarentena desempatada por id) e `replay.reprocess.test.ts` (ordem da Quarentena segue o timestamp).
- **Verificação:** `npx vitest run` → 66 arquivos / 1247 testes, todos passando (baseline 64 / 1229); `npx tsc --noEmit` → sem erros.

