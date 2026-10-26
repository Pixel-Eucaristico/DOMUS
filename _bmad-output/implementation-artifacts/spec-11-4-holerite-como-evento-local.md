---
title: 'Story 11.4: registrar o holerite como evento local'
type: 'feature'
created: '2026-10-26'
status: 'in-progress'
baseline_commit: '03daf45'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-3-extrair-dados-do-holerite.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-3-reprocessar-eventos-desconhecidos.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-7-edicao-e-exclusao-antes-do-alvo.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-8-versao-do-formato-dos-eventos.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-16.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O parser do holerite (Story 11.3) já devolve empresa, CNPJ, competência, bruto, líquido, rubricas, descontos e FGTS, mas não há onde guardar o resultado. Na `dev` não existe `PAYSLIP_RECORDED`/`PAYSLIP_DELETED`, nem estado, nem rota no replay. Uma versão anterior ao BMAD (commit `850aa1b`, branch `origin/claude/epic-goldberg-xrb7p0`, **fora da `dev`**) já tinha tipos, reducer e tela, mas é anterior às Stories 3.1–3.8. Ela guardava `employee` (nome do funcionário) no payload, espalhava o payload inteiro no estado e não tinha `schemaVersion`, `PAYLOAD_SPECS` nem filtro de sync. Do jeito que está, o sync publicaria o holerite no Grupo antigo (cifra XOR, código de 6 caracteres), e o salário ficaria legível por força bruta (SCP 16/10, D2 = b).

**Approach:** Declarar `PAYSLIP_RECORDED` e `PAYSLIP_DELETED` em `EVENT_TYPES` (`packages/events`). Com isso eles caem no `DOMAIN_TYPES` do `replayAllEvents` e são roteados ao `domainReducer` (AD-4). Os dois tipos entram no `SCHEMA_REGISTRY` com `current: 1, stamp: true`: nascem versionados e o `appendDispatched` carimba `schemaVersion: 1` (Story 3.8). O formato v1 também entra em `PAYLOAD_SPECS`. O reducer guarda o holerite em `AppState.payslips` só com os campos da lista branca, sem `employee`. Ele aplica a regra de substituição (mesma competência + mesmo empregador) e ignora exclusão de id inexistente. Nunca toca em contas nem em lançamentos. Criadores puros em `packages/domain/src/payslips.ts` montam os eventos e arredondam os valores (AD-7). No sync, `publishSyncEvents` (o único caminho de publicação no Grupo antigo) descarta todo tipo `PAYSLIP_*` antes de cifrar, e um teste garante o filtro. Partimos do reducer, dos criadores e dos testes do `850aa1b`, ajustados a esta spec. Tela, resumo e gráfico ficam para as Stories 11.5 e 11.6.

## Boundaries & Constraints

**Always:**
- Tipos em UPPER_SNAKE no `EVENT_TYPES` de `packages/events/src/types.ts` (AD-4), sem colidir com outro namespace. `DomainEvent` ganha `PayslipRecordedEvent`/`PayslipDeletedEvent`.
- Payload v1 de `PAYSLIP_RECORDED`: `id`, `period` (`YYYY-MM`), `company` (texto, pode ser vazio), `cnpj?` (`00.000.000/0000-00`), `grossSalary`, `netSalary`, `deductions: {name, value}[]`, `earnings?: {name, value}[]`, `fgts?`, `source?` (`"vision" | "ocr" | "manual"`), `transactionId?` (receita lançada na 11.5). `PAYSLIP_DELETED`: `{ id }`. `confidence` e `warnings` do parser não entram no evento.
- **Nome do funcionário nunca guardado:** o tipo não tem `employee`. O reducer monta o holerite guardado campo a campo (lista branca), e não com `...payload`, então um `employee` vindo de um evento antigo (branch pré-BMAD) ou de outro aparelho nunca chega ao estado.
- `SCHEMA_REGISTRY` ganha `PAYSLIP_RECORDED` e `PAYSLIP_DELETED` com `{ current: 1, stamp: true }`. Todo holerite gravado localmente sai com `schemaVersion: 1` no payload. O replay retira `schemaVersion`/`profileId` antes do reducer (Story 3.8), e o reducer não depende de `profileId`.
- `PAYLOAD_SPECS` descreve o v1 dos dois tipos (arrays com `each`). O teste "todo tipo conhecido tem spec" (`replay.test.ts`) continua passando.
- **Substituição:** dois holerites são do mesmo empregador quando **os dois** têm CNPJ e os 14 dígitos são iguais. Se algum dos dois não tem CNPJ, compara-se o nome da empresa normalizado (sem espaços nas pontas, minúsculas, sem acentos, espaços repetidos viram um). Ao aplicar `PAYSLIP_RECORDED`, sai do estado todo holerite de outro id com a mesma `period` e o mesmo empregador. Regravar o mesmo `id` atualiza o registro. Quem vence é o último na ordem total do replay (Story 3.4), e o resultado é o mesmo em qualquer ordem de chegada.
- **Exclusão:** `PAYSLIP_DELETED` remove o holerite. Id inexistente (nunca gravado, já excluído ou já substituído) não muda nada visível, não lança erro e não vai para a Quarentena. Ver a decisão 2 para a exclusão que chega antes do alvo.
- **Sem efeito em saldo:** os dois tipos não alteram `accounts`, `transactions`, `categories` nem `invoices`. Excluir um holerite não apaga a receita de `transactionId`.
- Criadores puros (`recordPayslipEvent`, `deletePayslipEvent`) em `packages/domain/src/payslips.ts`: ids só por `generateId`/`createEvent` (AD-3). Valores monetários arredondados a 2 casas na criação (AD-7). `period` precisa casar `^\d{4}-(0[1-9]|1[0-2])$`, senão o criador lança erro. A validação de tela (líquido > 0 e ≤ bruto) é da 11.5.
- **Sync:** `publishSyncEvents` (`src/modules/nostrSync.ts`, cifra XOR = Grupo antigo) descarta todo evento cujo `type` começa com `PAYSLIP_`, antes de `partitionEnvelopes` e da cifra. Lote que fica vazio não publica nada e devolve 0. O filtro é um predicado puro exportado (em `src/modules/syncPayload.ts`), coberto por teste unitário e pelo teste ponta a ponta com o pool falso de `nostrSync.test.ts`, que decifra o publicado e confere que nenhum `PAYSLIP_*` saiu.
- Toda lógica nova testável no vitest sem `react-native` (`packages/*`, `src/context/replay*.ts`, `src/modules/syncPayload.ts`, `src/modules/nostrSync.ts` com pool falso).

**Never:** tela, rota, hook de captura, resumo ou gráfico (Stories 11.5 e 11.6). Despachar evento de algum lugar da UI. Guardar `employee`, CPF, `confidence` ou `warnings`. Persistir estado derivado. Publicar `PAYSLIP_*` por qualquer caminho do Grupo antigo. Alterar `packages/sync`, `ios/`, `android/`, `replit.*`. Mudar a versão de algum tipo já publicado. Mudar o formato do backup (`BACKUP_SCHEMA_VERSION`). Incluir holerite no contexto enviado à IA.

## I/O & Edge-Case Matrix

| Cenário | Eventos (ordem do replay) | Resultado |
|---|---|---|
| Registrar | `RECORDED(p1, 2026-09, ACME, CNPJ X)` | `payslips.p1` com `recordedAt = timestamp`, sem `schemaVersion`/`employee`; contas e saldos iguais |
| Carimbo | `appendDispatched` de `RECORDED` sem `schemaVersion` | gravado com `schemaVersion: 1` |
| Substituir por CNPJ | `RECORDED(p1, 09, CNPJ X)`, `RECORDED(p2, 09, CNPJ X sem pontuação)` | só `p2` |
| CNPJs diferentes, mesmo nome | `RECORDED(p1, 09, ACME, X)`, `RECORDED(p2, 09, ACME, Y)` | `p1` e `p2` |
| Substituir por nome | `RECORDED(p1, 09, "Acme Ltda")`, `RECORDED(p2, 09, " ACME  LTDA ")`, ambos sem CNPJ | só `p2` |
| Um com CNPJ, outro sem | `RECORDED(p1, 09, ACME, X)`, `RECORDED(p2, 09, ACME, sem CNPJ)` | só `p2` (compara pelo nome) |
| Competência diferente | `RECORDED(p1, 09)`, `RECORDED(p2, 10)`, mesmo empregador | os dois |
| Mesmo id regravado | `RECORDED(p1, líquido 3900)`, `RECORDED(p1, líquido 4100)` | `p1` com 4100 |
| Excluir | `RECORDED(p1)`, `DELETED(p1)` | sem `p1` |
| Id inexistente | `DELETED(p9)` | estado igual; sem Quarentena |
| Excluir o substituído | `RECORDED(p1)`, `RECORDED(p2)` substitui, `DELETED(p1)` | só `p2` |
| Exclusão antes do alvo | `DELETED(p1)` com timestamp menor que `RECORDED(p1)` | conforme a decisão 2 |
| Payload com `employee` | `RECORDED(p1, employee: "Maria")` | aplicado; `employee` ausente do estado |
| Payload inválido | `RECORDED` sem `period` ou com `deductions` não array | Quarentena `invalid_payload` (campo nomeado) |
| Versão futura | `RECORDED` com `schemaVersion: 2` | Quarentena `future_schema_version` (3.8) |
| App que não conhece o tipo | `knownTypes` sem `PAYSLIP_*` (simula versão antiga com 3.3) | Quarentena `unknown_type`; aplicado depois da "atualização" |
| Publicar no Grupo antigo | lote com `TRANSACTION_CREATED` + `PAYSLIP_RECORDED` + `PAYSLIP_DELETED` | só a transação é publicada; retorno 1 |
| Só holerites | lote só com `PAYSLIP_*` | nenhuma publicação; retorno 0 |
| Criador | `period: "2026-13"` ou `"09/2026"` | lança erro; `grossSalary: 1234.567` → 1234.57 |

</frozen-after-approval>

## Code Map

- `packages/events/src/types.ts`: `EVENT_TYPES.PAYSLIP_RECORDED/DELETED`, `PayslipLinePayload`, `PayslipPayload` (sem `employee`), `PayslipDeletedPayload`, os dois eventos na união `DomainEvent`
- `packages/events/src/schemaVersion.ts`: entradas `{ current: 1, stamp: true }` no `SCHEMA_REGISTRY` (o teste "registro real bem formado" já cobre)
- `packages/domain/src/state.ts`: `StoredPayslip` (lista branca + `recordedAt`), `AppState.payslips`, `createInitialState` com `payslips: {}`
- `packages/domain/src/reducer.ts`: casos `PAYSLIP_RECORDED` (substituição) e `PAYSLIP_DELETED`, mais `sameEmployer`/`normalizeCompany` (base: `850aa1b`, sem o `...payload`)
- `packages/domain/src/payslips.ts` (novo): `recordPayslipEvent`, `deletePayslipEvent`. Exportados em `packages/domain/index.ts`. `getPayslipHistory`/`summarizePayslips` do `850aa1b` ficam para a 11.6
- `src/context/replayValidation.ts`: `PAYLOAD_SPECS` dos dois tipos
- `src/context/replay.ts`: sem mudança (o roteamento vem do `EVENT_TYPES`)
- `src/context/localEventLog.ts` / `src/hooks/useEventStore.ts`: sem mudança (o carimbo já existe; o `dispatch` grava o evento carimbado)
- `src/modules/syncPayload.ts`: predicado puro `isOldGroupPublishable(type)` (ou `OLD_GROUP_EXCLUDED_PREFIXES`)
- `src/modules/nostrSync.ts` (`publishSyncEvents`): aplica o predicado antes de `partitionEnvelopes`. `useSyncEngine.pushMyEvents` é o único chamador
- `src/modules/ai/application/__tests__/AIContextBuilder.test.ts`: o literal de `AppState` ganha `payslips: {}` (senão o `tsc` quebra)
- Sem mudança: `packages/sync`, backup (`BackupExportService`, `buildExportEvents`), `AIContextBuilder`, telas

## Tasks & Acceptance

**Execution:**
- [x] Tipos e payloads em `packages/events`, mais as entradas no `SCHEMA_REGISTRY`
- [x] `AppState.payslips`, reducer com lista branca, substituição e exclusão
- [x] Criadores puros com arredondamento e validação de `period`
- [x] `PAYLOAD_SPECS` dos dois tipos
- [x] Filtro `PAYSLIP_*` em `publishSyncEvents`, com predicado puro
- [x] Testes: `packages/domain/__tests__/payslips.test.ts` (matriz pelo reducer), `src/context/__tests__/replay.payslip.test.ts` (roteamento, carimbo via `appendDispatched`, `schemaVersion` fora do estado, `invalid_payload`, `future_schema_version`, `unknown_type` → reprocessado, saldo intacto), `src/modules/__tests__/syncPayload.test.ts` (predicado) e `nostrSync.test.ts` (lote misto e lote só de holerites, decifrando o publicado)
- [x] Decisão 2 e decisão 3 conforme o que o dono aprovar

**Acceptance Criteria:**
- Given os tipos `PAYSLIP_RECORDED` e `PAYSLIP_DELETED` em `packages/events`, when o log é reproduzido, then os tipos são roteados ao `domainReducer` e o payload gravado tem `schemaVersion`
- Given dois holerites da mesma competência e do mesmo empregador (por CNPJ, ou por nome sem CNPJ), when o replay roda, then só o último na ordem total fica no estado
- Given um `PAYSLIP_DELETED`, when o replay roda, then o holerite sai do estado, e um id inexistente não muda nada
- Given qualquer sequência de `PAYSLIP_*`, when o replay roda, then contas, lançamentos e saldos são iguais aos do mesmo log sem esses eventos
- Given um Grupo antigo configurado e eventos `PAYSLIP_*` no log, when o sync publica, then nenhum `PAYSLIP_*` sai, e um teste garante esse filtro

## Decisões do dono (aprovadas em 26/10: 1a, 2a, 3a)

1. **Holerite no backup exportado.** Hoje todo backup leva o log inteiro: o manual cifrado (AES-GCM/PBKDF2), o automático (cifrado com a chave do aparelho e enviado ao Drive, se conectado) e o manual sem criptografia (que já pede confirmação, Story 12.5, com o aviso "todos os seus dados financeiros legíveis"). (a) **Recomendado:** o holerite entra em todos os backups, sem mudar nada no backup. O SCP 16/10 (D2 = b) diz que o holerite fica "no aparelho e no backup do próprio Drive" até o Grupo forte, e o backup é hoje a única forma de não perder os holerites ao trocar de aparelho. O aviso da 12.5 já cobre o arquivo sem cifra. Se o dono quiser, a 11.5 acrescenta "inclusive o salário dos holerites" ao `PLAIN_EXPORT_WARNING`. (b) Tirar `PAYSLIP_*` só da exportação sem criptografia: protege o salário num arquivo compartilhado, mas um restore desse arquivo perde os holerites sem aviso. (c) Tirar de todos os backups: contradiz o SCP e a promessa da story ("sobrevivam ao backup").
2. **Exclusão que chega antes do holerite.** A AC diz "id inexistente é ignorado". Mas se o relógio do aparelho voltar no tempo entre gravar e excluir (ou, depois da Story 4.5, entre aparelhos), o `DELETED` pode ter timestamp menor que o `RECORDED`. Ignorado, o holerite volta: é o bug que a Story 3.7 corrigiu para lançamentos. (a) **Recomendado:** marca de exclusão no estado derivado, no mesmo padrão `outOfOrder` da 3.7 (ex.: `deletedPayslips`). O `DELETED` sem alvo continua sem efeito visível e sem Quarentena, e um `RECORDED` posterior com o mesmo id não reaparece. (b) Ignorar de fato, como na AC literal, e deixar a marca para a Story 4.5: mais simples, mas deixa o caso do relógio aberto.
3. **`PAYSLIP_*` recebido do Grupo antigo.** A AC só proíbe publicar. Quem descobre o código de 6 caracteres pode injetar holerites falsos, e só um build da branch pré-BMAD publicaria esse tipo de boa-fé. (a) **Recomendado:** a leitura do Grupo antigo (`pullSyncEvents` e a assinatura ao vivo `subscribeToSyncEvents`, ou o `importEvents` do sync que serve às duas; **não** o `restoreFromBackup`) também descarta `PAYSLIP_*`, com aviso de diagnóstico único por evento. O holerite fica simétrico, "só pelo Grupo forte", e a Story 4.5 libera os dois sentidos juntos. (b) Aceitar na importação (AC literal): o evento entra no log e aparece no histórico.

## Notas para as Stories 11.5, 11.6 e 4.5

- 11.5 despacha `recordPayslipEvent` e, opcionalmente, o `TRANSACTION_CREATED` da receita (categoria `salario`, conta que não seja cartão), guardando o `transactionId` no holerite. A confirmação de "competência já existe" usa a mesma regra de empregador do reducer (exportar `sameEmployer` puro para a tela não divergir). A flag de envio do Epic 12 vale para o Vision OCR.
- 11.6 traz `getPayslipHistory`/`summarizePayslips` (base no `850aa1b`, em `packages/domain`) e a tela. Excluir chama `deletePayslipEvent` e não toca na receita.
- 4.5 troca o predicado do filtro por "publicável neste grupo": `PAYSLIP_*` vai ao Grupo forte. Se a decisão 3 for (a), a leitura também passa a aceitar. A regra do PRD "evento de backup restaurado no próprio aparelho é publicado mesmo com `deviceId` antigo" (FR-8) precisa respeitar o mesmo filtro.
- Versões já publicadas na Play não recebem `PAYSLIP_*` por sync (nunca publicado). Num restore de backup em versão antiga, o tipo fica no log e vai para a Quarentena `unknown_type` (com 3.3) ou é ignorado (antes da 3.3), sem perda.

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas em relação ao baseline (`03daf45`)
- Revisão manual: nenhum `...payload` no caso `PAYSLIP_RECORDED` do reducer; `grep -rn "PAYSLIP_" src/modules/nostrSync.ts src/modules/syncPayload.ts` mostra o filtro

## Implementation Notes

**O que mudou (26/10, decisões 1a, 2a e 3a):**

- `packages/events/src/types.ts`: `EVENT_TYPES.PAYSLIP_RECORDED/PAYSLIP_DELETED`, `PayslipLinePayload`, `PayslipSource`, `PayslipPayload` (sem `employee`), `PayslipDeletedPayload`, `PayslipRecordedEvent`/`PayslipDeletedEvent` na união `DomainEvent`.
- `packages/events/src/schemaVersion.ts`: `SCHEMA_REGISTRY` com os dois tipos `{ current: 1, stamp: true }`.
- `packages/domain/src/state.ts`: `StoredPayslip` (lista branca + `recordedAt`), `AppState.payslips`, `createInitialState` com `payslips: {}`; `OutOfOrderState.deletedPayslips` (decisão 2a).
- `packages/domain/src/reducer.ts`: casos `PAYSLIP_RECORDED` (monta o holerite campo a campo com `toStoredPayslip`, inclusive as linhas `{name, value}`; substituição por competência + empregador; id marcado como excluído é ignorado) e `PAYSLIP_DELETED` (remove se existe e sempre deixa a marca em `outOfOrder.deletedPayslips`, sem efeito visível e sem Quarentena). `sameEmployer` e `normalizeCompany` exportados (puros) para a tela da 11.5.
- `packages/domain/src/payslips.ts` (novo): `recordPayslipEvent`, `deletePayslipEvent`, `PAYSLIP_PERIOD_PATTERN`; exportados em `packages/domain/index.ts` (com `StoredPayslip`, `sameEmployer`, `normalizeCompany`).
- `src/context/replayValidation.ts`: `PAYLOAD_SPECS` de `PAYSLIP_RECORDED` (linhas com `each: {name, value}`) e `PAYSLIP_DELETED`.
- `src/modules/syncPayload.ts`: `OLD_GROUP_EXCLUDED_PREFIXES`, `isOldGroupPublishable(type)`, `partitionOldGroupEvents(events)`.
- `src/modules/nostrSync.ts`: `publishSyncEvents` descarta `PAYSLIP_*` antes de `partitionEnvelopes` e da cifra (lote vazio → 0, nada publicado). Decisão 3a: `parseAndReport` (usado pelo `pullSyncEvents` e pela assinatura ao vivo `subscribeToSyncEvents`) descarta `PAYSLIP_*` recebido, com aviso único por id de evento (`id=… type=…`, nunca o payload). `restoreFromBackup` e o backup não mudaram (decisão 1a).
- Testes ajustados: `packages/events/__tests__/schemaVersion.test.ts` (registro real agora tem os dois `PAYSLIP_*`), `packages/domain/__tests__/outOfOrder.test.ts` (o `outOfOrder` exato ganha `deletedPayslips: {}`), `src/context/__tests__/replay.test.ts` (37 → 39 tipos conhecidos).
- Testes novos: `packages/domain/__tests__/payslips.test.ts` (30: matriz pelo reducer, `sameEmployer`, criadores), `src/context/__tests__/replay.payslip.test.ts` (13: roteamento, carimbo via `appendDispatched`, `schemaVersion`/`profileId`/`employee` fora do estado, `invalid_payload`, `future_schema_version`, `unknown_type` → aplicado, exclusão antes do alvo, ordem de chegada, saldo intacto, backup exporta/restaura), `src/modules/__tests__/syncPayload.test.ts` (+3: predicado), `src/modules/__tests__/nostrSync.test.ts` (+4: lote misto e só de holerites decifrando o publicado; pull e assinatura descartando `PAYSLIP_*`). Conferido por mutação: sem o filtro, os 4 testes de `nostrSync` falham.

**Verificação:** `npx vitest run` → 78 arquivos / 1571 testes, todos passando (baseline 76 / 1519). `npx tsc --noEmit` → 0 erros. Nenhum `...payload` no caso `PAYSLIP_RECORDED`; `grep -rn "PAYSLIP_" src/modules/nostrSync.ts src/modules/syncPayload.ts` mostra o filtro.

**Decisões além da spec:**

- Decisão 2a seguindo a 3.7 à risca: **toda** exclusão deixa a marca (não só a que chega antes). Um `PAYSLIP_RECORDED` posterior com o mesmo id de um holerite excluído é ignorado; para "regravar" depois de excluir, a 11.5 precisa de id novo. Um holerite ignorado pela marca também não substitui outro do mesmo empregador.
- CNPJ só conta como "tem CNPJ" com exatamente 14 dígitos; CNPJ incompleto (OCR ruim) cai na comparação por nome.
- Pela regra literal, dois holerites sem CNPJ e com `company` vazia na mesma competência são do mesmo empregador (o último substitui). A 11.5 pode exigir nome ou CNPJ na tela, se quiser evitar.
- O criador também lança erro para valor monetário não finito (`NaN`/`Infinity`), apara `company` e `cnpj` e omite CNPJ vazio; aceita `id` opcional (para regravar um holerite existente). Monta o payload campo a campo, então `employee`/`confidence`/`warnings` vindos do parser não entram.
- O reducer monta o mapa com `Object.fromEntries` para um id `"__proto__"` não tocar o protótipo.
- Os `PAYSLIP_*` descartados do Grupo antigo não entram na linha de total do pull ("N descartados de M"); têm o próprio aviso único por evento.
- `AIContextBuilder.test.ts` não precisou mudar: o literal ali é `ContextData`, não `AppState` (o `tsc` passa sem `payslips`).


## Review Triage Log

Revisão única com três lentes (adversarial, casos de borda, lacunas de verificação), 26/10, sobre o commit 6606fcb. 0 High, 2 Med, 11 Low. Auditoria de vazamento: nenhum caminho publica `PAYSLIP_*` ou valor de salário.

| # | Achado | Sev. | Decisão |
|---|--------|------|---------|
| R1 | Holerite do 13º vira `AAAA-12` e substitui o de dezembro do mesmo empregador | Med | **patch** (decisão do dono 26/10): campo opcional `kind: "monthly" \| "thirteenth"` (ausente = `monthly`) no payload v1, `PAYLOAD_SPECS`, `StoredPayslip` e na chave de substituição; o criador recebe `kind` |
| R2 | Criador aceita linha sem `name` e gera evento que o replay põe em Quarentena; `company` ausente lança `TypeError` cru | Med | **patch**: criador exige `name` texto (trim) e `company` texto, com erro claro; teste que toda saída do criador passa no `validatePayload` e no replay sem Quarentena |
| R3 | CNPJ alfanumérico (Receita, jul/2026) tratado como ausente | Low | **patch**: normalizar para `[0-9A-Z]` em maiúsculas, 14 caracteres |
| R4 | Replay aceita `id: ""`, `period: "lixo"`, `source` desconhecido, salário negativo | Low | **patch**: `FieldSpec` ganha padrão/enum; `period` `AAAA-MM`, `source` e `kind` por enum, `id` não vazio; valores negativos aceitos (descontos/estornos) |
| R5 | Filtro de entrada só no parse; `importEvents` do sync não filtra | Low | **patch**: filtrar também no `importEvents` do sync (não no restauro de backup). Ignorar `PAYSLIP_*` de outro aparelho já no log: **defer** (D38) |
| R6 | Hash do `pushMyEvents` inclui `PAYSLIP_*` e republica tudo a cada holerite | Low | **patch**: hash só do que é publicável no Grupo antigo |
| R7 | Normalização do nome não pega "LTDA." vs "LTDA", largura zero, letras largas | Low | **patch**: NFKD, remover caracteres de largura zero e pontuação |
| R8 | Nome vazio conta como empregador | Low | **patch**: nome normalizado vazio nunca casa, salvo CNPJs iguais |
| R9 | Arredondamento `1.005 → 1`, `-0` | Low | **reject**: segue o `round2` do repositório |
| R10 | Teste de ordem de chegada passa trivialmente | Low | **patch**: caso com timestamp empatado |
| R11 | Testes do criador só checam forma | Low | **patch**: coberto pelo teste do R2 |
| R12 | Nada garante publicador único | Low | **patch**: teste que `pool.publish`/`finalizeEvent` só aparecem dentro de `publishSyncEvents` |
| R13 | Modo demo sem teste para `PAYSLIP_*` | Low | **reject**: hook RN, não roda no vitest; caminho coberto por leitura na 3.8 |
