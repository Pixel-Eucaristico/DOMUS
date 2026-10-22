---
title: 'Story 11.7: lote 2 de Lottie (fevereiro a abril)'
type: 'feature'
created: '2026-10-22'
status: 'in-progress'
baseline_commit: '9863515d7717c1edc1e7e0cfdafbb4c9f5a7ab33'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-7-lote-1-gestos-e-niveis.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 104 troféus litúrgicos ainda não têm Lottie. O dono aprovou o lote 1 e pediu os demais em lotes.

**Approach:** Gerar o **lote 2**: os 21 litúrgicos de fevereiro a abril (`month` 2, 3 e 4 em `liturgicalTrophies/data.ts`), com o gesto e os acréscimos de prata e ouro da §5 do guia de movimento, 3 níveis cada (63 arquivos), no mesmo padrão e com as mesmas garantias do lote 1.

## Boundaries & Constraints

**Always:** o mesmo formato, `ART_SCALE`, janela visível, quadro final por nível e validações do lote 1; peças só de Twemoji 15.1.0 (CC-BY 4.0) e Bootstrap Icons 1.11.3 (MIT), com fonte e versão, ou desenhadas no gerador e declaradas no cabeçalho; os testes do lote 1 viram verificações comuns reutilizadas pelos dois lotes; nenhum desenho repetido entre os dois lotes.

**Never:** mudar os 39 arquivos aprovados do lote 1 (a saída do lote 1 deve ficar idêntica); registrar em `APPROVED_LOTTIE` ou mudar telas (Story 11.8); mudar o motor de níveis.

</frozen-after-approval>

## Code Map

- `scripts/trophy-lot-1.js`, `scripts/lottie-lib/index.js` -- modelo e ajudas; uma ajuda nova vai para a biblioteca só se o lote 1 continuar idêntico
- `scripts/__tests__/trophyLot1.test.ts` -- extrair as verificações para um módulo comum e aplicá-las ao lote 2
- `packages/gamification/src/liturgicalTrophies/data.ts` -- ids, nomes e cor (vermelho para mártires: Águeda, Perpétua e Felicidade, Jorge; roxo para Cinzas; branco para as demais; Sexta-Feira da Paixão vermelho)

## Tasks & Acceptance

**Execution:**
- [ ] `scripts/trophy-lot-2.js` -- tabela e gestos da §5
- [ ] `assets/lottie/trophies/` -- 63 arquivos
- [ ] `scripts/__tests__/` -- verificações comuns + teste do lote 2; lote 1 sem mudança de saída

**Acceptance Criteria:**
- Given o lote 2, when rodo `node scripts/trophy-lot-2.js`, then 63 arquivos são gerados e todos os testes passam, e o lote 1 continua idêntico

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `node scripts/trophy-lot-2.js` -- expected: 63 arquivos
- `node scripts/trophy-lot-1.js && git diff --stat assets/lottie/trophies` -- expected: lote 1 sem diferença
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0
