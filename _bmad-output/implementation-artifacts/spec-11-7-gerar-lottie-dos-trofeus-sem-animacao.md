---
title: 'Story 11.7: Gerar o Lottie dos troféus sem animação própria (lote 1)'
type: 'feature'
created: '2026-10-21'
status: 'in-review'
baseline_commit: 'a0d7864fd587a7ce3f4d7a71931058921c21c5d8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-21-lottie-todos.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 117 troféus não têm Lottie (114 litúrgicos `lt_*` e 3 sazonais). Cada gerador de `scripts/` repete o mesmo código (conversão SVG→Lottie, brilhos, halo, níveis), o que torna caro gerar mais 117.

**Approach:** Extrair o código comum dos geradores para uma biblioteca em `scripts/` e gerar, a partir de uma tabela por troféu, o **lote 1**: os 3 sazonais (`seasonal_decimo_terceiro`, `seasonal_ferias_verao`, `seasonal_balanco_anual`) e os 10 litúrgicos de janeiro. Cada troféu tem um elemento visual próprio, com a fonte e a licença citadas. A aprovação e o registro no app são da Story 11.8.

## Boundaries & Constraints

**Always:** mesmo formato dos Lottie atuais (v5.7.4, 30 fps, 90 quadros, 200×200, entrada + balanço + brilhos + halo); sazonais com 3 níveis (`x.json` = bronze, `x_t2` prata, `x_t3` ouro, como `seasonal_natal`); litúrgicos com um nível só (`lt_x.json`), porque não têm nível no app; ícones só de fontes abertas (Twemoji CC-BY 4.0, Tabler MIT, Font Awesome Free, Bootstrap Icons MIT), citadas no código; nenhum par de troféus com o mesmo desenho; os geradores atuais continuam funcionando sem mudança de saída.

**Never:** registrar em `APPROVED_LOTTIE` nem mudar a tela (Story 11.8); sobrescrever JSON de troféu já aprovado; baixar ícone em tempo de execução do app.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sazonal do lote | `seasonal_ferias_verao` | `seasonal_ferias_verao.json`, `_t2`, `_t3` | N/A |
| Litúrgico do lote | `lt_epifania` | `lt_epifania.json` | N/A |
| Troféu já aprovado | id em `APPROVED_LOTTIE` | gerador recusa e não escreve | mensagem de erro |
| Desenho repetido | dois ids com o mesmo elemento | o teste de lote falha | N/A |
| Gerador antigo | `node scripts/gen_trophy_seasonal_natal.js` | saída idêntica à de hoje | N/A |

**Decisão do dono (21/10/2026):** litúrgicos com o **símbolo do santo ou da festa** (atributo iconográfico: chaves, lírio, flechas, estrela etc.), com auréola e raios; um símbolo diferente por troféu.

</frozen-after-approval>

## Code Map

- `scripts/gen_trophy_seasonal_natal.js:28-257` -- modelo: `parsePath` (svgpath), `makeFill`, `makeEllipse`, `buildLottie` (camada principal cai de y=−55 e balança ±4, 5 brilhos, halo 175×175), `TIERS` com 3 cores, laço de escrita
- `scripts/gen_trophy_seasonal_decimo_terceiro.js` -- já gerou `seasonal_decimo_terceiro*.json` (não aprovado); será substituído pelo novo gerador
- `scripts/trophy-templates.js` -- tabela sem uso (`mainType`/`decoType`); pode virar a tabela do lote ou ser removida
- `scripts/gen_verts_*.js`, `scripts/lottie-verts-*.json`, `scripts/ref-*.svg` -- caminho antigo de vértices prontos
- `svgpath` em `package.json:106`, instalado
- Dados: `packages/gamification/src/liturgicalTrophies/data.ts` (janeiro: 10 troféus, `month: 1`), `seasonalTrophies/trophyData.ts:818,834,858`
- Pistas temáticas: `src/components/gamification/TrophyDecorationFactory.tsx:18-287` (grupos: marianos, festas de Cristo, cruz, apóstolos, doutores, fundadores, mártires, santos modernos, anjos, caridade; sazonais)
- `src/components/gamification/LottieTrophy.tsx:17-474` -- ids aprovados (não tocar nesta story)

## Tasks & Acceptance

**Execution:**
- [x] `scripts/lottie-lib/` (novo) -- funções comuns extraídas (svg→shapes, preenchimento, brilhos, halo, montagem do Lottie, escrita com recusa de id aprovado)
- [x] `scripts/trophy-lot-1.js` (novo) -- tabela do lote 1 (id, elemento SVG com fonte e licença, cores, níveis) e geração
- [x] `assets/lottie/trophies/` -- JSONs do lote 1 (9 sazonais + 10 litúrgicos)
- [x] `scripts/__tests__/` ou `src/constants/__tests__/` -- teste do lote: todos os ids existem no app, cada arquivo é um Lottie válido (v, fr, op, w, h, layers), nenhum id já aprovado foi escrito, nenhum desenho repetido
- [x] `scripts/gen_trophy_seasonal_natal.js` -- conferir que a saída não mudou

**Acceptance Criteria:**
- Given o lote 1, when rodo `node scripts/trophy-lot-1.js`, then os 19 arquivos são gerados e o teste do lote passa
- Given os arquivos gerados, when os abro num player Lottie, then cada troféu mostra o seu elemento próprio animado

## Implementation Notes

- `scripts/lottie-lib/index.js`: parser SVG→shapes copiado sem mudança do `gen_trophy_seasonal_natal.js`, mais `makeFill`/`makeEllipse`/`makeRing`/`makeRays`, `iconShapes`, camadas (`mainLayer`, `sparkleLayers`, `glowLayer`, `raysLayer`), `assemble`, `readApprovedIds` (lê as chaves de `APPROVED_LOTTIE` em `LottieTrophy.tsx`) e `writeTrophy` (recusa id aprovado). Os geradores antigos não foram tocados: continuam com a própria cópia, e `seasonal_natal*.json` sai idêntico (md5 conferido).
- `scripts/trophy-lot-1.js`: ícones Twemoji 15.1.0 (CC-BY 4.0) copiados para a tabela `ICONS`, um por troféu. Sazonais sobre medalha na cor do nível (bronze/prata/ouro); litúrgicos sobre disco na cor litúrgica (branco; vermelho para mártires) com auréola dourada e 12 raios que giram 30° por ciclo (laço sem salto).
- `scripts/gen_trophy_seasonal_decimo_terceiro.js` removido: foi substituído pelo lote 1 (rodá-lo sobrescreveria a saída nova).
- `scripts/trophy-templates.js` mantido sem uso (fora do escopo).
- Teste: `scripts/__tests__/trophyLot1.test.ts`.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `node scripts/trophy-lot-1.js` -- expected: 19 arquivos escritos
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0
- `git diff --stat assets/lottie/trophies` -- expected: só arquivos do lote 1
