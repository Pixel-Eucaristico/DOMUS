# OrcaFacil

## Overview
App fintech de orcamento pessoal focado em Android. Monorepo com Expo SDK 54, TypeScript strict, Expo Router.
Arquitetura Event Sourcing + Offline-First radical. Sem backend, sem servidor, 100% local.

## Project Structure
```
/packages/events      -> Tipagem global de eventos (DomainEvent, EventType, factory)
/packages/domain      -> Reducers e regras de negocio (contas, transacoes, 50/30/20, replay)
/packages/storage     -> EventStore SQLite (persistencia local via expo-sqlite)
/packages/core        -> Nucleo financeiro legado (tipos, contas, transacoes, orcamento, projecoes)
/packages/sync        -> Sincronizacao P2P via WebRTC + Event Sourcing
/packages/parsers     -> Parsers de nota fiscal (NFC-e, SEFAZ, OCR) + classificacao
/packages/gamification -> XP engine, level engine, streak engine, reducer
/packages/season      -> Seasons mensais, avaliacao, badges, evolucao de arquetipo
/packages/personality -> 6 arquetipos, deteccao de perfil, tone engine, evolucao
/packages/onboarding  -> 7 dias adaptivos, missoes por dificuldade, adaptive engine
/packages/theme       -> Temas por arquetipo (6 paletas elegantes/sobrias)
/packages/ai          -> Inteligencia artificial (placeholder - Gemini opcional)
/packages/wishlist    -> Lista de desejos (placeholder)
/app                  -> Camada UI separada do dominio (Expo Router)
/src/components       -> Componentes reutilizaveis do app
/src/hooks            -> Custom hooks
/src/modules          -> Modulos de funcionalidades
/src/services         -> Servicos
/src/theme            -> Tema (cores, espacamento)
/src/types            -> Tipos globais do app
```

## Theme
- primary: #1B5E63
- secondary: #4CAF50
- background: #F4F6F8
- danger: #E53935
- Font: DM Sans

## Recent Changes
- 2026-02-11: Projeto inicial criado com estrutura monorepo
- 2026-02-11: Nucleo financeiro implementado em /packages/core (33 testes)
- 2026-02-12: Sistema de sync P2P implementado em /packages/sync (46 testes):
  - Event Sourcing: EventStore com append, getEventsSince, replayEvents, assinatura digital
  - WebRTC: WebRTCManager com STUN publico, data channels, QR signaling
  - Mesh: MeshManager com broadcast, syncWithPeer, heartbeat, peer discovery
  - Protocolo: HANDSHAKE, EVENT_BATCH, PEER_LIST, HEARTBEAT
  - Conflitos: lastWriteWins com desempate por deviceId, deduplicacao
  - Crypto: CryptoAdapter abstrato + SimpleCrypto para testes
  - Identidade: deviceId, networkId, chave pub/priv

- 2026-02-14: Modulo de nota fiscal implementado em /packages/parsers (58 testes):
  - QR Code: parseNFCeQRCode, isValidSefazUrl, extractUrlFromQRData
  - SEFAZ: parseSefazHtml, fetchAndParseSefaz (extrai items, total, data, chave acesso)
  - OCR: parseOCRText, parseFromImage (fallback via ML Kit adapter)
  - Classificacao: classifyByKeyword (70+ palavras-chave PT-BR), createGeminiClassifier, createHybridClassifier
  - Eventos: INVOICE_IMPORTED, AI_CLASSIFICATION_CORRECTED
  - Reducer: invoiceReducer para replay via EventStore (imutavel)
  - Pipeline: importFromQRCode, importFromImage, importFromHtml
  - Nao cria transacoes diretamente - emite evento para dominio

- 2026-02-14: Storage SQLite implementado em /packages/storage (23 testes):
  - SQLiteEventStore: initDatabase, appendEvent, getAllEvents, getEventsSince, eventExists, replayEvents
  - DatabaseAdapter: interface abstrata para SQLite e testes
  - createMemoryAdapter: adapter in-memory para testes unitarios
  - createSQLiteAdapter: adapter real usando expo-sqlite
  - Tabela events: id, type, payload (JSON), timestamp, deviceId, signature
  - INSERT OR IGNORE para deduplicacao
  - Estado nunca salvo no banco - apenas via replayEvents

- 2026-02-14: Pacotes events + domain implementados (70 testes):
  - /packages/events (12 testes):
    - EVENT_TYPES: ACCOUNT_CREATED, ACCOUNT_UPDATED, ACCOUNT_DELETED, TRANSACTION_CREATED, TRANSACTION_UPDATED, TRANSACTION_DELETED, CATEGORY_CREATED
    - ACCOUNT_TYPES: checking, savings, wallet, credit_card
    - TRANSACTION_TYPES: income, expense, transfer
    - CATEGORY_GROUPS: needs, wants, savings (50/30/20)
    - DomainEvent union type, createEvent factory, generateId
    - InstallmentInfo para parcelamentos
  - /packages/domain (58 testes):
    - domainReducer: processa todos os eventos, imutavel, aplica/reverte saldos
    - createAccountEvent: corrente, poupanca, carteira, cartao credito (com limite, fechamento, vencimento)
    - createTransactionEvent: gera N eventos para parcelamento, distribui resto na ultima parcela
    - calculate503020: breakdown mensal necessidades/desejos/investimentos
    - replayEvents / replayEventsSince: reconstroi estado completo a partir de eventos
    - getCreditUsage / getAvailableCredit: calcula uso do cartao
    - Conta credit_card nao altera balance em despesas (fatura separada)

- 2026-02-14: Modulo de nota fiscal implementado em /packages/parsers (58 testes):
  - QR Code: parseNFCeQRCode, isValidSefazUrl, extractUrlFromQRData
  - SEFAZ: parseSefazHtml, fetchAndParseSefaz (extrai items, total, data, chave acesso)
  - OCR: parseOCRText, parseFromImage (fallback via ML Kit adapter)
  - Classificacao: classifyByKeyword (70+ palavras-chave PT-BR), createGeminiClassifier, createHybridClassifier
  - Eventos: INVOICE_IMPORTED, AI_CLASSIFICATION_CORRECTED
  - Reducer: invoiceReducer para replay via EventStore (imutavel)
  - Pipeline: importFromQRCode, importFromImage, importFromHtml
  - Nao cria transacoes diretamente - emite evento para dominio

- 2026-02-14: Gamification implementado em /packages/gamification (77 testes):
  - XP Engine: 6 fontes de XP (transaction_logged=10, budget_adherence=5-50, mission_completed=50, daily_consistency=15, streak_bonus=0-50, season_bonus=100)
  - Level Engine: formula 100*1.5^(level-1), getLevelInfo, shouldLevelUp
  - Streak Engine: updateStreak (consecutivo +1, gap reseta a 1), isStreakActive, longestStreak preservado
  - Reducer: gamificationReducer imutavel, replayGamificationEvents reconstroi estado
  - Budget adherence XP: perfeito 50/30/20 = 50xp, desvios graduais ate 5xp

- 2026-02-14: Season implementado em /packages/season (36 testes):
  - Season Engine: createSeasonId, startSeason, endSeason, evaluateSeason, shouldEndSeason
  - Eventos: SEASON_STARTED, SEASON_ENDED, SEASON_EVALUATED, ARCHETYPE_EVOLVED, SEASON_BADGE_EARNED
  - Reducer: seasonReducer imutavel, replaySeasonEvents, historico de seasons
  - Mes calendario = 1 season, avaliacao automatica no fim

- 2026-02-14: Personality implementado em /packages/personality (39 testes):
  - 6 arquetipos: EXPLORER, ORGANIZER, PLANNER, STRATEGIST, INVESTOR, INDEPENDENT
  - Deteccao por prioridade: INDEPENDENT (all>=80) > INVESTOR > STRATEGIST > PLANNER > ORGANIZER > EXPLORER
  - ArchetypeScores: consistency, budgetAdherence, wishlistUsage, desireControl, monthlyPlanning (0-100)
  - Tone Engine: motivational (Explorer/Organizer), technical (Planner/Strategist), strategic (Investor/Independent)
  - Evolucao: shouldEvolve detecta mudanca, evolveArchetype com razao PT-BR

- 2026-02-14: Onboarding implementado em /packages/onboarding (47 testes):
  - 7 dias de missoes adaptivas com 3 niveis (easy/normal/challenging)
  - Adaptive Engine: ajusta dificuldade baseado em taxa de conclusao, NUNCA pune
  - Missoes: create_account, set_income, log_expense, review_budget, set_goal, log_3_transactions, check_503020
  - Reducer: onboardingReducer imutavel, deduplicacao de steps/days
  - Mensagens de encorajamento adaptativas por faixa de performance

- 2026-02-14: Theme implementado em /packages/theme (37 testes):
  - 6 paletas por arquetipo: explorer (teal), organizer (indigo), planner (navy), strategist (purple), investor (emerald), independent (dark)
  - Cores elegantes e sobrias (sem cores saturadas/infantis)
  - ThemeColors: primaryColor, accentColor, background, textColor, secondaryText, cardBackground, border, success, warning, danger
  - getThemeForArchetype, getDefaultTheme (explorer), isValidArchetypeTheme

- 2026-02-14: Teste de integracao completo em /packages/__tests__/integration.test.ts (18 testes):
  - Jornada completa: onboarding -> criar conta -> registrar renda -> gastos -> 50/30/20 -> XP -> level -> streak -> arquetipo -> tema -> season -> evolucao
  - Valida reconstrucao de estado via replay em todos os pacotes

## Architecture Decisions
- Sem backend/servidor - app 100% offline, local apenas
- TypeScript strict: true
- Vitest para testes unitarios
- Event Sourcing: eventos imutaveis, tipados, assinados, ordenados por timestamp
- Estado NUNCA salvo no banco - sempre reconstruido via replayEvents
- Dominio totalmente separado da UI (/packages vs /app)
- Expo Router para navegacao file-based
- Sync P2P futuro: WebRTC com STUN publico, signaling via QR code, arquitetura mesh
- Nota fiscal: request direto ao SEFAZ, fallback OCR, classificacao keyword+AI
- Classificacao: keyword primeiro (confianca >= 0.7), Gemini como fallback, correcao manual via evento
- Storage: expo-sqlite com tabela unica events, payload como JSON string, DatabaseAdapter abstrato
- IA: Gemini opcional, chave fornecida pelo usuario

## Architecture Decisions (continued)
- Gamificacao e o CORE do sistema, nao um add-on
- 6 arquetipos com ordem de prioridade: INDEPENDENT > INVESTOR > STRATEGIST > PLANNER > ORGANIZER > EXPLORER
- Onboarding NUNCA pune usuario - dificuldade so pode diminuir ou manter baseado em performance
- Season = mes calendario, avaliacao automatica, re-avaliacao de arquetipo
- Tema muda automaticamente com evolucao do arquetipo (elegante, sobrio, premium)

## Testing
- Rodar todos os testes: `npx vitest run packages/`
- Testes events: `npx vitest run packages/events/__tests__/`
- Testes domain: `npx vitest run packages/domain/__tests__/`
- Testes core: `npx vitest run packages/core/__tests__/`
- Testes sync: `npx vitest run packages/sync/__tests__/`
- Testes parsers: `npx vitest run packages/parsers/__tests__/`
- Testes storage: `npx vitest run packages/storage/__tests__/`
- Testes gamification: `npx vitest run packages/gamification/__tests__/`
- Testes season: `npx vitest run packages/season/__tests__/`
- Testes personality: `npx vitest run packages/personality/__tests__/`
- Testes onboarding: `npx vitest run packages/onboarding/__tests__/`
- Testes theme: `npx vitest run packages/theme/__tests__/`
- Teste integracao: `npx vitest run packages/__tests__/`
- Total: 484 testes passando (12 events + 58 domain + 33 core + 46 sync + 58 parsers + 23 storage + 77 gamification + 36 season + 39 personality + 47 onboarding + 37 theme + 18 integracao)
