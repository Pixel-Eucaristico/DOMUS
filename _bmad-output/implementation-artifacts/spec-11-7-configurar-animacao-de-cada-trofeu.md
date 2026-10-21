---
title: 'Story 11.7: Configurar a animação de cada troféu'
type: 'feature'
created: '2026-10-21'
status: 'done'
baseline_commit: 'd690328e7ae592ed2e6da6ee63bb618ce56b0972'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 117 dos 197 troféus não têm Lottie aprovado: os 114 litúrgicos e 3 sazonais (`seasonal_decimo_terceiro`, `seasonal_ferias_verao`, `seasonal_balanco_anual`). Hoje todos eles caem no mesmo `AnimatedSeasonalTrophy` (flutuar, girar, brilho), só com o ícone diferente. O dono quer uma animação própria para cada troféu (FR-27, revisto em 21/10).

**Approach:** Criar `src/constants/trophyAnimationConfigs.ts`: cada troféu sem Lottie recebe uma configuração vinda da sua categoria temática mais um ajuste próprio. Um teste garante uma configuração válida para todos esses troféus e que todo ajuste aponta para um troféu existente. Esta story só define os dados; a Story 11.8 os anima e mostra a prévia no DebugTools.

## Boundaries & Constraints

**Always:** módulo puro, sem `react-native` (testável no vitest); ids lidos de `ALL_ACHIEVEMENTS`, `MONTHLY_TROPHIES`, `ALL_SEASONAL_TROPHIES`, `ALL_LITURGICAL_TROPHIES` (`@packages/gamification`); a lista de ids com Lottie sai de um módulo puro novo (`src/constants/approvedLottieIds.ts`), com um teste que confere que ela bate com as chaves de `APPROVED_LOTTIE` em `LottieTrophy.tsx` (lido como texto); campos com faixas fechadas (durações em ms, contagem de partículas), para a 11.8 não receber valor inválido.

**Never:** mudar a animação na tela, `AnimatedTrophy`, `AnimatedSeasonalTrophy` ou o `LottieTrophy` além de importar a lista de ids (isso é a 11.8); configurar troféus que já têm Lottie; tocar em `packages/gamification` além de leitura.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Troféu sem Lottie | `lt_natal` | configuração da categoria (ex. festa litúrgica) + ajuste próprio | N/A |
| Troféu com Lottie | `first_transaction` | sem configuração (usa o Lottie) | `getTrophyAnimationConfig` devolve `null` |
| Id inexistente | `"xyz"` | `null` | N/A |
| Ajuste órfão | ajuste para id que não existe ou que tem Lottie | teste falha | N/A |
| Lista de Lottie dessincronizada | id em `APPROVED_LOTTIE` fora de `approvedLottieIds` | teste falha | N/A |

**Decisão do dono (21/10/2026):** animação **única por troféu**. Cada um dos 117 troféus sem Lottie tem uma combinação própria (categoria + ajuste em todos), e o teste garante que não há duas configurações iguais.

</frozen-after-approval>

## Code Map

- `packages/gamification/index.ts:39,44,77` -- exporta `ALL_ACHIEVEMENTS` (29), `MONTHLY_TROPHIES` (6), `ALL_SEASONAL_TROPHIES` (48), `ALL_LITURGICAL_TROPHIES` (114, com `id`, `month`, `name`, `icon`, `difficulty` em `liturgicalTrophies/types.ts`)
- `src/components/gamification/LottieTrophy.tsx:17-~495` -- `APPROVED_LOTTIE` (80 chaves, não exportado; o arquivo importa `react-native` e JSONs); fallback em `:563-578`
- `src/components/gamification/AnimatedSeasonalTrophy.tsx:40-115` -- o que existe hoje: flutuar (−12px, 2200ms), girar (5000ms), halo pulsando (1800ms), entrada em escala (600ms), 3 brilhos, `TrophyDecorationFactory`
- Rascunho anterior para reaproveitar o formato (cobria todos os 197): `/tmp/claude-0/-home-user-DOMUS/caf27288-a69f-5228-a5f5-eb64aeedd5d8/scratchpad/old-work/0004-feat-trophies-anima-o-individual-configur-vel-para-o.patch`, linhas 823-1170 -- `TrophyAnimationConfig { primaryMotion: spin|float|bounce|shake|pulse|swing; motionSpeed 800-8000; secondaryEffect: glow|sparkle|ripple|none; effectColor?; entryAnimation: scale|fade|slide|flip; entryDuration; particles: stars|hearts|fire|snow|confetti|coins|none; particleCount 0-12 }`, `CATEGORY_CONFIGS`, `TROPHY_OVERRIDES`, `getTrophyAnimationCategory`, `getTrophyAnimationConfig`; usar só o arquivo de configuração e o teste, não o `TrophyMotion` nem as refatorações (11.8)
- Padrão de testes de constantes: `src/constants/__tests__/` (ex. `privacyFlagTexts.test.ts`)

## Tasks & Acceptance

**Execution:**
- [ ] `src/constants/approvedLottieIds.ts` -- `APPROVED_LOTTIE_IDS` (80 ids) e `hasApprovedLottie(id)`
- [ ] `src/constants/trophyAnimationConfigs.ts` -- tipo, categorias, ajustes, `getTrophyAnimationCategory`, `getTrophyAnimationConfig` (devolve `null` com Lottie ou id inexistente)
- [ ] `src/constants/__tests__/trophyAnimationConfigs.test.ts` -- matriz: cobertura dos 117, validade das faixas, ajustes sem órfão, sincronia com `APPROVED_LOTTIE`, nenhuma configuração repetida entre os 117

**Acceptance Criteria:**
- Given qualquer troféu sem Lottie, when peço a configuração, then ela vem da categoria mais o ajuste próprio e passa na validação
- Given um ajuste, when o teste roda, then ele aponta para um troféu existente e sem Lottie

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npx vitest run src/constants` -- expected: passa
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0

## Spec Change Log

- 21/10/2026: story substituída pela Sprint Change "Lottie para todos" (`sprint-change-proposal-2026-10-21-lottie-todos.md`) antes de qualquer código entrar; o rascunho `approvedLottieIds.ts` foi descartado. Esta spec fica só como registro.
