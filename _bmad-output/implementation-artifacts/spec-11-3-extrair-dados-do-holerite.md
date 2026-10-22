---
title: 'Story 11.3: extrair os dados do holerite a partir do texto do OCR'
type: 'feature'
created: '2026-10-22'
status: 'in-progress'
baseline_commit: 'e46d872'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-16.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O app não entende o texto de um holerite: para registrar salário e descontos o usuário teria de digitar tudo. As stories 11.4 a 11.6 (evento, captura e histórico) precisam de um formato único vindo tanto do OCR do aparelho quanto do Vision OCR da IA.

**Approach:** Um parser puro em `packages/parsers` (`parsePayslipText` para o texto do OCR e `normalizeVisionPayslip` para o resultado do Vision OCR) que devolve empresa, CNPJ, competência `YYYY-MM`, bruto, líquido, rubricas (proventos), descontos, FGTS, uma confiança de 0 a 1 e avisos em pt-BR. Partimos do parser que já existe no commit `850aa1b` (branch antiga, fora da `dev`), ajustado aos critérios abaixo.

## Boundaries & Constraints

**Always:** puro (AD-3): sem `react`, `expo` ou `react-native`, só TypeScript; nome do funcionário nunca devolvido (nem no Vision OCR); bases de cálculo (INSS, IRRF, FGTS, salário de contribuição) não entram como desconto; FGTS informativo, fora dos descontos; bruto ou líquido ausente calculado a partir dos outros valores, com aviso; confiança cai quando os totais não fecham ou o líquido passa do bruto; data de pagamento ("pago em", "data de crédito", datas DD/MM/AAAA soltas) nunca vira competência; valores em formato brasileiro (`5.340,91`) e com ponto decimal; avisos em pt-BR com acentos.

**Never:** salvar, despachar evento ou mexer em tela (Stories 11.4 e 11.5); enviar dado a serviço externo; alterar o `VisionOCRService` além do que a normalização precisa (o prompt não pede nome do funcionário).

## I/O & Edge-Case Matrix

| Cenário | Entrada | Saída |
|---|---|---|
| Holerite completo | texto com totais, rubricas e "Competência: 09/2026" | todos os campos, competência `2026-09`, confiança alta, sem aviso |
| Sem líquido | bruto e descontos | líquido = bruto − descontos + aviso |
| Sem bruto | líquido e descontos | bruto = líquido + descontos + aviso |
| Totais não fecham | bruto − descontos ≠ líquido | confiança menor + aviso |
| Líquido > bruto | leitura ruim | confiança baixa + aviso |
| Só data de pagamento | "Pago em 05/10/2026", sem competência | competência `null` + aviso "Competência não identificada" |
| Mês por extenso | "Setembro/2026", "SET/26" | `2026-09` |
| Base de cálculo | "Base INSS 5.000,00", "FGTS do mês 400,00" | não entra em descontos; FGTS em `fgts` |
| Linha com nome do funcionário | "Funcionário: 123 - Maria Silva" | nada do nome no resultado |
| Vision OCR | JSON do `PayslipOCRSchema` | mesmo formato, sem nome |

</frozen-after-approval>

## Code Map

- `packages/parsers/src/` -- parsers puros; `index.ts` exporta
- `packages/ai/src/vision/ocrSchema.ts` -- `PayslipOCRSchema` (entrada da normalização)
- `git show 850aa1b:packages/parsers/src/payslipParser.ts` e `...__tests__/payslipParser.test.ts` -- base a aproveitar

## Tasks & Acceptance

**Execution:**
- [ ] `packages/parsers/src/payslipParser.ts` e export em `packages/parsers/index.ts`
- [ ] `packages/parsers/__tests__/payslipParser.test.ts` cobrindo a matriz

**Acceptance Criteria:**
- Given o texto de um holerite lido por OCR, when o parser o processa, then devolve os campos da matriz, sem o nome do funcionário
- Given um resultado do Vision OCR, when normalizado, then sai no mesmo formato

## Verification

- `npx vitest run packages/parsers` e `npx vitest run`, `npx tsc --noEmit` sem falhas novas
