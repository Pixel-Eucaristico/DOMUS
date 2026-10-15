# Reconciliação: PRD x revisões do spine (DOMUS, 2026-10-15)

Entradas: `review-adversary.md` (ADV), `review-rubric.md` (RUB), `review-versions.md` (VER); `prd.md` e `addendum.md`. Spine consultado só para checar a numeração dos AD e o Deferred. Nenhum arquivo além deste foi alterado.

Fora do escopo por decisão do dono, e por isso não contado como lacuna: troféus (ADV 2.2, 2.5, 7 parte `trophyEngine`, `SEASONAL_TROPHY_COMPLETED`), app iOS (VER 3 `build-ios`), perfis múltiplos, cifrar o SQLite, UI nova. Já entregues em código: group code em SecureStore (RUB F1), Drive nativo sem client secret via `getTokens` (RUB F1; a rotação do segredo segue em FR-22), segredos da web (`webSecrets`), regra ESLint contra `EXPO_PUBLIC_*SECRET`.

Nota de numeração: os "AD-10 e AD-11 propostos" do ADV (ids determinísticos; ponto único de commit) NÃO são os AD-10 e AD-11 do spine atual (troféu colecionável; pipelines). O PRD cita o AD-11 do spine. Ao ler "AD-10" no addendum, use o spine.

## 1. Lacunas (achado não virou FR/NFR/não-objetivo/pergunta aberta)

| # | Sev. | Origem | Achado | Situação no PRD | Recomendação |
|---|------|--------|--------|-----------------|--------------|
| L1 | critical | ADV 1 | Gamificação grava estado absoluto (`STREAK_UPDATED`, `LEVEL_UP`); duas fontes de nível (`gamification.level` x `levelInfo`); `XP_GAINED` não desfaz na exclusão; `ACHIEVEMENT_UNLOCKED` sem dedupe | FR-19 cobre só ids determinísticos e "uma só conquista". Não trata streak, nível, XP de exclusão. O addendum E lista os itens "que não entraram" e NÃO menciona este: foi descartado em silêncio. O spine (linha 49 e 188) o deixa em Deferred com o gatilho "revisitar antes de promover sync entre aparelhos", e o PRD promove exatamente isso (UJ-1, FR-6) | Entrar no PRD (ver 3.1) |
| L2 | high | ADV 3 | Evento com alvo ausente some em silêncio: `DELETED` de relógio atrasado ordena antes do `CREATED` e a transação ressuscita | FR-16 limita o `timestamp` e ordena `(timestamp, deviceId, id)`: isso dá ordem igual, não resultado correto. NFR-2 passa, o usuário vê gasto apagado voltar | Acrescentar consequência a FR-16 ou FR-15 (pendência ou ordem causal; "apagar nunca é perdido") |
| L3 | high | ADV 4, 10 | Restore em celular novo e `deviceId` novo: `getMyEvents` filtra por `deviceId`, eventos do dispositivo antigo nunca são republicados. Lote replaceable kind 30333 com posição derivada do conteúdo e `created_at` em segundos | FR-9 cobre ack, paginação e fila, não o desenho do lote nem o órfão por `deviceId`. FR-7 (nunca republicar o importado) conflita com a proposta do ADV e a nota do PM só avisa. FR-11 promete "backup restaurado reproduz o estado" sem dizer como chega ao grupo | Reescrever FR-7 como "não republicar o que veio de relay/outro aparelho e já está confirmado", e acrescentar a FR-9/FR-11 o caso restore/reinstalação e o lote |
| L4 | medium | ADV 9, RUB F3 | Evento de versão nova num aparelho antigo: tipo desconhecido é "descartado" (AD-4) e FR-15 manda quarentena | UJ-2 só trata o XOR. FR-17 só trata evolução futura. Não está dito que evento válido-porém-desconhecido NÃO pode ser perdido/apagado e deve ser reaplicado depois da atualização; FR-15 pode mandar para quarentena o que é só versão nova. Os campos CDB já publicados (`linkedCreditCardId`, `cdbDividendsTotal`, `isCdbDividend`) são o caso real | Distinguir "inválido" de "desconhecido/mais novo" em FR-15/FR-17/UJ-2 e fixar "preserva no log e reaplica" |
| L5 | medium | RUB F3 | `PERSONALITY_EVENTS` (`ARCHETYPE_UPDATED`) não é roteado em `replayAllEvents`; sem teste que percorra todos os `*_EVENTS` | FR-8 pede inventário do que está fora do log, sem citar este caso. É dado que hoje não volta no replay nem entre aparelhos | Item explícito no inventário do FR-8 (rotear ou declarar efêmero) |
| L6 | medium | RUB F5, VER 5, spine 198 | `server/` Express + drizzle/pg/Neon com `syncRoutes.ts`, sem dono, ambiente nem deploy; o PRD diz "sem backend próprio" e "o app não registra dados em servidor" | Nenhuma pergunta aberta. A pergunta de "onde o `server/` roda" só existe no spine (Deferred) | Pergunta aberta no §8: o `server/` recebe algum dado de usuário? Se sim, entra em FR-5 (verdade na privacidade); se não, registrar como não-objetivo |
| L7 | medium | VER (Firebase, AdMob no addendum C), RUB F7 | Firebase Analytics, Crashlytics e Performance e `react-native-google-mobile-ads` coletam dados fora do aparelho; provedores de IA (5) recebem texto/imagem | FR-5 audita só SQLite, E2E, WebRTC e exclusão. A visão diz "tudo com ciência"; SM-C2 trata telemetria só como contramétrica. O *Data safety* do FR-5 não nomeia estes SDKs | Acrescentar a FR-5 que política e Data safety listam Firebase, anúncios e provedores de IA |
| L8 | medium | ADV 2.1, 2.3 | Efeitos só rodam depois do primeiro pull concluído; o aporte automático pendente recebe XP e streak; preferência (`isCatholic`) decide fatos emitidos | FR-19 cobre ids determinísticos, mas não "esperar o pull antes de emitir" (id determinístico só impede o duplo depois do sync, não o duplo antes) nem XP em transação pendente | Acrescentar a FR-19 |
| L9 | low | ADV 10 | `getEventStore()` nulo: evento só em memória some no reboot. `deviceId` duplicado em dois arquivos. Overrides de debug no contexto de produção | NFR-3 cobre replay, não a falha de gravação. Ver 4 | Pergunta aberta ou deixar no spine |
| L10 | low | VER 4, 1 | Gestor de pacote canônico (`package-lock`, `yarn.lock`, pnpm no AGENTS.md); Vitest em `dependencies` | FR-2/FR-3 mandam `npx expo install` sem dizer qual lockfile manda | Uma linha em FR-2 |

## 2. Itens que virou, mas enfraquecido ou contraditório

- **NFR-2 e SM-2 (estado idêntico nos três aparelhos)** não se sustentam sem L1: streak e nível absolutos divergem por "último a chegar vence". O teste de FR-16 só cobre ordem de chegada, não derivação.
- **FR-7 x ADV 4 (envio de "todo evento não confirmado")**: a nota diz que a proposta precisa respeitar FR-7, mas FR-7 como escrito (critério = origem) proíbe o caso restore/reinstalação (L3). Contradição não resolvida.
- **FR-16 "timestamp limitado a um valor próximo do presente"**: cobre só o futuro. Relógio atrasado (o caso real do ADV 3) fica como está (L2).
- **FR-15 "quarentena"**: ver L4; pode destruir evento legítimo de versão nova se quarentena = descarte.
- **FR-19**: "uma só entrada e um só pagamento de XP" cobre conquista, mas o ADV 5 mostra N emissões da mesma conquista dentro de um laço (parcelas e recorrência usam o estado do render). Isso duplica XP num único aparelho, sem sync. FR-19 diz "sem duplicar entre Aparelhos" e não pega o caso intra-aparelho.
- **FR-18 x item "webSecrets entregue"**: o texto de FR-18 cita `webSecrets` para o log da web. Confirmar se o entregue cobre só segredos ou também o log (RUB F4); se só segredos, FR-18 continua válido, se cobre o log, FR-18 vira item já entregue e deve sair do escopo ou ser marcado como verificação.
- **FR-3**: VER dizia 2 SDKs atrás, o PRD diz 3 (SDK 57). Coerente com a pesquisa mais nova do addendum B, só registrado aqui para não parecer erro.

## 3. Os cinco pontos do review-adversary: entra ou fica fora

### 3.1 Estado absoluto da gamificação (`STREAK_UPDATED`, `LEVEL_UP`): ENTRA
Não é troféu. É derivado persistido como fato (contra AD-1), quebra NFR-2 e SM-2 e o gatilho do próprio spine disparou. Sugestão de FR (bloco F): "streak e nível são derivados do log (datas de transação e XP total), nunca gravados como valor absoluto; excluir uma transação desfaz exatamente o XP que ela concedeu; uma conquista é paga uma vez, mesmo dentro de um laço de parcelas". Consequência testável: dois aparelhos offline com streaks diferentes convergem ao mesmo valor após o merge, e a UI usa uma só fonte de nível. Impacto em NFR-4: já existem `LEVEL_UP`/`STREAK_UPDATED` publicados; o reducer deve tolerá-los e ignorá-los (compatibilidade), sem exigir migração.

### 3.2 Ponto único de entrada de escrita (`dispatch` x `dispatchDomainEvent`): FICA FORA como FR, entra só o efeito observável
O mecanismo (um `commit`, `commitBatch`, `deviceId` resolvido num lugar) é decisão de arquitetura e o spine já ratificou os dois despachos como regra de uso (linha 49). Fazer FR de "um só ponto" é prescrever implementação. Mas o efeito para o usuário é real e testável: parcelas/recorrência emitem a mesma conquista N vezes, e "efetivar" pela notificação (sem `date`) difere de "efetivar" pelo formulário. Entram como consequências testáveis em FR-19 (L8) e no item 3.1, e a decisão `commit` único vai para o spine/épico de arquitetura. Justificativa de ficar fora do PRD: não muda o que o dono pode fazer, só como o código chega lá.

### 3.3 Identidade de categoria por slug: ENTRA em parte, resto fica fora com registro
- **Entra (FR curto, bloco C ou F):** criar categoria no formulário com `generateId()` faz dois aparelhos terem duas "Alimentação" depois do sync, o que viola UJ-1 ("os três mostram os mesmos gastos") e distorce o 50/30/20, o núcleo da visão. Consequência testável: a mesma categoria criada em dois aparelhos resulta em uma só após o sync (id derivado do slug). Isso também entra com a pergunta aberta: o que fazer com categorias já criadas com id aleatório (NFR-4, migração ou mescla por nome).
- **Fica fora (registrar em §5 ou addendum como futuro):** unificar o catálogo, validar `categoryId` desconhecido e consertar a conquista `first_dizimo`. É correção de domínio sem relação com segurança e atualização. Hoje só o addendum E o menciona, e o PRD §5 não; passar para §5 como "fora desta iniciativa, com motivo".

### 3.4 Conversão atômica de wishlist: FICA FORA, com registro explícito
Mecanismo idêntico ao de FR-19 (id determinístico `purchase:{itemId}`), então é barato, mas exige novo tipo de evento e mexe no domínio de wishlist. Com no máximo 5 usuários ativos e a conversão sendo gesto manual raro em dois aparelhos ao mesmo tempo, o dano é baixo. Hoje só aparece no addendum E. Sugestão: levar a §5 como não-objetivo ("conversão atômica de item da wishlist em despesa") e acrescentar uma pergunta aberta se o dono já viu despesa duplicada. A parte `trophyEngine ... as any` é troféu e fica fora.

### 3.5 Arredondamento do saldo no reducer: FICA FORA, com justificativa técnica
A premissa do ADV 8 é "mesmo conjunto de eventos em ordens diferentes". Com FR-16 (ordem total e idêntica em memória e SQLite) a ordem de soma é a mesma em todo aparelho, e IEEE 754 em JS dá resultado idêntico, então NFR-2 vale sem arredondar no reducer. O que sobra é `balance === 0` e limiares, mais `ACCOUNT_UPDATED` sobrescrever `balance`: defeito de domínio, não de divergência. O spine já tem "centavos inteiros" em Deferred. Registrar como "reabrir se FR-16 for adiado".

## 4. Perguntas abertas sugeridas para o §8
10. Categorias já criadas com id aleatório: mesclar por nome ou manter? (3.3)
11. O `server/` recebe dado de usuário? Onde roda? (L6)
12. Evento de versão nova num aparelho antigo: preservar no log e reaplicar depois da atualização? (L4)
13. Restore e reinstalação: o aparelho novo republica eventos do `deviceId` antigo? (L3)
14. Firebase, AdMob e provedores de IA entram na política e no Data safety? (L7)

## 5. Fechamento
Cobertura do PRD sobre o ADV: itens 3, 4 (parcial), 9 (parcial) e 2 (parcial) bem cobertos; itens 1, 5, 6 sem tratamento adequado. RUB e VER: F1/F4/Stack cobertos ou entregues; sobram L5, L6, L7, L10.
