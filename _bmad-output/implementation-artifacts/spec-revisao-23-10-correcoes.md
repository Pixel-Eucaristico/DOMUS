---
title: 'Correções da revisão completa de 23/10 (Stories 3.3, 3.4, assinatura do build e alerta)'
type: 'bugfix'
created: '2026-10-25'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-alerta-customizado.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-4-ordem-total-do-replay.md'
---

## Intent

**Problem:** A revisão completa do que entrou no `dev` em 22–23/10 (lentes adversarial, casos extremos e lacunas de teste; 33 achados) mostrou falhas que podem travar confirmações, assinar o release com a chave errada e deixar eventos fora do sync ou fora de ordem.

**Approach:** Três frentes independentes, na prioridade que o dono aprovou ("vai próximo passo", 25/10): (A) fila e host do alerta; (B) assinatura do build + acentos que faltam nas telas; (C) eventos "local" e ordem.

## Review Triage Log

| Frente | Achado | Veredito |
|---|---|---|
| A | Host "do topo" = último montado: raiz pode ficar por cima de modal montado no mesmo commit; host de tela modal escondida por outra tela (`/sync` → `/backup`) recebe os alertas | **patch**: hosts registram/saem pelo foco da tela (`useFocusEffect`) e a raiz é sempre a base; teste de montagem simultânea |
| A | Fila trava se o host do primeiro alerta não está visível | **patch**: sem host visível, o alerta vai para o próximo host disponível (ou a raiz) |
| A | Com o app bloqueado, `appConfirm` fica pendente para sempre | **patch**: ao bloquear, confirmações pendentes resolvem `false`; avisos sem efeito voltam após desbloquear |
| A | Aviso de privacidade das consultas marcado como visto antes de aparecer | **patch**: marcar só ao tocar num botão |
| A | Fechar roda o `onPress` do cancelar **e** o `onDismiss` | **patch**: um só: o do cancelar, senão `onDismiss` |
| B | Plugin de assinatura: `indexOf("release {")` frágil; marcador único para duas inserções | **patch** + teste do plugin sobre o `build.gradle` do template |
| B | CI: senhas com `\`, `:`, `=`, `#`, `$` quebram o `gradle.properties`; secrets incompletos falham tarde | **patch**: passar por `ORG_GRADLE_PROJECT_*` (env) e checar os 4 secrets |
| B | CI sem conferir o certificado do APK | **patch**: `apksigner verify --print-certs` falha se for a chave de depuração com `HAS_KEYSTORE=true` |
| B | Textos sem acento (ai-settings, sync e outros) | **patch** |
| C | Categorias padrão e recuperação de XP gravam sem normalizar/carimbar | **patch**: mesmo helper do `dispatch` |
| C | Eventos "local" não vão para o sync | **patch**: publicar pelo `eventsForExport` (carimbo do id) |
| C | Restauração grava "local" no banco | **patch**: carimbar quando o id do aparelho é conhecido |
| C | Ids de recuperação de XP e de depuração com prefixo e horário separado | **patch**: `createEvent`/mesmo instante |
| C | Horário "0x1A"/"0b11" vira número | **patch**: só decimal |
| C | Id repetido no `dispatch` ainda conta e dispara sync | **patch** |
| C | Teste de ponta a ponta do sync copia a junção antiga; ligações do `useEventStore` e da exportação sem teste | **patch**: helpers puros usados pelos hooks e testados |
| C | Logs antigos com eventos do mesmo ms podem trocar de ordem na atualização | **defer** (D32): medir em logs reais; desempate por ordem de gravação para ids antigos |
| C | `dispatch` refaz o log inteiro a cada evento | **defer** (D33): inserção ordenada quando virar gargalo |
| C | `SELECT_SINCE_SQL` com `timestamp > ?` | **defer**: só o sync legado usa (`packages/sync`, intocável) |
| C | `generateId` com relógio que volta | **reject**: risco mínimo, documentado |

## Verification

- `npx vitest run`, `npx tsc --noEmit` e build web sem falhas novas

## Implementation Notes

### Frente A — fila e host do alerta

- **Camadas de host** (`src/services/appAlert.ts`, `src/components/shared/AppAlertHost.tsx`): `registerAppAlertHost({ root })`. A raiz (`<AppAlertHost root />` em `app/_layout.tsx`) entra no índice 0 e fica sempre por baixo, mesmo registrada depois (os efeitos rodam do filho para o pai, então um `Modal` montado no mesmo commit registrava antes dela e perdia). Os outros hosts ficam na ordem de registro; o de cima é o último.
- **Telas modais** (`add-transaction`, `onboarding`, `sync`): trocaram para `<AppAlertScreenHost />`, que registra no foco e sai no blur (`useFocusEffect` do `expo-router`); só a linha do import e a do JSX mudaram nessas telas. Com `/sync` → `/backup`, o `/sync` perde o foco e o alerta vai para a raiz. Os hosts dentro de `Modal` do RN (`AccountFormModal`, `TransactionBottomSheet`, `DailyAdModal`, `WelcomeCarousel`, `DebugTools`) continuam `<AppAlertHost />` por montagem: o `Modal` do RN só monta os filhos quando visível, e o que abre depois fica por cima da tela e da raiz.
- **Host que sai:** o de cima é calculado a cada `notify()`, que roda ao registrar e ao sair; o alerta visível passa na hora para o próximo host (ou a raiz) sem sair da fila. O host que sai também zera o próprio estado (`setRequest(null)`), para o `Modal` dele fechar.
- **Bloqueio:** `setAppAlertLocked(true)` tira da fila os pedidos de `appConfirm` (marcados num mapa por id) e resolve as Promises com `false`; `appConfirm` chamado com o app bloqueado resolve `false` na hora. Os outros alertas (`appAlert`, com ou sem botões de efeito) ficam na fila, sem rodar botão nem `onDismiss`, e voltam na mesma ordem ao desbloquear. Fiação do `SecurityGuard` sem mudança (`isLoading || isLocked`): `appConfirm` durante o carregamento inicial da trava também resolve `false`.
- **Aviso das consultas** (`ExternalLookupsNoticeHost`): grava `noticeShown` só ao tocar em "Desligar" (depois de gravar o `enabled: false`, em sequência, porque as duas funções leem e regravam o mesmo registro) ou "Manter ligado" (e no `onDismiss`, que hoje não roda por causa do `cancelable: false`). Se o app fechar antes de responder, o aviso volta na próxima abertura. Um sinalizador do módulo impede enfileirar de novo quando o host remonta (ele desmonta ao bloquear, por estar dentro do `SecurityGuard`).
- **Fechar** (tocar fora / voltar / Esc): um só efeito: o `onPress` do botão "cancel" se ele tiver um, senão `options.onDismiss`.
- **Testes** (`src/services/__tests__/appAlert.test.ts`, 26 → 36): fechar com cancel não chama `onDismiss`; cancel sem `onPress` chama `onDismiss`; raiz registrada depois de um Modal fica por baixo; foco/blur de tela modal; Modal por cima de tela modal; host do alerta visível saindo (Modal → tela → raiz); várias raízes; bloqueio com `appConfirm` pendente e visível (resolvem `false`, avisos voltam em ordem); `appConfirm` com o app bloqueado; `appConfirm` já respondido não muda.
- **Verificação:** `npx vitest run` 71 arquivos / 1387 testes passando (inclui o trabalho em paralelo das frentes B e C); `npx tsc --noEmit` sem erros.
- **Não verificado:** Android e iOS reais nem build web; o `useFocusEffect` nas telas com `presentation: "modal"` segue a documentação do React Navigation (limpeza também roda ao desmontar com foco).

### Frente B — assinatura do build e acentos

- **Plugin** (`plugins/withReleaseSigning.js`): o `build.gradle` é lido por blocos com chaves balanceadas sobre uma cópia mascarada (comentários e conteúdo de strings viram espaços, mantendo os índices). Acha `android` → `signingConfigs` e `buildTypes` → `buildTypes.release`, só no nível direto do bloco pai, aceitando `release{`, espaços/quebras e comentários entre o nome e a chave. Em `buildTypes.release` troca só a linha `signingConfig …` (se não houver, insere uma no início do bloco); em `signingConfigs` insere `release { … }` logo após a abertura, com a indentação do bloco. Dois marcadores separados (`// withReleaseSigning: buildTypes.release` no fim da linha trocada e `// withReleaseSigning: signingConfigs.release` dentro do bloco novo), checados cada um no seu bloco: rodar de novo não muda nada. Erros claros quando falta `android`, `android.signingConfigs`, `android.buildTypes` ou `android.buildTypes.release`, e quando `signingConfigs` já tem um `release` que não é do plugin.
- **Teste do plugin** (`plugins/__tests__/withReleaseSigning.test.ts`, 10 testes) sobre `plugins/__tests__/fixtures/expo54-app-build.gradle`, o `android/app/build.gradle` do `node_modules/expo/template.tgz` (expo 54.0.37) sem alterações: bloco release adicionado, `buildTypes.release` trocado e o resto dele igual, `buildTypes.debug` e `signingConfigs.debug` iguais, arquivo idêntico fora dos dois pontos, idempotente, variantes (`release{` com comentário, `signingConfigs /* … */ {`, `buildTypes` com chave na linha de baixo), `release {` em comentário ignorado, release sem `signingConfig`, erros.
- **CI** (`.github/workflows/build-android.yml`): `HAS_KEYSTORE` só é `true` com os 4 secrets não vazios. Passo novo "Check signing secrets" (primeiro depois do "Free disk space"): keystore presente e algum dos outros 3 faltando → `::error::` com os nomes e falha; sem keystore → aviso de que sai com a chave de depuração. "Configure signing" só decodifica o keystore em `android/app/release.keystore`; nada vai mais para o `gradle.properties`. O passo do Gradle exporta `ORG_GRADLE_PROJECT_MYAPP_UPLOAD_STORE_FILE=release.keystore` e `…_STORE_PASSWORD`/`…_KEY_ALIAS`/`…_KEY_PASSWORD` (entre aspas, a partir do env do passo) só quando `HAS_KEYSTORE=true`: sem keystore as variáveis não existem e `project.hasProperty('MYAPP_UPLOAD_STORE_FILE')` continua falso. Passo novo "Verify APK certificate" (com `HAS_KEYSTORE=true`): `apksigner` mais novo de `$ANDROID_HOME/build-tools/*/` → `verify --print-certs` em `app-release.apk`; falha se o APK não existir, se a verificação falhar ou se o DN tiver `CN=Android Debug`. O resto do workflow ficou igual; YAML validado com `yaml.safe_load`.
- **Acentos** (texto visível em `app/` e `src/`, 43 arquivos): ai-settings, sync, add-transaction, onboarding (só strings; as linhas do host de alerta da frente A ficaram como estavam), ai-chat, transactions, componentes de IA (ProviderSelector "Rápido"/"Avançado", BudgetCostSection, AIUsageDashboard, ChatActionMenu, QuickSuggestions, DataPermissionModal, ProviderSwitchModal, ChatBubble, MarkdownToolbar, ChatInputBar, FinancialCard, APIKeyManager), transação (InstallmentSelector, TitheCalculatorSection, ItemsSection, RecentTransactionsList, TransactionBottomSheet), lista de desejos, contas ("Poupança", "Cartão"), `categoryHelpers`/`transactionCategories` (rótulos), QRScannerModal, mensagens de erro do `useSyncEngine` e do `useGoogleDriveBackup`, e as mensagens locais mostradas no chat (`WelcomeMessageBuilder`, fallback e boas-vindas locais do `ConsultantChatUseCase`). `ProviderSwitchModal` passou a reconhecer "invalida" e "inválida" no erro do provedor (o adaptador em `packages/ai` ainda lança sem acento e tem teste que afirma isso).
- **Fora de propósito (sem mudança):** ids e chaves (`dizimo`, `alimentacao`, ids de troféus em `TrophyDecorationFactory`, palavras-chave do `PermissionDetector`, regex do `financialGlossary`, campos `Codigo`/`Descricao` do Siscomex), comentários `{/* SECAO … */}` e texto que só vai para o modelo (system prompt e instruções do `ConsultantChatUseCase`, `AIContextBuilder`). Nos arquivos das frentes A e C não havia texto visível sem acento.
- **Verificação:** `npx vitest run` 71 arquivos / 1387 testes passando (com o trabalho em paralelo das frentes A e C); `npx tsc --noEmit` sem erros.
- **Não verificado:** o workflow não rodou no GitHub (sem secrets aqui); o `build.gradle` gerado não passou pelo Gradle.

### Frente C — eventos "local" e ordem

- **Helpers puros** (`src/context/localEventLog.ts`, sem `react-native`): `appendDispatched(prev, evt, deviceId)` → `{ events, event, added }` (carimbo `stampDeviceId` + `prepareLocalLog`; id já presente → `added: false`, log igual); `appendGenerated(prev, evts, deviceId)` → `{ events, added }` (mesma regra para vários eventos; descarta repetidos com o log e entre si; `added` já carimbado, na ordem recebida); `mergeHydrated(prepared, prev, deviceId)` (fim da hidratação, mantém os despachados antes dela; repetido fica o carregado); `mergeImported(prev, imported, deviceId)` (junção do `importEvents`); `buildExportEvents(events, deviceId)` (só objetos, sem repetidos, `eventsForExport`, ordem total; cópia).
- **`useEventStore`:** a hidratação usa `mergeHydrated`; `importEvents` usa `mergeImported`; `dispatch` confere com `appendDispatched(allEventsRef.current, …)` **antes** de gravar — repetido não vai para o SQLite, não soma no `localEventCount` (portanto não dispara sync) e gera um `console.warn` só com o tipo. O ref é atualizado na hora com o resultado (dois `dispatch` seguidos acontecem antes do próximo render); o `setAllEvents` continua na forma de função (`appendDispatched(prev, evt).events`) para não perder atualizações concorrentes (hidratação, import). Limite conhecido: antes de a hidratação terminar o ref está vazio, então um id repetido de um evento já gravado ainda conta uma vez (o `INSERT OR IGNORE` e o `mergeHydrated` deduplicam).
- **Categorias padrão** (`useGamificationEffects`, recebe `allEventsRef` novo) e **recuperação de XP** (`AppStateProvider`): mesmo padrão do `dispatch` com `appendGenerated` — carimbo antes do `appendEvent`, só os `added` vão para o banco e a contagem, ref atualizado na hora, `setAllEvents` em função. O `compareEvents` deixou de ser importado nos dois.
- **Recuperação de XP:** `createXpRecoveryEvent(amount, deviceId)` usa `createEvent` (id e timestamp do mesmo instante, contador da 3.4) e põe a marca `recovery: "xp-recovery"` no payload (o reducer e o `validatePayload` ignoram campo extra; testado pelo replay). O id novo não tem prefixo; `isXpRecoveryEvent` reconhece os dois formatos (id antigo com `xp-recovery-` e marca no payload), então logs antigos continuam sem segunda recuperação.
- **`createEvent`** (`packages/events/src/factory.ts`): o genérico passou de `T extends DomainEvent` para `T extends { type: string; payload: unknown } = DomainEvent` (eventos da gamificação usam a mesma fábrica). Chamadas existentes não mudaram.
- **DebugTools:** "Simular Level Up" e "Ganhar Troféu Agora" criam com `createEvent` (sem os prefixos `debug-lvl-`/`debug-<troféu>-`, que nada detectava). Sem id do aparelho saem `"local"` (antes `"debug"`) e o `dispatch` carimba.
- **Sync** (`publishSyncEvents`): `partitionEnvelopes(eventsForExport(events, deviceId))` — "local"/vazio sai com o id do aparelho em vez de ser recusado como `invalid_device_id`. Observação (fora do escopo, `useSyncEngine.ts`): `getMyEvents` filtra `e.deviceId === did`, então só chega ao publish o que a memória já normalizou; com a normalização da hidratação e o carimbo do `dispatch`, "local" na memória só existe se o id do aparelho ainda não era conhecido.
- **Restauração:** `prepareBackupForStorage(items, deviceId = null)` carimba "local"/vazio (mesma regra `isBlankDeviceId`) antes de gravar; `restoreFromBackup` passa o `deviceId`. Sem o id, grava como veio (teste antigo mantido).
- **Exportação:** as três chamadas (backup criptografado e simples em `useBackupRestore`, automático em `useAutoBackup`) usam `buildExportEvents(getAllEvents(), deviceId)`.
- **`numericTimestamp`** (exportado): só `^-?\d+(\.\d+)?$` depois de tirar espaços das pontas; `"0x1A"`, `"0b11"`, `"0o7"`, `"1e3"`, `"Infinity"`, `"+5"`, `".5"`, `"5."` ficam como texto. Vale para `normalizeStoredEvents`, `prepareLocalLog` e `prepareBackupForStorage`. **Não alterados (fora dos arquivos desta frente):** `eventTimestampKey` (`packages/storage/src/eventOrder.ts`, chave da ordem) e `validateLocalEvent` (`src/context/replayValidation.ts`) ainda usam `Number()` e leem `"0x1A"` como 26 — o texto fica como texto no log, mas ordena e é aplicado como 26. Alinhar nos dois numa próxima passada.
- **Testes:** `src/context/__tests__/localEventLog.test.ts` (+20: `appendDispatched` com "local"/dev-1 no mesmo índice depois de recarregar por `prepareLocalLog`, repetido sem efeito, dois dispatch seguidos; `mergeHydrated` mantém os despachados antes do fim; `appendGenerated` com repetidos e categorias padrão na ordem de criação; `mergeImported`; `buildExportEvents`; `prepareBackupForStorage` com id; `numericTimestamp` decimal × hex/binário/octal/expoente; recuperação de XP: mesmo instante, detecção dos dois formatos, replay aplica), `src/modules/__tests__/nostrSync.test.ts` (+1: "local", " LOCAL " e vazio publicados com o id e lidos no pull pelo pool falso; entrada não alterada) e `replay.reprocess.test.ts` (ponta a ponta usa `mergeImported` em vez do `sort` por timestamp).
- **Adiado:** D32 e D33 em `deferred-work.md`.
- **Verificação:** `npx vitest run` → 71 arquivos / 1408 testes, todos passando (antes desta frente, com A e B no working tree: 71 / 1387); `npx tsc --noEmit` → sem erros (exit 0); `eslint` nos arquivos alterados sem problemas.
- **Não verificado:** aparelho real (hidratação com `dispatch` concorrente, sync entre dois aparelhos) e build web.
