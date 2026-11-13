---
title: 'Story 7.5: Recuperar o XP uma vez só'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_revision: '0d283a48c519d841020b66c6e2ca44ba5093ed30'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-7-context.md'
  - '_bmad-output/implementation-artifacts/spec-7-4-nao-dar-xp-a-transacao-pendente.md'
warnings: []
deferred:
  - summary: >-
      Dois aparelhos que recuperam XP com valores diferentes (ex.: 45 e 60) podem manter sobreviventes diferentes do mesmo id no log, e o totalXp diverge até a ordem total convergir.
    evidence: |-
      blind-hunter, edge-case-hunter: o dedup do log (`prepareLocalLog`/`mergeImported`) fica com o primeiro visto por id, por aparelho. Não verificado em teste de sync de dois aparelhos; resolver exige regra de colisão por `compareEvents` ou valor determinístico.
    location: >-
      src/context/localEventLog.ts (dedupeById/mergeImported)
    severity: medium (unverified)
---

<intent-contract>

## Intent

**Problem:** Hoje a recuperação de XP gera evento com id não determinístico (`createEvent` usando `generateId()`) e a verificação no boot (`evaluateXpRecoveryEffect` via `allEvents.some(isXpRecoveryEvent)`) confere apenas o log local. Se dois aparelhos geram a recuperação de XP antes do sync, ambos os eventos entram no log com IDs distintos e o `gamificationReducer` soma o XP das duas recuperações, dobrando o benefício.

**Approach:** Atribuir id determinístico fixo `xp-recovery:v1` ao evento de recuperação de XP em `createXpRecoveryEvent` (`src/context/localEventLog.ts`), de modo que o sync/armazenamento deduplique por `event.id`. Além disso, fazer o `gamificationReducer` (`packages/gamification/src/reducer.ts`) rastrear `xpRecoveryApplied: boolean` e deduplicar semanticamente, aplicando no máximo uma recuperação de XP mesmo que cheguem eventos antigos com ids aleatórios (`xp-recovery-*` ou com marca `recovery: "xp-recovery"` no payload).

## Boundaries & Constraints

**Always:**
- `createXpRecoveryEvent` deve gerar evento com `id: "xp-recovery:v1"` (ou constante `XP_RECOVERY_EVENT_ID = "xp-recovery:v1"`).
- O `isXpRecoveryEvent` continua reconhecendo tanto o id determinístico novo (`xp-recovery:v1`), quanto o prefixo antigo `xp-recovery-` e a marca de payload `{ recovery: "xp-recovery" }`.
- No `gamificationReducer`, caso um evento `XP_GAINED` seja identificado como recuperação de XP (`isXpRecoveryEvent` ou marca equivalente em `packages/gamification`), ele deve ser aplicado no máximo uma vez em `totalXp`/`seasonXp`/`xpHistory`. Eventos subsequentes de recuperação são ignorados (retornam `state` sem alterar XP nem duplicar histórico).
- Manter compatibilidade com eventos antigos gravados no log (com prefixo `xp-recovery-` ou id aleatório com marca).
- Garantir que a recuperação continue respeitando a barreira do primeiro pull (`initialSyncReady` da Story 7.2).

**Never:**
- Não alterar as regras de cálculo do valor recuperado (`Math.max(30, txCount * 15)`).
- Não alterar as categorias padrão (Story 7.6) nem o parcelamento (Story 7.7).
- Não importar módulos de `src/*` dentro de `packages/*`.
- Não usar `vi.mock("react-native")`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dois aparelhos geram recuperação nova offline | Aparelho A e B geram `createXpRecoveryEvent(45, did)` | Ambos geram `id: "xp-recovery:v1"`; `mergeImported` / dedup por ID colapsa em 1 só evento no log e 1 só aplicação de XP | Sem erro |
| Evento antigo aleatório + evento novo | Log possui evento legado com id `xp-recovery-123` e recebe evento novo com `xp-recovery:v1` | O primeiro evento aplica os pontos de XP; o segundo evento é ignorado pelo reducer (`xpRecoveryApplied: true`) | Sem erro |
| Dois eventos antigos com IDs aleatórios diferentes | Log recebe `xp-recovery-abc` e `xp-recovery-def` | Reducer aplica apenas o primeiro; segundo é ignorado sem somar XP | Sem erro |
| Evento XP comum após recuperação | Log possui recuperação aplicada e recebe `XP_GAINED` normal de transação | Evento normal de XP é processado normalmente, somando ao `totalXp` | Sem erro |
| Detecção com payload nulo/malformado | `isXpRecoveryEvent` chamado com objeto sem payload ou payload não-objeto | Retorna `false` sem lançar exceção | Tratado com segurança |

</intent-contract>

## Code Map

- `src/context/localEventLog.ts` -- Definir `XP_RECOVERY_EVENT_ID = "xp-recovery:v1"`; atualizar `createXpRecoveryEvent` para usar esse id determinístico; manter e atualizar `isXpRecoveryEvent` para reconhecer `XP_RECOVERY_EVENT_ID`.
- `packages/gamification/src/reducer.ts` -- No `gamificationReducer`, detectar eventos de recuperação de XP (por id `xp-recovery:v1`, prefixo `xp-recovery-` ou payload `recovery === "xp-recovery"`), rastrear `xpRecoveryApplied: boolean` em `GamificationState` e ignorar repetições.
- `packages/gamification/src/types.ts` -- Adicionar `xpRecoveryApplied?: boolean` na interface `GamificationState`.
- `packages/gamification/src/reducer.ts` -- Inicializar `xpRecoveryApplied: false` em `createInitialGamificationState()`.
- `src/context/__tests__/localEventLog.test.ts` -- Atualizar testes de `createXpRecoveryEvent` e `isXpRecoveryEvent` para o id determinístico `xp-recovery:v1`.
- `packages/gamification/__tests__/gamification.test.ts` -- Adicionar testes de idempotência da recuperação no reducer (dois eventos novos, evento antigo + novo, dois antigos com IDs diferentes).

## Tasks & Acceptance

**Execution:**
- `packages/gamification/src/types.ts` & `packages/gamification/src/reducer.ts` -- Adicionar suporte a `xpRecoveryApplied` no reducer e ignorar múltiplos eventos de recuperação de XP.
- `src/context/localEventLog.ts` -- Atualizar `createXpRecoveryEvent` para fixar `id: XP_RECOVERY_EVENT_ID` (`xp-recovery:v1`) e atualizar `isXpRecoveryEvent`.
- `packages/gamification/__tests__/gamification.test.ts` & `src/context/__tests__/localEventLog.test.ts` -- Testar id determinístico e deduplicação no reducer e no replay.

**Acceptance Criteria:**
- Given dois aparelhos que executam a recuperação de XP, when os eventos são sincronizados, then o log e o reducer resultam em uma só recuperação de XP.
- Given um log que já possui um evento legado de recuperação com prefixo `xp-recovery-`, when um novo evento de recuperação é recebido ou processado, then ele não soma XP adicional.

## Spec Change Log

## Review Triage Log

### 2026-11-13 — Review pass
- verdicts: 25 findings — high 0, medium 1, low 4, false 3, rejected-as-design/negligible 17 (graded low)
- findings:
  - `[low]` `[patch]` Constantes de recuperação duplicadas em `reducer.ts` e `localEventLog.ts` (blind-hunter, verification-gap, edge-case-hunter) — `localEventLog.ts` passou a importar e reexportar as constantes do reducer (fonte única).
  - `[low]` `[patch]` Teste de dois aparelhos não cobre `mergeImported` nem `seasonXp` (edge-case-hunter, intent-alignment, verification-gap) — adicionados teste `mergeImported` com mesmo id e asserção de `seasonXp`.
  - `[low]` `[patch]` Comentários desatualizados sobre prefixo/marca (blind-hunter) — substituídos pelo comentário de fonte única.
  - `[medium]` `[defer]` Dois aparelhos com valores diferentes (45 vs 60) mantêm sobreviventes diferentes no log (dedup "fica o primeiro visto" por aparelho) e o `totalXp` pode divergir até a ordem total convergir (blind-hunter, edge-case-hunter, intent-alignment) — o valor depende do número de transações local; tornar o valor determinístico ou escolher por `compareEvents` na colisão de id exige mudança no dedup do log (`prepareLocalLog`/`mergeImported`) que afeta todos os eventos; registrado em `deferred` (não verificado em teste de sync).
  - `[false]` `[reject]` Flag `xpRecoveryApplied` ausente em snapshot antigo reaplica recuperação (edge-case-hunter) — o estado nunca é persistido, é reconstruído por replay (AGENTS.md); a flag é recalculada no replay.
  - `[false]` `[reject]` "Nenhum código/teste para o gate do primeiro pull (AC 3)" (intent-alignment) — o gate já existe e é testado na Story 7.2 (`evaluateXpRecoveryEffect` com `initialSyncReady`); esta story não o altera.
  - `[false]` `[reject]` Primeiro teste do reducer passaria só pelo dedup por `processedEventIds` (verification-gap) — o mesmo teste usa ids iguais; os outros três exercitam `xpRecoveryApplied`; cobertura da flag existe.
  - `[low]` `[reject]` Marca/prefixo em `XP_GAINED` legítimo seria descartado (edge-case-hunter) — a marca e o prefixo só são gravados pela recuperação.
  - `[low]` `[reject]` Evento ignorado não registra o id em `processedEventIds` (edge-case-hunter) — inofensivo: a flag descarta qualquer recuperação posterior.
  - `[low]` `[reject]` Predicados `isXpRecoveryEvent` (sem checar tipo) e `isXpRecoveryGamificationEvent` divergem (blind-hunter) — o consumidor do log só avalia eventos já em XP; sem caminho alcançável com dano.
  - `[low]` `[reject]` Teste do contador/ordem por `compareEvents` removido (blind-hunter) — a ordenação por id continua coberta nos testes de `generateId`/`compareEvents`; o evento de recuperação agora tem id fixo.
  - `[low]` `[reject]` Demais itens (dedup após 1000 ids, nota de UX/migração, cobertura de `amount<=0`/id ausente, interação com `transactionId`) — sem caminho alcançável com dano demonstrado.

## Auto Run Result

- **Resumo:** A recuperação de XP agora usa o id fixo `xp-recovery:v1`; o `gamificationReducer` aplica no máximo uma recuperação (`xpRecoveryApplied`), inclusive com eventos antigos de prefixo `xp-recovery-` ou marca no payload.
- **Arquivos:** `packages/gamification/src/reducer.ts` (flag, constantes e detecção), `packages/gamification/src/types.ts` (`xpRecoveryApplied`), `src/context/localEventLog.ts` (id fixo; constantes importadas do reducer), testes em `packages/gamification/__tests__/gamification.test.ts` e `src/context/__tests__/localEventLog.test.ts`.
- **Implementação:** feita diretamente pelo agente principal (o agente de implementação falhou por cota esgotada, erro 429).
- **Revisão:** 3 patches de baixa gravidade aplicados, 1 deferido (medium), demais rejeitados com motivo.
- **Follow-up review recomendado:** `false`.
- **Verificação:** `vitest` (52 arquivos), `tsc --noEmit` e `eslint` limpos.
- **Riscos residuais:** com valores diferentes de recuperação entre aparelhos (45 vs 60) o log de cada aparelho pode guardar um sobrevivente diferente do mesmo id, e o `totalXp` diverge até a ordem total convergir; resolver exige regra de colisão de id no dedup do log.

## Verification

**Commands:**
- `npx vitest run packages/gamification/__tests__/gamification.test.ts src/context/__tests__/localEventLog.test.ts src/modules/__tests__/bootEffectsGate.test.ts` -- expected: todos passam.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros.
- `npx eslint packages/gamification/src/reducer.ts src/context/localEventLog.ts` -- expected: 0 erros e 0 warnings.
