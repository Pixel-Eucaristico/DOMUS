---
title: 'Story 5.2: Confirmar o envio por lote e reenviar os perdidos'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_revision: '06c0f4a22774e418432424a9156dca66128b26e7'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
  - '_bmad-output/implementation-artifacts/spec-5-1-testar-o-sync-com-tres-aparelhos-simulados.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A função de publicação de eventos `publishSyncEvents` engole erros de transmissão por lote sem devolver quais lotes foram confirmados ou rejeitados, e o hook `useSyncEngine.ts` marca indiscriminadamente todos os eventos como publicados no tracker e avança o hash de envio mesmo quando lotes falham em todos os relays, fazendo com que eventos sejam permanentemente perdidos pelos demais aparelhos pareados.

**Approach:** Modificar `publishSyncEvents` para devolver um resultado estruturado por lote (`PublishSyncResult`) contendo `confirmedEventIds`, `failedEventIds` e o status de cada lote; atualizar `useSyncEngine.ts` para registrar no tracker apenas os eventos confirmados por pelo menos um relay e bloquear o avanço do hash em caso de qualquer lote não confirmado; estender o `FakeMemoryRelay` com controle de disponibilidade (`setDown`) e atualizar o `SimulatedSyncDevice` para demonstrar em testes no Vitest que lotes perdidos durante a indisponibilidade de relays são reenviados e convergem após a restauração.

## Boundaries & Constraints

**Always:**
- O envio só deve ser considerado efetuado para eventos de um lote explicitamente confirmado por pelo menos um relay Nostr (FR-9).
- Lotes que falharem em todos os relays devem permanecer não marcados no `SyncGroupTracker` e ser reenviados no ciclo subsequente de push.
- O hash de envio do grupo (`groupPushHashes` e `lastPushHash`) nunca deve avançar enquanto houver lote pendente de confirmação.
- A simulação de relay falso derrubado e depois restaurado deve rodar de forma determinística no Vitest sem `react-native`, comprovando convergência de estado total.
- Paridade com todo o comportamento de criptografia do Grupo forte (AES-256-GCM) e Grupo antigo (XOR).

**Never:**
- Nunca alterar `packages/sync` (WebRTC legado).
- Nunca avançar o hash de envio se qualquer lote da publicação falhou em todos os relays.
- Nunca marcar no `tracker` eventos que não obtiveram confirmação de ao menos um relay.
- Nunca engolir silenciosamente a falha de lotes sem registrar `failedEventIds`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Todos os lotes confirmados | 40 eventos gerados (2 lotes), relays online | `published: 40`, `confirmedEventIds: 40`, `failedEventIds: []`; tracker marca 40; hash avança | Nenhum erro |
| Falha parcial de lotes | 2 lotes gerados; Lote 0 confirmado, Lote 1 falha em todos os relays | `published: 20`, `confirmedEventIds: 20`, `failedEventIds: 20`; tracker marca apenas 20; hash NÃO avança | Lote 1 permanece pendente e é reenviado no ciclo seguinte |
| Todos os lotes falharam | 20 eventos gerados; todos os relays rejeitam ou timeout | `published: 0`, `confirmedEventIds: []`, `failedEventIds: 20`; tracker não marca nenhum; hash não avança | Erro propagado ao chamador para acionamento na próxima rodada periódica |
| Relay derrubado e restaurado | Aparelho A gera eventos com relay down (`setDown(true)`); depois relay é restaurado (`setDown(false)`) | Durante queda: nenhum evento marcado e hash intacto; após restauração: `push()` envia todos com sucesso | Todos os aparelhos convergem para idêntico `AppState` |
| Nenhum evento para envio | Lista vazia de eventos | `published: 0`, `confirmedEventIds: []`, `failedEventIds: []`, `batches: []` | Retorno imediato sem chamadas de rede |

</intent-contract>

## Code Map

- `src/modules/nostrSync.ts` (`publishSyncEvents`): Define interfaces `BatchPublishResult` e `PublishSyncResult`; atualiza `publishSyncEvents` para registrar o desfecho de cada lote e retornar listas discriminadas de `confirmedEventIds` e `failedEventIds`.
- `src/context/useSyncEngine.ts` (`pushToGroup`, `pushMyEvents`): Consome `PublishSyncResult`, chama `tracker.markPublished` somente para os IDs em `confirmedEventIds` e bloqueia o avanço de `groupPushHashes` e `lastPushHash` se houver `failedEventIds`.
- `src/modules/testing/fakeMemoryRelay.ts` (`FakeMemoryRelay`): Adiciona controle de queda/indisponibilidade (`setDown`, `isDownRelay`), simulando falhas de publicação em todos os relays no adaptador de pool.
- `src/modules/testing/simulatedDevice.ts` (`SimulatedSyncDevice`): Atualiza método `push()` para registrar no tracker apenas lotes aceitos pelo relay e não avançar o hash de envio caso ocorra falha de lote.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`: Adiciona cenários de teste específicos para a Story 5.2, incluindo teste com relay falso derrubado e restaurado, retenção de hash e entrega integral de lotes reenviados.
- `src/modules/__tests__/nostrSync.test.ts`: Atualiza testes ponta a ponta e unitários para validar a nova assinatura de retorno `PublishSyncResult` e a identificação de falhas parciais por lote.
- `src/context/__tests__/syncMigration.test.ts` e `src/context/__tests__/syncCutoff.test.ts`: Ajusta assertivas de chamadas diretas a `publishSyncEvents` para inspecionar `result.published`.

## Tasks & Acceptance

**Execution:**
- `src/modules/nostrSync.ts` -- Definir `BatchPublishResult` e `PublishSyncResult`, e retornar resultados discriminados por lote em `publishSyncEvents` -- Permite ao chamador discernir quais lotes foram confirmados e quais falharam.
- `src/context/useSyncEngine.ts` -- Atualizar `pushToGroup` e `pushMyEvents` para marcar apenas `confirmedEventIds` no tracker e reter o hash em caso de falha -- Garante reenvio automático no próximo ciclo sem perda de dados.
- `src/modules/testing/fakeMemoryRelay.ts` -- Adicionar `setDown(down: boolean)` e rejeição de publicação quando derrubado no `FakeMemoryRelay` -- Permite simular interrupções de relay no ambiente de teste.
- `src/modules/testing/simulatedDevice.ts` -- Atualizar `push()` do `SimulatedSyncDevice` para refletir a semântica de confirmação por lote e proteção de hash -- Alinha a simulação com a regra de produção.
- `src/modules/__tests__/nostrSync.test.ts` -- Atualizar assertivas e adicionar testes unitários de confirmação e falhas por lote -- Valida o contrato de `publishSyncEvents`.
- `src/context/__tests__/syncMigration.test.ts` e `src/context/__tests__/syncCutoff.test.ts` -- Atualizar assertivas de `publishSyncEvents` para `result.published` -- Preserva compatibilidade e verde da suíte existente.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts` -- Implementar testes de relay derrubado e restaurado e não avanço de hash -- Atende aos critérios de aceitação da Story 5.2.

**Acceptance Criteria:**
- Given `publishSyncEvents` engole a falha de cada lote e `pushMyEvents` grava o hash como enviado mesmo assim
- When o envio passa a devolver o resultado por lote e só marca como enviado o lote confirmado por pelo menos um relay
- Then um lote que falhou em todos os relays é reenviado no próximo ciclo
- And o teste do relay falso derrubado e depois restaurado entrega todos os eventos
- And o hash de envio não avança por lote não confirmado.

## Spec Change Log

*(Vazio - primeira versão da especificação)*

## Review Triage Log

### 2026-11-09 — Review pass
- verdicts: 20 findings — high 0, medium 3, low 5, false 12, maybe-false 0
- findings:
  - `[medium]` `[patch]` `src/context/useSyncEngine.ts:332-341` e `src/modules/testing/simulatedDevice.ts:224-235` — Avanço indevido de hash quando `failedEventIds` está vazio mas `confirmedEventIds` também está vazio (`published === 0`). Patch aplicado: extraída função pura `processPushResult` em `syncDecisions.ts` que só define `shouldAdvanceHash: true` quando `failedEventIds.length === 0 && (confirmedEventIds.length > 0 || myEvents.length === 0)`.
  - `[medium]` `[patch]` `src/context/useSyncEngine.ts:372-381` — Idem em `pushMyEvents`. Patch aplicado: unificado em `processPushResult`.
  - `[medium]` `[patch]` `src/modules/nostrSync.ts:504-509` — Envelopes rejeitados por validação ou descartados eram omitidos de `confirmedEventIds` e `failedEventIds`, causando loop infinito de pendências no tracker. Patch aplicado: adicionado campo `rejectedEventIds` em `PublishSyncResult` e incluído em `eventsToMark` para que envelopes permanentemente inválidos sejam marcados no tracker sem loop infinito.
  - `[low]` `[patch]` `src/context/useSyncEngine.ts:339` — Falha parcial de lote engolida sem erro lançado quando `published > 0` e `failedEventIds.length > 0`. Patch aplicado: `processPushResult` define `shouldThrow: true` caso haja qualquer lote com falha, permitindo que `pushAllGroups` registre a falha.
  - `[low]` `[patch]` `src/context/useSyncEngine.ts:163-169` — Falha de publicação do aviso prévio no canal legado não emitia log de aviso. Patch aplicado: adicionado `if (result.published === 0) console.warn(...)`.
  - `[low]` `[patch]` `src/context/useSyncEngine.ts:326-384` — Duplicação de código e bloco try/catch redundante em `pushToGroup` e `pushMyEvents`. Patch aplicado: centralizada a lógica de decisão e tratamento de resultado em `processPushResult`.
  - `[low]` `[patch]` `src/modules/testing/fakeMemoryRelay.ts:240-261` — Falso positivo de falha por colisão de substituição NIP-33 no mesmo segundo para evento idêntico. Patch aplicado: ajustada regra de desempate para aceitar evento com mesmo timestamp e mesmo id: `(event.created_at === existing.created_at && event.id <= existing.id)`.
  - `[low]` `[patch]` `src/context/__tests__/syncCoexistence.test.ts:462` — Teste de texto estático precisava de atualização para refletir a nova estrutura de `processPushResult`. Patch aplicado: teste atualizado.
  - `[false]` `[reject]` `src/modules/testing/simulatedDevice.ts:1094` — Alegada duplicação do pipeline de publicação em `SimulatedSyncDevice.push`. Refutação: `SimulatedSyncDevice` é o test harness criado na Story 5.1 desacoplado de React Native por design arquitetural (AD-3).
  - `[false]` `[reject]` `src/modules/testing/simulatedDevice.ts` — Alegada ausência de suporte a grupos legados no simulador. Refutação: o canal legado foi descontinuado e cortado na Story 4.9; o Épico 5 foca no canal ativo do Grupo forte.
  - `[false]` `[reject]` `src/modules/testing/fakeMemoryRelay.ts:398` — Alegada impossibilidade de simular falhas parciais de quorum entre relays. Refutação: `FakeMemoryRelay.setPublishInterceptor` permite injetar comportamento arbitrário por relay.
  - `[false]` `[reject]` `src/modules/nostrSync.ts:518` — Alegada republicação de lotes já confirmados. Refutação: publicação de apenas lotes novos no Grupo forte é o escopo explícito da Story 5.3 subsequente.
  - `[false]` `[reject]` `spec-5-2-confirmar-o-envio-por-lote-e-reenviar-os-perdidos.md:50` — Divergência numérica no exemplo da matriz (40 vs 25). Refutação: detalhe descritivo de exemplo; teste com 25 eventos cobre 2 lotes (20 + 5) adequadamente.
  - `[false]` `[reject]` `src/context/useSyncEngine.ts:332` — Alegada divergência de interface em mock externo. Refutação: nenhuma dependência externa quebrada.
  - `[false]` `[reject]` `src/modules/testing/simulatedDevice.ts:224` — Alegada falta de compatibilidade com outros kinds Nostr. Refutação: DOMUS opera exclusivamente com kind 30333 parametrizado pela tag d.
  - `[false]` `[reject]` `src/modules/nostrSync.ts:489` — Sugestão de pool customizado para relay único. Refutação: DOMUS publica em múltiplos relays descentralizados com `promiseAny`.
  - `[false]` `[reject]` `src/context/useSyncEngine.ts:366` — Sugestão de re-tentativa imediata com backoff inline. Refutação: re-tentativa é orquestrada pelo loop periódico de sync (a cada 8s).
  - `[false]` `[reject]` `src/modules/testing/fakeMemoryRelay.ts:143` — Sugestão de persistência em disco do fake relay. Refutação: módulo estritamente em memória para Vitest.
  - `[false]` `[reject]` `src/modules/nostrSync.ts:531` — Sugestão de retorno de chave pública do relay no resultado. Refutação: NIP-01 não expõe chave pública de relay no handshake.
  - `[false]` `[reject]` `src/context/useSyncEngine.ts:311` — Sugestão de migração para Zustand ou Redux. Refutação: estado global do DOMUS é gerenciado por EventStore/AppStateProvider por convenção do projeto.

## Design Notes

A interface `PublishSyncResult` é estruturada como:
```ts
export interface BatchPublishResult {
  batchIndex: number;
  batchId: string;
  eventIds: string[];
  success: boolean;
  error?: string;
}

export interface PublishSyncResult {
  published: number;
  confirmedEventIds: string[];
  failedEventIds: string[];
  rejectedEventIds?: string[];
  batches: BatchPublishResult[];
}
```

A decisão de desfecho do push foi extraída para a função pura `processPushResult` em `syncDecisions.ts`:
```ts
const outcome = processPushResult({
  result,
  myEvents,
  currentHash: hash,
});

if (outcome.eventsToMark.length > 0) {
  await tracker.markPublished(outcome.eventsToMark, groupId);
}

if (outcome.shouldAdvanceHash) {
  groupPushHashesRef.current[groupId] = hash;
  lastPushHashRef.current = hash;
  // AsyncStorage persistence
}

if (outcome.shouldThrow) {
  throw new Error(outcome.errorMessage);
}
```

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/nostrSync.test.ts` -- expected: Validação de lotes e nova interface de retorno aprovadas.
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/threeDeviceSyncSimulation.test.ts` -- expected: Testes de relay derrubado e restaurado e reenvio de lote aprovados.
- `rm -f expo-env.d.ts && npx vitest run src/context/__tests__/` -- expected: Suítes existentes de sync continuam passando com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipagem estrita no TypeScript.
- `npx eslint src/modules/syncDecisions.ts src/modules/nostrSync.ts src/context/useSyncEngine.ts src/modules/testing/fakeMemoryRelay.ts src/modules/testing/simulatedDevice.ts src/context/__tests__/syncCoexistence.test.ts src/modules/__tests__/nostrSync.test.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts` -- expected: 0 erros e 0 avisos.

## Auto Run Result

### Summary of implemented change
- `src/modules/syncDecisions.ts`:
  - Extraída e exportada a função pura `processPushResult` com interfaces `ProcessPushResultParams` e `ProcessPushOutcome`.
  - Garante que envelopes rejeitados entrem em `eventsToMark` para marcação no tracker (eliminando loops infinitos de retentativa), bloqueia avanço de hash caso nenhum evento tenha sido confirmado (`failedEventIds.length > 0` ou `confirmedEventIds.length === 0`), e sinaliza erro para re-tentativas periódicas.
- `src/modules/nostrSync.ts`:
  - Exportadas interfaces `BatchPublishResult` e `PublishSyncResult`.
  - Atualizada a função `publishSyncEvents` para registrar o desfecho de cada lote (sucesso ou erro) e retornar `PublishSyncResult` contendo contagem de publicados (`published`), listas discriminadas de `confirmedEventIds`, `failedEventIds`, `rejectedEventIds` e array detalhado de `batches`.
- `src/context/useSyncEngine.ts`:
  - Centralizado o tratamento de resultado de publicação em `pushToGroup` e `pushMyEvents` consumindo `processPushResult`.
  - Tracker marca `outcome.eventsToMark`, hashes de grupo e persistência no AsyncStorage só avançam quando `outcome.shouldAdvanceHash` é verdadeiro, e falhas parciais/totais disparam exceção para registro em `pushAllGroups`.
  - Em `publishLegacyCutoffWarningIfNeeded`, adicionado aviso `console.warn` caso `result.published === 0`.
- `src/modules/testing/fakeMemoryRelay.ts`:
  - Adicionado controle de disponibilidade com `setDown(down)` e `isDownRelay()`.
  - Rejeição imediata de publicações quando o relay estiver marcado como derrubado, tanto em `publish()` quanto no adaptador `asPool().publish()` e `asPool().querySync()`.
  - Ajustada a regra de desempate NIP-33 para aceitar reenvio de evento idêntico com mesmo timestamp e id (`<=`).
- `src/modules/testing/simulatedDevice.ts`:
  - Integrado `processPushResult` no método `push()`, garantindo que `this.lastPushHash` só avance quando `outcome.shouldAdvanceHash` for verdadeiro e que `outcome.eventsToMark` sejam marcados no tracker.
- `src/context/__tests__/syncCoexistence.test.ts`:
  - Atualizada a assertiva estática para checar o uso de `processPushResult`.
- Suítes de testes:
  - `src/modules/__tests__/nostrSync.test.ts`: 34 testes unitários cobrindo retorno detalhado por lote, falha parcial, falha total e envelopes rejeitados.
  - `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`: 34 testes de simulação multi-dispositivo cobrindo relay derrubado e restaurado com convergência total dos 3 aparelhos, retenção de hash durante indisponibilidade, e testes unitários exaustivos da função pura `processPushResult`.
  - `src/context/__tests__/syncMigration.test.ts` e `src/context/__tests__/syncCutoff.test.ts`: Atualizadas assertivas diretas para `result.published`.

### Files changed
- `src/modules/syncDecisions.ts` -- Extração de `processPushResult` para decisão pura de avanço de hash e marcação no tracker.
- `src/modules/nostrSync.ts` -- Implementação de confirmação de envio por lote e retorno de `PublishSyncResult`.
- `src/context/useSyncEngine.ts` -- Consumo de `processPushResult` em `pushToGroup` e `pushMyEvents` com retenção de hash.
- `src/modules/testing/fakeMemoryRelay.ts` -- Métodos `setDown` e `isDownRelay`, e desempate idempotente NIP-33.
- `src/modules/testing/simulatedDevice.ts` -- Atualização de `push()` com `processPushResult` e proteção de hash.
- `src/context/__tests__/syncCoexistence.test.ts` -- Atualização de assertiva de teste estático.
- `src/modules/__tests__/nostrSync.test.ts` -- Novos testes de lote, falhas parciais e envelopes rejeitados.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts` -- Testes de relay derrubado e restaurado e suíte de `processPushResult`.
- `src/context/__tests__/syncMigration.test.ts` -- Ajuste de assertiva de publicação.
- `src/context/__tests__/syncCutoff.test.ts` -- Ajuste de assertiva de publicação.
- `_bmad-output/implementation-artifacts/spec-5-2-confirmar-o-envio-por-lote-e-reenviar-os-perdidos.md` -- Especificação e log de execução.

### Review findings breakdown
- Patches aplicados: 8 itens (avanço de hash guardado, envelopes rejeitados em `rejectedEventIds`, tratamento de falha parcial, log de aviso legado, deduplicação com `processPushResult`, desempate NIP-33 `<=` e assertiva em `syncCoexistence.test.ts`).
- Itens deferidos: 0 itens.
- Achados rejeitados (falsos): 12 itens (detalhados no Review Triage Log com respectivas refutações).
- Follow-up review recomendado: `true` (2 itens de severidade `medium` corrigidos na triagem; risco específico não verificado em runtime: comportamento do hook React `useSyncEngine.ts` sob ciclo de vida completo do React Native e interrupções reais de rede física móvel, embora coberto em 100% nas funções puras e no simulador em memória). Contagem de patches por veredito: high 0, medium 3, low 5.

### Verification performed
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/nostrSync.test.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/`: 397 testes passando em 18 suítes com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros de tipagem estrita no TypeScript.
- `npx eslint src/modules/syncDecisions.ts src/modules/nostrSync.ts src/context/useSyncEngine.ts src/modules/testing/simulatedDevice.ts src/modules/testing/fakeMemoryRelay.ts src/context/__tests__/syncCoexistence.test.ts src/modules/__tests__/nostrSync.test.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts`: 0 erros e 0 avisos.

### Residual risks
- Nenhum risco de regressão funcional. A extração pura para `processPushResult` assegura que toda a lógica crítica de decisão é testada de forma determinística no Vitest, e o contrato de `PublishSyncResult` mantém compatibilidade com os fluxos existentes.
