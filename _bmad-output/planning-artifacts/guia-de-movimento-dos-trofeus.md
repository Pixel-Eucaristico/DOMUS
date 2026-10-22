---
title: 'Guia de movimento dos troféus'
status: approved
approved: '2026-10-22'
owner: Sally (UX)
---

# Guia de movimento dos troféus

Vale para todo Lottie novo de troféu (Story 11.7 e lotes seguintes). Base: troféus já aprovados (`seasonal_natal`, `streak_7`) e `ROADMAP.md` §3.4.

## 1. Regra principal: um gesto por troféu

Cada troféu tem um **gesto próprio** de 1 a 2 s que conta o que ele significa. Coberto o ícone, o movimento ainda deve lembrar o troféu. A base comum (entrada, brilho, halo) fica discreta e não substitui o gesto.

## 2. Forma

- Desenho solto, sem medalha ou disco em volta, como o `seasonal_natal`.
- Quadro 200×200, 30 fps, 90 quadros (3 s), em laço; margem igual à dos aprovados.
- Cada gesto usa de 2 a 4 peças animadas separadas (ex.: nota e cofrinho), de fontes com licença aberta citadas no gerador.
- Litúrgicos: auréola que acende e elementos que flutuam suave (ROADMAP §3.4); cor litúrgica da festa como cor de apoio.

## 3. Níveis

Conquistas têm 4 níveis; sazonais e litúrgicos têm 3 (bronze na 1ª vez, prata na 2ª, ouro da 3ª em diante, por `getSeasonalTier`). O nível **aumenta o gesto**, não só a cor:

| Nível | O gesto ganha |
|---|---|
| Bronze | o gesto básico, pouco brilho |
| Prata | um elemento a mais e brilho prateado |
| Ouro | o gesto completo, com raios, confete ou luz descendo |
| Diamante (só conquistas) | aura azul e o efeito final |

Arquivos: `x.json` (bronze), `x_t2` (prata), `x_t3` (ouro); conquistas `x_t1` a `x_t4`.

## 4. Gestos do lote 1

| Troféu | Gesto | Prata acrescenta | Ouro acrescenta |
|---|---|---|---|
| 13º Bem Aplicado | a nota cai e entra no cofrinho, que dá um pulinho | segunda nota; cofrinho balança | chuva de notas; cofrinho brilha e solta estrela |
| Verão Planejado | o sol nasce no horizonte e o mar ondula | gaivota cruza | raios fortes e reflexo dourado no mar |
| Balanço do Ano | barras sobem uma a uma e aparece um ✓ | seta de tendência sobe | confete dourado e ✓ brilhando |
| Maria Mãe de Deus | coroa desce devagar sobre o manto azul, auréola acende | estrelas em volta | luz descendo e 12 estrelas |
| Epifania | a estrela cruza o céu com rastro e para brilhando | rastro mais longo | três presentes (ouro, incenso, mirra) aparecem embaixo |
| Batismo do Senhor | a pomba desce em voo; gota cai e faz ondas | ondas maiores | luz do alto sobre a pomba |
| Santo Antônio Abade | o porquinho trota ao centro, cajado em T atrás | sino pequeno balança | auréola com raios |
| São Sebastião | flechas chegam e param; palma do martírio sobe | mais flechas | coroa de mártir acima |
| Santa Inês | o cordeiro deita; a palma se abre por cima | lírio ao lado | coroa e luz |
| São Francisco de Sales | a pena escreve uma linha que vira coração | o coração pulsa | chamas de caridade no coração |
| Conversão de São Paulo | clarão de luz desce do alto (⚡ do app) e a espada aparece | raios do clarão | livro das cartas se abre |
| São Tomás de Aquino | o livro se abre e um sol pequeno nasce das páginas | pomba sobre o livro | sol completo com raios |
| São João Bosco | a criança pula e duas mãos de acolhimento aparecem | segunda criança | auréola e confete |
