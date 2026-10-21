# Epic 11 Context: Recursos de uso

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Dar à pessoa três recursos de uso: entender termos financeiros na hora, com dicas ancoradas e um glossário único; acompanhar salário e descontos pelo holerite fotografado, guardado como evento local até existir o Grupo forte; e ver cada troféu com uma animação própria ligada ao tema dele. O Lottie aprovado continua, inclusive na web, e uma configuração cobre os troféus sem Lottie. O épico entrou por emenda ao escopo e não pode atrasar o prazo da Play (Epic 1). O holerite carrega dados sensíveis (salário, empregador, CNPJ), por isso o sigilo e a compatibilidade com versões já publicadas orientam o desenho.

## Stories

- Story 11.1: Criar o glossário financeiro e o balão de dica
- Story 11.2: Mostrar dicas nas telas e atalhos no chat da IA
- Story 11.3: Extrair os dados do holerite a partir do texto do OCR
- Story 11.4: Registrar o holerite como evento local
- Story 11.5: Capturar, revisar e salvar o holerite
- Story 11.6: Mostrar o histórico e o gráfico do holerite
- Story 11.7: Configurar a animação de cada troféu
- Story 11.8: Animar os troféus pela configuração e mostrar a prévia
- Story 11.9: Fazer o Lottie funcionar na web

## Requirements & Constraints

**Dicas (tooltips)**
- Um só glossário (`src/constants/financialGlossary.ts`) alimenta todas as dicas: título e explicação em pt-BR com acentos completos.
- A detecção de termos em texto livre não pode confundir palavras parecidas e precisa de teste.
- O balão fica ancorado ao ícone, abre abaixo dele (ou acima, se faltar espaço) e fecha com toque fora. Nenhuma dependência nova.
- Locais: orçamento 50/30/20 da tela inicial, campo de dividendo do CDB e tela de holerites.
- Chat da IA: até três atalhos "O que é…?" por resposta, só com `tooltipsEnabled` ligado. Hoje essa opção não faz nada.

**Holerite**
- O parser devolve empresa, CNPJ, competência `YYYY-MM`, bruto, líquido, rubricas, descontos e FGTS, com confiança e avisos. Regras:
  - bases de cálculo (INSS, IRRF, FGTS) não contam como desconto;
  - bruto ou líquido ausente é calculado a partir dos outros valores, com aviso;
  - a confiança cai quando os totais não fecham ou quando o líquido passa do bruto;
  - a data de pagamento não vale como competência.
- O resultado do Vision OCR é normalizado para o mesmo formato.
- **O nome do funcionário nunca é devolvido nem guardado.**
- Captura por câmera ou galeria: usa o Vision OCR se houver provedor com visão e cai para o OCR do aparelho quando ele falha ou não existe. Também dá para preencher à mão.
- Para salvar, a competência precisa ser válida e o líquido precisa ser maior que 0 e no máximo igual ao bruto.
- O líquido pode virar receita (categoria `salario`) numa conta que não seja cartão de crédito.
- Competência já existente: o app pede confirmação antes de substituir.
- O holerite não altera saldo de conta. Excluir um holerite não apaga a receita já lançada.
- Histórico:
  - último líquido com a variação em relação ao anterior, média líquida e percentual de descontos;
  - gráfico de líquido e bruto das últimas 12 competências;
  - total por desconto, do maior para o menor;
  - estado vazio que explica o recurso e oferece a captura.
- O Vision OCR envia a foto do holerite ao provedor de IA escolhido pelo usuário. Os textos públicos e o Data safety precisam refletir esse envio.

**Troféus**
- Troféu com Lottie aprovado (`APPROVED_LOTTIE`) usa o Lottie dele no celular e na web.
- Troféu sem Lottie (conquistas, mensais, sazonais, litúrgicos) usa `src/constants/trophyAnimationConfigs.ts`: a categoria temática mais um ajuste próprio, se houver.
- Um teste garante configuração válida para todo troféu sem Lottie e que todo ajuste aponta para um troféu existente.
- Em listas estáticas, o troféu aparece sem efeitos.
- O DebugTools mostra a animação de cada troféu: Lottie, ou a configuração (categoria, movimento, efeito, partículas). O dono aprova troféu por troféu.
- Web: instalar `@lottiefiles/dotlottie-react` para que `npx expo export --platform web` empacote o `LottieTrophy`. A CI roda `npm ci` com npm 10, então atualize `package.json` e `package-lock.json`. O build Android de release precisa continuar verde.

## Technical Decisions

- **Estado por replay (AD-1/AD-2):** telas despacham eventos e nunca persistem estado derivado. O histórico e o resumo do holerite são recalculados do log.
- **Tipos novos `PAYSLIP_RECORDED` e `PAYSLIP_DELETED`:**
  - são declarados em `packages/events` (UPPER_SNAKE);
  - precisam ser roteados ao `domainReducer` em `replayAllEvents`, porque tipo sem rota é descartado em silêncio (AD-4);
  - o payload tem `schemaVersion` e evolui só por campo opcional ou por conversão no reducer;
  - a mesma competência do mesmo empregador (por CNPJ, ou por nome quando não há CNPJ) substitui a leitura anterior;
  - excluir um id inexistente é ignorado.
- **Sigilo:** nenhum evento `PAYSLIP_*` é publicado no Grupo antigo, cuja cifra XOR com código de 6 caracteres é quebrável. Um teste garante esse filtro no sync. Até existir o Grupo forte, o holerite fica no aparelho e no backup do próprio Drive.
- **Núcleo puro (AD-3):** o parser do holerite fica em `packages/parsers` e o resumo do histórico em `packages/domain`, sem `react`, `react-native` ou `expo`, sem `Date.now` ou `Math.random`. Ids só por `generateId`. A captura fica em `src/hooks`.
- **Dinheiro (AD-7):** `number` em reais, arredondado a 2 casas na criação do evento. A exibição usa `formatCurrency`.
- **Troféus:** a animação é só visual e não mexe no sorteio nem no colecionável único por pessoa (AD-10).
- **GPU Mali:** nenhuma View animada maior que a tela. Use `absoluteFillObject` (ver `docs/tour-crash-fixes.md`).
- **Teclado:** telas com campo (revisão do holerite) usam a rolagem padrão. Modais usam `KeyboardSafeView` do `react-native-keyboard-controller`, sem o `KeyboardAvoidingView` do RN.
- **Testes:** `npx vitest run`. `vi.mock("react-native")` não funciona, então deixe a lógica testável em módulos sem `react-native`.

## UX & Interaction Patterns

- A dica abre com um toque no ícone de informação e mostra o termo sem sair da tela.
- No chat da IA, os atalhos "O que é…?" abrem a mesma explicação do glossário.
- Fluxo do holerite: captura (câmera, galeria ou manual), depois revisão com os avisos do parser e campos editáveis (empresa, competência, bruto, líquido), depois a opção de lançar o líquido como receita, depois salvar.
- "Escanear holerite" no chat da IA abre a mesma revisão.

## Cross-Story Dependencies

- 11.2 depende de 11.1. 11.1 e 11.2 vêm logo depois do Epic 1.
- 11.4 depende das stories 3.1, 3.3 e 3.8 (validação na importação, reprocessamento de tipo desconhecido, evolução de formato).
- 11.5 depende de 11.3 e 11.4. 11.6 depende de 11.5.
- 11.8 depende de 11.7. 11.9 pode vir já, porque destrava o build web na CI.
- A Story 4.5 (Grupo forte) passa a publicar `PAYSLIP_*` no Grupo forte.
- A Story 1.5 (Data safety) cita o holerite entre as fotos enviadas ao provedor de IA. A Story 9.1 classifica o holerite como "vira Evento", com nota de sensibilidade.
- O Epic 12 exige flag de ativação e o texto "o que transmite / o que perde" em todo envio, incluindo IA e Vision OCR. A captura do holerite precisa respeitar essas flags.
