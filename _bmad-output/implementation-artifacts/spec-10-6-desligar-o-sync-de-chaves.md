---
title: 'Story 10.6: Desligar o sync de chaves'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_revision: '04b6bb3c7e17c8262f0ecc0f71b63b61844f03b2'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Embora o usuário já possa desmarcar o toggle do opt-in em `app/sync.tsx` (Story 10.3), o app ainda não exibe o aviso obrigatório ao desligar explicando que eventos cifrados já publicados permanecem nos relays e exigem troca da chave no provedor para invalidação, nem há um teste integrado comprovando todo o comportamento de desligamento (parar envio, parar recebimento, manter chaves no `SecureStore` e emitir o aviso).

**Approach:** Adicionar a constante/helper puro `disableKeySyncOptIn` e `KEY_SYNC_DISABLE_NOTICE` em `src/modules/strongGroup/keySyncOptIn.ts`, acionar o aviso via `appAlert` ao desligar o opt-in em `app/sync.tsx`, e cobrir em `src/modules/strongGroup/__tests__/keySyncDisable.test.ts` que desligar o sync interrompe publicação e recebimento, preserva as chaves já salvas no `SecureStore` e entrega o aviso em pt-BR.

## Boundaries & Constraints

**Always:**
- Ao desligar o opt-in (`nextValue === false`) em aparelho nativo, persistir `domus_key_sync_opt_in_v1 = "false"` e exibir aviso via `appAlert` (nunca `Alert.alert` ou `window.alert`) em pt-BR com acentos completos informando:
  - que o aparelho parou de publicar e de receber chaves;
  - que as chaves já salvas continuam no `SecureStore` deste aparelho;
  - que eventos cifrados já publicados continuam nos relays públicos e, para invalidá-los, é necessário trocar a chave no provedor.
- Após desligado, `publishEncryptedKeyIfOptedIn`, `publishAllLocalKeysIfOptedIn` e `applyIncomingKeySyncEvents` devem ignorar envios e recebimentos sem tocar no `SecureStore`.
- Todas as chaves já presentes no `SecureStore` (IA e OCR) devem permanecer intactas ao desligar.
- Se a gravação de `setKeySyncOptIn(false)` falhar, o aviso de desligamento não deve ser exibido e o erro deve ser tratado com rollback + `appAlert` de erro.

**Never:**
- Nunca apagar chaves de IA ou OCR do `SecureStore` ao desligar o opt-in.
- Nunca exibir o aviso na web ou quando `disableKeySyncOptIn` for bloqueado por `isWeb: true`.
- Nunca usar `Alert.alert`, `window.alert` ou `window.confirm`.
- Nunca alterar `BackupExportService` / escopo do backup do Drive (escopo da Story 10.7).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Desligar em aparelho nativo | `optIn` era `true`, `disableKeySyncOptIn({ storage, onNotice })` | Persiste `"false"`, `getKeySyncOptIn()` passa a `false`, `onNotice` recebe título e texto em pt-BR mencionando relays e troca da chave no provedor | Sem erro |
| Efeito no envio e recebimento | Após `disableKeySyncOptIn`, chamar `publishEncryptedKeyIfOptedIn`, `publishAllLocalKeysIfOptedIn` e `applyIncomingKeySyncEvents` | Envio retorna `false`/`0` sem `dispatch`; recebimento retorna `{ applied: 0, ignored: 1, rejected: 0 }` sem decifrar nem gravar | Sem erro |
| Preservação do `SecureStore` | Chaves `domus_ai_key_openai` e `domus_ocr_cloud_vision_api_key` salvas antes de desligar | Ambas permanecem idênticas no `SecureStore` após desligar e após tentativas subsequentes de envio/recebimento | Sem erro |
| Falha ao persistir desligamento | `storage.setItem` rejeita | `disableKeySyncOptIn` rejeita; `onNotice` não é chamado; UI em `app/sync.tsx` reverte toggle e mostra `appAlert` de erro | Propaga rejeição para rollback |
| Navegador (web) | `isWeb: true` (ou `EXPO_OS === "web"`) | `disableKeySyncOptIn` retorna `{ disabled: false }` sem tocar no storage nem chamar `onNotice` | No-op seguro |

</intent-contract>

## Code Map

- `src/modules/strongGroup/keySyncOptIn.ts:91-137` -- `getKeySyncOptIn`, `setKeySyncOptIn`; adicionar `KEY_SYNC_DISABLE_NOTICE` e `disableKeySyncOptIn`.
- `app/sync.tsx:137-159` -- `handleToggleKeySyncOptIn`: quando `saved === false` após `nextValue === false`, chamar `appAlert(KEY_SYNC_DISABLE_NOTICE.title, KEY_SYNC_DISABLE_NOTICE.message)`.
- `src/modules/strongGroup/keySyncPublisher.ts` -- `publishEncryptedKeyIfOptedIn` e `publishAllLocalKeysIfOptedIn` (já respeitam `getKeySyncOptIn`).
- `src/modules/strongGroup/keySyncReceiver.ts` -- `applyIncomingKeySyncEvents` (já respeita `getKeySyncOptIn`).
- `src/services/appAlert.ts` -- `appAlert(title, message)` usado em `app/sync.tsx`.

## Tasks & Acceptance

**Execution:**
- `src/modules/strongGroup/keySyncOptIn.ts` -- Exportar `KEY_SYNC_DISABLE_NOTICE` (`title` e `message` em pt-BR com acentos completos cobrindo relays públicos, permanência dos eventos publicados e troca da chave no provedor para invalidá-los, além da preservação local) e `disableKeySyncOptIn(options)` que chama `setKeySyncOptIn(false, options)` e aciona `onNotice` apenas quando `isWeb` é `false` e a gravação teve sucesso -- Centraliza o texto e o fluxo testável de desligamento sem acoplar `react-native`.
- `app/sync.tsx` -- Atualizar `handleToggleKeySyncOptIn` para usar `disableKeySyncOptIn` (ou `setKeySyncOptIn(false)` + `appAlert(KEY_SYNC_DISABLE_NOTICE.title, KEY_SYNC_DISABLE_NOTICE.message)`) quando `nextValue === false` e o salvamento confirmar `saved === false` -- Garante que o usuário veja o aviso exigido ao desligar a opção.
- `src/modules/strongGroup/__tests__/keySyncDisable.test.ts` -- Testar toda a matriz I/O: ciclo completo (ligado -> publica -> desliga -> `onNotice` chamado -> `publish*` bloqueados -> `applyIncomingKeySyncEvents` ignora -> chaves existentes no `SecureStore` simulado permanecem intactas), falha de escrita sem disparar aviso, e bloqueio na web -- Valida integralmente todos os ACs da Story 10.6.

**Acceptance Criteria:**
- Given o sync de chaves ligado em um aparelho nativo, when o usuário desliga a opção em `app/sync.tsx`, then o opt-in passa para `false`, o aparelho para de publicar e de receber chaves, e o `appAlert` exibe o aviso em pt-BR informando que eventos cifrados já publicados continuam nos relays e exigem troca da chave no provedor para invalidação.
- Given chaves de IA e OCR já salvas no `SecureStore`, when o usuário desliga o sync de chaves, then todas as chaves permanecem preservadas no `SecureStore`.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 9 findings — high 0, medium 2, low 6, false 1, maybe-false 0
- findings:
  - `[low]` `[patch]` `options.onNotice` em `disableKeySyncOptIn` podia lançar exceção e provocar rollback após `setKeySyncOptIn(false)` — isolado em `try/catch` em `src/modules/strongGroup/keySyncOptIn.ts`.
  - `[false]` `onNotice` causando rollback (duplicado do item 1) — agrupado no item 1.
  - `[low]` `[reject]` Retorno `{ disabled }` de `disableKeySyncOptIn` ignorado em `app/sync.tsx` — substituído pela delegação a `toggleKeySyncOptIn`.
  - `[low]` `[patch]` `KEY_SYNC_DISABLE_NOTICE` era mutável e citava `"SecureStore"` ao usuário final — congelado com `Object.freeze` (`readonly`) e ajustado o texto para `"armazenamento seguro deste aparelho"`.
  - `[low]` `[reject]` Testes de `keySyncDisable.test.ts` não exercitam `defaultStorage` — `defaultStorage` já é coberto por `keySyncOptIn.test.ts`.
  - `[low]` `[patch]` Faltavam testes de `disableKeySyncOptIn` sem `onNotice`, idempotência quando já desligado e religamento com `setKeySyncOptIn(true)` — adicionados em `src/modules/strongGroup/__tests__/keySyncDisable.test.ts`.
  - `[medium]` `[patch]` Orquestração de `handleToggleKeySyncOptIn` em `app/sync.tsx` sem teste executável — extraído helper puro `toggleKeySyncOptIn` em `src/modules/strongGroup/keySyncOptIn.ts` e testados os ramos `true`, `false` e rollback em `keySyncDisable.test.ts`.
  - `[medium]` `[patch]` Mesma causa raiz do item anterior (`VG-1`) — corrigida com `toggleKeySyncOptIn`.
  - `[low]` `[reject]` `app/sync.tsx` render/alert visual não montado no Vitest — mitigado pela extração de `toggleKeySyncOptIn` e cobertura completa no Vitest.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit && npx vitest run --maxWorkers=2` -- passou após os ajustes da revisão (`eslint`: 0 erros, 14 warnings; `tsc --noEmit`: 0 erros; `vitest`: 139 arquivos, 3094 testes passando).

## Auto Run Result

- **Summary:** Implementado o desligamento do sync de chaves de IA e OCR com aviso explícito em pt-BR (`KEY_SYNC_DISABLE_NOTICE`), isolamento de publicação e recebimento após desligar, e preservação das chaves já salvas no `SecureStore`.
- **Files changed:**
  - `src/modules/strongGroup/keySyncOptIn.ts` — adicionados `KEY_SYNC_DISABLE_NOTICE` (`Object.freeze`), `disableKeySyncOptIn` (com isolamento de `onNotice` e guarda web) e `toggleKeySyncOptIn`.
  - `app/sync.tsx` — `handleToggleKeySyncOptIn` delegado para `toggleKeySyncOptIn` exibindo `appAlert` com o aviso de relays e troca de chave no provedor ao desligar.
  - `src/modules/strongGroup/__tests__/keySyncDisable.test.ts` — 7 testes cobrindo o ciclo completo (ligar -> publicar -> desligar -> aviso -> bloqueio de publicação/recebimento -> preservação do `SecureStore`), falha de escrita, web no-op, idempotência, religamento e `toggleKeySyncOptIn`.
- **Review breakdown:** 4 itens corrigidos por patch (1 `medium` + 1 duplicado `medium`, 3 `low`), 4 rejeitados (`low`), 1 falso/duplicado.
- **Follow-up review recommendation:** `false` (apenas 1 entrada `medium` corrigida por patch).
- **Verification:** `eslint` (0 erros), `tsc --noEmit` (0 erros) e `vitest run --maxWorkers=2` (139 arquivos, 3094 testes passando).
