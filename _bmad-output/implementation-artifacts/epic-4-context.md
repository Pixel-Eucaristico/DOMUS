# Epic 4 Context: Sync privado de verdade

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Garantir confidencialidade e integridade reais aos dados sincronizados via relays Nostr públicos, substituindo a criptografia legada (cifra XOR com chave derivada de código curto de 6 caracteres exposto em claro) por cifra autenticada (AES-GCM de 256 bits) fundamentada em um Segredo de grupo de alta entropia (mínimo 128 bits criptográficos) compartilhado via QR code ou texto. O épico estabelece uma janela de convivência controlada de 14 dias entre o Grupo antigo e o Grupo forte sem duplicação de dados nem loops, fornece migração assistida e, ao fim do prazo, desativa em definitivo o canal antigo, permitindo restaurar com veracidade a afirmação de criptografia de ponta a ponta nos canais públicos e na loja.

## Stories

- Story 4.1: Gerar o Segredo de grupo forte e derivar as chaves
- Story 4.2: Cifrar e decifrar eventos com cifra autenticada
- Story 4.3: Criar um Grupo forte e mostrá-lo por QR e por texto
- Story 4.4: Parear um aparelho por QR ou colagem
- Story 4.5: Publicar e ler eventos no Grupo forte
- Story 4.6: Registrar em qual grupo cada evento já foi publicado
- Story 4.7: Manter o Grupo antigo e o forte ao mesmo tempo
- Story 4.8: Migrar um aparelho do Grupo antigo para o forte
- Story 4.9: Cortar o Grupo antigo na versão mínima e na data
- Story 4.10: Reativar "ponta-a-ponta" no texto público depois do corte

## Requirements & Constraints

- **Segredo de alta entropia:** O Segredo de grupo deve possuir no mínimo 128 bits de aleatoriedade gerados por fonte criptográfica segura e ser codificado em texto legível (ex.: base32). O segredo não pode ser dedutível a partir da chave pública Nostr ou de dados públicos trafegados nos relays. O aplicativo não deve mais criar nem permitir grupos baseados no código legado de 6 caracteres.
- **Cifra autenticada (AEAD):** Criptografia de eventos com AES-GCM (chave de 256 bits derivada do segredo e nonce de 96 bits por mensagem). O texto cifrado precisa incluir marcador explícito de formato/versão para diferenciar da cifra XOR. Mensagens adulteradas nos relays ou com tag inválida devem ser prontamente rejeitadas sem expor conteúdo parcial. A leitura do formato legado XOR deve ser mantida apenas para compatibilidade durante o período de transição.
- **Armazenamento seguro de credenciais:** O Segredo de grupo deve ser mantido estritamente no `expo-secure-store` no ambiente nativo e em `webSecrets` na web (cifrado com AES-GCM no IndexedDB). É proibido gravar segredos em texto puro no `AsyncStorage`, em eventos do log ou em variáveis de ambiente embutidas no pacote (`EXPO_PUBLIC_*`).
- **Pareamento seguro e flexível:** Pareamento realizado por escaneamento de QR Code (`QRScannerModal`) ou colagem do segredo completo, eliminando o limite anterior de 8 caracteres no campo de entrada. Tentativas de parear com códigos legados de 6 caracteres devem ser rejeitadas com instrução explícita de uso do segredo forte/QR. Entradas incompletas ou corrompidas devem disparar erro e não ser salvas.
- **Prevenção de eco e duplicação entre grupos:** Manter controle persistente em armazenamento local por evento e por grupo ("publicado" / "recebido de"), persistindo após reinício do aplicativo. Eventos recebidos de um determinado grupo nunca devem ser republicados no mesmo grupo. Eventos gerados localmente devem ser enviados uma única vez para cada grupo ativo.
- **Janela de convivência controlada:** Aparelhos na versão nova mantêm leitura e escrita simultâneas no Grupo antigo e no Grupo forte durante a transição. Eventos gerados em um grupo devem ser propagados ao outro sem necessidade de repareamento forçado imediato e sem entrar em loop.
- **Isolamento de dados sensíveis:** Eventos portadores de dados altamente sensíveis (como holerites `PAYSLIP_*` e informações confessionais/religiosas) só podem ser transmitidos pelo Grupo forte, sendo terminantemente bloqueados no Grupo antigo.
- **Migração assistida com consentimento:** A migração do aparelho para o Grupo forte depende de confirmação explícita do usuário. Após confirmação, o aplicativo exibe o QR Code do Grupo forte para atualização dos demais dispositivos e sincroniza os eventos locais ainda não presentes no novo grupo sem gerar duplicatas.
- **Corte programado do formato fraco:** Ao atingir a data de corte (14 dias após a disponibilização do segredo forte) e a versão mínima estipulada, o aplicativo interrompe integralmente operações de leitura e escrita no Grupo antigo, emitindo aviso informativo aos usuários. Antes do corte, publica um evento de aviso no canal legado. O histórico local de eventos permanece preservado, e o histórico passado transmitido em XOR permanece documentado como risco residual.
- **Fidelidade das declarações públicas:** O termo "criptografia ponta a ponta" não deve ser utilizado em lojas ou documentos de privacidade enquanto o Grupo antigo permanecer operacional, podendo retornar apenas após a desativação completa do canal legado e verificação de código.
- **Padrões de interface:** Textos inteiramente em pt-BR com acentos corretos. Modais de alerta e confirmação devem usar o serviço customizado do app (`appAlert`/`appConfirm`), sem chamadas aos diálogos nativos do sistema.

## Technical Decisions

- **Módulos funcionais e puros:** A geração de segredo, derivação de chaves e operações criptográficas de cifra e decifra devem ser implementadas em módulos puros sem dependências de React, React Native ou Expo, viabilizando execução e testes unitários diretos no vitest.
- **Derivação de chaves via HKDF:** A identidade do Nostr (par de chaves) e a chave simétrica de 256 bits para o AES-GCM devem ser derivadas do Segredo de grupo via HKDF com rótulos e contextos independentes, evitando qualquer correlação reversa a partir da chave pública.
- **Isolamento de canais Nostr:** O Grupo forte deve operar com chave pública e identidade Nostr próprias, desacopladas da identidade do Grupo antigo, prevenindo correlação de tráfego nos relays.
- **Envelope e formato de eventos:** O envelope padrão imutável `{id, type, payload, timestamp, deviceId, signature}` é mantido. A integridade e confiança dos eventos derivam da chave de grupo autenticada (a assinatura individual continua opcional/vazia para compatibilidade).
- **Metadados operacionais de sync fora do log:** O registro de eventos enviados e recebidos por grupo pertence ao armazenamento de infraestrutura (`AsyncStorage`), sem registrar eventos no log funcional do domínio.
- **Ausência de servidor intermediário (AD-8):** A sincronização ocorre exclusivamente através de relays Nostr públicos, preservando `packages/sync` congelado e intocado (AD-9).
- **Execução não-bloqueante (NFR-5):** Tarefas criptográficas e publicações em lotes devem ser executadas de forma assíncrona, assegurando fluidez da interface sem congelar telas ou animações.

## UX & Interaction Patterns

- **Geração e Compartilhamento do Grupo Forte:** A tela de sincronização (`app/sync.tsx`) substitui o código de 6 caracteres pela criação do Grupo forte, exibindo o Segredo de grupo em QR Code para leitura por outros aparelhos e em texto com botão de cópia.
- **Entrada no Grupo Forte:** Disponibilização de botão para abertura do leitor de QR Code (`QRScannerModal`) e campo de texto expansível para colagem manual do segredo completo, acompanhado de validação imediata e feedback de erro para segredos truncados ou códigos legados.
- **Fluxo de Migração:** Apresentação de banner ou aviso de ação ("Migrar para o sync seguro") na tela de sincronização, solicitando confirmação por diálogo customizado (`appConfirm`) antes de promover a migração e exibir o novo QR Code.
- **Notificação pós-corte:** Usuários operando em grupos descontinuados após a data limite recebem notificação visual explicando a desativação e orientando a migração ou atualização do aplicativo.

## Cross-Story Dependencies

- **Ordem de implementação interna:**
  - Stories 4.1 (Segredo e HKDF) e 4.2 (AES-GCM) constituem os blocos criptográficos fundamentais e antecedem as demais histórias.
  - Stories 4.3 (Criação e exibição QR/texto) e 4.4 (Pareamento QR/colagem) dependem diretamente da derivação da Story 4.1.
  - Story 4.5 (Publicação e leitura no Grupo forte) requer as chaves da 4.1 e a cifra da 4.2.
  - Story 4.6 (Registro de publicação por grupo) é pré-requisito estrito para a convivência sem loops (Story 4.7) e para a migração consistente (Story 4.8).
  - Story 4.7 (Convivência simultânea) orquestra a publicação bidirecional controlada entre os canais antigo e forte.
  - Story 4.8 (Migração) utiliza a infraestrutura de publicação e os registros das Stories 4.5, 4.6 e 4.7.
  - Story 4.9 (Corte do Grupo antigo) encerra a janela de convivência da Story 4.7.
  - Story 4.10 (Restauração da menção a ponta a ponta) depende da desativação definitiva na Story 4.9.
- **Integração com outros épicos:**
  - **Epic 1 / FR-5:** Cumpre a exigência de manter a menção a "criptografia ponta a ponta" fora de textos públicos enquanto o canal XOR estiver ativo, reativando-a formalmente na Story 4.10.
  - **Epic 3 (Log robusto):** O processamento de eventos recebidos pelo novo canal ancora-se na validação de envelopes (Story 3.1) e suporte a versões desconhecidas (Story 3.8).
  - **Epic 5 (Sync sem perda e sem eco):** A assinatura do marcador de reset (FR-10) depende da chave do Grupo forte gerada no Epic 4.
  - **Epic 11 (Holerite):** Os eventos `PAYSLIP_*`, restringidos ao armazenamento local pela Story 11.4 durante o uso de XOR, passam a ser sincronizados pela Story 4.5.
  - **Epics 6 e 9:** Sincronização de preferências protegidas e segredos operacionais depende do canal cifrado seguro provido pelo Epic 4.
