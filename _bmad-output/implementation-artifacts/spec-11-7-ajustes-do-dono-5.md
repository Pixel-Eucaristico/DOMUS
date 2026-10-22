---
title: 'Story 11.7: ajustes do dono no lote 5'
type: 'bugfix'
created: '2026-10-22'
status: 'in-progress'
baseline_commit: 'd3a4731'
route: 'one-shot'
context:
  - '{project-root}/_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-7-lote-5.md'
---

## Intent

**Problem:** Na página de aprovação, o dono aprovou 25 troféus do lote 5 e pediu ajuste em 4:
- Santa Cecília: "a posição dela não parece tocar o órgão e nem olhar para ele".
- São Francisco de Assis: "o lobo tá na frente e atrás dele".
- São Lucas: "asas estranhas de morcego albino e ao contrário".
- Todos os Santos: "não parece um cordeiro".

**Approach:**
- Cecília: sentada de lado diante do órgão, rosto virado para o teclado, mãos sobre as teclas.
- Francisco: o lobo inteiro de um lado só, sentado aos pés dele, sem atravessar o corpo do santo.
- Lucas: asas de penas (como as do anjo e da águia), em cor de ave, presas no ombro do touro e abrindo para cima e para trás.
- Todos os Santos: o Cordeiro de Deus que se lê como cordeiro: lã em cachos, cabeça e patas escuras, orelhas, de pé com o estandarte.

## Boundaries & Constraints

**Always:** só os 4 troféus, nos 3 níveis; regras das §6 a §8 do guia.

**Never:** mudar os outros troféus dos lotes 1 a 5 (os aprovados ficam idênticos).

## Verification

- `for n in 1 2 3 4 5; do node scripts/trophy-lot-$n.js; done`: só mudam arquivos dos 4 troféus.
- `npx vitest run` e `npx tsc --noEmit` passam.
