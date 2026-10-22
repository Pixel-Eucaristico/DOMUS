---
title: 'Story 11.7: refazer o lote 1 com gesto próprio e níveis'
type: 'feature'
created: '2026-10-22'
status: 'in-progress'
baseline_commit: '6bc259cc3fd5b77eb58b977df7d2e3aeb7cb43d7'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-7-gerar-lottie-dos-trofeus-sem-animacao.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No lote 1 (13 troféus) todos têm a mesma coreografia (cai, balança, raios girando) com um ícone Twemoji parado dentro de um disco; os níveis só trocam a cor; os litúrgicos saíram com um nível só, embora o app lhes dê bronze, prata e ouro (`getSeasonalTier`). O dono quer que a animação lembre o troféu e que cada nível tenha a sua.

**Approach:** Refazer os 13 troféus do lote 1 seguindo `guia-de-movimento-dos-trofeus.md`: um gesto próprio por troféu (tabela da §4), feito de 2 a 4 peças animadas; 3 níveis para todos (`x.json`, `x_t2`, `x_t3`), cada nível somando elementos e efeitos; sem medalha em volta. Mantém `scripts/lottie-lib` e as proteções e testes da revisão anterior.

## Boundaries & Constraints

**Always:** quadro, duração, laço e margem dos aprovados (testes atuais de geometria e limites continuam); peças só de fontes com licença aberta (Twemoji CC-BY 4.0, Tabler MIT, Bootstrap Icons MIT, Font Awesome Free), citadas no gerador; o gesto de cada troféu é o da tabela da §4 do guia; prata e ouro acrescentam o que a tabela diz.

**Never:** registrar em `APPROVED_LOTTIE` ou mudar telas (Story 11.8); mudar o motor de níveis; medalha ou disco em volta do desenho.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Litúrgico | `lt_epifania` | `lt_epifania.json`, `_t2`, `_t3` | N/A |
| Sazonal | `seasonal_ferias_verao` | `.json`, `_t2`, `_t3` | N/A |
| Níveis | bronze × prata × ouro | ouro tem mais camadas que prata, que tem mais que bronze | teste falha |
| Gesto | qualquer troféu | ao menos uma peça do gesto se move (posição, escala ou rotação animadas), não só a base comum | teste falha |
| Sem medalha | qualquer arquivo | nenhuma camada de disco ou aro de medalha | teste falha |

</frozen-after-approval>

## Code Map

- `scripts/trophy-lot-1.js` -- tabela do lote; trocar o par ícone + disco pelo gesto de cada troféu e gerar 3 níveis para todos
- `scripts/lottie-lib/index.js` -- acrescentar ajudas de movimento (trajeto, pulo, queda, abrir, onda, luz descendo) reutilizáveis nos próximos lotes
- `scripts/__tests__/trophyLot1.test.ts`, `scripts/__tests__/lottieLib.test.ts` -- atualizar para 39 arquivos e cobrir a matriz
- `assets/lottie/trophies/` -- regravar os do lote 1 (nenhum aprovado)

## Tasks & Acceptance

**Execution:**
- [ ] `scripts/lottie-lib/index.js` -- ajudas de movimento
- [ ] `scripts/trophy-lot-1.js` -- gestos e níveis da §4 do guia
- [ ] `assets/lottie/trophies/` -- 39 arquivos
- [ ] testes -- matriz

**Acceptance Criteria:**
- Given o lote 1 regerado, when abro cada troféu num player Lottie, then vejo o gesto da tabela do guia, e o ouro mostra mais que a prata, que mostra mais que o bronze

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `node scripts/trophy-lot-1.js` -- expected: 39 arquivos
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0
