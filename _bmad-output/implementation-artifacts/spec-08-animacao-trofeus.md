---
title: 'Tarefa 08 — Animação Individual para Cada Troféu (Config Map e Componentes Animados)'
type: 'feature'
created: '2026-11-05'
status: 'done'
baseline_revision: '2dc5006b8390843b920f80a1495438d57f95a8e8'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'docs/roadmap/08-animacao-trofeus.md'
  - 'ROADMAP.md'
warnings: []
deferred:
  - 'src/components/gamification/AnimatedTrophy.tsx & AnimatedSeasonalTrophy.tsx — automated React Native Reanimated component tree render tests require a React Native UI test harness not yet configured in the repository (pure logic extracted and tested via resolveActiveParticleCount and getTrophyAnimationConfig)'
---

<intent-contract>

## Intent

**Problem:** Atualmente `AnimatedTrophy.tsx` (conquistas) e `AnimatedSeasonalTrophy.tsx` (sazonais/litúrgicos) aplicam exatamente os mesmos parâmetros fixos de animação para todos os troféus. A Tarefa 08 (`docs/roadmap/08-animacao-trofeus.md`) especifica a criação de um mapa de configuração individual por troféu (`trophyAnimationConfigs.ts`) e a refatoração dos componentes de troféu para animar movimento principal, efeito secundário, animação de entrada e partículas de acordo com a identidade de cada troféu.

**Approach:** Criar `src/constants/trophyAnimationConfigs.ts` (com núcleo testável em `packages/gamification/src/trophyAnimationConfigs.ts`) contendo a interface `TrophyAnimationConfig`, o mapa `TROPHY_ANIMATION_CONFIGS` cobrindo todos os troféus do catálogo (`ALL_ACHIEVEMENTS`, `MONTHLY_TROPHIES`, `ALL_SEASONAL_TROPHIES`, `ALL_LITURGICAL_TROPHIES` e IDs adicionais do roadmap) e o resolver `getTrophyAnimationConfig(id, options)` com fallback determinístico por categoria; refatorar `AnimatedTrophy.tsx`, `AnimatedSeasonalTrophy.tsx`, `LottieTrophy.tsx`, `SurpriseTrophyCard.tsx` e `TrophyDecorationFactory.tsx` para consumir `TrophyAnimationConfig`; adicionar testes unitários em Vitest.

## Boundaries & Constraints

**Always:**
- Manter compatibilidade retroativa nas props de `AnimatedTrophy`, `AnimatedSeasonalTrophy`, `LottieTrophy` e `TrophyDecorationFactory` (`id` e `config` opcionais; chamadas existentes sem `config` devem resolver automaticamente via `getTrophyAnimationConfig`).
- Respeitar os modos estáticos (`spinning === false` em `AnimatedTrophy` e `isStatic === true` em `AnimatedSeasonalTrophy`), desativando loops contínuos quando o troféu estiver em modo estático.
- Garantir que todos os IDs presentes em `ALL_ACHIEVEMENTS`, `MONTHLY_TROPHIES`, `ALL_SEASONAL_TROPHIES` e `ALL_LITURGICAL_TROPHIES` possuam configuração explícita válida em `TROPHY_ANIMATION_CONFIGS` (`motionSpeed > 0`, `entryDuration >= 0`, `particleCount >= 0`).
- Respeitar as regras de hooks do React e do `react-native-reanimated` (`useSharedValue` e `useAnimatedStyle` nunca chamados condicionalmente ou dentro de loops dinâmicos).

**Never:**
- Não remover ou quebrar os assets Lottie já aprovados em `LottieTrophy.tsx`.
- Não introduzir novas dependências externas no `package.json`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Troféu mapeado explicitamente | `getTrophyAnimationConfig("streak_7")` ou `getTrophyAnimationConfig("lt_pascoa")` | Retorna o `TrophyAnimationConfig` específico do ID com `primaryMotion`, `motionSpeed`, `secondaryEffect`, `entryAnimation`, `entryDuration`, `particles`, `particleCount` | Nenhum erro |
| Troféu desconhecido com prefixo de categoria | `getTrophyAnimationConfig("streak_999")` ou `getTrophyAnimationConfig("lt_novo_santo")` | Retorna preset da categoria correspondente (`streak_*` -> fogo/pulse, `lt_*` -> luz divina/float) | Fallback determinístico sem lançar exceção |
| ID indefinido ou vazio | `getTrophyAnimationConfig(undefined)` ou `getTrophyAnimationConfig("")` | Retorna configuração padrão segura (`DEFAULT_TROPHY_ANIMATION_CONFIG`) | Nenhum erro |
| Renderização estática (`isStatic` / `!spinning`) | `<AnimatedSeasonalTrophy id="seasonal_natal" isStatic />` ou `<AnimatedTrophy rarity="gold" spinning={false} />` | Não inicia loops infinitos (`withRepeat`), mantendo posição/escala estável | Nenhum erro |
| `particleCount` igual a 0 ou `particles: "none"` | `config = { ..., particles: "none", particleCount: 0 }` | Não renderiza partículas visuais extras | Limita partículas ao máximo seguro suportado pelos hooks fixos |

</intent-contract>

## Code Map

- `packages/gamification/src/trophyAnimationConfigs.ts` -- Novo módulo puro exportando `TrophyAnimationConfig`, `PrimaryMotion`, `SecondaryEffect`, `EntryAnimation`, `ParticleType`, `TROPHY_ANIMATION_CONFIGS`, `CATEGORY_ANIMATION_PRESETS`, `DEFAULT_TROPHY_ANIMATION_CONFIG` e `getTrophyAnimationConfig`.
- `packages/gamification/index.ts` -- Re-exportar tipos e helpers de `src/trophyAnimationConfigs.ts`.
- `src/constants/trophyAnimationConfigs.ts` -- Novo arquivo solicitado no roadmap re-exportando tudo de `@packages/gamification/src/trophyAnimationConfigs`.
- `src/components/gamification/AnimatedTrophy.tsx` -- `Props` (L49-53) e `AnimatedTrophy` (L55-164). Aceitar `id?: string` e `config?: TrophyAnimationConfig`, aplicar movimentos (`spin`, `float`, `bounce`, `shake`, `pulse`, `swing`), efeitos secundários (`glow`, `sparkle`, `trail`, `ripple`, `none`), entrada (`scale`, `fade`, `slide`, `flip`) e partículas (`stars`, `hearts`, `fire`, `snow`, `confetti`, `none`).
- `src/components/gamification/AnimatedSeasonalTrophy.tsx` -- `Props` (L18-25) e `AnimatedSeasonalTrophy` (L32-166). Aceitar `config?: TrophyAnimationConfig` (ou resolver via `getTrophyAnimationConfig(id, { isLiturgical })`), parametrizar velocidade, movimento principal, efeito secundário, entrada e partículas temáticas.
- `src/components/gamification/TrophyDecorationFactory.tsx` -- `TrophyDecorationProps` (L4-7) e `TrophyDecorationFactory` (L311-316). Aceitar `animationConfig?: TrophyAnimationConfig` opcional para enriquecer a decoração SVG com acentos visuais alinhados ao `secondaryEffect` / `particles`.
- `src/components/gamification/SurpriseTrophyCard.tsx` -- `SurpriseTrophyCard` (L191-197). Resolver e passar `config={getTrophyAnimationConfig(trophy?.id, { isLiturgical })}` para `AnimatedSeasonalTrophy`.
- `src/components/gamification/LottieTrophy.tsx` -- Fallback `AnimatedTrophy` (L561-563) e `AnimatedSeasonalTrophy` (L565-574). Passar `id={trophyId}` e `config` resolvido para os componentes SVG animados.
- `packages/gamification/__tests__/trophyAnimationConfigs.test.ts` -- Nova suíte de testes unitários validando a cobertura de 100% dos troféus do catálogo, invariantes numéricos e fallbacks por categoria.

## Tasks & Acceptance

**Execution:**
- `packages/gamification/src/trophyAnimationConfigs.ts`, `packages/gamification/index.ts` e `src/constants/trophyAnimationConfigs.ts` -- Definir `TrophyAnimationConfig`, presets por categoria e configurações individuais customizadas para todos os troféus de conquistas, mensais, sazonais e litúrgicos, além do resolver `getTrophyAnimationConfig` -- Centralizar parâmetros de animação individuais conforme `docs/roadmap/08-animacao-trofeus.md`.
- `src/components/gamification/AnimatedTrophy.tsx` -- Refatorar para aceitar `id?: string` e `config?: TrophyAnimationConfig`, suportando os 6 `primaryMotion`, 5 `secondaryEffect`, 4 `entryAnimation` e 6 tipos de `particles` sem violar Rules of Hooks -- Dar identidade animada única a cada conquista.
- `src/components/gamification/AnimatedSeasonalTrophy.tsx` e `src/components/gamification/TrophyDecorationFactory.tsx` -- Refatorar `AnimatedSeasonalTrophy` para consumir `config?: TrophyAnimationConfig` (ou `getTrophyAnimationConfig(id, { isLiturgical })`) e coordenar com `TrophyDecorationFactory` -- Permitir animações e partículas customizadas por troféu sazonal e litúrgico.
- `src/components/gamification/SurpriseTrophyCard.tsx` e `src/components/gamification/LottieTrophy.tsx` -- Passar `config` e `id` para `AnimatedSeasonalTrophy` e `AnimatedTrophy` -- Integrar as novas configurações nas telas da Temporada e Coleção.
- `packages/gamification/__tests__/trophyAnimationConfigs.test.ts` -- Criar testes unitários verificando que todos os troféus de `ALL_ACHIEVEMENTS`, `MONTHLY_TROPHIES`, `ALL_SEASONAL_TROPHIES` e `ALL_LITURGICAL_TROPHIES` têm configs válidas e distintas e testando fallbacks de `getTrophyAnimationConfig` -- Garantir cobertura automatizada da configuração de todos os troféus.

**Acceptance Criteria:**
- Given qualquer troféu de `ALL_ACHIEVEMENTS`, `MONTHLY_TROPHIES`, `ALL_SEASONAL_TROPHIES` ou `ALL_LITURGICAL_TROPHIES`, when `getTrophyAnimationConfig(trophy.id)` é chamado, then retorna um `TrophyAnimationConfig` válido e específico para o troféu.
- Given um ID de série infinita ou desconhecido como `"streak_730"` ou `"lt_custom"`, when `getTrophyAnimationConfig(id)` é chamado, then retorna o preset correspondente à categoria sem erro.
- Given `AnimatedTrophy` e `AnimatedSeasonalTrophy`, when renderizados com `id` ou `config`, then aplicam `primaryMotion`, `motionSpeed`, `secondaryEffect`, `entryAnimation`, `entryDuration` e `particles` definidos na configuração, respeitando `spinning={false}` e `isStatic={true}`.

## Spec Change Log

## Review Triage Log

### 2026-11-05 — Review pass
- verdicts: 24 findings — high 3, medium 17, low 3, false 1, maybe-false 0
- [false] [reject] `LottieTrophy` short-circuits before `getTrophyAnimationConfig` for approved Lottie trophies — Refuted: the spec's `Never` constraint explicitly forbids removing or breaking approved Lottie playback in `LottieTrophy.tsx`, while `AnimatedSeasonalTrophy` is used directly in `SurpriseTrophyCard`, `TrophyAlbumView`, and `TrophyDetailModal`, and `LottieTrophy`'s SVG fallback covers all 114 liturgical trophies, unapproved seasonal trophies, and infinite series.
- [high] [patch] `effectColor` overrides `color` on locked/incomplete trophies and renders active particles in static mode — Patched so `isStatic === true` preserves `effectColor = color`, passes `animationConfig={undefined}` to `TrophyDecorationFactory`, and suppresses particles via `resolveActiveParticleCount`.
- [medium] [patch] Invalid React Native `<Text>` color `"auto"` in `AnimatedSeasonalTrophy.tsx:351` — Patched to `isLiturgical ? { color: "#2D3748" } : undefined`.
- [high] [patch] Unsupported 3D transforms (`perspective`, `rotateY`) on `<G>` in `react-native-svg` and conflated `"spin"` / `"float"` motion in `AnimatedSeasonalTrophy.tsx` — Patched by replacing `<AnimatedG animatedProps={spinningProps}>` with standard `<G>` and applying `"spin"` (`scaleX = Math.cos(p * 2 * Math.PI)`) on the outer `Animated.View` wrapper.
- [medium] [patch] Discontinuous particle jump on `"spin"` trophies in `AnimatedTrophy.tsx` — Patched by driving `particleStyle` from smooth oscillating `effectProgress.value` instead of linear `motionProgress.value`.
- [medium] [patch] `secondaryEffect: "sparkle"` and `"trail"` visually indistinguishable from `"glow"` in `AnimatedSeasonalTrophy` and `AnimatedTrophy` — Patched with distinct branches for `"glow"`, `"sparkle"`, `"trail"`, `"ripple"`, and `"none"` and removed unreachable particle fallback branch.
- [medium] [patch] Missing `cancelAnimation` cleanup and missing `useAnimatedStyle` dependency arrays in `AnimatedSeasonalTrophy.tsx` and `AnimatedTrophy.tsx` — Patched by adding `cancelAnimation` in `useEffect` cleanup and explicit dependency arrays on all `useAnimatedStyle` calls.
- [medium] [patch] Duplicate SVG `<LinearGradient>` / `<RadialGradient>` ID collisions across simultaneously mounted trophy instances — Patched by generating instance-unique gradient IDs with `React.useId()`.
- [medium] [patch] Dropped `onPress` handler in `LottieTrophy` fallback path — Patched by wrapping the fallback element in `<Pressable onPress={onPress}>` when `onPress` is provided.
- [medium] [patch] Substring fallback ordering bug in `getTrophyAnimationConfig` — Patched by evaluating `monthly_`, `seasonal_`, `lt_`, and `dizimo_` prefixes before `.includes("transaction")` / `.includes("dizimo")`.
- [low] [patch] Redundant inline `getTrophyAnimationConfig` calls creating new object references on every render in `SurpriseTrophyCard`, `TrophyAlbumView`, and `TrophyDetailModal` — Patched by memoizing `activeConfig` inside `AnimatedTrophy` and `AnimatedSeasonalTrophy` and omitting redundant inline `config` props.
- [medium] [patch] `Object.prototype` keys (`"constructor"`, `"toString"`, `"valueOf"`) match `TROPHY_ANIMATION_CONFIGS[normalizedId]` without `hasOwnProperty` guard — Patched with `Object.prototype.hasOwnProperty.call(TROPHY_ANIMATION_CONFIGS, normalizedId)`.
- [medium] [patch] `AnimatedSeasonalTrophy.tsx` does not reset shared values before `withRepeat` when transitioning from `isStatic=true` to `isStatic=false` — Patched by resetting `floatY.value = 0` and `glowOpacity.value = 0.3` before starting `withRepeat`.
- [medium] [patch] `AnimatedTrophy.tsx` does not reset `motionProgress.value` to `0` before `withRepeat` when `motionSpeed` changes while mounted — Patched by resetting `motionProgress.value = 0` and `effectProgress.value = 0` before starting `withRepeat`.
- [low] [patch] `AnimatedSeasonalTrophy.tsx` initializes `scaleValue` to `0.9` instead of `isStatic ? 1 : 0`, causing a first-frame flash — Patched to `useSharedValue(isStatic ? 1 : 0)`.
- [medium] [patch] Hardcoded `LinearGradient id="trophy_gradient"` in `AnimatedSeasonalTrophy.tsx` collides on Web — Patched via `React.useId()`.
- [medium] [patch] `LottieTrophy.tsx` ignores `onPress` in fallback branches — Patched by wrapping fallback in `<Pressable onPress={onPress}>`.
- [medium] [patch] `secondaryEffect === 'sparkle'` / `'trail'` fall through to default `'glow'` style — Patched with dedicated `useAnimatedStyle` branches.
- [low] [patch] `options.rarity` ignored for prefix-matched fallback IDs in `getTrophyAnimationConfig` — Patched by applying `applyRarityOverrides` when `options?.rarity` is passed to prefix fallback branches.
- [medium] [patch] Missing fallback verification for `savings_*`, `wants_*`, `dizimo_*`, `seasonal_family`, `seasonal_party`, and `rarity: "silver"` in `trophyAnimationConfigs.test.ts` — Patched by adding unit tests for all fallback branches and `Object.prototype` keys.
- [medium] [patch] Catalog tests bypass `getTrophyAnimationConfig(trophy.id)` and omit `particleCount <= 6` and defensive clone checks — Patched by asserting `getTrophyAnimationConfig(trophy.id)` equality, `particleCount <= 6`, and immutability of `TROPHY_ANIMATION_CONFIGS`.
- [medium] [patch] Static mode particle suppression and clamping have no automated test coverage — Patched by extracting pure helper `resolveActiveParticleCount` in `packages/gamification/src/trophyAnimationConfigs.ts` and testing it in `trophyAnimationConfigs.test.ts` (Reanimated component tree rendering is recorded in `deferred`).
- [high] [patch] Static mode (`isStatic` / `spinning={false}`) shrinks `"pulse"` trophies (`scale = 0.94` / `0.95`) instead of keeping `scale = 1` — Patched by short-circuiting `trophyStyle` and `floatingStyle` to `scale: 1` when `!spinning` / `isStatic`.
- [medium] [patch] `secondaryEffect: "sparkle"` and `"glow"` execute the exact same visual branch in both trophy components — Patched with distinct visual transforms and opacity curves.

## Verification

**Commands:**
- `./node_modules/.bin/vitest run packages/gamification/__tests__/trophyAnimationConfigs.test.ts packages/gamification/__tests__/gamification.test.ts` -- expected: todos os testes de gamificação e configs de animação passam com exit code 0.

## Auto Run Result

**Summary of Implemented Change:**
Implementada a **Tarefa 08 — Animação Individual para Cada Troféu**, criando o catálogo completo `TROPHY_ANIMATION_CONFIGS` (197 configurações individuais explícitas cobrindo 100% de `ALL_ACHIEVEMENTS`, `MONTHLY_TROPHIES`, `ALL_SEASONAL_TROPHIES` e `ALL_LITURGICAL_TROPHIES`), os 9 presets temáticos de categoria (`CATEGORY_ANIMATION_PRESETS`), os helpers `getTrophyAnimationConfig` e `resolveActiveParticleCount`, e a refatoração de `AnimatedTrophy.tsx`, `AnimatedSeasonalTrophy.tsx`, `TrophyDecorationFactory.tsx` e `LottieTrophy.tsx` para animar movimento principal (`spin`, `float`, `bounce`, `shake`, `pulse`, `swing`), efeito secundário (`glow`, `sparkle`, `trail`, `ripple`, `none`), entrada (`scale`, `fade`, `slide`, `flip`) e partículas temáticas (`stars`, `hearts`, `fire`, `snow`, `confetti`, `none`).

**Files Changed:**
- `packages/gamification/src/trophyAnimationConfigs.ts` — Criado módulo com `TrophyAnimationConfig`, `TROPHY_ANIMATION_CONFIGS` (197 troféus), `CATEGORY_ANIMATION_PRESETS`, `getTrophyAnimationConfig` e `resolveActiveParticleCount`.
- `packages/gamification/index.ts` — Re-exportados os tipos, constantes e helpers de `src/trophyAnimationConfigs.ts`.
- `src/constants/trophyAnimationConfigs.ts` — Criado ponto de acesso em `src/constants/` re-exportando `@packages/gamification/src/trophyAnimationConfigs`.
- `src/components/gamification/AnimatedTrophy.tsx` — Refatorado para aceitar `id` e `config`, suportar todos os movimentos, efeitos secundários, entradas e partículas, IDs únicos de gradiente com `useId()`, modo estático estável e cleanup com `cancelAnimation`.
- `src/components/gamification/AnimatedSeasonalTrophy.tsx` — Refatorado para consumir `TrophyAnimationConfig`, animar todos os modos de movimento/efeito/entrada/partículas, preservar cor neutra e suprimir partículas quando `isStatic={true}`, e usar `useId()` no gradiente SVG.
- `src/components/gamification/TrophyDecorationFactory.tsx` — Estendido com `animationConfig?: TrophyAnimationConfig` para coordenar acentos SVG (`ripple` e `trail`) com o efeito secundário do troféu.
- `src/components/gamification/LottieTrophy.tsx` — Atualizado fallback SVG para repassar `id`, `config` e `<Pressable onPress={onPress}>`.
- `packages/gamification/__tests__/trophyAnimationConfigs.test.ts` — Criada suíte de 15 testes unitários cobrindo 100% do catálogo, invariantes, imutabilidade, fallbacks por prefixo/raridade/protótipo e `resolveActiveParticleCount`.
- `ROADMAP.md` — Atualizado progresso das Tarefas 08 e 09.

**Review Findings:**
- **Patches Applied (23 findings across 3 high, 17 medium, 3 low):**
  - Preservação de `color` neutro e supressão de partículas (`resolveActiveParticleCount`) e `scale: 1` quando `isStatic={true}` ou `spinning={false}`.
  - Remoção de transforms 3D inválidos (`perspective`/`rotateY`) em `<G>` do `react-native-svg` e implementação de `"spin"` via `scaleX = Math.cos(p * 2 * Math.PI)` no `Animated.View`.
  - Geração de IDs únicos de gradiente SVG por instância com `React.useId()`.
  - Adição de `cancelAnimation` no cleanup dos `useEffect` e arrays de dependências explícitos em todos os `useAnimatedStyle`.
  - Distinção visual entre `"glow"`, `"sparkle"`, `"trail"`, `"ripple"` e `"none"`, e partículas suaves dirigidas por `effectProgress`.
  - Proteção com `Object.prototype.hasOwnProperty.call`, ajuste na ordem de precedência de prefixos e aplicação de overrides de `rarity` nos fallbacks de `getTrophyAnimationConfig`.
  - Suporte a `onPress` no fallback de `LottieTrophy` e remoção de `color: "auto"` inválido no React Native.
  - Expansão da suíte `trophyAnimationConfigs.test.ts` (15 testes passando).
- **Deferred (1 item):**
  - Testes automatizados de árvore de componentes React Native Reanimated para `AnimatedTrophy` e `AnimatedSeasonalTrophy` (lógica pura extraída e testada via `resolveActiveParticleCount` e `getTrophyAnimationConfig`).
- **Rejected (1 finding — 1 false):**
  - Refutado apontamento sobre `LottieTrophy` priorizar assets Lottie aprovados (`APPROVED_LOTTIE`), pois a restrição `Never` da spec exige preservar os Lotties já aprovados.

**Follow-up Review Recommendation:**
- `followup_review_recommended: true` — Recomendado pois o ciclo de review aplicou patches em 3 findings `high` e 17 `medium`. Risco residual: animações visuais Reanimated em `AnimatedTrophy` e `AnimatedSeasonalTrophy` dependem de inspeção visual em dispositivo/emulador para ajuste fino estético individual.

**Verification Performed:**
- `./node_modules/.bin/vitest run packages/gamification/__tests__/trophyAnimationConfigs.test.ts packages/gamification/__tests__/gamification.test.ts` (78 testes passando: 15 em `trophyAnimationConfigs.test.ts` + 63 em `gamification.test.ts`).

**Residual Risks:**
- Aprovação visual individual de cada animação em execução real no app conforme previsto na etapa de acompanhamento contínuo da Tarefa 08.
