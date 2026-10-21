---
status: final
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-DOMUS-2026-10-15/prd.md
  - _bmad-output/planning-artifacts/prds/prd-DOMUS-2026-10-15/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-DOMUS-2026-10-15/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-DOMUS-2026-10-15/reviews/review-adversary.md
  - _bmad-output/planning-artifacts/architecture/architecture-DOMUS-2026-10-15/reviews/review-rubric.md
  - _bmad-output/planning-artifacts/architecture/architecture-DOMUS-2026-10-15/reviews/review-versions.md
---

# DOMUS — Segurança e Atualização - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for DOMUS — Segurança e Atualização, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

*Os IDs seguem o PRD (`FR-n`) para manter rastreabilidade. FR-3 e FR-8 têm subitens.*

**A. Conformidade Play e plataforma**
- FR-1: Subir o target API do app para 36 (`targetSdkVersion` 36, `compileSdkVersion` igual ou maior), validar no Android 16 e enviar o AAB à Play até 25/10/2026.
- FR-2: Usar Node 24 (ou 22) no GitHub Actions e no EAS, declarado em `.nvmrc` e `engines`; o GitLab CI é legado e não é atualizado.
- FR-3: Atualizar o Expo SDK de 54 para 57 em três saltos independentes: 3a (54→55), 3b (55→56, com o codemod do `expo-router`), 3c (56→57); cada salto com `expo-doctor`, vitest, build e verificação no Android 16, reavaliando `patches/` e a Tamagui, medindo memória.
- FR-29: Teclado nunca cobre o campo: `KeyboardProvider` na raiz e só o keyboard-controller; telas, modais, buscas, chat e a câmera da NF sobem até o campo focado; checklist no aparelho.
- FR-4: Trocar o login do Google da API legada por Credential Manager e `AuthorizationClient`, sem `client_secret` no app, com reconexão única explicada.

**B. Verdade na privacidade**
- FR-5: Corrigir os textos públicos (loja e `app/privacy-policy.tsx`): remover "SQLite criptografado", trocar ou remover "ponta-a-ponta" enquanto o Grupo antigo existir, trocar WebRTC por relays Nostr, explicar que Eventos já publicados continuam nos relays, e listar todos os fluxos no *Data safety*.

**C. Sync completo e sem eco**
- FR-6: Propagar Eventos aos outros Aparelhos em até 15 segundos com rede, reconciliar offline sozinho e aplicar o mesmo Evento uma só vez.
- FR-7: Nunca republicar Evento recebido do grupo nem gerar efeito de gamificação por ele; publicar Evento local (inclusive de backup restaurado) se o grupo não o tem; o limite de uma publicação por Evento vale por Grupo.
- FR-8: Sincronizar os dados do usuário em três etapas:
  - FR-8a: inventariar e classificar todo dado fora do log (vira Evento, outro canal, não sincroniza, é Segredo).
  - FR-8b: passar para Eventos os dados de baixo risco (tema, som, modo de apoio, configuração de IA e OCR sem chave, preferência e e-mail do Drive) e, só depois do Grupo forte, a preferência religiosa; o histórico de chat da IA não sincroniza; cada Aparelho faz o próprio login do Google.
  - FR-8c: sincronizar chaves de IA e OCR só entre Aparelhos nativos, com opt-in, depois do Grupo forte; o navegador não recebe chaves.
- FR-9: Confirmar o envio por lote e reenviar os perdidos; ler o histórico de forma paginada e incremental; republicar só os lotes alterados; enfileirar Eventos em rajada.
- FR-10: Publicar marcador de reset e restore assinado com a chave do Grupo forte; o Aparelho receptor pede confirmação antes de apagar; preservar Eventos offline concorrentes.
- FR-11: Fazer o backup do Drive ter o mesmo escopo do sync; chaves de API só pelo caminho de opt-in do FR-8c.

**D. Sigilo do sync**
- FR-12: Cifrar os Eventos do Grupo forte com cifra autenticada (por exemplo AES-GCM, chave de 256 bits), detectando adulteração.
- FR-13: Criar e parear o Grupo forte com Segredo de grupo de pelo menos 128 bits, por QR ou colagem; não criar nem aceitar Grupo novo com código de 6 caracteres.
- FR-14: Manter o Grupo antigo e o Grupo forte em paralelo numa Janela de convivência, com migração confirmada pelo usuário, versão mínima, data de corte e aviso à versão antiga.

**E. Log robusto**
- FR-15: Validar envelope e tipo na importação; isolar cada Evento no Replay; mandar Evento inválido ou desconhecido para Quarentena sem descartá-lo; o app abre mesmo com payload nulo.
- FR-16: Ordenar o Replay por `(timestamp, deviceId, id)` em memória e no SQLite; rejeitar na importação `timestamp` acima de agora + 24 h e nunca reescrevê-lo; separar o cursor dos relays do `timestamp` de domínio; deixar pendente o Evento que chega antes do alvo.
- FR-17: Evoluir payloads só por campo opcional ou `schemaVersion` com conversão no reducer; comportar `profileId` futuro.
- FR-18: Cifrar o log da web com `webSecrets` e não persistir em texto puro sem WebCrypto.

**F. Gamificação consistente**
- FR-19: Dar `id` determinístico aos Eventos de efeito (XP, conquistas, aporte pendente, recuperação de XP, categorias padrão); rodar efeitos só depois do primeiro pull; não pagar XP de transação pendente; emitir cada conquista uma vez em parcelamento; não duplicar categorias.
- FR-24: Derivar nível e streak do log, sem Evento de valor absoluto; manter uma só fonte do nível; criar e excluir uma transação deixa o XP igual.

**G. Qualidade e operação**
- FR-20: Corrigir ou isolar com motivo os 25 testes que falham, deixando `npx vitest run` verde.
- FR-21: Rodar `npx expo lint` e `npx vitest run` nos workflows do GitHub Actions e falhar se quebrarem; `tsc` só depois de zerar o baseline de tipos.
- FR-22: Publicar a versão sem `client_secret` antes de revogar o segredo antigo; revogar só depois da adoção; validar o Drive num Android real.
- FR-23: Mover a chave de OCR e a senha do auto-backup para `expo-secure-store` (nativo) ou `webSecrets` (web), com migração; remover ou avisar a queda silenciosa do `SecureStore` para `AsyncStorage` no código do Grupo antigo.

**H. Recursos de uso** *(Sprint Change Proposal de 16/10/2026)*
- FR-25: Tooltips ancorados com glossário financeiro único; dicas no 50/30/20, no CDB e no holerite; atalhos "O que é…?" no chat da IA com `tooltipsEnabled`.
- FR-26: Leitor de holerite (parser, Vision OCR com fallback local, revisão, receita, histórico e gráfico) como Evento com `schemaVersion`, sem nome do funcionário e sem publicar no Grupo antigo.
- FR-28: Privacidade por escolha: flag de ativação em todo envio (nova flag para consultas de itens, preços e ícones), texto "o que transmite / o que perde" e correção das fraquezas D8 a D12.
- FR-27: Animação própria por troféu: cada troféu ganha o seu Lottie (pipeline `scripts/gen_trophy_*.js`, aprovado pelo dono), também na web; o SVG fica como reserva até a aprovação.

### NonFunctional Requirements

- NFR-1: Nenhum Segredo em `AsyncStorage` em texto puro, em `EXPO_PUBLIC_*` ou em Evento em texto puro; verificado por regra de ESLint e pela revisão do inventário do FR-8a a cada release.
- NFR-2: O mesmo conjunto de Eventos produz o mesmo estado em qualquer Aparelho.
- NFR-3: O Replay nunca lança; o app inicia com log parcialmente corrompido.
- NFR-4: Eventos de versões já publicadas continuam válidos, sem perda de dados.
- NFR-5: Sync e cifra nunca bloqueiam a interface (offline-first).
- NFR-6: Toda afirmação pública de privacidade e segurança é verificável no código.
- NFR-7: Todo texto de interface em pt-BR com acentuação completa.

### Additional Requirements

*Do spine de arquitetura (`AD-n`), das restrições do PRD e das revisões. Projeto brownfield: não há starter template.*

- AD-1: o estado é sempre o replay do log; nunca persistir estado derivado; `dispatch` só grava e `dispatchDomainEvent` grava e dispara os efeitos de gamificação.
- AD-2: o log é append-only e idempotente por `id` (`INSERT OR IGNORE`); envelope `{id, type, payload, timestamp, deviceId, signature}`; a assinatura fica vazia e a confiança vem da chave do grupo; replay em ordem total.
- AD-3: `packages/*` nunca importam `react`, `react-native` nem `expo`; reducers puros; um só gerador de id (`generateId` de `packages/events`).
- AD-4: todo tipo de evento novo precisa de rota em `replayAllEvents`; tipo não roteado é descartado no Replay.
- AD-6: segredos só em `expo-secure-store` (na web, `webSecrets`); nenhum segredo em `EXPO_PUBLIC_*`; FR-8c exige atualizar este AD com a exceção documentada.
- AD-7: dinheiro é `number` em reais, arredondado a 2 casas ao criar o evento.
- AD-8: o sync troca o log pelos relays Nostr públicos; sem servidor próprio; merge por união de `id`.
- AD-9: `packages/sync`, `replit.md`, `replit.nix` e `.replit` são intocáveis; `packages/core` é legado.
- AD-11: os pipelines canônicos são EAS e GitHub Actions; o GitLab CI é legado.
- Integrações externas: relays Nostr, Google Drive, Firebase (Analytics, Crashlytics, Performance), AdMob, provedores de IA (openai, gemini, claude, deepseek, qwen) e OCR de terceiros.
- Prazo duro: AAB com target API 36 enviado até 25/10/2026; a Play estendeu o prazo até 01/11/2026.
- Testes: `npx vitest run` é o runner; `vi.mock("react-native")` não funciona (usar `process.env.EXPO_OS` ou lógica sem `react-native`); a suíte tem 25 falhas pré-existentes (FR-20).
- Baseline de lint: `npx eslint .` tem 190 erros em 100 arquivos (173 em `scripts/` por globais do Node sem configuração, 3 em pastas de ferramentas de agente, 15 em `src/` e `app/`, incluindo 7 de hooks chamados condicionalmente em `DebugTools.tsx`, `AnimatedSeasonalTrophy.tsx` e `WishlistSearchWebView.tsx`); o gate do FR-21 só passa depois de zerá-lo.
- Dependências entre FRs: FR-3 depende de FR-20; FR-21 depende de FR-20; FR-12 depende de FR-13; FR-8c depende de FR-12 e FR-13; FR-11 depende de FR-8; FR-22 depende de FR-1 publicado.
- Ordem de entrega proposta (PRD §6.3): FR-1 e FR-5; FR-22; FR-20 e FR-21; FR-2; FR-15, FR-16, FR-17; FR-13, FR-12, FR-14; FR-9, FR-10, FR-7, FR-6; FR-19, FR-24, FR-18, FR-23; FR-3a a 3c; FR-4; FR-8a a 8c e FR-11.
- Risco residual declarado: Eventos já publicados em XOR continuam legíveis por força bruta do código de 6 caracteres.

### UX Design Requirements

Não há documento de UX. O trabalho de interface se limita a mensagens de reconexão (FR-4), migração do Grupo (FR-14), confirmação de reset (FR-10), aviso de corte (FR-14) e textos de privacidade (FR-5), todos cobertos nos FRs correspondentes.

### FR Coverage Map

FR-1: Epic 1 - target API 36 e AAB enviado até 25/10/2026
FR-5: Epic 1 - textos públicos iguais ao comportamento e Data safety completo
FR-22: Epic 1 - publicar sem `client_secret`, revogar só após adoção, validar o Drive
FR-20: Epic 2 - baseline de testes verde
FR-21: Epic 2 - gate de lint e testes na CI
FR-2: Epic 2 - Node 24 (ou 22) no GitHub Actions e no EAS
FR-15: Epic 3 - importar e reproduzir sem quebrar (Quarentena)
FR-16: Epic 3 - ordem total de replay e limite de `timestamp`
FR-17: Epic 3 - evolução de payload com `schemaVersion`
FR-13: Epic 4 - Grupo forte e Segredo de grupo
FR-12: Epic 4 - cifra autenticada no Grupo forte
FR-14: Epic 4 - Janela de convivência e corte do Grupo antigo
FR-9: Epic 5 - envio confiável, leitura incremental e fila
FR-10: Epic 5 - reset e restauração sem ressuscitar dados
FR-7: Epic 5 - nunca republicar o que veio do grupo
FR-6: Epic 5 - propagação rápida, offline e sem duplicar
FR-23: Epic 6 - segredos atuais em armazenamento seguro
FR-18: Epic 6 - log da web cifrado
FR-19: Epic 7 - efeitos de gamificação sem duplicar entre aparelhos
FR-24: Epic 7 - nível e streak sem estado absoluto
FR-3: Epic 8 - Expo SDK 54→57 em três saltos (3a, 3b, 3c)
FR-4: Epic 8 - login do Google com Credential Manager e AuthorizationClient
FR-8: Epic 9 e Epic 10 - 8a inventário e 8b (preferências de baixo risco) no Epic 9; 8b (preferência religiosa) e 8c (segredos opt-in nativos) no Epic 10
FR-11: Epic 10 - Google Drive com o mesmo escopo do sync
FR-25: Epic 11 - tooltips com glossário financeiro
FR-26: Epic 11 - leitor de holerite (local até o Grupo forte)
FR-27: Epic 11 - Lottie próprio para cada troféu
FR-28: Epic 12 - privacidade por escolha e correção das fraquezas D8 a D12
FR-29: Epic 13 - teclado nunca cobre o campo

## Epic List

### Epic 1: Publicável e verdadeiro
A pessoa continua recebendo o app pela Play (target API 36) e o que a loja e a política dizem sobre privacidade é verdade; o segredo antigo do Google é desativado sem derrubar o Drive de ninguém.
**FRs covered:** FR-1, FR-5, FR-22
**Prazo:** AAB enviado até 25/10/2026 (a Play estendeu até 01/11/2026). A revogação do FR-22 só ocorre depois da adoção.

### Epic 2: Base confiável para mudar
O dono integra mudanças e troca o Node sabendo que lint e testes protegem o app (valor para quem mantém o app).
**FRs covered:** FR-20, FR-21, FR-2

### Epic 3: Log que nunca quebra
A pessoa abre o app e vê o mesmo estado em todo aparelho, mesmo com dado inválido, desconhecido ou fora de ordem.
**FRs covered:** FR-15, FR-16, FR-17

### Epic 4: Sync privado de verdade
Os dados que passam pelos relays ficam protegidos por um segredo forte; o Grupo antigo convive por uma janela curta e depois é desligado.
**FRs covered:** FR-13, FR-12, FR-14
**Risco:** muda o formato criptográfico; o histórico já publicado em XOR continua um risco residual declarado.

### Epic 5: Sync sem perda e sem eco
O dado criado num aparelho chega aos outros em até 15 segundos, sem duplicar nem entrar em loop, e reset ou restauração não ressuscitam dados.
**FRs covered:** FR-9, FR-10, FR-7, FR-6
**Depende de:** Epic 3 e Epic 4 (o marcador de reset do FR-10 usa a chave do Grupo forte).

### Epic 6: Segredos protegidos no aparelho
A chave do OCR e a senha do auto-backup deixam de ficar em texto puro, no nativo e na web.
**FRs covered:** FR-23, FR-18

### Epic 7: Gamificação igual em todos os aparelhos
XP, conquistas, nível e streak batem entre aparelhos e nada é pago em dobro por ter mais de um aparelho ou por parcelamento.
**FRs covered:** FR-19, FR-24
**Depende de:** Epic 3 e Epic 5.

### Epic 8: Plataforma moderna
O app roda no Expo SDK 57 e usa o login moderno do Google, sem depender de API deprecada.
**FRs covered:** FR-3 (3a, 3b, 3c), FR-4
**Depende de:** Epic 2 (baseline verde antes do primeiro salto).

### Epic 9: Configurações iguais em todos os aparelhos
Tema, som, modo de apoio e a configuração de IA e de OCR (sem chave) ficam iguais em todos os aparelhos, e existe um inventário que classifica tudo que o app guarda fora do log.
**FRs covered:** FR-8a, FR-8b (preferências de baixo risco)
**Depende de:** Epic 3 (log robusto e `schemaVersion`). Não leva dado sensível, então pode vir logo depois do Epic 3.

### Epic 11: Recursos de uso
A pessoa entende os termos financeiros na hora, acompanha o salário pelo holerite e vê cada troféu com uma animação ligada ao tema dele.
**FRs covered:** FR-25, FR-26, FR-27
**Ordem:** 11.1 e 11.2 logo depois do Epic 1 (decisão do dono); 11.3 a 11.6 depois das stories 3.1, 3.3 e 3.8; o holerite só sincroniza pelo Grupo forte (Epic 4).
**Origem:** Sprint Change Proposal de 16/10/2026.

### Epic 13: Teclado nunca cobre o campo
A pessoa digita em qualquer campo do app vendo o campo e o botão de confirmar, em telas, modais e no chat.
**FRs covered:** FR-29
**Ordem:** depois do AAB de 25/10 (Story 1.6); antecipa só se a Story 1.3 achar campo coberto que impeça o uso.
**Origem:** Sprint Change Proposal de 20/10/2026.

### Epic 12: Privacidade por escolha
A pessoa ativa cada envio pela flag do recurso, sabe o que perde ao não ativar, e as fraquezas encontradas na Story 1.4 deixam de existir.
**FRs covered:** FR-28
**Ordem:** 12.1 a 12.3 antes do AAB de 25/10; o resto logo depois do Epic 1.
**Origem:** Sprint Change Proposal "Privacidade por escolha" de 16/10/2026.

### Epic 10: Segredos e backup em todos os aparelhos
A preferência religiosa e o escopo completo do backup do Drive acompanham o usuário entre aparelhos, e as chaves de IA e OCR sincronizam só entre aparelhos nativos, com opt-in.
**FRs covered:** FR-8b (preferência religiosa), FR-8c, FR-11
**Depende de:** Epic 4, Epic 5, Epic 6 e Epic 9.
**Fora do escopo:** histórico de chat da IA (decisão do dono).

## Epic 1: Publicável e verdadeiro

A pessoa continua recebendo o app pela Play (target API 36) e o que a loja e a política dizem sobre privacidade é verdade; o segredo antigo do Google é desativado sem derrubar o Drive de ninguém.

### Story 1.1: Consolidar as correções de segredo na `dev`

As a dono do DOMUS,
I want as correções de segredo já implementadas versionadas na `dev`,
So that o código publicado não tenha segredo exposto.

**Implementa:** FR-22

**Acceptance Criteria:**

**Given** as mudanças (group code no SecureStore, Drive sem `client_secret`, `webSecrets`, regra de ESLint e workflows sem o segredo) estão em commits separados por tema
**When** a PR com elas é integrada na `dev`
**Then** `npx vitest run` mostra só as 25 falhas pré-existentes, nenhuma nova
**And** `git grep CLIENT_SECRET` não retorna nada
**And** `npx expo lint` não acusa erro na regra de `EXPO_PUBLIC_*`.

### Story 1.2: Mirar a API 36 no build de release

As a dono do DOMUS,
I want o app compilado com target API 36,
So that a Play aceite novas atualizações.

**Implementa:** FR-1

**Acceptance Criteria:**

**Given** `app.json` com `targetSdkVersion` 35
**When** altero `expo-build-properties` para `targetSdkVersion` 36 e `compileSdkVersion` 36 ou maior
**Then** o build de release gera um AAB que declara target 36
**And** `patch-package` aplica os 4 patches de `patches/` sem erro
**And** o workflow Android do GitHub Actions termina verde.

### Story 1.3: Validar no Android 16 e corrigir o que quebrar

As a usuário do DOMUS num Android 16,
I want que as telas principais funcionem depois da atualização,
So that o app não quebre no meu uso.

**Implementa:** FR-1

**Acceptance Criteria:**

**Given** o app com target 36 instalado num aparelho Android 16 do dono
**When** abro, em ordem, as abas principais, a introdução por tela, a câmera/OCR, o backup e o sync
**Then** nenhuma tela falha e o conteúdo não fica sob as barras do sistema
**And** uma checklist com o resultado fica salva em `docs/`

**Given** um item reprova
**When** não houver correção possível até 01/11/2026
**Then** o dono decide e registra se aceita a perda de disponibilidade para novos usuários em aparelhos mais novos.

### Story 1.4: Corrigir a descrição da loja e a política de privacidade

As a usuário do DOMUS,
I want ler só afirmações verdadeiras sobre onde meus dados ficam,
So that eu confie no que o app promete.

**Implementa:** FR-5

**Acceptance Criteria:**

**Given** `PLAY_STORE_LISTING.md` e `app/privacy-policy.tsx`
**When** aplico as correções
**Then** "SQLite criptografado" deixa de aparecer
**And** "criptografia ponta-a-ponta" no sync é removida ou trocada por "cifrado com a chave do grupo"
**And** a política descreve o sync por relays Nostr, não por WebRTC
**And** a política diz que Eventos já publicados continuam nos relays depois de excluir o app
**And** comparo com o texto publicado na loja e corrijo qualquer diferença.

### Story 1.5: Alinhar o formulário Data safety ao comportamento

As a dono do DOMUS,
I want o formulário Data safety listando todos os fluxos de dados,
So that o app cumpra a política da Play.

**Implementa:** FR-5

**Acceptance Criteria:**

**Given** os fluxos que enviam dados para fora do aparelho
**When** os levanto em `docs/data-safety.md`
**Then** a lista inclui relays Nostr, Google Drive, provedores de IA, OCR de terceiros, Firebase (Analytics, Crashlytics, Performance) e anúncios, cada um com o dado enviado e o consentimento
**And** o formulário no Play Console fica igual à lista
**And** a política da Story 1.4 e a lista dizem o mesmo
**And** o fluxo "provedores de IA e OCR" cita que fotos de documentos financeiros (nota fiscal e holerite) são enviadas ao provedor escolhido pelo usuário.

### Story 1.6: Enviar o AAB com target 36 à Play até 25/10/2026

As a dono do DOMUS,
I want a atualização enviada até a data interna,
So that eu cumpra o prazo da Play (01/11/2026).

**Implementa:** FR-1, FR-5

**Acceptance Criteria:**

**Given** as Stories 1.1 a 1.5 concluídas
**When** aumento `version` e `versionCode` e envio o AAB assinado
**Then** o Play Console aceita sem aviso de *target API*
**And** o envio acontece até 25/10/2026

**Given** o envio não saiu até 25/10
**When** chega 29/10
**Then** o dono decide como cumprir até 01/11 ou aceitar a perda de disponibilidade.

### Story 1.7: Verificar que o build publicado não tem o `client_secret`

As a dono do DOMUS,
I want confirmar que o app publicado não contém o segredo do Google e que o Drive funciona,
So that o segredo antigo possa ser revogado.

**Implementa:** FR-22

**Acceptance Criteria:**

**Given** o AAB da Story 1.6
**When** extraio o bundle e busco por `GOCSPX-` e `CLIENT_SECRET`
**Then** nada é encontrado
**And** num Android real, conectar o Drive e fazer um backup completo funciona
**And** o resultado fica registrado em `docs/`.

### Story 1.8: Revogar o segredo antigo do Google depois da adoção

As a dono do DOMUS,
I want revogar o `client_secret` antigo,
So that ele deixe de valer em builds antigos.

**Implementa:** FR-22

**Acceptance Criteria:**

**Given** o app sem segredo publicado e instalado nos aparelhos do dono e dos usuários ativos
**When** revogo ou rotaciono o segredo no Google Cloud Console
**Then** os aparelhos atualizados continuam com o Drive funcionando
**And** as versões antigas deixam de renovar o token do Drive, e isso é comunicado aos usuários ativos

**Given** algum usuário ativo ainda está na versão antiga
**When** chega a data de revogação
**Then** o dono adia ou avisa antes de revogar.

## Epic 2: Base confiável para mudar

O dono integra mudanças e troca o Node sabendo que lint e testes protegem o app (valor para quem mantém o app).

### Story 2.1: Alinhar os testes de XP com as regras de XP que valem

As a dono do DOMUS,
I want os testes de XP refletindo as regras que valem,
So that o motor de XP não tenha falha conhecida.

**Implementa:** FR-20

**Acceptance Criteria:**

**Given** os 12 testes que falham (10 em `packages/gamification` e 2 em `packages/__tests__/integration`) esperam valores diferentes dos que o motor devolve (por exemplo esperam 10 e recebem 5; esperam 60 e recebem 15)
**When** o dono decide, para cada regra, qual valor é o correto
**Then** o teste ou o motor é corrigido para esse valor, com o motivo no commit
**And** `npx vitest run packages/gamification packages/__tests__` passa
**And** nenhuma regra de XP muda sem a decisão do dono registrada.

### Story 2.2: Corrigir os testes do parser SEFAZ

As a dono do DOMUS,
I want o parser da NF-e coberto por testes que passam,
So that a leitura de nota fiscal não quebre sem eu perceber.

**Implementa:** FR-20

**Acceptance Criteria:**

**Given** os 9 testes de `packages/parsers/__tests__/sefazParser.test.ts` falham com resultado indefinido (`items`, `totalAmount`, `date`, `invoiceId`)
**When** investigo se o parser mudou o formato de retorno ou se os fixtures de HTML ficaram obsoletos
**Then** corrijo o parser ou os testes, com o motivo registrado
**And** os 9 testes passam
**And** a leitura de uma NF-e real continua funcionando no app.

### Story 2.3: Corrigir os testes de erro HTTP dos adaptadores de IA

As a dono do DOMUS,
I want os adaptadores de IA cobertos por testes de erro que passam,
So that uma falha de rede da IA seja tratada como esperado.

**Implementa:** FR-20

**Acceptance Criteria:**

**Given** os 3 testes que falham em `packages/ai/__tests__/adapters.test.ts` (`OpenAIAdapter` e `ChatGPTOAuthAdapter` com erro HTTP, `DeepSeekAdapter` com 429)
**When** comparo o que o teste espera com o que o adaptador faz em erro
**Then** corrijo o adaptador ou o teste, com o motivo registrado
**And** os 3 testes passam
**And** um erro HTTP de IA continua mostrando a mensagem de erro ao usuário.

### Story 2.4: Resolver o teste de `importInvoice` e o teste de `season`

As a dono do DOMUS,
I want os dois testes restantes resolvidos,
So that a suíte termine sem falha.

**Implementa:** FR-20

**Acceptance Criteria:**

**Given** `packages/parsers/__tests__/importInvoice.test.ts` importa `../src/importInvoice`, módulo que não existe mais
**When** decido entre remover o teste ou restaurar o módulo
**Then** a suíte não falha mais por módulo ausente

**Given** o teste de `season` ("should return true when different month") depende da data atual
**When** fixo o relógio do teste
**Then** o resultado não muda com a data de execução
**And** `npx vitest run` termina sem nenhuma falha.

### Story 2.5: Configurar o ESLint para `scripts/` e pastas de ferramentas

As a dono do DOMUS,
I want o ESLint entendendo os scripts Node e ignorando pastas de ferramentas,
So that o lint só aponte problema do app.

**Implementa:** FR-21

**Acceptance Criteria:**

**Given** `npx eslint .` tem 173 erros `no-undef` em `scripts/` (`require`, `__dirname`, `__filename`) e 3 em `.claude/`, `.agent/` e `.agents/`
**When** configuro os globais do Node para `scripts/` e adiciono as pastas de ferramentas e `_bmad/` ao `ignores`
**Then** esses 176 erros somem
**And** a regra contra `EXPO_PUBLIC_*` com segredo continua ativa
**And** nenhum erro novo aparece em `src/` e `app/`.

### Story 2.6: Corrigir os erros de lint reais em `src/` e `app/`

As a usuário do DOMUS,
I want os componentes sem hooks chamados condicionalmente,
So that o app não falhe de forma imprevisível.

**Implementa:** FR-21

**Acceptance Criteria:**

**Given** os 15 erros restantes (7 `react-hooks/rules-of-hooks` em `DebugTools.tsx`, `AnimatedSeasonalTrophy.tsx` e `WishlistSearchWebView.tsx`, 6 `react/no-unescaped-entities`, 1 `no-dupe-keys` e o restante `no-undef`)
**When** corrijo cada um sem mudar o comportamento da tela
**Then** `npx expo lint` termina com zero erros
**And** os 3 componentes com hook condicional continuam abrindo e funcionando
**And** `npx vitest run` não tem nenhuma falha nova.

### Story 2.7: Usar Node 24 nos workflows e declarar a versão

As a dono do DOMUS,
I want a CI e o desenvolvimento em Node com suporte,
So that eu não dependa de uma versão sem correções de segurança.

**Implementa:** FR-2

**Acceptance Criteria:**

**Given** os workflows do GitHub Actions usam Node 20
**When** troco para Node 24 (ou 22) e declaro a versão em `.nvmrc` e `engines` de `package.json`
**Then** os workflows `build-android.yml` e `build-ios.yml` terminam verdes com `npm ci`
**And** o `eas.json` fixa a versão do Node nos perfis de build e o build EAS termina verde
**And** o GitLab CI não é alterado (legado).

### Story 2.8: Barrar lint e testes na CI

As a dono do DOMUS,
I want uma verificação automática de lint e testes,
So that mudança que quebra algo não seja integrada.

**Implementa:** FR-21

**Acceptance Criteria:**

**Given** o lint e os testes sem falha (Stories 2.1 a 2.6) e o Node novo (2.7)
**When** crio um workflow do GitHub Actions que roda `npx expo lint` e `npx vitest run` em cada PR e push
**Then** o workflow falha se o lint ou algum teste falhar
**And** ele termina verde na `dev` atual
**And** o `tsc --noEmit` fica fora do gate até o baseline de tipos ser zerado.

## Epic 3: Log que nunca quebra

A pessoa abre o app e vê o mesmo estado em todo aparelho, mesmo com dado inválido, desconhecido ou fora de ordem.

### Story 3.1: Validar o envelope e o tipo na importação

As a usuário do DOMUS,
I want que um evento recebido só seja gravado se for válido,
So that um dado ruim de outro aparelho não entre no meu log.

**Implementa:** FR-15

**Acceptance Criteria:**

**Given** `parseSyncPayload` (`src/modules/nostrSync.ts`) mapeia qualquer JSON sem validar
**When** crio uma função pura de validação do envelope (`id`, `type`, `timestamp`, `deviceId` e `payload` presentes e do tipo certo) e a aplico antes de gravar
**Then** um evento com payload nulo, `id` ausente ou `type` fora dos tipos conhecidos não é gravado no SQLite
**And** um JSON malformado não lança erro para o resto do lote
**And** a validação roda no vitest sem importar `react-native`.

### Story 3.2: Isolar cada evento no replay e registrar a Quarentena

As a usuário do DOMUS,
I want que um evento defeituoso não derrube o app,
So that eu consiga abrir o app mesmo com um dado ruim no log.

**Implementa:** FR-15

**Acceptance Criteria:**

**Given** `replayAllEvents` (`src/context/AppStateProvider.tsx`) roda sem `try/catch` dentro de um `useMemo`
**When** cada evento passa a ser aplicado isoladamente
**Then** um evento que lança erro vai para a Quarentena com o motivo, e os demais são aplicados
**And** com um evento de payload nulo no log, o app abre
**And** a Quarentena guarda o `id`, o tipo e o motivo para diagnóstico
**And** o estado resultante é o mesmo que seria sem o evento defeituoso.

### Story 3.3: Reprocessar eventos desconhecidos depois de atualizar o app

As a usuário do DOMUS,
I want que eventos de uma versão mais nova não sejam perdidos,
So that eu não perca dados ao atualizar o app depois do outro aparelho.

**Implementa:** FR-15

**Acceptance Criteria:**

**Given** um evento de tipo desconhecido (de uma versão mais nova) está na Quarentena
**When** abro uma versão do app que passa a conhecer o tipo
**Then** o evento é reprocessado e aplicado
**And** enquanto o tipo é desconhecido, o evento **não** é descartado nem apagado do log
**And** um evento inválido por outro motivo continua em Quarentena.

### Story 3.4: Ordem total do replay em memória e no SQLite

As a usuário do DOMUS,
I want o mesmo estado em todo aparelho para os mesmos eventos,
So that dois aparelhos não mostrem saldos diferentes.

**Implementa:** FR-16

**Acceptance Criteria:**

**Given** `ORDER BY timestamp ASC` no SQLite e três `sort` por `timestamp` em `src/hooks/useEventStore.ts`
**When** crio um único comparador `(timestamp, deviceId, id)` e o uso no SQLite e na memória
**Then** dois eventos com o mesmo `timestamp` ficam sempre na mesma ordem
**And** um teste aplica o mesmo conjunto de eventos em 3 ordens de chegada diferentes e obtém o mesmo estado
**And** o estado recarregado do SQLite é igual ao estado em memória.

### Story 3.5: Rejeitar `timestamp` no futuro e nunca reescrevê-lo

As a usuário do DOMUS,
I want que um relógio errado em outro aparelho não bagunce meu histórico,
So that um evento com data absurda não passe na frente dos outros.

**Implementa:** FR-15, FR-16

**Acceptance Criteria:**

**Given** a validação da Story 3.1
**When** um evento chega com `timestamp` acima de `agora + 24 h`
**Then** ele vai para a Quarentena
**And** depois de aceito, o `timestamp` de um evento nunca é reescrito
**And** o limite de 24 h é um valor único e configurável no código.

### Story 3.6: Separar o cursor de leitura dos relays do `timestamp` do evento

As a usuário do DOMUS,
I want que a leitura do sync não perca nem releia eventos por causa de datas,
So that o sync seja confiável.

**Implementa:** FR-16

**Acceptance Criteria:**

**Given** o cursor `lastPullTs` mistura o `timestamp` do evento com o `created_at` do relay
**When** passo a guardar o cursor de leitura separado do `timestamp` de domínio
**Then** o cursor só avança com base no que veio do relay
**And** um evento com `timestamp` antigo recebido agora não é perdido
**And** um teste cobre um evento antigo chegando depois de um novo.

### Story 3.7: Aplicar edição e exclusão que chegam antes do alvo

As a usuário do DOMUS,
I want que excluir uma transação funcione mesmo se a exclusão chegar antes do lançamento,
So that um gasto apagado não volte sozinho.

**Implementa:** FR-16

**Acceptance Criteria:**

**Given** `domainReducer` devolve o estado sem mudança quando `TRANSACTION_UPDATED` ou `TRANSACTION_DELETED` não acham a transação
**When** o evento sem alvo fica pendente e é reaplicado quando o alvo chega
**Then** uma exclusão que chegou antes do lançamento deixa a transação **excluída** depois que o lançamento chega
**And** o saldo da conta fica correto nos dois casos de ordem
**And** o mesmo vale para `ACCOUNT_UPDATED` e `ACCOUNT_DELETED`.

### Story 3.8: Evoluir o formato dos eventos sem quebrar versões publicadas

As a dono do DOMUS,
I want mudar o formato de um evento sem invalidar os já publicados,
So that eu possa evoluir o app sem perder dado de quem não atualizou.

**Implementa:** FR-17

**Acceptance Criteria:**

**Given** o envelope atual não tem versão de payload
**When** adiciono `schemaVersion` ao payload e uma conversão por versão no reducer
**Then** um campo obrigatório novo exige `schemaVersion` e a conversão do formato antigo
**And** os eventos já publicados (sem `schemaVersion`) são tratados como versão 1 e continuam válidos
**And** o envelope e os payloads aceitam um `profileId` opcional sem reescrever o log
**And** um teste aplica um evento v1 e um v2 e obtém o estado esperado.

## Epic 4: Sync privado de verdade

Os dados que passam pelos relays ficam protegidos por um segredo forte; o Grupo antigo convive por uma janela curta e depois é desligado.

### Story 4.1: Gerar o Segredo de grupo forte e derivar as chaves

As a usuário do DOMUS,
I want um segredo de grupo que ninguém consiga adivinhar,
So that meus dados no sync não possam ser abertos por força bruta.

**Implementa:** FR-13

**Acceptance Criteria:**

**Given** o código atual tem 6 caracteres (cerca de 30 bits) e a chave pública do Nostr sai dele
**When** crio um módulo puro que gera o Segredo de grupo com pelo menos 128 bits de aleatoriedade criptográfica, codificado em texto (por exemplo base32), e deriva dele as chaves do Nostr e da cifra por HKDF
**Then** dois segredos gerados nunca coincidem num teste de 10.000 gerações
**And** a chave pública do Nostr não permite deduzir o segredo
**And** a derivação usa rótulos diferentes da derivação antiga (`deriveKeysFromCode`)
**And** o módulo roda no vitest sem `react-native`.

### Story 4.2: Cifrar e decifrar eventos com cifra autenticada

As a usuário do DOMUS,
I want que os eventos do Grupo forte sejam protegidos contra leitura e adulteração,
So that quem vê os relays não consiga ler nem alterar meus dados.

**Implementa:** FR-12

**Acceptance Criteria:**

**Given** `encryptPayload` e `decryptPayload` usam XOR com nonce
**When** crio funções novas com AES-GCM (chave de 256 bits, nonce aleatório de 96 bits) e um marcador de formato no texto cifrado
**Then** cifrar e decifrar com a mesma chave devolve o evento original
**And** um texto cifrado adulterado é rejeitado, sem devolver dado
**And** decifrar com outra chave falha
**And** o formato antigo (XOR) continua sendo lido pelo código existente, sem mudança.

### Story 4.3: Criar um Grupo forte e mostrá-lo por QR e por texto

As a usuário do DOMUS,
I want criar um grupo de sync seguro e compartilhá-lo com facilidade,
So that eu possa parear meus outros aparelhos sem digitar um segredo longo.

**Implementa:** FR-13

**Acceptance Criteria:**

**Given** a tela `app/sync.tsx` cria hoje um código de 6 caracteres
**When** passo a criar o Grupo forte com o Segredo da Story 4.1
**Then** a tela mostra o segredo em QR e como texto copiável
**And** o app não cria mais Grupo novo com código de 6 caracteres
**And** o segredo fica no `SecureStore` (nativo) ou em `webSecrets` (web)
**And** o texto da tela está em pt-BR com acentos.

### Story 4.4: Parear um aparelho por QR ou colagem

As a usuário do DOMUS,
I want parear outro aparelho lendo um QR ou colando o segredo,
So that o aparelho novo entre no grupo sem erro de digitação.

**Implementa:** FR-13

**Acceptance Criteria:**

**Given** o campo de código tem `maxLength={8}` e só aceita 6 caracteres
**When** passo a aceitar a leitura do QR (`QRScannerModal`) e a colagem do segredo completo
**Then** um segredo válido de pelo menos 128 bits entra no grupo
**And** um código antigo de 6 caracteres é recusado com a mensagem para usar o QR
**And** um segredo inválido ou truncado mostra erro e não grava nada.

### Story 4.5: Publicar e ler eventos no Grupo forte

As a usuário do DOMUS,
I want que meus eventos viajem cifrados pelo Grupo forte,
So that o sync novo funcione de ponta a ponta de verdade.

**Implementa:** FR-12

**Acceptance Criteria:**

**Given** um Grupo forte e a cifra da Story 4.2
**When** o aparelho publica e lê eventos desse grupo pelos relays
**Then** os eventos publicados vão cifrados com AES-GCM e usam uma identidade Nostr própria do grupo, separada da do Grupo antigo
**And** um terceiro sem o Segredo de grupo não decifra um evento (testado)
**And** os eventos do Grupo antigo não são alterados nem lidos por este caminho.
**And** os eventos `PAYSLIP_*` (Story 11.4), que não vão ao Grupo antigo, passam a ser publicados no Grupo forte.

### Story 4.6: Registrar em qual grupo cada evento já foi publicado

As a usuário do DOMUS,
I want que o app saiba o que já enviou a cada grupo,
So that o mesmo evento nunca seja publicado duas vezes no mesmo grupo e não haja loop.

**Implementa:** FR-14, FR-7

**Acceptance Criteria:**

**Given** o app precisa conviver com dois grupos ao mesmo tempo
**When** crio um registro por evento e por grupo ("publicado" ou "recebido de")
**Then** um evento recebido de um grupo não é republicado nesse mesmo grupo
**And** um evento criado no aparelho é publicado uma vez em cada grupo ativo
**And** o registro sobrevive a reiniciar o app
**And** um teste com dois grupos simulados mostra que o número de publicações por evento e por grupo é 1.

### Story 4.7: Manter o Grupo antigo e o forte ao mesmo tempo

As a usuário do DOMUS com um tablet ainda na versão antiga,
I want que a versão nova continue falando com o Grupo antigo,
So that eu não perca o sync enquanto não atualizo tudo.

**Implementa:** FR-14

**Acceptance Criteria:**

**Given** celular na versão nova e tablet na versão antiga, no Grupo antigo
**When** o celular mantém o Grupo antigo (leitura e escrita) e passa a ter também o Grupo forte
**Then** um gasto lançado no celular aparece no tablet antigo, sem repareamento e sem erro
**And** um gasto lançado no tablet antigo aparece no celular
**And** com o registro da Story 4.6 nenhum evento entra em loop entre os dois grupos
**And** dado sensível novo (por exemplo preferência religiosa) nunca é publicado no Grupo antigo.

### Story 4.8: Migrar um aparelho do Grupo antigo para o forte

As a usuário do DOMUS,
I want migrar meus aparelhos para o grupo seguro quando eu quiser,
So that eu saia do formato fraco sem perder nada.

**Implementa:** FR-14

**Acceptance Criteria:**

**Given** um aparelho no Grupo antigo e a versão nova instalada
**When** o app oferece "Migrar para o sync seguro" e eu confirmo
**Then** o app mostra o QR do Grupo forte para parear os outros aparelhos
**And** os eventos locais que o grupo ainda não tem são publicados no Grupo forte (uma vez, pelo registro da Story 4.6)
**And** um aparelho com 20 eventos locais, atualizado depois do corte, publica os 20 sem duplicar
**And** o app só migra com a minha confirmação.

### Story 4.9: Cortar o Grupo antigo na versão mínima e na data

As a dono do DOMUS,
I want desligar o Grupo antigo numa data e versão definidas,
So that o formato fraco deixe de ser usado.

**Implementa:** FR-14

**Acceptance Criteria:**

**Given** a data de corte e a versão mínima definidas pelo dono (14 dias depois da publicação do FR-13)
**When** chega a data de corte
**Then** o app deixa de ler e de escrever no Grupo antigo e mostra uma mensagem pedindo para migrar ou atualizar
**And** antes do corte o app publica no Grupo antigo um evento de aviso (versões antigas o ignoram, então o dono também avisa os usuários)
**And** o histórico já publicado em XOR é registrado como risco residual em `docs/`
**And** os eventos locais não são apagados.

### Story 4.10: Reativar "ponta-a-ponta" no texto público depois do corte

As a usuário do DOMUS,
I want que a loja e a política voltem a dizer "ponta-a-ponta" só quando for verdade,
So that o texto público seja fiel ao app.

**Implementa:** FR-14, FR-5

**Acceptance Criteria:**

**Given** o corte da Story 4.9 foi feito e nenhum evento novo vai ao Grupo antigo
**When** verifico no código que o sync usa só o Grupo forte com AES-GCM
**Then** a afirmação "ponta-a-ponta" pode voltar à loja e à política
**And** o histórico antigo em XOR continua descrito como risco residual
**And** uma checklist registra a verificação, ligada ao NFR-6.

## Epic 5: Sync sem perda e sem eco

O dado criado num aparelho chega aos outros em até 15 segundos, sem duplicar nem entrar em loop, e reset ou restauração não ressuscitam dados.

### Story 5.1: Testar o sync com três aparelhos simulados

As a dono do DOMUS,
I want um teste que simula três aparelhos e um relay falso,
So that eu prove que o sync converge e não entra em loop.

**Implementa:** FR-6, FR-7

**Acceptance Criteria:**

**Given** a lógica de envio e leitura do sync vive em hooks (`useSyncEngine.ts`) e não roda no vitest
**When** extraio a decisão de quando publicar e o que importar para funções puras e crio um relay falso em memória com três aparelhos simulados
**Then** o teste roda no vitest sem `react-native`
**And** os três aparelhos trocam N eventos e terminam com o mesmo estado
**And** o teste conta as publicações por evento e por aparelho
**And** o comportamento do app não muda nesta story.

### Story 5.2: Confirmar o envio por lote e reenviar os perdidos

As a usuário do DOMUS,
I want que um relay fora do ar não faça meus eventos sumirem,
So that todo evento chegue aos outros aparelhos.

**Implementa:** FR-9

**Acceptance Criteria:**

**Given** `publishSyncEvents` engole a falha de cada lote e `pushMyEvents` grava o hash como enviado mesmo assim
**When** o envio passa a devolver o resultado por lote e só marca como enviado o lote confirmado por pelo menos um relay
**Then** um lote que falhou em todos os relays é reenviado no próximo ciclo
**And** o teste do relay falso derrubado e depois restaurado entrega todos os eventos
**And** o hash de envio não avança por lote não confirmado.

### Story 5.3: Publicar só os lotes novos no Grupo forte

As a usuário do DOMUS,
I want que o sync não republique todo o histórico a cada mudança,
So that o sync gaste menos rede e bateria.

**Implementa:** FR-9

**Acceptance Criteria:**

**Given** os lotes atuais são substituíveis (kind 30333 com `d = sync-{deviceId}-{índice}`) e a posição de um evento muda quando entra um evento mais antigo
**When** o Grupo forte passa a publicar lotes imutáveis, identificados pelo conteúdo
**Then** adicionar 1 evento a um log de 100 publica só 1 lote novo
**And** um evento de `timestamp` antigo recebido depois não faz os outros lotes serem republicados
**And** o formato dos lotes do Grupo antigo **não muda** (a versão antiga precisa lê-lo).

### Story 5.4: Ler o histórico de forma incremental e paginada

As a usuário do DOMUS,
I want que o app leia só o que é novo e leia tudo quando preciso,
So that eu não perca histórico longo nem gaste rede lendo tudo de novo.

**Implementa:** FR-9

**Acceptance Criteria:**

**Given** o pull usa `limit: 500` por relay, sem paginação, e relê tudo a cada 8 segundos
**When** passo a paginar a leitura e a usar o cursor separado da Story 3.6
**Then** um histórico de mais de 500 lotes é lido por inteiro
**And** o ciclo seguinte lê apenas o que chegou depois do cursor
**And** um teste com 1.200 lotes no relay falso termina com todos importados.

### Story 5.5: Enfileirar eventos recebidos em rajada

As a usuário do DOMUS,
I want que todos os eventos que chegam juntos sejam importados,
So that eu não veja só o primeiro de um lote e espere o próximo ciclo.

**Implementa:** FR-9

**Acceptance Criteria:**

**Given** a assinatura descarta eventos enquanto `isImportingRef` está ligado, então só o primeiro de um lote de 20 é importado
**When** os eventos recebidos entram numa fila processada em ordem
**Then** os 20 eventos de um lote são importados
**And** nenhum evento é descartado enquanto outro está sendo importado
**And** a fila não bloqueia a interface.

### Story 5.6: Nunca republicar o que veio do grupo

As a usuário do DOMUS,
I want que um evento recebido não volte para o grupo,
So that o sync nunca entre em loop.

**Implementa:** FR-7

**Acceptance Criteria:**

**Given** `getMyEvents` envia só eventos do próprio `deviceId`, e um backup restaurado num aparelho novo nunca chega ao grupo
**When** o envio passa a usar o registro de publicação por grupo da Story 4.6, e não o `deviceId`
**Then** num teste com três aparelhos e N eventos o total de publicações é N, e não cresce com o tempo
**And** um evento criado localmente (inclusive de backup restaurado, com `deviceId` antigo) é publicado se o grupo ainda não o tem
**And** importar um evento de outro aparelho não gera XP nem conquista
**And** o reenvio de um evento já recebido do grupo não acontece.

### Story 5.7: Propagar rápido, inclusive depois de ficar offline

As a usuário do DOMUS,
I want ver no tablet o gasto que lancei no celular,
So that meus aparelhos mostrem o mesmo dado sem eu fazer nada.

**Implementa:** FR-6

**Acceptance Criteria:**

**Given** celular e tablet no mesmo grupo, com rede
**When** lanço um gasto no celular
**Then** o tablet o mostra em até 15 segundos
**And** o mesmo evento vindo de dois relays, ou pela assinatura e pelo pull, é aplicado uma vez

**Given** o tablet ficou offline e o celular lançou 5 gastos
**When** o tablet reconecta
**Then** ele reconcilia sozinho e mostra os 5, sem duplicar
**And** o teste do relay falso mede a latência com o relógio simulado.

### Story 5.8: Publicar o marcador de reset e de restauração

As a usuário do DOMUS,
I want que um reset ou uma restauração seja avisada ao grupo,
So that os dados apagados não voltem dos relays.

**Implementa:** FR-10

**Acceptance Criteria:**

**Given** `resetApp` e `restoreFromBackup` apagam o log local sem avisar o grupo, e o pull seguinte recria tudo
**When** eles passam a publicar um evento marcador no Grupo forte
**Then** o pull seguinte, nesse aparelho, não recria os eventos apagados
**And** um marcador vindo do Grupo antigo não é aceito para apagar dados
**And** eventos criados offline por outro aparelho, concorrentes ao marcador, são preservados
**And** os eventos já publicados nos relays não são apagados (a política diz isso, Story 1.4).

### Story 5.9: Pedir confirmação antes de apagar por causa de um marcador

As a usuário do DOMUS,
I want que meu aparelho me pergunte antes de apagar meus dados porque outro aparelho resetou,
So that eu nunca perca dado sem ter concordado.

**Implementa:** FR-10

**Acceptance Criteria:**

**Given** um aparelho recebe um marcador de reset de outro aparelho do grupo
**When** o app mostra uma confirmação em pt-BR explicando o que será apagado
**Then** se eu confirmo, os dados locais são apagados e o marcador é registrado
**And** se eu recuso, nada é apagado e o app pergunta de novo só se chegar outro marcador
**And** o aparelho não apaga nada sem a minha resposta.

## Epic 6: Segredos protegidos no aparelho

A chave do OCR e a senha do auto-backup deixam de ficar em texto puro, no nativo e na web.

### Story 6.1: Mover a chave do OCR para o armazenamento seguro

As a usuário do DOMUS,
I want que a chave do serviço de OCR fique protegida,
So that ela não possa ser lida de dentro do armazenamento do app.

**Implementa:** FR-23

**Acceptance Criteria:**

**Given** `cloudVisionApiKey` é gravada junto da configuração do OCR num JSON em `AsyncStorage` (`@domus:ocr_config`)
**When** a chave passa a ser gravada em `expo-secure-store` (nativo) ou em `webSecrets` (web), e o resto da configuração fica onde está
**Then** o JSON em `AsyncStorage` não contém mais a chave
**And** quem já tem a chave salva tem o valor migrado sozinho na próxima abertura, sem perder o OCR
**And** o OCR com serviço de nuvem continua funcionando depois da migração.

### Story 6.2: Mover a chave do auto-backup para o armazenamento seguro

As a usuário do DOMUS,
I want que a chave do meu backup automático fique protegida,
So that quem lê o armazenamento do app não consiga abrir meus backups.

**Implementa:** FR-23

*Revisada em 16/10/2026: a `domus_auto_backup_password` só existia no `AutoBackupService`, removido na Story 12.2; resta uma chave.*

**Acceptance Criteria:**

**Given** `domus_auto_backup_device_key` fica em `AsyncStorage`
**When** passo a gravá-la em `expo-secure-store` (nativo) ou `webSecrets` (web), com migração do valor atual
**Then** o valor da chave é **o mesmo** antes e depois, então um backup automático já feito continua restaurável
**And** a chave não aparece mais em `AsyncStorage`
**And** um teste de migração confirma o valor preservado.

### Story 6.3: Tirar a queda silenciosa do SecureStore para o AsyncStorage

As a usuário do DOMUS,
I want ser avisado se o armazenamento seguro falhar,
So that meu segredo nunca vá em texto puro sem eu saber.

**Implementa:** FR-23

**Acceptance Criteria:**

**Given** `saveGroupCode` cai para `AsyncStorage` com um `console.warn` se o `SecureStore` falhar
**When** troco essa queda por: não gravar em texto puro, manter o segredo em memória e avisar o usuário uma vez, em pt-BR
**Then** com o `SecureStore` falhando, `AsyncStorage` não recebe o código do grupo
**And** o app continua sincronizando na sessão atual
**And** o aviso explica que o pareamento pode ser pedido de novo ao reabrir
**And** `[ASSUMPTION]` esta troca de comportamento é aceita pelo dono.

### Story 6.4: Cifrar o log de eventos da web

As a usuário do DOMUS no navegador,
I want que meu histórico financeiro fique cifrado no armazenamento do navegador,
So that quem copiar o armazenamento local não leia meus gastos.

**Implementa:** FR-18

**Acceptance Criteria:**

**Given** na web o log inteiro é regravado em texto puro em `AsyncStorage` (`domus_events_v1`) a cada mudança
**When** o log passa por `webSecrets` (AES-GCM) ao gravar e ao ler, com gravação agrupada para não cifrar a cada evento
**Then** o armazenamento do navegador não contém o log em texto puro
**And** um log já existente em texto puro é migrado para a forma cifrada na primeira abertura, sem perder eventos
**And** sem WebCrypto ou IndexedDB o log **não** é gravado em texto puro, e o app avisa que os dados não serão guardados nesse navegador
**And** a interface não trava durante a cifra de um log com 5.000 eventos.

### Story 6.5: Barrar por teste novo segredo em `AsyncStorage`

As a dono do DOMUS,
I want que um teste falhe se alguém gravar um segredo em `AsyncStorage`,
So that o NFR-1 seja verificado por máquina.

**Implementa:** FR-23, NFR-1

**Acceptance Criteria:**

**Given** a regra de ESLint só cobre `EXPO_PUBLIC_*`
**When** crio um teste que varre o código por chamadas de `AsyncStorage.setItem` cujo nome de chave contenha `PASSWORD`, `SECRET`, `TOKEN` ou `API_KEY`
**Then** o teste falha para qualquer ocorrência fora de uma lista de exceções justificadas
**And** depois das Stories 6.1 a 6.4 o teste passa sem exceção
**And** a lista de exceções, se existir, tem o motivo escrito.

## Epic 7: Gamificação igual em todos os aparelhos

XP, conquistas, nível e streak batem entre aparelhos e nada é pago em dobro por ter mais de um aparelho ou por parcelamento.

### Story 7.1: Dar id determinístico às conquistas e deduplicar no reducer

As a usuário do DOMUS com mais de um aparelho,
I want ganhar cada conquista uma vez só,
So that meu XP não dobre quando dois aparelhos cruzam a mesma meta.

**Implementa:** FR-19

**Acceptance Criteria:**

**Given** `ACHIEVEMENT_UNLOCKED` usa `generateId()` e o reducer soma `xpReward` a cada evento
**When** a conquista passa a ter `id` derivado do fato (por exemplo `ach:{achievementId}`) e o reducer deduplica pela chave natural `achievementId`
**Then** dois aparelhos que cruzam a mesma conquista offline resultam em uma só entrada e um só pagamento de XP
**And** eventos antigos de uma mesma conquista com ids aleatórios diferentes também contam uma vez
**And** o teste cobre os dois casos (ids iguais e ids diferentes).

### Story 7.2: Rodar os efeitos só depois do primeiro pull

As a usuário do DOMUS com sync ativo,
I want que o app espere o sync antes de gerar efeitos automáticos,
So that um aparelho recém-aberto não crie o que outro já criou.

**Implementa:** FR-19

**Acceptance Criteria:**

**Given** o aporte, a recuperação de XP e as categorias padrão rodam no boot, antes do primeiro pull
**When** os efeitos passam a esperar o primeiro pull concluído quando há Grupo de sync
**Then** um aparelho recém-aberto não emite um efeito que o log já contém
**And** sem Grupo de sync os efeitos rodam normalmente
**And** se o pull falhar, os efeitos rodam depois de um tempo limite, sem travar o app.

### Story 7.3: Criar o aporte pendente uma vez por período

As a usuário do DOMUS,
I want um só aporte pendente por conta e por período,
So that meu saldo da poupança não dobre.

**Implementa:** FR-19

**Acceptance Criteria:**

**Given** `useSavingsGoalScheduler` gera o aporte com `generateId()` e confere só o log local
**When** o aporte passa a ter `id` derivado de `savings:{accountId}:{período}`
**Then** dois aparelhos que geram o aporte do mesmo período resultam em uma só transação depois do sync
**And** efetivar o aporte uma vez não o duplica
**And** o teste cobre dois aparelhos gerando o mesmo aporte.

### Story 7.4: Não dar XP a transação pendente

As a usuário do DOMUS,
I want que XP só venha de gasto confirmado,
So that um aporte automático não me dê XP sem eu ter feito nada.

**Implementa:** FR-19

**Acceptance Criteria:**

**Given** `dispatchDomainEvent` concede XP e streak também à transação gerada com `status: "pending"`
**When** o XP e o streak passam a só ser concedidos quando a transação está confirmada
**Then** uma transação pendente não gera XP nem streak
**And** ao confirmá-la, o XP é concedido uma vez
**And** o teste cobre pendente, confirmação e exclusão.

### Story 7.5: Recuperar o XP uma vez só

As a usuário do DOMUS,
I want que a recuperação de XP aconteça uma vez,
So that eu não ganhe a recuperação de XP em cada aparelho.

**Implementa:** FR-19

**Acceptance Criteria:**

**Given** a recuperação usa `xp-recovery-${generateId()}` e confere só o prefixo no log local
**When** o evento passa a ter `id` fixo (por exemplo `xp-recovery:v1`) e o reducer conta uma só recuperação
**Then** dois aparelhos que recuperam o XP resultam em uma só recuperação depois do sync
**And** o evento antigo com prefixo `xp-recovery-` continua contando como recuperação já feita
**And** a recuperação só roda depois do primeiro pull (Story 7.2).

### Story 7.6: Categorias sem duplicar entre aparelhos

As a usuário do DOMUS,
I want ver cada categoria uma vez só,
So that eu não tenha "Restaurantes" duas vezes depois do sync.

**Implementa:** FR-19

**Acceptance Criteria:**

**Given** as categorias padrão geram eventos com `id` aleatório em cada aparelho, e a criação por nome usa `generateId()`
**When** as categorias padrão passam a ter `id` `cats:default:{categoryId}` e as criadas na hora usam um slug estável do nome
**Then** dois aparelhos que criam a mesma categoria resultam em uma só depois do sync
**And** uma categoria padrão não sobrescreve uma edição feita por outro aparelho
**And** a conquista de dízimo reconhece a categoria criada pelo formulário.

### Story 7.7: Emitir cada conquista uma vez num parcelamento

As a usuário do DOMUS,
I want que lançar uma compra parcelada não repita conquistas,
So that o XP não se multiplique pelo número de parcelas.

**Implementa:** FR-19

**Acceptance Criteria:**

**Given** o laço de parcelas chama `dispatchDomainEvent` várias vezes com o mesmo estado do render, então a conquista é emitida N vezes
**When** os efeitos passam a rodar sobre o estado resultante do log, incluindo os eventos recém-enfileirados
**Then** um parcelamento de 12 parcelas emite cada conquista uma vez
**And** o XP total depois do parcelamento é o mesmo que o de lançar as 12 parcelas separadamente
**And** o teste cobre um parcelamento e uma recorrência.

### Story 7.8: Derivar o nível do log

As a usuário do DOMUS,
I want ver o mesmo nível em todas as telas e aparelhos,
So that o nível não dependa de qual evento chegou por último.

**Implementa:** FR-24

**Acceptance Criteria:**

**Given** o nível vem de `LEVEL_UP` (valor absoluto em `GamificationState.level`) e também de `levelInfo` derivado do XP total
**When** o nível passa a ser derivado só do XP total do log e `GamificationState.level` deixa de ser a fonte
**Then** todas as telas leem a mesma fonte do nível
**And** o evento `LEVEL_UP` antigo é ignorado, sem ir para a Quarentena
**And** dois aparelhos com os mesmos eventos mostram o mesmo nível.

### Story 7.9: Derivar o streak do log

As a usuário do DOMUS,
I want que meu streak seja o mesmo em todos os aparelhos,
So that eu não perca a sequência por causa de um aparelho desatualizado.

**Implementa:** FR-24

**Acceptance Criteria:**

**Given** `STREAK_UPDATED` grava `currentStreak`, `longestStreak` e `lastActiveDate` calculados num aparelho e o último a chegar vence
**When** o streak passa a ser derivado das datas das transações no log
**Then** dois aparelhos com valores diferentes de streak mostram o mesmo valor depois do sync
**And** o evento `STREAK_UPDATED` antigo é ignorado, sem ir para a Quarentena
**And** o teste cobre dois aparelhos com histórico offline diferente.

### Story 7.10: Criar e excluir uma transação deixa o XP igual

As a usuário do DOMUS,
I want que apagar um gasto desfaça exatamente o XP que ele deu,
So that eu não ganhe XP infinito criando e apagando a mesma transação.

**Implementa:** FR-24

**Acceptance Criteria:**

**Given** a criação paga 5 XP fixos mais um bônus calculado sobre o orçamento depois de criar, e a exclusão desconta 5 XP mais um bônus calculado sobre o orçamento depois de excluir (por exemplo, criar uma receita de R$ 3.000 num mês vazio paga +10 XP e excluí-la tira só −5)
**When** cada XP pago por uma transação passa a registrar a transação de origem, e a exclusão desfaz exatamente a soma paga àquela transação
**Then** criar e depois excluir a mesma transação deixa o XP igual ao de antes, e repetir o ciclo não aumenta o XP
**And** o mesmo vale para um lançamento retroativo de um mês anterior
**And** a fórmula do bônus de orçamento **não muda**
**And** transações criadas antes desta mudança, cujo XP não tem a transação de origem, continuam usando o cálculo atual na exclusão
**And** o teste cobre criar, editar e excluir.

## Epic 8: Plataforma moderna

O app roda no Expo SDK 57 e usa o login moderno do Google, sem depender de API deprecada.

### Story 8.1: Medir a linha de base e atualizar para o Expo SDK 55

As a dono do DOMUS,
I want subir um salto de SDK sabendo de onde parti,
So that eu consiga comparar memória e comportamento depois.

**Implementa:** FR-3 (3a)

**Acceptance Criteria:**

**Given** o SDK 54 com baseline de testes e lint verde (Épico 2)
**When** meço e registro em `docs/` o pico de memória das telas principais num Android 16 do dono, e rodo `npx expo install expo@^55 --fix`
**Then** `npx expo-doctor` termina sem erro
**And** `npx vitest run` e `npx expo lint` terminam sem falha
**And** o build de release do Android termina verde
**And** os patches que não aplicarem ficam listados em `docs/`, com o erro de cada um, para a reavaliação seguinte.

### Story 8.2: Reavaliar patches e Tamagui no SDK 55 e validar os fluxos

As a usuário do DOMUS,
I want que o app continue funcionando depois do salto,
So that eu não perca nenhuma tela nem ganhe um bug novo.

**Implementa:** FR-3 (3a)

**Acceptance Criteria:**

**Given** o SDK 55 compilando
**When** reavalio cada um dos 4 patches e a Tamagui (`2.0.0-rc.26`)
**Then** cada patch é removido, atualizado ou mantido, com o motivo registrado
**And** a Tamagui é mantida ou trocada por versão estável, com o motivo registrado
**And** os fluxos do FR-1 (abas, introdução por tela, câmera/OCR, backup, sync) abrem num Android 16 sem falha
**And** o pico de memória não passa de 20% acima da linha de base.

### Story 8.3: Atualizar para o Expo SDK 56 e aplicar o codemod do `expo-router`

As a dono do DOMUS,
I want subir para o SDK 56 e acompanhar o `expo-router` desacoplado,
So that o app use a navegação suportada.

**Implementa:** FR-3 (3b)

**Acceptance Criteria:**

**Given** o SDK 55 validado
**When** atualizo para o SDK 56 e aplico `npx expo-codemod sdk-56-expo-router-react-navigation-replace`
**Then** `OcrScanScreen.tsx` e `QrScanScreen.tsx` deixam de importar `@react-navigation/*` e nenhum import direto sobra
**And** o novo `fetch` global do Expo funciona nas chamadas do Nostr e dos provedores de IA
**And** o uso de `copy()` e `move()` do `expo-sqlite`, se existir, está adaptado ao retorno assíncrono
**And** `expo-doctor`, `npx vitest run`, `npx expo lint` e o build de release terminam verdes.

### Story 8.4: Medir a memória e validar o SDK 56

As a usuário do DOMUS,
I want que o salto não deixe o app mais pesado,
So that o app não feche no meu aparelho.

**Implementa:** FR-3 (3b)

**Acceptance Criteria:**

**Given** o changelog do SDK 56 registra aumento de memória com Hermes v1 e `react-native-worklets`/`reanimated`
**When** meço o pico de memória das mesmas telas da Story 8.1
**Then** um aumento acima de 20% sobre a linha de base bloqueia o salto até haver análise
**And** os patches e a Tamagui são reavaliados como na Story 8.2
**And** os fluxos do FR-1 abrem num Android 16 sem falha.

### Story 8.5: Atualizar para o Expo SDK 57

As a dono do DOMUS,
I want chegar ao SDK 57, que o changelog do 56 recomenda,
So that o app use a versão estável mais atual.

**Implementa:** FR-3 (3c)

**Acceptance Criteria:**

**Given** o SDK 56 validado
**When** atualizo para o SDK 57
**Then** `expo-doctor`, `npx vitest run`, `npx expo lint` e o build de release terminam verdes
**And** os patches que não aplicarem ficam listados em `docs/`, com o erro de cada um, para a reavaliação seguinte
**And** o SDK 58, ainda em beta, não é usado.

### Story 8.6: Reavaliar patches e Tamagui no SDK 57 e validar os fluxos

As a usuário do DOMUS,
I want o app no SDK 57 sem regressão,
So that a atualização termine sem bug novo.

**Implementa:** FR-3 (3c)

**Acceptance Criteria:**

**Given** o SDK 57 compilando
**When** reavalio os patches, a Tamagui e a memória
**Then** cada patch e a Tamagui têm decisão e motivo registrados
**And** o pico de memória não passa de 20% acima da linha de base da Story 8.1
**And** os fluxos do FR-1 abrem num Android 16 sem falha.

### Story 8.7: Decidir a biblioteca do novo login do Google

As a dono do DOMUS,
I want saber qual biblioteca dá o login moderno do Google e quanto custa,
So that eu escolha antes de migrar.

**Implementa:** FR-4

**Acceptance Criteria:**

**Given** a API "Original" do `@react-native-google-signin` usa o SDK legado e há uma API "Universal" com Credential Manager, de custo não confirmado
**When** comparo essa API com ao menos uma alternativa (por exemplo uma biblioteca construída sobre o Credential Manager)
**Then** um documento em `docs/` registra custo, licença, suporte ao `AuthorizationClient` para o escopo `drive.appdata` e compatibilidade com o SDK 57
**And** o dono aprova a escolha por escrito, e a migração do login só começa depois dessa aprovação
**And** nenhum código do app muda nesta story.

### Story 8.8: Migrar o login e a autorização do Drive

As a usuário do DOMUS,
I want conectar o Google Drive com a API moderna,
So that o backup não pare quando a API legada for removida.

**Implementa:** FR-4

**Acceptance Criteria:**

**Given** a biblioteca aprovada na Story 8.7
**When** a autenticação passa a usar o Credential Manager e a autorização do Drive o `AuthorizationClient`
**Then** conectar o Drive e fazer um backup completo funciona num Android real
**And** o app não contém `client_secret` do Google
**And** o código antigo de `getTokens()` é removido
**And** os testes de `driveTokens` continuam passando ou são adaptados.

### Story 8.9: Explicar a reconexão do Drive ao usuário

As a usuário do DOMUS,
I want entender por que preciso reconectar o Drive,
So that eu não ache que perdi meu backup.

**Implementa:** FR-4

**Acceptance Criteria:**

**Given** quem já tinha o Drive conectado precisa reconectar uma vez
**When** o app detecta a conexão antiga
**Then** mostra uma mensagem em pt-BR dizendo que é preciso reconectar e que o backup existente não foi apagado
**And** depois de reconectar, o backup anterior continua listado
**And** o texto tem acentuação completa.

## Epic 9: Configurações iguais em todos os aparelhos

Tema, som, modo de apoio e a configuração de IA e de OCR (sem chave) ficam iguais em todos os aparelhos, e existe um inventário que classifica tudo que o app guarda fora do log.

### Story 9.1: Inventariar e classificar tudo que o app guarda fora do log

As a dono do DOMUS,
I want uma lista de tudo que o app guarda fora do log, com a classe de cada item,
So that eu saiba o que sincroniza, o que é segredo e o que é só do aparelho.

**Implementa:** FR-8a

**Acceptance Criteria:**

**Given** o app guarda cerca de 40 chaves em `AsyncStorage` e `SecureStore`
**When** crio `docs/inventario-dados.md` classificando cada chave como **vira evento**, **usa outro canal**, **não sincroniza** ou **é segredo**, com o motivo
**Then** nenhuma chave fica sem classe
**And** as permissões de dados da IA constam como "não sincroniza (consentimento por aparelho)"
**And** um teste lista as chaves usadas no código e falha se alguma não estiver no inventário.

### Story 9.2: Criar o evento de preferência e o reducer

As a usuário do DOMUS,
I want que minhas preferências sejam fatos no log,
So that elas possam sincronizar como o resto dos meus dados.

**Implementa:** FR-8b

**Acceptance Criteria:**

**Given** as preferências vivem só em `AsyncStorage`
**When** crio um evento `SETTING_CHANGED` (chave, valor e `schemaVersion`) num package puro com reducer, roteado em `replayAllEvents`
**Then** para cada chave vale o valor do último evento pela ordem do FR-16
**And** uma chave desconhecida é ignorada sem erro
**And** aparelhos com a versão antiga ignoram o evento, sem falha
**And** o package não importa `react`, `react-native` nem `expo`.

### Story 9.3: Sincronizar tema, som e modo de apoio

As a usuário do DOMUS com mais de um aparelho,
I want mudar o tema num aparelho e ver nos outros,
So that eu não configure tudo de novo em cada um.

**Implementa:** FR-8b

**Acceptance Criteria:**

**Given** tema, som e modo de apoio (`domus_theme_mode_v1`, `domus_sound_enabled_v1`, `domus_support_mode(s)`) ficam só no aparelho
**When** passam a ser lidos do estado do log e gravados como `SETTING_CHANGED`
**Then** mudar o tema no celular o muda no tablet em até 15 segundos
**And** na primeira abertura depois da atualização, sem evento da preferência, o aparelho grava o valor atual como evento
**And** depois disso, a mudança mais recente vale em todos
**And** a preferência religiosa (`domus_is_catholic_v1`) **não** entra aqui (Épico 10).

### Story 9.4: Sincronizar a configuração de IA e os preços personalizados

As a usuário do DOMUS,
I want a mesma configuração de IA em todos os aparelhos,
So that eu não escolha provedor e modelo em cada um.

**Implementa:** FR-8b

**Acceptance Criteria:**

**Given** `domus_ai_settings_v1` e `domus_ai_custom_prices` ficam só no aparelho
**When** o provedor, o nível do modelo, o áudio e os preços personalizados passam a sincronizar
**Then** mudar o provedor num aparelho o muda nos outros
**And** as **permissões de dados da IA** (`AIDataPermissions`) **nunca** sincronizam, e cada aparelho pede o seu consentimento
**And** chaves de API, tokens de OAuth e contadores de uso de tokens não entram no evento
**And** o teste confirma que as permissões não aparecem em nenhum evento.

### Story 9.5: Sincronizar a configuração do OCR sem a chave

As a usuário do DOMUS,
I want o mesmo provedor de OCR em todos os aparelhos,
So that a leitura de nota funcione igual em todos.

**Implementa:** FR-8b

**Acceptance Criteria:**

**Given** `@domus:ocr_config` mistura a configuração com `cloudVisionApiKey`
**When** o provedor preferido, o endpoint e o provedor de visão passam a sincronizar
**Then** mudar o provedor num aparelho o muda nos outros
**And** `cloudVisionApiKey` **nunca** entra no evento, em qualquer circunstância
**And** o teste falha se um campo de chave aparecer no payload.

### Story 9.6: Sincronizar a preferência do backup no Drive

As a usuário do DOMUS,
I want que o "backup do Drive ativo" valha para todos os aparelhos,
So that eu saiba que o backup está ligado, mas conecte a conta em cada um.

**Implementa:** FR-8b

**Acceptance Criteria:**

**Given** a preferência "backup ativo" e o e-mail da conta ficam só no aparelho
**When** passam a sincronizar como `SETTING_CHANGED`
**Then** ligar o backup num aparelho marca a preferência nos outros
**And** um aparelho com a preferência ligada e sem login mostra "Conectar o Drive neste aparelho"
**And** tokens do Drive **nunca** sincronizam: cada aparelho faz o próprio login.

### Story 9.7: Barrar por teste dado do aparelho no sync

As a dono do DOMUS,
I want que um teste impeça dado do aparelho de entrar no sync,
So that PIN, consentimento e tokens nunca viajem pelos relays.

**Implementa:** FR-8a

**Acceptance Criteria:**

**Given** só as chaves de uma lista permitida podem virar `SETTING_CHANGED`
**When** crio um teste que tenta gerar o evento com chaves de PIN e biometria (`domus_security_settings_v1`), consentimento de telemetria, tour, anúncio do dia, tokens, `deviceId` e cursores de sync
**Then** todas são recusadas
**And** a lista permitida está num só lugar e é a mesma do inventário da Story 9.1
**And** acrescentar uma chave à lista exige atualizar o inventário.

## Epic 10: Segredos e backup em todos os aparelhos

A preferência religiosa e o escopo completo do backup do Drive acompanham o usuário entre aparelhos, e as chaves de IA e OCR sincronizam só entre aparelhos nativos, com opt-in.

### Story 10.1: Registrar a exceção do AD-6 e atualizar os textos

As a dono do DOMUS,
I want a regra "nenhum segredo em evento" atualizada antes de existir a exceção,
So that o spine e os textos públicos digam a verdade sobre as chaves sincronizadas.

**Implementa:** FR-8c

**Acceptance Criteria:**

**Given** o AD-6 proíbe segredo em evento e o FR-8c cria uma exceção
**When** atualizo o spine para dizer: chaves de IA e OCR só em evento **cifrado**, só em Grupo forte, só entre aparelhos nativos e só com opt-in
**Then** o AD-6 e o inventário da Story 9.1 descrevem a exceção
**And** a política e o *Data safety* explicam que as chaves, se o usuário ativar, viajam cifradas pelos relays
**And** nenhum código muda nesta story.

### Story 10.2: Sincronizar a preferência religiosa só pelo Grupo forte

As a usuário do DOMUS,
I want que minha preferência religiosa acompanhe meus aparelhos sem expô-la,
So that o app use o mesmo tema e as mesmas conquistas em todos, sem vazar dado sensível.

**Implementa:** FR-8b

**Acceptance Criteria:**

**Given** `domus_is_catholic_v1` é dado sensível (convicção religiosa)
**When** ela passa a sincronizar como `SETTING_CHANGED`
**Then** o evento é publicado **só** no Grupo forte
**And** nunca é publicado no Grupo antigo, mesmo durante a Janela de convivência
**And** sem Grupo forte a preferência continua só no aparelho
**And** o teste confirma que nenhuma publicação desse evento chega ao Grupo antigo.

### Story 10.3: Ativar o sync de chaves com opt-in explícito

As a usuário do DOMUS,
I want escolher se minhas chaves de IA e OCR sincronizam,
So that eu só as espalhe se eu aceitar o risco.

**Implementa:** FR-8c

**Acceptance Criteria:**

**Given** o sync de chaves começa desligado
**When** adiciono uma opção "Sincronizar minhas chaves de IA e OCR entre meus aparelhos", com uma explicação em pt-BR do que isso significa
**Then** a opção só aparece em aparelho nativo e com Grupo forte
**And** a explicação diz que as chaves viajam cifradas pelos relays públicos e que eventos já publicados não podem ser apagados dos relays
**And** o opt-in vale por aparelho e não sincroniza
**And** o navegador nunca mostra nem recebe a opção.

### Story 10.4: Enviar as chaves cifradas ao Grupo forte

As a usuário do DOMUS,
I want que minha chave de IA vá cifrada para meus outros aparelhos,
So that eu não digite a mesma chave em cada um.

**Implementa:** FR-8c

**Acceptance Criteria:**

**Given** o opt-in da Story 10.3 ligado e uma chave de IA ou OCR salva no `SecureStore`
**When** o app publica um evento com a chave **cifrada** com uma chave derivada do Segredo de grupo, com rótulo próprio
**Then** o `SQLite`, o backup e os relays só contêm o texto cifrado, nunca a chave
**And** o evento nunca é publicado no Grupo antigo
**And** um teste procura a chave em texto puro no log local e no payload publicado e não a encontra.

### Story 10.5: Receber as chaves em outro aparelho nativo

As a usuário do DOMUS,
I want que o tablet receba as chaves que cadastrei no celular,
So that a IA e o OCR funcionem lá sem eu digitar de novo.

**Implementa:** FR-8c

**Acceptance Criteria:**

**Given** o tablet nativo com o opt-in ligado e no mesmo Grupo forte
**When** chega o evento cifrado com uma chave
**Then** o tablet a decifra e a guarda no `SecureStore`, no mesmo lugar onde guardaria uma chave digitada
**And** um aparelho sem o opt-in ignora o evento e não decifra nada
**And** o navegador nunca decifra nem guarda chave
**And** uma chave inválida ou adulterada é rejeitada, sem apagar a chave que o aparelho já tinha.

### Story 10.6: Desligar o sync de chaves

As a usuário do DOMUS,
I want poder parar de sincronizar minhas chaves,
So that eu volte ao modo em que cada aparelho guarda a sua.

**Implementa:** FR-8c

**Acceptance Criteria:**

**Given** o sync de chaves ligado
**When** eu desligo a opção
**Then** o aparelho para de publicar e de receber chaves
**And** as chaves que já estão no `SecureStore` continuam lá
**And** o app avisa que eventos cifrados já publicados continuam nos relays e que, se eu quiser invalidá-los, devo trocar a chave no provedor
**And** os eventos de chave antigos continuam sem poder ser lidos sem o Segredo de grupo.

### Story 10.7: Backup do Drive com o mesmo escopo, sem chave em texto puro

As a usuário do DOMUS,
I want restaurar o backup num aparelho novo e ver o mesmo estado,
So that trocar de celular não me faça perder configurações nem dados.

**Implementa:** FR-11

**Acceptance Criteria:**

**Given** o backup guarda o log de eventos e, depois do Épico 9, as preferências como eventos
**When** restauro um backup do Drive num aparelho novo
**Then** o estado do aparelho novo é igual ao dos outros (mesmos gastos, lista, troféus e preferências sincronizáveis)
**And** nenhuma chave de API aparece em texto puro no arquivo de backup
**And** as chaves só voltam se o opt-in e o Grupo forte do Épico 10 estiverem ativos no aparelho novo
**And** um teste restaura um backup com preferências e confirma o estado.

## Epic 11: Recursos de uso

A pessoa entende os termos financeiros na hora, acompanha o salário pelo holerite e vê cada troféu com uma animação ligada ao tema dele.

*Incluído pela Sprint Change Proposal de 16/10/2026.*

### Story 11.1: Criar o glossário financeiro e o balão de dica

As a usuário do DOMUS,
I want tocar num ícone de informação e ler o que um termo significa,
So that eu aprenda sem sair da tela.

**Implementa:** FR-25

**Acceptance Criteria:**

**Given** o glossário em `src/constants/financialGlossary.ts`
**When** ele é carregado
**Then** cada termo tem título e explicação em pt-BR com acentos
**And** uma função detecta os termos citados num texto livre, sem confundir palavras parecidas, e um teste cobre a detecção

**Given** um ícone de informação na tela
**When** eu toco nele
**Then** um balão ancorado ao ícone mostra o termo, abrindo abaixo dele ou acima quando não houver espaço
**And** o balão fecha ao tocar fora
**And** nenhuma dependência nova é adicionada.

### Story 11.2: Mostrar dicas nas telas e atalhos no chat da IA

As a usuário do DOMUS,
I want ver dicas onde os termos aparecem e no chat da IA,
So that eu entenda o que a tela e a IA dizem.

**Implementa:** FR-25

**Acceptance Criteria:**

**Given** o orçamento 50/30/20 da tela inicial e o campo de dividendo do CDB
**When** abro essas telas
**Then** cada uma tem o ícone de dica do termo correspondente

**Given** uma resposta da IA que cita termos do glossário
**When** a opção `tooltipsEnabled` está ligada
**Then** a resposta mostra até três atalhos "O que é…?" que abrem a explicação
**And** com a opção desligada, os atalhos não aparecem.

### Story 11.3: Extrair os dados do holerite a partir do texto do OCR

As a usuário do DOMUS,
I want que o app entenda o texto do meu holerite,
So that eu não precise digitar os valores.

**Implementa:** FR-26

**Acceptance Criteria:**

**Given** o texto de um holerite lido por OCR
**When** o parser em `packages/parsers` o processa
**Then** ele devolve empresa, CNPJ, competência (`YYYY-MM`), bruto, líquido, rubricas, descontos e FGTS
**And** bases de cálculo (INSS, IRRF, FGTS) não entram como desconto
**And** o bruto ou o líquido ausente é calculado a partir dos outros valores, com aviso
**And** a confiança cai quando os totais não fecham ou o líquido passa do bruto
**And** data de pagamento não é confundida com competência
**And** o resultado do Vision OCR é normalizado para o mesmo formato
**And** o nome do funcionário não é devolvido
**And** o parser é puro (AD-3) e coberto por testes.

### Story 11.4: Registrar o holerite como evento local

As a usuário do DOMUS,
I want que meus holerites fiquem no log como os outros dados,
So that eles sobrevivam ao replay e ao backup sem expor meu salário.

**Implementa:** FR-26
**Depende de:** Stories 3.1, 3.3 e 3.8

**Acceptance Criteria:**

**Given** os tipos `PAYSLIP_RECORDED` e `PAYSLIP_DELETED` em `packages/events`
**When** o log é reproduzido
**Then** os tipos são roteados ao `domainReducer` (AD-4) e o payload tem `schemaVersion` (FR-17)
**And** registrar a mesma competência do mesmo empregador (por CNPJ, ou por nome sem CNPJ) substitui a leitura anterior
**And** excluir remove o holerite e um id inexistente é ignorado
**And** o holerite não altera saldo de conta

**Given** um Grupo antigo configurado
**When** o sync publica eventos
**Then** nenhum evento `PAYSLIP_*` é publicado no Grupo antigo
**And** um teste garante esse filtro.

### Story 11.5: Capturar, revisar e salvar o holerite

As a usuário do DOMUS,
I want fotografar o holerite, conferir os valores e salvar,
So that meu salário fique registrado sem digitação.

**Implementa:** FR-26

**Acceptance Criteria:**

**Given** a tela de holerites
**When** escolho câmera ou galeria
**Then** a leitura usa o Vision OCR se houver provedor com visão e cai para o OCR do aparelho se ele falhar ou não existir
**And** posso preencher manualmente

**Given** o resultado da leitura
**When** abro a revisão
**Then** vejo os avisos do parser e posso corrigir empresa, competência, bruto e líquido
**And** só salvo com competência válida e líquido maior que zero e menor ou igual ao bruto
**And** posso lançar o líquido como receita numa conta que não seja cartão de crédito
**And** se a competência já existir, o app pede confirmação para substituir

**Given** o chat da IA
**When** uso "Escanear holerite"
**Then** o resultado abre a mesma revisão.

### Story 11.6: Mostrar o histórico e o gráfico do holerite

As a usuário do DOMUS,
I want ver a evolução do meu salário e dos descontos,
So that eu perceba aumentos, quedas e quanto vai para impostos.

**Implementa:** FR-26

**Acceptance Criteria:**

**Given** holerites salvos
**When** abro a tela de holerites
**Then** vejo o último líquido com a variação em relação ao anterior, a média líquida e o percentual de descontos
**And** um gráfico mostra líquido e bruto das últimas 12 competências
**And** o total acumulado por desconto aparece do maior para o menor
**And** posso excluir um holerite sem apagar a receita já lançada
**And** sem holerites, a tela explica o recurso e oferece a captura.

### Story 11.7: Gerar o Lottie dos troféus sem animação própria

As a dono do DOMUS,
I want gerar o Lottie de cada troféu que ainda não tem,
So that todos os troféus tenham uma animação própria no mesmo estilo.

**Implementa:** FR-27

**Acceptance Criteria:**

**Given** os troféus sem Lottie aprovado (114 litúrgicos e 3 sazonais)
**When** rodo o gerador de um lote (ex.: um mês litúrgico)
**Then** cada troféu do lote ganha o seu JSON em `assets/lottie/trophies/`, com os níveis de raridade, no padrão de `scripts/gen_trophy_*.js`
**And** cada animação usa um elemento próprio do troféu (ícone de licença aberta, com a fonte citada no gerador)
**And** nenhum troféu fica com animação igual à de outro.

### Story 11.8: Aprovar os novos Lottie e registrar no app

As a dono do DOMUS,
I want ver e aprovar cada Lottie gerado,
So that só animações aprovadas apareçam no app.

**Implementa:** FR-27

**Acceptance Criteria:**

**Given** um lote gerado pela Story 11.7
**When** abro o Artifact de aprovação
**Then** vejo cada troféu animado, com os níveis, e posso aprovar ou pedir ajuste com comentário

**Given** um troféu aprovado
**When** o lote é registrado
**Then** ele entra em `APPROVED_LOTTIE` e aparece com o Lottie no app e no DebugTools
**And** troféus ainda não aprovados continuam com a animação SVG atual.

### Story 11.9: Fazer o Lottie funcionar na web

As a dono do DOMUS,
I want que os troféus em Lottie também animem no navegador,
So that o build web volte a empacotar e cada troféu tenha a animação dele em todas as plataformas.

**Implementa:** FR-27 (D7)

**Acceptance Criteria:**

**Given** o build web (`npx expo export --platform web`)
**When** ele empacota o `LottieTrophy`
**Then** resolve `@lottiefiles/dotlottie-react` sem erro
**And** `package.json` e `package-lock.json` são atualizados para a CI (`npm ci`, npm 10)
**And** um troféu com Lottie aprovado anima no navegador
**And** o build Android de release continua verde.

## Epic 12: Privacidade por escolha

A pessoa ativa cada envio pela flag do recurso, sabe o que perde ao não ativar, e as fraquezas encontradas na Story 1.4 deixam de existir.

*Incluído pela Sprint Change Proposal "Privacidade por escolha" de 16/10/2026.*

### Story 12.1: Nunca enviar o código do grupo à IA

As a usuário do DOMUS,
I want que a IA nunca receba o código do meu grupo de sync,
So that o provedor de IA não consiga ler o que publico nos relays.

**Implementa:** FR-28 (D10)

**Acceptance Criteria:**

**Given** a permissão de dados da sincronização ligada nas configurações da IA
**When** o contexto é montado para o provedor
**Then** ele não contém o código do grupo nem nada derivado dele
**And** um teste do construtor de contexto garante isso para todas as permissões ligadas.

### Story 12.2: Fazer o backup automático obedecer ao interruptor

As a usuário do DOMUS,
I want que o backup só saia do aparelho quando eu escolher,
So that nenhuma cópia vá ao Drive sem a minha escolha.

**Implementa:** FR-28 (D11)

*Revisada em 16/10/2026 (decisão do dono, "limpar e manter"): o interruptor citado no D11 só existia em código morto (`AutoBackupService`); a flag do envio é conectar o Google Drive.*

**Acceptance Criteria:**

**Given** o código do app
**When** rodo `git grep -nE "AutoBackupService|domus_auto_backup_(enabled|password|interval_h)" -- src app`
**Then** não há ocorrência

**Given** o Google Drive desconectado
**When** o backup automático diário roda
**Then** a cópia cifrada fica só no aparelho e nada é enviado ao Drive

**Given** o Google Drive conectado
**When** o backup automático diário roda
**Then** a cópia é enviada ao Drive, como hoje.

### Story 12.3: Proteger o PIN com salt criptográfico e derivação lenta

As a usuário do DOMUS,
I want que meu PIN não possa ser descoberto por tentativa rápida,
So that o bloqueio do app proteja de verdade.

**Implementa:** FR-28 (D8)

**Acceptance Criteria:**

**Given** um PIN novo
**When** ele é salvo
**Then** o salt vem de uma fonte criptográfica e o hash usa derivação lenta (PBKDF2 ou similar)

**Given** um PIN salvo no formato antigo
**When** o usuário desbloqueia com o PIN certo
**Then** o PIN é regravado no formato novo, sem pedir de novo
**And** testes cobrem o formato novo, a migração e o PIN errado.

### Story 12.4: Anúncio personalizado só com consentimento no modo de apoio

As a usuário do DOMUS,
I want escolher se os anúncios usam meus dados,
So that apoiar o app com anúncios não exija abrir mão da privacidade.

**Implementa:** FR-28 (D9)

**Acceptance Criteria:**

**Given** um modo de apoio com anúncios
**When** um anúncio é pedido
**Then** ele é não personalizado, a menos que eu tenha consentido com anúncios personalizados
**And** o consentimento é pedido de forma explícita, dizendo o que é enviado, e pode ser revogado no mesmo lugar.

### Story 12.5: Avisar antes da exportação sem criptografia

As a usuário do DOMUS,
I want ser avisado antes de exportar um backup sem cifra,
So that eu saiba que qualquer pessoa com o arquivo lê meus dados.

**Implementa:** FR-28 (D12)

**Acceptance Criteria:**

**Given** a opção de exportação sem criptografia
**When** eu a escolho
**Then** o app pede confirmação com o aviso de que o arquivo fica legível por qualquer pessoa
**And** sem confirmação, nada é exportado.

### Story 12.6: Criar a flag das consultas de itens, preços e ícones

As a usuário do DOMUS,
I want ligar ou desligar as consultas externas de itens, preços e ícones,
So that nada saia do aparelho sem eu escolher.

**Implementa:** FR-28

**Acceptance Criteria:**

**Given** a flag desligada
**When** importo uma nota, abro a lista de desejos ou o app faz a atualização diária
**Then** não há consulta a Open Food Facts, Cosmos, Siscomex, páginas de produto nem ao serviço de ícones do Google
**And** o app classifica por palavras-chave, mostra ícone genérico e o último preço salvo

**Given** uma instalação nova
**When** abro as configurações
**Then** a flag começa desligada

**Given** quem já usa o app
**When** atualiza
**Then** a flag começa ligada e o app avisa uma vez o que ela envia e o que se perde ao desligar.

### Story 12.7: Dizer em cada flag o que transmite e o que se perde

As a usuário do DOMUS,
I want ler, em cada flag, o que é enviado e o que perco se não ativar,
So that minha escolha seja informada.

**Implementa:** FR-5, FR-28

**Acceptance Criteria:**

**Given** cada flag de envio (IA e permissões, voz, Cloud Vision, sync, Drive, backup automático, Firebase, anúncios, consultas de itens)
**When** a vejo no app
**Then** ela diz o que é transmitido se ativada e quais benefícios se perdem se desligada
**And** `docs/politica-de-privacidade.md`, a tela da política e o `PLAY_STORE_LISTING.md` dizem o mesmo
**And** os textos refletem as Stories 12.1 a 12.6 já entregues.

## Epic 13: Teclado nunca cobre o campo

A pessoa digita em qualquer campo do app vendo o campo e o botão de confirmar, em telas, modais e no chat.

*Incluído pela Sprint Change Proposal de 20/10/2026.*

### Story 13.1: Ligar o sistema único de teclado na raiz

As a usuário do DOMUS,
I want que o app trate o teclado de um jeito só,
So that a tela suba sempre do mesmo modo, sem deslocar duas vezes.

**Implementa:** FR-29

**Acceptance Criteria:**

**Given** `app/_layout.tsx`
**When** o app abre
**Then** um `KeyboardProvider` (translúcido para edge-to-edge) envolve a navegação
**And** o `react-native-avoid-softinput` sai do código, do `package.json` e do `package-lock.json` (npm 10)
**And** as telas com `KeyboardAwareScrollView` (add-transaction, ai-settings, backup, about) sobem até o campo focado
**And** nenhuma tela que subia antes deixa de subir.

### Story 13.2: Padronizar a rolagem das telas com campos

As a usuário do DOMUS,
I want que toda tela com formulário role até o campo que estou digitando,
So that eu veja o que escrevo.

**Implementa:** FR-29

**Acceptance Criteria:**

**Given** um componente de rolagem padrão (a partir de `components/KeyboardAwareScrollViewCompat.tsx`)
**When** o uso em add-transaction, ai-settings, backup, about, ocr-settings, sync e na revisão da nota (ParsedScreen)
**Then** ao focar qualquer campo, ele fica visível acima do teclado com folga, e o botão principal fica alcançável rolando
**And** tocar num botão com o teclado aberto funciona no primeiro toque (`keyboardShouldPersistTaps`).

### Story 13.3: Fazer os modais com formulário subirem

As a usuário do DOMUS,
I want que os formulários em modal subam com o teclado,
So that eu consiga lançar transação, criar conta e adicionar item sem o teclado tampar.

**Implementa:** FR-29

**Acceptance Criteria:**

**Given** o `KeyboardSafeView` funcionando com o provider da raiz
**When** abro a nova transação da tela inicial, o formulário de conta, a criação de lista e a adição de item da lista de desejos
**Then** o campo focado e o botão de salvar ficam acima do teclado
**And** ao fechar o teclado não sobra espaço em branco no modal.

### Story 13.4: Fazer as buscas e diálogos em modal subirem

As a usuário do DOMUS,
I want que as buscas e diálogos com campo também subam,
So that eu veja o que digito em qualquer lugar do app.

**Implementa:** FR-29

**Acceptance Criteria:**

**Given** a busca de categoria, a busca de loja, a busca de conta (modo compacto), o diálogo "APAGAR TUDO", a chave de IA no onboarding e as ferramentas de debug
**When** foco o campo
**Then** o campo e a lista ou o botão de confirmar ficam visíveis acima do teclado.

### Story 13.5: Um só deslocamento no chat da IA

As a usuário do DOMUS,
I want que a caixa de mensagem do chat fique logo acima do teclado,
So that não sobre nem falte espaço quando digito.

**Implementa:** FR-29

**Acceptance Criteria:**

**Given** o chat da IA com o provider da raiz
**When** abro e fecho o teclado várias vezes
**Then** a caixa de mensagem fica colada acima do teclado e volta ao lugar ao fechar
**And** o `ai-chat.tsx` não tem provider próprio; o GiftedChat é ajustado por `keyboardProviderProps`/`keyboardAvoidingViewProps`.

### Story 13.6: Corrigir a digitação manual da chave da NF sobre a câmera

As a usuário do DOMUS,
I want ver a chave de acesso que digito sobre a câmera,
So that eu importe a nota sem QR legível.

**Implementa:** FR-29

**Acceptance Criteria:**

**Given** a tela de QR da importação de nota com o campo de chave em `autoFocus`
**When** o teclado abre
**Then** a barra inferior com o campo e o botão sobe acima do teclado.

### Story 13.7: Verificar todos os campos no aparelho

As a dono do DOMUS,
I want uma checklist de todos os campos testados no aparelho,
So that eu tenha prova de que o teclado nunca cobre o campo.

**Implementa:** FR-29

**Acceptance Criteria:**

**Given** a lista de locais com campo da Sprint Change Proposal de 20/10/2026
**When** testo cada um no Android 16 e no navegador
**Then** uma checklist em `docs/` registra o resultado de cada campo
**And** a checklist anda junto da checklist da Story 1.3.
