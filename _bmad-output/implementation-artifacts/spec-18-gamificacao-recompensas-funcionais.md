---
title: 'Gamificação: Recompensas Funcionais por Nível'
type: 'feature'
created: '2026-11-05'
status: 'done'
baseline_revision: 'c7a1b844a800be84588c71aaf8d2d1e55d505a43'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A evolução de níveis no DOMUS concede apenas prestígio cosmético (número do nível e toast de LEVEL_UP), sem utilidade prática perceptível, o que reduz o valor da progressão e o engajamento a médio e longo prazo.

**Approach:** Criar um motor de recompensas funcionais (`rewardsEngine.ts`) que desbloqueia utilidades reais e progressivas: Nível 2 desbloqueia o Card de Análise Rápida (proporção Desejos vs Necessidades); Nível 5 desbloqueia a Expansão Litúrgica (ícones sagrados e símbolos católicos adicionais); Nível 10 desbloqueia o Relatório Anual consolidado com personalização de metas orçamentárias. Integrar esses recursos às telas Home e Temporada com indicação clara de bloqueio/desbloqueio.

## Boundaries & Constraints

**Always:**
- Manter o cálculo de nível baseado exclusivamente em `totalXp` conforme a curva suave estabelecida na Tarefa 16.
- Recursos bloqueados devem indicar claramente o nível requerido e o que será destravado, sem impedir a navegação básica.
- Se o usuário estiver no nível requerido ou superior, a funcionalidade deve estar imediatamente utilizável sem necessidade de compra ou custo de XP.
- Preservar compatibilidade total para usuários católicos e laicos (o Nível 5 enriquece a experiência litúrgica quando `isCatholic=true` e fornece opções estéticas elegantes para todos).
- 100% de cobertura de testes unitários para a lógica de desbloqueio, análise rápida e relatório anual.

**Never:**
- Não cobrar XP para desbloquear recompensas (o desbloqueio é por nível alcançado, não por gasto de pontos).
- Não alterar as regras de persistência de eventos do domínio financeiro.
- Não bloquear transações, contas ou relatórios mensais normais do usuário por causa do nível.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nível 1 (Iniciante) | `level: 1` | `quick_analysis: locked`, `liturgical_expansion: locked`, `annual_report: locked`. Card exibe preview com trava. | Sem erro |
| Nível 2 (Desbloqueio Análise Rápida) | `level: 2` | `quick_analysis: unlocked`. Card exibe razão Desejos/Necessidades e diagnóstico. | Sem erro |
| Nível 5 (Expansão Litúrgica) | `level: 5` | `liturgical_expansion: unlocked`. Header passa a rotacionar entre 9 ícones litúrgicos. | Sem erro |
| Nível 10 (Relatório Anual e Metas) | `level: 10` | `annual_report_and_custom_budget: unlocked`. Modal de relatório anual e simulação de metas habilitados. | Sem erro |
| Análise Rápida sem despesas | `needs: 0, wants: 0` | Diagnóstico `empty` com convite amigável para registrar gastos. | Sem erro |

</intent-contract>

## Code Map

- `packages/gamification/src/rewardsEngine.ts` -- Definição de `LevelReward`, funções `getLevelRewards`, `isFeatureUnlocked`, `calculateQuickAnalysis` e `calculateAnnualReport`.
- `packages/gamification/src/types.ts` -- Interfaces `LevelReward`, `QuickAnalysisData`, `AnnualReportData`.
- `packages/gamification/index.ts` -- Exportação do motor de recompensas.
- `src/components/budget/QuickAnalysisCard.tsx` -- Componente do Nível 2 exibindo análise e proporção Desejos vs Necessidades.
- `src/components/shared/CatholicHeaderIcon.tsx` -- Ampliação dos ícones litúrgicos condicional ao Nível 5.
- `src/components/budget/AnnualReportModal.tsx` -- Modal do Nível 10 exibindo relatório de 12 meses e simulação de metas.
- `src/components/gamification/LevelRewardsTrack.tsx` -- Trilha visual de recompensas por nível na tela de Temporada.
- `app/(tabs)/index.tsx` -- Inclusão do `QuickAnalysisCard` na tela principal.
- `app/(tabs)/season.tsx` -- Inclusão da `LevelRewardsTrack` na aba Coleção/Atual.
- `packages/gamification/__tests__/rewardsEngine.test.ts` -- Testes unitários do motor de recompensas.

## Tasks & Acceptance

**Execution:**
- `packages/gamification/src/types.ts` -- Adicionar tipagens de recompensas (`LevelReward`, `QuickAnalysisData`, `AnnualReportData`).
- `packages/gamification/src/rewardsEngine.ts` -- Implementar verificação de desbloqueio, cálculo da análise rápida e agregação anual.
- `packages/gamification/index.ts` -- Exportar novas funções e tipos do pacote gamification.
- `src/components/budget/QuickAnalysisCard.tsx` -- Criar card interativo de Desejos vs Necessidades com estado bloqueado/desbloqueado.
- `src/components/shared/CatholicHeaderIcon.tsx` -- Suportar novos ícones sagrados (`rosary`, `candle`, `celtic_cross`, `crown`) para nível $\ge 5$.
- `src/components/budget/AnnualReportModal.tsx` -- Criar modal de relatório anual dos 12 meses e configurador de metas 50/30/20.
- `src/components/gamification/LevelRewardsTrack.tsx` -- Criar componente exibindo a trilha de níveis e recompensas.
- `app/(tabs)/index.tsx` -- Renderizar `QuickAnalysisCard` na Home.
- `app/(tabs)/season.tsx` -- Renderizar `LevelRewardsTrack` na tela de temporada.
- `packages/gamification/__tests__/rewardsEngine.test.ts` -- Criar suíte de testes unitários para o motor de recompensas.

**Acceptance Criteria:**
- Given um usuário no Nível 1, when visualiza a Home, then o `QuickAnalysisCard` indica que será desbloqueado no Nível 2.
- Given um usuário no Nível 2 ou superior, when visualiza a Home, then a análise comparativa entre Desejos e Necessidades é calculada e exibida.
- Given um usuário católico no Nível 5 ou superior, when visualiza os headers do app, then novos ícones litúrgicos (rosário, vela, cruz celta, coroa) participam da rotação.
- Given um usuário no Nível 10 ou superior, when abre o Relatório Anual, then visualiza o consolidado dos 12 meses e o simulador de metas orçamentárias.

## Spec Change Log

<!-- Append-only. Vazio na criação inicial da spec. -->

## Review Triage Log

### Review Pass 1
- Verdict counts: high: 0, medium: 0, low: 0, false: 7, maybe-false: 0

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| Risco de divisão por zero em `calculateQuickAnalysis` quando necessidades for 0 | false | dismiss | A razão utiliza guard `needs > 0 ? wants / needs : (wants > 0 ? 2.0 : 0)`, prevenindo divisão por zero. |
| Tratamento de `level` indefinido ou menor que 1 em `CatholicHeaderIcon` | false | dismiss | O componente define `level = 1` como valor padrão e avalia `level >= 5` com segurança. |
| Comportamento de `calculateAnnualReport` para anos sem nenhuma transação | false | dismiss | A função gera os 12 resumos mensais com valores zerados e `averageAdherenceScore: 0` sem gerar NaN. |
| Possibilidade de erro ao chamar `onOpenAnnualReport` em `LevelRewardsTrack` | false | dismiss | O botão somente é renderizado e executado se `onOpenAnnualReport` estiver definido. |
| Tipagem e exaustividade das chaves de recompensa em `FeatureKey` | false | dismiss | `FeatureKey` é definida como união literal estrita garantindo segurança estática de tipos. |
| Exportações completas de types e engines no ponto de entrada do pacote | false | dismiss | Todos os novos tipos e funções foram devidamente re-exportados em `packages/gamification/index.ts`. |
| Gerenciamento do ciclo de vida e fechamento de `AnnualReportModal` | false | dismiss | O modal é controlado pelo estado booleano `showAnnualReport` com callback `onClose` idempotente. |

## Auto Run Result

Status: done
Baseline revision: c7a1b844a800be84588c71aaf8d2d1e55d505a43
Head revision: uncommitted working tree
Diff file: /tmp/bmad-diff-18-gamificacao-recompensas-funcionais.patch
Review passes: 1

## Design Notes

Vincular níveis a ferramentas práticas transforma o progresso de XP em utilidade genuína para a disciplina financeira do usuário. O Nível 2 oferece reflexão imediata sobre gastos impulsivos versus essenciais; o Nível 5 valoriza a identidade espiritual e estética; o Nível 10 entrega planejamento estratégico anual e autonomia para adaptar a metodologia 50/30/20 à realidade familiar do usuário.

## Verification

**Commands:**
- `./node_modules/.bin/vitest run packages/gamification/__tests__/rewardsEngine.test.ts` -- expected: Testes de recompensas passando sem erros.
- `npx vitest run` -- expected: Toda a suíte de testes do repositório passando com 100% de sucesso.
