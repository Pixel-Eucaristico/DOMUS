# Revisão do Architecture Spine — DOMUS (rubrica de 6 pontos)

Alvo: `ARCHITECTURE-SPINE.md` (altitude initiative, brownfield). Data: 2026-10-15. Revisão somente leitura; nenhum arquivo do spine ou do código foi alterado.

## Veredito

O spine é um bom retrato do paradigma (event sourcing + núcleo funcional) e acerta a maior parte das afirmações verificáveis, mas **não está pronto para servir de substrato**: duas Rules são violadas hoje pelo código e o spine não diz que o código diverge (AD-6, AD-3), há uma divergência real de roteamento de eventos (AD-4) tratada só como "aberta" em Deferred, e o envelope operacional (ambientes, segredos de build, versionamento de eventos) está quase todo em Deferred sem separar o que pode fazer unidades divergirem.

## Verificação factual (ponto 5)

| Afirmação do spine | Resultado | Evidência |
| --- | --- | --- |
| `packages/*` não importam `react`, `react-native`, `expo` | Confirmada | grep em `packages/**` (sem testes): zero imports estáticos |
| Só `packages/storage` toca `expo-sqlite` | Confirmada | `packages/storage/src/sqliteAdapter.ts` (import dinâmico); nada em `src/`, `app/`, `lib/`, `shared/` |
| Reducers sem `Date.now`/`Math.random` | Confirmada | `packages/*/src/reducer.ts` e `domain/src/replay.ts`: só campos `startDate`/`lastActiveDate` |
| "Ids e timestamps nascem na casca (`createEvent` em `packages/events`)" | **Contraditória em si** | `createEvent`/`generateId` usam `Date.now()`/`Math.random()` dentro de `packages/events/src/factory.ts`; também `packages/wishlist/src/commands.ts` (id e timestamp próprios), `packages/parsers/*` (ids e `createdAt`), `packages/season/src/seasonEngine.ts`, `gamification/.../achievementChecker.ts` (`new Date()`) |
| Direção `gamification → domain → events`, `parsers → events`, "o resto é isolado" | **Parcialmente falsa** | `packages/ai` importa `../../../events/src/types` (`FinancialAnalysisEngine.ts`, `ProfileCalculator.ts`); não consta no diagrama. `gamification → domain` e `domain → events` e `parsers → events` conferem (só imports de tipo em `xpEngine.ts` e `ncmCategories.ts`) |
| `INSERT OR IGNORE` | Confirmada | `packages/storage/src/eventStore.ts` (`INSERT_EVENT_SQL`); `id TEXT PRIMARY KEY` |
| Roteamento em `replayAllEvents` | Confirmada, com ressalva | `AppStateProvider.tsx:96-131`: cinco `if` independentes por `Object.values(X_EVENTS).includes(type)`; domain, gamification, onboarding, season, wishlist. Personality não roteado (confirma Deferred). Não é exclusivo: um tipo em dois namespaces seria dobrado duas vezes |
| `useGamificationEffects` emite eventos | Confirmada, com ressalva | Emite via `dispatchGamEvent`/`getEventStore().appendEvent`. Mas há lógica de "XP recovery" duplicada: efeito real em `AppStateProvider.tsx:187+` (id `xp-recovery-*`) e um efeito vazio em `useGamificationEffects.ts` |
| Stack vs `package.json` | Confere | Expo ~54.0.33, RN 0.81.5, React 19.1.0, TS ~5.9.2, expo-router ~6.0.23, expo-sqlite ^16.0.10, nostr-tools ^2.23.1, vitest ^4.0.18, tamagui ^2.0.0-rc.26, express ^5.0.1. Node 20 confere com os workflows |
| Pipelines (diagrama) | Confere | `.eas/workflows/{build,create-production-builds,deploy-web}.yml`; `.github/workflows/build-android.yml` (APK+AAB+Web) e `build-ios.yml`; `.gitlab-ci.yml` |
| `SyncEvent` duplicado em storage e sync | Confirmada | `packages/storage/src/eventStore.ts`, `packages/sync/src/types.ts` |
| Só `webrtcFactory.ts` importa `packages/sync` | Confirmada | único match em `src/`/`app/` |
| ESLint ignora `packages/*`; sem `test`/`typecheck` | Confirmada | `eslint.config.js` `ignores`; `package.json` scripts |

## Achados

### F1 — critical — AD-6 é violada pelo código e o spine a declara como se valesse
- **Fato:** `GROUP_CODE_KEY = "domus_nostr_group_code"` é gravado em `AsyncStorage` (`useSyncEngine.ts:361,401`; `syncStorage.ts:6`). O código de grupo é a origem das chaves (`deriveKeysFromCode` em `nostrSync.ts:230`) e, pelo próprio AD-2, "a confiança vem da chave do grupo". Além disso `useGoogleDriveBackup.ts:9` e `GoogleDriveService.ts:83` leem `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET`, que o Expo embute no bundle (segredo público de fato).
- **Impacto:** a Rule "nada de segredo em AsyncStorage" é desmentida pelo componente mais sensível (sync); um agente que a siga "corrige" o código e quebra pareamentos existentes, outro a ignora.
- **Correção proposta:** marcar AD-6 como `[ADOPTED com exceções]` e listar as exceções conhecidas; decidir o destino do group code (mover para `expo-secure-store` com migração de leitura dupla) ou ratificá-lo como metadado aceito com motivo; proibir `EXPO_PUBLIC_*` para qualquer segredo e abrir decisão sobre o client secret do Drive.

### F2 — high — AD-3 mistura duas regras e uma delas é contraditória com o código
- **Fato:** a Rule diz que ids/timestamps "nascem na casca" mas aponta `createEvent` de `packages/events`, que os gera com `Date.now()`/`Math.random()`. Além de `packages/events`, `packages/wishlist/src/commands.ts` e `packages/parsers/*` têm geradores próprios (cópias de `generateId`; `packages/core`, `packages/sync` também). `packages/ai` depende de `events`, fora do diagrama, contrariando "o resto é isolado".
- **Impacto:** a Rule não impede divergência (três geradores de id coexistem) e o diagrama de dependência está errado para `ai`.
- **Correção proposta:** reescrever: "reducers e engines de replay são puros; geradores de id/tempo vivem apenas em `packages/events/src/factory.ts` e são chamados pela casca ou por comandos (`commands.ts`) — nunca dentro de reducer". Declarar `generateId` único (events) e listar wishlist/parsers como dívida a consolidar. Acrescentar `ai → events` ao diagrama. Adicionar verificação: grep proibindo `Date.now|Math.random|new Date` em `reducer.ts`.

### F3 — high — AD-4: divergência real de roteamento só aparece como "Aberto" em Deferred, e o roteamento não é exclusivo
- **Fato:** `PERSONALITY_EVENTS.ARCHETYPE_UPDATED` não é roteado (`AppStateProvider.tsx:109-128`). `packages/parsers/src/types.ts` declara um segundo `EVENT_TYPES` (`INVOICE_IMPORTED`, `INVOICE_CONFIRMED`) com o mesmo nome do `EVENT_TYPES` de `packages/events`, também sem rota. O roteamento usa cinco `if` independentes, não `switch` exclusivo.
- **Impacto:** o pior caso que o AD-4 diz prevenir (evento ignorado em silêncio) já ocorre, e o nome duplicado `EVENT_TYPES` convida a importação errada. Item de Deferred que pode fazer duas unidades divergirem (violação do ponto 3).
- **Correção proposta:** tirar do Deferred e decidir: ou rotear personality (reducer existe) ou declarar o evento como efêmero e removê-lo; renomear `EVENT_TYPES` de parsers (`PARSER_EVENTS`); exigir teste que percorra todos os `*_EVENTS` e falhe se algum tipo não tem reducer; exigir que um tipo pertença a um único namespace.

### F4 — high — AD-2/AD-6 ignoram o segundo armazenamento do log (web) e a ordenação não determinística
- **Fato:** em `Platform.OS === "web"` o log inteiro é gravado e hidratado de `AsyncStorage` (`EVENTS_BACKUP_KEY`, `useEventStore.ts`), contra "SQLite única dona". Na hidratação, eventos com `deviceId` vazio/"local" são reescritos em memória. Ordem `ORDER BY timestamp ASC` sem desempate (admitido em Deferred) e re-sort em memória em vários pontos.
- **Impacto:** `deploy-web` é um alvo real do pipeline, e o scope diz "Android primeiro" sem dizer o que vale na web; o desempate por `id` está em Deferred mas afeta replay determinístico entre aparelhos, que é o ponto central do AD-8.
- **Correção proposta:** nova decisão "plataformas e armazenamento do log" (web usa AsyncStorage como adaptador de storage, ou web é fora de escopo); promover o desempate `ORDER BY timestamp, id` de Deferred para AD-2/AD-8 (é barato, não muda o formato do evento).

### F5 — medium — Envelope operacional incompleto e itens de Deferred que causam divergência
- **Fato:** o spine descreve três pipelines paralelos (EAS, GitHub Actions, GitLab CI) sem dizer qual é o canônico para release; `eas.json` usa `appVersionSource: local` e a versão é bumpada por commit manual; `server/` e `scripts/build.js` dependem de `REPLIT_*`, e o próprio spine marca `replit.*` como intocável; `server/` Express + `drizzle`/`pg`/`@neondatabase/serverless` estão sem dono, ambiente e deploy. Não há decisão de: ambientes (dev/preview/prod), onde ficam segredos de build (`google-services.json` e `GoogleService-Info.plist` estão na raiz), canal de updates (sem OTA/`runtimeVersion` decidido), política de versionamento do esquema de eventos (nenhum campo de versão; evolução só por tipos novos), observabilidade (Firebase instalado mas sem regra de uso) e relays Nostr (quais, política de falha).
- **Impacto:** duas unidades podem escolher pipelines/ambientes diferentes; evento com payload evoluído quebra aparelhos antigos sem regra.
- **Correção proposta:** adicionar um AD "Release e ambientes" nomeando o pipeline canônico (sugestão: EAS para produção, GH/GitLab como CI alternativo, a confirmar com o dono) e marcar cada dimensão restante como Decidida/Adiada/Aberta com o gatilho de revisão. Acrescentar AD de evolução de payload (compatibilidade para trás: campos novos opcionais, nunca renomear/remover). Dividir o item único "Operação e infra" de Deferred em linhas separadas.

### F6 — medium — Rules de AD-5 e AD-1 têm furos de aplicabilidade
- **Fato:** AD-5 afirma que a casca emite eventos e reducers nunca decidem, mas há dois efeitos de recuperação de XP (um morto em `useGamificationEffects`, um ativo em `AppStateProvider`), e `AppStateProvider` calcula `budget`/`levelInfo` com `new Date()` no render (derivados, não persistidos: OK com AD-1). AD-1 fala em "dispatch → log → replay", mas `useGamificationEffects` e `AppStateProvider` escrevem direto via `getEventStore().appendEvent` e `setAllEvents`, contornando `dispatch`.
- **Correção proposta:** AD-1: "toda escrita no log passa pelo `dispatch` do `useEventStore`"; AD-5: nomear um único dono dos efeitos derivados (`useGamificationEffects`) e registrar o efeito de XP recovery duplicado como dívida; exigir idempotência por id determinístico em efeitos (hoje `xp-recovery-${generateId()}` depende de checagem por prefixo de id).

### F7 — low — Imprecisões menores
- Stack não lista `@react-native-async-storage/async-storage`, `expo-secure-store`, `@noble/*`, `drizzle-orm` e Firebase, tecnologias que as Rules citam (AD-6, AD-8).
- AD-7 cita `src/utils/formatCurrency.ts`: existe e confere; porém nada impede `toFixed` ad hoc em telas (sem verificação).
- Convenções dizem `@shared/*`; o alias existe em `tsconfig.json` e `vitest.config.ts`. Imports entre packages misturam `../../x/src` e `@packages/x/src` (domain usa ambos); definir um único estilo.
- Convenção "cada package tem `index.ts`, `src/` e `__tests__/`": `packages/wishlist` não tem `__tests__/`.
- Itens "Qualidade" em Deferred deixam AD-3 sem verificação automática: o ESLint ignora `packages/*` e não há script `test`/`typecheck`; considere promover a uma regra de CI mínima (vitest já está instalado e há `vitest.config.ts`).

## Checklist

| # | Critério | Resultado |
| --- | --- | --- |
| 1 | Fixa os pontos de divergência reais, sem perder nenhum | Parcial: faltam versionamento de payload, plataforma web/armazenamento do log, gerador único de id, pipeline canônico |
| 2 | Rule aplicável e que impede a divergência | Parcial: AD-1, AD-2, AD-7 boas; AD-3 contraditória (F2); AD-4 não verificável sem teste (F3); AD-5 com furo (F6); AD-6 violada (F1) |
| 3 | Nada em Deferred pode causar divergência | Falha: desempate por `id`, `PERSONALITY_EVENTS` e "Operação e infra" podem divergir unidades |
| 4 | Tecnologia confere com `package.json` | Passa (lista incompleta, F7) |
| 5 | Ratifica o código sem contradizê-lo | Parcial: contradiz em AD-6 e AD-3; marcação `[ADOPTED]` em AD-6 é incorreta |
| 6 | Altitude (initiative) com todas as dimensões decididas/adiadas/abertas | Parcial: envelope operacional agregado em um único bullet de Deferred (F5) |

## Pontos fortes
- Diagrama de dependência, `INSERT OR IGNORE`, `expo-sqlite` isolado, reducers puros, `packages/sync` congelado e `webrtcFactory` como único consumidor conferem com o código.
- Deferred honesto sobre XOR, ausência de assinatura e `core` legado.
