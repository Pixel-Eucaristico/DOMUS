---
title: 'Story 10.4: Enviar as chaves cifradas ao Grupo forte'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_revision: '74e2726058954d8520a0c8de56deb0d6ab296ad6'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Testes de execução para os gatilhos em useAISettings, app/ocr-settings.tsx, app/sync.tsx e AppStateProvider.tsx
    evidence: |-
      O repositório não possui @testing-library/react-native nem jsdom, e vi.mock("react-native") falha no Vitest (AGENTS.md).
    location: >-
      src/hooks/useAISettings.ts:161-164, app/ocr-settings.tsx:68-71, app/sync.tsx:145-149, src/context/AppStateProvider.tsx:317-353
    severity: medium
  - summary: >-
      Publicar chaves locais existentes ao migrar, criar ou entrar em Grupo forte quando o opt-in já estiver ligado
    evidence: |-
      Atualmente syncAllSavedKeys() dispara ao ligar o switch em app/sync.tsx; se domus_key_sync_opt_in_v1 já estava true antes de parear novo Grupo forte, exige religar ou salvar novamente.
    location: >-
      app/sync.tsx:145-149
    severity: low
  - summary: >-
      Deduplicação de eventos KEY_SYNC_UPDATED repetidos e tombstone na exclusão de chaves
    evidence: |-
      Fora do escopo de envio inicial da Story 10.4; avaliar junto às Stories 10.5/10.6.
    location: >-
      src/modules/strongGroup/keySyncPublisher.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** Mesmo após o usuário ativar o opt-in por aparelho (Story 10.3), salvar uma chave de IA ou OCR no `SecureStore` ainda não publica nenhum evento cifrado para os outros aparelhos do Grupo forte.

**Approach:** Derivar uma chave simétrica dedicada do Segredo de grupo com rótulo próprio (`domus/strong-group/v1/key-sync`), cifrar a chave com AES-256-GCM em um evento `KEY_SYNC_UPDATED` (excluído do Grupo antigo e aceito no `replayAllEvents` sem mutar estado financeiro), e publicar esse evento automaticamente ao salvar chaves de IA/OCR ou ao ativar o opt-in em aparelho nativo com Grupo forte.

## Boundaries & Constraints

**Always:**
- A chave de cifragem do sync de chaves deve ser derivada via HKDF-SHA256 a partir do `secret` do Grupo forte usando o rótulo próprio `domus/strong-group/v1/key-sync` (separado de `nostr-identity` e `event-encryption`).
- Cada evento `KEY_SYNC_UPDATED` deve conter no `payload` apenas `{ slot, ciphertext, schemaVersion: 1 }`, onde `ciphertext` é AES-256-GCM (`domus-key-gcm-v1.<base64(...)>`) autenticado com AAD vinculando versão, `slot` e `nostrPublicKey` do grupo — nunca a chave em texto puro.
- O prefixo `KEY_SYNC_` deve ser adicionado a `OLD_GROUP_EXCLUDED_PREFIXES` em `src/modules/syncPayload.ts` para que nunca seja publicado no Grupo antigo nem importado dele (inclusive durante coexistência).
- `KEY_SYNC_UPDATED` deve constar em `KNOWN_EVENT_TYPES` (`src/context/replay.ts`) e `PAYLOAD_SPECS` (`src/context/replayValidation.ts`) para não cair em `quarantine` durante o replay.
- Só publicar em aparelho nativo (`!isWeb` / `EXPO_OS !== "web"`), fora do modo demo (`!isDemoActive`), com `getKeySyncOptIn() === true` e segredo de Grupo forte válido (`parseGroupSecret`).

**Never:**
- Nunca gravar chave de IA ou OCR em texto puro no `SQLite` (`EventStore`), no backup (`BackupExportService`), no log local ou em payloads publicados aos relays Nostr.
- Nunca publicar `KEY_SYNC_UPDATED` no Grupo antigo.
- Nunca implementar ainda a decifragem/gravação no aparelho receptor (Story 10.5) nem o fluxo de desligamento/aviso (Story 10.6).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Derivação e cifragem com rótulo próprio | `secret` válido + `slot: "ai:openai"` + `apiKey: "sk-..."` | `deriveKeySyncKey(secret)` difere de `encryptionKey` e `nostrPrivateKey`; `encryptSyncedKey` gera `domus-key-gcm-v1.*` sem conter `"sk-..."` no JSON do evento | Chave vazia lança erro em `encryptSyncedKey` |
| Tamper / troca de slot ou grupo | `ciphertext` válido para `ai:openai` decifrado com `slot: "ocr:cloud_vision"` ou outro `secret` | Decifragem falha com `{ ok: false, error }` | Sem exceção não tratada na decifragem |
| Publicação com opt-in desligado ou web | `optIn: false` ou `isWeb: true` ou `isDemoActive: true` | `publishEncryptedKeyIfOptedIn` retorna `false` e não chama `dispatch` | Falha de leitura retorna `false` |
| Publicação sem Grupo forte | `loadStrongGroupSecret()` retorna `null` ou código legado/inválido | `publishEncryptedKeyIfOptedIn` retorna `false` e não chama `dispatch` | Rejeição de `loadStrongGroupSecret` capturada, retorna `false` |
| Publicação completa (nativo + opt-in + Grupo forte) | `optIn: true`, `secret` forte válido, chave `"sk-secret-test-123"` | `dispatch` recebe `KEY_SYNC_UPDATED`; `SQLite`/log local/backup (`buildExportEvents`)/payload Nostr (`selectStrongGroupPushEvents`) não contêm `"sk-secret-test-123"` em texto puro | Sem erro |
| Barreira do Grupo antigo | Lote com `KEY_SYNC_UPDATED` | `partitionOldGroupEvents` coloca em `excluded`; `selectOldGroupPushEvents` omite; `selectEventsToImport(..., { isStrongGroup: false })` exclui; `selectStrongGroupPushEvents` mantém | Sem erro |
| Replay do evento | `replayAllEvents([keySyncEvent], ...)` | Evento validado sem ir para `quarantine` | Payload inválido (`ciphertext` vazio ou `slot` desconhecido) vai para `quarantine` |

</intent-contract>

## Code Map

- `src/modules/strongGroup/groupSecret.ts:34-41,78-80,173-218` -- Define `STRONG_GROUP_LABELS` e `deriveKey(secret, info)` com HKDF-SHA256; adicionar `keySyncInfo: "domus/strong-group/v1/key-sync"` e `deriveKeySyncKey(secret)`.
- `src/modules/strongGroup/eventCipher.ts:101-176` -- Referência de AES-256-GCM (`@noble/ciphers/aes.js`, `nonce(12) || cipher || tag(16)`), `base64.ts` e AAD.
- `src/modules/strongGroup/keySyncOptIn.ts` -- `getKeySyncOptIn()` para checar opt-in por aparelho sem `react-native`.
- `src/modules/syncPayload.ts:57-90,97-131,154-214` -- `OLD_GROUP_EXCLUDED_PREFIXES`, `partitionOldGroupEvents`, `selectOldGroupPushEvents`, `selectStrongGroupPushEvents`, `selectEventsToImport`.
- `src/context/replay.ts:95-103` e `src/context/replayValidation.ts:190-230,269-277` -- `KNOWN_EVENT_TYPES` e `PAYLOAD_SPECS` (onde `KEY_SYNC_UPDATED` deve ser registrado).
- `src/context/AppStateProvider.tsx:95-115,590-640` -- `eventStore.dispatch`, `isDemoActiveRef`, `deviceId` e exposição via `useAppState()`.
- `src/hooks/useAISettings.ts:147-165` (`saveApiKey`), `app/ocr-settings.tsx:54-82` (`handleSave`) e `app/sync.tsx:137-156` (`handleToggleKeySyncOptIn`) -- Pontos de disparo após salvar chave ou ligar o opt-in.
- `src/modules/backup/application/BackupExportService.ts:23-129` e `src/context/localEventLog.ts:292-295` -- `buildExportEvents` e `BackupExportService.exportPlain` para verificar ausência de texto puro no backup.

## Tasks & Acceptance

**Execution:**
- `src/modules/strongGroup/groupSecret.ts` -- Adicionar `keySyncInfo: "domus/strong-group/v1/key-sync"` em `STRONG_GROUP_LABELS` e exportar `deriveKeySyncKey(secret: Uint8Array): Uint8Array` usando `deriveKey` -- Garante separação criptográfica com rótulo próprio sem quebrar `deriveStrongGroupKeys`.
- `src/modules/strongGroup/keySyncCipher.ts` -- Criar módulo puro com `KEY_SYNC_EVENT_TYPE = "KEY_SYNC_UPDATED"`, `SyncedKeySlot` (`"ai:openai" | "ai:gemini" | "ai:claude" | "ai:deepseek" | "ai:qwen" | "ai:elevenlabs" | "ocr:cloud_vision"`), `KeySyncPayload`, `encryptSyncedKey` e `decryptSyncedKey` usando `gcm` (`@noble/ciphers/aes.js`), `deriveKeySyncKey(secret)` e AAD vinculando `slot` e `nostrPublicKey` -- Cifra e autentica chaves sem nunca serializar texto puro.
- `src/modules/strongGroup/keySyncPublisher.ts` -- Criar módulo puro com `buildEncryptedKeySyncEvent`, `collectLocalKeysForSync`, `publishEncryptedKeyIfOptedIn` e `publishAllLocalKeysIfOptedIn`, aplicando guardas `!isWeb`, `!isDemoActive`, `getKeySyncOptIn()` e `parseGroupSecret` -- Centraliza publicação segura e testável em Vitest sem `react-native`.
- `src/modules/syncPayload.ts`, `src/context/replay.ts`, `src/context/replayValidation.ts` -- Adicionar `"KEY_SYNC_"` a `OLD_GROUP_EXCLUDED_PREFIXES`, e registrar `"KEY_SYNC_UPDATED"` em `KNOWN_EVENT_TYPES` e `PAYLOAD_SPECS` (`slot`, `ciphertext`, `schemaVersion`) -- Bloqueia Grupo antigo e impede quarentena no replay.
- `src/context/AppStateProvider.tsx`, `src/hooks/useAISettings.ts`, `app/ocr-settings.tsx`, `app/sync.tsx` -- Expor `syncSavedKey` e `syncAllSavedKeys` em `AppStateProvider.tsx` (usando `publishEncryptedKeyIfOptedIn` / `publishAllLocalKeysIfOptedIn` + `eventStore.dispatch`) e chamá-los ao salvar chave de IA (`saveApiKey`), chave de OCR (`handleSave`) ou ativar o opt-in (`handleToggleKeySyncOptIn`) -- Conecta o fluxo real do app sem bloquear a UI em caso de falha.
- `src/modules/strongGroup/__tests__/keySyncCipher.test.ts` e `src/modules/strongGroup/__tests__/keySyncPublisher.test.ts` -- Testar toda a matriz I/O, incluindo verificação explícita de que a chave em texto puro não aparece no evento gerado, no `EventStore` local (`SQLite`/memória), no payload de backup (`buildExportEvents` / `BackupExportService.exportPlain`), nem no payload de push (`selectStrongGroupPushEvents`), além da exclusão no Grupo antigo (`partitionOldGroupEvents`, `selectOldGroupPushEvents`, `selectEventsToImport`) e validação no `replayAllEvents` -- Cobre integralmente todos os ACs da Story 10.4.

**Acceptance Criteria:**
- Given o opt-in da Story 10.3 ligado, Grupo forte ativo e uma chave de IA ou OCR salva no `SecureStore`, when o app publica o evento `KEY_SYNC_UPDATED`, then a chave viaja cifrada com chave derivada via rótulo `domus/strong-group/v1/key-sync` e nenhuma ocorrência da chave em texto puro existe no log local, no `SQLite`, no backup ou no payload publicado.
- Given um evento `KEY_SYNC_UPDATED` no log local ou recebido para importação, when passa pela seleção de sync do Grupo antigo, then ele é sempre excluído e nunca publicado nem aceito pelo Grupo antigo.
- Given o opt-in desligado, navegador web, modo demo ou ausência de Grupo forte, when uma chave é salva, then nenhum evento `KEY_SYNC_UPDATED` é emitido.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 16 findings — high 0, medium 7, low 6, false 3, maybe-false 0
- findings:
  - `[medium]` `[patch]` `encryptSyncedKey` em `src/modules/strongGroup/keySyncCipher.ts` alocava `data` e chamava `deriveKeySyncKey`/`deriveStrongGroupKeys`/`rng` antes do `try/finally` — movidas todas as etapas para dentro do `try/finally` garantindo `fill(0)` mesmo em exceção.
  - `[medium]` `[patch]` `decryptSyncedKey` em `src/modules/strongGroup/keySyncCipher.ts` não tratava UTF-8 inválido nem chave vazia/espaços após decifragem — adicionado `TextDecoder("utf-8", { fatal: true })` em `try/catch` e rejeição de `apiKey.trim().length === 0` com `{ ok: false, error: "malformed" }`.
  - `[low]` `[reject]` `deriveStrongGroupKeys` chamado apenas para `nostrPublicKey` no AAD — custo desprezível (ocorre só ao salvar chave) e mantém derivação única sem duplicar lógica secp256k1.
  - `[low]` `[reject]` `isDemoActiveRef.current` amostrado antes de `await` enquanto `dispatch` já bloqueia emissão em demo — `dispatch` já impede gravação no log em demo; risco cosmético.
  - `[low]` `[reject]` Chamadas `void syncSavedKey` / `void syncAllSavedKeys` sem `await` na UI — intencional para não bloquear navegação/UI quando o sync roda em segundo plano.
  - `[false]` `saveApiKey` em `useAISettings.ts` não faz `trim()` na chave — `SecureKeyService.storeKey(provider, key)` também persiste `key` sem `trim()`; sincronizar o mesmo valor preserva paridade.
  - `[low]` `[defer]` Migrar/criar/entrar em Grupo forte com opt-in já `true` não dispara `syncAllSavedKeys` automaticamente — adiado.
  - `[low]` `[defer]` Salvamentos repetidos ou exclusão de chave não deduplicam nem emitem tombstone — adiado (avaliar nas Stories 10.5/10.6).
  - `[medium]` `[defer]` Falta de testes de execução em `useAISettings`, `app/ocr-settings.tsx`, `app/sync.tsx` e `AppStateProvider.tsx` — adiado por ausência de harness RN no Vitest.
  - `[false]` `encryptSyncedKey` vaza buffer (duplicado do item 1) — agrupado no item 1.
  - `[false]` `decryptSyncedKey` lança em UTF-8 inválido (duplicado do item 2) — agrupado no item 2.
  - `[medium]` `[patch]` `publishAllLocalKeysIfOptedIn` não re-checava `getOptIn()` após `await` de `loadStrongGroupSecret` / `collectLocalKeysForSync` — adicionada re-checagem antes do loop de dispatch.
  - `[medium]` `[patch]` Erro em uma chave dentro do loop de `publishAllLocalKeysIfOptedIn` abortava as demais — envolvido cada item em `try/catch` (`continue`).
  - `[medium]` `[patch]` `slotForAIProvider` sem cobertura direta em `src/modules/strongGroup/__tests__/keySyncPublisher.test.ts` — adicionado teste cobrindo todos os `AI_SYNCED_PROVIDERS` e entradas inválidas.
  - `[medium]` `[defer]` Gatilhos de runtime em `useAISettings`, `ocr-settings`, `sync` e `AppStateProvider` sem teste de execução (mesma causa raiz do item 9) — adiado.
  - `[low]` `[reject]` `SQLiteEventStore` e `nostrSync.ts` não exercitados diretamente — invariantes já cobertos pelas suítes de `eventStore`, `localEventLog`, `BackupExportService` e `syncPayload`.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit && npx vitest run --maxWorkers=2` -- passou após os ajustes finais (`eslint`: 0 erros, 14 warnings; `tsc --noEmit`: 0 erros; `vitest`: 137 arquivos, 3074 testes passando).

## Auto Run Result

- **Summary:** Implementado o envio cifrado de chaves de IA e OCR (`KEY_SYNC_UPDATED`) exclusivamente para o Grupo forte usando AES-256-GCM com chave derivada via HKDF (`domus/strong-group/v1/key-sync`), bloqueio no Grupo antigo (`OLD_GROUP_EXCLUDED_PREFIXES`), registro no replay (`KNOWN_EVENT_TYPES`, `PAYLOAD_SPECS`, `SCHEMA_REGISTRY`) e integração nos pontos de salvamento e opt-in.
- **Files changed:**
  - `src/modules/strongGroup/groupSecret.ts` — rótulo `domus/strong-group/v1/key-sync` e `deriveKeySyncKey`.
  - `src/modules/strongGroup/keySyncCipher.ts` — cifra e decifragem autenticadas `domus-key-gcm-v1` com limpeza de buffers sensíveis.
  - `src/modules/strongGroup/keySyncPublisher.ts` — construção de `KEY_SYNC_UPDATED`, coleta local e publicação condicionada a nativo + opt-in + Grupo forte.
  - `src/modules/syncPayload.ts`, `packages/events/src/schemaVersion.ts`, `src/context/replay.ts`, `src/context/replayValidation.ts` — exclusão do Grupo antigo (`KEY_SYNC_`) e validação no replay.
  - `src/context/AppStateProvider.tsx`, `src/hooks/useAISettings.ts`, `app/ocr-settings.tsx`, `app/sync.tsx` — exposição e chamada de `syncSavedKey` e `syncAllSavedKeys`.
  - `src/modules/strongGroup/__tests__/keySyncCipher.test.ts`, `src/modules/strongGroup/__tests__/keySyncPublisher.test.ts`, `src/modules/__tests__/groupSecret.test.ts`, `src/modules/__tests__/syncPayload.test.ts`, `packages/events/__tests__/schemaVersion.test.ts`, `src/context/__tests__/replay.test.ts` — cobertura completa da matriz I/O e ausência de texto puro no log, backup e payload de push.
- **Review breakdown:** 5 itens corrigidos por patch (4 `medium` agrupados + 1 `medium` `slotForAIProvider`), 3 adiados, 4 rejeitados, 2 duplicados/falsos.
- **Follow-up review recommendation:** `true` (múltiplos `medium` corrigidos por patch; risco residual: wiring React Native em `useAISettings`, `ocr-settings.tsx`, `sync.tsx` e `AppStateProvider.tsx` não montado no Vitest).
- **Verification:** `eslint` (0 erros), `tsc --noEmit` (0 erros) e `vitest run --maxWorkers=2` (137 arquivos, 3074 testes passando).
