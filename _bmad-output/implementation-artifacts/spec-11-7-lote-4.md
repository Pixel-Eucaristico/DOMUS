---
title: 'Story 11.7: lote 4 de Lottie (agosto e setembro)'
type: 'feature'
created: '2026-10-22'
status: 'in-progress'
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
- [ ] `scripts/trophy-lot-4.js` e registro em `lots.js`
- [ ] `assets/lottie/trophies/` -- 72 arquivos
- [ ] `scripts/__tests__/trophyLot4.test.ts`

**Acceptance Criteria:**
- Given o lote 4, when rodo `node scripts/trophy-lot-4.js`, then 72 arquivos são gerados, todos os testes passam e os lotes 1 a 3 continuam idênticos

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `for n in 1 2 3 4; do node scripts/trophy-lot-$n.js; done && git status --short assets/lottie/trophies` -- expected: só arquivos novos do lote 4
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0

