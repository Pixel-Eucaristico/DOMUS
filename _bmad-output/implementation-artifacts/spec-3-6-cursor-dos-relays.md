---
title: 'Story 3.6: separar o cursor de leitura dos relays do timestamp do evento'
type: 'bugfix'
created: '2026-10-26'
status: 'in-progress'
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
- [ ] Funções puras do cursor (avançar, `since` com sobreposição, migração da chave antiga) + testes da matriz
- [ ] `pullSyncEvents` e a assinatura informam o `created_at` dos eventos do relay; `useSyncEngine` usa o cursor novo
- [ ] Fila para eventos ao vivo durante uma importação

**Acceptance Criteria:**
- Given um evento antigo chegando depois de um novo, when o sync roda, then os dois são importados
- Given um evento com horário adiantado, when é importado, then o cursor não vai para o futuro e a assinatura continua recebendo

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas
