---
title: 'Story 11.7: lote 3 de Lottie (maio a julho)'
type: 'feature'
created: '2026-10-22'
status: 'in-progress'
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
- [ ] `scripts/trophy-lot-3.js` e registro em `lots.js`
- [ ] `assets/lottie/trophies/` -- 81 arquivos
- [ ] `scripts/__tests__/trophyLot3.test.ts`

**Acceptance Criteria:**
- Given o lote 3, when rodo `node scripts/trophy-lot-3.js`, then 81 arquivos são gerados, todos os testes passam e os lotes 1 e 2 continuam idênticos

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `node scripts/trophy-lot-1.js && node scripts/trophy-lot-2.js && node scripts/trophy-lot-3.js && git status --short assets/lottie/trophies` -- expected: só arquivos novos do lote 3
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0
