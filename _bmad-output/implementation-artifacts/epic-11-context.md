# Epic 11 Context: Recursos de uso

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Trazer ao app três recursos de uso pedidos pelo dono, vindos do ROADMAP legado: dicas ancoradas com um glossário financeiro (para a pessoa entender termos sem sair da tela), um leitor de holerite (para acompanhar salário e descontos sem digitar) e uma animação própria para cada troféu, definida por configuração e ligada ao tema dele, que substitui o Lottie em todo o app. O épico é uma exceção aprovada à regra de "sem interface nova" do plano de segurança e atualização. Ele não pode atrasar o envio à Play (Epic 1) e não pode enfraquecer o sigilo dos dados: o holerite traz salário, empregador e CNPJ.

## Stories

- Story 11.1: Criar o glossário financeiro e o balão de dica
- Story 11.2: Mostrar dicas nas telas e atalhos no chat da IA
- Story 11.3: Extrair os dados do holerite a partir do texto do OCR
- Story 11.4: Registrar o holerite como evento local
- Story 11.5: Capturar, revisar e salvar o holerite
- Story 11.6: Mostrar o histórico e o gráfico do holerite
- Story 11.7: Configurar a animação de cada troféu
- Story 11.8: Animar os troféus pela configuração e mostrar a prévia
- Story 11.9: Remover o Lottie do app

## Requirements & Constraints

**Dicas (tooltips)**
- Um único glossário (`src/constants/financialGlossary.ts`) alimenta todas as dicas: título e explicação em pt-BR com acentos completos.
- A detecção de termos em texto livre não pode confundir palavras parecidas.
- O balão fica ancorado ao ícone, abre abaixo ou acima conforme o espaço e fecha ao tocar fora.
- Locais com dica: o orçamento 50/30/20, o campo de dividendo do CDB e a tela de holerites.
- No chat da IA, aparecem até três atalhos "O que é…?" por resposta, e só com `tooltipsEnabled` ligado (hoje essa opção não faz nada).
- Nenhuma dependência nova.

**Holerite**
- O parser devolve empresa, CNPJ, competência (`YYYY-MM`), bruto, líquido, rubricas, descontos, FGTS, confiança e avisos.
- Bases de cálculo (INSS, IRRF, FGTS) não contam como desconto. A data de pagamento não pode ser lida como competência.
- O bruto ou o líquido que faltar é calculado a partir dos outros valores, com aviso. A confiança cai quando os totais não fecham ou quando o líquido passa do bruto.
- O resultado do Vision OCR é normalizado para o mesmo formato do parser.
- **O nome do funcionário nunca é devolvido nem guardado.**
- A captura usa o Vision OCR quando há provedor com visão e cai para o OCR do aparelho se ele falhar ou não existir. Também dá para preencher à mão.
- A revisão mostra os avisos e permite editar empresa, competência, bruto e líquido. Só salva com competência válida e com líquido maior que 0 e menor ou igual ao bruto.
- A pessoa pode lançar o líquido como receita (categoria `salario`) numa conta que não seja cartão de crédito.
- A mesma competência do mesmo empregador (por CNPJ, ou pelo nome quando não há CNPJ) substitui a leitura anterior, com confirmação.
- Excluir um holerite não apaga a receita já lançada. Um id inexistente é ignorado. O holerite não altera o saldo de nenhuma conta.
- O histórico mostra:
  - o último líquido e a variação em relação ao anterior;
  - a média líquida e o percentual de descontos;
  - um gráfico de líquido e bruto das últimas 12 competências;
  - o total por desconto, do maior para o menor;
  - um estado vazio que explica o recurso e oferece a captura.
- "Escanear holerite" no chat da IA abre a mesma revisão.

**Troféus**
- A configuração de cada troféu (conquistas, mensais, sazonais e litúrgicos) vem da categoria temática dele somada ao ajuste próprio, se houver.
- Um teste garante uma configuração válida para todos os troféus e que todo ajuste aponta para um troféu que existe.
- Em listas estáticas, o troféu aparece sem efeitos.
- O DebugTools mostra categoria, movimento, efeito e partículas de cada troféu, para a aprovação individual do dono.
- Na remoção do Lottie, saem `lottie-react-native`, `assets/lottie/` (cerca de 6 MB) e `APPROVED_LOTTIE`. Nenhum import de Lottie pode sobrar. O build web volta a funcionar sem `@lottiefiles/dotlottie-react`, e o build Android de release continua verde.

## Technical Decisions

- **Separação pura (AD-3):** o parser do holerite fica em `packages/parsers` e o resumo do histórico em `packages/domain`, sem `react`, `react-native` nem `expo` e sem `Date.now` ou `Math.random`. A captura fica em `src/hooks`. Ids só por `generateId`/`createEvent` de `packages/events`.
- **Eventos novos (AD-4, FR-17):** `PAYSLIP_RECORDED` e `PAYSLIP_DELETED` são declarados em `packages/events` e roteados ao `domainReducer` em `replayAllEvents`. Sem essa rota, o replay descarta o tipo em silêncio. O payload leva `schemaVersion`.
- **Estado por replay:** as telas despacham eventos e nunca persistem estado derivado. Resumo, gráfico e substituição por competência são todos calculados a partir do log.
- **Dinheiro (AD-7):** `number` em reais, arredondado a 2 casas ao criar o evento. A exibição usa só `formatCurrency`.
- **Sigilo do holerite (decisão do dono D2):** nenhum `PAYSLIP_*` é publicado no Grupo antigo (XOR, código de 6 caracteres), e um teste garante esse filtro. O holerite fica no aparelho e no backup do Drive até existir o Grupo forte. A Story 4.5 passa a publicá-lo lá.
- **Troféus (decisão do dono D1 = trocar o Lottie):** a animação por configuração substitui o Lottie em todos os troféus e encerra a reformulação por Lottie. É só visual: não mexe no sorteio nem na regra do colecionável (AD-10).
- **Pitfall da GPU Mali:** nenhuma View animada pode ser maior que a tela. Use `absoluteFillObject` (veja `docs/tour-crash-fixes.md`).
- **Dependências:** a 11.9 remove pacotes, então o `package-lock.json` precisa ser atualizado (a CI roda `npm ci`). Reverta o efeito colateral no `yarn.lock`.
- **Testes:** use `npx vitest run`. `vi.mock("react-native")` não funciona, então mantenha a lógica testável fora de `react-native`.

## UX & Interaction Patterns

- Não há documento de UX. As telas novas seguem os padrões visuais do app.
- A dica abre por toque num ícone de informação e fecha ao tocar fora, sem navegar para outra tela.
- Fluxo do holerite: captura (câmera, galeria ou manual), depois revisão editável com avisos, depois confirmação de substituição quando a competência já existe, depois o salvamento com lançamento opcional da receita.
- Todo texto de interface fica em pt-BR com acentuação completa.

## Cross-Story Dependencies

- **Ordem (decisão do dono D3):** 11.1 e 11.2 entram logo depois do Epic 1, antes do Epic 2. A 11.2 depende da 11.1.
- **Holerite:** a 11.4 depende das Stories 3.1 (validação do envelope e do tipo), 3.3 (reprocessar tipos desconhecidos da Quarentena) e 3.8 (`schemaVersion`), para que versões antigas não percam `PAYSLIP_*`. A 11.5 depende da 11.3 e da 11.4, e a 11.6 depende da 11.5. A sincronização do holerite depende do Epic 4 (Story 4.5).
- **Troféus:** a 11.8 depende da 11.7, e a 11.9 só vem depois da 11.8 cobrir todos os troféus.
- **Fora do épico:**
  - A Story 1.5 (Data safety) cita que fotos de holerite e de nota fiscal vão ao provedor de IA escolhido.
  - A Story 9.1 classifica o holerite como "vira Evento", com nota de sensibilidade.
  - A dica da tela de holerites (FR-25) só existe depois do FR-26.
