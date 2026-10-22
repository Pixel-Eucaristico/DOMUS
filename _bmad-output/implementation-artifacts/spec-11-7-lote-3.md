---
title: 'Story 11.7: lote 3 de Lottie (maio a julho)'
type: 'feature'
created: '2026-10-22'
status: 'in-review'
baseline_commit: 'e1a353b0c9d76db9e2b650937e4aeaff7d473f5f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-7-lote-2.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-7-ajustes-do-dono-1.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-7-ajustes-do-dono-2.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Faltam 83 troféus litúrgicos sem Lottie. Os lotes 1 e 2 (34 troféus) foram aprovados pelo dono.

**Approach:** Gerar o **lote 3**: os 27 litúrgicos de maio a julho (`month` 5, 6 e 7 em `liturgicalTrophies/data.ts`, incluindo `lt_pedro_paulo` e `lt_santana`), com o gesto e os acréscimos de prata e ouro da §6 do guia, 3 níveis cada (81 arquivos), em `scripts/trophy-lot-3.js` registrado em `scripts/lottie-lib/lots.js`.

## Boundaries & Constraints

**Always:** as regras da §6 do guia (luz só com `luzSuave`; santo como pessoa = busto simples no estilo de Maria e Águeda; nada de emoji infiel à tradição católica — terço, escapulário, custódia, medalha de São Bento desenhados); mesmo formato, `ART_SCALE`, janela visível, quadro final por nível e verificações comuns (`checkLot`); peças de Twemoji 15.1.0 (CC-BY 4.0) e Bootstrap Icons 1.11.3 (MIT) com fonte e versão, ou desenhadas no gerador e declaradas no cabeçalho; ajudas reutilizáveis vão para `scripts/lottie-lib/`; cor vermelha para mártires e apóstolos (Matias, Barnabé, Fisher e Moro, Pedro e Paulo, Tomé, Tiago, Ireneu) e Pentecostes; branca para as demais.

**Never:** mudar qualquer arquivo dos lotes 1 e 2 (devem ficar idênticos); registrar em `APPROVED_LOTTIE` ou mudar telas (Story 11.8).

</frozen-after-approval>

## Code Map

- `scripts/trophy-lot-2.js` -- modelo mais recente (incluindo `gestoAgueda` com busto e `gestoMariaMaeDeus` no lote 1)
- `scripts/lottie-lib/` -- `index.js` (`luzSuave`), `trophy-kit.js`, `icons.js`, `desenhos.js` (`hostiaShapes`, `velaComprida`, …), `lots.js`
- `scripts/__tests__/trophyLotChecks.ts` + um `trophyLot3.test.ts` no padrão do lote 2 (ids do mês 5–7, cores, unicidade entre lotes, busto atrás do que estiver na frente)

## Tasks & Acceptance

**Execution:**
- [x] `scripts/trophy-lot-3.js` e registro em `lots.js`
- [x] `assets/lottie/trophies/` -- 81 arquivos
- [x] `scripts/__tests__/trophyLot3.test.ts`

**Acceptance Criteria:**
- Given o lote 3, when rodo `node scripts/trophy-lot-3.js`, then 81 arquivos são gerados, todos os testes passam e os lotes 1 e 2 continuam idênticos

## Implementation Notes

- `scripts/trophy-lot-3.js`: os 27 gestos da §6, com prata (`T2_*`) e ouro (`T3_*`). Peças novas do Twemoji 15.1.0 em `NEW_ICONS` (1f3b2 dado, 1fa93 machado, 1f331 broto, 1f33e trigo, 2744 floco, 1faf1 mão, 1f319 lua, 1f409 dragão, 1f3fa jarro; a elipse do 1f3b2 virou caminho). As peças do lote 2 que o lote 3 também usa (2601, 1f5dd, 1f528, 1faa8, 1f35e, 1fabd, 1f31f, 1f339) foram copiadas, idênticas, para a tabela comum `lottie-lib/icons.js`; o lote 2 mantém a sua cópia e não muda. Peças principais: 23 desenhadas (tabela `DRAWN`, citadas no cabeçalho) e 4 do Twemoji (1f3b2, 2601, 1f525, 1faf1), nenhuma repetida entre os três lotes.
- Biblioteca (`lottie-lib/desenhos.js`): `busto` (busto simples no estilo de Maria e Águeda, com manto de capuz ou cabelo, barba opcional), `tercoShapes` (o terço de Lourdes, com as cores como opção; o lote 2 mantém a cópia dele), `conchaShapes` (vieira), `espelhar` e `transladar`. `lots.js` registra o lote 3.
- Regras da §6: toda luz é `luzSuave` (`T3_Luz`); pessoas são bustos (Maria de Fátima, pastorinhos, Maria e Isabel, Menino Jesus, Maria do Carmo, Sant'Ana, São Joaquim e a menina Maria); terço, escapulário, custódia, medalha de São Bento e crucifixo desenhados. Cores: vermelho para Matias, Pentecostes, Barnabé, Fisher e Moro, Ireneu, Pedro e Paulo, Tomé e Tiago; branco para os demais. `SEM_HALO`: festas sem santo (Ascensão, Pentecostes, Corpus Christi, Sagrado Coração) e os que têm a auréola só no ouro.
- Santa Brígida da Suécia: a "cruz de Brígida" (que é de Santa Brígida da Irlanda) saiu do guia; a prata agora é o bordão de peregrina desenhado (cajado reto com pomo, fita e bolsa de peregrino na alça), diferente do bordão com cabaça de São Tiago.
- Ajustes da revisão: a rede de Pedro e Paulo corta as duas diagonais (antes só uma); as peças principais desenhadas não embrulham mais a peça principal de outro troféu (rosa, pedra, livros abertos, chamas e a nuvem de Fátima agora são desenhados; `DRAWN` ganhou `uses`, conferido pelo `checkUniqueIcons` e pelo teste); o ouro do Sagrado Coração ganhou a `luzSuave`; a checagem de luz cobre `Luz|Ceu|Brilho|Raios` (nome e conteúdo) e o teste do lote 3 exige `luzSuave` em todo ouro cuja coluna do guia fala em luz; `busto` sem bochechas quando tem barba, erro com `manto` + `cabelo`; pele comum `PELE`/`PELE_SOMBRA` (bustos, mão de Tomé, corpo do crucifixo); `espelhar`/`transladar` recusam caminho animado, grupo deslocado, `rc`/`sr` e deslocamento inválido; o lote 2 passou a importar da biblioteca as 8 peças e o terço (saída idêntica).
- Testes: `trophyLot3.test.ts` (ids dos meses 5 a 7, cores, ids e desenhos únicos nos três lotes, bustos com rosto/olhos/veste e atrás do que fica na frente, peças católicas desenhadas, luz do ouro = `luzSuave`) + `checkLot`; `lottieLib.test.ts` passou a esperar o lote 3 no registro.
- Verificação: `node scripts/trophy-lot-1.js && node scripts/trophy-lot-2.js && node scripts/trophy-lot-3.js && git status --short assets/lottie/trophies` mostra só os 81 arquivos novos; `npx vitest run` 51 arquivos, 869 testes passando; `npx tsc --noEmit` exit 0. Prévia renderizada fora do repositório (quadros 10 a 89 dos três níveis); a aprovação visual fica com o dono.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Rede de São Pedro e São Paulo sem as diagonais do outro sentido | high | `corta` troca t0/t1 com dx negativo; confirmado em `lt_pedro_paulo_t2.json`. **patch** + teste. |
| Peça principal repetida por baixo de `desenho-*` (rosa de Rita = Lourdes; livro de Barnabé e Antônio = Tomás; fogo da fogueira e do Sagrado Coração = Pentecostes) | medium | O dono pediu um desenho para cada troféu. **patch**: peças distintas, `uses` e checagem. |
| Luzes feitas à mão fora da `luzSuave` (Ascensão, Tomé, Corpus, `brilho()`) | medium | Regra da §6 vinda da reclamação do dono. **patch** + teste mais amplo. |
| Bochechas sobre a barba de São Joaquim | low | Visível no ouro. **patch**. |
| Mão de São Tomé amarela de emoji | low | Diverge do tom de pele dos bustos. **patch**. |
| `busto` aceita manto com cabelo e doc com medidas erradas | low | Correção direta. **patch**. |
| `espelhar`/`transladar` sem validação e ajudas novas sem teste | medium (gap) | Os lotes 4 e 5 vão usá-las. **patch**. |
| Cópias de 8 ícones e do terço no lote 2 | low | Podem divergir sem aviso. **patch**: lote 2 importa da biblioteca. |
| Cabeçalho com lista feita à mão; lista `VERMELHO` e `BUSTOS` fixas no teste; `--help` regenera | low | Sem dano agora. rejeitado |
| JSON gerados fora do índice | false | O commit inclui `assets/` (`git add -A`). |

**Rota:** 8 `patch`, 3 rejeitados, 1 falso. Sem loopback.

## Verification

**Commands:**
- `node scripts/trophy-lot-1.js && node scripts/trophy-lot-2.js && node scripts/trophy-lot-3.js && git status --short assets/lottie/trophies` -- expected: só arquivos novos do lote 3
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0
