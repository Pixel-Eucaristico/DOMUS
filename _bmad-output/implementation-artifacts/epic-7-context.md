# Epic 7 Context: Gamificação igual em todos os aparelhos

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Garantir que XP, conquistas, aportes automáticos, recuperação de XP, categorias, nível e streak converjam de forma idêntica em todos os aparelhos sincronizados, sem pagamentos duplicados por múltiplos dispositivos ou por lançamentos parcelados. O épico elimina eventos de gamificação com estado absoluto ou identificadores aleatórios em efeitos automáticos, exigindo que efeitos rodem sobre o estado atualizado após o primeiro pull do sync e que nível e streak sejam derivados diretamente do log de eventos.

## Stories

- Story 7.1: Dar id determinístico às conquistas e deduplicar no reducer
- Story 7.2: Rodar os efeitos só depois do primeiro pull
- Story 7.3: Criar o aporte pendente uma vez por período
- Story 7.4: Não dar XP a transação pendente
- Story 7.5: Recuperar o XP uma vez só
- Story 7.6: Categorias sem duplicar entre aparelhos
- Story 7.7: Emitir cada conquista uma vez num parcelamento
- Story 7.8: Derivar o nível do log
- Story 7.9: Derivar o streak do log
- Story 7.10: Criar e excluir uma transação deixa o XP igual

## Requirements & Constraints

- **Identificadores Determinísticos e Deduplicação Natural:** Eventos emitidos por efeitos automáticos, agendadores ou migrações (conquistas, aporte pendente de poupança, recuperação de XP, categorias padrão e categorias criadas sob demanda) devem usar `id` determinístico derivado da chave natural do fato (ex.: `ach:{achievementId}`, `savings:{accountId}:{período}`, `xp-recovery:v1`, `cats:default:{categoryId}` e slug estável para categorias por nome). O reducer também deve deduplicar pela chave natural para preservar compatibilidade com eventos antigos que foram gerados com IDs aleatórios.
- **Barreira do Primeiro Pull no Boot:** Quando o aparelho pertence a um Grupo de sync ativo, efeitos automáticos de inicialização (agendador de aporte, recuperação de XP e criação de categorias padrão) só podem executar após a conclusão do primeiro pull de sincronização. Sem grupo configurado, rodam imediatamente; se o primeiro pull falhar ou expirar, liberam a execução após um tempo limite sem travar a interface.
- **Transações Pendentes Sem Recompensa Antecipada:** Transações criadas com `status: "pending"` (como aportes automáticos agendados) não concedem XP nem contam para o streak no momento da geração; o XP e o streak só são atribuídos quando a transação é efetivada/confirmada.
- **Consistência em Lotes, Parcelamentos e Recorrências:** Quando múltiplas transações são despachadas em sequência no mesmo ciclo (como compras parceladas ou recorrentes), a avaliação de conquistas e efeitos deve operar sobre o estado acumulado resultante dos eventos recém-enfileirados, nunca repetidamente sobre o snapshot estático do render inicial, evitando multiplicar conquistas pelo número de parcelas.
- **Nível e Streak Derivados sem Estado Absoluto:** Nível e streak devem ser funções puras calculadas a partir do log de eventos (XP total acumulado e datas das transações confirmadas), garantindo convergência determinística entre aparelhos independentemente da ordem de chegada no sync. Eventos legados `LEVEL_UP` e `STREAK_UPDATED` já gravados no histórico devem ser ignorados no cálculo do estado sem cair na Quarentena. Uma única fonte derivada de nível deve alimentar toda a interface.
- **Neutralidade de XP entre Criação e Exclusão:** O XP concedido por uma transação deve ficar vinculado ao `transactionId` de origem para que a exclusão desfaça exatamente o montante que aquela transação concedeu (incluindo o bônus de orçamento calculado na época da criação, inclusive em meses retroativos), impedindo ganhos líquidos por ciclos de criar e apagar. Transações legadas cujo evento de XP não possua vínculo explícito mantêm o cálculo de estorno anterior como fallback.
- **Preservação de Edições e Reconhecimento de Categorias:** A emissão de categorias padrão com ID determinístico não pode sobrescrever edições posteriores feitas em outro aparelho, e categorias criadas pelo formulário devem usar slugs estáveis compatíveis com as verificações de conquistas e troféus (como a categoria `dizimo`).
- **Fora de Escopo deste Épico:** A reformulação das regras de sorteio de troféus colecionáveis sazonais fica fora deste épico.

## Technical Decisions

- **Núcleo Funcional Puro (`packages/*`):** Reducers e engines em `packages/gamification` e `packages/domain` permanecem livres de dependências de plataforma (`react`, `react-native`, `expo`), relógio (`Date.now`) ou aleatoriedade (`Math.random`), mantendo o replay determinístico.
- **Idempotência Dupla (Storage + Reducer):** A tabela de eventos garante `INSERT OR IGNORE` por `event.id` (deduplicando emissões com ID determinístico idêntico entre aparelhos), enquanto o `gamificationReducer` garante idempotência semântica por chave de negócio (`achievementId`, `transactionId`, flag/prefixo de `xp-recovery-`) para lidar com o histórico anterior à padronização de IDs.
- **Cálculo de Streak por Dia Civil (`YYYY-MM-DD`):** O motor de streak opera sobre strings de data civil (`YYYY-MM-DD`) das transações confirmadas, com aritmética de calendário imune a fuso horário e horário de verão.
- **Roteamento Compatível de Eventos Legados:** `LEVEL_UP` e `STREAK_UPDATED` permanecem reconhecidos como tipos válidos no roteamento de `replayAllEvents` para que logs antigos não sejam enviados para a Quarentena, mas deixam de sobrescrever os valores derivados de nível e streak.
- **Testabilidade Sem `react-native`:** Como `vi.mock("react-native")` não funciona no Vitest, toda lógica de decisão de efeitos, geração de IDs determinísticos, coordenação de fila/estado em parcelamentos e derivação de nível/streak deve ser testável em funções ou módulos puros desacoplados de `react-native`.

## Cross-Story Dependencies

- **Dependências de Épicos Anteriores:**
  - **Épico 3 (Log que nunca quebra):** Fornece a ordem total de replay `(timestamp, deviceId, id)`, o isolamento de eventos inválidos em Quarentena e a aplicação de edições/exclusões fora de ordem.
  - **Épico 5 (Sync sem perda e sem eco):** Fornece o ciclo de pull paginado/incremental e a distinção entre eventos locais e eventos importados do grupo (que nunca disparam efeitos de gamificação ao serem importados).
- **Relações Internas no Épico 7:**
  - **Story 7.2 (Barreira do primeiro pull)** estabelece o sinal de sincronização inicial que protege os efeitos de boot ajustados na **Story 7.3 (Aporte pendente)**, **Story 7.5 (Recuperação de XP)** e **Story 7.6 (Categorias padrão)**.
  - **Story 7.3 e Story 7.4** complementam-se no fluxo de aportes agendados: a 7.3 impede duplicar a transação pendente entre aparelhos e a 7.4 impede que a transação pendente gere XP/streak antes da confirmação do usuário.
  - **Story 7.1 e Story 7.7** fecham as duas vias de duplicação de conquistas: entre aparelhos distintos (7.1) e dentro de um laço de parcelas/recorrência no mesmo aparelho (7.7).
  - **Story 7.8, Story 7.9 e Story 7.10** consolidam a integridade matemática do estado de gamificação derivado do log (nível único, streak derivado das transações e reversão exata de XP na exclusão).
