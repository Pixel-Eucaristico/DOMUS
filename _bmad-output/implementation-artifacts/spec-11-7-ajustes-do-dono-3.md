---
title: 'Story 11.7: ajustes do dono no lote 3 (rodada 3)'
type: 'bugfix'
created: '2026-10-22'
status: 'in-progress'
baseline_commit: '35f8088688a323b9bc7eb5096e4054aa55b029b3'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-7-lote-3.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Na página de aprovação o dono pediu ajuste em 6 troféus do lote 3: Ascensão ("coloca Jesus glorioso"), Fátima ("Nossa Senhora ficou estranha e escondida"), São Matias ("parece apologia a jogos, encontre outra representação"), Sagrado Coração ("a coroa de espinhos está sobre"), São Tomé ("não parece uma chaga; coloque o corpo completo e a mão dentro da chaga") e Visitação ("esse braço está estranho").

**Approach:** Redesenho proposto pela UX (Sally), 3 níveis cada:
- **Ascensão:** Jesus glorioso (figura de corpo inteiro, túnica branca, braços abertos) sobe sobre a nuvem enquanto a `luzSuave` acende; prata: pegadas na pedra; ouro: céu se abre com raios.
- **Fátima:** Maria maior e centralizada, manto branco com orla dourada e mãos postas, de pé sobre a copa da azinheira (nunca atrás dela); prata: três pastorinhos; ouro: o sol gira e luz.
- **São Matias:** sem dado. Um círculo de 11 chamas pequenas (os Onze) acende a 12ª chama, completando os Doze; prata: livro aberto; ouro: machado do martírio e luz.
- **Sagrado Coração:** a coroa de espinhos envolve o coração (em volta, atravessando a frente e passando por trás), com as chamas e a cruz no alto; demais níveis como hoje.
- **São Tomé:** Jesus ressuscitado de corpo inteiro (túnica branca, chaga visível no lado) e São Tomé de corpo inteiro ao lado, cuja mão entra na chaga; prata: esquadro; ouro: auréolas e raios.
- **Visitação:** Maria e Isabel (bustos) se inclinam uma para a outra com as cabeças próximas; a mão de Isabel pousa sobre a mão de Maria, sem braço solto; prata: estrela entre elas; ouro: luz e flores.

Figuras de corpo inteiro seguem o estilo simples dos bustos (`busto` em `desenhos.js`), com o mesmo tom de pele. Só estes 6 troféus mudam; os lotes 1 e 2 e os outros 21 do lote 3 ficam idênticos.

</frozen-after-approval>

## Implementation Notes
