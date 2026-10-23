---
title: 'Story 3.5: rejeitar timestamp no futuro e nunca reescrevê-lo'
type: 'bugfix'
created: '2026-10-23'
status: 'in-progress'
baseline_commit: 'd326909'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-2-quarentena-no-replay.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-4-ordem-total-do-replay.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Um aparelho do grupo com o relógio adiantado gera eventos "do futuro". Pela ordem da Story 3.4 eles passam na frente de tudo o que acontecer depois, e o histórico fica bagunçado em todos os aparelhos.

**Approach:** No replay, evento de outro aparelho com `timestamp` acima de `agora + 24 h` vai para a Quarentena (motivo "horário no futuro") e não altera o estado. Ele continua no log sem nenhuma mudança: quando o horário dele deixar de estar à frente do limite, passa a valer sozinho, como na Story 3.3. O limite de 24 h é uma constante única no código.

## Boundaries & Constraints

**Always:** constante única `MAX_FUTURE_SKEW_MS = 24 h` exportada de um só lugar e usada por quem precisar; o "agora" entra no replay como parâmetro (padrão `Date.now()`), para o teste não depender do relógio; a regra vale só para eventos de outro aparelho (`deviceId` diferente do aparelho atual): os do próprio aparelho seguem valendo, para um relógio local errado não esconder os dados do próprio usuário; o `timestamp` aceito nunca é reescrito em nenhum caminho (memória, SQLite, backup, publicação); a importação pelo sync continua gravando o evento (a 3.1 só recusa acima de 2100).

**Never:** corrigir, arredondar ou trocar o `timestamp` de um evento; apagar o evento do log; mudar o cursor dos relays (Story 3.6).

## I/O & Edge-Case Matrix

| Cenário | Evento | Resultado |
|---|---|---|
| Outro aparelho, horário normal | `t ≤ agora + 24 h` | aplicado |
| Outro aparelho, adiantado | `t = agora + 25 h` | Quarentena "horário no futuro", estado igual ao sem ele |
| Mesmo evento mais tarde | replay quando `agora ≥ t − 24 h` | aplicado, sem mudança no log |
| Próprio aparelho adiantado | `deviceId` = aparelho atual, `t = agora + 3 dias` | aplicado (como hoje) |
| Limite exato | `t = agora + 24 h` | aplicado |
| Nunca reescrito | evento aceito passa por hidratação, restauração, exportação e publicação | `timestamp` idêntico |

</frozen-after-approval>

## Code Map

- `src/context/replay.ts` -- `replayAllEvents(events, options)`; Quarentena
- `src/context/AppStateProvider.tsx` -- chama o replay (passar o `deviceId` atual)
- `src/context/localEventLog.ts`, `src/hooks/useEventStore.ts`, `src/hooks/useBackupRestore.ts`, `src/modules/nostrSync.ts` -- caminhos por onde o `timestamp` passa

## Tasks & Acceptance

**Execution:**
- [x] Constante, regra no replay (com `now` e `currentDeviceId` nas opções) e chamada no `AppStateProvider`
- [x] Testes da matriz, incluindo o mesmo log com `now` diferente

**Acceptance Criteria:**
- Given um evento de outro aparelho com horário acima de agora + 24 h, when há replay, then ele vai para a Quarentena e o estado não muda
- Given um evento aceito, when passa por qualquer caminho do app, then o `timestamp` não muda

## Spec Change Log

- **Referência do "agora" (decisão do dono, 23/10/2026):** o limite de 24 h conta a partir do maior entre o relógio do aparelho e o horário mais recente dos eventos de **outros** aparelhos que não o do próprio evento (um aparelho não serve de prova para si mesmo). Assim um aparelho com o relógio atrasado não esconde os dados do grupo, e um evento muito à frente de todo o grupo continua em Quarentena.

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Aparelho com relógio atrasado esconde contas, categorias e transações do grupo | high | Sonda: relógio 3 dias atrás. **patch** (Change Log). |
| Ligação no `AppStateProvider` sem teste | medium (gap) | **patch**: helper puro `replayOptionsFor(isDemoActive, deviceId)` testado. |
| Teste do `now` padrão não falha com `now = 0` | low (gap) | **patch**: +23 h sem `now` é aplicado. |
| Teste de "dispatch" não exercita o `dispatch` | low (gap) | **patch**: carimbo do `deviceId` como helper puro em `localEventLog.ts`, usado pelo `dispatch` e testado. |
| Evento que já passou do limite só aparece no próximo evento ou ao reabrir | medium | **patch**: o replay é refeito quando o app volta ao primeiro plano e num timer até o evento em Quarentena mais próximo de valer. |
| Ordem envelope × futuro sem teste | low | **patch**. |
| Evento aplicado com horário adiantado ainda passa na frente da história (24 h ou menos de adiantamento não é barrado) | medium | **defer** para a Story 3.6 / sequência: a intenção congelada só adia o evento. |
| Cursor do sync vai para o futuro com evento +25 h e trava a assinatura ao vivo | medium | **defer** para a Story 3.6 (cursor dos relays). |
| Conquista desbloqueada de novo enquanto a de outro aparelho está em Quarentena (XP em dobro) | medium | **defer** (D31): precisa decidir se conquista pode repetir; o reducer não deduplica. |
| Reinstalação muda o id do aparelho e os próprios eventos futuros viram "de outro" | low | **reject**: o novo critério do grupo cobre o caso comum. |

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas

## Implementation Notes

- **Constante:** `MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000` em `packages/events/src/validateEnvelope.ts`, ao lado de `MIN/MAX_ENVELOPE_TIMESTAMP_MS` (puro, importável sem `react-native`). Único lugar definido; o import do sync não a usa (continua recusando só fora de [2020, 2100)).
- **Replay (`src/context/replay.ts`):** `ReplayOptions` ganhou `now?: number` (padrão `Date.now()`) e `currentDeviceId?: string | null`. Novo `QuarantineKind` `future_timestamp`, motivo `FUTURE_TIMESTAMP_REASON = "horário no futuro"`. Helper puro exportado `isFutureForeignEvent(event, now, currentDeviceId)`:
  - sem `currentDeviceId` (ausente, `null`, vazio ou "local") → nunca (decisão segura: durante a inicialização o id do aparelho ainda não é conhecido, e a regra não pode esconder dados do próprio usuário);
  - `deviceId` do evento vazio/"local" (qualquer caixa, mesma regra `isBlankDeviceId` da normalização local) ou igual ao aparelho atual → próprio aparelho, nunca;
  - senão, `eventTimestampKey(evt) > now + MAX_FUTURE_SKEW_MS` (a mesma leitura da ordem da 3.4: texto numérico vira número, não finito vale 0 — só conta como "no futuro" o que de fato passaria na frente na ordenação; `Infinity`/`NaN` seguem aplicados como antes). Limite exato `t = now + 24 h` é aplicado.
  - Posição: logo depois da conferência do envelope (precisa de `id`/`type`) e antes do tipo desconhecido, do payload e dos reducers — o evento futuro não tem efeito nenhum. Quando `now` alcança `t − 24 h`, segue o fluxo normal (inclusive "tipo desconhecido", se for o caso). O log e o evento nunca são alterados.
- **Provider (`AppStateProvider.tsx`):** fora do modo demo, `replayAllEvents(eventStore.allEvents, { currentDeviceId: eventStore.deviceId })`; no modo demo, sem `currentDeviceId` (sandbox, regra não se aplica). `eventStore.deviceId` entrou nas deps do `useMemo`; `now` usa o padrão. **Limitação:** o replay só roda quando as deps mudam (novo evento, troca de aparelho/demo, reabrir o app); não há timer — um evento em Quarentena por horário passa a valer no próximo replay depois de `t − 24 h`, não exatamente nesse instante.
- **Auditoria "nunca reescrito"** (nenhum código alterado nesses caminhos):
  - `dispatch`: só carimba `deviceId` quando vazio/"local"; `timestamp` vem do `createEvent`.
  - Hidratação / `importEvents` / `dispatch` → `prepareLocalLog`/`normalizeStoredEvents`: número fica idêntico; texto numérico vira número **só na cópia em memória** (nada é gravado no SQLite).
  - `eventsForExport`: só `deviceId`. `publishSyncEvents`: copia `evt.timestamp`; `validateEnvelope` só deixa passar inteiro em ms (texto não é publicado, não é convertido). `selectEventsToImport`/`parseSyncPayload`: devolvem o `timestamp` recebido; o evento adiantado (< 2100) continua sendo gravado.
  - **Achados pré-existentes (relatados, não alterados — fora do escopo da 3.5):** (1) `restoreFromBackup` grava o resultado de `prepareBackupForStorage`, que converte timestamp em **texto numérico** para número antes de gravar (decisão da triagem da 3.4; mesmo valor, outro tipo — no SQLite a coluna `INTEGER` já faria essa conversão por afinidade). (2) **Web:** o `useEffect` de `useEventStore` grava `allEvents` (já normalizado: texto numérico → número, "local" → id do aparelho) em `AsyncStorage` (`domus_events_v1`), então na web a normalização da memória volta para o armazenamento. Em ambos, timestamp numérico (o formato de todo evento criado pelo app e de todo evento aceito pelo sync) sai idêntico.
- **Testes:** `src/context/__tests__/replay.futureTimestamp.test.ts` (18: constante; as 5 linhas de replay da matriz com `now` explícito — normal, +25 h com Quarentena `future_timestamp`/"horário no futuro" e estado deep-equal ao log sem o evento, mesmo log com `now` posterior aplicado e log intacto, próprio aparelho +3 dias, limite exato e +1 ms; "local"/vazio como próprio aparelho; aparelho desconhecido; texto numérico e `Infinity`; tipo desconhecido no futuro; helper puro; `now` padrão; e "nunca reescrito" com `===` e mesmo tipo por `normalizeStoredEvents`, `prepareLocalLog`, carimbo do `dispatch`, `prepareBackupForStorage`, `eventsForExport`, `selectEventsToImport`, `parseSyncPayloadDetailed`, `sortEvents` e replay) e 1 caso novo em `src/modules/__tests__/nostrSync.test.ts` (publicação + pull com pool falso: timestamps normal e adiantado idênticos e numéricos).
- **Verificação:** `npx vitest run` → 68 arquivos / 1277 testes, todos passando (baseline 67 / 1258); `npx tsc --noEmit` → sem erros (exit 0).
