---
title: 'Story 4.5: Publicar e ler eventos no Grupo forte'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '45714a757c40e5f1c7f405e9998faacc3ef5cb74'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-2-cifrar-e-decifrar-eventos-com-cifra-autenticada.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-4-parear-um-aparelho-por-qr-ou-colagem.md'
  - '{project-root}/src/modules/strongGroup/eventCipher.ts'
  - '{project-root}/src/modules/strongGroup/groupSecret.ts'
  - '{project-root}/src/modules/nostrSync.ts'
  - '{project-root}/src/modules/syncPayload.ts'
  - '{project-root}/src/context/useSyncEngine.ts'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A publicação e recepção de eventos via relays Nostr ainda operam sob o modelo legado (cifra XOR, chave derivada do código curto de 6 caracteres e exclusão forçada de eventos sensíveis `PAYSLIP_*`). Com isso, os aparelhos conectados ao Grupo forte continuavam sem canal criptográfico autêntico nos relays, sem identidade Nostr dedicada e incapazes de sincronizar holerites com segurança de ponta a ponta.

**Approach:** Conectar a cifra autenticada AES-256-GCM (`eventCipher.ts`) e a identidade Nostr derivada do Segredo forte (`groupSecret.ts`) ao ciclo de vida de publicação, pull e assinatura em tempo real de `nostrSync.ts`. Permitir a transmissão e importação segura de eventos `PAYSLIP_*` exclusivamente no Grupo forte, isolando completamente o tráfego e as chaves do Grupo antigo.

## Boundaries & Constraints

**Always:**
- Eventos publicados no Grupo forte usam exclusivamente a cifra AES-256-GCM (`domus-gcm-v1.<base64>`) com AAD vinculado à chave pública Nostr do grupo.
- O par de chaves Nostr (publicador/autor) do Grupo forte é derivado do Segredo forte via HKDF, independente e inacessível pelo Grupo antigo.
- Eventos de holerite (`PAYSLIP_*`) são transmitidos e importados normalmente quando o grupo ativo é forte (`isStrong: true`).
- No Grupo antigo, a exclusão de `PAYSLIP_*` permanece estrita tanto na publicação quanto no pull/importação (garantindo compatibilidade e segurança dos legados).
- Um terceiro sem o Segredo de grupo não consegue decifrar os eventos trafegados pelos relays públicos (comprovado por testes automatizados com falha em chave incorreta, adulteração de tag e tentativa de decifra XOR).
- O tamanho do lote serializado para cifragem forte respeita `STRONG_MAX_PLAINTEXT_BYTES` (32 KB), particionando em múltiplos eventos Nostr se necessário.
- A biblioteca `packages/sync` permanece inalterada (AD-9).
- Modais e notificações de feedback continuam usando `appAlert`/`appConfirm`.
- Todos os textos de interface estão em pt-BR com acentos corretos.

**Never:**
- Nunca publicar eventos no Grupo forte com cifra XOR legada.
- Nunca misturar a chave pública ou os autores Nostr do Grupo antigo com os do Grupo forte nos filtros dos relays.
- Nunca permitir que eventos `PAYSLIP_*` saiam ou entrem através de conexões do Grupo antigo.
- Nunca vazar segredos ou textos claros de eventos em logs ou mensagens de erro.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Publicação no Grupo forte | Aparelho no Grupo forte possui eventos locais (incluindo `PAYSLIP_*`) | Publica eventos nos relays cifrados em AES-GCM com prefixo `domus-gcm-v1.`, assinado pela pubkey forte | Lotes com falha de relay disparam retry/warning sem quebrar o loop |
| Lote grande no Grupo forte (> 32 KB) | Lote de eventos com tamanho serializado superior a 32 KB | Particiona a lista em múltiplos lotes menores respeitando `STRONG_MAX_PLAINTEXT_BYTES` antes de cifrar | Não estoura erro de tamanho excessivo |
| Leitura / Pull no Grupo forte | Relay devolve evento com formato `domus-gcm-v1.` assinado pela pubkey forte | Decifra com sucesso via `decryptStrongPayload`, valida envelopes e importa todos os eventos (incluindo `PAYSLIP_*`) | Ignora envelopes corrompidos |
| Tentativa de decifra por terceiro | Terceiro com chave privada diferente ou tentando XOR lê evento do relay | Falha na decifra (`auth-failed` ou erro de parsing); nenhum dado é revelado | Evento é descartado silenciosamente |
| Isolamento de canal | Aparelho no Grupo antigo faz pull nos relays | Filtro consulta apenas `authors: [oldKeys.publicKey]`; eventos do Grupo forte nunca são consultados nem afetados | Isolamento total |
| Pull de `PAYSLIP_*` no Grupo antigo | Relay do Grupo antigo entrega evento adulterado contendo `PAYSLIP_*` | `dropOldGroupExcluded` e `selectEventsToImport` descartam o evento com aviso único sem expor payload | Descarte imediato |

</intent-contract>

## Code Map

- `src/modules/nostrSync.ts` -- Atualizar `NostrSyncKeys` para comportar `isStrong?: boolean`; em `publishSyncEvents`, alternar entre `encryptStrongPayload` (com suporte a `PAYSLIP_*` e partição por tamanho de 32 KB) e `encryptPayload` (legado); em `pullSyncEvents` e `subscribeToSyncEvents`, decifrar via `decryptStrongPayload` no grupo forte e não descartar `PAYSLIP_*`.
- `src/modules/syncPayload.ts` -- Em `selectEventsToImport`, aceitar opção `options?: { isStrongGroup?: boolean }` para permitir a importação de eventos `PAYSLIP_*` quando oriundos do Grupo forte, preservando a recusa para o Grupo antigo.
- `src/hooks/useEventStore.ts` -- Atualizar `importEvents` para repassar a opção `{ isStrongGroup?: boolean }` a `selectEventsToImport`.
- `src/context/AppStateProvider.tsx` -- Refletir a assinatura de `importEvents(events, options?)` no contexto global.
- `src/context/strongGroupSync.ts` -- Garantir que `createStrongSyncGroup`, `resolveJoinSyncGroup` e `loadActiveSyncGroup` marquem `isStrong: true` nas `keys` retornadas.
- `src/context/useSyncEngine.ts` -- Em `getMyEvents`, retornar todos os eventos do dispositivo (inclusive `PAYSLIP_*`) quando `isStrongGroup` for verdadeiro; em `coordinator.importEvents`, repassar `{ isStrongGroup: isStrongGroupRef.current }`.
- `src/modules/__tests__/nostrSync.test.ts` -- Adicionar suíte de testes de integração ponta a ponta para publicação, leitura, rejeição por terceiro e liberação de `PAYSLIP_*` no Grupo forte.
- `src/modules/__tests__/syncPayload.test.ts` -- Adicionar testes unitários para `selectEventsToImport` com a opção `isStrongGroup`.

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/syncPayload.ts` -- Adicionar suporte a `options?: { isStrongGroup?: boolean }` em `selectEventsToImport`, permitindo `PAYSLIP_*` quando `isStrongGroup: true`.
- [x] `src/hooks/useEventStore.ts` -- Atualizar método `importEvents` para aceitar `options?: { isStrongGroup?: boolean }` e encaminhar para `selectEventsToImport`.
- [x] `src/context/AppStateProvider.tsx` -- Ajustar tipo e repasse de `importEvents` no contexto da aplicação.
- [x] `src/context/strongGroupSync.ts` -- Marcar `isStrong: true` nas instâncias de `NostrSyncKeys` geradas para o Grupo forte.
- [x] `src/context/useSyncEngine.ts` -- Atualizar `getMyEvents` para incluir eventos do dispositivo sem filtro de tipo no Grupo forte, e injetar `isStrongGroup` na chamada de `importEvents` do coordenador.
- [x] `src/modules/nostrSync.ts` -- Implementar ramificação forte em `publishSyncEvents`, `pullSyncEvents` e `subscribeToSyncEvents`: cifragem/decifragem AES-GCM versionada (`domus-gcm-v1.`), verificação de teto de 32 KB e inclusão de `PAYSLIP_*`.
- [x] `src/modules/__tests__/syncPayload.test.ts` -- Testar aceitação de `PAYSLIP_*` em `selectEventsToImport` sob `isStrongGroup: true` e preservação do descarte sob o padrão legado.
- [x] `src/modules/__tests__/nostrSync.test.ts` -- Testar publicação e leitura ponta a ponta no Grupo forte, verificação da identidade Nostr independente, teste de impossibilidade de decifra por terceiro e preservação do isolamento com o canal legado.

**Acceptance Criteria:**
- Given um Grupo forte ativo e as chaves derivadas do Segredo forte
- When o aparelho publica eventos locais (incluindo `PAYSLIP_RECORDED` ou `PAYSLIP_DELETED`)
- Then os eventos são publicados com cifra AES-256-GCM (`domus-gcm-v1.`) e assinado pela identidade Nostr do Grupo forte
- And nenhum evento `PAYSLIP_*` é descartado na publicação ou no pull do Grupo forte
- And um terceiro sem o Segredo forte falha em decifrar os eventos nos relays
- And o Grupo antigo continua isolado, sem ler eventos fortes nem transmitir `PAYSLIP_*`.

## Spec Change Log

_None._

## Review Triage Log

- `patch`: Corrigida a resolução de argumentos em `selectEventsToImport` (`src/modules/syncPayload.ts:145-152`). Quando `warnOrOptions` era passado como `undefined` (como feito em `useEventStore.ts:353`), o 4º parâmetro `options` (`{ isStrongGroup: true }`) era descartado, fazendo com que eventos `PAYSLIP_*` fossem rejeitados. Ajustada a extração para ler `options` prioritariamente e adicionados testes unitários em `syncPayload.test.ts`.
- `patch`: Removidos avisos de `import/first` no ESLint em `src/modules/__tests__/nostrSync.test.ts` movendo os imports de `groupSecret` e `eventCipher` para o topo do módulo.
- `patch`: Adicionado teste em `nostrSync.test.ts` para verificar o teto de 20 itens por lote em `partitionStrongBatches` com 25 eventos pequenos sob o Grupo forte gerando 2 lotes (20 e 5).
- `patch`: Adicionado teste em `nostrSync.test.ts` para verificar que envelope individual excedente (> 32 KB) é descartado com aviso e os demais eventos válidos são publicados sem rejeição de promise.
- `patch`: Adicionado teste em `nostrSync.test.ts` para verificar que a assinatura ao vivo (`subscribeToSyncEvents`) no Grupo forte descarta payloads corrompidos, com tag adulterada ou formato desconhecido sem invocar o callback.
- `defer`: Testes de execução em tempo de execução para os hooks de sincronização do React Native (`useSyncEngine.ts`, `useEventStore.ts`) diferidos nos itens existentes D5/D21 devido à limitação de mocks do React Native no Vitest.
- `defer`: Tratamento de redução de lotes substituíveis no Nostr kind 30333 (remoção de lotes órfãos após compactação) pertencente ao escopo de arquitetura de relays do Epic 5.
- `reject`: Otimização de serialização JSON em `partitionStrongBatches` (rejeitado: o lote é limitado a 20 eventos, de modo que o custo computacional de serialização incremental é desprezível e evita complexidade prematura).
- `reject`: Parâmetro não utilizado `includeMyEvents` em `pullSyncEvents` (rejeitado: assinatura de função pré-existente na base de código, mantida por retrocompatibilidade de API).

## Design Notes

No Grupo forte, cada lote publicado é serializado em JSON, cifrado com `encryptStrongPayload` gerando `domus-gcm-v1.<base64>` e empacotado em um evento Nostr kind 30333 assinado com a chave privada Nostr derivada do segredo. Para garantir que o lote não exceda `STRONG_MAX_PLAINTEXT_BYTES` (32 KB), a montagem agrupa até 20 eventos desde que o UTF-8 serializado não ultrapasse 32 KB; caso atinja o limite, fecha o lote atual e inicia outro.

## Verification

**Commands:**
- `npx vitest run src/modules/__tests__/nostrSync.test.ts src/modules/__tests__/syncPayload.test.ts` -- expected: todos os testes de publicação, decifragem e importação no Grupo forte passam com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipagem.
- `npx eslint .` -- expected: 0 erros de linting.
- `npx vitest run` -- expected: todas as suítes de teste passando com 0 falhas.

## Auto Run Result

### Summary of implemented change
- Adicionada opção `options?: { isStrongGroup?: boolean }` em `selectEventsToImport` (`src/modules/syncPayload.ts`) para autorizar eventos `PAYSLIP_*` quando originados do Grupo forte, preservando a recusa do canal legado quando ausente ou falso.
- Adicionada função `selectStrongGroupPushEvents` para incluir todos os eventos locais (inclusive holerites) no push do Grupo forte.
- Atualizado `useEventStore.ts` e `AppStateProvider.tsx` para aceitar e encaminhar a opção `{ isStrongGroup?: boolean }`.
- Configurado `useSyncEngine.ts` para derivar `isStrongGroup`, manter `isStrongGroupRef`, despachar `selectStrongGroupPushEvents` em `getMyEvents` e injetar a flag no `coordinator.importEvents`.
- Atualizado `src/modules/nostrSync.ts` com cifragem e decifragem AES-256-GCM versionada (`domus-gcm-v1.`) para o Grupo forte, particionamento inteligente de lotes respeitando `STRONG_MAX_PLAINTEXT_BYTES` (32 KB) e `BATCH_SIZE` (20), e transmissão/leitura completa de eventos `PAYSLIP_*`.
- Aplicadas correções da revisão adversarial paralela: resolução de argumentos com `undefined` em `selectEventsToImport`, imports reordenados no topo de `nostrSync.test.ts`, e novos testes para teto de 20 itens, envelopes > 32 KB e assinatura ao vivo contra adulterações.

### Verification performed
- `npx vitest run src/modules/__tests__/nostrSync.test.ts src/modules/__tests__/syncPayload.test.ts`: 62 testes passando com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros de tipagem.
- `npx eslint .`: 0 erros de linting (13 avisos pré-existentes, nenhum novo).
- `npx vitest run`: todas as 109 suítes de teste passando com 0 falhas.
