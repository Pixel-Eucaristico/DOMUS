# Revisão adversarial geral — PRD DOMUS: Segurança e Atualização

Data: 2026-10-15. Alvo: `prd.md` e `addendum.md` desta pasta. Código lido em `/Users/epj/Documents/Code/outros/DOMUS` (árvore de trabalho, branch `dev`, com mudanças não commitadas). Nenhum arquivo foi editado, exceto este.

Convenção de severidade: **CRÍTICO** = o PRD, se executado como está, falha ou causa dano; **ALTO** = FR inviável ou contraditório que vai travar a arquitetura/épicos; **MÉDIO** = lacuna de testabilidade ou risco não nomeado; **BAIXO** = imprecisão.

## Veredito

O PRD acerta o diagnóstico (a maioria das afirmações factuais confere), mas o bloco C/D tem uma contradição estrutural (a cifra nova não protege nada enquanto o código de grupo for de 30 bits e o XOR conviver), o FR-8 "sincronizar tudo" é maior e mais perigoso do que o texto admite, e a ordem de entrega põe a dependência de teste (FR-20) no fim, depois de quem a consome (FR-3). Não está pronto para virar épicos.

## O que o código CONFIRMA (não é falha do PRD)

- `targetSdkVersion`/`compileSdkVersion` são 35 em `app.json` (`expo-build-properties`), e o RN 0.81 traz 36 por padrão (`node_modules/react-native/gradle/libs.versions.toml`). A premissa do FR-1 é verdadeira.
- Node 20 na CI: `.github/workflows/build-android.yml:36,179`, `build-ios.yml:25`, `.gitlab-ci.yml:8`. Sem `.nvmrc` nem `engines`.
- Código de grupo de 6 caracteres de um alfabeto de 32 símbolos (30 bits), gerado com `Math.random()` (`src/context/syncStorage.ts:18-24`).
- XOR com keystream `sha256(chave ‖ nonce)` (`src/modules/nostrSync.ts`, `xorEncryptDecrypt`/`encryptPayload`): sem autenticação.
- Baseline: `npx vitest run` dá exatamente 25 falhas em 6 arquivos (598 passam). O `tsc --noEmit` dá 466 erros. FR-20 e a suposição de FR-21 estão corretos.
- Política in-app diz WebRTC (`app/privacy-policy.tsx:226`); listagem diz "ponta-a-ponta" e "SQLite criptografado" (`PLAY_STORE_LISTING.md:58,74,128`). FR-5 está correto.
- O reducer ordena só por `timestamp` (`useEventStore.ts` `dispatch`/`importEvents`). Premissa do FR-16 correta.
- O envio ignora falha de lote: `publishSyncEvents` engole o erro e `pushMyEvents` grava o hash mesmo assim. Premissa do FR-9 correta.

---

## Achados

### A1. CRÍTICO — FR-12, FR-13, FR-14: a "cifra real" não protege nada, e FR-13 contradiz FR-14

Três problemas encadeados, todos provados no código.

1. **A identidade Nostr e a chave de cifra saem do mesmo código de 30 bits.** `deriveKeysFromCode` deriva `privateKey` e `encryptionKey` do mesmo `seed = sha256("domus-group:" + código)`. A `publicKey` vai em claro em cada evento nos relays. Um atacante que leia qualquer evento do grupo nos relays pode testar os 2^30 (~1,07 bilhão) códigos até a chave pública bater, offline, e então decifra tudo. Trocar XOR por AES-GCM (FR-12) **não muda essa conta**: a entropia é o código, não a cifra. O PRD trata FR-12 (cifra) e FR-13 (código) como itens separados e põe FR-13 depois, mas só o FR-13 move o risco. O Glossário ("dele derivam as chaves") mostra que o PRD sabe disso, mas não tira a consequência.
2. **FR-14 manda escrever nos dois formatos.** Durante a coexistência, o mesmo evento é publicado em XOR sob a mesma chave de 30 bits. O atacante lê o XOR e ignora o AES-GCM. FR-12 só passa a valer depois do corte, que não tem data (A5).
3. **FR-13 contradiz FR-14 ("nenhum repareamento").** FR-13 exige que "o app rejeite um código abaixo do comprimento mínimo ao parear" e que o código seja gerado forte. Os grupos existentes têm código de 6 caracteres. Ou o app rejeita o código antigo (obrigando a parear de novo, o que FR-14 e UJ-2 proíbem), ou aceita (então a chave continua de 30 bits e o FR-12 é decorativo). Não existe caminho que satisfaça os dois sem **rotação de chave** (novo código, derivado forte, distribuído entre aparelhos), que não está em nenhum FR. Hoje `app/sync.tsx:249` limita a entrada a 8 caracteres (`maxLength={8}`): um código forte e longo nem cabe no campo.
4. **Histórico permanece cifrado em XOR para sempre.** Os eventos já publicados nos relays públicos não são apagáveis (o `d`-tag substituível só é sobrescrito quando o mesmo aparelho republica o lote). O PRD fala em "desligar o XOR" como se isso removesse a exposição. Não remove.

**Correção proposta:** (a) fundir FR-12+FR-13 num único FR "rotação de chave de grupo" com derivação forte (por exemplo, segredo aleatório de 128 bits, mostrado como QR ou código longo, com KDF) e declarar que o grupo antigo é migrado por um evento de "rekey" dentro do canal antigo (único momento em que o repareamento é automático); (b) proibir escrita dupla de eventos sob a mesma chave fraca: na coexistência, publicar o novo formato só com a chave nova e manter XOR apenas como **leitura** do que aparelhos antigos escrevem; (c) declarar em FR-5 e NFR-6 que o histórico antigo continua exposto a quem tiver o código antigo, e que isso é residual aceito.

### A2. CRÍTICO — FR-8: "sincronizar tudo" quebra NFR-1, AD-6, a promessa de privacidade e a plataforma web

FR-8 é um épico inteiro, não um FR. Itens provados:

- **Chaves de API não são sincronizáveis hoje, nem na web.** `SecureStorageService.get` devolve `null` e `set` não faz nada quando `Platform.OS === "web"` (`src/modules/security/infrastructure/SecureStorageService.ts`). As chaves de IA (`SecureKeyService`) usam esse armazenamento, então **no navegador não existe lugar onde guardá-las**. A UJ-1 inclui o navegador do PC. O PRD não diz que o navegador fica de fora, nem que precisa de `webSecrets` para isso.
- **A "chave de dispositivo" é uma constante.** `SecureKeyService.deriveDeviceKey` deriva a chave de `DEVICE_SECRET = "domus_ai_device_secret_v1"`, um literal no bundle. A chave de API é "cifrada" com um segredo igual em todas as instalações. Para sincronizar é preciso lê-la em texto puro e reempacotá-la com a chave do grupo: o FR-8 precisa dizer que o sync de chave exige **trocar** o esquema de proteção local, ou o opt-in expõe uma chave de terceiro (OpenAI/Gemini/Cloud Vision, que custa dinheiro) a quem tiver o código.
- **A chave de OCR já viola o NFR-1.** `src/services/ocrConfigService.ts:43` grava `cloudVisionApiKey` em `AsyncStorage` em texto puro. Também em `AsyncStorage`: a chave de dispositivo do auto-backup (`src/hooks/useAutoBackup.ts:45`, 24 caracteres que derivam a cifra do backup) e o histórico do chat (`src/hooks/useAIConsultant.ts:34`). O NFR-1 e o SM-5 ("nenhum segredo em texto puro nos armazenamentos") são **falsos hoje** e **nenhum FR corrige isso**. O FR-8 trata as chaves de OCR como se já estivessem em lugar seguro. O token do OAuth do ChatGPT (`OpenAIOAuthService`) também é um Segredo e não aparece no Glossário nem no FR-8.
- **Contradição interna com o próprio AD-6.** O AD-6 (spine, linha 79) diz "nenhum segredo em evento". O FR-8 cria a exceção como `[ASSUMPTION]` "confirmar". Uma suposição não pode ser a base de um FR que destrói um invariante de segurança. A decisão precisa estar fechada **antes** dos épicos, não depois.
- **"Tudo" não cabe em "evento".** O log é um conjunto imutável de fatos. Configurações (tema, som, intervalo de backup) e chat são **estado mutável por aparelho** (`AsyncStorage`, lista cortada em 200 mensagens). O texto diz "vira Evento, ou usa outro canal", mas "outro canal" não existe (AD-8 proíbe backend; WebRTC está em `packages/sync` intocável e inutilizado). Preferências por aparelho (tema, som, intervalo, notificações) provavelmente **não deveriam** sincronizar; o PRD não separa "preferência do usuário" de "preferência do aparelho".
- **Contradição com FR-19.** FR-8 inclui "troféus ganhos"; FR-19 e §5 declaram troféus fora do escopo (reformulação em andamento, e a semente do sorteio é `deviceId`, o oposto da regra do dono). Ou o FR-8 exclui troféus, ou o sync leva um dado que será reescrito.
- **Volume amplificado por um defeito que o PRD não nomeia.** `pushMyEvents` republica **todos** os lotes do aparelho a cada mudança (o hash só decide se publica, e então publica tudo; `publishSyncEvents` itera `events` inteiro). `pullSyncEvents` **ignora o parâmetro `sinceTimestamp`** (o filtro só tem `kinds`, `authors`, `limit: 500`) e roda a cada 8 s (`PULL_INTERVAL_MS`) contra 6 relays. O FR-9 manda tirar o teto de 500 sem exigir pull incremental: depois de FR-8+FR-9, cada tick de 8 s baixa o histórico inteiro, com chat, de 6 relays. A suposição "medir antes de decidir" sobre o volume do chat é inútil se o custo vem do protocolo e não do chat.

**Correção proposta:** quebrar em três FRs/épicos: (1) inventário e classificação (evento / preferência por aparelho / segredo local); (2) preferências de usuário como eventos com `schemaVersion`; (3) sync de segredos **opt-in, só nativo**, após a rotação de chave (A1), com esquema de proteção local novo. Retirar "troféus" do FR-8. Mover as violações atuais do NFR-1 (OCR key, chave de backup, chat) para FRs de correção próprios (ou assumir explicitamente que ficam fora e reescrever NFR-1/SM-5). Acrescentar a FR-9: "pull incremental com `since`; publicar só os lotes alterados".

### A3. ALTO — FR-7 vs FR-9 vs FR-19: o anti-eco já é estrutural e a contradição real é outra

- **O texto de FR-7 não tem a contradição que o PRD apresenta, mas tem outra.** O push já filtra por `deviceId` próprio (`getMyEvents`: `allEventsRef.current.filter((e) => e.deviceId === did)`), logo um evento importado nunca é republicado por esse caminho. A "nota para o PM" que restringe FR-9 está certa em evitar "reenviar tudo de qualquer aparelho", mas o PRD não explica **o que então garante entrega** quando o aparelho de origem sumiu: se o tablet é perdido/resetado antes de publicar com sucesso, só ele tem aqueles eventos. FR-7 + "confirmado por pelo menos um relay" (FR-9) significa que a única cópia durável é a de um relay público qualquer. Nenhum FR define retenção, e relays públicos podem recusar o kind 30333, aplicar limites ou apagar.
- **FR-7 segunda consequência ("importar não emite XP") contradiz FR-19.** Os efeitos de gamificação não são disparados "pelo import": são `useEffect` sobre o **estado derivado** (`useGamificationEffects`, e o efeito de recuperação de XP em `AppStateProvider.tsx:188-218`, com `id: xp-recovery-${generateId()}`, não determinístico). Não existe hoje um ponto "importar" em que se possa suprimir efeito. O FR-19 resolve por **id determinístico** (dois aparelhos emitem o mesmo id e o log deduplica). O FR-7 resolve por **proibição de emitir**. Os dois mecanismos juntos produzem um caso sem resposta: a conquista que só existe depois de **combinar** eventos de dois aparelhos (o próprio exemplo do FR-19) nunca é emitida por ninguém sob FR-7. Precisa de uma regra única: "efeito é função pura do estado e tem id determinístico; nenhum caminho de import o suprime".
- **O teste de FR-7 ("publicações = N, não cresce") não casa com o código.** Como o push republica todos os lotes a cada mudança, "número de publicações" por Evento é uma métrica sem definição (publicação de lote ou de evento? o relay substitui o `d`-tag, então a contagem de eventos Nostr não cresce mesmo havendo reenvio). Definir a métrica (eventos de domínio por relay, observados) ou a SM-2 não prova eco.
- **O "loop" da UJ-1 não é reproduzível no código atual.** O PRD afirma que "o sync anterior entrava em loop". O filtro por `deviceId` torna o eco no push impossível; resta eco de efeitos (acima). Isso não está evidenciado no repositório; sem o repro, a UJ-1 testa algo que já passa.

**Correção proposta:** FR-7 reescrito como invariante testável em nível de reducer/efeito ("efeitos têm id derivado do fato; reimportar o mesmo conjunto produz zero novos eventos locais") e unificado com FR-19. Adicionar FR de durabilidade: "ao reconectar, o aparelho reenvia **seus próprios** eventos não confirmados" (permitido pelo FR-7) e documentar que perder um aparelho antes da confirmação perde dados.

### A4. ALTO — FR-16: o "limite de timestamp" é não determinístico e viola NFR-2

FR-16 manda ordenar por `(timestamp, deviceId, id)` e, ao mesmo tempo, **limitar** o timestamp recebido "a um valor próximo do presente". "Próximo do presente" depende do relógio **do receptor no momento da importação**. Dois aparelhos que importam o mesmo evento em horários diferentes (um ao vivo, outro após dias offline) limitam de forma diferente e ordenam diferente, o que quebra a consequência seguinte do próprio FR-16 ("dois aparelhos, mesmos eventos, ordem diferente, mesmo estado") e o NFR-2. Além disso, `lastPullTs` é gravado como `max(timestamp)` dos eventos (`useSyncEngine.ts:157`), e o filtro `since` da assinatura compara isso com `created_at` do Nostr (outro relógio): um aparelho com relógio adiantado empurra `lastPullTs` para o futuro e a assinatura deixa de receber eventos.

**Correção proposta:** rejeitar na importação (quarentena, FR-15) eventos com timestamp além de `agora + Δ`; **nunca** reescrever o timestamp usado na ordenação depois de aceito; ou adotar relógio híbrido lógico. Separar o cursor do pull (tempo do relay) do timestamp de domínio.

### A5. ALTO — FR-14/UJ-2: "versão mínima" e "data de corte" não são aplicáveis

O app antigo, já instalado, não tem verificação de versão mínima: ele só deixa de decifrar. Não existe canal para avisá-lo. Isso torna o corte um evento cego: o aparelho que não atualizou perde o sync sem aviso e, pior, continua escrevendo XOR sob a chave fraca. O PRD marca isso só como "escolha de risco a confirmar" (NOTE FOR PM). Sem um mecanismo de aviso (um evento de "versão mínima" lido pelo aparelho antigo exige que o aparelho antigo já saiba lê-lo, o que ele não sabe), a consequência testável "depois do corte o XOR deixa de ser escrito e lido" só testa o aparelho novo. Também falta o que fazer com `schemaVersion` de FR-17: se FR-17 chegar depois de FR-14, os aparelhos antigos descartam silenciosamente os eventos novos (o parse em `parseSyncPayload` aceita qualquer coisa e o import não valida; ver FR-15).

**Correção proposta:** fixar data e versão mínima **no PRD** (ou torná-las critério de saída com dono e data), e incluir o aviso no app novo ("este aparelho está desatualizado") como FR; ordenar FR-15 e FR-17 **antes** de FR-14.

### A6. ALTO — Ordem de entrega: dependências invertidas

Os blocos são entregues em ordem A..G, mas:

- **FR-3 depende de FR-20** (o próprio FR-3 cita "além do baseline (FR-20)"), e FR-20 está no último bloco. Hoje há 25 falhas; "nenhuma falha **nova** além do baseline" exige o baseline congelado antes do primeiro salto de SDK. Os 6 arquivos incluem `gamification` e `parsers`, que FR-19 também toca.
- **FR-21 depende de FR-20** (declarado); mas o FR-3 precisa de CI de lint/teste para "verde" ser significativo. O gate (FR-21) deveria vir **antes** do FR-3 e dos blocos C/D/E, para que o Expo 55→57 e a troca de cifra rodem sob o gate.
- **FR-8 depende de FR-12, FR-13 e FR-18** (chaves só com "cifra real"), e FR-11 depende de FR-8; mas C vem antes de D. FR-8 está em C e FR-12 em D: a ordem escrita contradiz a dependência declarada no próprio FR-8.
- **FR-3 muda o ambiente de todos os demais** (RN 0.81→0.85, React 19.2, expo-router, Tamagui, reanimated, `patch-package`, `react-native-google-signin`, Firebase, vision-camera). Qualquer trabalho de bloco C/D/E feito antes do FR-3 é testado em um ambiente que não vai existir. O PRD também não decide se o FR-3 vem antes ou depois de FR-4/FR-22 (o login do Google depende da lib `@react-native-google-signin`, que está na lista de "reavaliar"). O FR-1 publica sobre SDK 54, o que é bom, mas o FR-1 "regressão em Android 16 real" precisa repetir no fim do FR-3 (o PRD só repete "fluxos de FR-1", sem dizer em qual aparelho).
- **FR-4 e FR-22 se atravessam.** A árvore de trabalho já remove o `client_secret` do código e dos workflows (diff de `build-android.yml`, `GoogleDriveService.ts`, novo `GoogleNativeAuth.ts`), ou seja, o "app não contém client_secret" do FR-4 já está feito na árvore de trabalho e não commitado, mas o FR-4 pede Credential Manager/`AuthorizationClient`, e o código novo ainda usa `GoogleSignin.getTokens()` (a API legada; `useGoogleDriveBackup.ts:81`). O PRD não diz qual dos dois é o trabalho restante, e o addendum D diz "getTokens() agora, Credential Manager depois".

**Correção proposta:** nova ordem: FR-20 → FR-21 → FR-1 → FR-5 → FR-22 → FR-2 → FR-15/16/17 → FR-12/13 + FR-14 → FR-9/10 → FR-19 → FR-18 → FR-3 (em saltos) → FR-4 → FR-8 → FR-11. Ou, se o dono quiser o FR-3 cedo, congelar blocos C/D/E até ele terminar.

### A7. ALTO — FR-3: FR do tamanho de um projeto, com teste que não prova nada

- Três saltos de SDK, mais codemod, mais Tamagui `2.0.0-rc.26` (pré-release), mais 4 patches, mais "medir memória" sem limite. Cada salto é uma story-épica. O critério "verificação manual dos fluxos de FR-1" não é automatizado e não tem aparelho nem roteiro definido.
- "O consumo de memória é medido antes de concluir o SDK 56" não tem limite, método nem aparelho. É um teste que passa sempre. Definir limite (por exemplo, "pico de memória na tela X no aparelho Y não excede o do SDK 54 em Z%") ou remover.
- "Nenhum import direto de `@react-navigation/*` sobra" é verificável por busca textual, mas o PRD não diz se pacotes de terceiros que o importam (Tamagui, bibliotecas de UI) são aceitos.
- O addendum afirma "SDK 56 recomenda ir ao 57" por regressão de memória. Se o 56 tem regressão conhecida, pousar em 56 como degrau intermediário é o único passo que o PRD manda medir. Permitir pular 56 (se suportado) elimina o risco.
- O SDK 57 é "estável desde 30/06/2026" e o 58 já em beta: é um alvo que envelhece durante o trabalho. Sem critério de parada, o FR-3 vira esteira contínua.
- **Risco não nomeado:** a atualização pode forçar nova versão mínima de Android ou de Play Services (`minSdkVersion` está "fora do escopo", mas o SDK 57 pode exigir mais). Isso exclui aparelhos de usuários.

**Correção proposta:** dividir em FR-3a/3b/3c, um por salto, cada um com critério de saída automatizado (build, doctor, vitest dentro do baseline, smoke script) e aparelho de teste nomeado; limite numérico para memória; aceitar parar em 56 ou 57.

### A8. MÉDIO — FR-10: reset e restauração dependem de uma autenticação que não existe

- `resetApp` e `restoreFromBackup` apagam o log local, mas `pushMyEvents` faz `if (myEvents.length === 0) return;`, então nada é republicado e os lotes antigos permanecem nos relays. O FR-10 conserta isso com um "evento marcador".
- **Quem pode publicar um marcador?** A chave Nostr é derivada do código; quem conhece (ou força) o código publica um reset **que apaga os dados de todos os aparelhos do grupo**. Com o código de 30 bits (A1), isso é um ataque de destruição de dados, não só de leitura. FR-12 diz "terceiros não alteram" mas, sem A1 resolvido, a alteração é trivial. O PRD não nomeia o risco.
- **Como o marcador ordena?** Se o reset vale por `timestamp`, e o FR-16 limita timestamps (A4), um aparelho offline que lançou gastos depois do reset, mas com relógio atrasado, tem seus eventos "antes do marcador" e eles são descartados silenciosamente. Falta a regra de ordem do marcador (e o que ocorre com aparelhos que não o viram).
- "Os outros aparelhos respeitam" não diz se apagam os dados locais sem confirmação. Num app financeiro, "outro aparelho apaga tudo por um evento remoto" precisa de confirmação do usuário ou de escopo por aparelho.

**Correção proposta:** marcador só vale se assinado por chave de grupo forte (pós-A1); semântica explícita ("eventos com `id` anterior ao marcador na ordem total ficam ocultos, não apagados"); confirmação no aparelho receptor.

### A9. MÉDIO — Consequências "testáveis" sem teste ou sem limite

| FR | Consequência | Problema |
|---|---|---|
| FR-1 | "Num Android 16 real, estas telas abrem sem falha" | Sem aparelho, sem roteiro; "sem falha" não tem critério. |
| FR-1 | "publicada, ou a extensão da Play é pedida, antes de 01/11" | Incoerente: a extensão **é** o 01/11 (addendum B: "extensão até 01/11/2026"). Não existe segunda extensão no texto do próprio PRD; o §8 Q1 repete a dúvida. |
| FR-6 | "Com rede, o Evento aparece nos outros aparelhos" / "imediato" | Sem limite de latência (o pull é de 8 s e a assinatura depende de 6 relays públicos). O título diz "imediata". |
| FR-9 | "nenhum [evento em rajada] é descartado enquanto outro é importado" | O código descarta de verdade: `if (isImportingRef.current) return;` em `doSync` e na assinatura. Mas "testável" aqui exige injetar rajada e falha de relay; o PRD não prevê relay simulado, e o ambiente de teste não cobre rede. |
| FR-12 | "Um terceiro sem o código de grupo não decifra" | Por A1, quem tem a chave pública testa 2^30 códigos: o teste só passa se "terceiro" for definido como "não adivinha o código" e FR-13 já estiver feito. |
| FR-13 | "comprimento mínimo definido" | O próprio FR deixa o número em aberto; não é testável até alguém defini-lo. |
| FR-15 | "Com payload nulo, o app abre" | Bom, mas o FR não define o que o usuário vê quando a quarentena engole um gasto real (perda silenciosa de dado financeiro). Falta superfície de revisão da quarentena. |
| FR-18 | "Sem WebCrypto, o log não é persistido" | Em contexto não seguro (`http`), `crypto.subtle` não existe: o usuário web **perde tudo ao recarregar**. Isso é pior que texto puro para um app offline-first (NFR-5) e conflita com SM-C3. A web também reescreve o log inteiro (`EVENTS_BACKUP_KEY`) a cada evento: cifrar isso multiplica custo. |
| SM-3 | "100% das afirmações públicas têm verificação no código" | Não há definição de "verificação no código" para um texto ("seus dados ficam no aparelho"). Não é mensurável. |
| SM-5 | "nenhum Segredo em texto puro nos armazenamentos do app e no bundle (verificação automática)" | Não existe teste automático de armazenamento de um aparelho em execução. A regra de ESLint citada como "já existe" (NFR-1) existe só na **árvore de trabalho não commitada** (`git diff HEAD -- eslint.config.js`) e só casa `EXPO_PUBLIC_*(SECRET|PRIVATE|PASSWORD)`: uma `EXPO_PUBLIC_*_KEY` passa. |
| FR-21 | "falham se algum quebrar" | O `expo lint` passa hoje? O PRD só mediu vitest e tsc. Se o lint já falhar, o gate nasce quebrado. |

### A10. MÉDIO — Riscos que o PRD não nomeia

1. **E se o prazo de 01/11 passar?** O PRD não tem plano B. O addendum diz que o app fica "indisponível a novos usuários em aparelhos mais novos"; não quantifica, não diz se **atualizações** de usuários existentes continuam aceitas, e não diz o que isso significa para o dono (único usuário relevante) e para o "até 5 usuários". Faltam: a data real em que o AAB precisa estar **enviado** (revisão da Play leva dias), o que acontece com o FR-5/FR-22 se o FR-1 escorregar (são atados ao mesmo lançamento?), e o critério de corte ("se em 25/10 o FR-1 não passar no aparelho Android 16, fazemos X"). Hoje restam **17 dias** para FR-1 + FR-5 + FR-22 com o baseline de testes quebrado e sem CI de gate.
2. **FR-22 (revogar o segredo) pode quebrar a base instalada.** O HEAD (`git show HEAD:src/modules/backup/infrastructure/GoogleDriveService.ts:83`) renova o token com `client_secret: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET`. Qualquer aparelho com a versão publicada usa isso para o backup no Drive. Rotacionar antes de a versão nova estar instalada em todos os aparelhos **derruba o backup do Drive** das versões antigas, sem aviso (o PRD só fala da reconexão "depois da rotação"). A ordem deve ser: publicar o app novo, aguardar adoção, **depois** revogar. O texto não dá essa ordem e o FR-22 está sob o prazo de 01/11.
3. **Superfície de ataque do sync total.** Com FR-8, o código de 6 caracteres passa a ser a chave de: dados financeiros completos, histórico de chat com IA (que o usuário permite que inclua transações, contas e notas), preferências **e** chaves de API que geram cobrança. Se o código vaza (compartilhado em mensagem, foto da tela de pareamento) ou é forçado, o dano deixa de ser "ler gastos" e passa a ser "uso de crédito de IA do dono" e "apagar o grupo" (A8). O PRD trata como `[ASSUMPTION]` de AD-6 e não registra o aumento de raio de explosão.
4. **Relays públicos como armazenamento único.** O produto promete "não perde Eventos" (FR-9) sobre 6 relays públicos de terceiros que podem rejeitar o kind 30333, limitar taxa, expirar ou desaparecer. Não há retenção garantida, não há detecção de que um lote foi purgado, e o único log durável fora do aparelho é o backup do Drive, que o FR-11 só cobre com o escopo do FR-8. Risco de produto não nomeado.
5. **Colisão de `deviceId`.** `generateDeviceId` usa `Math.random()` (`syncStorage.ts:13-15`), e o desempate de FR-16 depende de `deviceId`. Baixa probabilidade, mas é parte da ordem total.
6. **Hash de "já enviei" fraco.** `computeEventHash` é um hash de 32 bits sobre os ids; uma colisão faz o aparelho acreditar que já publicou e **nunca** publicar o evento novo. FR-9 troca a confirmação por lote, mas não exige trocar o hash.
7. **Perda do aparelho / recuperação.** Sem backup no Drive ativo e com o único aparelho perdido, o sync só tem os relays. O PRD não explica a promessa "os dados continuam seus" nessa situação.
8. **Instalações do Play sem atualização.** FR-14/UJ-2 supõem que o usuário atualiza. A Play não força atualização; com FR-5 dizendo coisas diferentes da política antiga embutida nas versões antigas, a política "correta" só existe nas versões novas.
9. **Obrigação legal e de loja.** O formulário Data safety (FR-5) e a política pública mudam. Falta a verificação de conformidade com a LGPD (dados financeiros pessoais em relays públicos, ainda que cifrados, e sem como apagar: o FR-10 diz "marcador", não apagamento). O PRD admite que "os Eventos podem continuar nos relays" mas não avalia isso como risco regulatório/promessa de "excluir dados".

### A11. BAIXO — Imprecisões e lacunas editoriais

- §1 diz que o app "não registra dados em servidor", mas há `server/` no repositório, Firebase (`google-services.json`, `@react-native-firebase/*`, análise/telemetria) e Sentry. A frase "não os registra em servidor" e o SM-C2 ("não ampliar a telemetria") não mencionam o que já existe; o FR-5/NFR-6 exige que toda afirmação seja verificável no código, e esta não passa.
- §9 declara a suposição de FR-5 sobre `PLAY_STORE_LISTING.md` igual ao publicado, mas o FR-5 já marca consequências "removida da descrição da loja" como testáveis: sem acesso ao texto publicado, não há como testar.
- Glossário define "Segredo" sem o token OAuth do ChatGPT nem a chave de dispositivo do backup, que existem hoje.
- FR-17 pede "`profileId` futuro sem reescrever o log" mas §5 exclui perfis; é trabalho especulativo sem teste definido.
- Todas as métricas (§7) são `[ASSUMPTION]`; SM-2 usa três aparelhos reais incluindo navegador, sem dizer se é teste manual de uma vez ou repetido.
- O PRD diz "Willian" como dono e usuário principal, e usa o e-mail só para identificação; não há papel de aprovação nomeado para as decisões abertas do §8 (nove perguntas, três delas bloqueiam FR-8, FR-14 e FR-4).

---

## Resumo de dependências declaradas e as que faltam

| FR | Depende de (declarado) | Depende de (descoberto) |
|---|---|---|
| FR-3 | FR-20 (baseline) | FR-21; define o ambiente de tudo |
| FR-8 | FR-12 | FR-13, FR-18 (web), reescrita do armazenamento de chaves, pull incremental (FR-9) |
| FR-11 | FR-8 | |
| FR-12 | | FR-13 (sem isso a cifra é decorativa) |
| FR-14 | | FR-13 contradiz "sem repareamento"; FR-15 e FR-17 devem vir antes |
| FR-7 | | FR-19 (mecanismo único de efeitos) |
| FR-10 | | FR-12/13 (autenticação do marcador), FR-16 (ordem) |
| FR-21 | FR-20 | passar `expo lint` hoje |
| FR-22 | | publicação e adoção do app novo antes de revogar |

## Perguntas que o dono precisa responder antes dos épicos

1. O sync de chaves de API é mesmo desejado, dado que a web não tem armazenamento seguro hoje e o esquema local usa uma constante? Se sim, só nativo e só após rotação de chave?
2. Aceita rotação de chave de grupo (reparear uma vez, com ajuda do app) em troca de segurança real, ou o requisito "nenhum repareamento" é inegociável (e então a segurança do sync não melhora)?
3. Qual é o plano se o FR-1 não passar em Android 16 real até 25/10?
4. A revogação do segredo do Google acontece depois que todos os aparelhos estiverem na versão nova?
5. O Drive é o único backup durável fora dos relays? Se sim, o FR-11 deveria ser tão prioritário quanto o FR-9.
