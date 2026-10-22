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

- **Terço (revisão):** o terço já é acréscimo de prata aprovado em 6 troféus dos lotes 2 a 4, que não podem mudar. No Rosário ele continua como gesto principal, mas com desenho próprio (contas peroladas e medalha de Maria no centro), diferente do `T2_Terco` comum. Em Fiéis Defuntos, a prata troca o terço pelo aspersório de água benta. Guia §8 atualizado.

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Terço do Rosário igual ao `T2_Terco` de 7 troféus | high | Fingerprint idêntico. **patch** (ver Change Log) + teste que compara os `T2_`/`T3_` com os `G_` de todos os lotes. |
| Nicolau: auréola e luz do ouro atrás da parede | high | 0 px visíveis no quadro 89. **patch**. |
| Apresentação: luz do ouro atrás do Templo; destaques dos degraus escondidos (`.reverse()`) | high | 24 px visíveis; ordem invertida. **patch**. |
| Teresa: raios do ouro atrás do castelo | medium | 3 px visíveis. **patch**. |
| Luzia, Estêvão, Simão e Judas, Inocentes sem auréola; razão "auréola só no ouro" falsa (André) | medium | Nenhuma camada de auréola. **patch**. |
| Pássaros de Francisco saem da janela; `frameExtent` ignora o `tr` dos grupos | medium | 10 px fora nos quadros 27–36. **patch** + checagem com o `tr`. |
| Quadro final não confere se o acréscimo está escondido atrás de camada opaca | medium (gap) | **patch** (caixa do acréscimo não pode ficar inteira dentro de camada opaca da frente). |
| Cristo Rei em pé diante do trono; guia pede sentado | medium | **patch**. |
| Rosas com base torta (`pontas [1,4]`) | medium | **patch**. |
| `G_Luz` com posição 2D | medium | **patch**. |
| Acréscimos de prata/ouro só conferidos para "luz" | medium (gap) | **patch** (mapa raios/estrelas/palma/coroa pela §8). |
| Imaculada não pisa a serpente; Graças e Imaculada parecidas | low | **patch**. |
| Xavier: auréola fora da cabeça do Cristo; Cecília: coroa de flores sobre a auréola e coroa de mártir solta | low | **patch**. |
| Inocentes: palmas na frente do corpo; Ambrósio: ferrão e abelha cobrindo a boca; Borromeu: letras sem contraste | low | **patch**. |
| `G_Noite` muda no ouro | low | Nível só acrescenta. **patch** (o clarear vira camada `T3_`). |
| Ajudas novas: doc de `lirio`/`tercoContas`, centragem e texto vazio em `letrasShapes`, `chaga` em `figuraHomem`, `prop` de `grupoAnimado` | low | **patch**. |
| Testes: altura da auréola, comentário da luz, "sem pessoa no desenho" conferido em todos os lotes, coroinhas e dezenas presas à pose, `APPROVED_LOTTIE` sem o lote 5, `G_Centro` como luz, contagem do lote 4 sem depender do lote 5 | low (gap) | **patch**. |
| Código morto e marcadores `//@@…@@` | low | **patch**. |
| `T2_Maria` do Rosário com a mesma geometria da Maria Rainha | — | **reject**: é a pessoa (`busto`), não peça. |
| Lista de hash dos lotes aprovados | — | **defer**: já é o D28. |


## Verification

**Commands:**
- `for n in 1 2 3 4 5; do node scripts/trophy-lot-$n.js; done && git status --short assets/lottie/trophies` -- expected: só arquivos novos do lote 5
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0
