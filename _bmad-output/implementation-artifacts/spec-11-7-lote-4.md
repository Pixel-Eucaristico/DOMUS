---
title: 'Story 11.7: lote 4 de Lottie (agosto e setembro)'
type: 'feature'
created: '2026-10-22'
status: 'in-review'
baseline_commit: '3dbaa3597c3f9ee3915554ec700953e6964ed454'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-7-lote-3.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-7-ajustes-do-dono-3.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Faltam 56 troféus litúrgicos sem Lottie. Os lotes 1 a 3 já foram gerados e revisados.

**Approach:** Gerar o **lote 4**: os 24 litúrgicos de agosto e setembro (`month` 8 e 9 em `liturgicalTrophies/data.ts`), com o gesto e os acréscimos de prata e ouro da §7 do guia, 3 níveis cada (72 arquivos), em `scripts/trophy-lot-4.js` registrado em `scripts/lottie-lib/lots.js`.

## Boundaries & Constraints

**Always:** as regras das §6 e §7 do guia (luz só com `luzSuave`; pessoa em ação = `figura` ou `busto` com a pele comum; Maria grande e visível; nada que lembre jogo; terço e objetos católicos desenhados); mesmo formato e verificações comuns (`checkLot`, peça principal única com `uses`, luzes conferidas); peças de Twemoji 15.1.0 e Bootstrap Icons 1.11.3 com fonte e versão, ou desenhadas e declaradas; ajudas reutilizáveis em `scripts/lottie-lib/`; cor vermelha para mártires e apóstolos (Lourenço, Kolbe, Bartolomeu, Martírio de João Batista, Mateus, Cosme e Damião), branca para as demais; o Martírio de João Batista sem cabeça na bandeja (só a palma).

**Never:** mudar qualquer arquivo dos lotes 1 a 3; registrar em `APPROVED_LOTTIE` ou mudar telas (Story 11.8).

</frozen-after-approval>

## Code Map

- `scripts/trophy-lot-3.js` -- modelo mais recente (`figura`, `busto`, `uses`)
- `scripts/lottie-lib/` -- `index.js` (`luzSuave`), `trophy-kit.js`, `icons.js`, `desenhos.js` (`hostiaShapes`, `velaComprida`, …), `lots.js`
- `scripts/__tests__/trophyLotChecks.ts` + um `trophyLot4.test.ts` no padrão do lote 3 (ids do mês 8–9, cores, unicidade entre lotes, busto atrás do que estiver na frente)

## Tasks & Acceptance

**Execution:**
- [x] `scripts/trophy-lot-4.js` e registro em `lots.js`
- [x] `assets/lottie/trophies/` -- 72 arquivos
- [x] `scripts/__tests__/trophyLot4.test.ts`

**Acceptance Criteria:**
- Given o lote 4, when rodo `node scripts/trophy-lot-4.js`, then 72 arquivos são gerados, todos os testes passam e os lotes 1 a 3 continuam idênticos

## Implementation Notes

- `scripts/trophy-lot-4.js`: os 24 gestos da §7, com prata (`T2_*`) e ouro (`T3_*`). Nenhuma peça nova: as do Twemoji 15.1.0 (palma 1f33f, lírio 269c, coroa 1f451, cordeiro 1f411, pão 1f35e, nuvem 2601, estrela 2b50) vêm da tabela comum `lottie-lib/icons.js`. As 24 peças principais são desenhadas (`DRAWN`, citadas no cabeçalho); só `desenho-tres-arcanjos` embrulha uma peça (o lírio 269c, que não é peça principal de ninguém). Nos gestos (`G_*`), a coroa, a palma, a estrela, a asa, a pomba, o leão, o livro e a cruz são desenhados, para não repetir a peça principal de outro troféu (Maria Mãe de Deus, Perpétua e Felicidade, Epifania, Anunciação, Batismo, São Marcos, Tomás de Aquino e Sexta-Feira).
- Biblioteca (`lottie-lib/desenhos.js`, só acréscimos): `coroaShapes`, `palmaShapes`, `estrelaShapes`, `asaShapes`, `coracaoShapes`, `lagrimaShapes`, `galeroShapes`, `pombaShapes` e `pontas`. `lots.js` registra o lote 4.
- Regras das §6 e §7: pessoas como `busto` (Vianney, Clara, Maria Rainha, Mônica, Gregório, Sant'Ana, o anjo de Mateus, Padre Pio, Cosme e Damião, Vicente e a criança) ou `figura` (Jesus, Moisés e Elias na Transfiguração; Maria na Assunção), com rosto e mãos em `PELE`. Maria fica sempre na frente (só a coroa e as estrelas passam por cima). Toda luz é `luzSuave`; na Transfiguração e na Assunção ela faz parte do gesto desde o bronze (`G_Luz`). Os brilhos são fracos e o clarão de Pedro Claver some, para nenhum deles virar disco parado. O terço é desenhado (Vianney, Domingos, Mônica e Pio). O Martírio de João Batista tem só a palma na bandeja. Cores: vermelho para Lourenço, Kolbe, Bartolomeu, Martírio de João Batista, Mateus e Cosme e Damião; branco para os demais. `SEM_HALO`: festas sem santo (Transfiguração, Exaltação) e os que têm a auréola só no ouro.
- Testes: `trophyLot4.test.ts` cobre os ids dos meses 8 e 9, as cores, a unicidade nos quatro lotes, as pessoas (busto ou figura, pele comum, atrás do que fica na frente), Maria na frente, os objetos desenhados, nada de jogo, o `uses`, a bandeja sem cabeça, a luz do ouro conforme a §7, a Transfiguração e as correntes, além do `checkLot`. Em `lottieLib.test.ts`, o registro passa a esperar o lote 4 e há testes dos desenhos novos. `trophyLot3.test.ts` mudou numa linha: a §6 do guia agora termina antes da §7. A mudança veio do commit do guia (a0d3bc9), que tinha quebrado esse teste; nenhum gerador nem JSON dos lotes 1 a 3 mudou.
- Verificação: `for n in 1 2 3 4; do node scripts/trophy-lot-$n.js; done` mostra só os 72 arquivos novos; os arquivos que já existiam continuam com o mesmo md5. `npx vitest run` passa: 52 arquivos, 927 testes. `npx tsc --noEmit` sai com 0. Renderizei fora do repositório os quadros 4 a 89 do bronze e o quadro final da prata e do ouro dos 24 troféus. A aprovação visual fica com o dono.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Exaltação da Santa Cruz com cor branca | medium | Festa da Cruz usa vermelho. **patch**. |
| Peças principais de outros troféus nos níveis prata/ouro (palma, coroa, estrela, cordeiro) | medium | Contra a regra do dono de não repetir desenho; o teste só olhava o bronze. **patch**. |
| Luzes `G_Brilho` fora da regra da `luzSuave` (clarão de Pedro Claver) | medium | Regra da §6/§7. **patch**. |
| Auréola e lágrimas de Mônica e auréola da Natividade não seguem a cabeça | medium | Desencontro de 4 a 6 px. **patch** + teste. |
| Maria da Assunção abaixo dos 60 px; teste media a nuvem junto | medium | Medido: 55 px. **patch**. |
| Estrela de São Domingos fora da "fronte" pedida no guia | low | Correção direta. **patch**. |
| Testes vazios (`indexOf` −1), pessoas fora das checagens, regra de `SEM_HALO`, corrente de Claver, recorte do guia | medium (gap) | **patch**. |
| Assinaturas e validação das ajudas novas (`lagrima`, `galero`, `pontas`) | low | Correção direta. **patch**. |
| Cabeçalho do gerador desatualizado | low | Correção direta. **patch**. |

**Rota:** 9 `patch`. Sem loopback.

## Verification

**Commands:**
- `for n in 1 2 3 4; do node scripts/trophy-lot-$n.js; done && git status --short assets/lottie/trophies` -- expected: só arquivos novos do lote 4
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0

