---
title: 'Story 6.3: Tirar a queda silenciosa do SecureStore para o AsyncStorage'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_revision: 'a0f3f28a11c02e520dde28b29cbd84ed7b47dea9'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-6-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Quando a gravação no `SecureStore` falha no ambiente nativo, a função `saveGroupCode` em `src/context/syncStorage.ts` atualmente faz uma queda permissiva para salvar o código de pareamento (`domus_nostr_group_code`) em texto puro no `AsyncStorage`, violando a garantia de que segredos nunca devem residir em texto puro desprotegido (FR-23, NFR-1).

**Approach:** Eliminar a queda para o `AsyncStorage`. Em caso de falha do `SecureStore`, reter o código de grupo exclusivamente em memória volátil durante a sessão atual para que o sincronismo continue operando normalmente sem interrupções, e notificar o usuário uma única vez via `appAlert` (em pt-BR), explicando que o armazenamento seguro falhou e que o pareamento poderá ser solicitado novamente quando o app for reaberto.

## Boundaries & Constraints

**Always:**
- Em caso de falha no `SecureStore`, o código de grupo deve ser mantido em memória volátil na sessão atual (`inMemoryGroupCode`).
- `loadGroupCode()` deve retornar o código mantido em memória quando o `SecureStore` falhar ou estiver indisponível.
- O `AsyncStorage` NUNCA deve receber o código de grupo em texto puro quando o `SecureStore` falhar (`GROUP_CODE_KEY` não deve ser gravado em `AsyncStorage`).
- O usuário deve ser notificado uma única vez por sessão usando `appAlert` (`src/services/appAlert.ts`), com texto em português claro explicando a situação e que o pareamento pode ser solicitado na próxima abertura.
- `clearGroupCode()` deve limpar o código de todos os armazenamentos e também a variável em memória.
- Prover função auxiliar ou mecanismo para redefinir o estado de alerta e cache em memória para permitir testes unitários idempotentes.

**Never:**
- Nunca gravar o código de grupo em `AsyncStorage` sob nenhuma circunstância de erro do `SecureStore`.
- Nunca interromper o sincronismo da sessão atual se o código foi fornecido pelo usuário ou parceiro.
- Nunca usar alertas nativos do sistema (`Alert.alert`, `window.alert`); usar exclusivamente `appAlert`.
- Nunca alterar `packages/sync` nem código nativo em `android/` ou `ios/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Gravação bem-sucedida no nativo | `saveGroupCode("ABC234")` com SecureStore operacional | Gravado em SecureStore; removido resíduo de AsyncStorage; guardado em memória | Sucesso normal |
| Falha do SecureStore na gravação | `saveGroupCode("ABC234")` com SecureStore lançando erro | NÃO grava em AsyncStorage; guarda `"ABC234"` em memória; exibe `appAlert` explicativo | Notifica usuário uma vez em pt-BR sem crashar |
| Múltiplas falhas na mesma sessão | Segundo `saveGroupCode("DEF567")` falha no SecureStore | Atualiza memória com `"DEF567"`; NÃO chama `appAlert` novamente na mesma sessão | Notificação única por sessão |
| Leitura com SecureStore falhando | `loadGroupCode()` com SecureStore inacessível e código em memória | Retorna o código da memória volátil; app continua sincronizando normalmente | Permite sync sem perda na sessão |
| Limpeza do código | `clearGroupCode()` | Limpa SecureStore, remove de AsyncStorage e zera código da memória volátil | Remoção completa e idempotente |
| Plataforma Web | `isWeb() === true` | Delega para `webSecrets` (AES-GCM); mantém em memória | Cifragem segura ou memória |

</intent-contract>

## Code Map

- `src/context/syncStorage.ts`:
  - Estado de sessão: `let inMemoryGroupCode: string | null = null;` e `let hasWarnedSecureStorageFailure = false;`.
  - Exportar helper de teste: `_resetGroupCodeMemoryState()`.
  - `saveGroupCode(code: string)`:
    - Armazena em `inMemoryGroupCode`.
    - Se nativo: tenta `SecureStore.setItemAsync(GROUP_CODE_KEY, code)`. Se falhar, loga `console.warn`, NÃO grava em `AsyncStorage`, e dispara `appAlert` uma vez se `!hasWarnedSecureStorageFailure`.
  - `loadGroupCode()`:
    - Tenta ler do `SecureStore` (ou `webSecrets` na web). Se obtiver o valor, atualiza `inMemoryGroupCode` e retorna.
    - Se falhar ou vier nulo, retorna `inMemoryGroupCode` (ou fallback de migração legada se houver).
  - `clearGroupCode()`:
    - Limpa `inMemoryGroupCode = null`, remove de `SecureStore` e `AsyncStorage`.
- `src/context/__tests__/syncStorage.test.ts`:
  - Atualizar teste de falha do `SecureStore` para verificar:
    1. `AsyncStorage` NÃO recebe o código de grupo.
    2. `loadGroupCode()` retorna o código a partir da memória volátil.
    3. `appAlert` é chamado exatamente uma vez com o texto explicativo.
    4. Chamadas subsequentes de gravação não duplicam o alerta.

## Tasks & Acceptance

**Execution:**
- `src/context/syncStorage.ts` -- Eliminar queda para `AsyncStorage` em `saveGroupCode`, guardar em memória volátil e notificar via `appAlert` uma única vez.
- `src/context/__tests__/syncStorage.test.ts` -- Atualizar suíte de testes de `syncStorage` para cobrir o novo comportamento sem queda para texto puro.

**Acceptance Criteria:**
- Given `saveGroupCode` cai para `AsyncStorage` com um `console.warn` se o `SecureStore` falhar
- When troco essa queda por: não gravar em texto puro, manter o segredo em memória e avisar o usuário uma vez, em pt-BR
- Then com o `SecureStore` falhando, `AsyncStorage` não recebe o código do grupo
- And o app continua sincronizando na sessão atual
- And o aviso explica que o pareamento pode ser pedido de novo ao reabrir
- And esta troca de comportamento atende FR-23 e NFR-1.

## Spec Change Log

*(Vazio - primeira versão da especificação)*

## Review Triage Log

- **Subagents executados na iteração 1:**
  - Intent Alignment Auditor (`c0917a59-ee7f-4862-b0e9-3740e42d969b`): Aprovado sem ressalvas estruturais; atende integralmente FR-23 e NFR-1.
  - Blind Hunter Reviewer (`1b328117-5d44-4a78-a5a0-78110a32001f`): Apontou que `AsyncStorage.removeItem` não deve rodar na Web para evitar apagar o ciphertext de `webSecrets`. Implementado `if (!isWeb())`.
  - Edge Case Hunter Reviewer (`947806ed-78ae-4c2f-9609-5a80b4cdd047`): Recomendou precedência estrita de `inMemoryGroupCode` sobre valores legados em `AsyncStorage` caso `saveGroupCode` caia em falha de escrita. Implementado.
  - Verification Gap Reviewer (`c877956a-dd1a-48b9-8699-95a64e5b27da`): Recomendou testes para validação de string não-vazia e falhas no `webSecrets.set` (retorno falso e exceção). Implementados 29 testes abrangentes.
- **Triage:** Todas as recomendações foram integradas e verificadas no código e na suíte de testes.

## Auto Run Result

- `rm -f expo-env.d.ts && npx vitest run src/context/__tests__/syncStorage.test.ts`: 29/29 testes aprovados (100%).
- `rm -f expo-env.d.ts && npx vitest run src/context/__tests__/`: 16 arquivos de teste (357 testes) aprovados (100%).
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros.
- `npx eslint src/context/syncStorage.ts src/context/__tests__/syncStorage.test.ts`: 0 erros, 0 avisos.
- `rm -f expo-env.d.ts && npx vitest run src/services/__tests__/noNativeAlert.test.ts`: 42/42 aprovados.

## Design Notes

Texto do aviso:
```ts
appAlert(
  "Armazenamento seguro indisponível",
  "O código de pareamento foi mantido apenas na memória desta sessão porque o armazenamento protegido do aparelho falhou. O sincronismo continua funcionando agora, mas o pareamento pode ser solicitado novamente ao reabrir o aplicativo."
);
```

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx vitest run src/context/__tests__/syncStorage.test.ts` -- expected: Suíte de testes 100% aprovada.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros no TypeScript.
- `npx eslint src/context/syncStorage.ts src/context/__tests__/syncStorage.test.ts` -- expected: 0 erros e 0 avisos.
- `rm -f expo-env.d.ts && npx vitest run src/services/__tests__/noNativeAlert.test.ts` -- expected: 42/42 aprovados.
