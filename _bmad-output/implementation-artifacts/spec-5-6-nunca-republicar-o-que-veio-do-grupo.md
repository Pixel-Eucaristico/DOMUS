---
title: 'Story 5.6: Nunca republicar o que veio do grupo'
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_revision: 'ec01e5d8683d1698ede16b73b50d7363481290f3'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
  - '_bmad-output/implementation-artifacts/spec-5-5-enfileirar-eventos-recebidos-em-rajada.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A rotina de envio (`pushToGroup` / `shouldPublishGroupEvents`) selecionava eventos para publicação filtrando estritamente pelo identificador local (`deviceId === did`). Com isso, eventos restaurados de um backup em um aparelho novo (que possuem um `deviceId` antigo ou anterior) nunca chegavam ao grupo de sincronização, enquanto a prevenção de loops de envio dependia fragilmente do `deviceId` em vez de consultar o registro persistente de publicação e recebimento por grupo (`SyncGroupTracker`).

**Approach:** Substituir a restrição rígida de `deviceId` na decisão de publicação (`shouldPublishGroupEvents`) pelo registro do `SyncGroupTracker` da Story 4.6 (`!tracker.hasReceived(id, groupId)` e `tracker.filterEventsToPublish`), garantindo que eventos já recebidos do grupo jamais sejam republicados, que eventos criados localmente (incluindo backups restaurados com `deviceId` antigo) sejam publicados se o grupo ainda não os possuir, e comprovando que a importação de eventos de outros aparelhos não gera XP nem conquistas locais.

## Boundaries & Constraints

**Always:**
- Um evento recebido do grupo de sincronização jamais deve ser retransmitido de volta ao mesmo grupo (supressão estrita de loops e eco).
- Em um cenário de teste com três aparelhos e N eventos gerados, o total de publicações no relay deve ser de exatamente N (ou N lotes com 1 publicação por aparelho gerador) e não crescer com o tempo.
- Um evento criado localmente (inclusive oriundo de backup restaurado, com `deviceId` antigo ou diferente) deve ser publicado no grupo se o grupo ainda não o possuir.
- A importação de eventos gerados em outros aparelhos não deve conceder XP, avanço de nível nem desbloqueio de troféus/conquistas locais.
- A decisão de publicação em `shouldPublishGroupEvents` deve utilizar `tracker.hasReceived` para excluir eventos remotos e `tracker.filterEventsToPublish` para excluir eventos já publicados.

**Never:**
- Nunca republicar para o grupo um evento que já conste em `tracker.hasReceived(id, groupId)`.
- Nunca filtrar eventos elegíveis para o Grupo forte por `deviceId === did` quando o tracker já possui o registro de origem e destino por grupo.
- Nunca alterar `packages/sync` (WebRTC legado).
- Nunca conceder recompensas de gamificação por tráfego de rede sincronizado.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Evento recebido de outro aparelho | Aparelho B recebe evento gerado por Aparelho A via pull ou liveSub | Evento entra no banco de B; `tracker.markReceived` registra o id; em `push()`, o evento não entra em `pendingEvents` e não é republicado | Seguro (no-op de envio) |
| Backup restaurado com `deviceId` antigo | Aparelho B restaura backup com eventos contendo `deviceId: "dev-old"`; entra no grupo forte | Eventos não constam no tracker; entram em `pendingEvents`; são publicados para o grupo; Aparelho A recebe | Lote publicado normalmente |
| Três aparelhos e N eventos | 3 aparelhos trocam N eventos e executam múltiplos ciclos de push e pull | Cada evento é publicado exatamente 1 vez no grupo; total de publicações estabiliza em N e não cresce com ciclos repetidos | Sem loops de envio |
| Importação de transação remota | Aparelho B importa transação de Aparelho A | Transação é refletida no saldo e extrato de B; `totalXp` e conquistas de B permanecem inalterados | Gamificação não disparada |
| Evento local já publicado | Evento gerado por B já confirmado e marcado como `published` no tracker | `shouldPublishGroupEvents` retorna `shouldPublish: false` (`reason: "up-to-date"`); 0 eventos publicados | Sem republicação |

</intent-contract>

## Code Map

- `src/modules/syncDecisions.ts`:
  - Atualizar `shouldPublishGroupEvents`: definir `myEvents` (eventos de responsabilidade deste aparelho) como os eventos locais não recebidos do grupo (`!tracker.hasReceived(e.id, groupId)`), respeitando compatibilidade de tipo (exclusão de `PAYSLIP_*` para canal legado).
  - Eliminar o descarte cego por `deviceId === did`, permitindo que eventos locais de backup com `deviceId` antigo sejam elegíveis para envio se o grupo ainda não os tiver.
- `src/context/useSyncEngine.ts`:
  - Garantir que `pushToGroup` utilize `shouldPublishGroupEvents` atualizado e não bloqueie eventos de backup restaurados.
- `src/modules/testing/simulatedDevice.ts`:
  - Adicionar método `restoreBackupEvents(events: SyncEvent[]): void` ao `SimulatedSyncDevice` para simular restauração de backup com eventos de `deviceId` antigo sem marcá-los no tracker.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`:
  - Adicionar suíte `Story 5.6 - Nunca republicar o que veio do grupo` validando:
    1. Três aparelhos gerando e sincronizando eventos: contagem de publicações no relay é estável e não cresce com múltiplos pushes subsequentes.
    2. Aparelho que restaura backup com `deviceId` antigo publica os eventos no grupo forte com sucesso.
    3. Importação de eventos remotos não altera o estado de gamificação (`totalXp`, `unlockedTrophies`).
    4. Aparelho que recebe evento do grupo nunca o devolve em ciclos de push subsequentes.
- `src/context/__tests__/syncCoexistence.test.ts`:
  - Adicionar teste de contrato estático garantindo que `shouldPublishGroupEvents` não restringe a publicação por `deviceId`.

## Tasks & Acceptance

**Execution:**
- `src/modules/syncDecisions.ts` -- Atualizar `shouldPublishGroupEvents` para usar `!tracker.hasReceived` em vez de `deviceId === did` -- Permite enviar eventos de backup restaurados e impede republicação de eventos recebidos.
- `src/modules/testing/simulatedDevice.ts` -- Adicionar `restoreBackupEvents` e atualizar `push()` -- Permite testar restauração de backup com `deviceId` antigo.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts` -- Criar suíte completa de testes da Story 5.6 -- Comprova estabilidade de publicações, publicação de backup e ausência de ganho de XP na importação.
- `src/context/__tests__/syncCoexistence.test.ts` -- Verificar contrato estático em `useSyncEngine` e `syncDecisions` -- Garante ausência de regressões no hook e decisões.

**Acceptance Criteria:**
- Given `getMyEvents` envia só eventos do próprio `deviceId`, e um backup restaurado num aparelho novo nunca chega ao grupo
- When o envio passa a usar o registro de publicação por grupo da Story 4.6, e não o `deviceId`
- Then num teste com três aparelhos e N eventos o total de publicações é N, e não cresce com o tempo
- And um evento criado localmente (inclusive de backup restaurado, com `deviceId` antigo) é publicado se o grupo ainda não o tem
- And importar um evento de outro aparelho não gera XP nem conquista
- And o reenvio de um evento já recebido do grupo não acontece.

## Spec Change Log

*(Vazio - primeira versão da especificação)*

## Review Triage Log

- **Ciclo 1 (4 revisores em paralelo: Intent Alignment Auditor, Blind Hunter, Edge Case Hunter, Verification Gap Reviewer)**:
  - *Finding 1 (Intent Auditor / Blind Hunter / Verification Gap)*: Em `src/context/useSyncEngine.ts`, `pushMyEvents` ainda chamava `getMyEvents(did, isStrong)` diretamente (filtrando por `deviceId === did`) em vez de utilizar `decision.myEvents` e `decision.hash` retornados por `shouldPublishGroupEvents`, divergindo de `pushToGroup` e omitindo eventos de backup com `deviceId` antigo se `pushMyEvents` fosse chamado diretamente.
    - *Ação*: Aplicada correção desestruturando `myEvents: groupMyEvents` e `hash: groupHash` de `decision` em `pushMyEvents`, usando `isStrong ? pendingEvents : groupMyEvents` e repassando `groupHash` para `processPushResult` e persistência de hashes no AsyncStorage/refs.
  - *Finding 2 (Blind Hunter)*: Em `src/modules/syncDecisions.ts`, `hasReceived` em `ShouldPublishGroupEventsParams` estava opcional com fallback permissivo `!tracker.hasReceived || !tracker.hasReceived(...)`, o que enfraquecia o contrato estrito de prevenção de loop.
    - *Ação*: Tipado `tracker` como `Pick<SyncGroupTracker, "filterEventsToPublish" | "hasReceived">` obrigatoriamente e simplificado o filtro para `!tracker.hasReceived(e.id, groupId)`.
  - *Finding 3 (Blind Hunter)*: Em `src/context/__tests__/syncCoexistence.test.ts`, asserção estática buscava a regex antiga com fallback opcional.
    - *Ação*: Atualizada a asserção para `/!tracker\.hasReceived\(e\.id,\s*groupId\)/`.
  - *Finding 4 (Blind Hunter)*: Em `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`, os mocks `dummyTracker` declaravam `hasReceived` com apenas 1 argumento, e o teste de restauração de backup não verificava que o aparelho restaurado tornava-se idempotente em pushes subsequentes.
    - *Ação*: Corrigida assinatura dos mocks para `(id: string, groupId?: string) => boolean` e adicionada asserção no teste comprovando que `deviceB.push()` em seguida retorna `{ pushed: false, reason: "up-to-date", count: 0 }`.

## Design Notes

Em `shouldPublishGroupEvents`:
```ts
const candidateEvents = isStrong
  ? [...events]
  : partitionOldGroupEvents(events).allowed;

// Story 5.6: Exclui eventos recebidos deste grupo (hasReceived)
const myEvents = candidateEvents.filter((e) => !tracker.hasReceived(e.id, groupId));

if (myEvents.length === 0) {
  return {
    shouldPublish: false,
    reason: "no-events",
    myEvents: [],
    pendingEvents: [],
    hash: "empty",
  };
}

const pendingEvents = tracker.filterEventsToPublish(myEvents, groupId);
const hash = computeEventHash(myEvents);
```

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/threeDeviceSyncSimulation.test.ts` -- expected: Testes de estabilidade de publicações, supressão de eco e backup restaurado aprovados.
- `rm -f expo-env.d.ts && npx vitest run src/context/__tests__/syncCoexistence.test.ts` -- expected: Contrato estático aprovado.
- `rm -f expo-env.d.ts && npx vitest run src/context/__tests__/` -- expected: Suítes de contexto e replay aprovadas.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipo.
- `npx eslint src/modules/syncDecisions.ts src/context/useSyncEngine.ts src/modules/testing/simulatedDevice.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts` -- expected: 0 erros e 0 avisos.

## Auto Run Result

### Summary of implemented change
- `src/modules/syncDecisions.ts`:
  - Atualizada a função `shouldPublishGroupEvents` para eliminar o descarte cego por `deviceId === did`.
  - Definido `myEvents` como os eventos elegíveis para o canal (`candidateEvents`, com exclusão de `PAYSLIP_*` e dados confessionais no canal legado) que não foram recebidos do grupo (`!tracker.hasReceived(e.id, groupId)`).
  - Eventos de backups restaurados com `deviceId` antigo são mantidos como elegíveis e publicados se o grupo ainda não os possuir.
  - Eventos recebidos do grupo são estritamente filtrados e jamais republicados.
- `src/modules/testing/simulatedDevice.ts`:
  - Adicionado método `restoreBackupEvents(events: SyncEvent[]): void` ao `SimulatedSyncDevice` para permitir simulação determinística de restauração de backup com eventos de `deviceId` antigo sem marcá-los no tracker.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`:
  - Atualizado `dummyTracker` para suportar `hasReceived` e `hasPublished`.
  - Adicionados testes unitários puros para `shouldPublishGroupEvents` cobrindo supressão de eventos recebidos, eventos vazios e elegibilidade de eventos de backup restaurados.
  - Criada a suíte completa `Story 5.6 - Nunca republicar o que veio do grupo` validando:
    1. Três aparelhos gerando e sincronizando eventos: contagem total de publicações no relay é estável (exatamente 3 lotes com 9 eventos) e não cresce com múltiplos pushes repetidos subsequentes.
    2. Aparelho que restaura backup com `deviceId` antigo publica os eventos no grupo forte com sucesso e o peer os recebe e reconcilia no domínio.
    3. Importação de eventos remotos de outro aparelho não altera o estado de gamificação (`totalXp`, `level`, `unlockedAchievements`, `currentStreak`).
    4. Aparelho que recebe evento do grupo nunca o devolve em ciclos de push subsequentes (supressão estrita de eco).
    5. Compatibilidade com canal legado: eventos `PAYSLIP_*` de backup restaurado são excluídos no canal legado mas aceitos e publicados no canal forte.
- `src/context/__tests__/syncCoexistence.test.ts`:
  - Adicionado teste de contrato estático garantindo que `shouldPublishGroupEvents` não restringe a publicação por `deviceId` e utiliza `tracker.hasReceived`.

### Files changed
- `src/modules/syncDecisions.ts`
- `src/context/useSyncEngine.ts`
- `src/modules/testing/simulatedDevice.ts`
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`
- `src/context/__tests__/syncCoexistence.test.ts`
- `_bmad-output/implementation-artifacts/spec-5-6-nunca-republicar-o-que-veio-do-grupo.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Verification performed
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts src/modules/__tests__/syncPayload.test.ts`: 125/125 testes aprovados.
- `rm -f expo-env.d.ts && npx vitest run`: 115 arquivos de teste e 2716 testes aprovados (100% verde na suíte completa).
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros de tipo no TypeScript.
- `npx eslint src/context/useSyncEngine.ts src/modules/syncDecisions.ts src/modules/testing/simulatedDevice.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts`: 0 erros e 0 avisos.

### Residual risks
- Nenhum risco residual. A substituição do filtro por `deviceId` pelo registro de recebimento do tracker (`!tracker.hasReceived`) preserva a compatibilidade total dos canais forte e legado, impede loops e tempestades de retransmissão de forma idempotente e permite que backups restaurados sejam propagados normalmente.
