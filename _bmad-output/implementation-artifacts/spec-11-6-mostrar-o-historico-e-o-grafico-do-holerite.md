---
title: 'Story 11.6: mostrar o histórico e o gráfico do holerite'
type: 'feature'
created: '2026-10-27'
status: 'in-progress'
baseline_commit: '9141e23'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-1-glossario-e-balao-de-dica.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-2-dicas-nas-telas-e-atalhos-no-chat.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-4-holerite-como-evento-local.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-5-capturar-revisar-e-salvar-o-holerite.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-16.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Depois da 11.5, o usuário captura, revisa e salva holerites, mas `/payslips` só mostra uma lista provisória, só leitura (decisão 3a da 11.5): competência, empresa e líquido. Não há resumo (último líquido, variação, média, percentual de descontos), gráfico, total por desconto, exclusão nem estado vazio explicativo. A dica da tela (`InfoTip`), adiada pela 11.2, também falta. O `PAYSLIP_DELETED` e o `deletePayslipEvent` (11.4) existem, mas nenhuma tela os usa. O commit `850aa1b` (fora da `dev`) tinha `summarizePayslips`, `PayslipChart` e exclusão, mas usa `Alert.alert`, soma o 13º com os mensais, não conhece vários empregadores na mesma competência e calcula o resumo sobre todo o histórico.

**Approach:** Um módulo puro em `packages/domain` (`payslipHistory.ts`, AD-3) monta, a partir de `domain.payslips`, o histórico por competência, o resumo, a série do gráfico e o total por desconto, sem `Date.now` e sem `react-native`. Os testes rodam no vitest. A tela `/payslips` troca a lista provisória por: botões de captura (os mesmos da 11.5), cartões de resumo, gráfico de barras líquido × bruto das últimas 12 competências, total por desconto do maior para o menor e a lista de holerites com exclusão. Sem holerite, a tela mostra um estado vazio que explica o recurso e mantém os três botões de captura. Excluir pede confirmação com `appConfirm` e despacha `deletePayslipEvent`. Nunca apaga a receita lançada: a confirmação avisa que ela continua no extrato. O gráfico usa `View`s simples (sem biblioteca, sem SVG, sem animação), como o `PayslipChart` do `850aa1b`. As dicas usam o `InfoTip` com os termos `salario_liquido`, `salario_bruto` e `descontos_holerite`, que já estão no glossário. A revisão, a captura e o salvar da 11.5 não mudam.

## Boundaries & Constraints

**Always:**
- **Estado por replay (AD-1/AD-2):** histórico, resumo, gráfico e totais são derivados de `domain.payslips` a cada render (`useMemo`), nunca persistidos. A tela só despacha `PAYSLIP_DELETED` (via `dispatchDomainEvent`), montado por `deletePayslipEvent(id, deviceId)`.
- **Lógica pura e testável:** `packages/domain/src/payslipHistory.ts` (sem `react`, `react-native`, `expo`, `Date.now`, `Math.random`; sem importar `packages/parsers`, regra do R4 da 11.5), exportado em `packages/domain/index.ts`. Funções sugeridas:
  - `buildPayslipHistory(payslips)`: competências mensais em ordem crescente. Cada uma tem `period`, `gross`, `net`, `deductionsTotal` (bruto − líquido), `count` e `ids`. Vários empregadores na mesma competência seguem a decisão 1. O 13º fica fora da série mensal (decisão 2).
  - `summarizePayslipHistory(history, payslips)`: retorna `latest`, `previous` (a competência mensal salva anterior, mesmo que não seja o mês seguido), `netChange`, `netChangePct` (`null` sem anterior ou com líquido anterior 0), `averageNet` e `deductionRate`, todos sobre a **janela** das últimas 12 competências mensais salvas. `deductionRate` é (Σbruto − Σlíquido) / Σbruto, e vale 0 com Σbruto 0.
  - `payslipChartSeries(history)`: as últimas 12 competências mensais, com `label` (`MM/AA`), `net`, `gross`, `netRatio` e `grossRatio` em [0, 1] sobre o maior bruto da janela. A divisão por zero é protegida.
  - `payslipDeductionTotals(payslips, window)`: soma por desconto, do maior para o menor (empate por nome), no período da decisão 3. A chave de agrupamento normaliza acentos, caixa, pontuação e espaços (base: `deductionKey` do `850aa1b`). O nome exibido é o do holerite mais recente do grupo. Quando um holerite tem bruto − líquido maior que a soma das linhas lidas (manual ou leitura incompleta), a diferença entra numa linha "Descontos sem detalhe", e diferença negativa é ignorada. Assim, o total por desconto fecha com o percentual de descontos.
  - `deletePayslipMessage(payslip, incomeStillExists)`: texto da confirmação.
  - Valores arredondados a 2 casas na saída (AD-7). Entrada não finita (dados antigos, D38) é ignorada sem lançar erro.
- **Resumo (cartões):**
  - **Último líquido:** líquido da competência mais recente (`formatCurrency`), com a competência (`formatPayslipPeriodLabel`).
  - **Variação:** valor e percentual em relação à competência anterior, com seta e cor (`theme.success` para alta, `theme.danger` para queda, neutro sem variação) e o texto "em relação a MM/AAAA". Sem competência anterior: "Primeiro holerite salvo".
  - **Média líquida:** média das competências da janela. O rótulo diz quantas entraram ("média de 7 competências").
  - **Descontos:** `deductionRate` em percentual (`toLocaleString("pt-BR")`, 1 casa).
  - Quando a competência mais recente tem mais de um empregador, o cartão mostra "N empregadores" (decisão 1a).
- **Gráfico:** barras pareadas por competência: bruto em contorno, líquido preenchido em `theme.primaryColor`, com legenda "Líquido" e "Bruto". São só as últimas 12 competências mensais salvas, sem barras vazias para meses sem holerite. Rótulo `MM/AA` sob cada barra. Tocar numa barra mostra, abaixo do gráfico, "MM/AAAA · líquido R$ … · bruto R$ …" (o padrão é a mais recente). Cada barra é um `Pressable` com `accessibilityLabel` ("09/2026: líquido R$ 4.000,00, bruto R$ 5.000,00"). Feito com `View`s de tamanho fixo dentro do cartão (altura ~140), **sem animação** e sem nenhuma `View` maior que a tela (GPU Mali, `docs/tour-crash-fixes.md`). Com uma competência, o gráfico mostra uma barra.
- **Total por desconto:** lista do maior para o menor, com nome e valor (`formatCurrency`). O título diz o período (decisão 3). Barra proporcional opcional, no estilo do `MiniChart`, feita com `View`.
- **Lista de holerites:** todos os holerites salvos, do mais novo ao mais antigo (mesma ordem da lista da 11.5), um por empregador. Cada item mostra a competência ou "13º salário AAAA", a empresa (ou o CNPJ, ou "Empresa não informada"), o bruto, o líquido e um botão de excluir (`Feather "trash-2"`, `hitSlop`, `accessibilityRole="button"`, `accessibilityLabel="Excluir holerite de 09/2026"`).
- **Excluir:** `appConfirm({ title: "Excluir holerite?", message: deletePayslipMessage(...), confirmLabel: "Excluir", destructive: true })`. Confirmado, despacha `deletePayslipEvent(p.id, deviceId ?? "local")`, toca `soundManager.play("success")` e nada mais. **A receita nunca é apagada** (AC da 11.6, 11.4 "sem efeito em saldo", decisão 2a da 11.5). Se `p.transactionId` aponta para um lançamento que ainda existe em `domain.transactions`, a mensagem acrescenta: "A receita “Salário (09/2026)” lançada por ele continua no extrato; exclua-a por lá, se quiser." (a descrição vem de `payslipIncomeDescription`). Uma trava (`createSingleFlight`) evita duas confirmações abertas pelo toque duplo. Excluir e gravar de novo a mesma vaga funciona, porque o salvar da 11.5 sempre gera id novo.
- **Estado vazio** (`domain.payslips` vazio): ícone, título "Acompanhe seu salário" e texto curto em pt-BR ("Fotografe o holerite ou preencha os valores para ver a evolução do salário líquido e bruto, a média e quanto vai para descontos como INSS e IRRF."). Os três botões de captura continuam na tela. Nenhuma promessa de privacidade além dos textos da Story 12.7: a foto pode ir ao provedor de IA pelo Vision OCR, e a receita lançada vai ao contexto da IA como "Salário (MM/AAAA)".
- **Só 13º salvo** (sem mensal): os cartões e o gráfico dão lugar a "Ainda não há holerite mensal para o resumo.". O total por desconto e a lista aparecem normalmente.
- **Dicas (`InfoTip`, fecha a pendência da 11.2):** `salario_liquido` ao lado de "Último líquido", `descontos_holerite` ao lado do título "Descontos" (ou do total por desconto) e `salario_bruto` na legenda do gráfico. Nenhum termo novo no glossário e nenhuma dependência nova.
- **Ordem da tela:** cabeçalho → texto curto e três botões de captura (como na 11.5) → resumo → gráfico → total por desconto → lista. A revisão (`PayslipReview`), o pendente do chat, o voltar do Android e o salvar da 11.5 continuam iguais.
- **Teclado:** a 11.6 não cria campo de texto. A revisão continua com o `KeyboardAwareScrollViewCompat` da 11.5.
- UI em pt-BR com acentos completos. Alertas e confirmações só por `appAlert`/`appConfirm`. Valores exibidos com `formatCurrency`, cores do `theme` (`ThemeColors`).

**Ask First:**
- Agregar vários empregadores, tratar o 13º e definir a janela dos totais de um jeito diferente das decisões 1–3 aprovadas.
- Qualquer biblioteca de gráfico (`victory-native`, `react-native-gifted-charts`, `@shopify/react-native-skia`). Hoje o app só tem `react-native-svg` (`BudgetChart`, sem uso nas telas) e o `MiniChart` feito com `View`. Se o dono aprovar uma dependência, ela entra em `package.json` **e** em `package-lock.json` (a CI roda `npm ci`), e o `yarn.lock` volta com `git checkout -- yarn.lock`.

**Never:** apagar ou editar a receita (`TRANSACTION_DELETED`/`TRANSACTION_UPDATED`) ao excluir um holerite. Editar um holerite salvo pela lista (para corrigir, grava-se de novo pela revisão, que substitui pela vaga). Editar rubricas linha a linha. Mandar qualquer dado do holerite (valores, empresa, CNPJ, descontos, resumo) ao chat ou ao contexto da IA: `AIContextBuilder`/`ContextData` não ganham `payslips`, e nada de atalho "Perguntar à IA sobre meu salário". Mandar dado do holerite a analytics. Persistir resumo ou série (`AsyncStorage`, `SecureStore`, evento novo). Mudar tipos, `SCHEMA_REGISTRY`, `PAYLOAD_SPECS`, reducer, filtro de sync, `samePayslipSlot` ou o salvar da 11.5. Animação ou `View` maior que a tela no gráfico. `Alert.alert`, `window.alert`, `window.confirm`. Alterar `packages/sync`, `ios/`, `android/`, `replit.*`. Dependência nova sem a aprovação do Ask First.

## I/O & Edge-Case Matrix

| Cenário | Entrada | Resultado |
|---|---|---|
| Sem holerite | `payslips` vazio | estado vazio + três botões de captura; sem resumo, gráfico, totais nem lista |
| Um holerite | 09/2026, bruto 5000, líquido 4000 | último R$ 4.000,00; "Primeiro holerite salvo"; média R$ 4.000,00; descontos 20,0%; uma barra |
| Alta | 08/2026 líquido 4000, 09/2026 líquido 4200 | variação +R$ 200,00 (+5,0%) "em relação a 08/2026", cor de sucesso |
| Queda | 08/2026 4200, 09/2026 4000 | −R$ 200,00 (−4,8%), cor de perigo |
| Competência pulada | 06/2026 e 09/2026 | anterior = 06/2026; gráfico com duas barras, sem buraco |
| Mais de 12 competências | 15 mensais | gráfico, média e % com as 12 mais recentes; a lista mostra as 15 |
| Dois empregadores no mês | 09/2026 ACME 4000 + 09/2026 Beta 1500 | conforme a decisão 1 (1a: uma competência com líquido 5500 e "2 empregadores"); a lista mostra os dois |
| 13º | 12/2026 mensal + 13º 2026 | conforme a decisão 2 (2a: fora do resumo e do gráfico; entra no total por desconto e na lista como "13º salário 2026") |
| Só 13º | só `kind: "thirteenth"` | "Ainda não há holerite mensal para o resumo."; totais e lista aparecem |
| Desconto com nome variado | "INSS", "I.N.S.S.", "inss " | uma linha "INSS" (nome do mais recente) com a soma |
| Manual sem linhas | bruto 5000, líquido 4000, `deductions: []` | "Descontos sem detalhe" R$ 1.000,00 |
| Linhas somam mais que bruto − líquido | leitura com divergência | nenhuma linha negativa; as linhas lidas entram como estão |
| Excluir sem receita | holerite sem `transactionId` | `appConfirm` destrutivo; confirmar despacha `PAYSLIP_DELETED`; some da lista e do resumo |
| Excluir com receita | `transactionId` existente | a mensagem cita a receita mantida; o lançamento e o saldo não mudam |
| Receita já apagada | `transactionId` sem lançamento | mensagem sem a frase da receita |
| Cancelar exclusão | Cancelar | nada é despachado |
| Toque duplo no excluir | dois toques rápidos | uma confirmação só |
| Excluir o último | único holerite | volta o estado vazio |
| Regravar depois de excluir | mesma vaga lida de novo | id novo; aparece no histórico |
| Valor não finito (dados antigos) | `netSalary: NaN` | ignorado no resumo e no gráfico, sem quebrar a tela |
| Contexto da IA | holerites salvos | `buildFinancialContext` sem valor, empresa nem CNPJ do holerite (só a receita "Salário (MM/AAAA)", como na 11.5) |

</frozen-after-approval>

## Code Map

- `packages/domain/src/payslipHistory.ts` (novo, puro): `buildPayslipHistory`, `summarizePayslipHistory`, `payslipChartSeries`, `payslipDeductionTotals`, `deletePayslipMessage`, `PAYSLIP_HISTORY_WINDOW = 12`. Base de ideias: `summarizePayslips`/`deductionKey` do `850aa1b` (`git show 850aa1b:packages/domain/src/payslips.ts`), com a janela de 12, a separação do 13º e a agregação por competência. Reusa `payslipKindOf`, `formatPayslipPeriodLabel` e `payslipIncomeDescription`. Exportado em `packages/domain/index.ts`.
- `src/components/payslip/PayslipChart.tsx` (novo): barras com `View` (base: `git show 850aa1b:src/components/payslip/PayslipChart.tsx`), recebe a série pronta, com seleção por toque e legenda com `InfoTip term="salario_bruto"`.
- `src/components/payslip/PayslipHistory.tsx` (novo): cartões de resumo, gráfico, total por desconto e lista com excluir. Recebe dados prontos e callbacks, sem lógica de cálculo.
- `src/components/payslip/PayslipEmptyState.tsx` (novo, ou parte do `PayslipHistory`): explicação do recurso.
- `app/payslips.tsx`: a lista provisória (`saved.map`, comentário "decisão 3a") sai e entram o `PayslipHistory`/estado vazio. Ganha `handleDelete` (`appConfirm` + `deletePayslipEvent` + `createSingleFlight`). Captura, revisão, pendente do chat e salvar não mudam.
- `src/components/shared/InfoTip.tsx`, `src/constants/financialGlossary.ts`, `src/modules/payslip/singleFlight.ts`, `src/services/appAlert.ts`: reuso, sem mudança.
- `src/components/shared/ConfirmDeleteModal.tsx`: **não** usado. O `appConfirm` com `destructive: true` já tem o estilo dele e é o padrão da 11.5.
- Sem mudança: `packages/events`, reducer, `payslips.ts`, `payslipReview.ts` (só reuso), `src/components/payslip/PayslipReview.tsx`, `usePayslipScanner`, `scanPayslip.ts`, `src/modules/ai/**`, `packages/sync`, `src/modules/nostrSync.ts`, `syncPayload.ts`, `package.json`, `package-lock.json`.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/domain/src/payslipHistory.ts` + `packages/domain/__tests__/payslipHistory.test.ts`: toda a matriz (vazio, um, alta, queda, competência pulada, janela de 12 com 15, decisão 1 com dois empregadores, decisão 2 com 13º, só 13º, agrupamento de nomes, "Descontos sem detalhe", diferença negativa, valor não finito, arredondamento, divisão por zero), mensagem de exclusão com e sem receita, e o teste do R4 (não importa `packages/parsers`) cobrindo o arquivo novo
- [ ] Replay: `src/context/__tests__/replay.payslipHistory.test.ts` (ou extensão do `replay.payslipReview.test.ts`): salvar com receita → excluir → o holerite sai do resumo, a receita e o saldo ficam, e não há Quarentena
- [ ] `PayslipChart`, `PayslipHistory`, estado vazio e `InfoTip` na tela
- [ ] `app/payslips.tsx`: troca da lista provisória e exclusão com `appConfirm`
- [ ] Conferir no build web (`npx expo export --platform web` + Playwright, 412×900): estado vazio, resumo com dois holerites, gráfico com seleção por toque, total por desconto, exclusão com e sem receita (extrato e saldo iguais depois), dica abrindo e fechando; sem erro de página

**Acceptance Criteria:**
- Given holerites salvos, when abro a tela de holerites, then vejo o último líquido com a variação em relação ao anterior, a média líquida e o percentual de descontos
- Given holerites salvos, when abro a tela, then um gráfico mostra líquido e bruto das últimas 12 competências
- Given holerites com descontos, when abro a tela, then o total acumulado por desconto aparece do maior para o menor
- Given um holerite que lançou receita, when o excluo e confirmo, then o holerite some do histórico e a receita continua no extrato com o mesmo saldo
- Given nenhum holerite, when abro a tela, then ela explica o recurso e oferece câmera, galeria e preencher à mão
- Given a tela com holerites, when toco no ícone de dica, then o balão do glossário abre ancorado e fecha ao tocar fora

## Decisões do dono (aprovadas em 27/10: 1a, 2a, 3a)

1. **Vários empregadores na mesma competência.** O reducer guarda um holerite por vaga (competência + tipo + empregador), então quem tem dois vínculos tem dois holerites mensais em 09/2026. (a) **Recomendado:** somar por competência no resumo e no gráfico (bruto, líquido e descontos da competência = soma dos empregadores), com "N empregadores" no cartão quando houver mais de um. A lista mostra cada holerite com a empresa. É o que responde "quanto eu ganho", e a média não fica dividida por vínculos. O efeito colateral: começar ou largar um segundo vínculo aparece como alta ou queda na variação. (b) Filtro por empregador (chips "Todos" / ACME / Beta, só com 2 ou mais empregadores), padrão "Todos" somado: mais preciso, porém mais UI e mais estado de tela. (c) Só o empregador do holerite mais recente: simples, mas esconde parte da renda sem avisar.
2. **13º salário no resumo e no gráfico.** (a) **Recomendado:** o 13º fica fora do último líquido, da variação, da média, do percentual e do gráfico (são métricas do salário mensal; somado a dezembro, ele dobraria a barra e distorceria média e variação). Ele entra no total por desconto (o INSS e o IRRF dele foram pagos) e na lista como "13º salário AAAA". (b) Somar o 13º à competência de dezembro: um número só por mês, mas dezembro vira um pico falso. (c) Barra própria do 13º ao lado de dezembro, em outra cor: informativo, mas o gráfico deixa de ter uma barra por competência e a média precisa de regra extra.
3. **Período do "total acumulado por desconto".** (a) **Recomendado:** a mesma janela do gráfico (as 12 competências mensais mais recentes, mais o 13º cuja competência caia nesse intervalo), com o título "Descontos nas últimas 12 competências". Os totais fecham com o percentual de descontos mostrado e não crescem sem limite. (b) Todo o histórico salvo ("acumulado" ao pé da letra), com o título "Descontos desde MM/AAAA": responde "quanto já paguei", mas não bate com o percentual da janela. (c) Ano-calendário atual: útil para o IR, mas depende da data de hoje (parâmetro na função pura) e fica quase vazio em janeiro.

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas em relação ao baseline (`9141e23`; a 11.5 deixou 86 arquivos / 1706 testes passando e 0 erros de tipo)
- `grep -rn "Alert.alert\|window.confirm\|window.alert" app/payslips.tsx src/components/payslip` vazio
- `grep -rn "payslip" src/modules/ai` só acha o comentário existente em `AISettings.ts` (nenhum dado do holerite no contexto da IA)
- `grep -n "TRANSACTION_DELETED\|deleteTransactionEvent" app/payslips.tsx src/components/payslip` vazio
- `git diff --stat 9141e23 -- package.json package-lock.json packages/events packages/sync` vazio
- Build web (Playwright): matriz da seção Execution conferida
- Aparelho (APK de pré-release, Android 16): rolagem da tela com 12 barras e lista longa sem travar, toque nas barras, dica, exclusão com receita (extrato e saldo iguais) e TalkBack lendo barras e botão de excluir
