---
title: 'Story 11.7: ajuste do dono (rodada 2) — Santa Águeda com a pessoa sob o véu'
type: 'bugfix'
created: '2026-10-22'
status: 'in-progress'
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
