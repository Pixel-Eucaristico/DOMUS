---
title: 'Story 11.2: Mostrar dicas nas telas e atalhos no chat da IA'
type: 'feature'
created: '2026-10-16'
status: 'done'
baseline_commit: '68e0f9eac8d2d6fa6d19b3af4b764d94ecbe4c54'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O glossário e o `InfoTip` da Story 11.1 não aparecem em nenhuma tela, e a opção `tooltipsEnabled` das configurações da IA ("tooltips educativos no chat") não faz nada (FR-25).

**Approach:** Pôr um `InfoTip` ao lado do título "Orçamento 50/30/20" na tela inicial (`app/(tabs)/index.tsx`) e do rótulo "É dividendo/rendimento" (`src/components/transaction/TransactionBottomSheet.tsx`). No chat (`app/ai-chat.tsx`), sob cada resposta da IA, mostrar até 3 atalhos "O que é…?" para os termos que `detectGlossaryTerms` achar, abrindo o `FinancialTooltip`; só com `settings.tooltipsEnabled ?? true` ligado.

</frozen-after-approval>

## Implementation Notes

- `app/(tabs)/index.tsx`: `InfoTip term="50/30/20"` ao lado do título do orçamento.
- `src/components/transaction/TransactionBottomSheet.tsx`: `InfoTip term="limite_cdb"` ao lado de "É dividendo/rendimento".
- `app/ai-chat.tsx`: sob cada resposta da IA, até 3 atalhos "O que é …?" (`detectGlossaryTerms`, limite padrão 3) que abrem o `FinancialTooltip`; só com `settings.tooltipsEnabled ?? true`.
- Conferência visual (web, Playwright): o balão do 50/30/20 abre ancorado abaixo do ícone com a seta no ícone e fecha ao tocar fora. Os atalhos do chat não foram vistos na tela (exigem chave de IA).
- `npx tsc --noEmit`: 0 erros; `eslint` nos três arquivos: limpo.
- Após a revisão: regra dos atalhos em `glossaryShortcuts` (puro, em `financialGlossary.ts`, 4 testes: só IA, só com a opção, no máximo 3, nada sem termo); atalhos com `hitSlop` e papel de botão; dica do dividendo com texto próprio explicando o interruptor; título e rótulo em estilos nomeados com `flexShrink`; `FinancialTooltip` com `statusBarTranslucent` e rótulo no fechar.
- A dica na tela de holerites fica para a Story 11.6, que cria a tela.
- `npx vitest run src/constants src/components/shared`: 17 passaram; `npx tsc --noEmit`: 0 erros; `eslint`: limpo.

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Regra dos atalhos sem teste e não vista na tela | medium | Lógica inline no `renderBubble`. **patch**: `glossaryShortcuts` + 4 testes. |
| Dica do CDB não explica o interruptor | medium | `limite_cdb` fala do crédito em geral. **patch**: título e texto próprios no `InfoTip`. |
| Atalhos pequenos e sem papel de botão | low | ~20 dp. **patch**: `hitSlop` e `accessibilityRole`. |
| Título pode estourar em tela estreita | low | **patch**: `flexShrink`. |
| Estilos inline | low | **patch**: estilos nomeados. |
| Modal do chat sem translúcido e sem rótulo no fechar | low | **patch**. O modal centralizado no chat é intencional: o atalho não é um ícone ancorado. |
| Dica da tela de holerites ausente | low | A tela é da Story 11.6. **patch**: registrado acima. |
| Detecção a cada render | low | 11 regex por mensagem; custo desprezível. rejeitado |
| Spec sem critérios / status | false | Rota oneshot; status acertado na finalização. |

