---
title: 'Story 4.7: Manter o Grupo antigo e o forte ao mesmo tempo'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: 'd4f6cc653c21527449b53abaf10e12348cb57f3f'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-6-registrar-em-qual-grupo-cada-evento-ja-foi-publicado.md'
  - '{project-root}/src/modules/syncPayload.ts'
  - '{project-root}/src/context/strongGroupSync.ts'
  - '{project-root}/src/context/useSyncEngine.ts'
warnings: []
deferred:
  - 'D5: Teste de integração de runtime direto de useSyncEngine sob relays mockados e WebSockets com quedas concorrentes (escopo de simulação multi-dispositivo do Epic 5)'
---

<intent-contract>

## Intent

**Problem:** Durante a janela de convivência de 14 dias entre o Grupo antigo (código de 6 caracteres, cifra XOR fraca) e o Grupo forte (segredo de 128+ bits, AES-GCM), usuários com aparelhos heterogêneos (como um celular atualizado e um tablet antigo ainda no Grupo antigo) perderiam a sincronização caso o app passasse a operar exclusivamente no Grupo forte, forçando repareamento imediato ou impedindo a comunicação entre aparelhos.

**Approach:** Permitir a convivência simultânea mantendo leitura e escrita ativas no Grupo antigo e no Grupo forte em paralelo (`loadCoexistingGroups`), enviando gastos locais para ambos os grupos, lendo eventos remotos de ambos sem repareamento, bloqueando estritamente dados sensíveis (`PAYSLIP_*`, `RELIGIOUS_*`, `CONFESSIONAL_*`) no canal legado e utilizando o `syncGroupTracker` da Story 4.6 para assegurar zero loops de eco entre os grupos.

## Boundaries & Constraints

**Always:**
- Manter leitura (assinatura ao vivo e pull periódico) e escrita ativas tanto no Grupo antigo quanto no Grupo forte quando ambos estiverem configurados no dispositivo.
- Um gasto lançado localmente no aparelho na versão nova é publicado no Grupo forte (com cifra AES-GCM) e no Grupo antigo (com cifra XOR), exatamente uma vez em cada canal, com controle do `syncGroupTracker` da Story 4.6.
- Eventos recebidos do Grupo antigo pelo aparelho na versão nova aparecem no aparelho local e nunca são republicados de volta no Grupo antigo (`tracker.shouldPublish` retorna `false` após `markReceived`).
- Eventos recebidos do Grupo forte nunca são republicados de volta no Grupo forte.
- Dados sensíveis novos (holerites `PAYSLIP_*`, preferência religiosa `RELIGIOUS_*` ou confessional `CONFESSIONAL_*`) nunca são publicados no Grupo antigo (`isOldGroupPublishable` retorna `false`).
- `loadActiveSyncGroup` continua priorizando o Grupo forte para apresentação visual na UI (mantendo compatibilidade retroativa), enquanto `loadCoexistingGroups` expõe ambos os canais (`strong` e `legacy`) para o motor de sincronização.
- `clearAllSyncGroupSecrets()` remove ambos os segredos (`STRONG_GROUP_SECRET_KEY` e `GROUP_CODE_KEY`) ao sair ou desconectar (`leaveGroup`).
- A biblioteca legada `packages/sync` permanece intocada (AD-9).
- Nunca utilizar alertas nativos (`Alert.alert`, `window.alert`); utilizar `appAlert`/`appConfirm`.

**Never:**
- Nunca publicar eventos de holerite ou de preferência religiosa no Grupo antigo.
- Nunca republicar um evento no canal do qual ele foi recebido (zero loops de eco).
- Nunca exigir repareamento forçado do tablet na versão antiga durante a janela de convivência.
- Nunca apagar silenciosamente o código do Grupo antigo ao criar ou ingressar em um Grupo forte durante o período de convivência (opção `keepLegacy`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Gasto local no celular | Novo gasto criado no celular com ambos os grupos ativos | Publicado no Grupo forte (AES-GCM) e no Grupo antigo (XOR); tracker marca `published` em ambos | Se um grupo falhar temporariamente, o outro continua; o com falha tenta no próximo ciclo |
| Gasto remoto do tablet | Gasto recebido do Grupo antigo (XOR) pelo celular | Celular importa o evento no log local; marca `received` no Grupo antigo; `shouldPublish(evt.id, oldGroupId)` retorna `false` | Zero eco de volta para o tablet no Grupo antigo |
| Gasto remoto do Grupo forte | Gasto recebido do Grupo forte pelo celular | Celular importa o evento; marca `received` no Grupo forte; `shouldPublish(evt.id, strongGroupId)` retorna `false` | Zero eco no Grupo forte |
| Evento sensível (holerite / religioso) | `PAYSLIP_*` ou `RELIGIOUS_*` criado no celular | Publicado exclusivamente no Grupo forte; bloqueado pelo predicado `selectOldGroupPushEvents` para o Grupo antigo | Não gera erro nem vaza em texto fraco no Grupo antigo |
| Ambos os grupos configurados | Boot com `STRONG_GROUP_SECRET_KEY` e `GROUP_CODE_KEY` no armazenamento | `loadCoexistingGroups` retorna ambos; engine abre conexões e assinaturas para ambos | Falha em relays de um grupo não impede sincronização do outro |
| Desconexão | Usuário aciona `leaveGroup()` | `clearAllSyncGroupSecrets()` remove ambos os segredos; conexões e timers de ambos são fechados | Estado volta para `idle` e tracker limpa dados de ambos |

</intent-contract>

## Code Map

- `src/modules/syncPayload.ts` -- Atualizar `OLD_GROUP_EXCLUDED_PREFIXES` para incluir `"RELIGIOUS_"` e `"CONFESSIONAL_"`, garantindo que eventos com dados confessionais ou holerites sejam estritamente bloqueados no Grupo antigo.
- `src/context/strongGroupSync.ts` -- Definir interface `CoexistingGroups` e função `loadCoexistingGroups()` retornando `{ strong, legacy }`; atualizar `createStrongSyncGroup(options?: { keepLegacy?: boolean })` e `resolveJoinSyncGroup(code, options?: { keepLegacy?: boolean })` para suportar convivência sem apagar o código legado quando solicitado; manter `loadActiveSyncGroup()` delegando para `loadCoexistingGroups().strong ?? legacy`.
- `src/context/useSyncEngine.ts` -- Adaptar o motor para suportar convivência dupla: carregar grupos via `loadCoexistingGroups()`; manter subscrição e pull secundários para o grupo legado quando coexistindo com o grupo forte; executar push e pull para ambos os grupos usando o `syncGroupTracker` para evitar loops de eco e respeitando o isolamento de dados sensíveis; fechar ambos em `leaveGroup()`.
- `src/context/__tests__/syncCoexistence.test.ts` -- Nova suíte de testes unitários cobrindo o fluxo de convivência: carga dupla, isolamento de dados sensíveis, prevenção de eco mútuo e publicação concomitante.
- `src/context/__tests__/strongGroupSync.test.ts` e `src/modules/__tests__/syncPayload.test.ts` -- Ajustar asserções dos testes existentes para os novos prefixos excluídos e opções de coexistência.

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/syncPayload.ts` -- Atualizar `OLD_GROUP_EXCLUDED_PREFIXES` adicionando `"RELIGIOUS_"` e `"CONFESSIONAL_"`.
- [x] `src/context/strongGroupSync.ts` -- Implementar `loadCoexistingGroups()` e suportar opção `keepLegacy` em `createStrongSyncGroup` e `resolveJoinSyncGroup`.
- [x] `src/context/useSyncEngine.ts` -- Fiação de convivência: gerenciar subscrição, pull e push para ambos os grupos em paralelo quando coexistindo, aplicando `tracker` contra eco e `selectOldGroupPushEvents` para proteção de dados sensíveis.
- [x] `src/context/__tests__/syncCoexistence.test.ts` -- Implementar suíte de testes unitários para convivência simultânea entre Grupo antigo e Grupo forte.
- [x] `src/context/__tests__/strongGroupSync.test.ts` e `src/modules/__tests__/syncPayload.test.ts` -- Atualizar asserções de testes existentes para novos prefixos de exclusão e preservação de legado.

**Acceptance Criteria:**
- Given celular na versão nova e tablet na versão antiga, no Grupo antigo
- When o celular mantém o Grupo antigo (leitura e escrita) e passa a ter também o Grupo forte
- Then um gasto lançado no celular aparece no tablet antigo, sem repareamento e sem erro
- And um gasto lançado no tablet antigo aparece no celular
- And com o registro da Story 4.6 nenhum evento entra em loop entre os dois grupos
- And dado sensível novo (por exemplo preferência religiosa) nunca é publicado no Grupo antigo.

## Spec Change Log

_None._

## Review Triage Log

Quatro revisores paralelos especializados analisaram a implementação da Story 4.7 (`/tmp/bmad-diff-4-7-review.patch`): Blind Hunter, Edge Case Hunter, Verification Gap Reviewer e Intent Alignment Auditor.

| ID | Revisor | Severidade | Achado | Veredito & Disposição |
|---|---|---|---|---|
| B1 | Blind Hunter | Major | `publishSyncEvents` retorna 0 em falha de rede/relays sem lançar erro, levando `pushToGroup` a registrar incorretamente os eventos no tracker (`markPublished`), bloqueando tentativas subsequentes de reenvio. | **Fix**: Adicionada verificação estrita `if (published === 0 && myEvents.length > 0) throw new Error(...)` para não marcar eventos como publicados em falhas de rede. |
| B2 | Blind Hunter | Major | Na importação (`importEvents`), eventos recebidos do canal legado eram passados com a flag `{ isStrongGroup: isStrongGroupRef.current }` (que é true se houver canal forte ativo), permitindo que dados sensíveis não fossem filtrados na ingestão legado se um relay malicioso os enviasse. | **Fix**: Particionados os eventos recebidos rastreando IDs via `legacyEventIdsRef` e passando `{ isStrongGroup: false }` para eventos vindos do canal legado, garantindo defesa em profundidade na recepção. |
| B3 | Blind Hunter | Minor | Em `loadCoexistingGroups`, a chave sensível decodificada em `parsed.secret` permanecia em memória. | **Fix**: Adicionado `parsed.secret.fill(0)` imediatamente após uso. |
| B4 | Blind Hunter | Minor | Aliasing `subRef.current = legacySubRef.current` quando apenas o grupo legado estava ativo podia causar duplicidade de chamadas de cancelamento. | **Fix**: Mantidas referências `subRef` e `legacySubRef` estritamente distintas. |
| E1 | Edge Case Hunter | Major | Criação ou junção a um grupo forte durante a convivência (`createGroup`, `joinGroup`) chamava `coordinator.reset()` e fechava desnecessariamente `legacySubRef`, mesmo quando `keepLegacy` era solicitado. | **Fix**: Tratar `keepLegacy` preservando `legacySubRef` e pulando `coordinator.reset()`. |
| E2 | Edge Case Hunter | Minor | `leaveGroup` não limpava `pullTimerRef` nem cancelava `pushDebounceRef`, permitindo que um timer pendente rodasse após desconexão. | **Fix**: Limpos explicitamente `clearInterval(pullTimerRef.current)` e `clearTimeout(pushDebounceRef.current)` em `leaveGroup`. |
| E3 | Edge Case Hunter | Minor | Hashes de push por grupo (`GROUP_PUSH_HASHES_KEY`) não eram persistidos no storage entre recargas do app, gerando reenvios desnecessários de lote NIP-33 no startup. | **Fix**: Persistir e restaurar hashes por grupo via `GROUP_PUSH_HASHES_KEY = "domus_group_push_hashes_v1"`. |
| V1 | Verification Gap | Minor | `SyncContextValue` e `SyncProvider.tsx` não expunham `options?: { keepLegacy?: boolean }` em `createGroup`/`joinGroup`, nem disponibilizavam `coexistingGroups` para componentes visuais. | **Fix**: Atualizado contrato de `SyncContextValue` e tipagem em `SyncProvider.tsx`. |
| V2 | Verification Gap | Low | Teste de integração de runtime direto de `useSyncEngine` sob relays mockados e WebSockets com quedas concorrentes. | **Defer**: Registrado no frontmatter como item diferido `D5` para os testes de simulação multi-dispositivo do Epic 5. |
| A1 | Intent Alignment | Info | Alinhamento estrito com todos os critérios de aceitação da Story 4.7: leitura/escrita simultâneas, filtragem estrita de dados sensíveis (`PAYSLIP_*`, `RELIGIOUS_*`, `CONFESSIONAL_*`) no canal legado no push e no import, ausência de loops de eco via `syncGroupTracker`, e preservação do canal legado com `keepLegacy`. | **Accept**: Implementação aprovada sem ressalvas conceituais. |

## Design Notes

A coexistência simultânea opera com duas conexões Nostr lógicas sob o mesmo motor:
1. **Canal Forte (Primário):** Chaves derivadas do segredo forte de 256 bits (`DOMUS1-...`), cifra AES-GCM (AEAD), publica e recebe todos os tipos de eventos (incluindo holerites e dados religiosos).
2. **Canal Legado (Secundário de Convivência):** Chaves derivadas do código de 6 caracteres, cifra XOR, publica e recebe exclusivamente eventos comuns (excluindo `PAYSLIP_*`, `RELIGIOUS_*` e `CONFESSIONAL_*`).

O `SyncGroupTracker` da Story 4.6 atua como o árbitro universal:
- Ao receber evento de `G_OLD`: `tracker.markReceived(id, G_OLD)`. Logo, `shouldPublish(id, G_OLD) === false` — nunca ecoa de volta no Grupo antigo.
- Ao publicar gasto local: `filterEventsToPublish` permite publicar em `G_STRONG` e em `G_OLD`. Após cada envio, `markPublished` registra no grupo respectivo.

## Verification

**Commands:**
- `npx vitest run src/context/__tests__/syncCoexistence.test.ts src/context/__tests__/strongGroupSync.test.ts src/modules/__tests__/syncPayload.test.ts` -- expected: todos os testes de coexistência e sincronização passam com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipagem.
- `npx eslint .` -- expected: 0 erros de linting.
- `npx vitest run` -- expected: todas as suítes de teste passando com 0 falhas.

## Auto Run Result

### Summary of implemented change
- `src/modules/syncPayload.ts`: Atualizado `OLD_GROUP_EXCLUDED_PREFIXES` para incluir `"RELIGIOUS_"` e `"CONFESSIONAL_"`, garantindo que além de holerites (`PAYSLIP_*`), preferências religiosas e dados confessionais nunca sejam publicados nem importados no canal legado.
- `src/context/strongGroupSync.ts`: Definida interface `CoexistingGroups` e implementada função `loadCoexistingGroups()` retornando `{ strong, legacy }`. Atualizados `createStrongSyncGroup(options?: { keepLegacy?: boolean })` e `resolveJoinSyncGroup(code, options?: { keepLegacy?: boolean })` para suportar convivência sem apagar o código legado quando solicitado via `keepLegacy`. Atualizado `loadActiveSyncGroup()` delegando para `(await loadCoexistingGroups()).strong ?? legacy`. Adicionado `parsed.secret.fill(0)` para higienização de memória.
- `src/context/useSyncEngine.ts`: Fiação de convivência no motor com suporte a duplo canal:
  - Inicialização carrega grupos coexistentes via `loadCoexistingGroups()`.
  - Subscrição ao vivo primária (`subRef`) e secundária (`legacySubRef`) com cancelamento seguro e sem aliasing.
  - Rotinas `pushToGroup` / `pushAllGroups` que publicam gastos locais nos canais configurados com cifra AES-GCM no canal forte e cifra XOR no canal legado, filtrando eventos sensíveis via `selectOldGroupPushEvents`.
  - Tratamento estrito de falha de publicação: se `publishSyncEvents` retornar 0 eventos publicados, lança erro para impedir marcação indevida no `syncGroupTracker`.
  - `pullAllGroups` que busca em ambos os canais, com particionamento de eventos importados via `legacyEventIdsRef` para aplicar `{ isStrongGroup: false }` aos eventos recebidos do canal legado (defesa em profundidade).
  - Persistência e restauração de hashes de push por grupo (`GROUP_PUSH_HASHES_KEY = "domus_group_push_hashes_v1"`).
  - Preservação do canal legado ao criar ou ingressar em grupo forte quando `keepLegacy` for verdadeiro.
  - `leaveGroup()` que cancela `pullTimerRef` e `pushDebounceRef`, fecha ambas as conexões/subscrições, limpa o tracker em ambos os grupos e remove todos os segredos via `clearAllSyncGroupSecrets()`.
- `src/context/SyncProvider.tsx`: Atualizado `SyncContextValue` para expor `coexistingGroups` e aceitar `options?: { keepLegacy?: boolean }` em `createGroup` e `joinGroup`.
- `src/context/__tests__/syncCoexistence.test.ts`: Criada suíte completa com 29 testes unitários cobrindo todos os cenários da matriz: carga dupla, preservação com `keepLegacy`, isolamento estrito de dados sensíveis na publicação e ingestão, prevenção de loops de eco mútuo, persistência de hashes por canal, simulação do fluxo Celular-Tablet e desconexão total.
- `src/context/__tests__/strongGroupSync.test.ts` e `src/modules/__tests__/syncPayload.test.ts`: Atualizadas asserções para os novos prefixos excluídos e opções de coexistência.
- `src/modules/__tests__/nostrSync.test.ts`: Corrigido teste de adulteração em canal forte para garantir mutação de caractere em vez de checagem condicional pelo sufixo da string.

### Verification performed
- `npx vitest run src/context/__tests__/syncCoexistence.test.ts src/context/__tests__/strongGroupSync.test.ts src/modules/__tests__/syncPayload.test.ts src/modules/__tests__/syncGroupTracking.test.ts src/modules/__tests__/syncCoordinator.test.ts src/modules/__tests__/nostrSync.test.ts src/context/__tests__/syncStorage.test.ts`: 187 testes passando em 7 suítes com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros de tipagem TypeScript strict.
- `npx eslint src/context/ src/modules/`: 0 erros de linting.
