---
title: 'Story 11.8: registrar no app os Lottie aprovados'
type: 'feature'
created: '2026-10-22'
status: 'done'
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
- [x] Registro dos 117 com carregamento sob demanda (getter por nível), mantendo os 81 já aprovados
- [x] Prop de nível (1/2/3) no `LottieTrophy` para sazonais e litúrgicos; as 4 telas passam a usá-lo
- [x] Crédito na tela Sobre; `assets/lottie/trophies/aprovados.sha256.json` e teste
- [x] Testes: todo `lt_*` e sazonal com Lottie no mapa; nível → arquivo; lista de hash

**Acceptance Criteria:**
- Given um litúrgico conquistado, when abro o álbum ou o detalhe, then vejo o Lottie do nível conquistado
- Given o DebugTools, when listo os troféus, then cada um mostra o seu Lottie nos 3 níveis
- Given um arquivo aprovado alterado, when rodo os testes, then o teste de hash falha

## Spec Change Log

- **Nível em jogo (decisão do dono, 22/10/2026):** no card surpresa e no detalhe do troféu do mês atual ainda não concluído, a animação mostra o nível sorteado (Prata/Ouro), igual à etiqueta, à cor e ao texto de compartilhamento. Nos meses passados não concluídos do álbum continua o bronze esmaecido.

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Widget da tela inicial mostra bronze em troféus de ouro; litúrgico tipado como sazonal | high | Antes `rarity="gold"` → `t3`. **patch** — aplicado: `widgetLottieProps` (nível sorteado do mês = nível em jogo; `lt_*` → litúrgico). |
| Troféu estático em branco na web (quadro 0 vazio; `play(89,89)` antes de carregar) | medium | `index.web.js` retorna sem `dotLottie`. **patch** — aplicado: `StaticLottieWeb.web.tsx` (dotLottie direto, `setFrame` no `load` ou na hora se já carregou); nativo `progress={1}`. Conferido no build web. |
| Card surpresa/detalhe: etiqueta Ouro com arte bronze | medium | **patch** — aplicado: `currentMonthLottieTier` no card; `detailLottieTier` no detalhe. |
| Álbum e detalhe tiram o nível de lugares diferentes; telas sem teste da regra | medium (gap) | **patch** — aplicado: `albumLottieTier`, `detailLottieTier` (vai no `AlbumTrophySelection.lottieTier`), `currentMonthLottieTier`, `widgetLottieProps`, testados. |
| Fallback para o SVG (getter que falha, `onAnimationFailure`) sem teste; falha lembrada só para uma chave | medium (gap) | **patch** — aplicado: `resolveLottieSource` puro e testado; falhas num `Set`. |
| `tier: null` ou `"2"` vira bronze | low | **patch** — aplicado (`clampTier` aceita null/string). |
| Teste "arquivo aprovado alterado" não pega regressão; só 3 sazonais conferidos no mapa | low (gap) | **patch** — aplicado: 48 sazonais + todo `lt_*`; teste novo altera a cópia de `lt_tome_t2.json` e `compareApprovedHashes` acusa. |
| `--check` falha com CRLF; `ID_LINE` aceita objeto aninhado | low | **patch** — aplicado: `--check` compara o JSON lido; hash normaliza CRLF; só entradas de primeiro nível (menor indentação). |
| Comentários exageram o carregamento sob demanda (o JSON vai no pacote; só a avaliação é adiada) | low | **patch** — aplicado no texto. |
| Troféu bloqueado do álbum perde o tom cinza | low | **reject**: o Lottie não aceita tingir; fica o esmaecido (opacidade 0,35). |
| Linhas do DebugTools só com ícone; os 3 níveis ficam no detalhe | low | **reject**: o detalhe mostra os 3 níveis, que é o que o AC pede. |
| T4 do DebugTools: arte ouro com cor de diamante | low | **reject**: não existe Lottie diamante para sazonais; documentado. |
| Geradores antigos (`gen_seasonal_tiers.js`, `gen_trophy_*.js`) sobrescrevem aprovados | low | **defer** (D29); o teste de hash já acusa depois. |
| `--check` do script sem teste | low | **defer**: o teste do vitest é a trava do D28. |

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas
- `npx expo export --platform web` gera sem erro

## Implementation Notes

- **Registro:** `APPROVED_LOTTIE` saiu do `LottieTrophy.tsx` para `src/components/gamification/approvedLottie.ts` (sem react-native). Cada nível é um getter `() => require("@/assets/lottie/trophies/….json")` com literal estático. Os JSON continuam no pacote do app (o Metro empacota todo require estático); o getter só adia a avaliação de cada módulo (parse e objeto em memória) até o troféu aparecer. 80 entradas antigas (a proposta falava em 81; o mapa tinha 80) mantidas com os mesmos arquivos + 117 novas (114 `lt_*` de `liturgicalTrophies/data.ts` + `seasonal_decimo_terceiro`, `seasonal_ferias_verao`, `seasonal_balanco_anual`) = 197 ids, 637 arquivos.
- **Nível:** `lottieTierSelection.ts` (puro): `lottieTierKey` (sazonal/litúrgico: 1/sem nível → `base`, 2 → `t2`, 3+ → `t3`; conquista pela `rarity` → t1..t4; mensal → `base`), `selectLottieGetter`, `clampTier` (aceita `null` e `"2"`), `earnedSeasonalTier` (tier da conclusão — `!= null` — senão o do sorteio; não concluído → bronze), `albumLottieTier` (= conquistado; não concluído → bronze esmaecido, inclusive no mês atual), `currentMonthLottieTier` (mês atual: conquistado ou, se ainda não concluído, o nível em jogo — decisão do dono), `detailLottieTier` (mês atual → nível em jogo; passado → conquistado/bronze), `widgetLottieProps` (`currentTrophy.tier` é o nível sorteado do mês = nível em jogo; `lt_*` → `type="liturgical"`), `resolveLottieSource` (id desconhecido, arquivo que já falhou ou getter que lança → undefined → SVG) e `staticLottieFrame` (último quadro, `op − 1`).
- **LottieTrophy:** prop `tier`; fonte por `resolveLottieSource`; falhas (`onAnimationFailure`, ou `loadError` na web) num `Set` de id+nível, então trocar de nível tenta o outro arquivo. Estático: no nativo `LottieView` com `progress={1}` e autoPlay desligado; na web `StaticLottieWeb.web.tsx` usa o `DotLottieReact` direto e faz só `setFrame(último)` no `load` (ou na hora, se já carregou). Motivo: na web o `progress` não é suportado, `play()` antes de carregar não faz nada e `play(n, n)` = `setFrame` + `play()`, que num Lottie sem loop recomeça do quadro 0 (vazio nos gerados) — conferido isolado com o dotlottie-web 0.44. `StaticLottieWeb.tsx` (nativo) não é usado. O div do dotLottie leva `flexShrink: 0` para manter o 1,45×.
- **Telas:** álbum (`albumLottieTier`, 36, estático e esmaecido como antes), detalhe (`selection.lottieTier` = `detailLottieTier`, 140), card surpresa (`currentMonthLottieTier`, 80: troféu do mês ainda não concluído mostra o nível sorteado, igual à etiqueta/cor/texto), widget da tela inicial (`widgetLottieProps`, 60, estático) e DebugTools (seletor T1–T4 → bronze/prata/ouro, T4 = ouro; o detalhe mostra os 3 níveis lado a lado). Mesmos `size` de antes; o `LottieTrophy` desenha a 1,45× com `overflow: hidden`.
- **Scripts:** `scripts/lottie-lib` lê o novo arquivo (`readApprovedIds`, `readApprovedFiles`, `approvedFileList`, `computeApprovedHashes`, `compareApprovedHashes`), aceitando `nível: require(...)` e `nível: () => require(...)`; só linhas `"id": {` na menor indentação viram id (objeto aninhado não). O hash normaliza CRLF → LF (os arquivos atuais só têm LF; a lista não mudou). `--check` compara o JSON lido e lista alterados/faltando/sobrando. Os geradores de lote continuam recusando ids aprovados — agora rodar qualquer lote é recusado. O teste do lote 5 "nenhum id em APPROVED_LOTTIE" virou "todo id em APPROVED_LOTTIE".
- **D28:** `assets/lottie/trophies/aprovados.sha256.json` (637 arquivos), `node scripts/lottie-approved-hashes.js` (`--check` só confere), teste `scripts/__tests__/lottieApprovedHashes.test.ts` (inclui cópia de `lt_tome` com o prata alterado → acusado; CRLF → não acusado). **D26:** crédito em `app/about.tsx`, card "Sobre o DOMUS".
- **Verificação:** `npx vitest run` 55 arquivos / 1013 testes passando (baseline 53/987); `npx tsc --noEmit` 0 erros; `npx expo export --platform web` gera sem erro. No build web servido localmente (Playwright/Chromium, estado novo com `domus_is_catholic_v1=true` para o sorteio do mês): o troféu estático do widget "Troféu do Mês" (lt_* de outubro) e a célula "Out" do álbum na Temporada aparecem no quadro final (pixels opacos estáveis ao longo do tempo; antes da correção o widget ficava 100% transparente no primeiro acesso). DebugTools não entra no build de produção (`__DEV__`), então não foi conferido na web.
