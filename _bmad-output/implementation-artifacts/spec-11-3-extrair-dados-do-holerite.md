---
title: 'Story 11.3: extrair os dados do holerite a partir do texto do OCR'
type: 'feature'
created: '2026-10-22'
status: 'done'
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
- [x] `packages/parsers/src/payslipParser.ts` e export em `packages/parsers/index.ts`
- [x] `packages/parsers/__tests__/payslipParser.test.ts` cobrindo a matriz

**Acceptance Criteria:**
- Given o texto de um holerite lido por OCR, when o parser o processa, then devolve os campos da matriz, sem o nome do funcionário
- Given um resultado do Vision OCR, when normalizado, then sai no mesmo formato

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| CPF no nome de rubrica e da empresa; CNPJ do Vision sem checar 14 dígitos | high | Sondas `CPF: 123.456.789-09 Salário Base 3.000,00`. **patch**: apagar CPF do texto antes de ler; CNPJ só com 14 dígitos válidos (dígito verificador), devolvido sempre no mesmo formato. ✅ aplicado (testes em `payslipParser.test.ts`). |
| Nome do funcionário escapa (linha de dados após cabeçalho de tabela; rótulo e nome em linhas separadas) | high | **patch**: a linha seguinte a um rótulo/cabeçalho de nome sempre é apagada; teste com variações de rótulo ("Nome:", "Empregado:", "Nome do Empregado"). ✅ aplicado (testes em `payslipParser.test.ts`). |
| "Servidor"/"Colaborador" dentro de rubrica apaga a linha | medium | **patch**: só rótulo no início da linha. ✅ aplicado (testes em `payslipParser.test.ts`). |
| Adiantamento quinzenal virando desconto e bruto em dobro | high | **patch**: holerite de adiantamento reconhecido; adiantamento é provento nesse caso. ✅ aplicado (testes em `payslipParser.test.ts`). |
| "Líquido de Férias" lido como líquido | high | **patch**: o líquido é o rótulo de total (Valor Líquido, Líquido a Receber, Total Líquido). ✅ aplicado (testes em `payslipParser.test.ts`). |
| Rótulos dos totais em linhas e valores depois (ordem do ML Kit) | high | **patch**. ✅ aplicado (testes em `payslipParser.test.ts`). |
| "Total de Deduções"; cabeçalho com valor faltando | medium | **patch**. ✅ aplicado (testes em `payslipParser.test.ts`). |
| Bruto desconhecido sem aviso | medium | **patch**: aviso e confiança menor. ✅ aplicado (testes em `payslipParser.test.ts`). |
| Dois holerites na mesma página misturados | medium | **patch**: ler só o primeiro e avisar. ✅ aplicado (testes em `payslipParser.test.ts`). |
| Rubrica desconhecida descartada sem aviso, confiança 1 | medium | **patch**: linha com valor que não é base nem total entra como provento ou desconto pela coluna/sinal quando der, senão aviso "rubricas não reconhecidas" e confiança menor. ✅ aplicado (testes em `payslipParser.test.ts`). |
| "Período Aquisitivo", admissão e coluna "Referência" virando competência; competência 13/2026 caindo para a linha seguinte | high/medium | **patch**: rótulos ignorados; "13/AAAA" = 13º salário → competência `AAAA-12` com aviso. ✅ aplicado (testes em `payslipParser.test.ts`). |
| Banco vence a empresa; CNPJ sem pontuação em vários formatos | medium/low | **patch**. ✅ aplicado (testes em `payslipParser.test.ts`). |
| Valor com sinal de menos à esquerda; "Total de Descontos" dentro dos descontos do Vision | low | **patch**. ✅ aplicado (testes em `payslipParser.test.ts`). |
| Testes faltando: bruto pela soma dos proventos, aviso de descontos que não conferem, crédito com mês por extenso, intervalo que cruza meses | medium (gap) | **patch**. ✅ aplicado (testes em `payslipParser.test.ts`). |
| Valor da rubrica na linha de baixo | low | **defer**: o usuário corrige na revisão (Story 11.5). |

## Verification

- `npx vitest run packages/parsers` e `npx vitest run`, `npx tsc --noEmit` sem falhas novas

## Implementation Notes

- Base: `payslipParser.ts` e o teste do commit `850aa1b` (só essas peças), reescritos na rodada de revisão. `employee` saiu do tipo, da extração, do `PayslipOCRSchema` e do prompt do `VisionOCRService` (o Zod descarta o campo se o modelo ainda o devolver).
- Privacidade: CPF (número e rótulo) é apagado de todas as linhas antes da leitura (também nos nomes do Vision). O nome do funcionário é apagado quando o rótulo está no início da linha (antes dele só código/matrícula), de modo que "INSS EMPREGADO" e "Contribuição Servidor" continuam rubricas. Rótulo sozinho ou cabeçalho de tabela ("Código  Nome do Funcionário  CBO") apaga sempre a linha seguinte, mesmo com ":" ou valor. Toda remoção troca o texto por espaços do mesmo tamanho, para preservar as colunas.
- CNPJ: aceita `CNPJ/MF`, `C.N.P.J.`, `CNPJ nº`, 14 dígitos e espaços do OCR; valida os dígitos verificadores e devolve sempre `00.000.000/0000-00`. Inválido (texto ou Vision) é omitido com aviso. `normalizeCnpj` exportado.
- Competência: só por rótulo (competência, mês/ano, referência fora de cabeçalho de tabela, período exceto aquisitivo/concessivo/gozo) ou mês por extenso/abreviado sem rótulo (com ano de 4 dígitos ou "/"), fora de linhas de pagamento (pago em, data/dt de pagamento/pagto/pgto/crédito, crédito em, pagamento em), de outras datas (admissão etc.) e de endereços/dias por extenso ("XV de Novembro"). Vale o primeiro valor depois do rótulo; rótulo ilegível não usa a linha seguinte (só rótulo sozinho usa). `13/AAAA` e "13º Salário AAAA" → `AAAA-12` com aviso; data ISO completa do Vision → mês; intervalo que cruza meses → null.
- Totais: líquido só por rótulo de total (Valor Líquido, Líquido a Receber/Pagar, Total/Salário Líquido, "Líquido" no início da linha); "Líquido de Férias" é desconto. "Total de Deduções", "TOTAIS a b [c]", valor antes do rótulo, blocos do ML Kit (k rótulos e depois k valores) e quadro de totais com valor faltando (associa pela posição, com aviso). Bases nunca são desconto; FGTS em `fgts`; "Salário Base" no rodapé de bases é informativo.
- Rubricas: reembolso → provento; palavras de desconto/provento; sinal de menos (à esquerda ou à direita) → desconto; senão pela posição da coluna Vencimentos/Descontos do cabeçalho; senão aviso "Rubricas não reconhecidas" e confiança ≤ 0,85. Rubricas iguais contam duas vezes. Holerite de adiantamento: o adiantamento é provento.
- Valores: formato brasileiro e com ponto, sinal, O→0 e l/I→1 dentro de números, milhar com espaço quando é o único valor da linha. Líquido negativo fica como lido, com aviso e confiança ≤ 0,3.
- Confiança e avisos: bruto desconhecido → aviso e confiança ≤ 0,5; totais que não fecham → ≤ 0,6; líquido > bruto → ≤ 0,3; dois holerites na página → só o primeiro (corta depois dos totais do primeiro) com aviso e ≤ 0,8. Avisos em pt-BR com acentos, exportados em `PAYSLIP_WARNINGS`.
- Desempenho: regex sem retrocesso quadrático (trim do fim por laço; quantificadores limitados); testes com linhas de 100 mil caracteres abaixo de 200 ms.
- Testes de proteção conferidos por mutação: desligar `redactEmployee`, os rótulos de pagamento, `wipeCpf`, os rótulos de outras datas, endereços, dias por extenso, dígito verificador do CNPJ e a regra de rótulo no início da linha faz pelo menos um teste falhar.
- Verificação (raiz do repo): `npx vitest run` → 56 arquivos, 1118 testes, todos passando (105 em `payslipParser.test.ts`); `npx tsc --noEmit` → saída vazia, código 0.
