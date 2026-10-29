---
title: 'Stories 2.1 a 2.4 — suíte de testes sem falhas (fechamento)'
type: 'chore'
created: '2026-10-29'
status: 'done'
baseline_commit: 'c04ab2a'
---

## Intent

As Stories 2.1 a 2.4 descrevem falhas da suíte medidas antes do commit `ab93203` (15/07/2026, "fix+test: suite 100% verde"). Esse commit já está na `dev` e resolveu as quatro; esta nota registra a evidência e a decisão do dono que faltava (2.1), sem mudar código.

## Evidência por story

| Story | Critério | Situação na `dev` (`c04ab2a`) |
|---|---|---|
| 2.1 XP | Testes de `packages/gamification` e `packages/__tests__` passam; nenhuma regra muda sem decisão registrada | `ab93203` alinhou os testes ao motor (5/10/30/10/15/50; aderência +5/+10/−10). O motor não mudou. **Decisão do dono (29/10/2026): valem os valores atuais**, registrada em `docs/decisoes-do-dono.md`. |
| 2.2 SEFAZ | 9 testes de `sefazParser.test.ts` passam; NF-e real continua lida | `ab93203` corrigiu o parser (regex numérica exigia dígito; data ISO) e os testes passaram a usar o formato plano do `SefazParseResult`. A leitura real no app entra no checklist da Story 1.3. |
| 2.3 IA | 3 testes de erro HTTP passam; erro continua visível ao usuário | `ab93203` fez o `assertOk` tolerar `headers` indefinido e os testes esperarem as mensagens amigáveis. `ChatGPTOAuthAdapter` foi removido em `31499ae`. |
| 2.4 importInvoice e season | Sem falha por módulo ausente; teste de `season` independente da data | `importInvoice.test.ts` removido em `ab93203` (módulo não existe). `shouldEndSeason` recebe a data como argumento e os testes usam datas fixas: não dependem do relógio. |

## Verification

- `npx vitest run`: 99 arquivos e 2190 testes passando, nenhuma falha.
- `npx tsc --noEmit`: 0 erros.
