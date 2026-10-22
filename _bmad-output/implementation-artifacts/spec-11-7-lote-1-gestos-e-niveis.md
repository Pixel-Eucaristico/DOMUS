---
title: 'Story 11.7: refazer o lote 1 com gesto próprio e níveis'
type: 'feature'
created: '2026-10-22'
status: 'done'
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
- [x] `scripts/lottie-lib/index.js` -- ajudas de movimento
- [x] `scripts/trophy-lot-1.js` -- gestos e níveis da §4 do guia
- [x] `assets/lottie/trophies/` -- 39 arquivos
- [x] testes -- matriz

**Acceptance Criteria:**
- Given o lote 1 regerado, when abro cada troféu num player Lottie, then vejo o gesto da tabela do guia, e o ouro mostra mais que a prata, que mostra mais que o bronze

## Implementation Notes

- `scripts/lottie-lib/index.js`: novas ajudas de movimento — `anim` (chaves `[quadro, valor, curva]` → formato s/e atual, junta emendas iguais, recusa quadros fora de ordem), `trajeto`, `pulo`, `queda`, `abrir`, `onda`, `aparecer`, `sumir`, `pop`, `pulsar`, `giro`; camadas `pieceLayer` (peça centrada em (0,0) com posição/âncora/escala/rotação/opacidade), `luzDescendo`, `ondulacao`, `confete` (pseudoaleatório com semente fixa); shapes `polyline`, `makeStroke` (com corte animado `tm`), `makeEllipseRing`; `iconShapes` ganhou `only`/`recolor`/`fill`/`rule: "evenodd"`, e `iconPoint`. `sparkleLayers` e `glowLayer` aceitam a força (`peak`) com o padrão de antes; o resto não mudou.
- `scripts/trophy-lot-1.js`: um gesto por troféu (funções `gesto*`, tabela da §4), peças em camadas `G_*`, acréscimos da prata `T2_*` e do ouro `T3_*`; 3 níveis para todos (litúrgicos inclusive). Base comum: 5 brilhos (força por nível: bronze 45, prata 85, ouro 90, nas cores bronze/prata/ouro) e halo (8/12/16 %, nunca acima dos 16 % do natal; cor do nível nos sazonais e cor litúrgica nos litúrgicos). Litúrgicos com auréola dourada que acende atrás da cabeça (Maria, Inês) ou elíptica por cima do desenho; sem auréola de base na Epifania (festa sem santo: a estrela brilha com raios curtos) e em Antônio Abade e João Bosco, em que a tabela põe a auréola só no ouro.
- Peças: Twemoji 15.1.0 (CC-BY 4.0) e Bootstrap Icons 1.11.3 (MIT), copiadas para `ICONS` com fonte e licença; o cofrinho do Bootstrap teve as curvas `q` convertidas em `C` (o parser recusa Q/T) e da seta do `graph-up-arrow` só ficou o subcaminho da seta. Formas geométricas desenhadas no próprio gerador, sem fonte externa: mar e ondas, feixe de luz, raios, auréola, cajado em T, confete, linha da pena (o contorno do coração do Twemoji) e o manto de Maria (silhueta simples).
- Margem: além do teste antigo (dentro do halo do natal), um teste novo confere, quadro a quadro e com as transformações das camadas, que o desenho sem brilhos e halo fica na margem da arte do `seasonal_natal` (22,5 px em cada lado), porque o `LottieTrophy` amplia 1,45×.
- Prévia: quadros renderizados com um renderizador próprio (Lottie → SVG → PNG, fora do repositório) para conferir composição e tempo; não é um player Lottie de verdade, então a aprovação visual fica com o dono na Story 11.8.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Quadro parado (89): extras de prata/ouro e partes do gesto já sumiram | medium | `LottieTrophy` usa `play(89, 89)` quando estático; nas listas a prata e o ouro pareceriam bronze. **patch** + teste. |
| Arte cortada pela janela visível do app (ampliação 1,45× com `overflow: hidden`) e entrada fora do teste | medium | Medido: porco ~182, manto ~183, pomba ~179, mar 172, contra uma janela de ~[31, 169]. **patch** + teste com a janela real. |
| `frameExtent` não entra em grupos aninhados | medium (gap) | Mediria errado nos próximos lotes. **patch**. |
| `anim` perde a curva ao juntar chaves no mesmo quadro | low | Correção direta. **patch**. |
| `onda` trava com período ≤ 0 e gera uma chave só em trecho curto | medium | Trava o gerador; a estrela do 13º ouro não flutua. **patch**. |
| Ajudas sem validação (`abrir`, `recolor`, `only`, `pt`, `aureola`, `confete`, `ctx.col`) | medium | Os próximos 104 troféus usam essas ajudas; o erro sai sem dizer qual troféu. **patch**. |
| Testes fracos (regex de medalha, busca por `null`, licenças, auréola e força por nível) | medium (gap) | Falso positivo em "Primavera"; `undefined` passava. **patch**. |
| Comentário diz que a auréola muda por nível | low | Correção direta. **patch**. |
| Sebastião prata com uma flecha só; sol de Tomás de Aquino igual no ouro | low | O dono viu e aprovou assim. rejeitado |
| Desenho some e volta a cada laço | low | Mesmo comportamento do Natal aprovado. rejeitado |
| Ajudas novas sem teste unitário | low | Cobertas pelo teste do lote e pela validação nova. rejeitado |
| Interpolação linear no teste em vez de bezier | low | Aproximação conservadora dos limites. rejeitado |

**Rota:** 8 `patch`, 4 rejeitados. Sem loopback.

## Verification

**Commands:**
- `node scripts/trophy-lot-1.js` -- expected: 39 arquivos
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0
- Correções da revisão: todo o desenho foi reduzido por `ART_SCALE = 0.82` para caber na janela visível do app (1,45×); quadro 89 mostra o estado final do gesto e dos extras de cada nível. O dono aprovou os 13 na página (22/10/2026, coleção `aprovacoes`).
