# OrcaFacil

## Overview
App fintech de orcamento pessoal focado em Android. Monorepo com Expo SDK 54, TypeScript strict, Expo Router.

## Project Structure
```
/apps/mobile          -> (root-level app/ directory via Expo Router)
/packages/core        -> Nucleo financeiro (tipos, contas, transacoes, orcamento, projecoes)
/packages/storage     -> Persistencia local (a implementar)
/packages/sync        -> Sincronizacao P2P via WebRTC + Event Sourcing
/packages/ai          -> Inteligencia artificial (a implementar)
/packages/parsers     -> Parsers de nota fiscal (NFC-e, SEFAZ, OCR) + classificacao
/packages/wishlist    -> Lista de desejos (a implementar)
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

## Architecture Decisions
- Sem backend/servidor - app local apenas
- TypeScript strict: true
- Vitest para testes unitarios
- Expo Router para navegacao file-based
- React Query + AsyncStorage para estado (futuro)
- Sync P2P: WebRTC com STUN publico, signaling via QR code, arquitetura mesh
- Event Sourcing: eventos imutaveis, assinados, ordenados por timestamp
- Nota fiscal: request direto ao SEFAZ, fallback OCR, classificacao keyword+AI
- Classificacao: keyword primeiro (confianca >= 0.7), Gemini como fallback, correcao manual via evento

## Testing
- Rodar todos os testes: `npx vitest run packages/`
- Testes core: `npx vitest run packages/core/__tests__/`
- Testes sync: `npx vitest run packages/sync/__tests__/`
- Testes parsers: `npx vitest run packages/parsers/__tests__/`
- Total: 137 testes passando (33 core + 46 sync + 58 parsers)
