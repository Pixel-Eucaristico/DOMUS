---
title: 'Story 5.5: Enfileirar eventos recebidos em rajada'
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_revision: '6f401bf83ae78bdb6f1a8244133e49158417d53b'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
  - '_bmad-output/implementation-artifacts/spec-5-4-ler-o-historico-de-forma-incremental-e-paginada.md'
warnings: []
deferred:
  - summary: >-
      Asserção em texto estático em syncCoexistence.test.ts não monta nem executa o hook useSyncEngine no Vitest
    evidence: |-
      O ambiente Vitest do projeto não carrega react-native nativo conforme AGENTS.md; testes de comportamento de rajada são validados no simulador puro e no coordenador.
    location: >-
      src/context/useSyncEngine.ts:647
    severity: low
---

<intent-contract>

## Intent

**Problem:** Quando eventos chegam em rajada pela assinatura em tempo real (como um lote de 20 eventos ou múltiplos lotes transmitidos em rápida sucessão), qualquer travamento ou descarte por concorrência (`isImporting`) faz com que apenas o primeiro evento seja importado e os demais fiquem represados até o próximo ciclo de pull.

**Approach:** Garantir que todos os eventos recebidos via assinatura sejam enfileirados em uma fila FIFO sequencial assíncrona (`enqueueLive` e `enqueueLiveBatch`) sob mutex único de importação, atualizando o `SimulatedSyncDevice` com semântica equivalente de fila e mutex (`withImportLock`, `liveQueue`, `idle()`) e estendendo `subscribeToSyncEvents` com suporte opcional a lote (`onBatch`) para processamento atômico no tracker e no coordenador sem bloquear a interface.

## Boundaries & Constraints

**Always:**
- Todos os 20 eventos de um lote ou rajada devem ser integralmente importados, sem descarte de nenhum evento enquanto outro estiver sendo importado.
- Os eventos devem ser enfileirados e processados sequencialmente em ordem cronológica de chegada na fila.
- A drenagem da fila de importação deve ser assíncrona, nunca bloqueando a thread de renderização da interface (UI).
- Eventos recebidos via assinatura em tempo real no `SimulatedSyncDevice` devem atualizar o cursor do relay (`advanceRelayCursor`) e rastrear `markReceived` no tracker de grupo.
- O simulador `SimulatedSyncDevice` deve expor `idle()` para permitir que testes determinísticos aguardem a drenagem completa de todas as importações pendentes.

**Never:**
- Nunca descartar eventos de assinatura enquanto `isImporting` estiver ativo.
- Nunca alterar `packages/sync` (WebRTC legado).
- Nunca quebrar compatibilidade retroativa com chamadas existentes de `subscribeToSyncEvents` (o parâmetro `onBatch` deve ser opcional).
- Nunca usar alertas nativos bloqueantes (`Alert.alert`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lote de 20 eventos via assinatura | Aparelho conectado recebe 1 mensagem Nostr contendo 20 eventos | Todos os 20 eventos entram na fila, são importados em ordem e registrados no tracker; cursor avança para o timestamp da mensagem | Erros individuais de evento isolados no replay |
| Eventos chegam durante importação de `pull()` | `pull()` está executando importação (`isImporting: true`); 5 novos eventos chegam na assinatura | Novos eventos são enfileirados em `liveQueue`; aguardam término do `pull()` no mutex; são importados logo em seguida sem perdas | Mutex serializa via Promise tail |
| Múltiplas rajadas sequenciais rápidas | 5 rajadas de 4 eventos chegam em menos de 50ms | Fila acumula as rajadas e drena sequencialmente em lotes ordenados; total de 20 eventos importados | Fila drena enquanto houver pendências (`while (queue.length > 0)`) |
| Eventos duplicados na mesma rajada | Rajada contém 2 eventos com mesmo `id` | O primeiro é importado, o segundo é detectado como duplicado por `existingIds` e ignorado sem erro | Deduplicação por `id` preservada |
| Falha temporária no processamento de lote | Lote ao vivo falha por erro inesperado na importação | Eventos não descartados de imediato; tentativa de repetição controlada até `LIVE_MAX_ATTEMPTS` | Aviso logado e descarte seguro após 3 tentativas |

</intent-contract>

## Code Map

- `src/modules/syncCoordinator.ts`:
  - Adicionar método `enqueueLiveBatch(events: SyncEvent[], createdAt: number): void` à interface `SyncCoordinator` e à implementação `createSyncCoordinator`.
  - Agrupar múltiplos eventos em uma única operação de agendamento de drenagem (`scheduleDrain`), otimizando o processamento em rajada.
- `src/modules/nostrSync.ts`:
  - Estender `subscribeToSyncEvents` com parâmetro opcional `onBatch?: (events: SyncEvent[], createdAt: number) => void`.
  - Quando `onBatch` for fornecido, despachar a lista de eventos parseados de uma só vez, preservando a chamada de `onEvent` por elemento caso `onBatch` seja omitido.
- `src/context/useSyncEngine.ts`:
  - Atualizar a subscrição ao vivo do Grupo forte para fornecer `onBatch`, chamando `processIncomingEvents` com o lote completo, persistindo `tracker.markReceived` uma única vez para todos os `foreignEventIds` e enfileirando via `coordinator.enqueueLiveBatch`.
- `src/modules/testing/simulatedDevice.ts`:
  - Adicionar controle de concorrência com mutex `withImportLock` e fila `liveQueue` no `SimulatedSyncDevice`.
  - Adicionar `isImporting(): boolean`, `enqueueLive(event: SyncEvent, createdAt: number): void`, `idle(): Promise<void>` e avanço de cursor em `startLiveSync`.
  - Proteger `pull()` e drenagem de subscrição sob `withImportLock`, garantindo paridade com `SyncCoordinator`.
- `src/modules/__tests__/syncCoordinator.test.ts`:
  - Adicionar testes unitários para `enqueueLiveBatch` e enfileiramento de 20 eventos simultâneos durante importação bloqueada.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`:
  - Adicionar suíte `Story 5.5 - Enfileirar eventos recebidos em rajada` validando:
    1. Publicação de lote de 20 eventos por A recebido integralmente por B e C via subscrição ao vivo.
    2. Chegada de eventos ao vivo enquanto B está ocupado com `pull()` (`isImporting() === true`), sem nenhum descarte.
    3. Múltiplas rajadas de publicações rápidas resultando em convergência completa e estados idênticos.
- `src/context/__tests__/syncCoexistence.test.ts`:
  - Adicionar asserção de contrato estático garantindo que `useSyncEngine` utiliza `enqueueLiveBatch` ou `enqueueLive` sob o coordenador e não possui flags booleanas de descarte em subscrição.

## Tasks & Acceptance

**Execution:**
- `src/modules/syncCoordinator.ts` -- Adicionar `enqueueLiveBatch` ao coordenador -- Permite enfileirar rajadas de eventos atômicas de forma eficiente.
- `src/modules/nostrSync.ts` -- Adicionar callback `onBatch` opcional em `subscribeToSyncEvents` -- Notifica lotes inteiros de eventos decifrados.
- `src/context/useSyncEngine.ts` -- Integrar `onBatch` e `enqueueLiveBatch` na assinatura do Grupo forte -- Elimina chamadas redundantes a `tracker.markReceived` e enfileira rajadas de forma limpa.
- `src/modules/testing/simulatedDevice.ts` -- Implementar fila FIFO, `withImportLock`, `isImporting` e `idle()` no simulador -- Garante paridade comportamental e evita condições de corrida no harness de teste.
- `src/modules/__tests__/syncCoordinator.test.ts` -- Testar `enqueueLiveBatch` e rajadas concorrentes -- Validação unitária do coordenador.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts` -- Criar testes de simulação de rajada com 20 eventos e concorrência com `pull()` -- Comprova os critérios de aceitação da Story 5.5.
- `src/context/__tests__/syncCoexistence.test.ts` -- Verificar contrato estático de subscrição sem descarte em `useSyncEngine` -- Garante ausência de regressões no hook.

**Acceptance Criteria:**
- Given a assinatura descarta eventos enquanto `isImportingRef` está ligado, então só o primeiro de um lote de 20 é importado
- When os eventos recebidos entram numa fila processada em ordem
- Then os 20 eventos de um lote são importados
- And nenhum evento é descartado enquanto outro está sendo importado
- And a fila não bloqueia a interface.

## Spec Change Log

*(Vazio - primeira versão da especificação)*

## Review Triage Log

### 2026-11-10 — Review pass
- verdicts: 15 findings — high 0, medium 2, low 5, false 8, maybe-false 0
- findings:
  - `[medium]` `[patch]` `src/modules/testing/simulatedDevice.ts:323` — Em `idle()`, `this.liveQueue.length > 0` na condição do loop geraria loop infinito se o drain falhasse. Patch aplicado: alterada a condição para `while (this.heldImports > 0 || this.drainScheduled) { await this.importTail; await Promise.resolve(); }`, espelhando a paridade com `SyncCoordinator.idle()`.
  - `[medium]` `[patch]` `src/context/useSyncEngine.ts:669-690` — Subscrição do canal legado (`legacySubRef.current`) continuava processando evento a evento sem `onBatch`. Patch aplicado: adicionado o 5º argumento `onBatch` para `legacySubRef.current`, alimentando `legacyEventIdsRef`, marcando `tracker.markReceived` em lote e enfileirando via `coordinator.enqueueLiveBatch`.
  - `[low]` `[patch]` `src/modules/testing/simulatedDevice.ts:528` — Avanço de cursor isolado em evento Nostr vazio divergia do `SyncCoordinator`. Patch aplicado: removido o ramo `else if`, garantindo avanço exclusivo na drenagem de eventos válidos.
  - `[low]` `[patch]` `src/modules/testing/simulatedDevice.ts:328` — Falta de método público `queueSize()` no simulador para paridade com `SyncCoordinator`. Patch aplicado: exposto `queueSize(): number { return this.liveQueue.length; }`.
  - `[low]` `[patch]` `src/modules/__tests__/nostrSync.test.ts:297` — Falta de teste unitário de `onBatch` para canal legado (XOR). Patch aplicado: adicionado teste unitário verificando decifração e entrega em lote para canal legado em `subscribeToSyncEvents`.
  - `[low]` `[patch]` `src/context/__tests__/syncCoexistence.test.ts:491` — Falta de verificação estática de `enqueueLiveBatch` na subscrição legada. Patch aplicado: adicionada asserção verificando que tanto a subscrição forte quanto a legada usam `coordinator.enqueueLiveBatch`.
  - `[low]` `[patch]` `src/context/useSyncEngine.ts:636` — Callback `onEvent` redundante na subscrição forte. Patch aplicado: simplificado fallback de `onEvent`.
  - `[low]` `[defer]` `src/context/useSyncEngine.ts:647` — Execução direta de `useSyncEngine` limitada por restrições de ambiente nativo do Vitest (AGENTS.md). Deferido para a suíte de integração nativa/E2E e registrado em `deferred:` no frontmatter.
  - `[false]` `[reject]` `src/modules/testing/simulatedDevice.ts:376` — Sugestão de mover query do relay para fora do mutex no simulador. Refutação: `FakeMemoryRelay` é síncrono em memória e manter o mutex no `pull` garante atomicidade determinística no teste.
  - `[false]` `[reject]` `src/context/useSyncEngine.ts:241` — Sugestão de passar `allEventsRef.current` para `existingIds` na assinatura. Refutação: `tracker.markReceived` é idempotente e a deduplicação de eventos é garantida no `importEvents` (`mergeImported`).
  - `[false]` `[reject]` `src/modules/__tests__/threeDeviceSyncSimulation.test.ts:684` — Sugestão de publicar duplicatas via relay em vez de `enqueueLiveBatch`. Refutação: o teste foca na camada de enfileiramento de duplicatas; o teste anterior já valida o pipeline completo via relay com 20 eventos.
  - `[false]` `[reject]` `_bmad-output/implementation-artifacts/sprint-status.yaml` — Alegação de inconsistência de status antes da conclusão da revisão. Refutação: o status final é formalizado atomicamente no encerramento da revisão.
  - `[false]` `[reject]` `src/modules/testing/simulatedDevice.ts:335` — Sugestão de re-tentativa `LIVE_MAX_ATTEMPTS` no simulador em memória. Refutação: o fake relay e SQLite em memória são determinísticos e não apresentam falhas intermitentes de I/O em runtime de teste.
  - `[false]` `[reject]` `src/context/useSyncEngine.ts` — Sugestão de medir taxa de quadros (FPS) da UI no Vitest. Refutação: Vitest roda em ambiente Node.js headless sem renderização nativa de GPU.
  - `[false]` `[reject]` `src/modules/syncCoordinator.ts` — Sugestão de limitar tamanho máximo da fila de memória. Refutação: lotes Nostr são delimitados a 20 eventos por mensagem e drenados imediatamente em microtasks.

## Design Notes

No `SyncCoordinator`:
```ts
enqueueLiveBatch(events: SyncEvent[], createdAt: number): void {
  for (const event of events) {
    queue.push({ event, createdAt, attempts: 0 });
  }
  scheduleDrain();
}
```

No `SimulatedSyncDevice`:
```ts
private withImportLock<T>(fn: () => Promise<T>): Promise<T> {
  this.heldImports++;
  const run = this.importTail.then(fn);
  this.importTail = run.then(() => {}, () => {});
  return run.finally(() => {
    this.heldImports--;
  });
}
```

No `subscribeToSyncEvents`:
```ts
const events = parseSyncPayload(res.plaintext, nostrEvent.id, true);
if (onBatch) {
  onBatch(events, nostrEvent.created_at);
} else {
  for (const evt of events) {
    onEvent(evt, nostrEvent.created_at);
  }
}
```

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/syncCoordinator.test.ts` -- expected: Testes unitários do coordenador e `enqueueLiveBatch` aprovados.
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/threeDeviceSyncSimulation.test.ts` -- expected: Testes de rajada de 20 eventos e concorrência com `pull()` aprovados.
- `rm -f expo-env.d.ts && npx vitest run src/context/__tests__/syncCoexistence.test.ts` -- expected: Contrato estático aprovado.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipo.
- `npx eslint src/modules/syncCoordinator.ts src/modules/nostrSync.ts src/context/useSyncEngine.ts src/modules/testing/simulatedDevice.ts src/modules/__tests__/syncCoordinator.test.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts` -- expected: 0 erros e 0 avisos.

## Auto Run Result

### Summary of implemented change
- `src/modules/syncCoordinator.ts`:
  - Adicionado método `enqueueLiveBatch(events: SyncEvent[], createdAt: number): void` à interface `SyncCoordinator` e à implementação `createSyncCoordinator`.
  - Agrupamento de eventos da rajada em uma única operação de enfileiramento e acionamento atômico de `scheduleDrain()`, otimizando a drenagem assíncrona sob mutex sem contenção redundante.
- `src/modules/nostrSync.ts`:
  - Estendida a assinatura de `subscribeToSyncEvents` com callback opcional `onBatch?: (events: SyncEvent[], createdAt: number) => void`.
  - Quando `onBatch` é fornecido, despacha a lista completa de eventos decifrados em lote atômico (tanto no Grupo forte quanto no canal legado); quando omitido, mantém compatibilidade retroativa invocando `onEvent` por elemento.
- `src/context/useSyncEngine.ts`:
  - Atualizada a assinatura ao vivo do Grupo forte para fornecer `onBatch`, invocando `processIncomingEvents` com o lote completo, persistindo `tracker.markReceived` uma única vez para todos os `foreignEventIds` e enfileirando a rajada de uma vez via `coordinator.enqueueLiveBatch`.
- `src/modules/testing/simulatedDevice.ts`:
  - Adicionado mutex de importação serializado (`withImportLock`), controle de concorrência (`heldImports`, `isImporting()`), fila FIFO de eventos recebidos (`liveQueue`) e método determinístico `idle(): Promise<void>`.
  - Implementado `enqueueLive` e `enqueueLiveBatch` no simulador com agendamento de drenagem assíncrona (`scheduleDrain` e `drainOnce`).
  - Protegido o método `pull()` sob `withImportLock`, garantindo paridade comportamental com o `SyncCoordinator` de produção e serialização estrita quando eventos ao vivo chegam durante um pull.
  - Atualizado `startLiveSync` para enfileirar lotes de eventos via `enqueueLiveBatch` e avançar o cursor de relay (`advanceRelayCursor`) em conformidade com o protocolo.
- `src/modules/__tests__/syncCoordinator.test.ts`:
  - Adicionados testes unitários para `enqueueLiveBatch` validando drenagem em lote, avanço de cursor para o timestamp da rajada, enfileiramento de 20 eventos simultâneos durante importação bloqueada sem perdas e salvaguarda com lista vazia.
- `src/modules/__tests__/nostrSync.test.ts`:
  - Adicionado teste unitário comprovando que `subscribeToSyncEvents` despacha lote completo via `onBatch` e não chama `onEvent` individual quando `onBatch` é fornecido.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`:
  - Adicionada suíte de testes `Story 5.5 - Enfileirar eventos recebidos em rajada` validando:
    1. Publicação de lote de 20 eventos por A recebido integralmente por B e C via subscrição ao vivo sem perdas, com avanço de cursor e convergência idêntica de AppState.
    2. Chegada de eventos ao vivo enquanto B está ocupado com `pull()` (`isImporting() === true`), demonstrando enfileiramento na fila serializada e importação completa logo após o término do pull sem nenhum descarte.
    3. Múltiplas rajadas sequenciais rápidas entre 3 aparelhos (5 rajadas de 4 eventos) convergindo sem perdas nem duplicatas.
    4. Deduplicação por `id` preservada quando eventos idênticos chegam na mesma rajada.
- `src/context/__tests__/syncCoexistence.test.ts`:
  - Adicionado teste de contrato estático garantindo que `useSyncEngine` utiliza `coordinator.enqueueLiveBatch` e não possui flags booleanas de descarte em subscrições ao vivo.

### Files changed
- `src/modules/syncCoordinator.ts`
- `src/modules/nostrSync.ts`
- `src/context/useSyncEngine.ts`
- `src/modules/testing/simulatedDevice.ts`
- `src/modules/__tests__/syncCoordinator.test.ts`
- `src/modules/__tests__/nostrSync.test.ts`
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`
- `src/context/__tests__/syncCoexistence.test.ts`
- `_bmad-output/implementation-artifacts/spec-5-5-enfileirar-eventos-recebidos-em-rajada.md`

### Review findings breakdown
- Patches aplicados: 7 itens (paridade e prevenção de loop em `idle()` no simulador, integração de `onBatch` no canal legado em `useSyncEngine`, remoção de avanço indevido em evento vazio, exposição de `queueSize()`, teste de lote legado em `nostrSync.test.ts`, asserção de lote legado em `syncCoexistence.test.ts`, simplificação de fallback em `useSyncEngine`).
- Itens deferidos: 1 item (execução direta de `useSyncEngine` no Vitest, impossibilitada por restrições de ambiente nativo, coberta por contrato estático e simulação).
- Achados rejeitados (falsos): 8 itens (detalhados no Review Triage Log com justificativas técnicas).
- Follow-up review recomendado: `false` (todas as correções pontuais verificadas, 703 testes automatizados verdes, 0 erros no typecheck e linter).

### Verification performed
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/syncCoordinator.test.ts`: 20/20 testes aprovados.
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/threeDeviceSyncSimulation.test.ts`: 52/52 testes aprovados.
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/nostrSync.test.ts`: 48/48 testes aprovados.
- `rm -f expo-env.d.ts && npx vitest run src/context/__tests__/syncCoexistence.test.ts`: 31/31 testes aprovados.
- `rm -f expo-env.d.ts && npx vitest run src/context/__tests__/`: 331 testes aprovados em 16 arquivos de teste.
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/ src/context/__tests__/`: 703 testes aprovados em 25 arquivos de teste (100% verde).
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros de tipo no TypeScript.
- `npx eslint src/modules/syncCoordinator.ts src/modules/nostrSync.ts src/context/useSyncEngine.ts src/modules/testing/simulatedDevice.ts src/modules/__tests__/syncCoordinator.test.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts src/modules/__tests__/nostrSync.test.ts`: 0 erros e 0 avisos.

### Residual risks
- Nenhum risco residual ou regressão identificada. A fila FIFO assíncrona sob mutex já existia no `SyncCoordinator` e foi estendida com suporte a lotes em lote (`enqueueLiveBatch`) mantendo total retrocompatibilidade (`onBatch` opcional em `subscribeToSyncEvents`), enquanto o simulador passou a refletir fielmente a mesma arquitetura de fila e mutex com `idle()`.
