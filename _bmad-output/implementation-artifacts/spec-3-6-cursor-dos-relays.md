---
title: 'Story 3.6: separar o cursor de leitura dos relays do timestamp do evento'
type: 'bugfix'
created: '2026-10-26'
status: 'done'
baseline_commit: 'a1f45c5'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-5-timestamp-no-futuro.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O sync guarda como cursor (`lastPullTs`) o maior `timestamp` de domínio dos eventos importados e usa esse valor, em segundos, como `since` da assinatura ao vivo no relay. São relógios diferentes: o `timestamp` vem do aparelho que criou o evento; o `created_at` vem da publicação no relay. Um evento com horário adiantado (+25 h) empurra o cursor para o futuro e a assinatura ao vivo para de receber eventos até o relógio alcançar; um evento antigo publicado agora pode ficar fora da janela. Além disso, a assinatura ao vivo descarta o evento que chega enquanto outra importação está em andamento.

**Approach:** Um cursor próprio dos relays, guardado à parte, que só avança pelo `created_at` dos eventos recebidos do relay (no pull e na assinatura), com uma folga de sobreposição para não perder eventos no limite (a releitura é descartada pelo id). O `timestamp` de domínio não entra no cursor. A assinatura ao vivo não descarta eventos durante uma importação: eles entram numa fila e são importados em seguida.

## Boundaries & Constraints

**Always:** cursor em segundos do relay (`created_at`), numa chave nova do `AsyncStorage`; o cursor antigo (`lastPullTs`, baseado em `timestamp`) deixa de ser usado e é apagado; sem cursor, a assinatura começa em `agora − 60 s` como hoje; sobreposição fixa (constante única) ao montar o `since`; o cursor nunca anda para trás; lógica do cursor em funções puras testadas no vitest; releitura não duplica eventos (dedupe por id da Story 3.1/3.4).

**Never:** mudar o `timestamp` de evento; mexer em `packages/sync`; mudar o formato publicado no relay.

## I/O & Edge-Case Matrix

| Cenário | Entrada | Resultado |
|---|---|---|
| Evento novo e depois um antigo | relay entrega E1 (`timestamp` hoje, `created_at` T) e depois E0 (`timestamp` de ontem, `created_at` T+10) | os dois importados; cursor = T+10 |
| Evento com horário adiantado | E (`timestamp` +25 h, `created_at` T) | cursor = T (não vai para o futuro); assinatura segue recebendo |
| Sem cursor salvo | primeira vez / atualização do app | assinatura em `agora − 60 s`; pull completo como hoje |
| Releitura na sobreposição | evento já importado volta | ignorado pelo id |
| Evento ao vivo durante importação | chega com `isImporting` | entra na fila e é importado depois |
| Cursor antigo salvo | chave `lastPullTs` existente | ignorada e apagada |

</frozen-after-approval>

## Code Map

- `src/modules/nostrSync.ts` -- `pullSyncEvents`, `subscribeToSyncEvents` (filtro `since`)
- `src/context/useSyncEngine.ts` -- `lastPullTs`, `saveLastPullTs`, `pullFromRelays`, assinatura e `isImportingRef`
- `src/modules/syncPayload.ts` -- lógica pura do sync (lugar das funções do cursor)

## Tasks & Acceptance

**Execution:**
- [x] Funções puras do cursor (avançar, `since` com sobreposição, migração da chave antiga) + testes da matriz
- [x] `pullSyncEvents` e a assinatura informam o `created_at` dos eventos do relay; `useSyncEngine` usa o cursor novo
- [x] Fila para eventos ao vivo durante uma importação

**Acceptance Criteria:**
- Given um evento antigo chegando depois de um novo, when o sync roda, then os dois são importados
- Given um evento com horário adiantado, when é importado, then o cursor não vai para o futuro e a assinatura continua recebendo

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Trava de importação não é exclusiva: o pull pega e solta a trava que a fila ao vivo está usando (2 importações ao mesmo tempo) | medium | Sonda. **patch**: uma fila de promessas (mutex) única para pull, fila ao vivo, `pullNow` e `joinGroup`. — **aplicado** (`withLock` no `createSyncCoordinator`; `isImportingRef` removido). |
| Orquestração (pull, fila, cursor, sair do grupo) só no hook, sem teste | medium (gap) | **patch**: `createSyncCoordinator` sem `react-native`, usado pelo `useSyncEngine` e testado (cursor avança pelo `created_at` mesmo sem importar; fila drena depois de pull que falha; uma importação por vez; sair do grupo ignora avanços em curso). — **aplicado** (`src/modules/syncCoordinator.ts`, 17 testes). |
| Teste do AC1 não pega um `since` no pull (o pool falso ignora o filtro) | medium (gap) | **patch**: o pool falso registra e aplica `since`/`limit`; teste afirma que o pull não tem `since`. — **aplicado**. |
| `leaveGroup` em corrida grava de volta o cursor do grupo antigo; `joinGroup` não zera cursor e fila | low | **patch**: época do grupo; avanços e drenagens de época antiga são ignorados. — **aplicado** (`reset()` em `leaveGroup`, `joinGroup` e `createGroup`). |
| Lote ao vivo com erro é descartado | low | **patch**: volta para a fila com limite de tentativas. — **aplicado** (`LIVE_MAX_ATTEMPTS = 3`). |
| Parâmetro `relayCursor` do pull não é usado (convite a filtrar e perder eventos) | low | **patch**: remover e comentar por que o pull é completo. — **aplicado**. |
| Testes fracos (+25 h que não pode falhar; sobreposição sem nada novo) | low | **patch** — **aplicado** (trocados por testes do coordenador com log em memória e dedupe real). |
| Limite de 500 por relay corta primeiro os lotes do aparelho com relógio atrasado; relays recusam evento com `created_at` muito no futuro | low | **defer** (D34): limite conhecido do formato atual; registrar. |
| Toda entrega ao vivo limpa o push pendente | low | **defer**: comportamento anterior; registrar em D34. |

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas

## Implementation Notes

- `src/modules/syncPayload.ts` (puro): `RELAY_CURSOR_KEY = "domus_relay_cursor_v1"`, `LEGACY_LAST_PULL_TS_KEY` (chave antiga, saiu de `syncStorage.ts`), `RELAY_CURSOR_OVERLAP_SEC = 60` (constante única da folga), `SUBSCRIPTION_DEFAULT_LOOKBACK_SEC = 60`. `advanceRelayCursor(current, createdAts)` devolve o maior `created_at` (floor), nunca anda para trás e ignora não finitos/não numéricos/≤ 0. `subscriptionSince(cursor, nowSec)` = `cursor − 60`; sem cursor `nowSec − 60`; defesa extra: limitado a `nowSec − 60` quando o cursor está à frente do relógio local (o `created_at` também vem do relógio de quem publica). `parseRelayCursor` aceita só inteiro positivo seguro. `loadRelayCursor(storage)` apaga a chave antiga (sem migrar: era ms de `timestamp`) e lê a nova; falha do storage vira "sem cursor".
- `src/modules/syncCoordinator.ts` (puro, revisão): `createSyncCoordinator({ importEvents, storage, pull, now, warn, onCursorChange, onLiveImported })` é dono de:
  - o cursor: `load`, `getCursor`, `liveSince` e o avanço com gravação só quando o valor muda;
  - a fila ao vivo: `enqueueLive(event, createdAt)`;
  - o mutex único (cadeia de promessas): toda importação passa por ele, e `isImporting()` só reflete o estado dele;
  - a época do grupo: `reset()` zera cursor e fila e apaga as duas chaves.

  `runPull(req)` faz a busca fora do mutex. Sob o mutex, ele confere a época, importa e avança o cursor pelo `maxCreatedAt` mesmo sem nada novo. No `finally`, agenda a drenagem da fila, então a fila drena também depois de um pull que falha. Lote ao vivo com erro volta para a fila com `attempts + 1` e sai do laço; a nova tentativa vem com o próximo evento ou pull. Depois de `LIVE_MAX_ATTEMPTS = 3` tentativas o evento é descartado com aviso (só o id). Avanços, drenagens e reenfileiramentos de uma época antiga são ignorados.
- `src/modules/nostrSync.ts`: `pullSyncEvents(keys, deviceId, includeMyEvents)` devolve `PullResult { events, maxCreatedAt }`. `maxCreatedAt` vem do `created_at` dos eventos que passaram pela tag do app e pela decriptação. O parâmetro de cursor saiu, e um comentário explica por que o pull é completo de propósito: os lotes são substituíveis e um `since` perderia os lotes de um aparelho com relógio atrasado. `subscribeToSyncEvents(keys, deviceId, since, onEvent(event, createdAt))` recebe o `since` pronto. O formato publicado e o `timestamp` não mudaram.
- `src/context/useSyncEngine.ts` é uma camada fina sobre o coordenador:
  - o coordenador é criado uma vez (`useState`); o `importEvents` passa por ref e limpa o push pendente;
  - `pullFromRelays` = `coordinator.runPull`; `doSync` pula quando `coordinator.isImporting()`; a assinatura usa `coordinator.liveSince()` e `enqueueLive`;
  - o cursor carrega antes do código do grupo;
  - `leaveGroup` chama `reset()` logo depois de fechar a assinatura (a época muda de forma síncrona), e `joinGroup`/`createGroup` chamam `reset()` antes de trocar as chaves;
  - `lastPullTs`, `isImportingRef` e a fila do hook foram removidos.
- Testes:
  - `src/modules/__tests__/syncCoordinator.test.ts` (17). Cobre a matriz da spec ponta a ponta com log em memória e o dedupe real (`selectEventsToImport`): evento antigo ao vivo depois de um novo no pull; +25 h com o evento seguinte recebido; releitura na sobreposição ignorada pelo id sem recuar o cursor; sem cursor; chave antiga. Também cobre: o cursor anda sem importar nada; a fila espera o pull e drena depois de um pull que falha na busca ou na importação; nunca mais de uma importação ao mesmo tempo (3 pulls e 3 eventos ao vivo disputando); a nova tentativa e o descarte após 3; sair do grupo durante um pull ou uma importação ao vivo; falha de lote de época antiga; entrar em outro grupo; reset durante o load.
  - `src/modules/__tests__/nostrSync.test.ts` (12). O pool falso registra o filtro do `querySync` e aplica `since`/`limit` como um relay. O teste do evento antigo publicado depois afirma que o pull não tem `since` e tem `limit` 500, e que o lote de um relógio atrasado volta.
  - `src/modules/__tests__/syncPayload.test.ts` (23): funções puras do cursor. Os testes fracos (+25 h e sobreposição) saíram e foram substituídos no coordenador.
- Verificação: `npx vitest run` dá 72 arquivos / 1441 testes passando (baseline 71 / 1408) e `npx tsc --noEmit` dá 0 erros.
