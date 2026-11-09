# Epic 5 Context: Sync sem perda e sem eco

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Transformar a sincronização multi-dispositivo do DOMUS em um mecanismo confiável, convergente e resiliente a falhas de conectividade, assegurando que alterações realizadas em um aparelho se propaguem aos demais em até 15 segundos sem duplicar dados, sem entrar em loops infinitos de retransmissão e sem desperdício de bateria ou banda. O épico introduz confirmação e reenvio de lotes não entregues, ingestão em fila assíncrona para rajadas de eventos, leitura incremental paginada por cursor, publicação eficiente por lotes imutáveis no Grupo forte e marcadores criptográficos de reset e restauração protegidos por confirmação explícita do usuário, impedindo que dados intencionalmente apagados ressuscitem a partir dos relays públicos.

## Stories

- Story 5.1: Testar o sync com três aparelhos simulados
- Story 5.2: Confirmar o envio por lote e reenviar os perdidos
- Story 5.3: Publicar só os lotes novos no Grupo forte
- Story 5.4: Ler o histórico de forma incremental e paginada
- Story 5.5: Enfileirar eventos recebidos em rajada
- Story 5.6: Nunca republicar o que veio do grupo
- Story 5.7: Propagar rápido, inclusive depois de ficar offline
- Story 5.8: Publicar o marcador de reset e de restauração
- Story 5.9: Pedir confirmação antes de apagar por causa de um marcador

## Requirements & Constraints

- **Propagação rápida e idempotente (FR-6):** Eventos gerados localmente com conectividade disponível devem alcançar todos os demais dispositivos pareados em até 15 segundos. A ingestão de um mesmo evento que chegue em duplicidade (por múltiplos relays concorrentes ou corrida entre assinatura WebSocket e pull periódico) deve ser estritamente idempotente com base no identificador único do evento (`id`).
- **Reconciliação offline automática (FR-6):** Dispositivos reconectados após períodos offline devem reconciliar o histórico de forma autônoma, importando eventos remotos acumulados e transmitindo os eventos locais represados sem duplicar transações ou corromper o estado do domínio.
- **Prevenção de loops e eco (FR-7):** Um evento recebido do grupo de sincronização jamais deve ser retransmitido de volta ao mesmo grupo. Em um ambiente com múltiplos dispositivos ativos trocando eventos, a contagem total de publicações deve ser de exatamente uma publicação por evento por grupo, mantendo-se constante ao longo do tempo.
- **Rastreamento de envio por grupo (FR-7):** O critério de envio deve consultar o registro de publicação por grupo (`publishedEvents`) e não o identificador do aparelho gerador (`deviceId`), garantindo que eventos gerados localmente (incluindo eventos recuperados de backup com identificadores antigos de aparelho) sejam transmitidos caso o grupo ainda não os possua.
- **Supressão de gamificação na replicação (FR-7):** A importação de eventos originados em outros dispositivos não deve disparar concessão de XP, avanço de níveis ou emissão de conquistas locais, evitando multiplicação indevida de recompensas pelo tráfego de rede.
- **Envio confirmado por lote e retentativa (FR-9):** O ciclo de push deve rastrear confirmações explícitas de entrega por lote. Um lote só deve ser assinalado como enviado quando confirmado por pelo menos um relay Nostr; lotes não confirmados em nenhum relay devem ser mantidos na fila e reenviados no ciclo subsequente, sem avanço indevido do cursor ou hash de envio.
- **Lotes imutáveis no canal forte (FR-9):** No Grupo forte, a publicação de eventos deve utilizar lotes imutáveis identificados pelo conteúdo (*content-addressed*). A adição de novos eventos a um log volumoso deve gerar apenas lotes incrementais novos, cessando a republicação de lotes anteriores decorrente da inserção de eventos com timestamps passados. O formato de lotes do canal antigo (`kind: 30333` com identificador `d`) deve ser mantido inalterado para não romper compatibilidade com versões antigas.
- **Leitura incremental e paginação do histórico (FR-9):** A leitura de histórico deve eliminar o teto rígido arbitrário de 500 registros sem paginação. O mecanismo de pull deve suportar paginação para recuperar históricos extensos (> 1.200 lotes) e realizar buscas incrementais baseadas no cursor de sincronização por relay, requisitando apenas lotes posteriores ao último cursor registrado e poupando rede e bateria.
- **Ingestão resiliente em rajada (FR-9):** Eventos recebidos em rajada via assinatura em tempo real não podem ser descartados quando houver outra importação em andamento. Todos os eventos recebidos devem ser acomodados em uma fila sequencial assíncrona, assegurando processamento ordenado e integral sem bloquear a thread de interface.
- **Marcadores de reset e restauração autenticados (FR-10):** As ações de limpeza (`resetApp`) e restauração de backup (`restoreFromBackup`) devem publicar um evento marcador assinado exclusivamente com o par de chaves do Grupo forte. Marcadores originados do Grupo antigo (XOR) não têm autoridade para comandar exclusão de dados. O processamento do marcador impede que o pull subsequente ressuscite dados excluídos. Eventos locais concorrentes criados offline antes da ciência do marcador devem ser preservados.
- **Retenção externa e transparência (FR-5, FR-10):** Eventos já transmitidos a relays Nostr públicos não são apagados fisicamente dos servidores descentralizados; o marcador de reset opera instruindo os clientes pareados a ignorar e não recriar os dados descartados.
- **Padrões de interface e mensagens (NFR-7):** Textos voltados ao usuário devem estar redigidos em português do Brasil (pt-BR) com acentuação correta. Diálogos informativos e confirmatórios devem invocar exclusivamente os serviços customizados da aplicação (`appAlert`/`appConfirm`), sem chamadas a diálogos bloqueantes do sistema nativo.

## Technical Decisions

- **Extração funcional e desacoplamento de plataforma (AD-3):** A lógica de controle de sincronização (regras de enfileiramento, decisões de push/pull, paginação, detecção de lotes e deduplicação) deve ser extraída dos hooks React (`useSyncEngine.ts`) para funções e classes puras, permitindo execução e validação abrangente no vitest sem carregar módulos nativos.
- **Harness de teste com Relay Falso em memória:** Implementação de um relay Nostr simulado em memória capaz de coordenar a concorrência entre três instâncias virtuais de aparelhos, viabilizando simulações determinísticas de latência, desconexões e convergência de estado sem dependência de serviços externos de rede.
- **Fila assíncrona FIFO de ingestão:** Substituição de flags de travamento concorrente (`isImportingRef`) por uma fila FIFO sequencial assíncrona, drenando mensagens WebSocket de forma ordenada e atômica no armazenamento local sem concorrência de escrita nem travamento de renderização (NFR-5).
- **Cursor de leitura desacoplado do timestamp de domínio (Story 3.6):** A ingestão incremental utiliza cursores operacionais específicos mantidos em `AsyncStorage` por relay, desacoplados dos carimbos temporais de domínio dos eventos financeiros.
- **Registro persistente de publicação por grupo (Story 4.6):** O controle de eventos enviados e recebidos por grupo reside em armazenamento de metadados de infraestrutura (`AsyncStorage`), sem poluir o log imutável de eventos de domínio.
- **Autenticidade criptográfica de marcadores de controle:** O marcador de reset e restauração é validado como evento de controle assinado pelo par de chaves do Grupo forte (derivado via HKDF na Story 4.1). Marcadores sem assinatura válida ou provenientes de canais legados são rejeitados de imediato.
- **Preservação de `packages/sync` congelado (AD-9):** Toda a evolução arquitetural e implementação dos módulos Nostr reside em `src/modules/` e `src/context/`, mantendo a pasta `packages/sync` intocada.
- **Ausência de servidor centralizado (AD-8):** Toda a troca de dados permanece descentralizada em relays Nostr públicos, operando por união determinística de eventos por `id` em ordem total `(timestamp, deviceId, id)` (AD-2).

## UX & Interaction Patterns

- **Confirmação explícita de exclusão remota:** Ao detectar um marcador de reset ou restauração emitido por outro aparelho pareado, o aplicativo deve apresentar obrigatoriamente um diálogo de confirmação via `appConfirm`, informando em linguagem clara que outro dispositivo solicitou a redefinição e solicitando autorização do usuário antes de expurgar qualquer dado local. Em caso de recusa pelo usuário, os dados locais são integralmente preservados.
- **Operação resiliente e silenciosa em segundo plano:** As rotinas de transmissão de lotes, leitura incremental, reconciliação pós-offline e retentativas de envio devem operar silenciosamente em segundo plano, sem emitir modais intrusivos para instabilidades transitórias de rede e preservando a fluidez da interface.

## Cross-Story Dependencies

- **Sequenciamento interno do Épico 5:**
  - Story 5.1 (Teste com três aparelhos simulados e relay falso) estabelece a suíte e a arquitetura pura necessárias para validar rigorosamente as histórias seguintes.
  - Stories 5.2 (Confirmação por lote e retry) e 5.3 (Lotes imutáveis no Grupo forte) estruturam a camada de transmissão confiável e econômica (push).
  - Stories 5.4 (Leitura incremental e paginada) e 5.5 (Fila de ingestão em rajada) implementam o canal robusto de recepção e ingestão sem perdas (pull/sub).
  - Story 5.6 (Supressão de eco e loops) utiliza o registro de publicação da Story 4.6 e a infraestrutura da Story 5.1 para impedir tempestades de replicação.
  - Story 5.7 (Propagação rápida e reconciliação offline) integra e valida ponta a ponta as Stories 5.2 a 5.6 sob cenários de desconexão e latência controlada.
  - Story 5.8 (Publicação e verificação de marcadores de reset/restore) estabelece o protocolo de controle assinado no Grupo forte.
  - Story 5.9 (Confirmação do usuário) consome o marcador da Story 5.8 e apresenta o diálogo interativo de proteção contra perda de dados.
- **Integração com outros épicos:**
  - **Epic 3 (Log robusto):** A leitura incremental da Story 5.4 fundamenta-se na separação do cursor dos relays (Story 3.6), enquanto a ordem total de replay (Story 3.4) e a quarentena (Story 3.2) asseguram que os eventos sincronizados gerem estados idênticos em todos os aparelhos (NFR-2).
  - **Epic 4 (Sync privado de verdade):** A identidade e derivação de chaves do Grupo forte (Story 4.1) provêm as credenciais para assinatura dos marcadores da Story 5.8; o registro de publicação por grupo (Story 4.6) é pré-requisito indispensável para a Story 5.6; e a janela de convivência (Story 4.7) exige a manutenção do formato legado na Story 5.3.
  - **Epic 7 (Gamificação consistente):** Depende diretamente da Story 5.6 para impedir a emissão duplicada de XP, streaks e conquistas ao sincronizar eventos entre dispositivos.
  - **Epic 10 (Sincronização abrangente de preferências e segredos):** Ancara-se no transporte confiável, sem perdas e sem loops do Epic 5 para trafegar preferências e dados sincronizados entre aparelhos pareados.
