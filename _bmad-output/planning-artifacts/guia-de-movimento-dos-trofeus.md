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

## 5. Gestos do lote 2 (fevereiro a abril)

| Troféu | Gesto | Prata acrescenta | Ouro acrescenta |
|---|---|---|---|
| Apresentação do Senhor | uma vela se acende e a chama cresce (festa das candeias) | segunda vela | luz descendo e duas pombinhas |
| São Brás | duas velas cruzadas descem e se tocam em X | chamas acendem nas velas | auréola com raios |
| Santa Águeda | uma palma sobe e se abre; um véu desce ao lado | lírio | coroa de mártir |
| Nossa Senhora de Lourdes | a água da fonte brota e corre; a rosa amarela aparece | terço surge ao lado | luz na gruta e estrelas |
| São Valentim | dois corações se aproximam e se encontram | o par de corações pulsa | rosas e confete de corações |
| Cátedra de São Pedro | a cadeira (cátedra) aparece e duas chaves cruzadas descem sobre ela | as chaves brilham | tiara e raios |
| Quarta-Feira de Cinzas | uma cruz de cinza se forma traço a traço e a poeira cai | ramo seco ao lado | luz suave de cima |
| Santas Perpétua e Felicidade | duas palmas sobem lado a lado e se cruzam | duas coroas pequenas | luz e pétalas caindo |
| São Patrício | o trevo de três folhas abre folha por folha | o trevo gira devagar | cruz celta e raios verdes |
| São José Esposo de Maria | o lírio floresce e o martelo de carpinteiro bate na madeira | serra ao lado | auréola e lascas de madeira |
| Anunciação do Senhor | o anjo (asas) desce e o lírio se abre | estrela pequena acende | luz descendo com pomba |
| Domingo de Ramos | ramos de palmeira se agitam de um lado para o outro | mais ramos | mantos no chão e luz |
| Quinta-Feira Santa | o cálice aparece e a hóstia sobe brilhando sobre ele | pão partido ao lado | raios da hóstia |
| Sexta-Feira da Paixão | a cruz se ergue devagar, com o céu escurecendo | coroa de espinhos | o céu clareia atrás da cruz |
| Páscoa da Ressurreição | a pedra do túmulo rola e sai luz | cordeiro com estandarte | sol nascendo e lírios |
| São Isidoro de Sevilha | o livro se abre e as páginas viram | pena escrevendo | estrela do saber e raios |
| São João de La Salle | a lousa escreve "ABC" | maçã sobre a mesa | auréola e confete |
| Carlo Acutis | o notebook abre e a hóstia aparece na tela | cursor de mouse clica | raios e confete de pixels |
| São Jorge | o escudo com a cruz vermelha desce e a lança aparece | o dragão vencido (cauda) embaixo | luz e cavalo branco ao fundo |
| São Marcos Evangelista | o leão alado aparece e o livro se abre | asas batem | auréola e raios |
| Santa Catarina de Sena | o lírio sobe com um livro e um coração | o coração brilha | coroa de espinhos e luz |

## 6. Gestos do lote 3 (maio a julho)

Regras vindas da aprovação dos lotes 1 e 2: a luz usa só a `luzSuave` (sem esticar); santo representado por pessoa usa o busto simples (como Maria e Águeda), não um objeto solto; nada de emoji que não seja fiel à tradição católica (ex.: terço desenhado, não 📿).

| Troféu | Gesto | Prata acrescenta | Ouro acrescenta |
|---|---|---|---|
| São José Operário | a plaina corre sobre a tábua e soltam-se lascas | martelo bate | auréola e raios dourados |
| Nossa Senhora de Fátima | Maria grande e central, manto branco com orla dourada e mãos postas, de pé sobre a azinheira | três pastorinhos pequenos | o sol dança girando e luz |
| São Matias | um círculo de 11 chamas acende a 12ª, completando os Doze | livro aberto | machado do martírio e luz |
| São Isidoro Lavrador | o arado abre um sulco e brotos nascem | anjo (asas) arando ao lado | trigo maduro dourado |
| Santa Rita de Cássia | uma rosa floresce no meio da neve | espinho na fronte (pequena estrela) | figos e luz |
| Visitação de Maria | Maria e Isabel se inclinam uma para a outra; a mão de Isabel pousa sobre a de Maria | estrela entre elas | luz e confete de flores |
| Ascensão do Senhor | Jesus glorioso (corpo inteiro, túnica branca, braços abertos) sobe sobre a nuvem e a luz acende | pegadas na pedra | céu se abre com raios |
| Pentecostes | línguas de fogo descem e acendem | pomba no alto | doze chamas e luz |
| Corpus Christi | a custódia aparece e a hóstia brilha no centro | pétalas caindo | raios dourados da custódia |
| Sagrado Coração de Jesus | o coração com chamas e a cruz pulsa | coroa de espinhos envolvendo o coração (não por cima) | raios de luz do coração |
| São Barnabé | o livro do Evangelho abre sobre uma pedra | ramo de oliveira | auréola e raios |
| Santo Antônio de Lisboa e Pádua | o Menino Jesus (pequeno) aparece sobre o livro aberto | lírio | pães e luz |
| São Luís Gonzaga | o lírio sobe e se abre ao lado do crucifixo | terço católico desenhado | auréola e raios |
| São João Fisher e São Tomás Moro | dois chapéus (cardeal e chanceler) se encontram sobre um livro | palma de mártir | coroa de mártir e luz |
| Natividade de João Batista | a fogueira de São João acende | cordeiro | concha de batismo e água |
| São Ireneu de Lyon | o báculo de bispo se ergue e o livro abre | mitra | auréola e raios |
| São Pedro e São Paulo | as chaves e a espada se cruzam em X | rede de pesca | dupla auréola e luz |
| São Tomé Apóstolo | Jesus ressuscitado e Tomé, de corpo inteiro; a mão de Tomé entra na chaga do lado | esquadro de construtor | auréolas e raios |
| São Bento de Núrsia | a medalha de São Bento gira e mostra a cruz | o corvo pousa | livro da Regra e luz |
| Nossa Senhora do Carmo | o escapulário marrom desce | estrela do Carmelo | Maria (busto, manto marrom) e luz |
| Santa Maria Madalena | o vaso de perfume abre e o aroma sobe | lágrima e coração | luz da manhã de Páscoa |
| Santa Brígida da Suécia | a vela acende sobre o livro das revelações | bordão de peregrina (ela foi peregrina a Roma e Jerusalém) | auréola e raios |
| São Charbel Makhlouf | a lamparina do eremita acende na noite | cedro do Líbano | luz e estrelas |
| São Tiago Maior | a concha de vieira aparece e o bordão de peregrino se ergue | cabaça de peregrino | estrela de Compostela e luz |
| Sant'Ana e São Joaquim | duas figuras (bustos) com a menina Maria entre eles | livro aberto (Ana ensinando) | auréolas e luz |
| Santa Marta | a vassoura varre e um dragão pequeno foge | jarro e prato | auréola e luz |
| São Inácio de Loyola | o monograma IHS acende num sol | livro dos Exercícios | raios e chama |

## 7. Gestos do lote 4 (agosto e setembro)

Regras vindas da aprovação do lote 3: quando a cena tem uma pessoa fazendo algo, usar a figura de corpo inteiro (`figura`) ou o busto (`busto`), com o mesmo tom de pele; Maria grande e visível, nunca escondida; nada que lembre jogo ou aposta; peça principal nunca repetida entre troféus.

| Troféu | Gesto | Prata acrescenta | Ouro acrescenta |
|---|---|---|---|
| São João Maria Vianney | o padre (busto, batina preta e estola roxa) se inclina no confessionário e a grade acende | terço católico desenhado | auréola e luz |
| Transfiguração do Senhor | Jesus (figura, túnica que fica branca e brilhante) sobre o monte, a luz acende | Moisés e Elias pequenos ao lado | nuvem luminosa e raios |
| São Domingos de Gusmão | o cachorrinho com a tocha na boca corre e a tocha acende | terço católico desenhado | estrela na fronte e luz |
| São Lourenço | a grelha aparece e as brasas acendem embaixo | palma de mártir | coroa de mártir e luz |
| Santa Clara de Assis | Clara (busto, hábito marrom e véu) ergue a custódia | lírio | luz e raios da custódia |
| São Maximiliano Kolbe | as duas coroas (branca e vermelha) descem | palma de mártir | auréola e luz |
| Assunção de Nossa Senhora | Maria (figura, manto azul e branco) sobe entre nuvens com a luz | anjos pequenos em volta | coroa de 12 estrelas |
| São Bernardo de Claraval | a colmeia aparece e as abelhas voam (o "Doutor Melífluo") | livro aberto | auréola e raios |
| Maria Rainha | Maria (busto, manto azul) recebe a coroa que desce | cetro | estrelas e luz |
| São Bartolomeu Apóstolo | o livro do Evangelho e a faca do martírio aparecem | palma de mártir | auréola e luz |
| Santa Mônica | Mônica (busto, véu escuro) reza e lágrimas caem | terço católico desenhado | luz da conversão do filho |
| Santo Agostinho | o coração em chamas atravessado pela seta acende | livro das Confissões | mitra e luz |
| Martírio de João Batista | a bandeja aparece com uma palma de mártir (sem cabeça) | cordeiro | luz e coroa de mártir |
| São Gregório Magno | a pomba pousa no ombro do papa (busto, tiara) | partitura do canto gregoriano | auréola e luz |
| Natividade de Nossa Senhora | o berço balança e uma estrela acende sobre ele | Sant'Ana (busto) ao lado | luz e flores |
| São Pedro Claver | as correntes se partem e caem | cruz | auréola e luz |
| Exaltação da Santa Cruz | a cruz se ergue e brilha | coroa de louros | raios e luz |
| Nossa Senhora das Dores | o coração de Maria com as sete espadas acende | lágrimas | luz e estrelas |
| São Mateus Apóstolo | o anjo (asas) aparece sobre o livro aberto | moedas deixadas (cobrador de impostos) | auréola e luz |
| São Pio de Pietrelcina | Padre Pio (busto, hábito marrom e barba) ergue as mãos com luvas | terço católico desenhado | auréola e luz |
| Santos Cosme e Damião | dois médicos (bustos) com a caixa de remédios e o almofariz | palmas de mártir | auréolas e luz |
| São Vicente de Paulo | Vicente (busto) acolhe uma criança | pão | auréola e luz |
| Santos Arcanjos Miguel, Gabriel e Rafael | três pares de asas aparecem: a espada (Miguel), o lírio (Gabriel) e o peixe (Rafael) | escudo de Miguel | luz e raios |
| São Jerônimo | o leão deita ao lado do livro aberto da Vulgata | chapéu de cardeal | auréola e luz |
