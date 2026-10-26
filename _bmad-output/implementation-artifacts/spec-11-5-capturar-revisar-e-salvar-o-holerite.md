---
title: 'Story 11.5: capturar, revisar e salvar o holerite'
type: 'feature'
created: '2026-10-26'
status: 'in-progress'
baseline_commit: '447f7c9'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-3-extrair-dados-do-holerite.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-4-holerite-como-evento-local.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-12-5-aviso-exportacao-sem-criptografia.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-12-7-texto-de-cada-flag.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-13-1-sistema-unico-de-teclado.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-16.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O parser (Story 11.3) lê o holerite e o evento `PAYSLIP_RECORDED` (Story 11.4) já guarda o resultado, mas não há como o usuário chegar lá. Na `dev` não existe tela, rota nem hook de captura. No chat da IA, "Escanear holerite" lê a foto pelo Vision OCR e **manda o resumo com salário, descontos e empresa como mensagem ao provedor de IA** (`app/ai-chat.tsx`, ramo `else` de `processVisionImage`), sem salvar nada e sem passar pelo parser (o CPF e o nome que o modelo devolver não são limpos). O commit `850aa1b` (fora da `dev`) tinha tela, modal de revisão e hook, mas usa `Alert.alert`, um `Modal` com `ScrollView` comum (o teclado cobre os campos), guarda o resultado do chat no `AsyncStorage`, ignora a flag `visionOCREnabled` e não conhece CNPJ, 13º nem a regra de substituição da 11.4.

**Approach:** Uma tela `app/payslips.tsx` (rota `/payslips`) com três entradas: câmera, galeria e preencher à mão. A captura fica num hook (`src/hooks/usePayslipScanner.ts`) que só orquestra. A escolha entre Vision OCR e OCR do aparelho, com a queda de um para o outro, fica num módulo puro com dependências injetadas, testável no vitest. O resultado (ou um rascunho vazio, no manual) abre a revisão, um estado da própria tela com `KeyboardAwareScrollViewCompat`, sem `Modal`. A revisão mostra os avisos do parser e deixa corrigir empresa, CNPJ, competência, 13º, bruto e líquido. Ela valida, pede confirmação com `appConfirm` quando a vaga (competência + tipo + empregador, `samePayslipSlot`) já tem holerite e, opcionalmente, lança o líquido como receita (categoria `salario`) numa conta que não seja cartão. Salvar só monta eventos com criadores puros (`recordPayslipEvent`, `createTransactionEvent`) e os despacha por `dispatchDomainEvent`, sem mutar estado. No chat, "Escanear holerite" passa a usar o mesmo hook e abre a mesma revisão, sem enviar nada do holerite ao chat. Histórico, resumo, gráfico, exclusão e estado vazio ficam para a Story 11.6.

## Boundaries & Constraints

**Always:**
- **Telas despacham, não mutam:** o salvar chama `dispatchDomainEvent` (de `useAppState()`) com eventos montados por criadores puros. Nada de estado derivado persistido.
- **Lógica testável fora do RN:** validação do rascunho, detecção de vaga ocupada, montagem dos eventos e escolha Vision/OCR ficam em módulos sem `react-native`. Sugestão: `packages/domain/src/payslipReview.ts` (puro, AD-3: sem `Date.now`, ids só por `generateId`/criadores; a data da receita entra como parâmetro) e `src/modules/payslip/scanPayslip.ts` (deps injetadas: picker, Vision, OCR local). O hook e a tela só ligam as peças.
- **Captura (câmera/galeria):** usa o Vision OCR só quando **todas** valem: IA ligada (`settings.isEnabled`), flag `visionOCREnabled` ligada, provedor com visão (`VisionOCRService.supportsVision`), chave de API presente e orçamento não estourado (`TokenTracker.isOverBudget`). O resultado do Vision passa **sempre** por `normalizeVisionPayslip` (limpa CPF/nome e valida CNPJ). Se o Vision não se aplica ou falha (erro de rede, de schema, de chave), cai para o OCR do aparelho (`createHybridOCRAdapter`, mesma configuração do `useInvoiceScanner`, que respeita o Cloud Vision e a sua flag) + `parsePayslipText`. A queda acrescenta um aviso na revisão ("A leitura pela IA falhou; lido no aparelho."). Tokens só são registrados (`TokenTracker.record`) quando o Vision respondeu.
- Câmera sem permissão, imagem cancelada e falha dos dois OCRs não quebram a tela: `appAlert` em pt-BR, com a opção de preencher à mão. Leitura sem bruto nem líquido abre a revisão mesmo assim, com o aviso "Não encontramos valores na imagem. Confira ou preencha à mão."
- **Preencher à mão:** abre a revisão vazia, com `source: "manual"`.
- **Revisão:** mostra os avisos do parser (`warnings`) e a origem (IA, aparelho ou manual). Campos editáveis: empresa, CNPJ (opcional), competência (`MM/AAAA`, convertida por `normalizePayslipPeriod`), chave "13º salário", bruto e líquido (formato brasileiro, `parseBRL`). Rubricas, descontos e FGTS lidos aparecem só para leitura e vão para o evento como lidos. `confidence` e `warnings` nunca vão para o evento.
- **13º salário:** a chave começa ligada quando o parser devolve `thirteenth: true`, ou quando o usuário digita competência `13/AAAA`. Ligada, o evento sai com `kind: "thirteenth"`; desligada, sem `kind`.
- **Validação para salvar** (botão desabilitado e mensagem na linha do campo): competência válida (`PAYSLIP_PERIOD_PATTERN` depois da conversão); líquido > 0 e ≤ bruto; valores finitos; **empresa ou CNPJ preenchido** (nome normalizado vazio sem CNPJ nunca casa no reducer, R8 da 11.4, e duplicaria holerites); CNPJ, se preenchido, válido (`normalizeCnpj`), senão erro no campo.
- **Substituição:** antes de salvar, procura em `domain.payslips` um holerite na mesma vaga (`samePayslipSlot`, exportado da 11.4, nunca uma regra própria). Se existe, `appConfirm` ("Substituir holerite?", com competência e empresa do atual) e só segue com confirmação. O salvar **sempre gera id novo** (nunca passa `id` ao `recordPayslipEvent`): o reducer substitui pela vaga, e a marca de exclusão da 11.4 (decisão 2a) ignora um id já excluído. Ver a decisão 2 para receita já lançada pelo holerite substituído.
- **Receita:** chave "Lançar o líquido como receita", ligada por padrão quando há conta elegível. Contas elegíveis: as de tipo diferente de `credit_card`, escolhidas no `AccountPicker`. Sem conta elegível, a chave fica desligada com a explicação "Crie uma conta corrente, poupança ou carteira para lançar a receita." Data da receita: hoje por padrão, editável (`DatePickerField`). O lançamento é um `createTransactionEvent` com `type: "income"`, `categoryId: "salario"`, `amount` = líquido arredondado, descrição "Salário (MM/AAAA)" ou "13º salário (AAAA)", seguida da empresa quando houver. O `transactionId` do holerite é o `id` desse evento. Montam-se os dois eventos antes de despachar. Despacha-se o `PAYSLIP_RECORDED` e depois o `TRANSACTION_CREATED`.
- **Chat da IA:** "Escanear holerite" (`scan_payslip`) usa o mesmo hook de captura (mesma regra Vision/OCR do aparelho) e leva o resultado à revisão de `/payslips`. A passagem é **em memória** (módulo com `setPendingPayslipReview`/`takePendingPayslipReview`, lido uma vez), nunca pelo `AsyncStorage`. O ramo que manda o resumo do holerite ao chat é removido: nenhum valor do holerite vai para a IA como mensagem. Um erro também não manda mensagem ao chat: mostra `appAlert` com a opção de abrir `/payslips` para preencher à mão.
- **Entrada na navegação:** `Stack.Screen name="payslips"` (sem cabeçalho) em `app/_layout.tsx`, mais uma ação "Holerite" na página 2 das ações rápidas da tela inicial (`app/(tabs)/index.tsx`), como no `850aa1b`.
- **Teclado:** a revisão é uma tela que rola (`KeyboardAwareScrollViewCompat` com `bottomOffset`, `keyboardShouldPersistTaps="handled"`, como o `ParsedScreen`), nunca um `Modal` com `ScrollView` comum. Nenhum campo fica coberto pelo teclado, inclusive o último (líquido) e o botão Salvar.
- **Texto de privacidade (Story 12.7):** a frase `visionOcr.sends` diz "que você tirar ou escolher no chat". Com a 11.5, a tela de holerites também envia, então a frase passa a citá-la (ex.: "no chat ou na tela de holerites"). O `loses` também muda: sem a flag, o holerite é lido no aparelho. As três cópias (`docs/politica-de-privacidade.md`, `app/privacy-policy.tsx`, `PLAY_STORE_LISTING.md`) mudam junto, e o teste `privacyFlagTexts.test.ts` continua passando.
- UI em pt-BR com acentos completos; alertas e confirmações só por `appAlert`/`appConfirm`; valores exibidos com `formatCurrency`; sons como nas outras capturas (`soundManager`).

**Never:** histórico, resumo (último líquido, média, % de descontos), gráfico, total por desconto, exclusão de holerite, estado vazio explicativo e `InfoTip` da tela (Story 11.6). Editar rubricas e descontos linha a linha. Guardar nome do funcionário, CPF, `confidence` ou `warnings`. Passar o holerite pelo `AsyncStorage` ou por qualquer armazenamento fora do log. Mandar valores do holerite ao chat ou ao contexto da IA. Usar Vision com a flag `visionOCREnabled` desligada. `Alert.alert`, `window.alert`, `window.confirm`. Mudar os tipos, o `SCHEMA_REGISTRY`, o reducer ou o filtro de sync da 11.4. Alterar `packages/sync`, `ios/`, `android/`, `replit.*`. Dependência nova.

## I/O & Edge-Case Matrix

| Cenário | Entrada | Resultado |
|---|---|---|
| Vision disponível | IA + flag + provedor com visão + chave + orçamento | Vision → `normalizeVisionPayslip` → revisão com origem "IA"; tokens registrados |
| Flag Vision desligada | `visionOCREnabled` falso, IA ligada | OCR do aparelho, sem chamada ao provedor |
| Vision falha | erro do provedor | OCR do aparelho + aviso de queda; origem "aparelho" |
| Sem chave / orçamento estourado | Vision não se aplica | OCR do aparelho, sem chamada |
| Os dois falham | OCR do aparelho indisponível | `appAlert` com "Preencher à mão" |
| Foto sem valores | bruto e líquido 0 | revisão aberta com o aviso de valores não encontrados |
| Cancelar câmera/galeria | `canceled` | nada muda |
| Manual | toque em "Preencher à mão" | revisão vazia, `source: "manual"` |
| 13º lido | parser `thirteenth: true`, `period` 2026-12 | chave 13º ligada; evento com `kind: "thirteenth"`; não substitui o mensal de dezembro |
| 13º digitado | competência `13/2026` | período 2026-12, chave 13º ligada |
| Competência inválida | `14/2026`, vazio, `05/10/2026` | não salva; erro no campo |
| Líquido > bruto / líquido 0 | bruto 3000, líquido 3100; líquido 0 | não salva; erro no campo |
| Sem empresa nem CNPJ | os dois vazios | não salva; "Informe a empresa ou o CNPJ" |
| CNPJ inválido | dígito verificador errado | não salva; erro no campo |
| Vaga ocupada | mesma competência + tipo + empregador já salvo | `appConfirm`; cancelar não despacha nada; confirmar despacha com id novo |
| Mesmo mês, outro empregador | CNPJ diferente | salva sem confirmação; os dois ficam |
| Regravar após excluir | holerite excluído (11.6) e lido de novo | id novo, aparece normalmente |
| Lançar receita | chave ligada, conta corrente | `PAYSLIP_RECORDED` com `transactionId` + `TRANSACTION_CREATED` income/`salario` com o líquido |
| Só cartão de crédito | nenhuma conta elegível | chave desligada e explicada; holerite salvo sem receita |
| Sem lançar receita | chave desligada | só `PAYSLIP_RECORDED`, sem `transactionId`; saldo igual |
| Chat | "Escanear holerite" | mesma captura; abre `/payslips` na revisão; nenhuma mensagem com valores no chat |
| Teclado | foco no líquido | a tela rola e o campo e o botão Salvar ficam visíveis |

</frozen-after-approval>

## Code Map

- `app/payslips.tsx` (novo): estados `idle` (câmera, galeria, manual; mais a lista conforme a decisão 3) → `scanning` → `review`. Lê o pendente do chat ao montar.
- `src/components/payslip/PayslipReview.tsx` (novo): formulário da revisão (base de ideias: `PayslipReviewModal` do `850aa1b`, mas como tela e com `KeyboardAwareScrollViewCompat`, CNPJ, chave 13º, `AccountPicker`, `DatePickerField`).
- `src/hooks/usePayslipScanner.ts` (novo): permissões, `expo-image-picker` (base64 só quando o Vision vai ser tentado), liga o módulo puro a `VisionOCRService`, `TokenTracker`, `SecureKeyService`, `OCRConfigService`/`createHybridOCRAdapter`. Base: `850aa1b`, trocando `Alert.alert` por `appAlert` e checando `visionOCREnabled`.
- `src/modules/payslip/scanPayslip.ts` (novo, puro): `scanPayslip({ visionEligible, runVision, runLocalOcr })` → `{ data, source, fellBack }`.
- `src/modules/payslip/pendingReview.ts` (novo): passagem em memória chat → tela.
- `packages/domain/src/payslipReview.ts` (novo, puro): `validatePayslipDraft`, `findPayslipInSlot(payslips, draft)` (sobre `samePayslipSlot`), `buildPayslipSaveEvents(draft, { incomeAccountId?, incomeDate, deviceId })` → `[PAYSLIP_RECORDED, TRANSACTION_CREATED?]`. Exportado em `packages/domain/index.ts`.
- `packages/domain/src/payslips.ts`, `reducer.ts` (`samePayslipSlot`, `payslipKindOf`): reuso, sem mudança.
- `packages/parsers/src/payslipParser.ts`: reuso (`parsePayslipText`, `normalizeVisionPayslip`, `normalizePayslipPeriod`, `normalizeCnpj`, `parseBRL`, `PAYSLIP_WARNINGS`), sem mudança.
- `app/ai-chat.tsx`: `scan_payslip` passa pelo hook e navega para `/payslips`; remove o resumo enviado ao chat. O fluxo de nota fiscal não muda.
- `app/_layout.tsx`: `Stack.Screen name="payslips"`. `app/(tabs)/index.tsx`: ação "Holerite".
- `src/constants/privacyFlagTexts.ts` + `docs/politica-de-privacidade.md`, `app/privacy-policy.tsx`, `PLAY_STORE_LISTING.md`: frase do `visionOcr`.
- `src/modules/backup/application/confirmedExport.ts` (`PLAIN_EXPORT_WARNING`): conforme a decisão 1.
- Sem mudança: `packages/events`, `packages/sync`, `src/modules/nostrSync.ts`, `syncPayload.ts`, backup (formato), `AIContextBuilder`.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/domain/src/payslipReview.ts` + testes (`packages/domain/__tests__/payslipReview.test.ts`): validação da matriz, vaga ocupada via `samePayslipSlot` (13º × mensal, CNPJ × nome), id novo a cada salvar, receita income/`salario` com o `transactionId` ligado, toda saída passa no replay sem Quarentena
- [ ] `src/modules/payslip/scanPayslip.ts` + teste: Vision elegível/não elegível, queda com aviso, tokens só com Vision ok, `normalizeVisionPayslip` sempre aplicado
- [ ] `src/modules/payslip/pendingReview.ts` + teste (lido uma vez)
- [ ] Hook `usePayslipScanner`, `PayslipReview`, `app/payslips.tsx`, rota e ação rápida
- [ ] Chat: `scan_payslip` pelo hook, sem resumo no chat
- [ ] Frase `visionOcr` nas quatro fontes; decisão 1 no aviso de exportação
- [ ] Conferir no build web (Playwright) a revisão manual: validação, confirmação de substituição e salvar com receita; o teclado no aparelho fica na checklist da Story 13.7

**Acceptance Criteria:**
- Given a tela de holerites, when escolho câmera ou galeria, then a leitura usa o Vision OCR se houver provedor com visão (e a flag ligada) e cai para o OCR do aparelho se ele falhar ou não existir; e posso preencher manualmente
- Given o resultado da leitura, when abro a revisão, then vejo os avisos do parser e posso corrigir empresa, competência, bruto e líquido
- Given a revisão, when tento salvar, then só salvo com competência válida, líquido > 0 e ≤ bruto, e empresa ou CNPJ
- Given a revisão, when ligo "Lançar o líquido como receita", then escolho uma conta que não seja cartão de crédito e o líquido entra como receita `salario`, ligada ao holerite
- Given uma competência do mesmo tipo e empregador já salva, when salvo, then o app pede confirmação com `appConfirm` antes de substituir
- Given o chat da IA, when uso "Escanear holerite", then o resultado abre a mesma revisão e nada do holerite é enviado ao chat

## Decisões do dono (aprovadas em 26/10: 1a, 2a, 3a; texto de privacidade e retirada do salário do chat aprovados)

1. **Aviso da exportação sem criptografia (Story 12.5) cita o salário?** Hoje `PLAIN_EXPORT_WARNING.message` diz "todos os seus dados financeiros legíveis". A decisão 1a da 11.4 deixou à 11.5 acrescentar o holerite. (a) **Recomendado:** frase fixa, sempre igual: "O arquivo terá todos os seus dados financeiros legíveis, inclusive o salário e o empregador dos holerites, …". Simples, sem depender do estado, e o teste da 12.5 só ganha a nova frase. (b) Frase só quando há holerite salvo: mais precisa, mas o aviso passa a depender do estado (o hook precisa de `domain.payslips`) e ganha dois textos para testar. (c) Não mudar: "todos os dados" já cobre, mas o salário é o dado mais sensível do arquivo e o usuário pode não associar.
2. **Substituir um holerite que já lançou receita.** Se o holerite da vaga tem `transactionId`, salvar o novo com a chave de receita ligada lança uma segunda receita do mesmo salário. (a) **Recomendado:** quando a vaga tem holerite com `transactionId`, a chave de receita começa **desligada** e a confirmação de substituição diz "A receita já lançada pelo holerite anterior continua no extrato." O usuário pode ligar a chave se quiser. Nada é apagado, coerente com "excluir holerite não apaga a receita" (11.6). (b) Oferecer também excluir a receita antiga (`TRANSACTION_DELETED`) na mesma confirmação: evita duplicata, mas apaga um lançamento que o usuário pode ter editado ou conciliado. (c) Não tratar: a chave segue ligada e a duplicata fica por conta do usuário.
3. **O que `/payslips` mostra fora da revisão, antes da 11.6.** Pela AC, a 11.6 é dona do histórico, do resumo, da exclusão e do estado vazio. (a) **Recomendado:** os três botões de captura e uma lista simples, só leitura, dos holerites salvos (competência, 13º, empresa, líquido, do mais novo ao mais antigo). Confirma ao usuário que salvou; a 11.6 troca a lista pelo histórico completo. (b) Só os três botões e "N holerites salvos": menos código descartável, mas o usuário não vê o que salvou até a 11.6.

## Notas para a Story 11.6

- A 11.6 é dona do histórico (`getPayslipHistory`/`summarizePayslips` em `packages/domain`, base `850aa1b`), do gráfico de 12 competências, do total por desconto, da exclusão (`deletePayslipEvent`, sem tocar na receita, com `ConfirmDeleteModal`/`appConfirm`), do estado vazio e do `InfoTip` da tela (adiado pela 11.2). Ela reaproveita a tela e as ações de captura da 11.5.
- A 11.5 não mostra rubricas editáveis; se o dono quiser corrigir descontos linha a linha, é story nova (afeta o total por desconto da 11.6).

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas em relação ao baseline (`447f7c9`)
- `grep -rn "Alert.alert\|window.confirm\|window.alert" app/payslips.tsx src/components/payslip src/hooks/usePayslipScanner.ts` vazio
- `grep -n "AsyncStorage" app/payslips.tsx src/hooks/usePayslipScanner.ts src/modules/payslip` vazio; em `app/ai-chat.tsx` nenhuma mensagem montada com `grossSalary`/`netSalary`
- Build web: revisão manual salva holerite e receita; segunda gravação da mesma vaga pede confirmação
