---
title: 'Sprint Change Proposal — Lottie para todos os troféus'
status: approved
approved: '2026-10-21'
created: '2026-10-21'
mode: batch
trigger: pedido do dono ao iniciar a Story 11.7
scope: minor
---

# Sprint Change Proposal — Lottie para todos os troféus

## 1. Resumo do problema

**Gatilho.** Ao começar a Story 11.7 (animação por configuração), o dono lembrou que os 81 troféus com Lottie foram feitos pelo pipeline `scripts/gen_trophy_*.js` + `trophy-templates.js`, com aprovação visual num Artifact. Ele quer o **mesmo processo** para os 117 troféus que ainda não têm Lottie, em vez de uma animação por configuração.

**Evidências.**
- 117 de 197 troféus sem Lottie: 114 litúrgicos (`lt_*`) e 3 sazonais (`seasonal_decimo_terceiro`, `seasonal_ferias_verao`, `seasonal_balanco_anual`).
- Pipeline existente: um gerador por troféu (ex. `scripts/gen_trophy_seasonal_natal.js`), ícones de bibliotecas abertas (Tabler, Font Awesome, Bootstrap; `scripts/ref-*.svg`, `scripts/lottie-verts-*.json`), níveis por raridade (`gen_seasonal_tiers.js`), saída em `assets/lottie/trophies/`.
- `seasonal_decimo_terceiro` já tem JSON gerado (sem t1 e t4) e não aprovado.
- A Story 11.7 por configuração foi parada antes de gerar código (o rascunho foi descartado).

## 2. Análise de impacto

| Item | Status | Achado |
|---|---|---|
| PRD FR-27 | [!] | Volta a ser "cada troféu com o seu Lottie"; o SVG (`AnimatedSeasonalTrophy`) fica só como reserva até o troféu ser aprovado. |
| Epic 11 | [!] | 11.7 e 11.8 trocam de conteúdo (gerar e aprovar Lottie). `trophyAnimationConfigs` sai do plano. |
| Arquitetura | [x] | Sem mudança. |
| Tamanho do app | [!] | Hoje 6 MB para 81 troféus; os 117 novos devem somar algo parecido ou mais. |

## 3. Caminho recomendado

- **FR-27 (nova redação):** o usuário vê cada troféu com o seu Lottie aprovado, no celular e na web. Enquanto um troféu não tem Lottie aprovado, aparece a animação SVG atual. O DebugTools mostra o Lottie de cada troféu.
- **Story 11.7 → "Gerar o Lottie dos troféus sem animação própria":** um gerador por troféu (ou por grupo, com elemento próprio de cada um) no padrão dos `scripts/gen_trophy_*.js`, com ícones de licença aberta e os níveis de raridade; em lotes (ex.: por mês litúrgico).
- **Story 11.8 → "Aprovar os novos Lottie e registrar no app":** um Artifact mostra cada Lottie gerado (com os níveis) para o dono aprovar ou pedir ajuste; os aprovados entram em `APPROVED_LOTTIE` e em `assets/lottie/trophies/`.

## 4. Decisão do dono

- **D-L2 — Caminho:** Lottie para todos os troféus (escolhido em 21/10/2026).

## 5. Entrega

- **Escopo:** pequeno no plano; grande em trabalho (117 animações), feito em lotes com aprovação a cada lote.

## 6. Emenda (22/10/2026)

Revisão de UX (Sally) do lote 1: os 13 troféus tinham a mesma coreografia, com ícone parado num disco, e os níveis só trocavam a cor. Aprovado pelo dono:

- **Gesto próprio por troféu** e **níveis que aumentam o gesto**, registrados em `guia-de-movimento-dos-trofeus.md`.
- **Litúrgicos com 3 níveis** (bronze, prata, ouro), como os sazonais: o app já calcula o nível deles por `getSeasonalTier`; só faltava a animação.
- Sem medalha em volta, como o `seasonal_natal` aprovado.
- O lote 1 é refeito com essa regra (13 troféus × 3 níveis = 39 animações) antes dos demais lotes.
