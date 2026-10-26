---
title: 'Story 3.8: evoluir o formato dos eventos sem quebrar versões publicadas'
type: 'feature'
created: '2026-10-26'
status: 'in-progress'
baseline_commit: '96c0cc2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-2-quarentena-no-replay.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-3-reprocessar-eventos-desconhecidos.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-22-tipo-desconhecido.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O envelope é fixo (AD-2: `{id, type, payload, timestamp, deviceId, signature}`) e nenhum payload tem versão. Hoje só dá para evoluir um evento com campo opcional; um campo obrigatório novo faria os eventos já publicados (sem o campo) caírem na Quarentena como `invalid_payload` e sumirem do estado. O holerite (Stories 11.4–11.6) já nasce exigindo `schemaVersion` no payload (FR-17/FR-26), e o perfil futuro (`profileId`) precisa caber no formato sem reescrever o log.

**Approach:** `schemaVersion` mora no **payload** (o envelope do AD-2 não muda). Ausente = versão 1. Um registro puro por tipo (`packages/events/src/schemaVersion.ts`, sem `react-native`) declara a versão atual de cada tipo e as conversões `vN → vN+1`. O replay converte o payload **em memória** até a versão atual **antes** de `validatePayload` e do reducer; o log nunca é reescrito. Evento com versão maior que a que o app conhece vai para a Quarentena com motivo próprio e passa a valer sozinho depois da atualização (mesma lógica do tipo desconhecido, SCP 22/10). O carimbo da versão atual acontece no ponto único de gravação local (`appendDispatched`/`appendGenerated`). `profileId` opcional é aceito no payload e no envelope sem recusa nem efeito. Hoje todos os tipos ficam na versão 1: nada do formato publicado muda; a conversão v1→v2 é provada com um registro só de teste.

## Boundaries & Constraints

**Always:**
- `schemaVersion` é inteiro ≥ 1 no payload; ausente = 1. Valor presente que não é inteiro seguro ≥ 1 (texto, `0`, `1.5`, negativo) → Quarentena `invalid_payload` com o campo `"schemaVersion"` no motivo.
- Conversão pura, imutável, por passos (`v1→v2→…→atual`), aplicada no replay depois do filtro de tipo desconhecido e antes de `validatePayload`. `PAYLOAD_SPECS` descreve sempre a versão **atual**. O payload entregue ao reducer sai sem `schemaVersion` (os reducers espalham o payload no estado — `reducer.ts` linhas 35, 74, 128 — e o metadado não pode vazar para conta/transação).
- Versão maior que a atual do app → Quarentena `future_schema_version` ("versão do formato mais nova"); evento fica no log e é aplicado depois da atualização, na posição original da ordem total (3.4). Conversão ausente para um passo intermediário ou conversão que lança erro → Quarentena (`reducer_error` ou motivo próprio), sem efeito parcial.
- `validateEnvelope` (sync, estrito) não olha `schemaVersion` nem `profileId`: evento com qualquer versão no payload é gravado (para ser reprocessado). `validateLocalEvent` (local, tolerante) também não recusa.
- `profileId` opcional (texto) é aceito no envelope e no payload; nenhum reducer o lê; o estado de um evento com `profileId` é igual ao do mesmo evento sem ele.
- Uma v2 de um tipo **já publicado** precisa continuar legível como v1 pelas versões instaladas (elas ignoram `schemaVersion` e aplicam o payload como v1): manter os campos v1 preenchidos ou criar um tipo novo. Regra escrita no comentário do registro.
- Toda lógica nova testável no vitest sem `react-native` (`packages/events` e `src/context/replay*.ts`).

**Never:** reescrever, migrar ou regravar eventos do log; mudar o envelope do AD-2, a tabela do SQLite ou o formato publicado no relay; mudar a versão de qualquer tipo real nesta story; confundir com o `schemaVersion` do backup (`BACKUP_SCHEMA_VERSION` em `src/modules/backup/domain/BackupMetadata.ts`, que versiona o arquivo, não o evento); alterar `packages/sync`.

## I/O & Edge-Case Matrix

Registro de teste: `ACCOUNT_CREATED` atual = 2; v2 exige `currency` (texto); conversão v1→v2 preenche `currency: "BRL"`.

| Cenário | Evento | Resultado |
|---|---|---|
| Publicado (v1) | `ACCOUNT_CREATED {id, name, type, balance: 100}` sem `schemaVersion` | conta criada com `currency: "BRL"`, saldo 100, sem `schemaVersion` no estado |
| Novo (v2) | `{…, balance: 50, currency: "USD", schemaVersion: 2}` | conta com `currency: "USD"`, saldo 50 |
| v2 sem o campo novo | `{…, schemaVersion: 2}` sem `currency` | Quarentena `invalid_payload` (`currency`) |
| Versão futura | `{…, schemaVersion: 3}` | Quarentena `future_schema_version`; com registro atual = 3, aplicado na mesma posição |
| Versão inválida | `schemaVersion: "2"`, `0`, `1.5` | Quarentena `invalid_payload` (`schemaVersion`) |
| Registro real (todos v1) | log de hoje | estado idêntico ao de antes da story |
| `profileId` no payload e no envelope | qualquer tipo conhecido | aceito por `validateEnvelope`, `validateLocalEvent` e replay; mesmo estado que sem ele |
| Sync com versão futura | relay entrega `schemaVersion: 99` | gravado (3.1/SCP 22/10), Quarentena no replay |
| Dispatch | tipo com versão atual 2 (registro de teste) | gravado com `schemaVersion: 2`; tipo v1 sai sem o campo (decisão 2) |
| Log de entrada | qualquer | não alterado (`deepFreeze`) |

</frozen-after-approval>

## Code Map

- `packages/events/src/schemaVersion.ts` (novo) -- registro por tipo (`current`, conversões), `readSchemaVersion`, `upcastPayload`; exportado em `packages/events/index.ts`
- `packages/events/src/validateEnvelope.ts` -- só teste: aceita `profileId` e `schemaVersion` qualquer (hoje já reconstrói o evento e descarta chaves extras do envelope)
- `src/context/replayValidation.ts` -- `validatePayload` aceita spec injetada (registro de teste); `PAYLOAD_SPECS` = versão atual
- `src/context/replay.ts` -- passo de conversão entre `unknown_type` e `validatePayload`; `QuarantineKind` ganha `future_schema_version`; `ReplayOptions.schemaRegistry` só para teste (como `knownTypes`/`reducers` da 3.3)
- `src/context/localEventLog.ts` -- `appendDispatched`/`appendGenerated` carimbam a versão atual (junto do `stampDeviceId`)
- `packages/storage/src/eventStore.ts`, `src/modules/nostrSync.ts` (`publishSyncEvents`) -- sem mudança: payload vai inteiro; colunas do envelope fixas
- `packages/domain/src/reducer.ts` -- sem mudança (recebe payload já convertido e sem `schemaVersion`)

## Tasks & Acceptance

**Execution:**
- [ ] Módulo puro do registro e da conversão + testes unitários (ausente = 1, passos encadeados, imutável, versão futura, versão inválida, passo faltando)
- [ ] Passo de conversão no `replayAllEvents` com Quarentena `future_schema_version`; `schemaVersion` retirado antes do reducer
- [ ] Carimbo da versão atual no `appendDispatched`/`appendGenerated` (só tipos com versão > 1 — decisão 2)
- [ ] Testes da matriz pelo replay com registro de teste (v1 e v2 → estado esperado) e regressão com o registro real
- [ ] Testes de `profileId` (envelope e payload) em `validateEnvelope`, `validateLocalEvent` e replay
- [ ] Comentário no registro com a regra de evolução (opcional por padrão; obrigatório novo exige versão + conversão; v2 de tipo publicado legível como v1)

**Acceptance Criteria:**
- Given um evento publicado sem `schemaVersion`, when o replay roda, then ele é tratado como v1, convertido e aplicado
- Given um evento v1 e um v2 do mesmo tipo (registro de teste), when o replay roda, then o estado tem os dois com o campo novo e saldos corretos
- Given um v2 sem o campo obrigatório novo, when o replay roda, then ele vai para a Quarentena `invalid_payload`
- Given `schemaVersion` maior que a atual, when o replay roda, then Quarentena `future_schema_version`, e aplicado quando o registro passa a conhecer a versão
- Given `profileId` no envelope e no payload, when o evento é importado e reproduzido, then é aceito e o estado não muda
- Given o registro real, when o log de hoje é reproduzido, then o estado é idêntico ao de antes

## Decisões do dono (aprovadas em 26/10: 1a, 2a, 3a)

1. **`profileId` no envelope.** (a) **Recomendado:** aceito e ignorado — `validateEnvelope` já reconstrói o evento só com as 6 chaves, o SQLite tem colunas fixas e `publishSyncEvents` monta o JSON campo a campo, então o valor some na gravação; o portador real do perfil é o **payload**. AD-2 fica como está. (b) Preservar no envelope: coluna nova no SQLite, publish e import levam o campo, emenda do AD-2 (C4 do `reconcile-spine.md`).
2. **Quando carimbar `schemaVersion`.** (a) **Recomendado:** só em tipos cuja versão atual é > 1 ou que nascem versionados (ex.: `PAYSLIP_*`, `SETTING_CHANGED`); como tudo hoje é v1, nada do formato publicado muda. (b) Todo evento novo sai com `schemaVersion: 1` — mais explícito, mas muda o payload de todos os tipos já publicados e espalha o campo no estado dos aparelhos antigos (os reducers espalham o payload).
3. **Versão maior que a conhecida.** (a) **Recomendado:** Quarentena `future_schema_version`, reprocessada depois da atualização (coerente com o SCP 22/10 e a 3.3). (b) Aplicar como se fosse a versão atual (melhor esforço) — arrisca estado errado em silêncio.

## Notas para as Stories 11.4–11.6

- `PAYSLIP_RECORDED`/`PAYSLIP_DELETED` entram no registro já em v1 com carimbo explícito (FR-26: "payload tem `schemaVersion`") e, por serem tipo novo, aparelhos antigos os põem em Quarentena `unknown_type` (3.3), sem risco de leitura errada.
- `profileId` no payload do holerite fica opcional e sem uso até existir perfil (PRD §5); o reducer do holerite não deve depender dele.
- O filtro "não publicar `PAYSLIP_*` no Grupo antigo" é da 11.4, não desta story.

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas em relação ao baseline
