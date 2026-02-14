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

## Testing
- Rodar todos os testes: `npx vitest run packages/`
- Testes events: `npx vitest run packages/events/__tests__/`
- Testes domain: `npx vitest run packages/domain/__tests__/`
- Testes core: `npx vitest run packages/core/__tests__/`
- Testes sync: `npx vitest run packages/sync/__tests__/`
- Testes parsers: `npx vitest run packages/parsers/__tests__/`
- Testes storage: `npx vitest run packages/storage/__tests__/`
- Total: 230 testes passando (12 events + 58 domain + 33 core + 46 sync + 58 parsers + 23 storage)
