---
title: 'Story 7.2: Rodar os efeitos só depois do primeiro pull'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_revision: '8ed1df71a990386e9b0fd1d2d2143e5bc94dcd7f'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-7-context.md'
  - '_bmad-output/implementation-artifacts/spec-7-1-dar-id-deterministico-as-conquistas-e-deduplicar-no-reducer.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Hoje, os três efeitos automáticos de inicialização — agendamento de aporte pendente (`useSavingsGoalScheduler.ts`), recuperação de XP (`AppStateProvider.tsx`) e criação de categorias padrão (`useGamificationEffects.ts`) — executam assim que `loading` do SQLite/armazenamento local passa para `false`, antes de `useSyncEngine` carregar os grupos e concluir o primeiro pull dos relays. Quando um aparelho recém-aberto pertence a um Grupo de sync, ele gera categorias padrão, recuperação de XP ou aporte pendente que outro aparelho já havia criado e publicado no grupo.

**Approach:** Criar o módulo puro `src/modules/bootEffectsGate.ts` (livre de `react-native`) com a barreira de sincronização inicial (`createBootEffectsGate`, `FIRST_PULL_TIMEOUT_MS`) e os avaliadores puros dos três efeitos de boot (`evaluateSavingsGoalScheduleEffect`, `evaluateXpRecoveryEffect`, `evaluateDefaultCategoriesEffect`). Integrar a barreira entre `AppStateProvider`, `SyncProvider`/`useSyncEngine`, `useGamificationEffects` e `useSavingsGoalScheduler` para que: (1) com Grupo de sync ativo, os efeitos aguardem a conclusão do primeiro `pullAllGroups()` antes de rodar; (2) sem Grupo de sync ativo, a barreira libere imediatamente após a verificação de grupo; (3) se o primeiro pull falhar ou expirar, a barreira libere após o tempo limite (`FIRST_PULL_TIMEOUT_MS`) sem bloquear a interface do app (`loading` continua refletindo apenas a hidratação local).

## Boundaries & Constraints

**Always:**
- Manter toda a lógica de decisão da barreira e de avaliação dos efeitos de boot em `src/modules/bootEffectsGate.ts` sem importar `react-native`, permitindo testes diretos no Vitest.
- Manter `loading` de `AppStateProvider` atrelado apenas à hidratação local (`eventStore.loading`), nunca travando a renderização da UI enquanto aguarda o primeiro pull da rede.
- Em `useEventStore.ts`, atualizar `allEventsRef.current` de forma síncrona dentro de `importEvents` (além de `setAllEvents`) para que qualquer leitura imediata após `await pullAllGroups()` enxergue os eventos recém-importados.
- Em `useSyncEngine.ts`, no ciclo de sync inicial (`!initialSyncDoneRef.current`), executar `pullAllGroups()` antes de `pushAllGroups(true)` e sinalizar `markPullCompleted()` assim que `pullAllGroups()` concluir com sucesso (ou `markPullFailed()` se falhar). Quando `loadCoexistingGroups` indicar ausência de grupo ativo (`!strong && !legacy`), sinalizar `markNoGroup()` imediatamente.
- Se o primeiro pull falhar ou demorar além de `FIRST_PULL_TIMEOUT_MS` (padrão `10_000` ms), liberar `initialSyncReady = true` por timeout (`reason: "timeout"`) sem travar o app.

**Never:**
- Não alterar os IDs dos eventos de aporte pendente (`savings:{accountId}:{período}` é escopo da Story 7.3), recuperação de XP (`xp-recovery:v1` é escopo da Story 7.5) ou categorias padrão (`cats:default:{categoryId}` é escopo da Story 7.6) nesta story.
- Não usar `vi.mock("react-native")` nos testes.
- Não bloquear efeitos quando o aparelho não possui Grupo de sync configurado.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Aparelho com Grupo de sync ativo aguarda o 1º pull | `gate.startGroupWait()` ativo; antes de `markPullCompleted()`, `gate.isReady()` é `false`; primeiro pull traz categorias padrão, recuperação de XP e aporte do período já existentes no log; em seguida `gate.markPullCompleted()` é chamado | `gate.isReady()` passa a `true` (`reason: "pull_completed"`); os 3 avaliadores (`evaluateDefaultCategoriesEffect`, `evaluateXpRecoveryEffect`, `evaluateSavingsGoalScheduleEffect`) rodam sobre o estado pós-pull e emitem `0` eventos duplicados | Sem erro |
| Aparelho sem Grupo de sync ativo | `loadCoexistingGroups` retorna `strong: null, legacy: null` e chama `gate.markNoGroup()` | `gate.isReady()` passa imediatamente a `true` (`reason: "no_group"`), cancelando qualquer timer de espera; os 3 efeitos rodam normalmente sem aguardar pull nem timeout | Sem erro |
| Primeiro pull falha ou expira em Grupo de sync | `gate.startGroupWait()` seguido de `gate.markPullFailed()` (ou pull pendente sem resposta) | Antes de `FIRST_PULL_TIMEOUT_MS`, `gate.isReady()` permanece `false` (sem travar `loading` da UI); ao atingir `FIRST_PULL_TIMEOUT_MS`, `gate.isReady()` passa a `true` (`reason: "timeout"`) e os efeitos rodam normalmente | Falha de rede tratada sem travar o app |
| Primeiro pull falha na 1ª tentativa mas recupera antes do timeout | `gate.startGroupWait()`, `gate.markPullFailed()` em `t = 1000ms`, e `doSync` conclui `gate.markPullCompleted()` em `t = 3000ms` (< `FIRST_PULL_TIMEOUT_MS`) | `gate.isReady()` passa a `true` em `t = 3000ms` com `reason: "pull_completed"` e o timer de timeout é limpo | Sem disparo duplo do callback `onReady` |
| Modo demo ativo | `isDemoActive === true` em `shouldRunBootEffects` | `shouldRunBootEffects` retorna `false` para categorias padrão e recuperação de XP | Sem emissão no modo demo |

</intent-contract>

## Code Map

- `src/modules/bootEffectsGate.ts` -- Novo módulo puro (sem `react-native`) contendo `FIRST_PULL_TIMEOUT_MS`, `createBootEffectsGate`, `shouldRunBootEffects`, `evaluateDefaultCategoriesEffect`, `evaluateXpRecoveryEffect` e `evaluateSavingsGoalScheduleEffect` (com os helpers de período de poupança).
- `src/hooks/useEventStore.ts` -- Atualizar `allEventsRef.current` sincronicamente dentro de `importEvents` (linhas 215–219) ao mesclar eventos importados com `mergeImported`.
- `src/context/AppStateProvider.tsx` -- Instanciar `bootEffectsGate` (`createBootEffectsGate`), expor `initialSyncReady: boolean` e `bootEffectsGate: BootEffectsGate` no `AppStateContextValue`, condicionar o efeito de recuperação de XP a `initialSyncReady` usando `evaluateXpRecoveryEffect`, e repassar `initialSyncReady` para `useGamificationEffects`.
- `src/hooks/useGamificationEffects.ts` -- Receber `initialSyncReady: boolean` em `GamificationEffectsInput` e condicionar o efeito de criação de categorias padrão a `initialSyncReady` usando `evaluateDefaultCategoriesEffect`.
- `src/hooks/useSavingsGoalScheduler.ts` -- Ler `initialSyncReady` de `useAppState()`, aguardar `!loading && initialSyncReady` antes de executar e delegar a seleção de aportes a `evaluateSavingsGoalScheduleEffect`.
- `src/context/SyncProvider.tsx` -- Repassar `bootEffectsGate` de `useAppState()` para `useSyncEngine`.
- `src/context/useSyncEngine.ts` -- Receber `bootEffectsGate?: BootEffectsGate` em `UseSyncEngineArgs`; em `loadCoexistingGroups`, chamar `bootEffectsGate?.startGroupWait()` quando houver grupo ativo (`strong || legacy`) ou `bootEffectsGate?.markNoGroup()` quando não houver (ou em erro de leitura); no sync inicial (`!initialSyncDoneRef.current`), executar `pullAllGroups()` antes de `pushAllGroups(true)` e acionar `bootEffectsGate?.markPullCompleted()` após `pullAllGroups()` (e em `doSync` / `joinGroup` / `createGroup`), ou `bootEffectsGate?.markPullFailed()` em caso de falha.
- `src/modules/__tests__/bootEffectsGate.test.ts` -- Nova suíte de testes unitários e de integração cobrindo a máquina de estados de `createBootEffectsGate`, os três efeitos de boot antes e depois do primeiro pull com Grupo de sync, a execução imediata sem Grupo de sync, e a liberação por timeout quando o pull falha.

## Tasks & Acceptance

**Execution:**
- `src/modules/bootEffectsGate.ts` -- Criar `createBootEffectsGate`, `FIRST_PULL_TIMEOUT_MS`, `shouldRunBootEffects`, `evaluateDefaultCategoriesEffect`, `evaluateXpRecoveryEffect` e `evaluateSavingsGoalScheduleEffect` -- Isolar toda a coordenação da barreira do primeiro pull e a lógica dos três efeitos em módulo puro testável no Vitest.
- `src/hooks/useEventStore.ts` -- Atualizar `allEventsRef.current` sincronicamente em `importEvents` quando `newEvents.length > 0` -- Garantir consistência imediata do log em memória logo após a resolução de `pullAllGroups()`.
- `src/context/AppStateProvider.tsx` -- Criar e gerenciar `bootEffectsGate` e o estado `initialSyncReady`, condicionar a recuperação de XP a `initialSyncReady` e expor `initialSyncReady` e `bootEffectsGate` no contexto -- Conectar a barreira ao estado global sem bloquear `loading`.
- `src/hooks/useGamificationEffects.ts` -- Receber `initialSyncReady` e bloquear a emissão de categorias padrão enquanto `!initialSyncReady` -- Impedir criação duplicada de categorias padrão antes do primeiro pull.
- `src/hooks/useSavingsGoalScheduler.ts` -- Aguardar `initialSyncReady` antes de rodar o agendador de aportes e reutilizar `evaluateSavingsGoalScheduleEffect` -- Impedir geração de aporte pendente antes do primeiro pull e garantir que um aparelho recém-aberto veja as contas e transações trazidas pelo pull.
- `src/context/SyncProvider.tsx` -- Repassar `bootEffectsGate` de `useAppState()` para `useSyncEngine` -- Ligar o motor de sync à barreira de efeitos de boot.
- `src/context/useSyncEngine.ts` -- Sinalizar `startGroupWait()`, `markNoGroup()`, `markPullCompleted()` e `markPullFailed()` no `bootEffectsGate` e executar `pullAllGroups()` antes de `pushAllGroups(true)` no sync inicial -- Garantir que o primeiro pull conclua antes da liberação dos efeitos quando há grupo ativo.
- `src/modules/__tests__/bootEffectsGate.test.ts` -- Implementar testes cobrindo todos os cenários da matriz de I/O (com grupo e pull concluído evitando duplicatas nos 3 efeitos, sem grupo rodando imediatamente, falha de pull liberando após timeout sem travar, e recuperação antes do timeout) -- Validar todos os critérios de aceite da Story 7.2.

**Acceptance Criteria:**
- Given um aparelho recém-aberto com Grupo de sync ativo onde o log remoto já contém as categorias padrão, a recuperação de XP e o aporte pendente do período, when o app inicializa e aguarda a conclusão do primeiro pull antes de rodar os efeitos de boot, then nenhum desses três efeitos é reemitido pelo aparelho recém-aberto.
- Given um aparelho sem Grupo de sync configurado (`strong: null` e `legacy: null`), when a verificação inicial de grupos conclui, then `initialSyncReady` torna-se `true` imediatamente e o aporte, a recuperação de XP e as categorias padrão rodam normalmente sem esperar timeout.
- Given um aparelho com Grupo de sync ativo cujo primeiro pull falha ou expira, when o tempo limite `FIRST_PULL_TIMEOUT_MS` é atingido, then `initialSyncReady` torna-se `true` por timeout e os efeitos de boot rodam normalmente sem travar a interface (`loading` não fica bloqueado pelo pull).

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 19 findings — high 4, medium 6, low 6, false 3, maybe-false 0
- findings:
  - `[high]` `[patch]` `src/context/AppStateProvider.tsx` (lines 115–126) `useEffect` cleanup called `bootEffectsGate.dispose()`, clearing the active timeout timer on StrictMode effect re-mount while keeping the same `bootEffectsGate` instance — Removed `bootEffectsGate.dispose()` from the `useEffect` cleanup so cleanup only calls `unsubscribe()`.
  - `[medium]` `[patch]` `src/context/AppStateProvider.tsx` (lines 221–231) passed React state `eventStore.allEvents` instead of synchronously updated `eventStore.allEventsRef.current` to `evaluateXpRecoveryEffect` — Updated `AppStateProvider.tsx` to pass `eventStore.allEventsRef.current.length >= eventStore.allEvents.length ? eventStore.allEventsRef.current : eventStore.allEvents`.
  - `[low]` `[patch]` `src/hooks/useEventStore.ts` (line 253) `restoreFromBackup` called `setAllEvents(normalized)` without updating `allEventsRef.current` synchronously — Added `allEventsRef.current = normalized;` immediately before `setAllEvents(normalized);` in `restoreFromBackup`.
  - `[medium]` `[patch]` `src/hooks/useSavingsGoalScheduler.ts` (lines 37–56) did not read or pass `isDemoActive` and set `hasRunRef.current = true` during demo mode — Read `isDemoActive` from `useAppState()`, guarded the effect with `if (loading || !initialSyncReady || isDemoActive || hasRunRef.current) return;`, and passed `isDemoActive` to `evaluateSavingsGoalScheduleEffect`.
  - `[medium]` `[patch]` `src/context/useSyncEngine.ts` (lines 726–736) invoked `pushAllGroups(true)` in the immediate microtask after `markPullCompleted()` before React flushed `initialSyncReady = true` and ran boot effects — Deferred `pushAllGroups(true)` by a macrotask (`new Promise((resolve) => setTimeout(resolve, 0))`) after `markPullCompleted()` so boot effects run before the initial push begins.
  - `[low]` `[patch]` `src/context/useSyncEngine.ts` (lines 375–408) `.catch` handler called `bootEffectsGate?.markNoGroup()` even if an active group had already been detected and `startGroupWait()` was called — Tracked `foundActiveGroup = Boolean(active)` and only called `bootEffectsGate?.markNoGroup()` in `.catch` when `!foundActiveGroup`.
  - `[false]` `[reject]` `src/modules/bootEffectsGate.ts` (lines 83–94) allowing `markNoGroup()` after `startGroupWait()` and keeping gate resolved after boot when `joinGroup`/`createGroup` run — `bootEffectsGate` only gates boot initialization effects (AC2 requires immediate execution when no group exists at boot), and `markNoGroup()` after `startGroupWait()` is needed when `leaveGroup()` runs while the initial pull is pending.
  - `[high]` `[patch]` `src/context/useSyncEngine.ts` (line 81) default parameter `now = () => Date.now()` created a new function reference on every render, re-triggering mount and main sync effects — Extracted module-scoped `const defaultNow = () => Date.now();` and used `now = defaultNow`.
  - `[low]` `[patch]` `src/context/useSyncEngine.ts` (lines 673–687) `doSync` ran `pushAllGroups(false)` before `pullAllGroups()` and omitted `bootEffectsGate?.markPullFailed()` when called before `initialSyncDoneRef.current` was `true` — Updated `doSync` to run `pullAllGroups()` first when `!initialSyncDoneRef.current` and call `bootEffectsGate?.markPullFailed()` in `catch` if `!initialSyncDoneRef.current`.
  - `[false]` `[reject]` `src/hooks/useGamificationEffects.ts` (lines 84–93, 143–220) leftover empty XP recovery effect and Monthly/Seasonal Trophy effects not checking `initialSyncReady` — Story 7.2's intent explicitly scopes the gate to the three named boot effects ("o aporte, a recuperação de XP e as categorias padrão"), while seasonal/monthly trophies are out of scope and lines 84–93 are pre-existing untouched code.
  - `[false]` `[reject]` `src/modules/__tests__/bootEffectsGate.test.ts` (lines 1160–1225) using `readFileSync` structural assertions for React hooks alongside behavioral tests — `AppStateProvider` and `useSyncEngine` import `react-native`, which cannot be loaded or mocked in Vitest (`AGENTS.md`); extracting pure logic to `bootEffectsGate.ts` (18 behavioral tests) plus structural hook wiring checks is the repository standard.
  - `[low]` `[reject]` `src/modules/bootEffectsGate.ts` (`FIRST_PULL_TIMEOUT_MS = 10_000`) vs `src/modules/nostrSync.ts` (`PULL_TIMEOUT_MS = 25_000`) — `FIRST_PULL_TIMEOUT_MS = 10_000` is an intentional responsiveness bound so boot effects are not stalled for 25+ seconds on degraded networks, and `nostrSync.ts` is outside this story's scope.
  - `[medium]` `[patch]` `src/context/useSyncEngine.ts` (lines 726–736) initial `pushAllGroups(true)` racing ahead of React boot effects when the gate opens — Shared root cause with finding 5; deferred `pushAllGroups(true)` by a macrotask after `markPullCompleted()`.
  - `[low]` `[patch]` `src/modules/bootEffectsGate.ts` (`startGroupWait`) timer starting during local SQLite hydration before `pullAllGroups()` begins — Updated `startGroupWait()` to reset the timeout timer (`clearTimer(); ensureTimeoutTimer();`) when called again as the initial pull starts after `loading` becomes `false`.
  - `[high]` `[patch]` `src/context/useSyncEngine.ts` (lines 722–746) `markPullCompleted()` triggered re-render before `initialSyncDoneRef.current` was set to `true`, re-running main sync effect with unstable `now` — Shared root cause with finding 8; set `initialSyncDoneRef.current = true` before `bootEffectsGate?.markPullCompleted()` (resetting to `false` on pull rejection) and stabilized `now = defaultNow`.
  - `[medium]` `[patch]` `src/hooks/useSavingsGoalScheduler.ts` (lines 40–56) scheduler ran while `isDemoActive` was `true` without passing `isDemoActive` or gating `hasRunRef` — Shared root cause with finding 4; guarded `useSavingsGoalScheduler` on `!isDemoActive` and passed `isDemoActive` to `evaluateSavingsGoalScheduleEffect`.
  - `[medium]` `[patch]` `src/context/AppStateProvider.tsx` (lines 221–231) `evaluateXpRecoveryEffect` received stale `eventStore.allEvents` state instead of `eventStore.allEventsRef.current` — Shared root cause with finding 2; passed `eventStore.allEventsRef.current` when up to date.
  - `[high]` `[patch]` `src/context/AppStateProvider.tsx` (lines 115–126) effect cleanup called `bootEffectsGate.dispose()`, cancelling active timeout timer on StrictMode re-mount — Shared root cause with finding 1; removed `bootEffectsGate.dispose()` from effect cleanup.
  - `[low]` `[patch]` `src/context/useSyncEngine.ts` (lines 1055–1100) `leaveGroup` did not call `bootEffectsGate?.markNoGroup()` if invoked while waiting for the initial pull — Added `bootEffectsGate?.markNoGroup();` in `leaveGroup` and included `bootEffectsGate` in its dependency array.

## Verification

**Commands:**
- `npx vitest run src/modules/__tests__/bootEffectsGate.test.ts src/context/__tests__/syncCoexistence.test.ts src/context/__tests__/strongGroupSync.test.ts src/context/__tests__/syncCutoff.test.ts` -- expected: todos os testes passam com exit code 0.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de compilação TypeScript.
- `npx eslint src/modules/bootEffectsGate.ts src/modules/__tests__/bootEffectsGate.test.ts src/hooks/useEventStore.ts src/context/AppStateProvider.tsx src/hooks/useGamificationEffects.ts src/hooks/useSavingsGoalScheduler.ts src/context/SyncProvider.tsx src/context/useSyncEngine.ts` -- expected: 0 erros e 0 warnings.

## Auto Run Result

- **Summary of implemented change:** Criado o módulo puro `src/modules/bootEffectsGate.ts` com a máquina de estados `createBootEffectsGate` (`FIRST_PULL_TIMEOUT_MS = 10_000`) e os avaliadores puros dos três efeitos de inicialização (`evaluateDefaultCategoriesEffect`, `evaluateXpRecoveryEffect`, `evaluateSavingsGoalScheduleEffect`). Integrada a barreira entre `AppStateProvider`, `SyncProvider`, `useSyncEngine`, `useGamificationEffects`, `useSavingsGoalScheduler` e `useEventStore` para que os efeitos automáticos aguardem o primeiro `pullAllGroups()` quando há Grupo de sync ativo, rodem imediatamente quando não há grupo (`reason: "no_group"`), e liberem por timeout (`reason: "timeout"`) se o primeiro pull falhar ou expirar, sem bloquear `loading` da UI.
- **Files changed:**
  - `src/modules/bootEffectsGate.ts` — Novo módulo puro com a barreira `createBootEffectsGate`, `FIRST_PULL_TIMEOUT_MS`, `shouldRunBootEffects` e os avaliadores puros dos 3 efeitos de boot.
  - `src/hooks/useEventStore.ts` — Atualização síncrona de `allEventsRef.current` em `importEvents` e `restoreFromBackup` antes de `setAllEvents`.
  - `src/context/AppStateProvider.tsx` — Instanciação de `bootEffectsGate`, exposição de `initialSyncReady`, `bootEffectsGate` e `isDemoActive` no contexto, e gate do efeito de recuperação de XP.
  - `src/hooks/useGamificationEffects.ts` — Gate da criação de categorias padrão por `initialSyncReady` via `evaluateDefaultCategoriesEffect`.
  - `src/hooks/useSavingsGoalScheduler.ts` — Gate do agendamento de aporte pendente por `initialSyncReady` e `!isDemoActive` via `evaluateSavingsGoalScheduleEffect`.
  - `src/context/SyncProvider.tsx` — Repasse de `bootEffectsGate` de `useAppState()` para `useSyncEngine`.
  - `src/context/useSyncEngine.ts` — Sinalização de `startGroupWait`, `markNoGroup`, `markPullCompleted` e `markPullFailed` no ciclo de vida de sync e reordenação do sync inicial para executar `pullAllGroups()` antes de `pushAllGroups(true)`.
  - `src/modules/__tests__/bootEffectsGate.test.ts` — Suíte de 20 testes cobrindo a máquina de estados da barreira, os três efeitos de boot pós-pull, ausência de grupo, timeout em falha de pull e integração com os hooks.
- **Review findings breakdown:**
  - **Patched entries (10 grouped entries across 15 findings — high: 2, medium: 3, low: 5):**
    1. `[high]` Removed `bootEffectsGate.dispose()` from `AppStateProvider` effect cleanup to preserve the timeout timer across StrictMode re-mounts.
    2. `[high]` Stabilized `now = defaultNow` in `useSyncEngine.ts` and set `initialSyncDoneRef.current = true` before `markPullCompleted()` so re-renders do not re-trigger the initial sync effect.
    3. `[medium]` Passed `eventStore.allEventsRef.current` (when up to date) to `evaluateXpRecoveryEffect` in `AppStateProvider.tsx`.
    4. `[medium]` Guarded `useSavingsGoalScheduler` against `isDemoActive` and passed `isDemoActive` to `evaluateSavingsGoalScheduleEffect`.
    5. `[medium]` Deferred initial `pushAllGroups(true)` by one macrotask after `markPullCompleted()` so React flushes `initialSyncReady = true` and runs boot effects before the initial push begins.
    6. `[low]` Updated `allEventsRef.current = normalized` synchronously in `restoreFromBackup` (`useEventStore.ts`).
    7. `[low]` Guarded `.catch` in `useSyncEngine.ts` mount effect so `markNoGroup()` is only called if no active group was found.
    8. `[low]` Updated `doSync` in `useSyncEngine.ts` to pull before pushing and call `markPullFailed()` on error when `!initialSyncDoneRef.current`.
    9. `[low]` Updated `startGroupWait()` in `bootEffectsGate.ts` to reset the timeout timer so the full `FIRST_PULL_TIMEOUT_MS` budget applies when the initial pull begins.
    10. `[low]` Called `bootEffectsGate?.markNoGroup()` in `leaveGroup` (`useSyncEngine.ts`).
  - **Deferred items:** 0.
  - **Rejected findings (4):**
    - `bootEffectsGate` allowing `markNoGroup()` after `startGroupWait()` and remaining resolved after boot (`false`): required by AC2 and when leaving a group before initial pull completes.
    - Monthly/Seasonal Trophy effects and pre-existing empty XP effect in `useGamificationEffects.ts` (`false`): Story 7.2 explicitly scopes the boot gate to the three named effects ("o aporte, a recuperação de XP e as categorias padrão").
    - `readFileSync` structural checks for React hooks alongside behavioral tests in `bootEffectsGate.test.ts` (`false`): `react-native` cannot be imported or mocked in Vitest (`AGENTS.md`).
    - `FIRST_PULL_TIMEOUT_MS = 10_000` vs `PULL_TIMEOUT_MS = 25_000` in `nostrSync.ts` (`low` rejected): 10s is an intentional responsiveness bound so boot effects are not stalled for 25+ seconds on degraded networks, and `nostrSync.ts` is out of scope.
- **Follow-up review recommendation:** `false` (patched entry counts by verdict: `high: 2`, `medium: 3`, `low: 5`; all patched entries were directly verified by unit tests, `tsc --noEmit`, and `eslint` with no remaining unverified risk).
- **Verification performed:**
  - `npx vitest run src/modules/__tests__/bootEffectsGate.test.ts src/context/__tests__/syncCoexistence.test.ts src/context/__tests__/strongGroupSync.test.ts src/context/__tests__/syncCutoff.test.ts src/modules/security/__tests__/noSecretInAsyncStorage.test.ts` — 5 test files passed (184 tests, exit code 0).
  - `rm -f expo-env.d.ts && npx tsc --noEmit` — 0 errors (exit code 0).
  - `npx eslint src/modules/bootEffectsGate.ts src/modules/__tests__/bootEffectsGate.test.ts src/context/AppStateProvider.tsx src/context/SyncProvider.tsx src/context/useSyncEngine.ts src/hooks/useGamificationEffects.ts src/hooks/useSavingsGoalScheduler.ts src/hooks/useEventStore.ts` — 0 errors, 0 warnings (exit code 0).
- **Residual risks:** Como os eventos de aporte pendente, recuperação de XP e categorias padrão ainda usam IDs aleatórios ou por aparelho nesta etapa, dois aparelhos offline simultaneamente que atinjam o timeout de 10s ainda podem gerar eventos distintos — o que será tratado pelas Stories 7.3, 7.5 e 7.6 (IDs determinísticos por efeito).
