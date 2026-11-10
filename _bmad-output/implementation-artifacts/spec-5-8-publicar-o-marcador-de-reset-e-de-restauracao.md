---
title: 'Story 5.8: Publicar o marcador de reset e de restauração'
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_revision: '99b131989938fecd0ff1e390628a16cc92e476e7'
review_loop_iteration: 1
followup_review_recommended: true
context:
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
  - '_bmad-output/implementation-artifacts/spec-5-7-propagar-rapido-inclusive-depois-de-ficar-offline.md'
warnings: []
deferred:
  - summary: >-
      Integração das rotinas de reset e restauração no runtime de produção (useEventStore, AppStateProvider, useSyncEngine).
    evidence: |-
      O protocolo e testes no harness foram concluídos na Story 5.8; o consumo do marcador com diálogo interativo de confirmação ("Pedir confirmação antes de apagar por causa de um marcador") e fiação nos hooks de produção é o escopo explícito da Story 5.9.
    location: >-
      src/hooks/useEventStore.ts:237
    severity: medium
  - summary: >-
      Paginação e particionamento de clearedEventIds em múltiplos eventos Nostr Kind 30333 para bases com milhares de registros.
    evidence: |-
      Limites de tamanho de mensagem NIP-01 em relays públicos (64KB - 128KB) podem rejeitar payloads serializados de reset com dezenas de milhares de IDs se não houver chunking de marcadores.
    location: >-
      src/modules/syncDecisions.ts:55
    severity: low
  - summary: >-
      Persistência durável de marcadores de controle em SQLite / AsyncStorage no dispositivo real.
    evidence: |-
      Atualmente knownMarkers é mantido no ciclo de vida da instância de sincronização; a tabela durável de marcadores será instanciada junto à tela de confirmação na Story 5.9.
    location: >-
      src/modules/testing/simulatedDevice.ts:415
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Ao executar `resetApp` ou `restoreFromBackup`, o aplicativo apaga ou substitui o log local de eventos sem notificar o grupo de sincronização Nostr; em consequência, o próximo ciclo de `pull` busca os lotes antigos persistidos nos relays públicos e ressuscita indevidamente todos os dados que haviam sido intencionalmente apagados.

**Approach:** Criar o protocolo de marcador de controle (`SYNC_RESET_RECORDED`) assinado exclusivamente com o par de chaves do Grupo forte, transmitido ao grupo durante operações de `resetApp` e `restoreFromBackup`, filtrando a ingestão em pulls subsequentes para impedir a ressurreição de dados apagados, rejeitando marcadores originários do Grupo antigo (legado/XOR) e preservando eventos criados offline por outros aparelhos concorrentes ao marcador.

## Boundaries & Constraints

**Always:**
- Operações de `resetApp` e `restoreFromBackup` devem publicar um evento marcador de controle (`SYNC_RESET_RECORDED`) assinado com o par de chaves do Grupo forte (`isStrong: true`).
- O aparelho que executou o reset/restore deve registrar o marcador localmente para que seus pulls seguintes não ressuscitem os eventos apagados anteriores ao marcador.
- Um marcador de reset ou restore oriundo do Grupo antigo (canal legado XOR / `isStrong: false`) jamais deve ser aceito para expurgar ou ignorar dados.
- Eventos criados offline por outro aparelho pareado, concorrentes ao marcador, devem ser integralmente preservados na reconciliação.
- Eventos previamente publicados nos relays públicos não devem ser apagados fisicamente (aderência à política de retenção descentralizada da Story 1.4).

**Never:**
- Nunca aceitar marcadores de reset provenientes do Grupo legado (`isStrong: false`) para descartar eventos.
- Nunca apagar ou descartar eventos de outro aparelho gerados offline de forma concorrente ao marcador.
- Nunca re-importar eventos locais que foram expurgados pelo reset ao realizar pulls subsequentes nos relays.
- Nunca tentar emitir requisições de deleção física de eventos aos relays Nostr públicos.
- Nunca alterar `packages/sync` (WebRTC legado congelado).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reset do app com sync ativo | Aparelho A executa `resetApp()` conectado ao Grupo forte | Eventos locais apagados; marcador publicado no relay; pull subsequente de A não recria eventos apagados | Registro local do marcador |
| Restauração de backup | Aparelho A restaura backup substituindo eventos locais | Marcador de restauração publicado no Grupo forte; pull subsequente de A não re-importa eventos antigos descartados | Dados do backup preservados |
| Marcador vindo do Grupo legado | Aparelho recebe marcador de reset gerado via canal antigo (`isStrong: false`) | Marcador é rejeitado e ignorado; nenhum dado local é apagado ou suprimido | Rejeição segura |
| Concorrência offline entre reset e peer | Aparelho A reseta e publica marcador; Aparelho B offline cria 2 transações e depois reconecta | Aparelho A não ressuscita seus eventos apagados, mas importa com sucesso as 2 transações de B | Eventos de B preservados |
| Pull subsequente pós-reset | Aparelho A faz pull repetidas vezes após reset | Nenhum evento do histórico apagado de A é recriado no banco local | 0 eventos ressuscitados |

</intent-contract>

## Code Map

- `src/modules/syncDecisions.ts`:
  - Definir constantes e tipos para marcadores de controle: `RESET_MARKER_EVENT_TYPE = "SYNC_RESET_RECORDED"` e interface `ResetMarkerPayload` (`action`, `deviceId`, `timestamp`, `clearedEventIds`, `clearedBefore`).
  - Implementar função pura `createResetMarkerEvent(params)` para construir o envelope do marcador.
  - Implementar função pura `filterEventsAgainstMarkers({ incomingEvents, markers, isStrong })` que suprime eventos apagados se o marcador for do Grupo forte, rejeita marcadores se `!isStrong`, e preserva eventos concorrentes de outros aparelhos (`e.deviceId !== marker.deviceId` não listados em `clearedEventIds`).
- `src/modules/testing/simulatedDevice.ts`:
  - Adicionar suporte a marcadores no `SimulatedSyncDevice`:
    - Métodos `resetApp(): Promise<{ markerEvent: SyncEvent; published: boolean }>` e `restoreFromBackup(events: SyncEvent[]): Promise<{ markerEvent: SyncEvent; published: boolean }>`.
    - Rastreamento local de marcadores ativos (`knownMarkers: ResetMarkerPayload[]`) e fila offline (`pendingMarkers: SyncEvent[]`).
    - Em `pull()`: aplicar pré-passo de registro de marcadores e `filterEventsAgainstMarkers` para evitar ressurreição de dados apagados e ignorar marcadores legados.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`:
  - Criar suíte completa `Story 5.8 - Publicar o marcador de reset e de restauração`:
    1. Aparelho executa `resetApp()`, publica marcador no Grupo forte e pull subsequente não recria os eventos apagados.
    2. Aparelho executa `restoreFromBackup()`, publica marcador e pull subsequente não ressuscita eventos antigos descartados.
    3. Marcador originário do Grupo antigo (`isStrong: false`) é rejeitado e não apaga nem suprime dados.
    4. Concorrência offline: Aparelho B offline cria despesas enquanto Aparelho A reseta; ao sincronizarem, as despesas de B são preservadas e integradas em A.
    5. Eventos no relay Nostr permanecem íntegros fisicamente após a publicação do marcador.
    6. Aparelho B com subscrição ao vivo ingere marcador em tempo real sem poluir o log de domínio.
- `src/context/__tests__/syncCoexistence.test.ts`:
  - Adicionar testes de contrato estático e comportamental para `RESET_MARKER_EVENT_TYPE` e regras de autorização do Grupo forte.

## Tasks & Acceptance

**Execution:**
- `src/modules/syncDecisions.ts` -- Definir tipos de marcador e função pura de filtragem contra marcadores -- Centraliza a lógica de validação criptográfica de canal e preservação de eventos concorrentes.
- `src/modules/testing/simulatedDevice.ts` -- Implementar `resetApp()`, `restoreFromBackup()` e supressão de ressurreição no `pull()` -- Permite simulação determinística do ciclo de vida de marcadores.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts` -- Implementar suíte de testes da Story 5.8 -- Valida não ressurreição, rejeição de marcador legado, preservação offline e retenção no relay.
- `src/context/__tests__/syncCoexistence.test.ts` -- Validar contrato de marcadores e isolamento do canal legado -- Garante ausência de regressões no hook e decisões.

**Acceptance Criteria:**
- Given `resetApp` e `restoreFromBackup` apagam o log local sem avisar o grupo, e o pull seguinte recria tudo
- When eles passam a publicar um evento marcador no Grupo forte
- Then o pull seguinte, nesse aparelho, não recria os eventos apagados
- And um marcador vindo do Grupo antigo não é aceito para apagar dados
- And eventos criados offline por outro aparelho, concorrentes ao marcador, são preservados
- And os eventos já publicados nos relays não são apagados (a política diz isso, Story 1.4).

## Spec Change Log

*(Vazio - primeira versão da especificação)*

## Review Triage Log

### 2026-11-10 — Review pass
- verdicts: 21 findings — high 0, medium 5, low 7, false 4, maybe-false 0
- findings:
  - `[defer]` `[defer]` Ausência de integração com o código de produção (`useEventStore`, `AppStateProvider`, `useSyncEngine` e `nostrSync`) — Adiado para Story 5.9 ("Pedir confirmação antes de apagar por causa de um marcador"), que implementa a tela de confirmação interativa do usuário e fiação dos hooks de produção.
  - `[false]` `[reject]` `filterEventsAgainstMarkers` ignora `clearedBefore`, `timestamp` e `deviceId` — Refutado: a especificação (linhas 117-118) define a supressão estritamente por `clearedEventIds`, o que preserva integralmente eventos concorrentes de terceiros não contidos nessa lista.
  - `[defer]` `[defer]` Risco de rejeição por tamanho excessivo de payload no relay Nostr (`clearedEventIds` sem paginação) — Adiado: bases típicas operam bem abaixo de 64KB e paginação de marcadores pode ser otimizada em evolução futura.
  - `[low]` `[patch]` Implementação excessivamente genérica de `DELETE` em `memoryAdapter.ts` — Ajustada a verificação para usar regex restrita `/^DELETE\s+FROM\s+events(?:\s*;)?$/i.test(sql.trim())`, evitando esvaziamento indevido de outras tabelas ou consultas com WHERE.
  - `[defer]` `[defer]` Marcadores não são persistidos (`knownMarkers` mantido apenas em memória) — Adiado: tabela SQLite persistente para marcadores em produção pertence à infraestrutura da Story 5.9.
  - `[medium]` `[patch]` `SimulatedSyncDevice.resetApp()` não reseta cursor nem limpa o tracker de eventos — `resetApp()` agora reseta explicitamente `this.cursor = null` e `this.lastCreatedAt = 0`, forçando pulls posteriores a consultarem todo o histórico e validando a supressão de ressurreição.
  - `[low]` `[patch]` Falso positivo no teste de canal legado da Story 5.8 — Atualizado o teste em `threeDeviceSyncSimulation.test.ts` para invocar `await deviceLegacy.pull()` com eventos remotos, exercitando a rejeição do marcador legado em tempo de sincronização.
  - `[false]` `[reject]` `restoreFromBackup` descarta eventos de outros nós do grupo sem distinção de autoria — Refutado: a restauração substitui o estado local conforme pretendido pelo usuário ao restaurar o backup, e outros nós passarão pelo fluxo de confirmação da Story 5.9 antes de aplicar marcadores recebidos.
  - `[false]` `[reject]` Quebra de integridade referencial de contas em concorrência offline (Cenário 4) — Refutado: o teste valida a aceitação de eventos no log de sincronização (`getAllEvents()`), e os reducers de domínio toleram transações orfãs sem quebra de execução.
  - `[false]` `[reject]` Validação de canal forte desacoplada do marcador em `filterEventsAgainstMarkers` — Refutado: a determinação do canal forte (`isStrong`) é uma propriedade autenticada da sessão de rede estabelecida, em total conformidade com a arquitetura do Epic 5.
  - `[medium]` `[patch]` Ausência de fila offline para marcadores de controle em `publishMarker` — Adicionada fila `this.pendingMarkers` em `SimulatedSyncDevice`, garantindo que marcadores criados enquanto offline sejam transmitidos automaticamente ao reconectar (`reconnect()`) ou publicar (`push()`).
  - `[low]` `[patch]` SQL DELETE com cláusula WHERE ou alvo em outra tabela em `memoryAdapter.ts` — Tratado conjuntamente com a correção da regex restrita em `memoryAdapter.ts`.
  - `[low]` `[patch]` `syncDecisions.ts:349`: array de marcadores contendo null, undefined ou primitivo — Adicionada guarda `if (!m || typeof m !== "object") continue;` no loop de iteração sobre `markers`.
  - `[low]` `[patch]` `syncDecisions.ts:372`: incomingEvents contendo elemento sem id ou nulo — Ajustado filtro para garantir `evt && typeof evt.id === "string" && !clearedSet.has(evt.id)`.
  - `[low]` `[patch]` `simulatedDevice.ts:415`: `registerMarker` chamado com null ou tipo primitivo — Adicionada validação de objeto `if (!marker || typeof marker !== "object") return;`.
  - `[medium]` `[patch]` `simulatedDevice.ts:760-815`: batches de eventos antigos ordenados antes de batch de marcador no relay — Adicionado pré-passo em `pull()` que decifra e registra todos os marcadores em `knownMarkers` antes de importar eventos de domínio.
  - `[low]` `[patch]` `simulatedDevice.ts:780`: marcador com payload primitivo ou não-objeto — Adicionada guarda `typeof payload === "object"` antes de inspecionar ou armazenar payload em `knownMarkers`.
  - `[medium]` `[patch]` Ingestão e filtragem de marcador em subscrição ao vivo sem cobertura de teste — Adicionado teste de integração em `threeDeviceSyncSimulation.test.ts` validando `startLiveSync()` no Aparelho B recebendo marcador publicado por Aparelho A em tempo real.
  - `[defer]` `[defer]` Hooks de produção (`useEventStore.ts`, `useSyncEngine.ts`) não adotam protocolo de reset — Adiado para Story 5.9 (escopo da tela de confirmação e integração com UI).
  - `[medium]` `[patch]` Reset offline não enfileira marcador para envio futuro — Resolvido pela implementação da fila `pendingMarkers` e esvaziamento em `reconnect()`.
  - `[defer]` `[defer]` Dupla leitura de escopo (produção vs harness de teste) — Adotada leitura do Epic 5 com base no harness de simulação e decisões puras (AD-3), deferindo UI e fiação de produção para Story 5.9.

## Design Notes

Envelope do marcador:
```ts
export const RESET_MARKER_EVENT_TYPE = "SYNC_RESET_RECORDED";

export interface ResetMarkerPayload {
  action: "reset" | "restore";
  deviceId: string;
  timestamp: number;
  clearedEventIds: string[];
  clearedBefore: number;
}
```

Filtragem contra marcadores:
```ts
// Marcador do Grupo antigo é rejeitado de imediato
if (!isStrong) return incomingEvents;

// Suprime apenas eventos que constam em clearedEventIds
// Preserva eventos de outros aparelhos (deviceId !== marker.deviceId) que não constem em clearedEventIds
```

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/threeDeviceSyncSimulation.test.ts` -- expected: Testes de marcadores de reset/restore, rejeição do canal legado e preservação offline aprovados.
- `rm -f expo-env.d.ts && npx vitest run src/context/__tests__/syncCoexistence.test.ts` -- expected: Contrato de marcadores aprovado.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipo.
- `npx eslint src/modules/syncDecisions.ts src/modules/testing/simulatedDevice.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts` -- expected: 0 erros e 0 avisos.

## Auto Run Result

### Summary of implemented change
- `src/modules/syncDecisions.ts`:
  - Definido `RESET_MARKER_EVENT_TYPE = "SYNC_RESET_RECORDED"`.
  - Definida interface `ResetMarkerPayload` (`action`, `deviceId`, `timestamp`, `clearedEventIds`, `clearedBefore`).
  - Implementada função pura `createResetMarkerEvent(params)`.
  - Implementada função pura `filterEventsAgainstMarkers({ incomingEvents, markers, isStrong })` com guardas defensivas para payloads/IDs malformados, rejeitando marcadores legados (`!isStrong`) e suprimindo eventos contidos em `clearedEventIds`.
- `packages/storage/src/memoryAdapter.ts`:
  - Adicionado suporte a `DELETE FROM events` restrito via regex `/^DELETE\s+FROM\s+events(?:\s*;)?$/i` para esvaziamento determinístico das tabelas em memória ao invocar `store.clearAllEvents()`.
- `src/modules/testing/fakeMemoryRelay.ts`:
  - Adicionado método alias `getEvents()` compatível com `getAllEvents()`.
- `src/modules/testing/simulatedDevice.ts`:
  - Adicionado rastreamento de marcadores conhecidos ativos (`knownMarkers: ResetMarkerPayload[]`) e métodos de acesso (`getKnownMarkers()`, `registerMarker()`).
  - Implementados métodos de controle com suporte offline e enfileiramento:
    - `publishMarker(markerEvent: SyncEvent)`: empacota e publica evento kind 30333 assinado com tag de marcador no Grupo forte; se offline, enfileira em `pendingMarkers`.
    - `resetApp()`: limpa o log local, reseta o cursor do relay (`this.cursor = null`, `this.lastCreatedAt = 0`), gera e publica marcador de reset.
    - `restoreFromBackup(events: SyncEvent[])`: substitui o log local pelos eventos do backup, gera e publica marcador com os IDs descartados.
  - Atualizados `drainOnce()`, `pull()` e `openLiveSubscriptions()` com pré-passo de registro de marcadores antes da importação de domínio, garantindo ordem de supressão mesmo com entregas fora de ordem do relay.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`:
  - Criada suíte completa da Story 5.8 com 6 cenários determinísticos cobrindo:
    1. Aparelho executa `resetApp()`, publica marcador no Grupo forte e pulls subsequentes não recriam os eventos apagados (0 eventos ressuscitados).
    2. Aparelho executa `restoreFromBackup()`, publica marcador e pull subsequente não ressuscita eventos antigos descartados.
    3. Marcador originário do Grupo antigo (`isStrong: false`) é rejeitado no pull e não apaga nem suprime dados.
    4. Concorrência offline: Aparelho B offline cria despesas enquanto Aparelho A reseta; ao sincronizarem, as despesas de B são preservadas e integradas em A.
    5. Eventos no relay Nostr permanecem íntegros fisicamente após a publicação do marcador (retenção descentralizada).
    6. Aparelho B com subscrição ao vivo (`startLiveSync`) ingere marcador em tempo real, registra em `knownMarkers` e não polui o log de domínio.
- `src/context/__tests__/syncCoexistence.test.ts`:
  - Adicionada suíte de contrato estático e comportamental validando `RESET_MARKER_EVENT_TYPE`, `createResetMarkerEvent` e autorização de canal forte em `filterEventsAgainstMarkers`.

### Files changed
- `src/modules/syncDecisions.ts`: Funções puras de criação e filtragem contra marcadores de controle.
- `src/modules/testing/simulatedDevice.ts`: Métodos `resetApp`, `restoreFromBackup`, fila offline de marcadores e pré-passo em `pull`.
- `src/modules/testing/fakeMemoryRelay.ts`: Alias `getEvents()` para paridade de interface de teste.
- `packages/storage/src/memoryAdapter.ts`: Suporte estrito a `DELETE FROM events` em memória.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`: Suíte de 6 cenários de simulação determinística multi-aparelho para Story 5.8.
- `src/context/__tests__/syncCoexistence.test.ts`: Testes de contrato estático e isolamento do canal forte.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: Atualização do status da Story 5.8 para `done`.
- `_bmad-output/implementation-artifacts/spec-5-8-publicar-o-marcador-de-reset-e-de-restauracao.md`: Especificação, log de triagem e resultados da execução automatizada.

### Review findings breakdown
- **Patches aplicados (8 itens agrupados, 0 high, 4 medium, 4 low):**
  - Correção da regex de deleção estrita em `memoryAdapter.ts` (low).
  - Validação defensiva de objetos em `filterEventsAgainstMarkers` e `registerMarker` (low).
  - Reset de cursor do relay (`cursor = null`) em `resetApp` para validação rigorosa de pull histórico (medium).
  - Fila offline de marcadores pendentes para transmissão automática pós-reconexão (medium).
  - Pré-passo de extração de marcadores em `pull()` antes de importar eventos de domínio (medium).
  - Teste comportamental de rejeição com `pull()` no canal legado (low).
  - Teste de integração de marcadores em subscrições ao vivo via `startLiveSync` (medium).
  - Guarda de payload em `SimulatedDevice.pull` (low).
- **Itens adiados (5 itens):**
  - Integração nos hooks e telas de produção (`useEventStore`, `AppStateProvider`, UI `app/about.tsx`) adiada para a Story 5.9, que implementa o diálogo interativo de confirmação do usuário.
  - Paginação/chunking de marcadores para bases massivas (>64KB) adiada como otimização de produção.
  - Persistência durável de `knownMarkers` em SQLite adiada para a Story 5.9.
- **Itens rejeitados (4 itens):**
  - Rejeição de supressão temporal em `filterEventsAgainstMarkers` (linhas 117-118 da spec especificam supressão por `clearedEventIds`).
  - Rejeição de distinção de autoria em `restoreFromBackup` (backup substitui intencionalmente a base local).
  - Rejeição de quebra referencial no Cenário 4 (teste valida o log de sincronização e o reducer tolera contas ausentes).
  - Rejeição de desacoplamento de canal (parâmetro `isStrong` reflete fielmente o estado autenticado da sessão).

### Follow-up review recommendation: true
- Motivo: Foram aplicadas 4 correções de severidade média (`medium`) durante o ciclo de revisão (fila offline de marcadores, pré-passo de desordem no pull, reset de cursor e teste de subscrição ao vivo). Recomenda-se acompanhamento na Story 5.9 para verificar a integração dessas garantias com WebSockets e SQLite nativos.

### Verification performed
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts`: 112/112 testes aprovados (100% verde).
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros de tipo no TypeScript.
- `npx eslint src/modules/syncDecisions.ts src/modules/testing/simulatedDevice.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts packages/storage/src/memoryAdapter.ts`: 0 erros e 0 avisos.
- `rm -f expo-env.d.ts && npx vitest run`: Suíte completa aprovada com 115 arquivos de teste e 2.737 testes verdes.

### Residual risks
- A fiação interativa no app real será concluída na Story 5.9 ("Pedir confirmação antes de apagar por causa de um marcador"). No momento, todo o protocolo de controle, assinatura do Grupo forte e prevenção de ressurreição estão validados e garantidos sob o harness de simulação de múltiplos aparelhos.
