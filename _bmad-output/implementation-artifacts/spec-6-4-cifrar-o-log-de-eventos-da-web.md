---
title: 'Story 6.4: Cifrar o log de eventos da web'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_revision: '18e4c6188332258c0b785083d4106da1e1b9c3b2'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-6-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Na plataforma web (onde não há SQLite nativo), o hook `useEventStore` grava o log inteiro de eventos financeiros em texto puro no `AsyncStorage` (`domus_events_v1`) a cada alteração de `allEvents`. Isso expõe o histórico financeiro completo a qualquer leitura do armazenamento local do navegador e regrava o log inteiro a cada evento individual sem agrupamento (FR-18).

**Approach:** Criar o módulo dedicado `src/context/webEventLogStorage.ts` (puro, sem `react-native`, testável no Vitest) que lê e grava `domus_events_v1` exclusivamente através de `webSecrets` (AES-GCM 256 bits com chave não extraível no IndexedDB), com gravação agrupada (debounce/coalescência assíncrona) para não cifrar a cada evento isolado, migração automática de logs legados em texto puro na primeira abertura sem perda de eventos, otimização da codificação Base64 em `webSecretStore.ts` para não travar a interface com 5.000 eventos, e aviso único por sessão via `appAlert` (em pt-BR) sem gravar texto puro caso WebCrypto ou IndexedDB não estejam disponíveis.

## Boundaries & Constraints

**Always:**
- Ler e gravar `domus_events_v1` na web passando por `webSecrets` (AES-GCM).
- Agrupar gravações consecutivas (debounce + coalescência de escrita em voo) para que rajadas de eventos resultem em uma única serialização e cifragem do estado mais recente.
- Migrar automaticamente qualquer log pré-existente em texto puro em `AsyncStorage` (`domus_events_v1` sem prefixo `v1:`) para a forma cifrada na primeira leitura, sem perder nenhum evento.
- Se WebCrypto ou IndexedDB estiverem indisponíveis (`webSecrets.set` retornar `false` ou lançar erro), NUNCA manter nem gravar o log em texto puro no `AsyncStorage`, reter os eventos em memória na sessão atual e avisar o usuário uma única vez por sessão via `appAlert` em pt-BR explicando que os dados não serão guardados neste navegador.
- Otimizar a conversão binária/Base64 em `webSecretStore.ts` em blocos (`0x8000` bytes) e ceder o turno do event loop antes de cifrar para que um log com 5.000 eventos seja cifrado/decifrado sem travar a interface.
- Em `restoreFromBackup` (incluindo `resetApp`), cancelar qualquer gravação agrupada pendente anterior e persistir imediatamente a lista restaurada via `webSecrets`.

**Never:**
- Nunca gravar `domus_events_v1` em texto puro no `AsyncStorage`.
- Nunca usar `Alert.alert` ou `window.alert` (usar exclusivamente `appAlert`).
- Nunca importar `react-native` em `webEventLogStorage.ts` nem manter `Platform.OS` em `useEventStore.ts` (usar `process.env.EXPO_OS === "web"`).
- Nunca alterar `packages/sync`, `ios/` ou `android/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Gravação agrupada em rajada | 20 chamadas seguidas a `scheduleWebEventLogSave` em < 250ms | Apenas 1 chamada a `webSecrets.set` com o snapshot final; `AsyncStorage` contém `v1:...` | Coalescência sem perda |
| Migração de log legado em texto puro | `AsyncStorage` contém JSON `[{"id":"1",...}]` sem `v1:` | Na leitura (`loadWebEventLog`), devolve todos os eventos e regrava cifrado (`v1:...`) em `AsyncStorage` | Migração transparente |
| Sem WebCrypto ou IndexedDB ao gravar/migrar | `webSecrets.set` retorna `false` ou falha | `AsyncStorage` não contém texto puro (removido se existia); exibe `appAlert` em pt-BR uma vez na sessão; mantém dados em memória na sessão | Sem vazamento em texto puro |
| Restauração / Reset com debounce pendente | `scheduleWebEventLogSave` pendente seguido de `saveWebEventLogImmediate([])` | Debounce anterior é cancelado; estado final gravado é `[]` cifrado | Previne sobrescrita por timer antigo |
| Volume de 5.000 eventos | Log com 5.000 `SyncEvent`s | Cifra e decifra todos os 5.000 eventos preservando integridade sem travar a thread | Base64 em fatias de 32 KiB + escrita assíncrona |

</intent-contract>

## Code Map

- `src/modules/security/infrastructure/webSecretStore.ts`:
  - Otimizar `toBase64` em blocos de 32 KiB (`0x8000`) para evitar concatenação caractere a caractere em payloads grandes (5.000 eventos).
- `src/context/webEventLogStorage.ts`:
  - `EVENTS_BACKUP_KEY = "domus_events_v1"`
  - `WEB_STORAGE_UNAVAILABLE_TITLE` e `WEB_STORAGE_UNAVAILABLE_MESSAGE`
  - `createWebEventLogStorage(deps)` e funções padrão `loadWebEventLog`, `scheduleWebEventLogSave`, `saveWebEventLogImmediate`, `flushWebEventLogSave`, `_resetWebEventLogState`.
- `src/hooks/useEventStore.ts`:
  - Substituir `Platform.OS === "web"` por `isWeb()` (`process.env.EXPO_OS === "web"`).
  - Usar `loadWebEventLog()`, `scheduleWebEventLogSave(allEvents)` e `saveWebEventLogImmediate(sorted)`.
- `src/context/__tests__/webEventLogStorage.test.ts`:
  - Testes unitários cobrindo cifragem AES-GCM real, agrupamento (debounce/coalescência), migração de texto puro legado, ausência de WebCrypto/IndexedDB com aviso único via `appAlert`, cancelamento em `saveWebEventLogImmediate`, e benchmark funcional com 5.000 eventos.

## Tasks & Acceptance

**Execution:**
- `src/modules/security/infrastructure/webSecretStore.ts` -- Otimizar `toBase64` em blocos para logs de até 5.000 eventos.
- `src/context/webEventLogStorage.ts` -- Implementar armazenamento cifrado na web com `webSecrets`, gravação agrupada, migração de legado e alerta de indisponibilidade.
- `src/hooks/useEventStore.ts` -- Integrar `webEventLogStorage` na hidratação, atualização de `allEvents` e `restoreFromBackup`.
- `src/context/__tests__/webEventLogStorage.test.ts` -- Criar suíte completa de testes unitários e de volume (5.000 eventos).

**Acceptance Criteria:**
- Given na web o log inteiro é regravado em texto puro em `AsyncStorage` (`domus_events_v1`) a cada mudança
- When o log passa por `webSecrets` (AES-GCM) ao gravar e ao ler, com gravação agrupada para não cifrar a cada evento
- Then o armazenamento do navegador não contém o log em texto puro
- And um log já existente em texto puro é migrado para a forma cifrada na primeira abertura, sem perder eventos
- And sem WebCrypto ou IndexedDB o log não é gravado em texto puro, e o app avisa que os dados não serão guardados nesse navegador
- And a interface não trava durante a cifra de um log com 5.000 eventos.

## Spec Change Log

*(Vazio - primeira versão da especificação)*

## Review Triage Log

- **Subagents executados na iteração 1:**
  - Intent Alignment Auditor (`0678318e-fb37-4222-88c4-9eba9ed04400`): Aprovado; 100% alinhado com FR-18, AD-6 e `AGENTS.md`.
  - Blind Hunter Reviewer (`faa0a448-d7bc-42ad-95fc-06ac7ff5ef9b`): Apontou risco de condição de corrida pré-hidratação em `useEventStore.ts`, separação entre estado agendado (`scheduledEvents`) e estado pronto (`readyEvents`), precedência de `inMemoryFallback` sobre ciphertext antigo após falha, e guarda de geração (`generation`) em `reset()`. Todos corrigidos.
  - Edge Case Hunter Reviewer (`dd228f9f-308a-4f2c-a733-64462eb82b95`): Apontou regravação redundante na hidratação/restauração (`lastPersistedWebEventsRef` adicionado em `useEventStore.ts`), uso de `subarray` em `webSecretStore.ts` para evitar cópia de memória de 1,2 MB, e separação da fila do debounce. Todos corrigidos.
  - Verification Gap Reviewer (`7e623ef7-5c93-4812-ae88-f2cfc7921703`): Recomendou adicionar testes de coalescência em voo (`inFlightPromise`), auto-flush no `load()`, cessão de turno antes da cifra de 5.000 eventos, exceção em `secrets.set` sobre `v1:...` prévio e JSON legado não-array. Todos adicionados (16 testes em `webEventLogStorage.test.ts`).

## Auto Run Result

- `rm -f expo-env.d.ts && npx vitest run src/context/__tests__/webEventLogStorage.test.ts src/modules/security/__tests__/webSecretStore.test.ts src/services/__tests__/noNativeAlert.test.ts`: 69/69 testes aprovados (100%).
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros.
- `npx eslint src/context/webEventLogStorage.ts src/hooks/useEventStore.ts src/modules/security/infrastructure/webSecretStore.ts src/context/__tests__/webEventLogStorage.test.ts`: 0 erros, 0 avisos.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx vitest run src/context/__tests__/webEventLogStorage.test.ts src/modules/security/__tests__/webSecretStore.test.ts` -- expected: 100% dos testes aprovados.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros no TypeScript.
- `npx eslint src/context/webEventLogStorage.ts src/hooks/useEventStore.ts src/modules/security/infrastructure/webSecretStore.ts src/context/__tests__/webEventLogStorage.test.ts` -- expected: 0 erros e 0 avisos.
- `rm -f expo-env.d.ts && npx vitest run src/services/__tests__/noNativeAlert.test.ts` -- expected: 42/42 aprovados.
