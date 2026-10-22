---
title: 'Story 11.7: lote 2 de Lottie (fevereiro a abril)'
type: 'feature'
created: '2026-10-22'
status: 'in-review'
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
- [x] `scripts/trophy-lot-2.js` -- tabela e gestos da §5
- [x] `assets/lottie/trophies/` -- 63 arquivos
- [x] `scripts/__tests__/` -- verificações comuns + teste do lote 2; lote 1 sem mudança de saída

**Acceptance Criteria:**
- Given o lote 2, when rodo `node scripts/trophy-lot-2.js`, then 63 arquivos são gerados e todos os testes passam, e o lote 1 continua idêntico

## Implementation Notes

- `scripts/lottie-lib/trophy-kit.js` (novo): montagem comum tirada do `trophy-lot-1.js` sem mudar a saída (níveis, cores litúrgicas + `roxo`, auréola, raios, `ART_SCALE`, `piece`/`pt`/`pieces`, `buildTrophy`, `checkUniqueIcons`, `main`). `makeLot(ICONS, { DRAWN })` aceita peças principais desenhadas no gerador. `node scripts/trophy-lot-1.js` regrava os 39 arquivos idênticos (`git diff` vazio).
- `scripts/trophy-lot-2.js`: 21 gestos da §5; peças novas de Twemoji 15.1.0 e Bootstrap Icons 1.11.3 copiadas para `ICONS` com fonte e licença (o `1f495` foi separado em dois elementos, um por coração), e peças reaproveitadas da tabela do lote 1. Desenhadas no gerador e declaradas no cabeçalho: velas de São Brás, véu, cruz de cinza, cálice, lousa/ABC, trevo (folhas = coração 2764), hóstia, tiara, espinhos, gruta, túmulo etc. Cores: vermelho (Águeda, Perpétua e Felicidade, Jorge, Sexta-Feira da Paixão), roxo (Cinzas), branco (demais). Auréola de base só em santos sem auréola no ouro da tabela (Águeda, Valentim, Isidoro, Carlo Acutis, Jorge, Catarina).
- Testes: as verificações do lote 1 viraram `scripts/__tests__/trophyLotChecks.ts` (`checkLot`), usadas por `trophyLot1.test.ts` e `trophyLot2.test.ts`; acrescentadas: grupos aninhados na verificação de geometria, nenhum id em `APPROVED_LOTTIE`, cabeçalho com fontes e peças desenhadas; o lote 2 confere os 21 ids de `month` 2–4, a cor de cada festa e que nenhum desenho (peça principal e geometria do gesto) se repete entre os lotes. As verificações têm tempo de 60 s (percorrem todos os quadros).
- Prévia: quadros renderizados fora do repositório (Lottie → SVG → PNG) para composição e janela; a aprovação visual fica com o dono.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Cor litúrgica errada: Brás, Valentim (mártires), Marcos (evangelista e mártir), Ramos | medium | `data.ts` descreve os três como mártires; Ramos é vermelho. **patch**. |
| Perpétua e Felicidade e São Patrício sem auréola de base, contra a regra do comentário | medium | Sem teste da regra. **patch** + teste. |
| `checkLot` voltou a exigir que nenhum id do lote esteja aprovado | medium | Quebra os dois lotes quando a 11.8 registrar. **patch** (remover). |
| Lote 2 depende dos gestos do lote 1; ajudas presas no lote 2; checagem entre lotes só num sentido | medium | Os lotes 3 a 5 teriam de copiar ou importar lotes anteriores. **patch**: ajudas e ícones na biblioteca e registro de lotes. |
| Id repetido entre lotes e peça reaproveitada que sobrescreve outra sem aviso | low | Proteções diretas. **patch**. |
| Checagens frágeis (quadro final com escala 0, auréola ausente, pasta temporária, cabeçalho, peças desenhadas órfãs, `chuva`) | low | Correções diretas. **patch**. |
| Arrumação (JSDoc, tempo limite, testes da biblioteca repetidos, código morto) | low | Correção direta. **patch**. |
| Palma repetida (Águeda, Perpétua, Sebastião, Inês) e livro que se abre (Isidoro, Tomás) | low | Os gestos vêm do guia de UX e diferem no movimento; o dono decide na página. rejeitado |
| Fonte única da cor litúrgica em `data.ts` | low | Refatoração do pacote sem dano agora; as cores ficam testadas no lote. rejeitado |
| Interpolação linear em vez de bezier na janela | low | Aproximação já aceita no lote 1. rejeitado |
| CI não roda `vitest` | medium | Anterior a esta story. **defer** D27. |

**Rota:** 7 `patch`, 1 `defer` (D27), 3 rejeitados. Sem loopback.

## Verification

**Commands:**
- `node scripts/trophy-lot-2.js` -- expected: 63 arquivos
- `node scripts/trophy-lot-1.js && git diff --stat assets/lottie/trophies` -- expected: lote 1 sem diferença
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0
