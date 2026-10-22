---
title: 'Story 11.7: lote 5 de Lottie (outubro a dezembro)'
type: 'feature'
created: '2026-10-22'
status: 'in-progress'
baseline_commit: 'beb29fc'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-7-lote-4.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Faltam 32 troféus litúrgicos sem Lottie (outubro a dezembro, mais Cristo Rei). Os lotes 1 a 4 já foram gerados; os lotes 1 a 3 estão aprovados pelo dono.

**Approach:** Gerar o **lote 5**, o último: os 32 litúrgicos da §8 do guia, 3 níveis cada (96 arquivos), em `scripts/trophy-lot-5.js` registrado em `scripts/lottie-lib/lots.js`. Com ele, os 117 troféus sem animação própria passam a ter Lottie.

## Boundaries & Constraints

**Always:** as regras das §6 a §8 do guia (luz só com `luzSuave`; pessoa em ação = `figura` ou `busto`; Maria grande e visível; nada que lembre jogo ou aposta, nem moedas à mostra em Nicolau; terço e objetos católicos desenhados; peça principal nunca repetida entre os cinco lotes e os sazonais aprovados, inclusive nos níveis prata e ouro); cores da lista da §8 (vermelho, roxo, branco); tom de pele `PELE_ESCURA` para Aparecida e Martinho de Porres, `PELE` para os demais; Santos Inocentes e Luzia sem nenhuma cena de violência ou sangue; mesmo formato e verificações comuns (`checkLot`, `uses`, luzes conferidas, auréola no eixo da cabeça); peças de Twemoji 15.1.0 e Bootstrap Icons 1.11.3 com fonte, ou desenhadas e declaradas.

**Never:** mudar qualquer arquivo dos lotes 1 a 4; registrar em `APPROVED_LOTTIE` ou mudar telas (Story 11.8).

</frozen-after-approval>

## Code Map

- `scripts/trophy-lot-4.js` -- modelo mais recente (`figura`, `busto`, `naPose`, `uses`, `SEM_HALO`)
- `scripts/lottie-lib/` -- `desenhos.js` (`tercoShapes`, `coroaShapes`, `palmaShapes`, `estrelaShapes`, `asaShapes`, `cordeiroShapes`, `nuvemShapes`, …), `lots.js`
- `scripts/__tests__/trophyLotChecks.ts` (`guideRows`) + `trophyLot5.test.ts` no padrão do lote 4

## Tasks & Acceptance

**Execution:**
- [x] `scripts/trophy-lot-5.js` e registro em `lots.js`
- [x] `assets/lottie/trophies/` -- 96 arquivos
- [x] `scripts/__tests__/trophyLot5.test.ts`

**Acceptance Criteria:**
- Given o lote 5, when rodo `node scripts/trophy-lot-5.js`, then 96 arquivos são gerados, todos os testes passam e os lotes 1 a 4 continuam idênticos
- Given os 5 lotes, when conto os `lt_*` de `liturgicalTrophies/data.ts`, then todos têm os 3 níveis em `assets/lottie/trophies/`

## Implementation Notes

- `scripts/trophy-lot-5.js`: os 32 gestos da §8, com prata (`T2_*`) e ouro (`T3_*`). Nenhuma peça de fora: as 32 peças principais e tudo o que a prata e o ouro acrescentam são desenhados (`ICONS` vazio, `uses` vazio), então nenhum nível repete a peça principal de outro troféu.
- Biblioteca (`lottie-lib/desenhos.js`, só acréscimos): `PELE_ESCURA`, `masculino`/`bustoHomem`/`figuraHomem` (rosto de homem: cabelo curto rente, orelhas, sobrancelhas, nariz, sem bochechas; barba, bigode e tonsura opcionais), `grupo`/`grupoAnimado`, `tercoContas`, `letrasShapes`, `rosaShapes`, `lirioShapes` e `paoShapes`. `lots.js` registra o lote 5.
- `trophyLotChecks.ts`: o motivo "sem pessoa no desenho" passa a valer no `SEM_HALO` (São João da Cruz: a chama, o monte e o crucifixo).
- Testes: `trophyLot5.test.ts` (ids e linhas da §8, cores, unicidade nos cinco lotes, pessoas e rostos de homem, pele comum e escura, Maria ≥ 60 px e na frente, luz atrás das pessoas, auréolas e coroas no eixo da cabeça, `SEM_HALO`, luz do ouro, terço que acende por dezena, nada de jogo, sazonais aprovados, Inocentes e Luzia sem violência, aceite dos `lt_*`) e `checkLot`. `lottieLib.test.ts`: registro com o lote 5 e testes das ajudas novas.

## Spec Change Log

## Verification

**Commands:**
- `for n in 1 2 3 4 5; do node scripts/trophy-lot-$n.js; done && git status --short assets/lottie/trophies` -- expected: só arquivos novos do lote 5
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0
