---
status: draft
stepsCompleted: [1, 2]
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

### Epic 10: Segredos e backup em todos os aparelhos
A preferência religiosa e o escopo completo do backup do Drive acompanham o usuário entre aparelhos, e as chaves de IA e OCR sincronizam só entre aparelhos nativos, com opt-in.
**FRs covered:** FR-8b (preferência religiosa), FR-8c, FR-11
**Depende de:** Epic 4, Epic 5, Epic 6 e Epic 9.
**Fora do escopo:** histórico de chat da IA (decisão do dono).

<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic {{N}}: {{epic_title_N}}

{{epic_goal_N}}

<!-- Repeat for each story (M = 1, 2, 3...) within epic N -->

### Story {{N}}.{{M}}: {{story_title_N_M}}

As a {{user_type}},
I want {{capability}},
So that {{value_benefit}}.

**Acceptance Criteria:**

<!-- for each AC on this story -->

**Given** {{precondition}}
**When** {{action}}
**Then** {{expected_outcome}}
**And** {{additional_criteria}}

<!-- End story repeat -->
