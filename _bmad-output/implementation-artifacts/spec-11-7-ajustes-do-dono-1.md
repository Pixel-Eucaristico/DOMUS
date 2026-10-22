---
title: 'Story 11.7: ajustes pedidos pelo dono na página de aprovação (rodada 1)'
type: 'bugfix'
created: '2026-10-22'
status: 'in-review'
baseline_commit: 'eb27f370d65d8e6a2975cf675320f5e63ed47578'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Na página de aprovação o dono pediu ajuste em 14 troféus. Em 11 o problema é o efeito "luz que desce" (`luzDescendo`): "estica", "estranho esticando assim", "fica deformado no início" — Anunciação, Catarina de Sena, Cinzas, São Jorge, Lourdes, Perpétua e Felicidade, Ramos, Sexta-Feira da Paixão ("luz do céu"), e do lote 1 Maria Mãe de Deus, Conversão de São Paulo e Santa Inês. Ajustes de desenho: Santa Águeda ("parece um fantasma e não um véu"); Domingo de Ramos ("parece coqueiros do que ramos"); São Isidoro ("as folhas não combinam: as de baixo retas e as de cima redondas").

**Approach:** Refazer o efeito de luz na biblioteca: uma luz que acende e desce suave, **sem esticar nem deformar** (sem escala não uniforme do feixe; brilho difuso que ganha opacidade, com poucos raios finos de comprimento fixo), usada por todos os troféus que hoje usam `luzDescendo` e pelo céu da Sexta-Feira da Paixão. Águeda: véu de tecido com dobras caindo atrás da palma, ou trocar pelo atributo dela (bandeja com velas), o que ficar mais reconhecível. Ramos: folhas de palmeira soltas, sem tronco, agitadas como em procissão. Isidoro: todas as páginas do livro com a mesma forma.

## Boundaries & Constraints

**Always:** só os 14 troféus listados mudam (os demais 47 aprovados ficam idênticos byte a byte); mesmas garantias e testes dos lotes; quadro final de cada nível mostra os extras.

**Never:** mudar gestos que o dono não pediu; registrar em `APPROVED_LOTTIE`.

</frozen-after-approval>

## Code Map

- `scripts/lottie-lib/index.js` -- `luzDescendo` (hoje um feixe trapezoidal que escala); novo efeito com o mesmo nome ou substituto, atualizando as chamadas
- `scripts/trophy-lot-1.js` -- Maria (T3_Luz), Conversão de Paulo (G_Luz), Inês (T3_Luz)
- `scripts/trophy-lot-2.js` -- os 11 do lote 2 listados; céu da Sexta-Feira; véu de Águeda; ramos; livro de Isidoro
- Extra (achado da revisão): `lt_epifania_t2` — `T2_RastroLongo` termina com trim início = fim = 100, invisível no quadro parado; deixar parte do rastro visível no fim e endurecer o teste para trim fim > trim início

## Tasks & Acceptance

**Execution:**
- [ ] biblioteca -- novo efeito de luz sem esticar
- [ ] lotes 1 e 2 -- aplicar nos 11 troféus; Águeda, Ramos, Isidoro; rastro da Epifania prata
- [ ] testes -- só os arquivos dos troféus listados (+ `lt_epifania_t2`) mudam; nenhum efeito de luz usa escala não uniforme

**Acceptance Criteria:**
- Given os 14 troféus, when os vejo na página, then a luz acende sem esticar ou deformar, o véu, os ramos e as páginas ficam como pedido, e os outros troféus não mudam

## Implementation Notes

## Spec Change Log

- 22/10/2026: o comentário do dono em Lourdes ("revise todos estes efeitos de luz") estende a troca da luz a Batismo do Senhor (ouro) e Apresentação do Senhor (ouro); `luzDescendo` foi removida e o teste de luz sem esticar cobre todos os arquivos.
- 22/10/2026: novo pedido do dono em Lourdes ("o rosário católico não é este nem terço"): o emoji 📿 da prata e do ouro foi trocado por um terço católico desenhado (5 dezenas, pingente e crucifixo).

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| `luzSuave` sem validação (altura curta, quadros, `peak` acima de 100) | medium | Erros genéricos ou luz invertida nos próximos lotes. **patch**. |
| Páginas de Isidoro dependem da ordem dos subcaminhos do ícone | low | Proteção direta. **patch**. |
| `ramo` e `rastro` sem proteção; comentário de `fica` impreciso | low | Correções diretas. **patch**. |
| Checagem de luz só pelo nome e só pela escala da camada | medium (gap) | Um grupo ou caminho animado traria de volta o "estica". **patch**. |
| Sem teste da ordem palma/véu (Águeda) e das páginas iguais (Isidoro) | medium (gap) | Os pedidos do dono poderiam regredir sem aviso. **patch**. |
| Testes de `luzSuave` incompletos | low | Correção direta. **patch**. |
| Cabeçalho do lote 2 ainda cita "páginas do livro"; linha em branco | low | Correção direta. **patch**. |
| Arquivos aprovados podem mudar sem aviso (sem lista de hashes) | medium | Falta registro do que foi aprovado na página. **defer** D28. |
| Batismo e Apresentação mudaram sem estar na lista | false | Pedido do dono "revise todos estes efeitos de luz", registrado no Spec Change Log. |

**Rota:** 7 `patch`, 1 `defer` (D28), 1 falso. Sem loopback.

## Verification

**Commands:**
- `node scripts/trophy-lot-1.js && node scripts/trophy-lot-2.js && git diff --stat assets/lottie/trophies` -- expected: só arquivos dos 14 troféus e `lt_epifania_t2`
- `npx vitest run` e `npx tsc --noEmit` -- expected: sem falhas; tsc exit 0
