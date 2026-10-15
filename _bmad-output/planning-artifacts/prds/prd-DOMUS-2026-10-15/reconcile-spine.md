# Reconciliação: ARCHITECTURE-SPINE.md x PRD (prd.md + addendum.md)

Entrada: `architecture/architecture-DOMUS-2026-10-15/ARCHITECTURE-SPINE.md` (AD-1 a AD-11, Deferred).
Gravidade: ALTA = o PRD, como está, levaria a um build que viola o spine; MÉDIA = lacuna que gera dúvida na arquitetura/épicos; BAIXA = detalhe.

## 1. Contradições (PRD contra o spine)

### C1. FR-8 (sincronizar chaves de API) x AD-6 (nenhum segredo em evento) — ALTA
- AD-6: "Nenhum segredo novo em AsyncStorage, em evento ou em EXPO_PUBLIC_*". O PRD marca como `[ASSUMPTION]` uma "exceção documentada" e a enterra no §9, sem decidir.
- O NFR-1 do PRD enfraquece a regra do spine: diz "em Evento **em texto puro**", enquanto o AD-6 proíbe segredo em evento, ponto.
- O canal das chaves não está definido. O FR-8 pede "vira Evento, ou usa outro canal" por item, mas chave de API não pode virar Evento sem emendar o AD-6. Falta dizer qual canal (ou aprovar a emenda do AD-6).
- O Deferred do spine ("Assinatura de eventos e cifra real no sync: revisitar antes de qualquer dado sensível extra no log") é o gatilho exato. O PRD respeita pela dependência FR-8 -> FR-12, mas a ordem de entrega o contradiz: bloco C (FR-8) vem antes do bloco D (FR-12). Sem isso explícito, FR-8 pode ser implementado antes da cifra real.
- Também: o AD-6 diz que, na web, segredo novo usa `webSecrets`. O PRD não diz como a chave sincronizada é guardada em cada plataforma (SecureStore no nativo, webSecrets na web).

### C2. FR-8 (sincronizar configurações) x AD-6 (preferências em AsyncStorage) e AD-1 — MÉDIA
- AD-6: "fatos são eventos; preferências de UI e metadados de sync ficam em AsyncStorage". O FR-8 sincroniza configurações e histórico de chat do bot, que o AD-6 não classifica como fato.
- Para sincronizar, a preferência precisa virar Evento. Isso muda a fronteira do AD-6 e cria tipos novos que precisam de rota (AD-4), reducer e despacho correto (`dispatch` x `dispatchDomainEvent`, AD-1). O PRD não menciona nenhum dos três.

### C3. FR-19 (id determinístico derivado do fato) x AD-3 (único gerador de id) — ALTA
- AD-3: o id vem de `generateId` em `packages/events/src/factory.ts`, chamado por `createEvent`. "Não crie outro gerador". O FR-19 exige id determinístico para eventos de efeito (XP, conquista, aporte, recuperação, categorias padrão).
- Pede um segundo caminho de criação de id. Precisa de emenda explícita do AD-3 ou de uma variante de `createEvent` aceita pelo spine.
- Interação com o AD-2: o id determinístico faz a idempotência (`INSERT OR IGNORE`) deduplicar, o que é bom. Mas eventos já publicados com ids aleatórios (aporte, recuperação, categorias padrão) seguem duplicados no log; o PRD não trata a migração (liga com o NFR-4).

### C4. FR-17 (`profileId` no envelope) x AD-2 (envelope fixo) — MÉDIA
- AD-2: envelope fixo `{id, type, payload, timestamp, deviceId, signature}`. O FR-17 diz que "o envelope e os payloads comportam um `profileId` futuro". Mexer no envelope contradiz o "fixo" e afeta sync, SQLite e XOR/cifra novo. Precisa decidir: no payload (compatível) ou emenda do AD-2.
- O Deferred ("o envelope não tem versão") é endereçado só no payload (`schemaVersion`); o PRD não diz se a versão fica no envelope.

### C5. FR-15 (quarentena) e FR-16 (limitar timestamp) x AD-2 (log imutável) — MÉDIA
- AD-2: um evento nunca é editado nem apagado. "Quarentena" (glossário: "separar um Evento") e "timestamp limitado a um valor próximo do presente" podem ser lidos como alterar/descartar o evento. O PRD precisa dizer que a quarentena e o clamp valem só no replay/ordenação (a leitura), não reescrevem o log. Hoje o texto é ambíguo.
- FR-10 (reset/restauração com "Evento marcador"): compatível com o AD-2 (novo evento), mas o marcador é uma semântica de barreira que quebra o "merge é a união por id" do AD-8 e depende da ordem total. Falta definir o comportamento quando um aparelho offline tem eventos com `timestamp` anterior ao marcador. Também exige roteamento (AD-4) e dispatch (AD-1).

### C6. FR-2 (atualizar Node nos workflows do GitLab) x AD-11 (GitLab legado, não evolua) — MÉDIA
- O FR-2 lista "os workflows do GitHub Actions, do EAS **e do GitLab**" com Node 24/22. O AD-11 manda não evoluir o GitLab CI. O PRD deve tirar o GitLab do FR-2 (ou registrar a exceção).
- O §4.9 do PRD cita o AD-11 corretamente, mas o FR-2 o desrespeita.
- Também silente: o spine registra "dois caminhos de web" (EAS `deploy-web` x job web do GHA) como pendência. O FR-21 ("os workflows rodam lint e testes") não diz em quais pipelines, nem qual dos dois da web é canônico.

### C7. FR-13 (rejeitar código curto) x FR-14 ("nenhum repareamento") e AD-6 (group code em SecureStore) — MÉDIA
- O group code atual (6 caracteres) está guardado em SecureStore, com migração de legado (`syncStorage.ts`). O FR-13 faz o app "rejeitar código abaixo do comprimento mínimo ao parear"; isso invalida grupos existentes. O FR-14 promete que não há repareamento. Falta definir o que acontece com grupos já pareados com o código fraco.

### C8. FR-18 (log da web sem texto puro; sem WebCrypto não persiste) x AD-6/NFR-4/NFR-5 — MÉDIA
- O AD-6 trata o log em `AsyncStorage` na web como dívida aceita ("eventos não são segredo, mas contêm dados financeiros"), e o fallback de `webSecrets` guarda só em memória. Aplicado ao log inteiro, "não persistir" significa perder o histórico em tela web sem WebCrypto/IndexedDB, o que bate com offline-first (NFR-5) e com o NFR-4 (sem perda de dados). O PRD não escolhe. O spine também avisa que isso "não protege de XSS", e o FR-18 não o repete.
- Custo de AES-GCM sobre o log completo (volume) não é considerado.

## 2. Lacunas: o spine diz e o PRD não carregou

### L1. Exceções de AD-6 e NFR-1 — ALTA
- Nativo: se o `SecureStore` falhar, `saveGroupCode` cai para `AsyncStorage` com `console.warn` (queda silenciosa, aceita "para não perder o sync"). O NFR-1 ("nenhum Segredo em AsyncStorage") e o SM-5 ("nenhum Segredo em texto puro nos armazenamentos") ficam falsos na prática; nenhum FR trata a queda. Decidir: falhar fechado, ou aceitar e documentar.
- O SM-5 afirma "verificação automática"; o spine diz que só a regra de `EXPO_PUBLIC_*` com `SECRET/PRIVATE/PASSWORD` é verificada por máquina, e o resto "só por revisão". SM-5 promete mais do que o spine garante; falta um FR/story para criar essa verificação.
- A exceção web (segredos via `webSecrets`, só memória sem WebCrypto, nada contra XSS) só aparece de lado no FR-18; o resto do PRD (FR-8, FR-11, FR-22) não diz como cada plataforma guarda os segredos.

### L2. Gamificação multi-aparelho: o Deferred é mais amplo que o FR-19 — ALTA
- O Deferred lista `LEVEL_UP` e `STREAK_UPDATED` gravando valor absoluto ("vence o último a chegar"), exceção ao AD-1 também citada na regra. O FR-19 cobre XP, conquistas, aporte, recuperação e categorias padrão, e omite `LEVEL_UP`/`STREAK_UPDATED`. Resultado: nível e streak seguem divergindo entre aparelhos mesmo com o FR-19 pronto, contrariando o NFR-2 e o SM-2 ("estado final idêntico").
- Gatilho do Deferred: "revisitar antes de promover sync entre aparelhos". O PRD promove o sync (FR-6, FR-8) sem registrar essa pré-condição.

### L3. AD-10 (troféu único por pessoa): o PRD tirou do escopo, mas o spine o carrega como regra — ALTA
- O spine registra o AD-10 como decisão vinculante ([binds] `packages/gamification`, `useGamificationEffects.ts`): sorteio aleatório de propósito, valor por pessoa, evento `SEASONAL_TROPHY_SELECTED`, um aparelho só sorteia se não há seleção do período no log, mesmo troféu em outro ano sobe o tier (não duplica). A semente atual (`deviceId`) o viola (dívida).
- O PRD os põe em §5 (fora do escopo) e no addendum F ("insumo"), mas o **FR-8 manda sincronizar "troféus ganhos"** e o §4.6 exclui os troféus do FR-19. Resultado: com FR-6/FR-8 entregues e sem o AD-10 cumprido, dois aparelhos do mesmo grupo sorteiam troféus diferentes e pagam XP em dobro, exatamente o que o AD-10 "previne". O PRD precisa dizer que "troféus ganhos" no FR-8 é condicionado à reformulação (ou que FR-8 não sincroniza troféus até lá).
- Perda qualitativa: o spine justifica o sorteio ("como um pacote de figurinhas") como intenção de produto; no PRD só existe no addendum, fora da estrutura de FRs.

### L4. AD-9 (congelados e legado) — BAIXA
- O PRD §4.9 chama `packages/sync` de "intocável" junto com `replit.*`. O AD-9 distingue: `packages/sync` é **congelado** (só `webrtcFactory.ts` importa tipos dele), `packages/core` é **legado** (código novo usa `packages/domain`), e **intocáveis** são só `replit.md`, `replit.nix` e `.replit`. O PRD omite `packages/core` e a regra "código novo vai para `packages/domain`", que vale para o FR-19/FR-17 (onde mora o código novo).
- O FR-20 (6 arquivos de teste falhando, entre eles `parsers/*`) toca os parsers, onde o spine localiza cópias de `generateId` (`sefazParser.ts`, `ocrParser.ts`) como dívida do AD-3. O PRD não diz se o FR-20 deve consertar ou isolar isso.

### L5. AD-4 (roteamento de tipos) — MÉDIA
- Cada tipo novo (marcador de reset FR-10, quarentena FR-15, configurações FR-8, chat) precisa de rota em `replayAllEvents`, ou é descartado em silêncio. O PRD não menciona o AD-4. Está também sem destino o Deferred de `PERSONALITY_EVENTS` (sem rota) e do segundo `EVENT_TYPES` em `packages/parsers`. Não consta em FR nem em §5.

### L6. Deferred do spine ausente no PRD (nem FR, nem não-objetivo) — MÉDIA
- Remoção de `packages/core` e do `SyncEvent` duplicado em `storage` e `sync`.
- Centavos inteiros (AD-7; o PRD silencia sobre dinheiro como `number`).
- Assinatura de eventos (AD-2: `signature` vazia; a confiança vem da chave do grupo). O FR-12 dá integridade, mas qualquer membro do grupo ainda falsifica evento de outro `deviceId`; o PRD não registra isso como risco aceito, nem o FR-12 menciona que o spine considera a cifra do sync (XOR) fraca "por construção".
- Operação e infra: onde o `server/` roda, observabilidade (só Analytics é importado em `src/`; Crashlytics e Performance estão instalados) e backup do banco do `server/`. O §1 do PRD diz que o app "não registra dados em servidor", mas o spine mostra Firebase Analytics importado; o FR-5, o NFR-6 e o formulário *Data safety* precisam refletir Analytics e os provedores de IA (openai, gemini, claude, deepseek, qwen) como saídas de dados do aparelho.
- Qualidade: o spine diz que não há script `test` nem `typecheck` e que o ESLint **ignora `packages/*`**; assim o gate lint do FR-21 não cobre AD-3/AD-4 (onde estão as regras do núcleo). O PRD só aborda o `tsc` como `[ASSUMPTION]`.
- Planejamento: migração de `ROADMAP.md` para `_bmad-output/planning-artifacts/`.
- Login do Drive: o spine já diz que o fluxo `getTokens()` "não foi testado em aparelho" e que o usuário precisa reconectar uma vez. O FR-22 e o FR-4 cobrem isso, mas o FR-4 (Credential Manager) troca de novo o mecanismo que o spine acabou de documentar (AD-6, "Como se cumpre hoje"); o spine terá de ser atualizado.

### L7. AD-8 e AD-2: o PRD concorda, mas deixa implícito — BAIXA
- "Sem servidor próprio" (AD-8) está no §4.9 e no addendum D, e o FR-10 não tem como apagar eventos dos relays públicos (só marca), o que o FR-5 já admite. OK.
- AD-2 (ordem total + idempotência) x FR-7/FR-9: sem contradição direta. O FR-7 ("nunca republicar o que foi importado") é compatível com a idempotência por `id`, e o PRD já avisa que a proposta do revisor ("enviar todo evento não confirmado, de qualquer aparelho") é restringida pelo FR-7. Mas isso significa que um aparelho que perde a conectividade nunca "repara" o envio de outro; o FR-9 só reenvia o próprio lote. Sem hospedar nada além de relays, o recuperar vem do pull paginado. Vale deixar isso dito.

## 3. Ideias qualitativas que a estrutura de FRs deixou cair

- Princípio "estado nunca persistido, sempre replay" (AD-1) e "UI despacha eventos, nunca muta estado": no PRD aparece só no Glossário; os FRs 8/10/19 não o usam como critério.
- "Confiança vem da chave do grupo, evento não é assinado" (AD-2): ausente. É premissa de modelo de ameaça para o FR-12.
- "Queda silenciosa de segurança, aceita para não perder o sync" (AD-6): tradução de prioridade do dono (disponibilidade acima de rigor). O SM-C3 ecoa isso, mas o PRD não afirma a ordem de prioridade.
- Tom de coleção/jogo do troféu ("pacote de figurinhas") e a ideia de "uma pessoa, não um aparelho" como unidade de identidade: só no addendum F.
- A diretriz de que os pacotes `packages/*` são "sem plataforma" e determinísticos (AD-3: sem `Date.now`, `Math.random`) conflita com o FR-16 (clamp do timestamp próximo do presente: precisa de relógio): o clamp tem de ficar na casca, e o PRD não diz.
- Convenção "texto de UI em pt-BR com acentos completos" (Consistency Conventions) está como NFR-7; ok.
- "Android primeiro" (escopo do spine): o PRD fala em celular, tablet e navegador sem priorizar plataforma; o web não tem SQLite nem SecureStore e é onde ficam as exceções do AD-6.

## 4. Resumo de ações sugeridas ao PRD
1. Decidir FR-8/chaves: emendar o AD-6 explicitamente ou remover as chaves de FR-8 até o canal ser definido; corrigir o NFR-1 para "nenhum segredo em evento" e a ordem de entrega (FR-12 antes das chaves).
2. FR-8: condicionar "troféus ganhos" ao AD-10 (ou excluir); incluir `LEVEL_UP`/`STREAK_UPDATED` no FR-19; registrar os pré-requisitos do Deferred de multi-aparelho.
3. Emendar AD-3 (id determinístico) e AD-2 (`profileId`/versão no envelope), ou ajustar os FRs 17/19.
4. FR-2: tirar o GitLab; FR-21/FR-1: dizer em quais pipelines; resolver os dois caminhos de web.
5. Esclarecer FR-13 x FR-14 (grupos existentes), FR-15/16 (leitura, não reescrita do log) e FR-18 (sem WebCrypto).
6. Declarar a saída dos Deferred do spine que ficam fora de escopo (assinatura, centavos, `packages/core`, rotas de `PERSONALITY_EVENTS`, `server/`, observabilidade) em §5.
