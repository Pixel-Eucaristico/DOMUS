---
title: 'Story 7.8: Derivar o nível do log'
type: 'refactor'
created: '2026-11-16'
status: 'done'
baseline_revision: 'be30b0b2fbd97b582876e03b1662ea1d8ee1cc31'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      ConsultantChatUseCase.generateWelcome não é invocado diretamente no Vitest
    evidence: >-
      ConsultantChatUseCase importa transitivamente react-native via AIClientService/SecureStore, o que falha no parse do Vitest (conforme AGENTS.md); o fallback estático foi extraído para WelcomeMessageBuilder.buildStaticWelcomeMessage e testado diretamente.
    location: >-
      src/modules/ai/application/ConsultantChatUseCase.ts:298
    severity: medium
  - summary: >-
      computeDomainEventEffects calcula leveledUp antes de somar xpReward de conquistas e troféus
    evidence: >-
      Comportamento pré-existente herdado de useGamificationEffects.ts; ajustar o encadeamento de XP exigiria reavaliar som/conquistas fora do escopo da Story 7.8.
    location: >-
      src/modules/domainEventEffects.ts:221
    severity: low
  - summary: >-
      Botão de debug "Simular Level Up (Real)" ainda despacha evento LEVEL_UP legado
    evidence: >-
      Apenas ferramenta interna de desenvolvimento em DebugTools.tsx; inofensivo porque o reducer ignora e replayValidation.ts mantém LEVEL_UP reconhecido.
    location: >-
      src/components/debug/DebugTools.tsx:399
    severity: low
  - summary: >-
      Clamping Math.max(0, ...) inconsistente em ACHIEVEMENT_UNLOCKED / MONTHLY_TROPHY_COMPLETED / SEASONAL_TROPHY_COMPLETED
    evidence: >-
      Comportamento pré-existente em packages/gamification/src/reducer.ts; xpReward é sempre não-negativo.
    location: >-
      packages/gamification/src/reducer.ts:115
    severity: low
---

<intent-contract>

## Intent

**Problem:** `gamificationReducer` aceita eventos `LEVEL_UP` aplicando `Math.max(state.level, event.payload.newLevel, calculateLevel(state.totalXp))`, e alguns consumidores (como `achievementChecker` e módulos de IA) ainda leem `gamification.level` em vez de derivar o nível exclusivamente de `totalXp` — fazendo o nível poder divergir de `levelInfo.level` ou depender de eventos `LEVEL_UP` antigos.

**Approach:** Fazer o nível ser derivado unicamente de `totalXp` via `calculateLevel(totalXp)` / `getLevelInfo(totalXp)`: ignorar o evento `LEVEL_UP` no `gamificationReducer` (sem enviá-lo para a Quarentena), parar de emitir novos eventos `LEVEL_UP` em `computeDomainEventEffects` (mantendo o som `leveledUp`), e atualizar todos os leitores de `gamification.level` para lerem `calculateLevel(gamification.totalXp)`.

## Boundaries & Constraints

**Always:**
- Manter `LEVEL_UP` reconhecido em `KNOWN_EVENT_TYPES` e `PAYLOAD_SPECS` (`src/context/replayValidation.ts`) para que eventos `LEVEL_UP` antigos no histórico sejam ignorados sem ir para a Quarentena.
- Manter `GamificationState.level` sincronizado com `calculateLevel(totalXp)` no reducer (sem nunca aceitar `event.payload.newLevel` de `LEVEL_UP`).
- Garantir que todas as telas, `achievementChecker`, `domainEventEffects` e builders da IA derivem o nível da mesma fonte (`calculateLevel(totalXp)` / `levelInfo.level`).
- Manter `leveledUp: boolean` em `computeDomainEventEffects` para que o efeito sonoro `levelUp` continue tocando quando o usuário sobe de nível.

**Never:**
- Alterar `packages/sync`, `ios/`, `android/` ou `replit.*`.
- Usar `vi.mock("react-native")` nos testes.
- Alterar a lógica de streak (escopo da Story 7.9).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Evento `LEVEL_UP` antigo no log | Log contém `XP_GAINED` (100 XP -> nível 2) e `LEVEL_UP` legado com `newLevel: 10` | `replayAllEvents` ignora `newLevel: 10`, mantém `gamification.level === calculateLevel(100)` e `quarantine` vazia | Nenhum erro esperado |
| Convergência entre dois aparelhos | Aparelho A e Aparelho B recebem os mesmos eventos em ordens diferentes (com ou sem `LEVEL_UP` antigo) | Ambos produzem o mesmo `level` e `levelInfo.level` derivados de `totalXp` | Nenhum erro esperado |
| Leitores de nível na IA e conquistas | `AIContextBuilder`, `ConsultantChatUseCase`, `WelcomeMessageBuilder`, `achievementChecker` recebendo `totalXp` correspondente ao nível 5 mas `level: 1` | Todos usam `calculateLevel(totalXp)` (nível 5) em vez do campo `level` absoluto | Nenhum erro esperado |
| Subida de nível em `computeDomainEventEffects` | Transação faz `totalXp` cruzar limiar de nível | Retorna `leveledUp: true` (para som), mas não emite evento `LEVEL_UP` no array `gamificationEvents` | Nenhum erro esperado |

</intent-contract>

## Code Map

- `packages/gamification/src/reducer.ts` -- `gamificationReducer` (linhas 92-98): `case GAMIFICATION_EVENTS.LEVEL_UP` hoje aplica `Math.max(state.level, event.payload.newLevel, calculateLevel(state.totalXp))`.
- `packages/gamification/src/levelEngine.ts` -- `calculateLevel(totalXp)` e `getLevelInfo(totalXp)`.
- `packages/gamification/src/achievements/achievementChecker.ts` -- Linhas 96, 99, 160, 161 ainda leem `gamification.level` para `level_5`, `level_10`, `level_20`, `level_50`.
- `src/modules/domainEventEffects.ts` -- Linhas 225-248 ainda emitem `GAMIFICATION_EVENTS.LEVEL_UP` e usam `currentGamification.level`.
- `src/modules/ai/application/AIContextBuilder.ts` -- Linha 127 lê `g.level`.
- `src/modules/ai/application/ConsultantChatUseCase.ts` -- Linhas 311-312 leem `g.level`.
- `src/modules/ai/application/WelcomeMessageBuilder.ts` -- Linhas 31-33 leem `gamification.level`.
- `src/context/replayValidation.ts` -- Linha 170 mantém `LEVEL_UP: { newLevel: num }` para não mandar eventos antigos à Quarentena.
- `packages/gamification/__tests__/gamification.test.ts` -- Linhas 597-637, 733-750, 800-858, 935-955 testavam o comportamento antigo de `LEVEL_UP`.

## Tasks & Acceptance

**Execution:**
- `packages/gamification/src/reducer.ts` -- Alterar `case GAMIFICATION_EVENTS.LEVEL_UP` para ignorar o evento (retornando `state` ou apenas registrando `processedEventIds` sem alterar `level`, mantendo `level: calculateLevel(state.totalXp)`) -- Garante que `LEVEL_UP` antigo seja ignorado e `GamificationState.level` reflita apenas `totalXp`.
- `packages/gamification/src/achievements/achievementChecker.ts` -- Substituir leituras de `gamification.level` por `calculateLevel(gamification.totalXp)` -- Garante que conquistas de nível não dependam de `GamificationState.level`.
- `src/modules/domainEventEffects.ts` -- Parar de emitir `GAMIFICATION_EVENTS.LEVEL_UP` (mantendo `leveledUp` para o som) e derivar `estimatedNextGamification.level` com `calculateLevel(estimatedNewTotalXp)` -- Elimina emissão de novos `LEVEL_UP`.
- `src/modules/ai/application/AIContextBuilder.ts`, `src/modules/ai/application/ConsultantChatUseCase.ts`, `src/modules/ai/application/WelcomeMessageBuilder.ts` -- Substituir leituras de `g.level` / `gamification.level` por `calculateLevel(totalXp)` -- Garante que todas as telas e a IA leiam a mesma fonte de nível.
- `packages/gamification/__tests__/gamification.test.ts` e `packages/gamification/__tests__/levelDerivation.test.ts` -- Atualizar os testes legados de `LEVEL_UP` em `gamification.test.ts` para o novo comportamento (ignorado) e criar `levelDerivation.test.ts` cobrindo toda a matriz I/O (replay sem quarentena, convergência entre 2 aparelhos, leitores IA/conquistas e `computeDomainEventEffects`).

**Acceptance Criteria:**
- Given eventos `LEVEL_UP` antigos gravados no log, when `replayAllEvents` processa o histórico, then eles são ignorados sem ir para a Quarentena e o nível é calculado exclusivamente de `totalXp`.
- Given dois aparelhos com os mesmos eventos em ordens de chegada diferentes (com ou sem `LEVEL_UP` antigo), when ambos executam o replay, then exibem exatamente o mesmo nível em todas as telas (`levelInfo.level`), conquistas e IA.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 8 findings — high 0, medium 1, low 6, false 1, maybe-false 0
- findings:
  - `[medium]` `[defer]` `ConsultantChatUseCase.generateWelcome` não exercitado diretamente no Vitest — tentativa de importar `ConsultantChatUseCase` em `levelDerivation.test.ts` confirmou import transitivo de `react-native` (quebra no Vitest conforme `AGENTS.md`); testada a função pura delegada `buildStaticWelcomeMessage` e registrado em `deferred`.
  - `[low]` `[defer]` `computeDomainEventEffects` calcula `leveledUp` antes de somar `xpReward` de conquistas/troféus — comportamento pré-existente registrado em `deferred`.
  - `[false]` `[reject]` `PAYLOAD_SPECS.LEVEL_UP` ainda exige `newLevel: num` em `replayValidation.ts` — eventos `LEVEL_UP` legados reais sempre possuem `newLevel` numérico e passam sem Quarentena, como validado em `levelDerivation.test.ts`.
  - `[low]` `[defer]` Botão de debug "Simular Level Up (Real)" em `DebugTools.tsx` — ferramenta de debug inofensiva, registrada em `deferred`.
  - `[low]` `[reject]` Testes legados restantes em `gamification.test.ts` — já passam com `XP_GAINED` e a suíte dedicada valida a ignorância de `newLevel`.
  - `[low]` `[reject]` Falta anotação `@deprecated` em `GAMIFICATION_EVENTS.LEVEL_UP` — cosmético sem impacto funcional.
  - `[low]` `[defer]` Clamping `Math.max(0, ...)` em outros handlers de `reducer.ts` — pré-existente e `xpReward` não é negativo, registrado em `deferred`.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint .`: 0 erros (12 warnings pré-existentes fora dos arquivos da story).
- `npx tsc --noEmit`: 0 erros.
- `npx vitest run --maxWorkers=2`: 124 arquivos / 2946 testes passando (incluindo `gamification.test.ts`, `levelDerivation.test.ts` e `domainEventEffects.test.ts`).

## Auto Run Result

- **Resumo:** Nível unificado para derivação exclusiva de `totalXp` via `calculateLevel(totalXp)` / `getLevelInfo(totalXp)`: `LEVEL_UP` legado passa a ser ignorado sem ir para a Quarentena, `computeDomainEventEffects` deixa de emitir novos `LEVEL_UP` (mantendo o som `leveledUp`) e todos os leitores de `gamification.level` em conquistas e IA passam a derivar o nível de `totalXp`.
- **Arquivos alterados:**
  - `packages/gamification/src/reducer.ts` — `LEVEL_UP` ignora `event.payload.newLevel` e mantém `calculateLevel(state.totalXp)`.
  - `packages/gamification/src/achievements/achievementChecker.ts` — conquistas de nível usam `calculateLevel(gamification.totalXp)`.
  - `src/modules/domainEventEffects.ts` — remove emissão de `LEVEL_UP` mantendo `leveledUp` e `calculateLevel(estimatedNewTotalXp)`.
  - `src/modules/ai/application/AIContextBuilder.ts` — usa `calculateLevel(g.totalXp)`.
  - `src/modules/ai/application/WelcomeMessageBuilder.ts` e `src/modules/ai/application/ConsultantChatUseCase.ts` — `buildWelcomeMessage` e `buildStaticWelcomeMessage` usam `calculateLevel(totalXp)`.
  - `packages/gamification/__tests__/gamification.test.ts` e `packages/gamification/__tests__/levelDerivation.test.ts` — suíte atualizada e novos testes de derivação/convergência.
- **Triagem da revisão:** 0 patches permanentes (tentativa de importar `ConsultantChatUseCase` no Vitest esbarrou em `react-native`), 4 itens registrados em `deferred`, 2 rejeitados (`low`) e 1 refutado (`false`).
