---
title: 'DOMUS — Segurança e Atualização'
status: final
created: '2026-10-15'
updated: '2026-10-16'
---

# PRD: DOMUS — Segurança e Atualização
*Título provisório — confirmar.*

## 0. Finalidade do documento

Este PRD é para o dono do produto (Willian) e para os fluxos seguintes do BMad (arquitetura, épicos e stories). O Glossário (§3) fixa o vocabulário: FRs, jornadas e métricas usam os termos exatamente como definidos. As features são agrupadas, com os FRs numerados globalmente dentro delas, e cada suposição aparece como `[ASSUMPTION]` no texto e no índice (§9).

Ele se apoia em documentos que já existem e não os duplica: o **spine de arquitetura** (`architecture/architecture-DOMUS-2026-10-15/ARCHITECTURE-SPINE.md`, decisões `AD-n`) e as **revisões** da mesma pasta (`reviews/`). O spine fixa as invariantes técnicas; este PRD diz **o que** precisa existir e **por quê**. A profundidade técnica, as fontes e as alternativas descartadas ficam em `addendum.md`. A **ordem de entrega** (que difere da ordem dos blocos) está em §6.3.

## 1. Visão

O DOMUS transforma a gestão do dinheiro em hábito: a gamificação (XP, streaks, conquistas) sobre a regra 50/30/20 leva a pessoa a poupar e investir. Os dados financeiros ficam no aparelho: o app não os registra em servidor, e quando algo precisa sair do aparelho (sync entre aparelhos, backup, IA) é sempre por ação e com ciência da pessoa. É *mobile first* e sincroniza entre aparelhos — celular, tablet e navegador no PC.

**Por que agora.** O app já está em produção na Play Store, com poucos usuários ativos (até 5) e o dono como usuário principal. Cinco coisas pedem ação agora: a Play exige *target API* 36 desde 31/08/2026 (a data estendida é 01/11/2026); o Node 20 da CI está fora de suporte; o Expo SDK 54 está três versões atrás; o login do Google usa uma API legada deprecada; e a promessa pública de privacidade do app diz coisas que o código não cumpre. Esta iniciativa existe para tornar a promessa de privacidade verdadeira e manter o app publicável e sustentável.

## 2. Usuário-alvo

### 2.1 Jobs To Be Done
- Controlar as finanças e **aprender** como fazer isso, de forma prática, dinâmica e gamificada.
- Sair satisfeito com o retorno financeiro e ter dinheiro extra para gastar com o que gosta.
- Comprar o que realmente importa, usando a lista de compras, em vez de gastar sem controle.
- Ter um controle **mais preciso que o de outras plataformas**: separar por item o que o mercado joga em "necessidade" (salgadinho, refrigerante, doce, cerveja), com OCR e leitura da NF-e.
- Confiar que os dados continuam seus, em qualquer aparelho, mesmo se um estiver offline.

### 2.2 Não-usuários (v1)
- Quem precisa de **perfil de empresa** ou de vários perfis por pessoa (fica para depois; ver §5).
- Quem usa **iOS** (ver §5).

### 2.3 Jornadas-chave

- **UJ-1. Willian lança um gasto no celular e o vê no tablet e no PC.**
  - **Persona + contexto:** Willian, dono e usuário principal do DOMUS, usa o app no celular, no tablet e no navegador do PC.
  - **Estado de entrada:** os três aparelhos estão no mesmo Grupo de sync.
  - **Caminho:** ele lança um gasto no celular; o tablet e o navegador mostram o gasto na hora; depois ele desliga o Wi-Fi do tablet e lança outro gasto nele.
  - **Clímax:** ao reconectar, o tablet sincroniza sozinho e os três mostram os mesmos gastos, sem duplicar.
  - **Resolução:** nenhum aparelho reenvia de volta o que acabou de receber.
  - **Edge case:** o sync anterior entrava em **loop**: o dado importado voltava para os outros aparelhos e ficava circulando. Isso não pode voltar a acontecer.

- **UJ-2. Willian atualiza o celular e o tablet continua na versão antiga.**
  - **Persona + contexto:** Willian atualiza o app no celular antes de atualizar o tablet.
  - **Estado de entrada:** celular e tablet estão no Grupo antigo.
  - **Caminho:** o celular, já na versão nova, continua no Grupo antigo e cria em paralelo um Grupo forte; Willian lança um gasto, e o tablet (versão antiga) o mostra, sem repareamento e sem erro. Mais tarde, ele atualiza o tablet e migra os dois aparelhos para o Grupo forte, pareando por QR.
  - **Clímax:** depois da migração, os dois sincronizam pelo Grupo forte.
  - **Resolução:** no corte da janela de convivência, o Grupo antigo é desligado.
  - **Edge case:** se o tablet não for atualizado até o corte, ele para de sincronizar e mostra uma mensagem pedindo para atualizar.

## 3. Glossário

- **Evento** — fato imutável e identificado (`id`, tipo, payload, `timestamp`, `deviceId`) que descreve algo que aconteceu no app. É a unidade de sync.
- **Log de eventos** — sequência de todos os Eventos de um aparelho. O estado do app é sempre o resultado de reproduzi-lo.
- **Replay** — reconstruir o estado do app aplicando o Log de eventos em ordem.
- **Aparelho** — uma instalação do app: celular, tablet ou navegador. Tem um `deviceId`. **Aparelho nativo** é celular ou tablet (tem Keystore); o navegador não é nativo.
- **Grupo de sync** — conjunto de Aparelhos que compartilham a mesma identidade de grupo. Pode ser **Grupo antigo** ou **Grupo forte**.
- **Grupo antigo** — Grupo de sync atual: código de 6 caracteres (cerca de 30 bits), Eventos cifrados com XOR. Quebrável por força bruta offline.
- **Grupo forte** — Grupo de sync novo: **Segredo de grupo** aleatório de pelo menos 128 bits e Eventos com cifra autenticada.
- **Segredo de grupo** — segredo aleatório do Grupo forte, de onde derivam as chaves do sync. Pareia-se por QR ou colagem, não por digitação curta.
- **Janela de convivência** — período em que a versão nova mantém o Grupo antigo e o Grupo forte ao mesmo tempo.
- **Relay** — servidor público Nostr por onde os Eventos cifrados passam. O DOMUS não opera relays.
- **Eco** (ou **loop**) — Evento importado de outro Aparelho que é republicado, voltando a circular.
- **Quarentena** — separar um Evento inválido ou desconhecido para que o Replay continue sem ele; pode ser reprocessado depois.
- **Segredo** — dado que não pode ser lido por terceiros: Segredo de grupo, código do Grupo antigo, chave de API de IA ou OCR, token do Google, senha de backup.
- **Versão mínima** — menor versão do app que o Grupo de sync aceita depois do corte da Janela de convivência.
- **Target API** — nível da API do Android que o app declara mirar; a Play exige o nível 36.
- **Perfil** — identidade financeira separada dentro do app (pessoa ou empresa); ainda não existe.

## 4. Features

*Os FRs usam numeração global. A ordem dos blocos agrupa por tema; a **ordem de entrega** é a de §6.3. O FR-1 vem primeiro por decisão do dono.*

### 4.1 A. Conformidade Play e plataforma

**Descrição:** o app precisa continuar publicável na Play e rodar em ferramentas com suporte. O `targetSdkVersion` do app é 35; a Play exige 36 para novos apps e atualizações desde 31/08/2026, e 01/11/2026 já é a data estendida, sem nova prorrogação conhecida. O Expo SDK 54 já mira a API 36 por padrão (o `app.json` do DOMUS sobrescreve com 35), então o primeiro passo é pequeno, mas muda o comportamento no Android 16.

**Requisitos funcionais:**

#### FR-1: Subir o target API para 36
O dono pode publicar uma atualização do app na Play com *target API* 36.

**Consequências (testáveis):**
- `app.json` declara `targetSdkVersion` 36 e `compileSdkVersion` igual ou maior que 36 em `expo-build-properties`.
- O build de release gera um AAB que o Play Console aceita sem aviso de *target API*.
- Num aparelho Android 16 do dono, estas telas abrem sem falha: abas principais, introdução por tela, câmera/OCR, backup, sync.
- O conteúdo não fica sob as barras do sistema (borda a borda sempre ligada no Android 16).
- `patch-package` continua aplicando os 4 patches de `patches/`.
- O AAB é enviado até **25/10/2026** (data interna, com uma semana de folga). Se o teste no Android 16 reprovar, o dono decide entre corrigir até 01/11 ou aceitar a perda de disponibilidade para novos usuários em aparelhos mais novos.

**Fora do escopo:** mudar o `minSdkVersion`.

#### FR-2: Node em versão com suporte
O dono e a CI usam uma versão de Node com suporte.

**Consequências (testáveis):**
- Os workflows do **GitHub Actions** e do **EAS** usam Node 24 (ou 22) `[ASSUMPTION]`. O GitLab CI é legado (AD-11) e não é atualizado.
- O repositório declara a versão (`.nvmrc` e `engines` em `package.json`).
- Os builds do GitHub Actions e do EAS ficam verdes com essa versão.

#### FR-3: Atualizar o Expo SDK de 54 para 57
O dono pode usar o Expo SDK 57 (estável desde 30/06/2026), em **três saltos independentes**: 3a (54→55), 3b (55→56) e 3c (56→57). Cada salto é entregue e validado antes do próximo.

**Consequências (testáveis):**
- Depois de cada salto: `expo-doctor` sem erro, `npx vitest run` sem falha, build Android de release verde e verificação manual dos fluxos do FR-1 num aparelho Android 16 do dono.
- No salto 3b, o codemod do `expo-router` (desacoplado do `react-navigation`) é aplicado e nenhum import direto de `@react-navigation/*` sobra.
- Os 4 patches de `patches/` e a Tamagui (hoje `2.0.0-rc.26`) são reavaliados em cada salto: cada um é removido, atualizado ou mantido com motivo registrado.
- O pico de memória com Hermes e `react-native-reanimated` é medido no SDK 54 e depois de cada salto; um aumento acima de 20% bloqueia o salto até análise `[ASSUMPTION]`.
- Depende de FR-20 (baseline de testes verde).

**Fora do escopo:** o SDK 58, ainda em beta.

#### FR-29: Teclado nunca cobre o campo
*Incluído pela Sprint Change Proposal de 20/10/2026 (`sprint-change-proposal-2026-10-20-teclado.md`).*

O usuário digita em qualquer campo do app vendo o campo e o botão de confirmar.

**Consequências (testáveis):**
- Em toda tela, modal e bottom sheet, ao focar um campo, o conteúdo sobe ou rola até o campo ficar visível acima do teclado, com folga mínima de 8 dp.
- O botão principal do formulário (Salvar, Adicionar, Confirmar) fica alcançável com o teclado aberto, rolando se preciso.
- Ao fechar o teclado, a tela volta à posição original, sem espaço sobrando.
- Um só sistema de teclado no app (`react-native-keyboard-controller`, com `KeyboardProvider` na raiz); o `react-native-avoid-softinput` sai.
- Vale no Android 16 com edge-to-edge e no navegador.

#### FR-4: Login do Google com API moderna
O usuário conecta o Google Drive sem depender da API legada de login (deprecada, com remoção anunciada e sem data).

**Consequências (testáveis):**
- A autenticação usa o Credential Manager e a autorização do Drive usa o `AuthorizationClient`.
- O app não contém `client_secret` do Google.
- O backup no Drive funciona num Android real, depois de uma reconexão única que o app explica ao usuário.
- `[ASSUMPTION]` O custo e a licença da API "Universal" da biblioteca `@react-native-google-signin` não foram confirmados; se forem pagos, avaliar outra biblioteca.

**Notas:** `[NOTE FOR PM]` O login atual por `getTokens()` usa a API legada; funciona hoje, mas é dívida.

### 4.2 B. Verdade na privacidade

**Descrição:** a descrição da loja e a política de privacidade dentro do app afirmam o que o código não faz. A visão do produto é "não registra seus dados e tudo com ciência"; um texto falso ameaça isso e a conformidade com o Play ("Data safety").

#### FR-5: Textos públicos iguais ao comportamento
O usuário lê, na loja e dentro do app, só afirmações verdadeiras sobre onde os dados ficam e como são protegidos.

**Consequências (testáveis):**
- A afirmação "SQLite criptografado" é removida da descrição da loja (o banco local não é cifrado).
- A afirmação "criptografia ponta-a-ponta" no sync é removida ou trocada por descrição fiel ("cifrado com a chave do grupo") enquanto o Grupo antigo existir (FR-14); só volta depois do corte e de uma verificação.
- A política dentro do app (`app/privacy-policy.tsx`) descreve o sync por **relays Nostr**, não por WebRTC.
- A política explica o que acontece com os dados ao excluir o app: os Eventos já publicados **continuam nos relays**, e o FR-10 só impede que voltem ao app.
- O formulário *Data safety* do Play Console lista todos os fluxos que enviam dados para fora do aparelho: relays Nostr, Google Drive, provedores de IA e OCR de terceiros, Firebase (Analytics, Crashlytics e Performance) e anúncios.
- Tudo isso é publicado junto com o FR-1, até **25/10/2026**.
- `[ASSUMPTION]` O `PLAY_STORE_LISTING.md` do repositório é igual ao texto publicado na loja.

### 4.3 C. Sync completo e sem eco

**Descrição:** o sync deve ser rápido quando há rede, reconciliar sozinho depois de ficar offline, não duplicar nada, nunca entrar em eco, e levar **todos** os dados do usuário que fizerem sentido. Hoje o sync leva só o log de eventos; configurações e chaves de API vivem fora dele. Realiza UJ-1.

#### FR-6: Propagação rápida, offline e sem duplicar
O usuário vê um dado criado em um Aparelho aparecer nos outros do Grupo de sync sem ação manual. Realiza UJ-1.

**Consequências (testáveis):**
- Com rede, o Evento aparece nos outros Aparelhos em até 15 segundos, inclusive no navegador `[ASSUMPTION]` (o pull atual roda a cada 8 segundos).
- Um Aparelho que ficou offline reconcilia sozinho ao reconectar.
- O mesmo Evento chegando duas vezes (de dois relays, ou por assinatura e por pull) é aplicado uma vez.

#### FR-7: Nunca republicar o que veio do grupo
Um Aparelho nunca republica um Evento que recebeu do Grupo de sync, nem gera efeito de gamificação por ele. Realiza UJ-1.

**Consequências (testáveis):**
- Num teste com três Aparelhos trocando N Eventos, o número total de publicações é N (uma por Evento de origem, por Grupo) e **não cresce** com o tempo.
- Importar um Evento de outro Aparelho não emite XP nem conquista.
- Um Evento criado localmente (inclusive de um backup restaurado no próprio aparelho) **é** publicado, mesmo com `deviceId` antigo, se o grupo ainda não o tem.
- Durante a Janela de convivência, a publicação do mesmo Evento no Grupo antigo e no Grupo forte não é eco: o limite de uma publicação por Evento vale **por Grupo**.

#### FR-8: Sincronizar os dados do usuário
O usuário vê os mesmos dados em todos os Aparelhos: configurações, itens da lista de desejo, gastos, troféus já ganhos e a preferência de backup do Drive. O histórico de chat da IA **não** sincroniza (decisão do dono). Entregue em três etapas: 8a, 8b e 8c.

**FR-8a — Inventário e classificação.** **Consequências (testáveis):**
- Existe um documento que lista cada dado guardado pelo app fora do log (configurações, chaves de API, senha do auto-backup, preferências) e dá a cada um uma classe: **vira Evento**, **usa outro canal**, **não sincroniza** ou **é Segredo**.
- Nenhum dado fica sem classe.

**FR-8b — Preferências como Eventos.** **Consequências (testáveis):**
- Os dados classificados como "vira Evento" de baixo risco (tema, som, modo de apoio, configuração de IA e de OCR **sem a chave**) passam a ser Eventos e aparecem iguais em todos os Aparelhos; em conflito de preferência, vale o último pela ordem do FR-16.
- A preferência religiosa ("é católico"), por ser dado sensível, só sincroniza **depois** do Grupo forte (FR-13) e nunca pelo Grupo antigo.
- A preferência "backup do Drive ativo" e o e-mail sincronizam; cada Aparelho faz o **próprio login** do Google (tokens são por Aparelho).
- Os troféus já ganhos sincronizam como Eventos existentes; as regras de sorteio ficam fora (§5).

**FR-8c — Segredos opt-in, só entre aparelhos nativos.** **Consequências (testáveis):**
- As chaves de IA e OCR só sincronizam **entre Aparelhos nativos**, com opt-in explícito, e **depois** do FR-13 (Grupo forte).
- No navegador, a pessoa informa a chave na sessão; o navegador não recebe chaves por sync.
- Sem opt-in, cada Aparelho pede a sua chave.
- Essa sincronização é exceção documentada à regra "nenhum segredo em evento" do AD-6 e exige atualizar o spine.

#### FR-9: Envio confiável, leitura incremental
O usuário não perde Eventos porque um relay falhou, e o sync não gasta rede e bateria à toa.

**Consequências (testáveis):**
- O envio só é dado como feito para um lote confirmado por pelo menos um relay; os demais são reenviados.
- A leitura do histórico pagina e é **incremental** (só o que é novo desde a última leitura), sem o teto de 500 por relay e sem reler tudo a cada 8 segundos.
- A publicação reenvia só os lotes que mudaram.
- Os Eventos que chegam em rajada entram numa fila; nenhum é descartado enquanto outro está sendo importado.

#### FR-10: Reset e restauração sem ressuscitar dados
O usuário que reseta o app ou restaura um backup não vê dados antigos voltarem dos relays.

**Consequências (testáveis):**
- `resetApp` e `restoreFromBackup` publicam um Evento marcador **assinado com a chave do Grupo forte**; marcadores de um Grupo antigo não são aceitos para apagar dados.
- Um Aparelho que recebe um marcador **pede confirmação ao usuário** antes de apagar dados locais.
- Depois de um reset, o pull seguinte não recria os Eventos apagados nesse Aparelho.
- O reset não apaga os Eventos já publicados nos relays; a política (FR-5) diz isso.
- Eventos criados offline por outro Aparelho, concorrentes ao marcador, são preservados e voltam ao grupo.

#### FR-11: Mesmo escopo no Google Drive
O usuário que ativa o Drive tem no backup o mesmo conjunto de dados do sync (FR-8).

**Consequências (testáveis):**
- Um backup restaurado num Aparelho novo reproduz o estado dos outros.
- Chaves de API entram no backup só pelo mesmo caminho de opt-in do FR-8c.
- Depende de FR-8.

### 4.4 D. Sigilo do sync

**Descrição:** hoje os Eventos vão aos relays públicos cifrados com XOR e chaves derivadas de um código de 6 caracteres. A chave pública Nostr, derivada do mesmo código, vai **em claro** nos relays; quem a vê testa os cerca de 1 bilhão de códigos possíveis até acertar e obtém a chave de cifra. Por isso, trocar XOR por AES-GCM **não protege** enquanto o segredo do grupo for curto: o sigilo depende de um segredo forte. O histórico já publicado em XOR continua legível por esse ataque; é risco residual declarado.

#### FR-12: Cifra autenticada no Grupo forte
O usuário tem os Eventos do Grupo forte protegidos por cifra autenticada, de modo que terceiros nos relays não os leiam nem os alterem.

**Consequências (testáveis):**
- Os Eventos do Grupo forte são cifrados com cifra autenticada (por exemplo AES-GCM) com chave de 256 bits derivada do Segredo de grupo.
- Um Evento adulterado nos relays é detectado e rejeitado.
- Um terceiro sem o Segredo de grupo não decifra um Evento publicado.
- O histórico publicado antes em XOR é declarado como risco residual no `addendum.md`.
- Depende de FR-13.

#### FR-13: Grupo forte e segredo de grupo
O usuário cria e pareia um Grupo forte com um segredo que não é adivinhável.

**Consequências (testáveis):**
- O Segredo de grupo tem pelo menos 128 bits, gerado com aleatoriedade criptográfica.
- O pareamento é por QR ou colagem; o campo de código deixa de limitar a 8 caracteres.
- O app não cria nem aceita Grupo novo com código de 6 caracteres.
- A chave pública do Nostr do Grupo forte não permite deduzir o segredo (o segredo não é derivável de nada público).

#### FR-14: Conviver com a versão antiga, depois cortar
O usuário mantém o sync entre versão nova e antiga durante uma janela curta, e depois o Grupo antigo é desligado. Realiza UJ-2.

**Consequências (testáveis):**
- Durante a Janela de convivência, a versão nova mantém o Grupo antigo (leitura e escrita) e cria em paralelo o Grupo forte; o usuário migra quando quiser, com confirmação.
- Existe uma **versão mínima** e uma **data de corte**; depois dela, o Grupo antigo deixa de ser lido e escrito, e o app mostra uma mensagem a quem estiver atrasado.
- A versão antiga é avisada do corte por um Evento de aviso no Grupo antigo, publicado antes do corte, que ela pode exibir se suportar.
- Enquanto o Grupo antigo existir, nenhum texto público afirma "ponta-a-ponta" (FR-5).
- O corte acontece 14 dias depois da publicação da versão com o FR-13 (decisão do dono). O tablet esquecido por meses não perde dado: o log local dele é republicado no Grupo forte quando ele atualizar e parear.

**Notas:** `[NOTE FOR PM]` A janela mantém o formato fraco ativo por um tempo; a duração é uma escolha de risco.

### 4.5 E. Log robusto

#### FR-15: Importar e reproduzir sem quebrar
O usuário abre o app e ele funciona, mesmo que um Evento recebido seja inválido ou desconhecido.

**Consequências (testáveis):**
- A importação valida o envelope e o tipo do Evento antes de gravar.
- O Replay isola cada Evento: um inválido vai para Quarentena e os demais são aplicados.
- Um Evento de tipo desconhecido (de versão mais nova) vai para Quarentena **sem ser descartado** e é reprocessado depois de uma atualização.
- Com um Evento de payload nulo no log, o app abre, e o Evento fica registrado como Quarentena.

#### FR-16: Ordem de replay igual em todo Aparelho
O usuário vê o mesmo estado em todos os Aparelhos, para o mesmo conjunto de Eventos.

**Consequências (testáveis):**
- O Replay ordena por `(timestamp, deviceId, id)`, tanto em memória quanto no SQLite.
- Na importação, um Evento com `timestamp` acima de `agora + Δ` vai para Quarentena; depois de aceito, o `timestamp` **nunca é reescrito** `[ASSUMPTION]` (Δ = 24 horas).
- O cursor de leitura dos relays é separado do `timestamp` de domínio do Evento.
- Um Evento de edição ou exclusão que chega antes do seu alvo fica **pendente** e é aplicado quando o alvo chega; a exclusão não "ressuscita" a transação.
- Dois Aparelhos com os mesmos Eventos em ordem de chegada diferente produzem o mesmo estado.

#### FR-17: Evoluir o formato sem quebrar versões publicadas
O dono pode mudar o formato de um Evento sem invalidar os já publicados.

**Consequências (testáveis):**
- Um campo obrigatório novo exige `schemaVersion` no payload e uma conversão no reducer.
- Campos novos são opcionais por padrão.
- O envelope e os payloads comportam um `profileId` futuro sem reescrever o log (ver §5).

#### FR-18: Log da web cifrado
O usuário do navegador tem o log de Eventos cifrado no armazenamento local.

**Consequências (testáveis):**
- O log guardado em `AsyncStorage` na web passa por `webSecrets` (AES-GCM), sem texto puro.
- Sem WebCrypto, o log não é persistido em texto puro.

### 4.6 F. Gamificação consistente

#### FR-19: Efeitos de gamificação sem duplicar entre Aparelhos
O usuário não ganha XP, conquista, aporte, recuperação ou categoria duas vezes por ter dois Aparelhos ou por parcelamento.

**Consequências (testáveis):**
- Os Eventos emitidos por efeitos (XP, conquistas, aporte de poupança pendente, recuperação de XP, categorias padrão) têm `id` determinístico derivado do fato.
- Um efeito só roda depois do primeiro pull concluído, quando há Grupo de sync.
- Dois Aparelhos que cruzam a mesma conquista offline resultam em uma só entrada e um só pagamento de XP depois do sync.
- O aporte pendente de um período existe uma vez no grupo, e uma transação pendente não concede XP até ser confirmada.
- Num parcelamento de N parcelas lançado num só aparelho, cada conquista é emitida uma vez.
- Categorias padrão e criadas na hora não duplicam entre Aparelhos.

**Fora do escopo:** troféus (ver §5). A regra do troféu colecionável única por pessoa fica registrada no `addendum.md` como insumo da reformulação.

#### FR-24: Nível e streak sem estado absoluto
O usuário vê o mesmo nível e o mesmo streak em todos os Aparelhos, e criar e excluir a mesma transação não muda o XP.

**Consequências (testáveis):**
- Nível e streak são derivados do log; nenhum Evento de gamificação grava valor absoluto de nível ou streak.
- Existe uma só fonte do nível para a interface.
- Criar uma transação e depois excluí-la deixa o XP igual ao de antes.
- Dois Aparelhos com valores diferentes de streak, depois do sync, mostram o mesmo valor.

### 4.7 G. Qualidade e operação

#### FR-20: Baseline de testes verde
O dono tem uma suíte de testes sem falhas conhecidas.

**Consequências (testáveis):**
- Os 25 testes que hoje falham (6 arquivos: `integration`, `ai/adapters`, `gamification`, `parsers/importInvoice`, `parsers/sefazParser`, `season`) são corrigidos ou isolados com motivo registrado.
- `npx vitest run` termina sem falha.

#### FR-21: Gate de lint e testes na CI
O dono não consegue integrar uma mudança que quebra lint ou testes.

**Consequências (testáveis):**
- Os workflows do GitHub Actions rodam `npx expo lint` e `npx vitest run` e falham se algum quebrar.
- `[ASSUMPTION]` O `tsc --noEmit` entra no gate só depois que o baseline de erros de tipo for zerado (hoje há centenas de linhas).
- O baseline de lint é zerado antes do gate (hoje `npx eslint .` tem 190 erros em 100 arquivos: 173 em `scripts/`, 3 em pastas de ferramentas de agente e 15 em `src/` e `app/`, 7 deles hooks chamados condicionalmente).
- Depende de FR-20.

#### FR-22: Revogar o segredo antigo do Google com segurança
O dono elimina o `client_secret` que foi publicado em builds anteriores, sem derrubar o Drive de quem usa versão antiga.

**Consequências (testáveis):**
- O app com o FR-1 e sem `client_secret` é publicado **antes** de qualquer revogação.
- O segredo antigo só é revogado ou rotacionado no Google Cloud Console depois que as versões sem ele estiverem instaladas nos Aparelhos do dono e dos usuários ativos; versões antigas deixam de renovar o token do Drive, e isso é comunicado.
- O login do Drive e um backup completo funcionam num Android real, depois da rotação.

#### FR-23: Segredos existentes em armazenamento seguro
O usuário tem seus Segredos guardados em armazenamento seguro, sem exceção silenciosa.

**Consequências (testáveis):**
- No nativo, a chave de OCR (hoje em `AsyncStorage` em texto puro) e a senha do auto-backup (idem) passam para `expo-secure-store`, com migração do valor atual.
- Na web, esses segredos passam por `webSecrets`.
- A queda silenciosa do `SecureStore` para `AsyncStorage` no código do Grupo antigo é removida, ou o app avisa o usuário `[ASSUMPTION]`.
- O inventário do FR-8a não deixa Segredo em `AsyncStorage` em texto puro.

### 4.8 H. Recursos de uso

*Incluído pela Sprint Change Proposal de 16/10/2026 (`sprint-change-proposal-2026-10-16.md`).*

#### FR-25: Tooltips com glossário financeiro
O usuário toca num ícone de informação e lê a explicação de um termo financeiro sem sair da tela.

**Consequências (testáveis):**
- Um glossário único (`src/constants/financialGlossary.ts`) alimenta todas as dicas.
- A dica é um balão ancorado ao ícone, que abre acima ou abaixo conforme o espaço e fecha ao tocar fora.
- Há dicas no orçamento 50/30/20, no campo de dividendo do CDB e na tela de holerites (quando o FR-26 existir).
- No chat da IA, termos do glossário citados na resposta viram atalhos "O que é…?", só com `tooltipsEnabled` ligado.
- Nenhuma dependência nova.

#### FR-26: Leitor de holerite
O usuário fotografa o holerite e acompanha a evolução do salário e dos descontos.

**Consequências (testáveis):**
- O parser extrai empresa, CNPJ, competência (`YYYY-MM`), bruto, líquido, rubricas, descontos e FGTS, sem tratar bases de cálculo como desconto, e informa confiança e avisos.
- A captura usa o Vision OCR quando há provedor com visão; senão, o OCR do aparelho.
- O usuário revisa e corrige antes de salvar e pode lançar o líquido como receita (categoria `salario`).
- O holerite é Evento (`PAYSLIP_RECORDED` / `PAYSLIP_DELETED`) com `schemaVersion`; a mesma competência do mesmo empregador substitui a leitura anterior.
- O nome do funcionário não é guardado.
- Eventos de holerite **não são publicados no Grupo antigo**; só sincronizam pelo Grupo forte (FR-13), como a preferência religiosa.
- A tela mostra o histórico, o gráfico líquido × bruto e o total por desconto.
- Depende de FR-15 e FR-17.

#### FR-27: Animação por troféu
*Revisado pela Sprint Change Proposal "Manter o Lottie" (`sprint-change-proposal-2026-10-21-lottie.md`).*

O usuário vê cada troféu com uma animação própria, ligada ao tema dele.

**Consequências (testáveis):**
- Troféu com Lottie aprovado (`APPROVED_LOTTIE`) usa o Lottie dele, no celular e na web.
- Troféu sem Lottie usa a configuração de `src/constants/trophyAnimationConfigs.ts` (categoria + ajuste por troféu), e um teste garante configuração válida para todos esses troféus.
- Em listas estáticas, o troféu aparece sem efeitos.
- O DebugTools mostra a animação de cada troféu para a aprovação individual do dono.

#### FR-28: Privacidade por escolha
*Incluído pela Sprint Change Proposal "Privacidade por escolha" (`sprint-change-proposal-2026-10-16-b.md`).*

O usuário decide cada envio de dados para fora do aparelho pela flag do recurso e sabe o que perde se não ativar.

**Consequências (testáveis):**
- Todo fluxo que envia dados para fora do aparelho tem uma flag de ativação; os que não têm (consulta de código de barras, tabela NCM, atualização de preços, ícones de lojas) ganham uma, no padrão das existentes, desligada em instalação nova.
- Para quem já usa, o que já funcionava continua ligado e o app avisa uma vez.
- A política, a tela do app e a loja dizem, para cada flag, o que é transmitido se ativada e quais benefícios se perdem se desligada.
- As fraquezas registradas na Story 1.4 (D8 a D12) são corrigidas: salt do PIN, anúncio personalizado sem consentimento, código do grupo enviado à IA, backup automático que ignora o interruptor (revisto em 16/10: o interruptor só existia em código morto, removido; o envio ao Drive depende de conectar o Drive) e exportação sem cifra sem aviso.

### 4.9 NFRs transversais

- **NFR-1 — Sem segredo exposto.** Nenhum Segredo em `AsyncStorage` em texto puro, em variável `EXPO_PUBLIC_*` ou em Evento em texto puro. Hoje é violado pelo OCR e pelo auto-backup (corrigido em FR-23). Verificação: regra de ESLint para `EXPO_PUBLIC_*` e revisão do inventário do FR-8a a cada release.
- **NFR-2 — Estado determinístico.** O mesmo conjunto de Eventos produz o mesmo estado em qualquer Aparelho.
- **NFR-3 — Replay nunca lança.** O app inicia mesmo com um log parcialmente corrompido.
- **NFR-4 — Compatibilidade retroativa.** Eventos de versões já publicadas continuam válidos, sem perda de dados.
- **NFR-5 — Offline-first.** Sync e cifra nunca bloqueiam a interface.
- **NFR-6 — Texto igual ao comportamento.** Toda afirmação pública sobre privacidade e segurança é verificável no código.
- **NFR-7 — Português do Brasil.** Todo texto de interface em pt-BR com acentuação completa.

### 4.10 Restrições e *guardrails*

- **Sem backend próprio de sync** (AD-8); os relays Nostr são públicos.
- **`packages/*` ficam puros** (sem `react`, `react-native` nem `expo`; AD-3).
- **Intocáveis:** `packages/sync`, `replit.md`, `replit.nix` e `.replit` (AD-9).
- **Pipelines canônicos:** EAS e GitHub Actions; o GitLab CI é legado (AD-11).
- **Testes:** `vi.mock("react-native")` não funciona no vitest; use `process.env.EXPO_OS` ou lógica sem `react-native`.

## 5. Não-objetivos (explícitos)

- **Perfis múltiplos e perfil de empresa.** Ficam para depois; o formato dos Eventos deve só não impedir (FR-17).
- **App iOS.** Só quando houver um aparelho iOS e verba para a loja.
- **Reformulação das regras dos troféus.** A regra do colecionável fica como insumo (§4.6). A parte visual entrou pelo FR-27: o Lottie aprovado continua, e a configuração cobre os troféus sem Lottie (decisão revista em 21/10/2026).
- **Cifrar o banco SQLite local.** Decidido corrigir o texto em vez de cifrar o banco (FR-5).
- **Interface nova do app.** Além de mensagens de reconexão, migração e privacidade, e dos recursos do FR-25 (tooltips), FR-26 (holerite) e FR-27 (animação de troféus), incluídos pela Sprint Change Proposal de 16/10/2026.
- **Backend próprio.**
- **Sincronizar o histórico de chat da IA.** O dono decidiu que não é necessário.
- **Assinatura de Eventos individuais.** A confiança vem do Segredo de grupo; só o marcador de reset é assinado (FR-10).
- **Ponto único de escrita no log** (`dispatch` contra `dispatchDomainEvent`): é decisão de arquitetura, já ratificada no spine; só o efeito observável entra em FR-19.
- **Conversão atômica de wishlist em despesa** e **arredondamento do saldo no reducer:** o FR-16 já torna a ordem de soma idêntica; o resto fica para um PRD futuro.
- **Remoção de `packages/core`, roteamento de `PERSONALITY_EVENTS`, evolução do GitLab CI, observabilidade e o `server/`:** registrados no Deferred do spine, sem requisito aqui.

## 6. Escopo e prioridade

### 6.1 Em escopo
Os FRs FR-1 a FR-29 (FR-25 a FR-28 incluídos em 16/10/2026; FR-29 em 20/10/2026). O dono definiu "o que der": não há corte fixo, só uma ordem, e o FR-1 vem primeiro.

### 6.2 Fora do escopo
Ver §5.

### 6.3 Ordem de entrega e dependências `[ASSUMPTION]`

| Ordem | FRs | Por quê |
|---|---|---|
| 1 (até 25/10) | FR-1, FR-5 | prazo da Play; FR-5 publica junto |
| 1a | FR-28 (D10, D11, D8) | correções pequenas antes do AAB de 25/10 (decisão D-A) |
| 1b | FR-25, FR-28 (restante) | sem dependência; logo depois do Epic 1 |
| 2 | FR-22 (publicação sem o segredo; revogação só depois da adoção) | depende de FR-1 já publicado |
| 3 | FR-20, FR-21 | baseline e gate antes de mudanças grandes |
| 4 | FR-2 | Node novo antes dos upgrades |
| 5 | FR-15, FR-16, FR-17 | log robusto, base do sync |
| 5b | FR-26 | depende do log robusto; sincroniza só depois de FR-13 |
| 6 | FR-13, FR-12, FR-14 | sigilo do sync, antes de sincronizar Segredos |
| 7 | FR-9, FR-10, FR-7, FR-6 | sync confiável e sem eco |
| 8 | FR-19, FR-24, FR-18, FR-23 | gamificação e segredos locais |
| 9 | FR-3a, FR-3b, FR-3c | upgrade do SDK, um salto por vez |
| 10 | FR-4 | login moderno |
| 11 | FR-8a, FR-8b, FR-8c, FR-11 | sincronizar tudo, por último, porque depende de FR-12 e FR-13 |
| 1c | FR-29 | depois do AAB de 25/10; antecipa só se a Story 1.3 achar campo coberto que impeça o uso |
| 12 | FR-27 | animação dos troféus, substituindo o Lottie |

O prazo de 01/11/2026 cobre só FR-1 e FR-5 (publicação); os demais seguem a ordem, sem data comprometida.

## 7. Métricas de sucesso `[ASSUMPTION]`

*Com poucos usuários ativos, as métricas são verificações objetivas, não números de produto.*

**Primárias**
- **SM-1:** o Play Console aceita a atualização com *target API* 36, sem aviso de política, enviada até 25/10/2026. Valida FR-1.
- **SM-2:** num teste com três Aparelhos (celular, tablet, navegador), o número de publicações é uma por Evento de origem (por Grupo) e o estado final é idêntico nos três. Valida FR-6, FR-7, FR-16, FR-24.
- **SM-3:** 100% das afirmações públicas de privacidade e segurança (loja e política) têm uma verificação no código. Valida FR-5 e NFR-6.

**Secundárias**
- **SM-4:** a CI roda lint e testes em toda mudança e bloqueia as que falham. Valida FR-20, FR-21.
- **SM-5:** a regra de ESLint contra segredo em `EXPO_PUBLIC_*` passa, e o inventário do FR-8a não lista Segredo em texto puro. Valida NFR-1, FR-23, FR-18.

**Contramétricas (não otimizar)**
- **SM-C1:** não otimizar a velocidade do sync à custa de bloquear a interface (NFR-5). Contrabalança SM-2.
- **SM-C2:** não ampliar a telemetria ou a coleta de dados para medir qualquer métrica (contraria a visão). Contrabalança SM-2 e SM-3.
- **SM-C3:** não endurecer a cifra a ponto de o usuário perder dados ao trocar de aparelho ou restaurar um backup. Contrabalança SM-5.

## 8. Perguntas em aberto

1. Qual o aparelho Android 16 de teste do FR-1 e do FR-3?
2. O texto do `PLAY_STORE_LISTING.md` é o que está publicado na loja?
3. Qual o limite Δ do `timestamp` no futuro (FR-16)? A proposta é 24 horas.
4. Qual a latência-alvo do FR-6? A proposta é 15 segundos.
5. Os relays públicos não garantem retenção dos Eventos; e dados financeiros cifrados em relays públicos têm implicação de privacidade (LGPD)? Quem avalia?
6. O `server/` (Express, `drizzle`, `pg`) entra no formulário *Data safety*? Hoje não recebe dado do app, mas existe no repositório.
7. A biblioteca "Universal" de login do Google é paga? Se for, qual a alternativa (FR-4)?
8. Node 24 ou 22 (FR-2)? A máquina do dono já usa o 24.
9. O `tsc` entra no gate de CI quando o baseline de tipos for zerado (FR-21)?
10. O perfil de empresa terá o mesmo grupo de sync ou grupos separados (FR-17)?

## 9. Índice de suposições

- §4.1 FR-2 — Node 24 (ou 22) como versão alvo.
- §4.1 FR-3 — aumento de memória acima de 20% como bloqueio.
- §4.1 FR-4 — custo e licença da API "Universal" do Google Sign-In não confirmados.
- §4.2 FR-5 — o `PLAY_STORE_LISTING.md` do repositório é igual ao publicado.
- §4.3 FR-6 — latência de 15 segundos.
- §4.5 FR-16 — Δ de 24 horas no limite de `timestamp`.
- §4.7 FR-21 — o `tsc` entra no gate só depois de zerar o baseline.
- §4.7 FR-23 — remover ou avisar na queda do `SecureStore` para `AsyncStorage`.
- §6.3 — a ordem de entrega proposta por dependência.
- §7 — todas as métricas são propostas, não confirmadas.
