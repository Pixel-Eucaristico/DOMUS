---
title: 'Gamificação: Feedback 50/30/20 sem Penalidade'
type: 'feature'
created: '2026-11-05'
status: 'done'
baseline_revision: '8dcc7f3b540810b01001fcc77468d4f279ac39b6'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O cálculo de XP de aderência orçamentária (`calculateBudgetAdherenceXp`) penaliza o usuário subtraindo pontos quando os gastos com Necessidades (>50%) ou Desejos (>30%) estouram o teto, gerando frustração em vez de incentivar a disciplina financeira. Além disso, falta feedback educativo no app orientando sobre a regra 50/30/20 e bônus por melhora mês a mês.

**Approach:** Eliminar completamente qualquer redução punitiva de XP em `calculateBudgetAdherenceXp`, mantendo o ganho sempre não-negativo ($\ge 0$). Adicionar bonificação por evolução na comparação com o mês anterior (`previousBudget`), fornecer um helper estruturado de feedback educativo (`getBudgetFeedback`) e exibir um card educativo intuitivo e acolhedor na seção de Orçamento 50/30/20 na Home.

## Boundaries & Constraints

**Always:**
- Garantir que `calculateBudgetAdherenceXp` retorne sempre um valor inteiro maior ou igual a zero (sem deduções punitivas de XP).
- Manter o bônus de saúde financeira (+5 XP) para orçamentos dentro dos limites (necessidades $\le 50\%$ e desejos $\le 30\%$) e bônus de poupança (+10 XP para $\ge 20\%$).
- Conceder bônus por evolução mensal (+5 XP) quando a aderência do mês atual for superior à do mês anterior.
- Fornecer aviso educativo acolhedor explicando a regra 50/30/20 na UI, sem bloqueios ou penalidades.
- Manter testes unitários e de integração existentes com 100% de sucesso.

**Never:**
- Nunca subtrair XP ou retornar números negativos em `calculateBudgetAdherenceXp`.
- Não alterar as regras de agrupamento de categorias nem o cálculo base do 50/30/20 em `packages/domain/src/transactions.ts`.
- Não bloquear o cadastro ou a navegação do usuário quando os limites forem excedidos.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Divisão ideal 50/30/20 | `needs: 50%, wants: 30%, savings: 20%` | Retorna 15 XP (5 saúde + 10 poupança). Feedback `perfect`. | Sem erro |
| Estouro de Necessidades (>50%) | `needs: 65%, wants: 20%, savings: 15%` | Retorna 3 XP (savings > 0). Zero dedução de XP. Feedback `needs_attention`. | Sem erro |
| Estouro de Desejos (>30%) | `needs: 40%, wants: 45%, savings: 15%` | Retorna 3 XP (savings > 0). Zero dedução de XP. Feedback `needs_attention`. | Sem erro |
| Evolução Mês a Mês | Mês atual `score: 85`, Mês anterior `score: 70` | Concede bônus adicional de +5 XP por evolução. `improved: true`. | Sem erro |
| Sem transações no mês | Todos valores zerados | Retorna 0 XP. Feedback `empty`. | Sem erro |

</intent-contract>

## Code Map

- `packages/gamification/src/xpEngine.ts` -- Motor de cálculo de XP; remoção de penalidades, suporte a `previousBudget` e função `getBudgetFeedback`.
- `packages/gamification/src/types.ts` -- Tipos para `BudgetFeedback` e fontes adicionais de feedback.
- `src/hooks/useGamificationEffects.ts` -- Cálculo do orçamento do mês anterior e despacho com bônus de evolução.
- `src/components/budget/BudgetFeedbackCard.tsx` -- Componente UI educativo explicando a regra 50/30/20 e destacando progresso positivo.
- `app/(tabs)/index.tsx` -- Integração do `BudgetFeedbackCard` abaixo das barras de orçamento 50/30/20.
- `packages/gamification/__tests__/gamification.test.ts` -- Testes unitários para `calculateBudgetAdherenceXp` sem penalidade e com bônus de evolução.

## Tasks & Acceptance

**Execution:**
- `packages/gamification/src/types.ts` -- Adicionar interface `BudgetFeedback` com estados (`perfect`, `good`, `needs_attention`, `empty`), mensagens e flags de evolução.
- `packages/gamification/src/xpEngine.ts` -- Refatorar `calculateBudgetAdherenceXp` removendo penalidades e implementando bônus por melhoria mensal (`previousBudget`); implementar `getBudgetFeedback`.
- `src/hooks/useGamificationEffects.ts` -- Obter o orçamento do mês anterior (`prevBudget`) ao calcular o ganho de XP orçamentário.
- `src/components/budget/BudgetFeedbackCard.tsx` -- Criar componente visual educativo exibindo status amigável e link para entender a regra 50/30/20.
- `app/(tabs)/index.tsx` -- Exibir `BudgetFeedbackCard` na seção Orçamento 50/30/20 com `previousBudget` do mês selecionado.
- `packages/gamification/__tests__/gamification.test.ts` -- Atualizar suíte de testes validando ausência de penalidade e bônus de melhora mensal.

**Acceptance Criteria:**
- Given um orçamento com Necessidades acima de 50%, when `calculateBudgetAdherenceXp` é chamado, then o retorno é $\ge 0$ e nenhum XP é debitado.
- Given um orçamento com histórico do mês anterior onde a aderência melhorou, when o XP é calculado, then o bônus de evolução mensal (+5 XP) é adicionado ao montante.
- Given a tela inicial com transações no mês selecionado, when o usuário visualiza o card 50/30/20, then o `BudgetFeedbackCard` exibe orientação educativa acolhedora sem tons punitivos.

## Spec Change Log

<!-- Append-only. Vazio na criação inicial da spec. -->

## Review Triage Log

### Review Pass 1
- Verdict counts: high: 0, medium: 0, low: 0, false: 5, maybe-false: 0

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| Possível ausência de fallback para `theme.warning` ou `theme.success` em `BudgetFeedbackCard` | false | dismiss | Todos os acessos utilizam operadores de coalescência nula com cores de fallback válidas (`#F59E0B` e `#10B981`). |
| Risco de índice inválido no cálculo do mês anterior para Janeiro (`selectedMonth === 0`) | false | dismiss | A lógica realiza o wrap corretamente para mês 11 (Dezembro) decrementando `selectedYear - 1`. |
| Possibilidade de bônus de evolução espúrio quando o mês anterior não teve nenhuma atividade | false | dismiss | A verificação exige expressamente que o orçamento anterior possua despesas, poupança ou renda maior que zero antes de comparar aderência. |
| Garantia de números inteiros não negativos no cálculo de XP | false | dismiss | A função encerra com `Math.max(0, Math.round(xp))`, impedindo inteiramente números negativos ou fracionários. |
| Fechamento correto do modal `FinancialTooltip` ao dispensar | false | dismiss | A prop `onClose={() => setShowTooltip(false)}` desativa a visibilidade sem vazamento de estado. |

## Auto Run Result

Status: done
Baseline revision: 8dcc7f3b540810b01001fcc77468d4f279ac39b6
Head revision: uncommitted working tree
Diff file: /tmp/bmad-diff-17-gamificacao-feedback-50-30-20.patch
Review passes: 1

## Design Notes

A filosofia de gamificação do DOMUS foca na construção de hábitos duradouros e reforço positivo. A substituição da penalidade por um card educativo e a introdução do bônus de evolução mensal garantem que o usuário que está tentando reorganizar sua vida financeira se sinta incentivado a continuar registrando e melhorando, em vez de desistir ao ver seus pontos caírem.

## Verification

**Commands:**
- `./node_modules/.bin/vitest run packages/gamification/__tests__/gamification.test.ts` -- expected: Todos os testes passando sem erros.
- `./node_modules/.bin/vitest run packages/__tests__/integration.test.ts` -- expected: Testes de integração passando sem regressões.
