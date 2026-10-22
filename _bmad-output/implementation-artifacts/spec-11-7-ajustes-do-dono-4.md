---
title: 'Story 11.7: ajustes do dono no lote 4'
type: 'bugfix'
created: '2026-10-22'
status: 'in-progress'
baseline_commit: '4e4538b'
route: 'one-shot'
context:
  - '{project-root}/_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-7-lote-4.md'
---

## Intent

**Problem:** Na página de aprovação, o dono pediu ajuste em 4 troféus do lote 4:
- São João Maria Vianney: "parece uma mulher".
- Transfiguração: "esconde Jesus atrás da nuvem".
- São Domingos: o cachorro "parece uma vaca".
- São Bernardo: "acho que uma colmeia não é assim".

**Approach:**
- Vianney: um padre homem: cabelo curto, sem véu nem cabelo comprido, colarinho de batina, ombros largos.
- Transfiguração: Jesus inteiro e na frente; a nuvem fica atrás e nunca o cobre.
- Domingos: um cachorro que se lê como cachorro: focinho comprido, orelhas caídas, rabo levantado, patas finas; sem manchas de vaca.
- Bernardo: a colmeia tradicional de palha (cúpula de anéis empilhados com a entradinha embaixo), com as abelhas saindo pela entrada.

## Boundaries & Constraints

**Always:** só os 4 troféus nos 3 níveis; as regras das §6 e §7 do guia.

**Never:** mudar os outros troféus dos lotes 1 a 4.

## Verification

- `for n in 1 2 3 4; do node scripts/trophy-lot-$n.js; done`: só os 12 arquivos dos 4 troféus mudam.
- `npx vitest run` e `npx tsc --noEmit` passam.
