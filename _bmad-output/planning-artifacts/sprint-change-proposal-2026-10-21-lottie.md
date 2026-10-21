---
title: 'Sprint Change Proposal — Manter o Lottie nos troféus'
status: approved
approved: '2026-10-21'
created: '2026-10-21'
mode: batch
trigger: pedido do dono ao iniciar a Story 11.9
scope: minor
---

# Sprint Change Proposal — Manter o Lottie nos troféus

## 1. Resumo do problema

**Gatilho.** Ao começar a Story 11.9 (remover o Lottie), o dono reviu a decisão D1 de 16/10 ("Trocar o Lottie"): quer **uma animação própria para cada troféu** e prefere manter as que já existem em Lottie.

**Evidências.**
- 81 dos cerca de 93 troféus já têm Lottie aprovado (`APPROVED_LOTTIE` em `src/components/gamification/LottieTrophy.tsx`, `assets/lottie/trophies/`, 295 arquivos, 6 MB).
- 6 pontos usam `LottieTrophy`: Temporada, `GamificationWidget`, `AchievementGrid`, `AchievementToast`, `DebugTools`.
- O build web falha porque `lottie-react-native` pede `@lottiefiles/dotlottie-react` na web (adiado D7). Esse era o principal ganho técnico da 11.9.

## 2. Análise de impacto

| Item | Status | Achado |
|---|---|---|
| PRD FR-27 | [!] | "A animação por configuração substitui o Lottie" deixa de valer: a configuração passa a cobrir só os troféus sem Lottie. |
| PRD §5 | [!] | A nota "substitui a reformulação por Lottie" volta a ser "complementa". |
| Epic 11 | [!] | 11.7 e 11.8 encolhem (só troféus sem Lottie); 11.9 muda de "remover" para "fazer o Lottie funcionar na web". |
| D7 | [!] | Continua aberto até a nova 11.9. |
| Arquitetura | [x] | Sem mudança. |

## 3. Caminho recomendado

Ajuste direto, sem épico novo:

- **FR-27 (nova redação):** cada troféu tem animação própria. O Lottie aprovado vale para quem tem; quem não tem usa a animação por configuração (`trophyAnimationConfigs`). Em listas estáticas, sem efeitos. O DebugTools mostra as duas.
- **Story 11.7:** configuração por categoria e ajuste, para os troféus **sem** Lottie aprovado; o teste cobre todos esses.
- **Story 11.8:** animar pela configuração **só** onde não há Lottie; troféus com Lottie seguem iguais.
- **Story 11.9 → "Fazer o Lottie funcionar na web":** o build web volta a empacotar, conforme a decisão D-L1.

## 4. Decisão do dono

- **D-L1 — Troféus na web:** (a) instalar `@lottiefiles/dotlottie-react` para o Lottie também animar no navegador (dependência nova, atualizar `package-lock.json` com npm 10; o tamanho da versão web cresce); (b) na web, mostrar a animação por configuração (`LottieTrophy.web.tsx`), sem dependência nova (no navegador o troféu não terá a animação Lottie dele).

**Aprovada em 21/10/2026 com D-L1 = (a):** instalar `@lottiefiles/dotlottie-react`; o Lottie anima também na web.

## 5. Entrega

- **Escopo:** pequeno; edição de FR-27, §5 e de três stories.
- **Ordem:** 11.9 (web) pode vir já, pois corrige a CI; 11.7 e 11.8 seguem a ordem do Epic 11.
