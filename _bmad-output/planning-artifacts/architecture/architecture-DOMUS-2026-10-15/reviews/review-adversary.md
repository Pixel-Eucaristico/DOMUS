# Revisão adversária — ARCHITECTURE-SPINE DOMUS

Data: 2026-10-15. Alvo: `ARCHITECTURE-SPINE.md` (draft). Método: pares de unidades construídas de forma independente, cada uma obedecendo cada AD ao pé da letra, que ainda assim ficam incompatíveis. Cada buraco foi provado no código; o que o código já impede ficou de fora (ver "Descartados").

## Veredito

O spine acerta o paradigma, mas AD-1, AD-2, AD-5 e AD-8 se contradizem ou ficam mudos exatamente onde o código já diverge: gamificação persiste derivados como eventos (contra AD-1), efeitos de casca rodam em todo aparelho com ids aleatórios (nada garante idempotência de negócio), a ordem de replay não é total e o push do sync perde lote em silêncio. Hoje dois aparelhos no mesmo grupo divergem em XP, conquistas, trófeus e aportes, e um evento malformado derruba o replay.

## Resumo

| # | Sev. | Par de unidades | AD |
|---|------|-----------------|----|
| 1 | critical | AD-1 x AD-5 (spine contra si mesmo); aparelho A x aparelho B; tela de nível x tela de XP | AD-1 reescrito + AD-5 apertado |
| 2 | critical | Efeito de casca no aparelho A x mesmo efeito no aparelho B | AD-10 novo (id natural e emissor único) |
| 3 | high | Replay no aparelho A x replay no B; replay em memória x replay do SQLite | AD-2/AD-8 apertados (ordem total, reducer tolerante) |
| 4 | high | Push do aparelho A x relays x pull do aparelho B | AD-8 apertado |
| 5 | high | Tela que usa `dispatch` x tela que usa `dispatchDomainEvent`; dois dispatch no mesmo tick | AD-1 apertado + AD-11 novo |
| 6 | medium | Tela de transação x tela de wishlist x scheduler (identidade de categoria) | AD-12 novo |
| 7 | medium | Wishlist x domínio (conversão em despesa; dono do `wishlistItems`) | AD-13 novo |
| 8 | medium | Reducer A x reducer B somando em ordem diferente (dinheiro) | AD-7 apertado |
| 9 | medium | App versão N x app versão N+1 (payload sem versão); `resetApp` x AD-2 | AD-2 apertado |
| 10 | low | Diversos | ver seção |

---

## 1. critical — AD-1 e AD-5 se contradizem; gamificação persiste estado derivado

**Pares:** (a) a equipe que segue AD-1 ("nunca persista XP, nível, streak; recalcule do log") x a que segue AD-5 ("a casca emite XP, streak e conquistas como evento"). Ambas obedecem ao texto. (b) aparelho A x aparelho B. (c) a tela que lê `gamification.level` x a que lê `levelInfo.level`.

**Prova no código:**
- `useGamificationEffects.ts:299-306` emite `STREAK_UPDATED` com o estado absoluto `{currentStreak, longestStreak, lastActiveDate}` calculado do `gamification` local. O reducer (`gamification/src/reducer.ts`, `STREAK_UPDATED`) só sobrescreve. Resultado: último timestamp vence. Aparelho A offline com streak 7 e B com streak 3 fazem merge, e vale o evento mais novo, calculado sobre um estado velho.
- `LEVEL_UP` grava `newLevel` absoluto (`reducer.ts`, `LEVEL_UP`) e `level` só muda por esse evento. Já `AppStateProvider.tsx:164-167` deriva `levelInfo = getLevelInfo(totalXp)`. São duas fontes do nível. Divergem quando: XP cai por exclusão (não há `LEVEL_DOWN`), quando `ACHIEVEMENT_UNLOCKED`/troféu soma `xpReward` no reducer sem passar pelo `shouldLevelUp` (`useGamificationEffects.ts:309-312` só considera `totalXpGain` da transação), e quando `debugXp` sobrescreve `totalXp` (`AppStateProvider.tsx:148-151`). `WelcomeMessageBuilder.ts:31-33` e `DebugTools.tsx:342` leem `gamification.level`; o resto da UI lê `levelInfo`.
- `XP_GAINED` carrega a quantia pronta. Na exclusão, `useGamificationEffects.ts:274-276` subtrai `calculateBudgetAdherenceXp(nextBudget)` do orçamento depois da exclusão, que não é o bônus concedido na criação. Criar e excluir a mesma transação não é neutro, e o orçamento usado é sempre o do mês corrente (`now`), mesmo para lançamento retroativo.
- `ACHIEVEMENT_UNLOCKED` não tem dedupe no reducer (os de troféu têm, por id+mês). Dois aparelhos que cruzam "10 transações" offline emitem os dois; `totalXp` soma `xpReward` duas vezes, `unlockedAchievements` ganha duas entradas e `completionCounts` vira 2.
- `XP_GAINED` com valor negativo passa por `Math.max(0, ...)` a cada passo. A função não é associativa, então o resultado depende da ordem (ver item 3).

**Por que o spine deixa passar:** AD-1 lista "XP, streak" como derivado proibido, AD-5 manda emitir exatamente isso. Falta dizer qual é o fato e qual é o derivado.

**AD proposto (substitui AD-1/AD-5 na parte de gamificação):**
> Evento de gamificação registra um fato com valor delta ou identificador natural, nunca estado absoluto. `STREAK_UPDATED` e `LEVEL_UP` deixam de existir como fonte: streak e nível são derivados no replay a partir de datas de transação e de `totalXp` (`getLevelInfo`). `GamificationState.level` é removido; a UI usa só `levelInfo`. `ACHIEVEMENT_UNLOCKED` e `*_TROPHY_COMPLETED` têm id determinístico (`ach:{achievementId}`, `monthly:{trophyId}:{monthKey}`) e o reducer deduplica por chave natural. XP de transação é derivado do evento de transação (`TRANSACTION_CREATED` vale N, `TRANSACTION_DELETED` desfaz exatamente N), não de um `XP_GAINED` à parte. Overrides de debug nunca entram em `AppState`.

---

## 2. critical — Efeitos de casca rodam em todo aparelho com id aleatório

**Par:** o mesmo efeito (hook ou scheduler) no aparelho A x no aparelho B, ambos no mesmo grupo de sync. Cada um segue AD-2 (idempotência por `id`) e AD-5 (casca emite); como o `id` é `generateId()` aleatório, a idempotência por `id` não protege nada.

**Prova (cinco instâncias):**
1. `useSavingsGoalScheduler.ts` (chamado em `app/_layout.tsx:68`): roda uma vez por boot, após `loading=false` e antes do primeiro pull. Cria `TRANSACTION_CREATED` pendente com `id: generateId()` por conta e período. A checagem `alreadyScheduledInPeriod` olha só o log local. Dois aparelhos, ou um aparelho antes do pull, geram dois aportes pendentes no mesmo período; ao efetivar os dois, o saldo da poupança dobra. Além disso, `dispatchDomainEvent` concede XP e streak também a transação gerada automaticamente com `status: "pending"` (`useGamificationEffects.ts:245-307` não filtra status).
2. Seleção de troféu sazonal (`useGamificationEffects.ts:151-188`): `pickSeasonalTrophy(deviceId, monthKey, pool)` (`trophyEngine.ts`) usa o `deviceId` como semente, apesar do comentário "mesmo usuário, mesmo troféu". Cada aparelho escolhe um troféu diferente. O reducer de `SEASONAL_TROPHY_SELECTED` mantém o primeiro no replay, mas `SEASONAL_TROPHY_COMPLETED` não confere se o troféu é o selecionado. O aparelho B completa o seu troféu e recebe o XP, e o de A também. Dois XPs de troféu sazonal no mesmo mês. Agravante: o pool depende de `isCatholic`, preferência em AsyncStorage (AD-6) que muda os fatos emitidos.
3. Recuperação de XP (`AppStateProvider.tsx:188-222`): gera `xp-recovery-${generateId()}` quando `txCount>0 && XP<=5 && !hasRecovery`, onde `hasRecovery` olha só o log local. Pode rodar em vários aparelhos antes do sync, e rodar sobre um log parcial recém-importado (ver item 4, evento descartado pela assinatura), e cada um minta XP. Há também um `useEffect` vazio equivalente em `useGamificationEffects.ts:75-85`: quem implementar o stub conforme AD-5 duplica a recuperação.
4. Categorias padrão (`useGamificationEffects.ts:88-112`, `createDefaultCategories`): `CATEGORY_CREATED` com id de categoria fixo, mas id de evento aleatório e `deviceId:"system"` trocado pelo do aparelho. O estado converge (o reducer sobrescreve por id), mas cada aparelho acrescenta 13 eventos ao log. Dano: log e sync inflados, e uma futura edição de categoria seria sobrescrita por um default tardio de outro aparelho.
5. Checagem de troféu mensal (`:115-148`) roda em todo aparelho a cada render; só o dedupe do reducer evita o XP duplo. Funciona por acaso, e o `monthKey` vem de `new Date()`, não da transação.

**AD proposto (AD-10, novo):**
> Todo evento emitido por efeito, scheduler ou migração tem id determinístico derivado da chave natural do fato (`savings:{accountId}:{periodo}`, `cats:default:{categoryId}`, `season:{monthKey}`, `xp-recovery:v1`), nunca `generateId()`. Eventos de efeito não carregam o `deviceId` na semente. O reducer valida a chave natural (completar só o troféu selecionado). Antes de emitir, o efeito só roda depois do primeiro pull concluído quando há grupo de sync. Preferências que decidem quais fatos são emitidos (`isCatholic`) viram evento.

---

## 3. high — Ordem de replay não é total, e reducers não toleram reordenação

**Par:** replay no aparelho A x replay no B (chegadas em ordem diferente); replay em memória x replay recarregado do SQLite no mesmo aparelho. O spine registra "sem desempate por id" como Deferred, mas as consequências são piores que "divergência".

**Prova:**
- Empate de `timestamp`: `useEventStore.ts:157-161,183-187` usa `sort` estável por timestamp, então empates ficam na ordem de chegada (diferente por aparelho). `packages/storage` lê com `ORDER BY timestamp ASC` sem desempate (`eventStore.ts` `SELECT_ALL_SQL`), então a ordem após reiniciar pode diferir da ordem em memória. Empates são normais: `dispatchDomainEvent` emite transação, `XP_GAINED`, `STREAK_UPDATED` e `LEVEL_UP` no mesmo milissegundo, e parcelamento e recorrência emitem em laço.
- Evento anterior ao seu alvo desaparece em silêncio: `domainReducer` retorna `state` quando `TRANSACTION_UPDATED`/`DELETED` não acha a transação (`reducer.ts`). Com relógio de B atrasado alguns minutos, o `DELETED` de B ordena antes do `CREATED` de A: o delete é ignorado e a transação ressuscita, com saldo reaplicado. Mesmo vale para `ACCOUNT_UPDATED`/`DELETED`.
- Evento malformado derruba o app: `parseSyncPayload` (`nostrSync.ts:449-471`) não valida nada; `importEvents` grava no SQLite; `replayAllEvents` (`AppStateProvider.tsx:96-131`) roda dentro de `useMemo` sem `try/catch`. Um payload nulo faz `account.id` lançar e o app falha em toda inicialização seguinte. A única saída é `resetApp`.
- `Math.max(0, ...)` no XP e a soma de `balance` são sensíveis à ordem dentro do mesmo timestamp (ver itens 1 e 8).

**AD proposto (apertar AD-2/AD-8, tirar de Deferred):**
> A ordem de replay é total e igual em todo lugar: `(timestamp, deviceId, id)`, no sort em memória e no `ORDER BY` do SQLite. Reducer que recebe evento sem alvo registra pendência e reaplica quando o alvo chega, ou o replay usa ordem causal por `parentId`. Nenhum reducer lança: `replayAllEvents` isola cada evento (`try/catch`, quarentena do evento inválido) e importação valida o envelope e o tipo antes de gravar. Tolerância a relógio: timestamp recebido de outro aparelho é limitado a `agora + ε`.

---

## 4. high — O push do sync perde lote em silêncio

**Par:** aparelho A publicando x relays x aparelho B puxando.

**Prova (`nostrSync.ts`, `useSyncEngine.ts`):**
- `publishSyncEvents` engole a falha de cada lote (`catch` com `console.warn`) e devolve `published`. `pushMyEvents` (`useSyncEngine.ts:~118-135`) ignora o retorno e grava `lastPushHashRef` e `LAST_PUSH_HASH_KEY` mesmo com lote perdido. Como o push é guiado por hash, o lote não é reenviado até o próximo evento novo (ou push forçado). Eventos ficam ausentes nos outros aparelhos.
- Kind 30333 é replaceable parametrizado, chaveado por `(kind, pubkey, d)` com `d = sync-{deviceId}-{índice}`; a pubkey é a mesma para todo o grupo. O lote N de um aparelho é substituído por inteiro a cada push, então a posição do evento no lote depende do conteúdo atual do log. `created_at` tem resolução de segundos, e pelo NIP-01 empate de `created_at` mantém o menor `id`: dois pushes no mesmo segundo (debounce de 500 ms) podem deixar nos relays a versão antiga. (Isto vem do protocolo, não é provável só pelo repositório.)
- `subscribeToSyncEvents` chama `onEvent` num laço síncrono sobre o lote (`nostrSync.ts:551-557`), e o handler em `useSyncEngine.ts` retorna se `isImportingRef.current` já está true, definido de forma síncrona antes do primeiro `await`. Dos 20 eventos de um lote, só o primeiro é importado pela assinatura; o resto espera o pull de 8 s. No intervalo, o aparelho B vê uma transação sem os eventos de gamificação dela (gatilho do item 2.3).
- `getMyEvents(did)` filtra por `deviceId === did` (`useSyncEngine.ts`). Evento de outro `deviceId` nunca é republicado: restaurar um backup num celular novo (`restoreFromBackup`) mantém os `deviceId` originais e nada disso chega ao grupo; `deviceId` que muda (reinstalação) deixa os lotes do `deviceId` antigo órfãos.
- `resetApp`/`restoreFromBackup` apagam o log local (`clearAllEvents`), mas os lotes seguem nos relays e o próximo pull ressuscita tudo; com zero eventos locais o `pushMyEvents` sai sem publicar, então os lotes nunca são limpos.
- `pullSyncEvents` usa `limit: 500` por relay, sem `since` e sem paginação (o parâmetro `sinceTimestamp` é ignorado): acima de 500 lotes (10.000 eventos) o histórico é truncado.

**AD proposto (apertar AD-8):**
> Push é confirmado por lote: só marca como enviado o lote com ack de pelo menos um relay, e reenvia os demais. O sync é por evento imutável (`d` = id do evento ou do intervalo de ids), nunca lote replaceable com posição derivada. O pull pagina por `until`, e a assinatura enfileira em vez de descartar. Evento pertence ao grupo, não ao `deviceId`: o push envia todo evento ainda não confirmado, de qualquer `deviceId`. `reset`/`restore` são eventos (`LOG_RESET`, `RESTORED_FROM`), nunca `DELETE`.

---

## 5. high — Dois caminhos de mutação e `dispatch` no mesmo tick

**Par:** tela que usa `dispatch` x tela que usa `dispatchDomainEvent`; duas chamadas de `dispatchDomainEvent` no mesmo render.

**Prova:**
- AD-1 diz "o único caminho é `dispatch(evento)`", mas o contexto expõe dois: `dispatch` (só grava) e `dispatchDomainEvent` (grava e emite XP, streak, nível, conquistas, troféus). `useTransactionForm.ts:256,277` usa `dispatch` para `CATEGORY_CREATED`; `useWishlist.ts` e `app/onboarding.tsx` usam `dispatch`; o resto usa `dispatchDomainEvent`. Uma tela nova que registre `TRANSACTION_CREATED` via `dispatch` fica sem XP, outra via `dispatchDomainEvent` com. O spine não diz qual usar.
- `dispatchDomainEvent` calcula a partir de `gamification` e `domain.transactions` do render (closure). Em laço (`app/add-transaction.tsx:~98-100`, parcelas e recorrência em `useTransactionForm.ts:348,367`, `dispatchAndExit` `:196-199`), todas as iterações veem o mesmo estado antigo: o streak e a checagem de nível são recalculados sem as iterações anteriores, e `alreadyUnlocked` está desatualizado, então a mesma conquista é emitida N vezes e o reducer soma `xpReward` N vezes (item 1).
- O fluxo de notificação "efetivar" (`app/_layout.tsx:~112-118`) manda `{status:"confirmed"}` sem `date`, enquanto `useTransactionForm.ts` `handleConfirm` manda `{status, date: hoje}`. Dois pontos de entrada para o mesmo gesto, com efeitos diferentes. O mesmo evento sai de ambos os aparelhos se os dois recebem a notificação.
- A conversão `deviceId === "local"` é replicada em quatro lugares (`dispatchAny`, `createSyncEvent`, `dispatchDomainEvent`, hidratação). Se `deviceId` ainda é null o evento é gravado como `"local"`, e o filtro de push (`getMyEvents`) o ignora até o reboot.

**AD proposto (AD-11, novo + apertar AD-1):**
> Existe um único ponto de entrada `commit(commandOuEvento)` na casca. Telas não decidem entre "com gamificação" e "sem". Efeitos derivados rodam dentro do `commit`, sobre o estado resultante do replay do próprio log (incluindo eventos acabados de ser enfileirados), nunca sobre closures de render. Lote de eventos entra por `commitBatch`. O `deviceId` é resolvido num lugar só.

---

## 6. medium — Identidade de categoria: slug x id aleatório x nome

**Par:** `useTransactionForm` x `PendingTransactionsList`/scheduler/wishlist x `createDefaultCategories`/conquistas.

**Prova:**
- `createDefaultCategories` e `transactionCategories.ts` usam slugs fixos (`alimentacao`, `dizimo`).
- `useTransactionForm.ts:~245-258` procura a categoria por **nome** e, se não acha (ex.: "Dízimo / Oferta", "Restaurantes", "Assinaturas", "Salário"), cria com `generateId()`. A categoria nunca tem o id `dizimo`, mas `achievementChecker.ts` (`first_dizimo`) e `trophyEngine.ts` (`hasDizimoInMonth`) testam `categoryId === "dizimo"`. A conquista de dízimo nunca é desbloqueada por lançamento feito pelo formulário.
- Dois aparelhos criam a mesma categoria com ids aleatórios diferentes: duas categorias com o mesmo nome após o sync. A busca por nome também aproxima categorias de grupos diferentes (receita "Outros" cai no "Outros" default, grupo `wants`).
- O scheduler grava `categoryId: "outros"`, a conversão de wishlist usa `moradia`/`compras_diversas` e `PendingTransactionsList` usa `"outros"` como fallback: três convenções de id num mesmo campo. Id inexistente em `categories` vira silenciosamente `wants` em `calculate503020` (`domain/src/transactions.ts:~210,225`), distorcendo o 50/30/20.

**AD proposto (AD-12):**
> `categoryId` é sempre slug estável, definido no catálogo único (`packages/domain`) e emitido como `CATEGORY_CREATED` com id derivado do slug. Criação ad hoc usa `slug(nome)`, nunca `generateId()`. Referência a categoria desconhecida é erro de validação, não default silencioso.

---

## 7. medium — Wishlist x domínio: conversão não atômica e dono do `wishlistItems`

**Prova:**
- `app/wishlist/[listId].tsx:~156-180` converte um item com dois eventos independentes: `WISHLIST_ITEM_CONVERTED_TO_EXPENSE` (reducer de wishlist remove o item) e `TRANSACTION_CREATED` (id novo, sem referência ao item). Os dois aparelhos veem o item até o sync; os dois convertem e geram duas despesas. Se um evento chega sem o outro, o item some sem despesa ou a despesa existe com o item. Não há vínculo `itemId` na transação.
- `trophyEngine.ts:62` (`wishlistItemCount`) lê `(domain as any).wishlistItems`, campo que não existe em `AppState` (a wishlist vive em `WishlistState`). Os troféus de wishlist veem sempre zero, enquanto `useThemePreferences` recebe a contagem certa por outro caminho. Duas fontes para a mesma contagem, uma delas morta, escondida por `as any`.

**AD proposto (AD-13):**
> Fato que cruza agregados é um evento só (`WISHLIST_ITEM_PURCHASED` com `transactionId` determinístico `purchase:{itemId}`), ou os dois eventos carregam a mesma chave de correlação e o reducer ignora o segundo. Engines em `packages/gamification` recebem um `Snapshot` tipado com domínio e wishlist; `as any` sobre `AppState` é proibido.

---

## 8. medium — Dinheiro: AD-7 arredonda só na criação do evento

**Par:** aparelho A x aparelho B, mesmo conjunto de eventos em ordens diferentes.

**Prova:** `applyTransactionToAccounts` (`domain/src/reducer.ts`) soma e subtrai `tx.amount` em `balance` sem arredondar; `TRANSACTION_UPDATED` reverte e reaplica. A soma em ponto flutuante depende da ordem (0,1 + 0,2 + 0,3 contra 0,3 + 0,2 + 0,1), então saldos podem diferir no último bit entre aparelhos. A exibição esconde, mas igualdade e limiares (`balance === 0`, metas de poupança, conquistas) não. Ainda: `ACCOUNT_UPDATED` aceita `balance` no payload (`Partial<AccountPayload>`), de modo que um evento de edição pode sobrescrever o saldo derivado, concorrendo com as transações.

**AD proposto (apertar AD-7):**
> O reducer arredonda o saldo a 2 casas após cada operação (ou usa centavos inteiros internamente, mantendo reais na borda). `balance` só entra em `ACCOUNT_CREATED` como saldo inicial; ajuste de saldo é uma transação de ajuste, e `ACCOUNT_UPDATED` ignora `balance`.

---

## 9. medium — Envelope fixo sem versão de payload; AD-2 contra reset/restore

**Par:** app versão N x versão N+1 no mesmo grupo.

**Prova:** AD-2 fixa o envelope `{id, type, payload, timestamp, deviceId, signature}` e não prevê campo de versão. Os payloads evoluem: o último commit (`feat: Implement linked CDB`) adicionou `linkedCreditCardId`, `cdbDividendsTotal` e `isCdbDividend` a `AccountPayload`/`TransactionPayload`. Um aparelho antigo guarda o evento novo e roda o reducer antigo, que ignora ou interpreta de outro jeito os campos (saldo, crédito adicional), e vice-versa. Regra de tipo "não roteado é descartado" (AD-4) vale só para o tipo, não para payload mudado. Evolução de payload não tem regra. `restoreFromBackup`/`resetApp` fazem `DELETE FROM events`, o que contraria AD-2 ("nunca apagado") e o spine não registra a exceção.

**AD proposto (apertar AD-2):**
> Todo payload evolui só por adição de campo opcional ou por novo tipo de evento. Campo obrigatório novo exige `schemaVersion` no payload e upcaster no reducer. Reset e restore são os únicos apagamentos autorizados e têm um evento marcador, ver item 4.

---

## 10. low

- `generateDeviceId` e `DEVICE_ID_KEY` estão duplicados em `useEventStore.ts` e `syncStorage.ts` (`loadOrCreateDeviceId` sem uso). Dois escritores da mesma chave: quem ligar `loadOrCreateDeviceId` num boot novo cria uma corrida e eventos com `deviceId` diferente do salvo.
- Código de grupo: 6 símbolos de 32 (30 bits, `Math.random`), derivados em chave Nostr e em cifra XOR (já em Deferred). Colisão entre grupos mistura os dados financeiros de dois usuários. Faltam gerador criptográfico e comprimento mínimo.
- `getEventStore()` pode devolver `null` após 3 tentativas; `dispatch` grava com `store?.appendEvent` fire-and-forget. O evento fica só em memória e o sync o publica, mas some no reboot sem aviso. AD-2 diz "única dona do SQLite" e não diz o que fazer na falha.
- Sem `CATEGORY_UPDATED/DELETED`, `INVOICE_*` sem correção: AD-2 manda corrigir por evento novo, mas esses agregados não têm o tipo. Lacuna entre regra e catálogo de tipos.
- `PERSONALITY_EVENTS` não roteado (já Deferred): confirmado, `ARCHETYPE_UPDATED` não entra em `replayAllEvents`.
- Overrides de debug (`debugXp`, `debugBalance`) vivem no contexto de produção e desligam a recuperação de XP; não verifiquei se `DebugTools` fica atrás de `__DEV__`.

## Descartados (o código já impede ou não é buraco)

- **Colisão de namespace de tipo entre packages:** os valores de `EVENT_TYPES`, `GAMIFICATION_EVENTS`, `ONBOARDING_EVENTS`, `SEASON_EVENTS`, `WISHLIST_EVENTS` e `PERSONALITY_EVENTS` não se sobrepõem. A regra de AD-4 vale hoje.
- **Evento duplicado por reimportação:** `importEvents` filtra por `id` e `appendEvent` faz `eventExists` antes do insert; reentrega do mesmo evento (vários relays, assinatura + pull) é idempotente.
- **Dedupe de troféu mensal e sazonal por chave natural:** os reducers já deduplicam (dano limitado aos itens 1 e 2).
- **Gamificação de eventos importados:** `dispatchDomainEvent` pula evento de outro `deviceId`, então B não emite XP para a transação criada em A.
- **Dependência `packages/* -> react/expo`:** não encontrei importação proibida nos packages lidos; AD-3 vale.
- **Segredos em evento:** nada de segredo no payload lido.

## Ordem sugerida de fechamento

1. AD-10 e AD-1/AD-5 reescritos (itens 1 e 2): sem eles, qualquer outro aparelho no grupo corrompe XP e aportes.
2. AD-2/AD-8 apertados (itens 3, 4, 9): ordem total, push confirmado, reducer tolerante.
3. AD-11 (item 5) antes de novas telas.
4. AD-12, AD-13, AD-7 (itens 6, 7, 8) junto da próxima mudança de domínio.
