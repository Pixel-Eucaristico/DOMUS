---
title: 'Story 11.7: lote 5 de Lottie (outubro a dezembro)'
type: 'feature'
created: '2026-10-22'
status: 'done'
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
- Revisão (todos os `patch` da triagem): o Rosário tem terço próprio (`rosarioShapes`: contas peroladas, medalha de Maria com o M, laço maior de `tercoLaco`) e as `G_Dezenas` presas a ele; Finados troca o terço pelo aspersório (`T2_Aspersorio`) e a luz que sobe é a `luzSuave` com `drop` negativo; Nicolau ganha no ouro o bispo de mitra na esquina, com a auréola na cabeça e a luz na frente da casa; Apresentação com os degraus na ordem certa e a luz do ouro na frente do Templo; raios de Teresa na frente do castelo e `G_Centro` só com opacidade; auréolas do ouro em Luzia, Estêvão, Simão e Judas e em cada inocente (seguindo a cabeça); André com "sem pessoa no desenho"; pássaros de Francisco num arco mais baixo; Cristo Rei sentado no trono (colo no assento, pernas e pés no degrau); Imaculada de manto azul-claro, cabeça inclinada e a serpente entre os pés e a lua; Graças com véu branco, auréola e estrelas; nimbo de Xavier na cabeça do Cristo; Cecília com a coroa de flores abaixo da auréola e a coroa de mártir junto à palma; palmas dos inocentes atrás do corpo; abelha de Ambrósio no canto dos lábios, sem ferrão; HUMILITAS mais escuro; o clarear da noite de João da Cruz vira `T3_Clarear` (`G_Noite` igual nos três níveis); código morto e marcadores removidos.
- Ajudas: cálice da rosa simétrico (`pontas [1, 5]`); `tercoShapes` e `tercoContas` com as mesmas medidas (`TERCO`, `tercoLaco`; saída do `tercoShapes` igual); `letrasShapes` centrada pela extensão real e recusando texto vazio; `figuraHomem` passa a `chaga`; `masculino` tira a pele do rosto quando não recebe `pele`; `grupoAnimado` aceita valor Lottie fixo; doc do `lirioShapes` (flor até ≈ 1,04·h).
- `trophyLotChecks.ts`: `frameExtent` aplica o `tr` dos grupos aninhados (e ignora grupo de opacidade zero); o quadro final confere que ao menos 10% da área de cada `T2_`/`T3_` aparece fora das camadas opacas da frente (o aprovado mais escondido, a luz de Fátima, mostra 13%); "sem pessoa no desenho" conferido (nenhum `Rosto`) em todos os lotes. `trophyLot4.test.ts:89` conta só os lotes 1 a 4.
- Testes: `trophyLot5.test.ts` (ids e linhas da §8, cores, unicidade nos cinco lotes, pessoas e rostos de homem, pele comum e escura, Maria ≥ 60 px e na frente, luz atrás das pessoas, auréolas e coroas no eixo da cabeça, `SEM_HALO`, luz do ouro, terço que acende por dezena, nada de jogo, sazonais aprovados, Inocentes e Luzia sem violência, aceite dos `lt_*`; e, da revisão: acréscimos sem o desenho do gesto de outro troféu nem de sazonal aprovado, ids fora do `APPROVED_LOTTIE`, altura das auréolas, coroinhas presas a cada inocente, acréscimos da §8 por palavra — raios, estrelas, palma, coroa, auréola) e `checkLot`. `lottieLib.test.ts`: registro com o lote 5 e testes das ajudas novas.

## Spec Change Log

- **Terço (revisão):** o terço já é acréscimo de prata aprovado em 6 troféus dos lotes 2 a 4, que não podem mudar. No Rosário ele continua como gesto principal, mas com desenho próprio (contas peroladas e medalha de Maria no centro), diferente do `T2_Terco` comum. Em Fiéis Defuntos, a prata troca o terço pelo aspersório de água benta. Guia §8 atualizado.

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Terço do Rosário igual ao `T2_Terco` de 7 troféus | high | Fingerprint idêntico. **patch** (ver Change Log) + teste que compara os `T2_`/`T3_` com os `G_` de todos os lotes — aplicado. |
| Nicolau: auréola e luz do ouro atrás da parede | high | 0 px visíveis no quadro 89. **patch** — aplicado. |
| Apresentação: luz do ouro atrás do Templo; destaques dos degraus escondidos (`.reverse()`) | high | 24 px visíveis; ordem invertida. **patch** — aplicado. |
| Teresa: raios do ouro atrás do castelo | medium | 3 px visíveis. **patch** — aplicado. |
| Luzia, Estêvão, Simão e Judas, Inocentes sem auréola; razão "auréola só no ouro" falsa (André) | medium | Nenhuma camada de auréola. **patch** — aplicado. |
| Pássaros de Francisco saem da janela; `frameExtent` ignora o `tr` dos grupos | medium | 10 px fora nos quadros 27–36. **patch** + checagem com o `tr` — aplicado. |
| Quadro final não confere se o acréscimo está escondido atrás de camada opaca | medium (gap) | **patch** (caixa do acréscimo não pode ficar inteira dentro de camada opaca da frente; aplicado como ≥ 10% da área visível). |
| Cristo Rei em pé diante do trono; guia pede sentado | medium | **patch** — aplicado. |
| Rosas com base torta (`pontas [1,4]`) | medium | **patch** — aplicado. |
| `G_Luz` com posição 2D | medium | **patch** — aplicado. |
| Acréscimos de prata/ouro só conferidos para "luz" | medium (gap) | **patch** (mapa raios/estrelas/palma/coroa pela §8) — aplicado. |
| Imaculada não pisa a serpente; Graças e Imaculada parecidas | low | **patch** — aplicado. |
| Xavier: auréola fora da cabeça do Cristo; Cecília: coroa de flores sobre a auréola e coroa de mártir solta | low | **patch** — aplicado. |
| Inocentes: palmas na frente do corpo; Ambrósio: ferrão e abelha cobrindo a boca; Borromeu: letras sem contraste | low | **patch** — aplicado. |
| `G_Noite` muda no ouro | low | Nível só acrescenta. **patch** (o clarear vira camada `T3_`) — aplicado. |
| Ajudas novas: doc de `lirio`/`tercoContas`, centragem e texto vazio em `letrasShapes`, `chaga` em `figuraHomem`, `prop` de `grupoAnimado` | low | **patch** — aplicado. |
| Testes: altura da auréola, comentário da luz, "sem pessoa no desenho" conferido em todos os lotes, coroinhas e dezenas presas à pose, `APPROVED_LOTTIE` sem o lote 5, `G_Centro` como luz, contagem do lote 4 sem depender do lote 5 | low (gap) | **patch** — aplicado. |
| Código morto e marcadores `//@@…@@` | low | **patch** — aplicado. |
| `T2_Maria` do Rosário com a mesma geometria da Maria Rainha | — | **reject**: é a pessoa (`busto`), não peça. |
| Lista de hash dos lotes aprovados | — | **defer**: já é o D28. |


## Verification

**Commands:**
- `for n in 1 2 3 4 5; do node scripts/trophy-lot-$n.js; done && git status --short assets/lottie/trophies` -- expected: só arquivos novos do lote 5
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0
