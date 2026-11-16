---
title: 'Story 10.5: Receber as chaves em outro aparelho nativo'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_revision: 'c84900ce301188a3ec0e7d4088fb503c5739e61a'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Teste de execução para o wiring de importEvents e restoreFromBackup em AppStateProvider.tsx
    evidence: |-
      AppStateProvider.tsx importa módulos React Native/Expo que não podem ser montados no Vitest (AGENTS.md).
    location: >-
      src/context/AppStateProvider.tsx:319-345,675-719
    severity: medium
  - summary: >-
      Replay retroativo de KEY_SYNC_UPDATED já existentes no log ao ligar o opt-in posteriormente
    evidence: |-
      Atualmente applyIncomingKeySyncEvents roda na chegada via importEvents (conforme AC da Story 10.5); eventos importados enquanto opt-in estava desligado exigiriam varredura retroativa ao ativar o opt-in.
    location: >-
      src/context/AppStateProvider.tsx:319-345
    severity: medium
  - summary: >-
      Persistência de timestamps por slot aplicados entre reinícios do app
    evidence: |-
      handledKeySyncIdsRef é em memória por sessão; em reinícios, apenas lotes recém-importados com imported > 0 disparam applyIncomingKeySyncEvents.
    location: >-
      src/context/AppStateProvider.tsx:316
    severity: low
---

<intent-contract>

## Intent

**Problem:** Embora o aparelho remetente já publique eventos `KEY_SYNC_UPDATED` cifrados no Grupo forte (Story 10.4), o aparelho receptor ainda não decifra nem grava essas chaves no `SecureStore` ao recebê-las pelo sync.

**Approach:** Criar o módulo puro `src/modules/strongGroup/keySyncReceiver.ts` para filtrar, ordenar e decifrar eventos `KEY_SYNC_UPDATED` apenas em aparelho nativo com opt-in ligado e Grupo forte válido, gravando as chaves válidas nos mesmos locais de `SecureStore` usados ao digitar (`SecureKeyService.storeKey` para IA e `saveSecureApiKey` para OCR) e rejeitando chaves adulteradas sem apagar as chaves locais existentes.

## Boundaries & Constraints

**Always:**
- Só decifrar e gravar quando todas as condições forem verdadeiras: aparelho nativo (`!isWeb` / `EXPO_OS !== "web"`), `!isDemoActive`, `isStrongGroup === true`, `getKeySyncOptIn() === true`, e `parseGroupSecret` válido.
- Gravar as chaves decifradas exatamente nos mesmos locais do `SecureStore` usados quando digitadas pelo usuário (`SecureKeyService.storeKey` -> `domus_ai_key_${provider}` para IA; `saveSecureApiKey` -> `domus_ocr_cloud_vision_api_key` para OCR).
- Rejeitar silenciosamente e com segurança qualquer evento com payload inválido, slot desconhecido, formato inválido, grupo diferente ou tag/AAD adulterada (`decryptSyncedKey` retorna `{ ok: false }`), preservando intactas as chaves já salvas no `SecureStore`.
- Em múltiplos eventos `KEY_SYNC_UPDATED` para o mesmo slot, aplicar em ordem total determinística (`sortEvents`) para que o evento válido mais recente prevaleça.
- Zerar `parsed.secret` em bloco `finally` após o uso.

**Never:**
- Nunca decifrar ou gravar chave quando o opt-in (`getKeySyncOptIn()`) estiver desligado.
- Nunca decifrar ou gravar chave no navegador web (`isWeb` / `EXPO_OS === "web"`), nem chamar `saveSecureApiKey` na web.
- Nunca aceitar `KEY_SYNC_UPDATED` vindo do Grupo antigo (`isStrongGroup: false`).
- Nunca apagar ou sobrescrever uma chave já existente no `SecureStore` quando o evento recebido estiver adulterado ou inválido.
- Nunca implementar ainda a UI/aviso de desligamento da Story 10.6.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nativo + opt-in + Grupo forte | `isWeb: false`, `isStrongGroup: true`, `optIn: true`, eventos `ai:openai` e `ocr:cloud_vision` válidos | Decifra e chama `storeAIKey("openai", ...)` e `storeOCRKey(...)` com as chaves originais; retorna `{ applied: 2, ignored: 0, rejected: 0 }` | Sem erro |
| Opt-in desligado | `optIn: false`, evento `KEY_SYNC_UPDATED` válido | Ignora sem ler segredo do grupo nem chamar `storeAIKey`/`storeOCRKey`; retorna `{ applied: 0, ignored: 1, rejected: 0 }` | Sem erro |
| Navegador web | `isWeb: true` (ou `EXPO_OS === "web"`), `optIn` mockado `true` | Ignora imediatamente sem decifrar nem gravar; retorna `{ applied: 0, ignored: 1, rejected: 0 }` | Sem erro |
| Grupo antigo (`isStrongGroup: false`) | `isStrongGroup: false`, evento `KEY_SYNC_UPDATED` | Ignora imediatamente; `selectEventsToImport` também exclui antes | Sem erro |
| Chave adulterada ou de outro grupo | Ciphertext adulterado ou cifrado com outro segredo; aparelho já possui chave local | Rejeita (`rejected: 1`, `applied: 0`) e **não** apaga nem sobrescreve a chave existente no `SecureStore` | Sem exceção lançada |
| Múltiplos eventos para mesmo slot | Evento antigo válido + evento mais novo válido (ou mais novo adulterado) | Em `sortEvents`, aplica o válido mais recente; se o mais novo for adulterado, não sobrescreve com lixo | Evento inválido ignorado em segurança |
| Idempotência (`handledIds`) | Mesmo `event.id` reenviado após já aplicado | Segundo processamento ignora sem regravar no `SecureStore` | Sem erro |

</intent-contract>

## Code Map

- `src/modules/strongGroup/keySyncCipher.ts:129-188` -- `KEY_SYNC_EVENT_TYPE`, `isSyncedKeySlot`, `decryptSyncedKey` (já implementado na Story 10.4; retorna `{ ok: true, apiKey } | { ok: false, error }`).
- `src/modules/strongGroup/keySyncOptIn.ts:91-115` -- `getKeySyncOptIn()` (já bloqueia web retornando `false`).
- `src/modules/strongGroup/keySyncPublisher.ts:26-36` -- `AI_SYNCED_PROVIDERS` e `AISyncedProvider`.
- `packages/storage/src/eventOrder.ts:40-52` -- `sortEvents` para ordenação determinística `(timestamp, deviceId, id)`.
- `src/modules/ai/infrastructure/SecureKeyService.ts:28-45` -- `SecureKeyService.storeKey(provider, apiKey)` (`domus_ai_key_${provider}`).
- `src/modules/ai/application/AIClientService.ts` -- `AIClientService.resetBreaker(provider)`.
- `src/services/ocrConfigService.ts:72-82` -- `saveSecureApiKey(key)` (exportar se ainda privado; grava em `domus_ocr_cloud_vision_api_key`).
- `src/context/AppStateProvider.tsx:120-165,691-692` -- Envolver `eventStore.importEvents` para acionar `applyIncomingKeySyncEvents` quando `imported > 0 && options?.isStrongGroup === true`.

## Tasks & Acceptance

**Execution:**
- `src/services/ocrConfigService.ts` -- Exportar `saveSecureApiKey` para permitir gravação direta da chave OCR decifrada no `SecureStore` em aparelho nativo sem emitir `SETTING_CHANGED` -- Mantém exatamente o mesmo destino (`domus_ocr_cloud_vision_api_key`) usado ao digitar a chave.
- `src/modules/strongGroup/keySyncReceiver.ts` -- Criar módulo puro com `applyIncomingKeySyncEvents` (filtrando `KEY_SYNC_UPDATED`, checando `!isWeb`, `!isDemoActive`, `isStrongGroup`, `getKeySyncOptIn()`, `parseGroupSecret`, ordenando com `sortEvents`, decifrando com `decryptSyncedKey` e persistindo via callbacks `storeAIKey`/`storeOCRKey` com isolamento de falhas e `handledIds` opcional) -- Isola toda a lógica de recebimento e segurança para testes unitários em Vitest sem `react-native`.
- `src/context/AppStateProvider.tsx` -- Envolver `eventStore.importEvents` em um `useCallback` que, após importar eventos do Grupo forte (`imported > 0 && options?.isStrongGroup === true`), chama `applyIncomingKeySyncEvents` usando `loadStrongGroupSecret`, `SecureKeyService.storeKey` + `AIClientService.resetBreaker`, `saveSecureApiKey` e `handledKeySyncIdsRef` -- Conecta o recebimento automático no fluxo real de sync do app.
- `src/modules/strongGroup/__tests__/keySyncReceiver.test.ts` -- Cobrir toda a matriz I/O: round-trip ponta a ponta (remetente cifra com `buildEncryptedKeySyncEvent` -> receptor decifra e grava nos mocks de `SecureKeyService`/`saveSecureApiKey`), opt-in desligado, navegador web (`isWeb: true` e `EXPO_OS = "web"`), Grupo antigo (`isStrongGroup: false`), modo demo, ciphertext adulterado/grupo diferente preservando chave pré-existente, ordenação por `sortEvents` e idempotência com `handledIds` -- Valida todos os ACs da Story 10.5.

**Acceptance Criteria:**
- Given um aparelho nativo receptor com opt-in ligado no mesmo Grupo forte, when chegam eventos `KEY_SYNC_UPDATED` válidos de IA e OCR, then as chaves são decifradas e salvas nos mesmos locais de `SecureStore` usados ao digitar (`domus_ai_key_${provider}` e `domus_ocr_cloud_vision_api_key`).
- Given um aparelho sem opt-in ou um navegador web, when chegam eventos `KEY_SYNC_UPDATED`, then nada é decifrado nem salvo no `SecureStore`.
- Given um evento `KEY_SYNC_UPDATED` com chave inválida ou adulterada, when processado pelo receptor, then o evento é rejeitado e qualquer chave já existente no `SecureStore` permanece intacta.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 14 findings — high 0, medium 7, low 7, false 0, maybe-false 0
- findings:
  - `[medium]` `[defer]` Eventos `KEY_SYNC_UPDATED` importados enquanto opt-in era `false` não são reaplicados ao ligar o opt-in depois — adiado (contrato da Story 10.5 atua na chegada; avaliar junto à Story 10.6/10.7).
  - `[low]` `[defer]` `handledKeySyncIdsRef` em memória e ausência de controle por timestamp persistido entre sessões — adiado.
  - `[low]` `[reject]` Múltiplos eventos válidos para o mesmo `slot` num mesmo lote gravam em sequência — manter contagem e semântica de `applied` por evento válido mantém ordem determinística e simplicidade.
  - `[medium]` `[patch]` `getOptIn()` não era re-checado após `loadStrongGroupSecret()` antes de gravar — adicionada rechecagem em `src/modules/strongGroup/keySyncReceiver.ts`.
  - `[low]` `[reject]` Chaves de IA não passam por `trim()` ao gravar — preserva paridade exata com `SecureKeyService.storeKey`.
  - `[low]` `[patch]` `restoreFromBackup` em `src/context/AppStateProvider.tsx` não limpava `handledKeySyncIdsRef.current` — envolvido em `useCallback` limpando `handledKeySyncIdsRef.current.clear()`.
  - `[low]` `[reject]` Eventos rejeitados não são memorizados nem logados — rejeitar sem memorizar é seguro e evita registrar metadados de chaves.
  - `[medium]` `[patch]` Faltavam testes para `loadStrongGroupSecret` retornando `null`/inválido e falha isolada em `storeAIKey`/`storeOCRKey` — adicionados em `src/modules/strongGroup/__tests__/keySyncReceiver.test.ts`.
  - `[medium]` `[defer]` Catch-up ao ligar opt-in depois (mesma causa raiz do item 1) — adiado.
  - `[medium]` `[patch]` Chamadas concorrentes a `importEvents` podiam intercalar `applyIncomingKeySyncEvents` fora de ordem — serializadas via `keySyncQueueRef` em `src/context/AppStateProvider.tsx`.
  - `[low]` `[defer]` Reinício com `handledKeySyncIdsRef` vazio (mesma causa raiz do item 2) — adiado.
  - `[medium]` `[patch]` Eventos `KEY_SYNC_UPDATED` duplicados com mesmo `evt.id` no mesmo lote eram processados duas vezes — adicionado `batchIds` em `src/modules/strongGroup/keySyncReceiver.ts` e teste correspondente.
  - `[medium]` `[defer]` Wiring de `AppStateProvider.importEvents` sem teste de execução no Vitest — adiado por ausência de harness RN.
  - `[medium]` `[patch]` Cobertura ausente de segredo inválido e falha de escrita em `keySyncReceiver.test.ts` (mesma causa raiz do item 8) — corrigida.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit && npx vitest run --maxWorkers=2` -- passou após os ajustes finais (`eslint`: 0 erros, 14 warnings; `tsc --noEmit`: 0 erros; `vitest`: 138 arquivos, 3087 testes passando).

## Auto Run Result

- **Summary:** Implementado o recebimento e decifragem de chaves de IA e OCR (`KEY_SYNC_UPDATED`) em outro aparelho nativo via `applyIncomingKeySyncEvents`, respeitando opt-in por aparelho, Grupo forte, bloqueio no navegador web e preservação de chaves locais diante de payloads adulterados.
- **Files changed:**
  - `src/modules/strongGroup/keySyncReceiver.ts` — filtragem, deduplicação no lote (`batchIds`), ordenação (`sortEvents`), decifragem (`decryptSyncedKey`), rechecagem de opt-in e persistência isolada por slot.
  - `src/context/AppStateProvider.tsx` — wrapper `importEvents` com fila `keySyncQueueRef` acionando `applyIncomingKeySyncEvents` para lotes do Grupo forte (`SecureKeyService.storeKey` + `AIClientService.resetBreaker` e `saveSecureApiKey`), e limpeza de `handledKeySyncIdsRef` em `resetApp` e `restoreFromBackup`.
  - `src/modules/strongGroup/__tests__/keySyncReceiver.test.ts` — 13 testes cobrindo round-trip IA/OCR, opt-in desligado, web guard, Grupo antigo, modo demo, adulteração/grupo diferente, ordenação `sortEvents`, idempotência (`handledIds` e mesmo lote), segredo ausente/inválido e falha isolada de escrita.
- **Review breakdown:** 6 itens corrigidos por patch (4 `medium` + 1 `low` + 1 duplicado), 5 adiados (`medium`/`low` agrupados em 3 causas raiz), 3 rejeitados.
- **Follow-up review recommendation:** `true` (múltiplos `medium` corrigidos por patch; risco residual: wiring React Native em `AppStateProvider.tsx` não montado no Vitest).
- **Verification:** `eslint` (0 erros), `tsc --noEmit` (0 erros) e `vitest run --maxWorkers=2` (138 arquivos, 3087 testes passando).
