---
title: 'Story 11.8: registrar no app os Lottie aprovados'
type: 'feature'
created: '2026-10-22'
status: 'in-progress'
baseline_commit: '5e78bb6'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-21-lottie-todos.md'
  - '{project-root}/_bmad-output/implementation-artifacts/deferred-work.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O dono aprovou na página os 117 Lottie novos (114 litúrgicos + 3 sazonais, 3 níveis cada, 351 arquivos), mas o app ainda mostra a animação SVG para eles: não estão em `APPROVED_LOTTIE`, e o álbum, o detalhe, o card surpresa e o DebugTools usam o `AnimatedSeasonalTrophy` direto, sem passar pelo `LottieTrophy`.

**Approach:** Registrar os 117 em `APPROVED_LOTTIE` (bronze = `base`, prata = `t2`, ouro = `t3`); levar as quatro telas para o `LottieTrophy`, com o nível que o usuário conquistou (1º = bronze, 2º = prata, 3º+ = ouro, como no `getSeasonalTier`); carregar cada JSON só quando ele for mostrado; dar o crédito do Twemoji (D26); travar os aprovados com uma lista de hash (D28).

## Boundaries & Constraints

**Always:** troféu sem Lottie aprovado continua com o SVG atual; o nível vem do estado reconstruído (`completedSeasonalTrophies`/`selectedSeasonalTrophies`), nunca de estado novo persistido; troféu não conquistado aparece no nível bronze; o JSON só é lido quando o troféu aparece (os ~17 MB não podem ser carregados na abertura do app); crédito em pt-BR na tela Sobre: "Ilustrações dos troféus com elementos do Twemoji (CC-BY 4.0) e do Bootstrap Icons (MIT)."; a lista de hash cobre todos os Lottie de `APPROVED_LOTTIE`, e um teste falha se um arquivo aprovado mudar sem atualizar a lista.

**Never:** mudar o desenho de qualquer Lottie; mudar regras de nível ou de sorteio; mexer em `packages/sync`, `ios/`, `android/`.

## I/O & Edge-Case Matrix

| Cenário | Estado | Esperado |
|---|---|---|
| Litúrgico conquistado 1 vez | `lt_tome`, tier 1 | Lottie bronze (`lt_tome.json`) |
| Conquistado 3+ vezes | tier 3 | Lottie ouro (`_t3`) |
| Não conquistado no álbum | sem conclusão | Lottie bronze estático, esmaecido como hoje |
| Troféu sem Lottie | id fora do mapa | SVG atual |
| Falha ao carregar o JSON | `onAnimationFailure` | SVG atual |

</frozen-after-approval>

## Code Map

- `src/components/gamification/LottieTrophy.tsx` -- `APPROVED_LOTTIE`, escolha do nível, fallback SVG
- `src/components/gamification/{TrophyAlbumView,TrophyDetailModal,SurpriseTrophyCard}.tsx`, `src/components/debug/DebugTools.tsx` -- usam `AnimatedSeasonalTrophy` direto
- `packages/gamification/src/seasonalTrophies/trophyEngine.ts` -- `getSeasonalTier`
- `scripts/lottie-lib/index.js` -- `readApprovedIds` (lê o mapa; precisa continuar funcionando)
- `app/about.tsx` -- crédito

## Tasks & Acceptance

**Execution:**
- [ ] Registro dos 117 com carregamento sob demanda (getter por nível), mantendo os 81 já aprovados
- [ ] Prop de nível (1/2/3) no `LottieTrophy` para sazonais e litúrgicos; as 4 telas passam a usá-lo
- [ ] Crédito na tela Sobre; `assets/lottie/trophies/aprovados.sha256.json` e teste
- [ ] Testes: todo `lt_*` e sazonal com Lottie no mapa; nível → arquivo; lista de hash

**Acceptance Criteria:**
- Given um litúrgico conquistado, when abro o álbum ou o detalhe, then vejo o Lottie do nível conquistado
- Given o DebugTools, when listo os troféus, then cada um mostra o seu Lottie nos 3 níveis
- Given um arquivo aprovado alterado, when rodo os testes, then o teste de hash falha

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas
- `npx expo export --platform web` gera sem erro
