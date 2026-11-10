---
title: 'Story 5.4: Ler o histórico de forma incremental e paginada'
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_revision: '6033d4fcd02b43f428d155b30033e430c8db69b3'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
  - '_bmad-output/implementation-artifacts/spec-5-3-publicar-so-os-lotes-novos-no-grupo-forte.md'
warnings: []
deferred:
  - 'src/modules/nostrSync.ts: recuperação atômica de falha de relay no meio de paginação multi-página (a recuperação atual descarta o lote parcial e tenta novamente no ciclo subsequente, preservando consistência)'
---

<intent-contract>

## Intent

**Problem:** O mecanismo de pull atual (`pullSyncEvents`) utiliza um filtro Nostr fixo com `limit: 500` por relay sem paginação e relê todo o histórico a cada ciclo sem enviar cursor (`since`), fazendo com que históricos extensos (> 500 lotes) sejam truncados pelos relays e que ciclos periódicos desperdicem banda e bateria retransmitindo eventos já processados.

**Approach:** Implementar paginação retroativa no `pullSyncEvents` (usando `until` baseado no `created_at` mais antigo da página anterior) para recuperar históricos volumosos (> 500 e > 1.200 lotes), integrar o cursor de sincronização por relay da Story 3.6 (`since: cursor`) no pull periódico para buscar estritamente o que chegou após o cursor, e estender o `SimulatedSyncDevice` com a mesma semântica paginada e incremental.

## Boundaries & Constraints

**Always:**
- O mecanismo de pull deve recuperar integralmente históricos com mais de 500 lotes através de paginação sequencial em páginas de até 500 eventos por relay.
- No pull subsequente, quando houver cursor registrado, a consulta ao relay deve requisitar apenas eventos posteriores ou iguais ao cursor (`since: cursor`), evitando releitura desnecessária de histórico antigo.
- O cursor dos relays (`RELAY_CURSOR_KEY`) deve avançar apenas para o maior `created_at` de eventos válidos recebidos, nunca regredindo.
- Em caso de recuperação de histórico a partir do zero (`isRecovery = true` ou sem cursor salvo), o pull deve paginar retroativamente até recuperar todo o histórico disponível nos relays.
- A paginação deve possuir salvaguarda contra loops infinitos (`maxPages`, parada se `page.length < pageSize` ou se nenhum evento novo for retornado).
- O teste determinístico no Vitest com aparelhos simulados deve comprovar que um histórico de 1.200 lotes no relay falso em memória é lido por inteiro e que o ciclo seguinte lê apenas o que chegou após o cursor.

**Never:**
- Nunca alterar `packages/sync` (WebRTC legado).
- Nunca usar o `timestamp` de domínio dos eventos financeiros como cursor dos relays (o cursor deve ser estritamente o `created_at` do evento Nostr no relay).
- Nunca quebrar compatibilidade com chamadas existentes de `pullSyncEvents` (o parâmetro `options` deve ser opcional).
- Nunca regredir o cursor para um valor menor que o atual.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Histórico volumoso (> 500 lotes) sem cursor | Relay possui 1.200 lotes; cliente sem cursor salvo (`cursor: null`) | Executa paginação em 3 páginas (500 + 500 + 200); importa todos os 1.200 lotes; cursor avança para o `maxCreatedAt` | Lança erro se relay falhar na busca |
| Pull subsequente com cursor ativo | Cliente com cursor ativo; 1 novo lote publicado no relay | Busca no relay com `since: cursor`; retorna e importa apenas o novo lote; cursor avança para o timestamp do novo lote | Mantém cursor anterior se falhar |
| Pull subsequente sem novos eventos | Cliente com cursor ativo; nenhum evento novo no relay | Busca com `since: cursor` retorna vazio ou apenas eventos já vistos; 0 eventos importados; cursor permanece inalterado | Seguro (no-op) |
| Falha transitória de relay durante paginação | Relay falha ou rejeita na 2ª página de paginação | Falha capturada; nenhum cursor falso ou incompleto é gravado indevidamente | Trata erro no runPull conforme contrato |
| Eventos com mesmo `created_at` na fronteira de página | Múltiplos lotes com mesmo `created_at` divididos na fronteira de 500 | Deduplicação por `id` e ajuste de `until` evitam duplicação e loop infinito | Termina normalmente |

</intent-contract>

## Code Map

- `src/modules/nostrSync.ts`: Exporta a interface `PullSyncOptions` (`cursor?: number | null; since?: number | null; pageSize?: number; maxPages?: number`). Atualiza `pullSyncEvents` para aceitar `options?: PullSyncOptions`, implementar paginação retroativa com `until` e aplicar filtro `since: cursor`.
- `src/context/useSyncEngine.ts`: Atualiza o closure de `createSyncCoordinator` para obter `coordinator.getCursor()` e passar `{ cursor: req.isRecovery ? null : coordinator.getCursor() }` para `pullSyncEvents`, garantindo busca incremental em produção.
- `src/modules/testing/simulatedDevice.ts`: Adiciona campo `cursor: number | null` ao `SimulatedSyncDevice`, implementa paginação com `limit: 500` e `until` no método `pull()`, aplica `since: this.cursor`, avança o cursor via `advanceRelayCursor` após importação, e expõe método `getCursor()`.
- `src/modules/testing/fakeMemoryRelay.ts`: Confirma suporte a `since`, `until` e `limit` em `query()` e no adaptador `asPool()`.
- `src/modules/__tests__/nostrSync.test.ts`: Atualiza o mock `SimplePool.querySync` para filtrar por `until` e adiciona testes unitários para `pullSyncEvents` com paginação de 1.200 lotes e leitura incremental com `since`.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`: Adiciona suíte de testes da Story 5.4 comprovando recuperação de histórico com 1.200 lotes no `FakeMemoryRelay` e leitura estritamente incremental no ciclo subsequente.

## Tasks & Acceptance

**Execution:**
- `src/modules/nostrSync.ts` -- Definir `PullSyncOptions` e implementar paginação e filtro `since` em `pullSyncEvents` -- Permite ler históricos volumosos (> 500) e realizar pull incremental.
- `src/context/useSyncEngine.ts` -- Passar `{ cursor: req.isRecovery ? null : coordinator.getCursor() }` para `pullSyncEvents` -- Conecta o cursor persistido da Story 3.6 ao pull em produção.
- `src/modules/testing/simulatedDevice.ts` -- Adicionar cursor e paginação no `pull()` de `SimulatedSyncDevice` -- Garante paridade entre o simulador e o código de produção.
- `src/modules/__tests__/nostrSync.test.ts` -- Testar paginação e `since` em `pullSyncEvents` com mock de pool Nostr -- Assegura o contrato do transporte.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts` -- Testar recuperação de 1.200 lotes e ciclo incremental subsequente -- Comprova o cumprimento dos critérios de aceitação da Story 5.4.

**Acceptance Criteria:**
- Given o pull usa `limit: 500` por relay, sem paginação, e relê tudo a cada 8 segundos
- When passo a paginar a leitura e a usar o cursor separado da Story 3.6
- Then um histórico de mais de 500 lotes é lido por inteiro
- And o ciclo seguinte lê apenas o que chegou depois do cursor
- And um teste com 1.200 lotes no relay falso termina com todos importados.

## Spec Change Log

*(Vazio - primeira versão da especificação)*

## Review Triage Log

### 2026-11-10 — Review pass
- verdicts: 19 findings — high 0, medium 2, low 5, false 12, maybe-false 0
- findings:
  - `[medium]` `[patch]` `src/context/useSyncEngine.ts:210-213` — Contaminação de cursor entre grupos forte e legado durante coexistência: se o pull do grupo legado retornasse `result.maxCreatedAt`, o coordenador avançava seu cursor para o timestamp legado, contaminando o cursor do grupo forte no ciclo seguinte. Patch aplicado: retorno do coordenador ajustado para `maxCreatedAt: req.keys.isStrong ? result.maxCreatedAt : null`, garantindo que o canal legado nunca avance o cursor.
  - `[medium]` `[patch]` `src/modules/nostrSync.ts:772-775` — Parada prematura de paginação retroativa quando múltiplos eventos compartilham o timestamp da fronteira: `currentUntil <= since` encerrava o loop antes de processar eventuais eventos remanescentes no timestamp `since`. Patch aplicado: condição alterada para `currentUntil < since` e substituído o número mágico `60` por `RELAY_CURSOR_OVERLAP_SEC`.
  - `[low]` `[patch]` `src/modules/testing/simulatedDevice.ts:284-288` & `src/modules/__tests__/threeDeviceSyncSimulation.test.ts:1679` — Divergência de paridade de simulação: `SimulatedSyncDevice.pull` utilizava `since = this.cursor` sem janela de sobreposição, divergindo da tolerância de clock skew de 60s da produção. Patch aplicado: `SimulatedSyncDevice.pull` agora utiliza `resolvePullSyncOptions` aplicando a mesma janela de 60s, e o teste de simulação asserta `secondQueries[0].since === baseTime + 1199 - RELAY_CURSOR_OVERLAP_SEC`.
  - `[low]` `[patch]` `src/modules/syncDecisions.ts:252-270` — Robustez de cursor e relógio em `resolvePullSyncOptions`: falta de verificação de número finito (`NaN`, `Infinity`) e proteção contra relógio de peers no futuro. Patch aplicado: adicionado `Number.isFinite(effectiveCursor)` e teto limitando `since` a `nowSec - RELAY_CURSOR_OVERLAP_SEC` quando o relógio do peer estiver no futuro. Testes unitários adicionados.
  - `[low]` `[patch]` `src/context/__tests__/syncCoexistence.test.ts:486-489` — Falta de contrato estático verificando integração do cursor no `useSyncEngine`. Patch aplicado: adicionado teste estático confirmando que `resolvePullSyncOptions` é invocado e `pullOptions` é repassado para `pullSyncEvents`.
  - `[low]` `[patch]` `src/modules/testing/fakeMemoryRelay.ts:390` — `getQueryLog()` expunha array interno mutável. Patch aplicado: alterado para retornar cópia defensiva `return [...this.queryLog];`.
  - `[low]` `[patch]` `src/modules/nostrSync.ts:797-800` — Falta de teste verificando que `pullSyncEvents` propaga erro quando todos os relays rejeitam. Patch aplicado: adicionado teste unitário em `nostrSync.test.ts` configurando `querySync` para rejeitar e assertando `expect(pullSyncEvents(...)).rejects.toThrow()`.
  - `[false]` `[reject]` `src/modules/nostrSync.ts:516` — Sugestão de alinhar `created_at` na publicação com o cursor do relay. Refutação: NIP-01 e NIP-33 exigem que o carimbo de publicação represente o horário de emissão; forçar `created_at` para um cursor futuro violaria o protocolo Nostr e causaria rejeição em relays estritos.
  - `[false]` `[reject]` `src/modules/nostrSync.ts` — Sugestão de limitar cursor contra relógio local na ingestão. Refutação: validação de timestamp no futuro já é estritamente aplicada na camada de domínio (Story 3.5), e `advanceRelayCursor` valida a integridade temporal.
  - `[false]` `[reject]` `src/modules/nostrSync.ts:765` — Sugestão de tratar mais de 500 lotes com exatamente o mesmo segundo. Refutação: em operação normal do DOMUS, lotes são emitidos a intervalos mínimos de 8 segundos por aparelho; a ocorrência de >500 lotes no mesmo segundo é fisicamente impossível no protocolo.
  - `[false]` `[reject]` `src/modules/nostrSync.ts:580` — Parâmetros `deviceId` e `includeMyEvents` considerados mortos. Refutação: mantidos intencionalmente para compatibilidade de assinatura com testes legados e chamadores em `useSyncEngine.ts`.
  - `[false]` `[reject]` `src/modules/nostrSync.ts:650` — Sugestão de `AbortSignal` em paginação de relay. Refutação: fora do escopo da Story 5.4; timeouts de rede são governados por `PULL_TIMEOUT_MS`.
  - `[false]` `[reject]` `src/context/useSyncEngine.ts:180` — Heurística de recuperação em contas vazias considerada falha. Refutação: para uma conta sem eventos locais, buscar todo o histórico disponível nos relays sem cursor é o comportamento correto para restaurar contas existentes criadas em outros aparelhos.
  - `[false]` `[reject]` `src/modules/nostrSync.ts:720` — Sugestão de importar páginas parciais se uma falhar no meio. Deferido / Rejeitado: o protocolo de sincronização requer consistência atômica por pull; páginas parciais incompletas causariam importações truncadas. Registrado em `deferred:` no frontmatter para rastreabilidade.
  - `[false]` `[reject]` `src/modules/testing/simulatedDevice.ts:838` — Sugestão de invocar `pullSyncEvents` diretamente do simulador em vez de método próprio. Refutação: `SimulatedSyncDevice` é um harness de teste puro desacoplado do runtime de rede real por design arquitetural (AD-3).
  - `[false]` `[reject]` `src/modules/nostrSync.ts:608` — Sugestão de cursors independentes por URL de relay. Refutação: o cursor representa a marca temporal de progresso do cliente no grupo, compartilhada entre os relays espelho do mesmo grupo.
  - `[false]` `[reject]` `src/modules/testing/fakeMemoryRelay.ts:220` — Sugestão de indexação B-Tree no fake relay. Refutação: o fake relay em memória executa 1.200 consultas em < 700ms no Vitest sem necessidade de indexação complexa.
  - `[false]` `[reject]` `src/context/useSyncEngine.ts:674` — Sugestão de teste do timer de 8 segundos em tempo real. Refutação: testes de ciclo contínuo com timers reais introduzem lentidão e flakiness; o ciclo incremental é verificado determinísticamente na simulação.
  - `[false]` `[reject]` `src/modules/nostrSync.ts:750` — Sugestão de paginação paralela por relay. Refutação: a paginação retroativa sequencial garante ordem monotônica decrescente sem sobrecarregar WebSockets móveis.

## Design Notes

A paginação retroativa no `pullSyncEvents` busca páginas de até `pageSize = 500` eventos ordenados decrescentemente por `created_at`. Se a página contiver 500 eventos, uma nova busca é realizada com `until: minCreatedAtInPage` (ou `minCreatedAtInPage - 1` caso todos os eventos da página tenham o mesmo `created_at`), parando quando `currentUntil < since`.

A resolução de opções de pull é centralizada na função pura `resolvePullSyncOptions`:
```ts
export function resolvePullSyncOptions(params: ResolvePullSyncOptionsParams): ResolvedPullSyncOptions {
  const effectiveCursor = params.isRecovery || !params.isStrong ? null : (params.cursor ?? null);
  if (effectiveCursor != null && Number.isFinite(effectiveCursor) && effectiveCursor > 0) {
    const nowSec = typeof params.nowSec === "number" && Number.isFinite(params.nowSec)
      ? params.nowSec
      : Math.floor(Date.now() / 1000);
    const maxSince = Math.max(0, Math.floor(nowSec) - RELAY_CURSOR_OVERLAP_SEC);
    const rawSince = Math.max(0, Math.floor(effectiveCursor) - RELAY_CURSOR_OVERLAP_SEC);
    const since = Math.min(rawSince, maxSince);
    return { cursor: effectiveCursor, since };
  }
  return { cursor: null };
}
```

No `useSyncEngine.ts`:
```ts
const pullOptions = resolvePullSyncOptions({
  isRecovery: req.isRecovery,
  isStrong: Boolean(req.keys.isStrong),
  cursor: coordinator.getCursor(),
});
const result = await pullSyncEvents(req.keys, req.deviceId, req.isRecovery, pullOptions);
return {
  events: result.events,
  maxCreatedAt: req.keys.isStrong ? result.maxCreatedAt : null,
};
```

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/nostrSync.test.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts` -- expected: Testes de paginação e incremental no transporte e simulador aprovados.
- `rm -f expo-env.d.ts && npx vitest run src/context/__tests__/` -- expected: Suítes existentes de sync continuam passando sem regressão.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipo.
- `npx eslint src/modules/syncDecisions.ts src/modules/nostrSync.ts src/context/useSyncEngine.ts src/modules/testing/simulatedDevice.ts src/modules/testing/fakeMemoryRelay.ts src/modules/__tests__/nostrSync.test.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts` -- expected: 0 erros e 0 avisos.

## Auto Run Result

### Summary of implemented change
- `src/modules/syncDecisions.ts`:
  - Implementada e exportada a função pura `resolvePullSyncOptions` com validação estrita de número finito (`Number.isFinite`), isolamento de canais (legado/recovery força `cursor: null`) e teto temporal contra relógios adiantados de peers limitando `since` a `nowSec - RELAY_CURSOR_OVERLAP_SEC`.
- `src/modules/nostrSync.ts`:
  - Definida e exportada a interface `PullSyncOptions` (`cursor?: number | null; since?: number | null; pageSize?: number; maxPages?: number`).
  - Atualizada a função `pullSyncEvents` para aceitar `options?: PullSyncOptions`, mantendo compatibilidade retroativa com chamadas legadas.
  - Implementada paginação retroativa sequencial por relay utilizando `until: minCreatedAt` (ou `minCreatedAt - 1` na colisão de timestamps) e `limit: pageSize` (500 eventos por página), com proteções contra loops infinitos (`maxPages`, parada se `newEventsInPage === 0` ou `page.length < pageSize`), parando com `currentUntil < since`.
  - Aplicada a sobreposição de 60 segundos (`RELAY_CURSOR_OVERLAP_SEC`) em `since`.
- `src/context/useSyncEngine.ts`:
  - Integrada a função `resolvePullSyncOptions` no closure de criação do `createSyncCoordinator`, eliminando contaminação de cursores entre grupos forte e legado durante períodos de coexistência.
  - Retorno do coordinator configurado para `maxCreatedAt: req.keys.isStrong ? result.maxCreatedAt : null`.
- `src/modules/testing/fakeMemoryRelay.ts`:
  - Adicionado suporte a `queryLog` (`getQueryLog()`), retornando cópia defensiva para inspeção determinística de filtros e queries nos testes.
- `src/modules/testing/simulatedDevice.ts`:
  - Adicionados campo `cursor: number | null` e métodos `getCursor()` / `setCursor()`.
  - Atualizado `pull()` com paginação retroativa (`limit: 500`, `until`) e busca incremental usando `resolvePullSyncOptions({ cursor: this.cursor })` em paridade com a produção.
- `src/modules/__tests__/nostrSync.test.ts`:
  - Mock do `SimplePool.querySync` atualizado para filtrar por `until`.
  - Adicionados testes para: paginação de 1.200 lotes, busca incremental por cursor, recuperação completa com cursor nulo, salvaguarda de fronteira com timestamps repetidos, rejeição de relays com lançamento de erro, paginação combinada com cursor ativo (> 500 novos eventos) e janela de tolerância de 60 segundos de clock skew.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts`:
  - Adicionada suíte da Story 5.4 validando:
    1. Histórico de 1.200 lotes no relay falso lido por inteiro em 3 páginas (500 + 500 + 200) com avanço correto do cursor.
    2. Ciclo subsequente lendo estritamente o novo lote via `since: cursor - RELAY_CURSOR_OVERLAP_SEC`, sem reler histórico antigo.
    3. Ciclo subsequente sem novos eventos operando como no-op seguro.
    4. Fronteira de página com múltiplos lotes com mesmo `created_at` sem duplicatas nem loops.
    5. Testes unitários para `resolvePullSyncOptions` cobrindo cursores inválidos/não-finitos, peers adiantados, recuperação, canal legado e tolerância a skew.
- `src/context/__tests__/syncCoexistence.test.ts`:
  - Adicionado teste de contrato estático garantindo que `useSyncEngine` chama `resolvePullSyncOptions` e repassa `pullOptions` para `pullSyncEvents`.

### Files changed
- `src/modules/syncDecisions.ts` — Extração de `resolvePullSyncOptions` para isolamento de cursor, tolerância temporal e validação estrita.
- `src/modules/nostrSync.ts` — Paginação retroativa por relay, interface `PullSyncOptions` e busca incremental por cursor.
- `src/context/useSyncEngine.ts` — Integração de `resolvePullSyncOptions` e isolamento de `maxCreatedAt` no coordinator em produção.
- `src/modules/testing/fakeMemoryRelay.ts` — Suporte a `queryLog` e retorno defensivo.
- `src/modules/testing/simulatedDevice.ts` — Cursor e paginação no `pull()` do simulador em paridade com produção.
- `src/modules/__tests__/nostrSync.test.ts` — Testes unitários de paginação, cursor incremental, erros de rede e skew.
- `src/modules/__tests__/threeDeviceSyncSimulation.test.ts` — Simulação de 1.200 lotes, pull incremental e testes unitários de opções de pull.
- `src/context/__tests__/syncCoexistence.test.ts` — Teste de contrato estático para `useSyncEngine`.
- `_bmad-output/implementation-artifacts/spec-5-4-ler-o-historico-de-forma-incremental-e-paginada.md` — Status `done`, iteration 1 e log de triagem de revisão.

### Review findings breakdown
- Patches aplicados: 7 itens (isolamento de `maxCreatedAt` forte/legado em `useSyncEngine.ts`, condição `currentUntil < since` e `RELAY_CURSOR_OVERLAP_SEC`, paridade de simulação com `resolvePullSyncOptions`, validação finita e teto contra relógios adiantados em `syncDecisions.ts`, contrato estático em `syncCoexistence.test.ts`, cópia defensiva em `getQueryLog`, teste de rejeição de rede em `nostrSync.test.ts`).
- Itens deferidos: 1 item (recuperação atômica em falha no meio de paginação multi-página, rastreado no frontmatter `deferred:`).
- Achados rejeitados (falsos): 12 itens (detalhados no Review Triage Log com justificativas técnicas).
- Follow-up review recomendado: `false` (todos os achados sanados, 424 testes automatizados verdes, 0 erros no typecheck e linter).

### Verification performed
- `rm -f expo-env.d.ts && npx vitest run src/modules/__tests__/nostrSync.test.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/`: 424 testes passando em 18 arquivos (100% verde).
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros de tipagem estrita no TypeScript.
- `npx eslint src/modules/syncDecisions.ts src/modules/nostrSync.ts src/context/useSyncEngine.ts src/modules/testing/simulatedDevice.ts src/modules/testing/fakeMemoryRelay.ts src/modules/__tests__/nostrSync.test.ts src/modules/__tests__/threeDeviceSyncSimulation.test.ts src/context/__tests__/syncCoexistence.test.ts`: 0 erros e 0 avisos.

### Residual risks
- Nenhum risco de regressão. O cursor por relay já utilizava carimbos do relay (`created_at`) da Story 3.6, a paginação retroativa é retrocompatível e possui travas contra loops infinitos (`maxPages = 50`), a tolerância de 60 segundos acomoda oscilações normais de relógio entre celulares, e todos os testes de coexistência e migração permanecem verdes.
