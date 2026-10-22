---
title: 'Story 11.7: ajuste do dono (rodada 2) — Santa Águeda com a pessoa sob o véu'
type: 'bugfix'
created: '2026-10-22'
status: 'done'
baseline_commit: '20789d6847281597a0af7875c727e2fdfd0c5fd1'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O dono ainda acha estranho o véu de Santa Águeda e pergunta: "não é melhor colocar uma pessoa para parecer mesmo um véu?". Um véu sozinho não se reconhece.

**Approach:** Em `lt_agueda` (3 níveis), desenhar no gerador o busto simples de uma jovem (rosto e ombros, no estilo do manto de `lt_maria_mae_deus`, com outra paleta: véu claro, veste vermelha de mártir); o gesto passa a ser o véu de tecido descendo e cobrindo a cabeça dela, caindo em dobras sobre os ombros, e a palma do martírio subindo à frente. Prata acrescenta o lírio, ouro a coroa de mártir, como hoje. Só os 3 arquivos de `lt_agueda` mudam; todos os testes continuam valendo (janela visível, quadro final, palma antes do véu, unicidade).

</frozen-after-approval>

## Implementation Notes

- `scripts/trophy-lot-2.js`, `gestoAgueda`: o gesto passa a ter três peças, da frente para trás `G_Palma`, `G_Veu` e `G_Busto`. O `G_Busto` é a jovem no estilo do manto de `lt_maria_mae_deus`, com outra paleta: rosto claro (`#F7DECE`) de olhos fechados, bochechas e boca, cabelo castanho solto até os ombros, pescoço e veste vermelha de mártir (`#BE1931`) com decote. Entra subindo 8 px e fica parado.
- O `G_Veu` é um pano branco em arco: cobre o alto da cabeça, contorna o rosto (avesso em `#E1E8ED` na borda da abertura) e cai pelos dois lados sobre os ombros, com dobras e barra ondulada. O meio da veste fica à vista. A âncora fica no alto do véu, em (108, 61). Do quadro 18 ao 40 o véu desce 27 px (de y 36 a 63) enquanto abre (escala de 84×76 % a 100 %) e gira de −6° a 1°. Até o quadro 46 sobe 2 px de volta (y 61) e a rotação volta de 1° a 0°. Depois balança ±1,2°; antes balançava ±3°, mas agora o pano fica preso ao corpo parado.
- A palma, o lírio (prata) e a coroa (ouro) continuam. O lírio foi para (152, 168) e agora fica na frente do véu. A coroa diminuiu de 26 para 24, desce para (108, 52) e pousa no alto do véu, sobre a auréola. A auréola de base foi para `center: [108, 57], rx: 15`, acima da cabeça. Também mudaram o `symbol` da tabela, a peça principal (`desenho-veu` virou `desenho-jovem-veu`, na tabela `DRAWN`, na tabela de troféus e no cabeçalho) e a descrição dela e o cabeçalho do gerador.
- Verificação: depois de `node scripts/trophy-lot-1.js && node scripts/trophy-lot-2.js`, `git status --short assets/lottie/trophies` mostra só `lt_agueda.json`, `lt_agueda_t2.json` e `lt_agueda_t3.json`. `npx vitest run scripts/__tests__` passou: 3 arquivos, 67 testes, incluindo janela visível, quadro final, palma antes do véu e unicidade. Renderizei o quadro final dos três níveis e os quadros intermediários (8 a 56) com um renderizador descartável: a figura se lê como uma jovem de véu branco e veste vermelha, com a palma à frente.
- Ajustes da revisão (sem mudar a saída: os três `lt_agueda*.json` ficaram idênticos byte a byte): o teste de ordem das camadas de Águeda em `trophyLot2.test.ts` agora também confere o busto atrás do véu nos três níveis e o lírio (prata) e a coroa (ouro) na frente do véu; o parágrafo do cabeçalho do gerador foi reajustado.

## Review Triage Log

- Rejeitados, porque o dono aprovou a aparência atual de Santa Águeda: as tiras da veste aparecendo nos ombros, os cantos da veste, o cabelo escondido pelo véu, o contraste entre a veste e o brilho, a coroa cobrindo a auréola e a faixa `Avesso`.
- Aceitos e feitos: o teste de ordem das camadas ampliado (palma, lírio e coroa na frente do véu, busto atrás); o cabeçalho do gerador reajustado; a peça `desenho-veu` renomeada para `desenho-jovem-veu`; os números do movimento do véu nestas notas corrigidos conforme os quadros-chave.
