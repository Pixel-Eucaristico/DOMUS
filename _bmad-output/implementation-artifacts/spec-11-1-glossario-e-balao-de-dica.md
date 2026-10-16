---
title: 'Story 11.1: Criar o glossário financeiro e o balão de dica'
type: 'feature'
created: '2026-10-16'
status: 'done'
baseline_commit: '471fb7f8f4e442f3f43302cbe4d1011991aa87b6'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O app tem um glossário só dentro de `src/components/ai/FinancialTooltip.tsx` (`FINANCIAL_TOOLTIPS`, 5 termos) e o modal não é usado em lugar nenhum; não há um ícone de dica ancorado nem como achar termos num texto livre (FR-25).

**Approach:** Criar `src/constants/financialGlossary.ts` (fonte única: termos com título e explicação em pt-BR e `detectGlossaryTerms(texto, limite)` que acha termos sem confundir palavras parecidas), fazer o `FinancialTooltip` reutilizá-lo e criar `src/components/shared/InfoTip.tsx`: ícone "i" que abre um balão ancorado (mede a posição do ícone; abre abaixo, ou acima sem espaço; fecha ao tocar fora), sem dependência nova. Testes da detecção. Colocar as dicas nas telas é a Story 11.2.

</frozen-after-approval>

## Implementation Notes

- `src/constants/financialGlossary.ts`: 11 termos (50/30/20, Selic, reserva de emergência, juros compostos, diversificação, salário bruto, salário líquido, descontos do holerite, FGTS, crédito adicional do CDB, XP e nível) e `detectGlossaryTerms` (normaliza acentos e caixa; padrões com limite de palavra).
- `src/components/ai/FinancialTooltip.tsx`: `FINANCIAL_TOOLTIPS` passa a ser o glossário compartilhado.
- `src/components/shared/InfoTip.tsx`: `measureInWindow` no ícone; balão abaixo, ou acima quando a altura estimada não cabe; seta apontando o ícone; `Modal` transparente fecha ao tocar fora; sem dependência nova.
- Reaproveita o desenho de uma implementação anterior descartada (feita fora do BMAD), conferido contra a `dev`.
- `npx vitest run src/constants`: 4 passaram; `npx tsc --noEmit`: 0 erros; `eslint`: limpo.
- Após a revisão: posicionamento extraído para `src/components/shared/infoTipPlacement.ts` (puro, 6 testes): mede a altura real do balão (`onLayout`, invisível até medir), escolhe o lado que cabe ou o maior e limita a altura com rolagem; modal com `statusBarTranslucent`/`navigationBarTranslucent` como os demais modais do app; toque no balão não fecha; balão acessível (`accessibilityViewIsModal`, `accessibilityLiveRegion`).
- Glossário: textos de descontos, INSS, FGTS e reserva corrigidos; padrões de `50/30/20`, reserva emergencial e diversificação ajustados; faixa de acentos escrita como `\u0300-\u036f`; `FINANCIAL_TOOLTIPS` mantém o tipo das chaves.
- O `npx tsc --noEmit` sai com 0 erros na `dev` atual (a nota do `AGENTS.md` sobre centenas de erros está desatualizada).
- Conferência visual do balão fica para a Story 11.2, quando ele entra nas telas.

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Modal sem `statusBarTranslucent` desloca o balão no Android | medium | `measureInWindow` conta a barra de status; os outros modais (`ScreenIntroModal`, `AnalyticsConsentModal`) usam translúcido. **patch**. |
| Altura fixa de 140 pode tirar o balão da tela | medium | Sem medição real nem `maxHeight`. **patch**: `onLayout`, lado que cabe ou maior, `maxHeight` e rolagem. |
| Cálculo de posição sem testes | medium | **patch**: função pura e 6 testes. |
| Textos imprecisos (descontos, INSS, FGTS, "3-6") | medium | Texto educativo ao usuário. **patch**. |
| Padrões e testes de detecção fracos | medium | "150/30/200" casava; "diversificada" e "reserva emergencial" não. **patch** com testes de quase-acertos, limite e conjunto. |
| Toque no balão fecha | low | Correção direta. **patch**. |
| Acessibilidade do balão | low | Correção direta. **patch**. |
| Regex com caracteres invisíveis | low | **patch**: `\u0300-\u036f`. |
| `FINANCIAL_TOOLTIPS` com tipo amplo | low | **patch**. |
| `last_updated` voltou no tempo | low | **patch** no sprint-status. |
| Medição zerada / rotação com balão aberto | low | Raro; correção acrescenta estado. rejeitado |
| "XP" sozinho aciona a dica | low | É desejado em respostas de gamificação. rejeitado |
| `tooltipsEnabled` no `InfoTip` | false | A 11.2 exige o controle só nos atalhos do chat. |
| "tsc 0 erros" sem prova / status da spec | false | `tsc` sai com 0; status acertado na finalização. |

