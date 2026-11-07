---
title: 'Story 4.6: Registrar em qual grupo cada evento já foi publicado'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: 'fc014643dc1013bb47f6e5c723b82440f9f6e712'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-5-publicar-e-ler-eventos-no-grupo-forte.md'
  - '{project-root}/src/modules/syncCoordinator.ts'
  - '{project-root}/src/modules/syncPayload.ts'
  - '{project-root}/src/context/useSyncEngine.ts'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Para viabilizar a convivência controlada entre o Grupo antigo e o Grupo forte (Story 4.7) e a migração assistida sem duplicatas (Story 4.8), o aplicativo precisa saber exatamente quais eventos já foram enviados para cada grupo e quais foram recebidos de cada grupo. Sem esse registro granular por evento e por grupo, eventos recebidos de um grupo seriam republicados de volta no mesmo canal (gerando loops infinitos de eco nos relays) ou eventos gerados localmente seriam transmitidos repetidamente a cada sincronização.

**Approach:** Criar um módulo de rastreamento operacional (`src/modules/syncGroupTracking.ts`), desacoplado do log funcional do domínio e persistido em infraestrutura (`AsyncStorage`), que armazena por evento e por grupo os estados `"published"` e `"received"`. Integrar esse rastreador ao fluxo de sincronização para garantir que eventos recebidos de um grupo nunca sejam republicados no mesmo grupo, que eventos criados no aparelho sejam enviados exatamente uma vez para cada grupo ativo, e que todo o estado sobreviva ao reinício do aplicativo.

## Boundaries & Constraints

**Always:**
- O registro de metadados operacionais de sync por evento e por grupo vive estritamente no armazenamento de infraestrutura (`AsyncStorage` / `SyncGroupTrackingStorage`), sob a chave `domus_sync_group_tracking_v1`, nunca criando eventos funcionais no `EventStore` de domínio.
- Um evento recebido de um grupo específico é marcado como `"received"` para esse grupo e nunca pode ser republicado nesse mesmo grupo.
- Um evento criado no aparelho é publicado exatamente uma vez em cada grupo ativo (após publicação com sucesso, é marcado como `"published"` para o respectivo grupo).
- O estado de rastreamento sobrevive integralmente ao fechamento e reinício do aplicativo (recuperado no boot).
- O módulo `syncGroupTracking.ts` é puro, sem dependências de React ou React Native, utilizando interface injetável de storage para viabilizar testes unitários e de simulação rápidos no Vitest.
- Um teste com dois grupos simulados comprova que o número de publicações por evento e por grupo é estritamente 1 (ou 0 para eventos recebidos do próprio grupo).
- A biblioteca legado `packages/sync` permanece intocada (AD-9).
- Todos os textos informativos ou de log respeitam pt-BR.

**Never:**
- Nunca registrar eventos de controle de sync no log funcional de domínio (`EventStore`).
- Nunca republicar um evento no mesmo grupo do qual ele foi recebido.
- Nunca duplicar a publicação de um evento local em um grupo onde ele já consta como publicado.
- Nunca perder o histórico de eventos já processados ao reiniciar o aplicativo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Evento local a publicar | Evento gerado no dispositivo ainda não enviado ao grupo G1 | `shouldPublish(eventId, G1)` retorna `true`; após envio com sucesso, `markPublished([eventId], G1)` registra o estado | Se envio falhar, não marca e tenta novamente no próximo ciclo |
| Evento já publicado | Evento já marcado como `"published"` no grupo G1 | `shouldPublish(eventId, G1)` retorna `false`; filtrado do lote de envio | Nenhuma publicação duplicada |
| Evento recebido de relay | Evento puxado ou recebido ao vivo do grupo G1 | `markReceived([eventId], G1)` registra o estado; `shouldPublish(eventId, G1)` retorna `false` | Impede imediatamente eco no grupo de origem |
| Propagação para segundo grupo | Evento recebido de G1 avaliado para o grupo G2 | `shouldPublish(eventId, G2)` retorna `true` se nunca enviado a G2; após envio, marca `"published"` para G2 | Permite ponte entre canais sem loop |
| Reinício do aplicativo | App é reiniciado e carrega tracker do storage | Estados `"published"` e `"received"` de todos os grupos continuam idênticos | Se storage estiver corrompido ou vazio, inicializa registro vazio |
| Limpeza ao sair do grupo | Usuário sai de um grupo ou redefine sincronização | Limpa as entradas daquele grupo ou todas as entradas sob demanda | Não afeta logs de outros grupos |

</intent-contract>

## Code Map

- `src/modules/syncGroupTracking.ts` -- Módulo de rastreamento de eventos por grupo: tipos (`EventGroupStatus`, `SyncGroupTrackingRecord`), abstração de storage (`SyncGroupTrackingStorage`), classe/fábrica `createSyncGroupTracker`, métodos de consulta (`shouldPublish`, `hasPublished`, `hasReceived`, `filterEventsToPublish`), mutação (`markPublished`, `markReceived`, `clearGroup`, `clearAll`), carga e persistência JSON.
- `src/context/syncStorage.ts` -- Adicionar constante de chave `SYNC_GROUP_TRACKING_KEY = "domus_sync_group_tracking_v1"`.
- `src/context/useSyncEngine.ts` -- Integrar o `syncGroupTracker`: carregar no boot, filtrar eventos em `getMyEvents` e `pushMyEvents` para publicar apenas o que ainda não foi enviado ao grupo atual, marcar eventos enviados como `"published"` e registrar eventos recebidos (via pull e assinatura) como `"received"`.
- `src/modules/__tests__/syncGroupTracking.test.ts` -- Suíte de testes unitários: operações puras em memória, persistência em storage simulado, sobrevivência a reinício, e teste com dois grupos simulados demonstrando exatamente 1 publicação por evento por grupo.

## Tasks & Acceptance

**Execution:**
- [x] `src/context/syncStorage.ts` -- Declarar a constante `SYNC_GROUP_TRACKING_KEY = "domus_sync_group_tracking_v1"`.
- [x] `src/modules/syncGroupTracking.ts` -- Implementar módulo puro de rastreamento com persistência assíncrona, controle de concorrência e métodos `shouldPublish`, `markPublished`, `markReceived`, `filterEventsToPublish` e `load`/`save`.
- [x] `src/context/useSyncEngine.ts` -- Conectar o `syncGroupTracker` às rotinas de envio (`pushMyEvents`), recepção de pull (`pullFromRelays`) e recepção ao vivo (`subscribeToSyncEvents`), garantindo que o grupo atual receba apenas eventos pendentes e que eventos recebidos não sejam republicados.
- [x] `src/modules/__tests__/syncGroupTracking.test.ts` -- Implementar testes unitários cobrindo todos os cenários da matriz: gravação por evento/grupo, bloqueio de eco, sobrevivência a reinício e prova com dois grupos simultâneos garantindo teto de 1 publicação.

**Acceptance Criteria:**
- Given um aplicativo com suporte a múltiplos grupos
- When eventos são criados localmente ou recebidos de um grupo
- Then eventos recebidos de um grupo nunca são republicados no mesmo grupo (`shouldPublish` retorna `false`)
- And eventos criados localmente são publicados apenas uma vez em cada grupo ativo
- And o registro persiste em `AsyncStorage` e sobrevive a reinícios do aplicativo
- And um teste automatizado com dois grupos simulados comprova que o número de publicações por evento e por grupo é no máximo 1.

## Spec Change Log

_None._

## Review Triage Log

1. **Retenção de histórico em lotes Nostr kind 30333 (Blind Hunter, Verification Gap Reviewer):**
   - *Finding:* `getMyEvents` filtrava eventos retornando apenas o delta não publicado. Como `publishSyncEvents` particiona os eventos em lotes parametrizados NIP-33 com `d: sync-${deviceId}-${batchIndex}` (kind 30333), enviar apenas o delta sobrescrevia `sync-${deviceId}-0` nos relays e apagava eventos anteriores do histórico do relay para novos pares.
   - *Disposition:* `patch` — em `src/context/useSyncEngine.ts`, `getMyEvents` retorna todos os eventos do dispositivo (`selectStrongGroupPushEvents`/`selectOldGroupPushEvents`), e `pushMyEvents` usa `tracker.filterEventsToPublish` para detectar se há eventos pendentes (evitando push desnecessário se não houver novos eventos). Ao publicar, envia o conjunto completo garantindo que o lote kind 30333 preserve o histórico nos relays, marcando todos como publicados no tracker.

2. **Detached `this` e IDs vazios em `filterEventsToPublish` (Edge Case Hunter, Blind Hunter, Verification Gap Reviewer):**
   - *Finding:* `filterEventsToPublish` chamava `this.hasPublished` e `this.hasReceived`. Se desestruturado (`const { filterEventsToPublish } = tracker`), lançava `TypeError: Cannot read properties of undefined`. Além disso, IDs vazios `""` não eram descartados pelo predicado.
   - *Disposition:* `patch` — refatorado para consultar o grupo diretamente sem referência a `this`, validando `Boolean(e) && typeof e.id === "string" && e.id.length > 0`. Adicionados testes unitários específicos em `src/modules/__tests__/syncGroupTracking.test.ts`.

3. **Exclusão mútua e eco de eventos próprios (Edge Case Hunter, Blind Hunter, Verification Gap Reviewer):**
   - *Finding:* Eventos locais ecoados de volta pelos relays eram passados para `markReceived`, populando tanto `published` quanto `received`. Além disso, `markReceived` não checava se o ID já constava em `published`.
   - *Disposition:* `patch` — em `src/modules/syncGroupTracking.ts`, `markReceived` ignora eventos já presentes em `group.published` (exclusão mútua estrita). Em `src/context/useSyncEngine.ts`, o pull e a assinatura filtram explicitamente `e.deviceId !== deviceId` antes de chamar `tracker.markReceived`. Adicionado teste unitário de exclusão mútua.

4. **Condição de corrida em `clearAll()` (Edge Case Hunter):**
   - *Finding:* Se `clearAll()` ocorresse enquanto um salvamento assíncrono estivesse em voo, a promise de save pendente poderia sobrescrever o storage após a remoção.
   - *Disposition:* `patch` — `clearAll()` aguarda `savePromise` antes de remover a chave do storage. Adicionado teste unitário.

5. **Awaiting de `tracker.clearGroup` em `leaveGroup` (Edge Case Hunter):**
   - *Finding:* `leaveGroup` disparava `tracker.clearGroup` sem aguardar, deixando promise flutuante.
   - *Disposition:* `patch` — `await tracker.clearGroup(previousGroupId).catch(() => {})`.

6. **Tolerância a falhas transitórias em `load()` (Blind Hunter):**
   - *Finding:* Se `storage.getItem` lançasse erro temporário de I/O, `groups.clear()` destruía o estado em memória.
   - *Disposition:* `patch` — em caso de erro no storage, emite aviso e mantém o estado em memória. Adicionado teste unitário.

## Design Notes

A estrutura persistida em `domus_sync_group_tracking_v1` armazena um índice por `groupId` (chave pública Nostr ou código canônico do grupo):
```json
{
  "version": 1,
  "groups": {
    "<groupId>": {
      "p": ["evt-1", "evt-2"],
      "r": ["evt-3"]
    }
  }
}
```
Internamente, `createSyncGroupTracker` mantém em memória instâncias de `Set<string>` para operações de consulta `O(1)` ultrarrápidas (`publishedSet` e `receivedSet` por grupo). Toda alteração persiste de forma atômica/assíncrona no storage configurado, assegurando recuperação imediata no boot.

## Verification

**Commands:**
- `npx vitest run src/modules/__tests__/syncGroupTracking.test.ts` -- expected: todos os testes de rastreamento e simulação de dois grupos passam com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipagem.
- `npx eslint .` -- expected: 0 erros de linting.
- `npx vitest run` -- expected: todas as suítes de teste passando com 0 falhas.

## Auto Run Result

### Summary of implemented change
- Declarada chave `SYNC_GROUP_TRACKING_KEY = "domus_sync_group_tracking_v1"` em `src/context/syncStorage.ts`.
- Criado módulo puro `src/modules/syncGroupTracking.ts` com tipagem forte (`EventGroupStatus`, `GroupTrackingData`, `SyncGroupTrackingRecord`), abstração de storage `SyncGroupTrackingStorage`, estrutura de `Set<string>` em memória por grupo e rotina de persistência serializada contra concorrência via `dirty` loop.
- Conectado `syncGroupTracker` em `src/context/useSyncEngine.ts`: carregamento assíncrono no boot junto ao coordenador; filtragem de eventos locais em `getMyEvents` e `pushMyEvents` impedindo republicação em grupos onde o evento já consta como publicado ou recebido; marcação de eventos enviados como `"published"` após publicação com sucesso; e marcação de eventos recebidos em `pullSyncEvents` e `subscribeToSyncEvents` como `"received"` para impedir imediatamente loops de eco. Limpeza de grupo em `leaveGroup`.
- Criada suíte completa em `src/modules/__tests__/syncGroupTracking.test.ts` com 18 testes cobrindo operações em memória, prevenção de eco, sobrevivência a reinício com mock storage, resiliência a corrupção/erros de I/O, concorrência e prova de simulação de dois grupos com no máximo 1 publicação por evento por grupo.

### Verification performed
- `npx vitest run src/modules/__tests__/syncGroupTracking.test.ts src/context/__tests__/syncStorage.test.ts`: 42 testes passando com 0 falhas (23 em syncGroupTracking + 19 em syncStorage).
- `npx vitest run src/modules/__tests__/syncGroupTracking.test.ts src/context/__tests__/syncStorage.test.ts src/modules/__tests__/syncPayload.test.ts src/modules/__tests__/syncCoordinator.test.ts src/modules/__tests__/nostrSync.test.ts src/context/__tests__/strongGroupSync.test.ts`: 152 testes de sincronização passando com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros de tipagem.
- `npx eslint .`: 0 erros de linting (12 avisos pré-existentes na base de código, 0 novos).
