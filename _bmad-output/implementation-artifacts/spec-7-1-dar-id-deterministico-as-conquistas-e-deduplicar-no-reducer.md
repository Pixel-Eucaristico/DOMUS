---
title: 'Story 7.1: Dar id determinístico às conquistas e deduplicar no reducer'
type: 'bugfix'
created: '2026-11-12'
status: 'done'
baseline_revision: 'a2385bcd7b9309fb0aec53c6596200881b82ccba'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-7-context.md'
warnings: []
deferred:
  - summary: >-
      Teste de integração em nível de hook React para useGamificationEffects (dispatchDomainEvent)
    evidence: |-
      useGamificationEffects importa SoundManager e dependências nativas de áudio/React sem harness de renderização de hooks no Vitest; a construção determinística do evento foi extraída e testada em createAchievementUnlockedEvent e a deduplicação está coberta em gamification.test.ts e replay.test.ts.
    location: >-
      src/hooks/useGamificationEffects.ts:398
    severity: low
---

<intent-contract>

## Intent

**Problem:** Hoje, `useGamificationEffects.ts` cria eventos `ACHIEVEMENT_UNLOCKED` com `id: generateId()` aleatório, e o caso `ACHIEVEMENT_UNLOCKED` em `gamificationReducer` (`packages/gamification/src/reducer.ts`) soma `xpReward`, adiciona entrada em `unlockedAchievements` e incrementa `completionCounts` sem verificar se `achievementId` já consta em `state.unlockedAchievements`. Quando dois aparelhos cruzam a mesma conquista offline (ou quando o histórico contém eventos antigos da mesma conquista com IDs aleatórios distintos), o usuário recebe a conquista e o XP em dobro.

**Approach:** Criar e exportar em `packages/gamification/src/achievements` os helpers puros `getAchievementEventId(achievementId)` (formato `ach:{achievementId}`) e `createAchievementUnlockedEvent(ach, deviceId, timestamp)`, utilizá-los na emissão de `ACHIEVEMENT_UNLOCKED` em `src/hooks/useGamificationEffects.ts` (e no gatilho de conquistas de `src/components/debug/DebugTools.tsx`), e deduplicar `ACHIEVEMENT_UNLOCKED` no `gamificationReducer` pela chave natural `achievementId` (`existingAchs.some(a => a.id === achievementId)`), garantindo uma única entrada e um único pagamento de XP tanto para IDs determinísticos iguais quanto para IDs legados diferentes.

## Boundaries & Constraints

**Always:**
- Manter `packages/gamification` 100% puro e livre de dependências de `react`, `react-native` ou `expo`.
- Derivação determinística do `id` do evento `ACHIEVEMENT_UNLOCKED` no formato `ach:{achievementId}` (sem incluir `deviceId` nem timestamp na semente do ID).
- No `gamificationReducer`, verificar se `state.unlockedAchievements` já possui `a.id === achievementId` antes de somar `xpReward`, atualizar `seasonXp`, alterar `level`, adicionar a `unlockedAchievements` ou incrementar `completionCounts[achievementId]`. Se já estiver desbloqueada, retornar `state` inalterado.
- Preservar compatibilidade total com eventos legados de `ACHIEVEMENT_UNLOCKED` já gravados com `id` aleatório: o primeiro evento por `achievementId` na ordem de replay concede a conquista e o XP; qualquer evento subsequente para o mesmo `achievementId` (com `id` igual ou diferente, mesmo após a janela de 1000 itens de `processedEventIds`) é ignorado sem erro e sem ir para a Quarentena.

**Never:**
- Não alterar o formato do envelope de `SyncEvent` nem os campos de `AchievementUnlockedPayload`.
- Não alterar nesta story a lógica de laço de parcelamento/recorrência (escopo da Story 7.7) nem a derivação de nível/streak sem eventos (escopo das Stories 7.8 e 7.9).
- Não usar mocks de `react-native` nos testes do Vitest.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Emissão de conquista nova | `createAchievementUnlockedEvent(ach, "dev-a", 1000)` para `ach.id = "first_transaction"` | Retorna evento `ACHIEVEMENT_UNLOCKED` com `id: "ach:first_transaction"`, `deviceId: "dev-a"`, `timestamp: 1000` e payload completo da conquista | Sem erro |
| Dois aparelhos cruzam a mesma conquista offline (IDs determinísticos iguais) | Aparelho A e Aparelho B geram `id: "ach:ten_transactions"` com `xpReward: 100` e sincronizam (`selectEventsToImport` + `mergeImported` + `replayAllEvents` ou `gamificationReducer` direto) | Uma única entrada `{ id: "ten_transactions" }` em `unlockedAchievements`, `totalXp` e `seasonXp` somam `+100` uma única vez, `completionCounts["ten_transactions"] === 1` | Sem erro; duplicata ignorada de forma idempotente |
| Eventos legados da mesma conquista com IDs aleatórios diferentes | Dois eventos `ACHIEVEMENT_UNLOCKED` com `id: "rnd-1"` e `id: "rnd-2"` (ou `"rnd-1"` + `"ach:ten_transactions"`) para o mesmo `achievementId: "ten_transactions"` | O primeiro desbloqueia e soma `xpReward`; o segundo retorna `state` inalterado (1 entrada em `unlockedAchievements`, 1 pagamento de XP, `completionCounts["ten_transactions"] === 1`) | Sem erro / no-op |
| Duplicata após rotação da janela `processedEventIds` (>1000 eventos) | Evento `ACHIEVEMENT_UNLOCKED` para `achievementId: "first_transaction"` seguido de 1005 eventos `XP_GAINED` e outro `ACHIEVEMENT_UNLOCKED` para `"first_transaction"` | `existingAchs.some(a => a.id === achievementId)` barra o segundo pagamento mesmo fora da janela de 1000 IDs de `processedEventIds` | Sem erro / no-op |
| Conquistas distintas em sequência | Eventos `ACHIEVEMENT_UNLOCKED` para `"first_transaction"` (`xpReward: 50`) e `"ten_transactions"` (`xpReward: 100`) | Ambas são adicionadas a `unlockedAchievements` e `totalXp` acumula `150` | Sem erro |

</intent-contract>

## Code Map

- `packages/gamification/src/achievements/achievementChecker.ts` -- Adicionar `ACHIEVEMENT_EVENT_ID_PREFIX = "ach:"`, `getAchievementEventId(achievementId: string): string` e `createAchievementUnlockedEvent(ach, deviceId, timestamp): AchievementUnlockedEvent`.
- `packages/gamification/src/achievements/index.ts` -- Re-exportar `ACHIEVEMENT_EVENT_ID_PREFIX`, `getAchievementEventId` e `createAchievementUnlockedEvent`.
- `packages/gamification/index.ts` -- Re-exportar `ACHIEVEMENT_EVENT_ID_PREFIX`, `getAchievementEventId` e `createAchievementUnlockedEvent` na API pública do pacote.
- `packages/gamification/src/reducer.ts` -- Em `gamificationReducer` (`case GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED`, linhas 89–110), verificar `if (existingAchs.some((a) => a.id === achievementId)) return state;` antes de somar `xpReward` e mutar listas/contadores.
- `src/hooks/useGamificationEffects.ts` -- Na checagem de conquistas dentro de `dispatchDomainEvent` (linhas 393–408), substituir a criação manual com `id: generateId()` por `createAchievementUnlockedEvent(ach, originDeviceId, Date.now())`.
- `src/components/debug/DebugTools.tsx` -- No botão de desbloqueio manual de troféu/conquista (linhas 505–540), quando `eventType === "ACHIEVEMENT_UNLOCKED"`, atribuir `id: getAchievementEventId(selectedTrophy.id)` ao evento despachado.
- `packages/gamification/__tests__/gamification.test.ts` -- Adicionar testes unitários cobrindo `getAchievementEventId`, `createAchievementUnlockedEvent`, deduplicação no `gamificationReducer` com mesmo `id` (`ach:{achievementId}`), com `id`s aleatórios diferentes, e após rotação de `processedEventIds`.
- `src/context/__tests__/replay.test.ts` -- Adicionar teste de integração de sync/replay entre dois aparelhos que desbloqueiam a mesma conquista offline (tanto com ID determinístico `ach:{achievementId}` quanto com IDs legados distintos).

## Tasks & Acceptance

**Execution:**
- `packages/gamification/src/achievements/achievementChecker.ts` -- Implementar `ACHIEVEMENT_EVENT_ID_PREFIX`, `getAchievementEventId` e `createAchievementUnlockedEvent` e exportar em `packages/gamification/src/achievements/index.ts` e `packages/gamification/index.ts` -- Centralizar a construção determinística do evento `ACHIEVEMENT_UNLOCKED` em módulo puro e testável sem `react-native`.
- `packages/gamification/src/reducer.ts` -- Adicionar guarda `if (existingAchs.some((a) => a.id === achievementId)) return state;` no case `GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED` -- Garantir idempotência pela chave natural `achievementId` para eventos com IDs iguais ou diferentes.
- `src/hooks/useGamificationEffects.ts` -- Usar `createAchievementUnlockedEvent(ach, originDeviceId, Date.now())` ao despachar conquistas desbloqueadas (e usar `getAchievementEventId` em `src/components/debug/DebugTools.tsx`) -- Eliminar o uso de `generateId()` em `ACHIEVEMENT_UNLOCKED`.
- `packages/gamification/__tests__/gamification.test.ts` -- Adicionar suíte de testes para `getAchievementEventId`, `createAchievementUnlockedEvent` e deduplicação de `ACHIEVEMENT_UNLOCKED` no reducer (IDs iguais, IDs diferentes, janela >1000 eventos e conquistas distintas) -- Verificar todos os cenários da matriz de I/O no núcleo funcional.
- `src/context/__tests__/replay.test.ts` -- Adicionar testes de convergência de replay e sync (`selectEventsToImport` + `mergeImported` + `replayAllEvents`) com dois aparelhos cruzando a mesma conquista offline -- Comprovar o comportamento ponta a ponta exigido pelos critérios de aceite.

**Acceptance Criteria:**
- Given `ACHIEVEMENT_UNLOCKED` passa a usar `id` determinístico `ach:{achievementId}` via `createAchievementUnlockedEvent` e `gamificationReducer` deduplica por `achievementId`, when dois aparelhos cruzam a mesma conquista offline e sincronizam seus logs, then o estado resultante contém uma só entrada em `unlockedAchievements`, `completionCounts[achievementId] === 1` e um só pagamento de `xpReward` em `totalXp` e `seasonXp`.
- Given um histórico contendo múltiplos eventos `ACHIEVEMENT_UNLOCKED` para o mesmo `achievementId` com `id`s aleatórios diferentes (ou combinando ID legado aleatório e ID determinístico `ach:{achievementId}`), when o log é reproduzido por `replayGamificationEvents` ou `replayAllEvents`, then a conquista e seu `xpReward` são contabilizados apenas uma vez.
- Given a suíte de testes automatizados em `packages/gamification/__tests__/gamification.test.ts` e `src/context/__tests__/replay.test.ts`, when executada via Vitest, then cobre explicitamente os dois casos (IDs determinísticos iguais e IDs aleatórios diferentes) e passa sem falhas.

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 11 findings — high 0, medium 0, low 6, false 5, maybe-false 0
- findings:
  - `[low]` `[reject]` `src/hooks/useGamificationEffects.ts:397-406` (`setPendingToast` sem guarda de ref por sessão e sobrescrita quando múltiplas conquistas desbloqueiam no mesmo passo) — Comportamento pré-existente no laço de `dispatchDomainEvent`; eventos gerados por `createAchievementUnlockedEvent` têm envelope válido (não vão para a Quarentena) e o tratamento de estado acumulado em laços/lotes pertence à Story 7.7.
  - `[false]` `[reject]` `src/context/__tests__/replay.test.ts:314-357` (`unlockedAt` diferente entre dois aparelhos quando ambos geram `ach:{achievementId}` offline) — Pelo AD-2 (`INSERT OR IGNORE` / `selectEventsToImport` / `dedupeById`), eventos com o mesmo `id` determinístico são deduplicados na importação preservando o primeiro evento local, convergindo em 1 entrada em `unlockedAchievements`, 1 pagamento de XP e `completionCounts === 1` conforme os critérios de aceite da Story 7.1.
  - `[low]` `[reject]` `packages/gamification/src/achievements/achievementChecker.ts:11-13` (`getAchievementEventId` sem normalização de string vazia ou duplo prefixo) — Todos os chamadores passam `ach.id` de `ALL_ACHIEVEMENTS` (slugs constantes não vazios); adicionar guardas defensivas para entradas inalcançáveis é desnecessário.
  - `[false]` `[reject]` `src/components/debug/DebugTools.tsx:505-544` (uso de `createEvent` seguido de sobrescrita de `id` com `getAchievementEventId`) — No painel de debug, sobrescrever `id: getAchievementEventId(selectedTrophy.id)` produz exatamente o envelope esperado com ID determinístico sem efeito colateral observável.
  - `[low]` `[reject]` `packages/gamification/src/reducer.ts:90-110` (`ACHIEVEMENT_UNLOCKED` não aplica `Math.max(0, ...)` para `xpReward` negativo) — Comportamento pré-existente; todas as conquistas em `ALL_ACHIEVEMENTS` têm `xpReward > 0` (50 a 500 XP).
  - `[false]` `[reject]` `src/hooks/useGamificationEffects.ts:148-430` (`MONTHLY_TROPHY_COMPLETED` e `SEASONAL_TROPHY_*` ainda usam `generateId()`) — Fora do escopo da Story 7.1 (que trata especificamente de `ACHIEVEMENT_UNLOCKED`), e troféus mensais/sazonais já possuem deduplicação por chave natural no `gamificationReducer`.
  - `[low]` `[reject]` `src/hooks/useGamificationEffects.ts:381-406` (`checkNewAchievements` avaliado antes de somar `xpReward` das novas conquistas ao nível estimado) — Comportamento pré-existente; a derivação pura de nível a partir do log é escopo da Story 7.8.
  - `[low]` `[defer]` `src/hooks/useGamificationEffects.ts:398` (chamada a `createAchievementUnlockedEvent` dentro do hook React sem teste direto do hook) — `useGamificationEffects` importa `SoundManager` e dependências React/nativas sem harness de hook no Vitest; registrado em `deferred` conforme disposição do `verification-gap`.
  - `[false]` `[reject]` `packages/gamification/src/reducer.ts:250` (observação descritiva do `intent-alignment` sobre curto-circuito por `processedEventIds` vs. guarda por `achievementId`) — O diff implementa e testa ambas as camadas (inclusive após rotação da janela de 1000 itens de `processedEventIds`).
  - `[false]` `[reject]` `src/context/__tests__/replay.test.ts:314-357` (observação descritiva do `intent-alignment` sobre `unlockedAt` em IDs determinísticos vs. IDs legados) — Comportamento esperado pelo AD-2 (`INSERT OR IGNORE` por `event.id`).
  - `[low]` `[defer]` `src/hooks/useGamificationEffects.ts:445` (observação descritiva do `intent-alignment` sobre cobertura de teste na superfície da fábrica pura + reducer vs. hook) — Agrupado com o item de `verification-gap` registrado em `deferred`.

## Verification

**Commands:**
- `npx vitest run packages/gamification/__tests__/gamification.test.ts src/context/__tests__/replay.test.ts` -- expected: todos os testes passam com exit code 0.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de compilação TypeScript.
- `npx eslint packages/gamification/src/achievements/achievementChecker.ts packages/gamification/src/reducer.ts src/hooks/useGamificationEffects.ts src/components/debug/DebugTools.tsx` -- expected: 0 erros e 0 warnings.

## Auto Run Result

- **Status:** `done`
- **Summary of Implemented Change:**
  - Criados e exportados em `packages/gamification/src/achievements/achievementChecker.ts` (e re-exportados em `packages/gamification/src/achievements/index.ts` e `packages/gamification/index.ts`) a constante `ACHIEVEMENT_EVENT_ID_PREFIX = "ach:"`, o helper `getAchievementEventId(achievementId)` e o construtor puro `createAchievementUnlockedEvent(ach, deviceId, timestamp)`.
  - Adicionada no `gamificationReducer` (`packages/gamification/src/reducer.ts`) a deduplicação pela chave natural `achievementId` (`if (existingAchs.some((a) => a.id === achievementId)) return state;`) no tratamento de `ACHIEVEMENT_UNLOCKED`.
  - Atualizados `src/hooks/useGamificationEffects.ts` e `src/components/debug/DebugTools.tsx` para emitir `ACHIEVEMENT_UNLOCKED` com `id` determinístico `ach:{achievementId}` em vez de `generateId()`.
  - Adicionados testes unitários e de integração em `packages/gamification/__tests__/gamification.test.ts` e `src/context/__tests__/replay.test.ts` cobrindo IDs determinísticos iguais, IDs legados aleatórios diferentes, rotação da janela de 1000 itens de `processedEventIds` e sincronização entre dois aparelhos offline.
- **Files Changed:**
  - `packages/gamification/src/achievements/achievementChecker.ts` — Adicionados `ACHIEVEMENT_EVENT_ID_PREFIX`, `getAchievementEventId` e `createAchievementUnlockedEvent`.
  - `packages/gamification/src/achievements/index.ts` — Re-exportados os novos helpers de conquista.
  - `packages/gamification/index.ts` — Re-exportados os novos helpers na raiz do pacote `@packages/gamification`.
  - `packages/gamification/src/reducer.ts` — Adicionada guarda de idempotência por `achievementId` em `ACHIEVEMENT_UNLOCKED`.
  - `src/hooks/useGamificationEffects.ts` — Substituído `generateId()` por `createAchievementUnlockedEvent(ach, originDeviceId, Date.now())`.
  - `src/components/debug/DebugTools.tsx` — Atribuído `id: getAchievementEventId(selectedTrophy.id)` ao despachar conquistas pelo painel de debug.
  - `packages/gamification/__tests__/gamification.test.ts` — Adicionados 5 testes unitários da Story 7.1.
  - `src/context/__tests__/replay.test.ts` — Adicionados 2 testes de convergência de sync e replay da Story 7.1.
- **Review Findings Breakdown:**
  - Patches applied: 0 (`high: 0, medium: 0, low: 0`).
  - Deferred: 1 agrupamento (2 apontamentos `low` sobre teste direto do hook React `useGamificationEffects`).
  - Rejected: 9 apontamentos (5 `false` e 4 `low` pré-existentes ou pertencentes às Stories 7.7 e 7.8).
- **Follow-up Review Recommendation:** `false` (0 patches `high` ou `medium`).
- **Verification Performed:**
  - `npx vitest run packages/gamification/__tests__/gamification.test.ts src/context/__tests__/replay.test.ts src/modules/security/__tests__/noSecretInAsyncStorage.test.ts` — 204/204 testes passando (exit code 0).
  - `rm -f expo-env.d.ts && npx tsc --noEmit` — 0 erros (exit code 0).
  - `npx eslint src/hooks/useGamificationEffects.ts src/components/debug/DebugTools.tsx` — 0 erros, 0 warnings (exit code 0).
- **Residual Risks:** Nenhum para conquistas entre aparelhos ou eventos legados; a emissão repetida dentro de um mesmo laço síncrono de parcelamento no mesmo aparelho será tratada na Story 7.7.
