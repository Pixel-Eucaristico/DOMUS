---
title: 'Story 3.3: reprocessar eventos desconhecidos depois de atualizar o app'
type: 'feature'
created: '2026-10-22'
status: 'done'
baseline_commit: '715334e'
route: 'one-shot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-2-quarentena-no-replay.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-22-tipo-desconhecido.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Um aparelho com versão antiga recebe pelo sync eventos de um tipo que ele ainda não conhece. Esses eventos não podem se perder: quando o usuário atualizar o app, eles têm de passar a valer.

**Approach:** Com as Stories 3.1 e 3.2, o evento de tipo desconhecido já é gravado no log e o estado é sempre refeito a partir do log inteiro, então uma versão que conhece o tipo o aplica na próxima abertura, sem migração. Esta story prova isso com testes e fecha as brechas: nenhum caminho do app apaga ou reescreve um evento desconhecido, e a Quarentena distingue "tipo desconhecido" (vai ser reprocessado) dos outros motivos (continua em Quarentena).

## Boundaries & Constraints

**Always:** o replay aceita, só para teste, o conjunto de tipos conhecidos e os reducers por injeção (sem mudar o comportamento do app); o evento reprocessado entra na ordem em que está no log, com o seu `timestamp` original; um evento que passa a ser conhecido mas tem payload inválido vai para a Quarentena como `invalid_payload`; só `restoreFromBackup` e "resetar app" apagam o log, como hoje.

**Never:** apagar, reescrever ou mover eventos do log para reprocessar; guardar a Quarentena; tela nova.

## I/O & Edge-Case Matrix

| Cenário | Versão antiga | Versão nova |
|---|---|---|
| Tipo novo válido | Quarentena "tipo desconhecido"; evento no log | aplicado, Quarentena vazia |
| Tipo novo com payload ruim | Quarentena "tipo desconhecido" | Quarentena `invalid_payload` |
| Outro motivo (envelope inválido) | Quarentena | continua em Quarentena |
| Ordem | eventos A (conhecido), X (novo), B (conhecido) | estado igual ao de aplicar A, X, B nessa ordem |
| Sync | X chega pelo relay | gravado (Story 3.1) e aplicado após a atualização |

</frozen-after-approval>

## Code Map

- `src/context/replay.ts` -- `replayAllEvents`, `KNOWN_EVENT_TYPES`, Quarentena
- `src/modules/syncPayload.ts` -- importação (Story 3.1)
- `src/hooks/useEventStore.ts`, `packages/storage/src/eventStore.ts` -- únicos pontos que apagam o log

## Tasks & Acceptance

**Execution:**
- [x] Injeção opcional de tipos e reducers no replay (padrão = os do app) e testes da matriz
- [x] Teste de ponta a ponta: evento novo passa por `selectEventsToImport` e pelo replay "antigo" e "novo"

**Acceptance Criteria:**
- Given um evento de tipo desconhecido na Quarentena, when abro uma versão que conhece o tipo, then ele é aplicado
- Given um evento inválido por outro motivo, when atualizo, then continua em Quarentena

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas

## Implementation Notes

- **Injeção só para teste:** `replayAllEvents(events, options?)` em `src/context/replay.ts` ganhou o segundo parâmetro opcional `ReplayOptions` = `{ knownTypes?: ReadonlySet<string>; reducers?: Partial<ReplayReducers> }`. Omitido, usa `KNOWN_EVENT_TYPES` e os reducers do app (`DEFAULT_REDUCERS`), então o comportamento do app é o mesmo; a chamada no `AppStateProvider` não mudou. O roteamento por pacote (`DOMAIN_TYPES`, `WISHLIST_TYPES`…) e a conferência de payload (`PAYLOAD_SPECS`) continuam os do app: a "versão antiga" de teste só precisa não conhecer o tipo, porque o evento desconhecido para antes da conferência de payload.
- **Nenhuma mudança de comportamento:** o evento de tipo desconhecido já ficava no log (Story 3.1 grava, Story 3.2 só põe na Quarentena em memória) e o estado já era refeito do log inteiro a cada abertura; nenhuma migração foi necessária.
- **Testes:** `src/context/__tests__/replay.reprocess.test.ts` (7). X = `WISHLIST_PRICE_UPDATED` (tipo real), retirado dos tipos conhecidos da "versão antiga" (cujo reducer de wishlist lança erro se receber X, provando que X nunca chega a ele). Cobre: sem opções = padrões explícitos; tipo novo válido (antiga: Quarentena `unknown_type` "tipo desconhecido", estado = log sem X, log igual por valor e por referência; nova: aplicado, Quarentena vazia, estado = aplicar o log com os reducers reais); tipo novo com payload ruim (antiga `unknown_type`; nova `invalid_payload` nomeando `"newPrice"`, sem efeito); envelope inválido (Quarentena `invalid_envelope` nas duas, mesmo motivo); ordem A, X, B (reducer espião confere a sequência de `id` e `timestamp` originais; B depois de X vale; diferente de aplicar X por último); ponta a ponta (lote bruto do relay com X, um repetido e um malformado → `parseSyncPayloadDetailed` + `selectEventsToImport` aceitam só X → anexado e ordenado como no `importEvents` → antiga: Quarentena; nova: aplicado).
- **Únicos caminhos que apagam o log (conferido por revisão de código, sem teste de grep):** `EventStore.clearAllEvents()` (`packages/storage/src/eventStore.ts`, `DELETE FROM events`) é chamado só em `restoreFromBackup` (`src/hooks/useEventStore.ts`), que também sobrescreve a chave `domus_events_v1` na web; `resetApp` chama `restoreFromBackup([])`. Os demais pontos que escrevem no log só anexam: `dispatch`, `importEvents` (via `selectEventsToImport`), categorias padrão em `useGamificationEffects` e o evento de recuperação no `AppStateProvider` (todos `appendEvent` + `setAllEvents([...prev, ...])`). O espelho web (`useEffect` que grava `allEvents` em `domus_events_v1`) grava a lista em memória já normalizada pela hidratação da Story 3.2 (`deviceId`, payload em texto), sem remover itens objeto nem filtrar por tipo.
- **Verificação:** `npx vitest run` → 64 arquivos, 1229 testes passando (baseline 63 / 1222 + o arquivo novo com 7); `npx tsc --noEmit` → sem erros (exit 0).
