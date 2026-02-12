# OrcaFacil

## Overview
App fintech de orcamento pessoal focado em Android. Monorepo com Expo SDK 54, TypeScript strict, Expo Router.

## Project Structure
```
/apps/mobile          -> (root-level app/ directory via Expo Router)
/packages/core        -> Nucleo financeiro (tipos, contas, transacoes, orcamento, projecoes)
/packages/storage     -> Persistencia local (a implementar)
/packages/sync        -> Sincronizacao (a implementar)
/packages/ai          -> Inteligencia artificial (a implementar)
/packages/parsers     -> Parsers de extratos (a implementar)
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
- 2026-02-11: Nucleo financeiro implementado em /packages/core com:
  - Modelos: Account, Transaction, Installment, Category, BudgetBreakdown
  - Logica de contas: create, applyToBalance, applyTransfer
  - Logica de transacoes: createTransaction com suporte a parcelas
  - Orcamento 50/30/20: calculate503020, getIdeal503020
  - Projecoes: projectFutureBalance
  - 33 testes unitarios passando (vitest)

## Architecture Decisions
- Sem backend/servidor - app local apenas
- TypeScript strict: true
- Vitest para testes unitarios
- Expo Router para navegacao file-based
- React Query + AsyncStorage para estado (futuro)

## Testing
- Rodar testes: `npx vitest run packages/core/__tests__/`
