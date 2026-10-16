# Tarefa 08 - Animacao Individual para Cada Trofeu

## Status: INFRA CONCLUIDA (2026-10) — falta revisao individual

> - Config map: `src/constants/trophyAnimationConfigs.ts` (17 categorias + `TROPHY_OVERRIDES`)
> - Motor: `src/components/gamification/TrophyMotion.tsx` (movimento, entrada, efeito, particulas)
> - `AnimatedTrophy` / `AnimatedSeasonalTrophy` leem a config pelo ID do trofeu
> - Total real: 197 trofeus (29 conquistas + 6 mensais + 48 sazonais + 114 liturgicos)
> - Para ajustar um trofeu: editar a entrada dele em `TROPHY_OVERRIDES`; conferir no DebugTools

## Prioridade: COMPLEXO | Urgencia: BAIXA
## Estimativa: ~15-25h (com acompanhamento) | Arquivos: ~5-10

---

## Problema
Atualmente todos os trofeus usam a mesma animacao generica. O usuario quer animacao unica para cada trofeu, com acompanhamento individual.

## Sistema Atual de Animacoes

### AnimatedTrophy.tsx (Achievements)
- Rotacao 3D: 0 -> 2pi em 3500ms (linear)
- Shine overlay: opacidade varia com cos(rotation)
- ScaleX: Math.cos(rotation)
- 3 niveis de raridade: Silver, Gold, Diamond (gradientes diferentes)

### AnimatedSeasonalTrophy.tsx (Seasonal/Liturgical)
- Float vertical: 0 <-> 1 em 2200ms (sine)
- Rotacao Y: 0 -> 360 em 5000ms (linear)
- Glow pulsante: 0.8 <-> 0.3 em 1800ms
- Scale de entrada: 0.9 -> 1 em 600ms
- 3 sparkle particles com interpolacao

---

## LISTA COMPLETA DE TODOS OS TROFEUS (167 total)

### A. CONQUISTAS (40 trofeus)

#### Originais (8)
| ID | Nome | Tier | XP |
|----|------|------|-----|
| `first_transaction` | Primeiros Passos | Silver | 20 |
| `ten_transactions` | Organizador | Silver | 30 |
| `first_dizimo` | Dizimista Fiel | Gold | 50 |
| `streak_7` | Semana de Ouro | Gold | 50 |
| `streak_30` | Mes Perfeito | Diamond | 150 |
| `budget_ok` | Guardiao do Orcamento | Gold | 60 |
| `level_5` | Planejador | Gold | 50 |
| `level_10` | Mestre Financeiro | Diamond | 200 |

#### Grupo A - Transacoes (3)
| ID | Nome | Tier | XP |
|----|------|------|-----|
| `tx_50` | Cronista | Gold | 60 |
| `tx_100` | Historiador Financeiro | Gold | 100 |
| `tx_500` | Guardiao do Livro-Caixa | Diamond | 250 |

#### Grupo B - Streak (4)
| ID | Nome | Tier | XP |
|----|------|------|-----|
| `streak_3` | Faisca | Silver | 20 |
| `streak_14` | Quinzena Consistente | Gold | 80 |
| `streak_90` | Trimestre Disciplinado | Diamond | 350 |
| `streak_365` | Lendario | Diamond | 1000 |

#### Grupo C - Orcamento 50/30/20 (3)
| ID | Nome | Tier | XP |
|----|------|------|-----|
| `budget_3mo` | Equilibrio em Serie | Gold | 120 |
| `budget_6mo` | Mestre do Equilibrio | Diamond | 300 |
| `budget_12mo` | Arquiteto Financeiro | Diamond | 800 |

#### Grupo D - Poupanca (3)
| ID | Nome | Tier | XP |
|----|------|------|-----|
| `savings_1mo` | Primeiro Passo para Riqueza | Silver | 60 |
| `savings_3mo` | Poupador Consistente | Gold | 150 |
| `savings_elite` | Poupador Elite | Gold | 120 |

#### Grupo E - Controle de Desejos (2)
| ID | Nome | Tier | XP |
|----|------|------|-----|
| `wants_1mo` | Autocontrole | Silver | 40 |
| `wants_3mo` | Disciplina nos Gastos | Gold | 100 |

#### Grupo F - Niveis (2)
| ID | Nome | Tier | XP |
|----|------|------|-----|
| `level_20` | Especialista em Financas | Diamond | 400 |
| `level_50` | Grao-Mestre | Diamond | 1000 |

#### Grupo G - Uso Completo (4)
| ID | Nome | Tier | XP |
|----|------|------|-----|
| `first_income` | Primeiro Salario | Silver | 20 |
| `five_categories_month` | Vida Completa | Silver | 35 |
| `positive_balance` | Sempre no Azul | Gold | 80 |
| `dizimo_3mo` | Ofertante Fiel | Gold | 100 |

#### Series de Conquistas Infinitas (11 series)
- **transactions:** 1,10,50,100,500 -> +500
- **streak:** 3,7,14,30,90,365 -> +365
- **level:** 5,10,20,50 -> +50
- **budget_months:** 1,3,6,12 -> +12
- **savings_months:** 1,3 -> +3
- **wants_months:** 1,3 -> +3
- **dizimo_months:** 1,3 -> +3

---

### B. TROFEUS MENSAIS (6 trofeus)

| ID | Nome | XP | Emoji |
|----|------|-----|-------|
| `monthly_registros` | Registrador do Mes | 30 | Lapis |
| `monthly_equilibrado` | Mes Equilibrado | 50 | Balanca |
| `monthly_poupanca` | Poupanca do Mes | 40 | Cofre |
| `monthly_controle` | Controle Total | 35 | Escudo |
| `monthly_dizimo` | Oferta Mensal | 45 | Maos |
| `monthly_saldo_positivo` | No Azul | 40 | Grafico |

---

### C. TROFEUS SAZONAIS (48 trofeus - 4 por mes)

#### Janeiro
| ID | Nome | XP | Emoji |
|----|------|-----|-------|
| `seasonal_ano_novo` | Recomeco de Ouro | 35 | Fogos |
| `seasonal_planejamento_anual` | Arquiteto do Ano | 50 | Prancheta |
| `seasonal_dia_de_reis` | Encerramento Sabio | 45 | Coroa |
| `seasonal_queima_velhos` | Renovacao Financeira | 30 | Fogo |

#### Fevereiro
| ID | Nome | XP | Emoji |
|----|------|-----|-------|
| `seasonal_carnaval` | Foliao Consciente | 55 | Mascara |
| `seasonal_valentine` | Amor com Planejamento | 30 | Coracao |
| `seasonal_quaresma` | Jejum de Gastos | 50 | Cruz |
| `seasonal_mes_coracao` | Coracao no Azul | 35 | Coracao Azul |

#### Marco
| ID | Nome | XP | Emoji |
|----|------|-----|-------|
| `seasonal_dia_mulher` | Diversidade Financeira | 30 | Roxo |
| `seasonal_dia_consumidor` | Consumidor Inteligente | 45 | Carrinho |
| `seasonal_inicio_outono` | Guarda-Roupa Consciente | 40 | Folha |
| `seasonal_prep_pascoa` | Pascoa Planejada | 35 | Pintinho |

#### Abril
| ID | Nome | XP | Emoji |
|----|------|-----|-------|
| `seasonal_pascoa` | Pascoa sem Dividas | 35 | Coelho |
| `seasonal_tiradentes` | Resistencia Financeira | 50 | Espada |
| `seasonal_descobrimento` | Descobridor do Orcamento | 30 | Mapa |
| `seasonal_mes_boleto` | Mestre dos Boletos | 50 | Documento |

#### Maio
| ID | Nome | XP | Emoji |
|----|------|-----|-------|
| `seasonal_dia_trabalho` | Valorize seu Trabalho | 30 | Martelo |
| `seasonal_dia_maes` | Presente com Carinho | 35 | Flor |
| `seasonal_combate_fumo` | Habito Saudavel | 45 | Proibido |
| `seasonal_abolicao` | Liberdade Financeira | 70 | Pomba |

#### Junho
| ID | Nome | XP | Emoji |
|----|------|-----|-------|
| `seasonal_dia_namorados` | Amor Equilibrado | 35 | Casal |
| `seasonal_festa_junina` | Arraial Controlado | 45 | Tenda |
| `seasonal_meio_ambiente` | Consumo Consciente | 30 | Planta |
| `seasonal_corpus_christi` | Feriado Planejado | 40 | Igreja |

#### Julho
| ID | Nome | XP | Emoji |
|----|------|-----|-------|
| `seasonal_ferias_julho` | Ferias Inteligentes | 65 | Praia |
| `seasonal_dia_avos` | Raizes Solidas | 30 | Avos |
| `seasonal_nossa_sra_carmo` | Oferta do Coracao | 30 | Maos |
| `seasonal_inverno` | Aquecimento Economico | 50 | Cachecol |

#### Agosto
| ID | Nome | XP | Emoji |
|----|------|-----|-------|
| `seasonal_dia_pais` | Presente sem Parcelas | 35 | Gravata |
| `seasonal_dia_estudante` | Educacao Financeira | 30 | Livros |
| `seasonal_volta_aulas` | Volta as Aulas Planejada | 45 | Mochila |
| `seasonal_liquidacao_inverno` | Liquidacao com Cabeca | 45 | Etiqueta |

#### Setembro
| ID | Nome | XP | Emoji |
|----|------|-----|-------|
| `seasonal_independencia` | Independencia Financeira | 70 | Brasil |
| `seasonal_prep_crianca` | Reserve para as Criancas | 35 | Urso |
| `seasonal_primavera` | Florescimento Financeiro | 40 | Flor |
| `seasonal_transito` | Custos Fixos na Mao | 40 | Carro |

#### Outubro
| ID | Nome | XP | Emoji |
|----|------|-----|-------|
| `seasonal_dia_criancas` | Infancia com Alegria | 40 | Carrossel |
| `seasonal_outubro_rosa` | Saude e Investimento | 35 | Laco Rosa |
| `seasonal_halloween` | Susto no Orcamento? Nao! | 30 | Abobora |
| `seasonal_prep_natal` | Natal Antecipado | 50 | Arvore |

#### Novembro
| ID | Nome | XP | Emoji |
|----|------|-----|-------|
| `seasonal_black_friday` | Black Friday Consciente | 80 | Sacola |
| `seasonal_finados` | Legado Financeiro | 50 | Vela |
| `seasonal_consciencia_negra` | Consciencia no Consumo | 35 | Punho |
| `seasonal_novembro_azul` | Saude em Dia | 30 | Coracao Azul |

#### Dezembro
| ID | Nome | XP | Emoji |
|----|------|-----|-------|
| `seasonal_natal` | Natal sem Dividas | 80 | Papai Noel |
| `seasonal_decimo_terceiro` | 13o Bem Aplicado | 90 | Dinheiro |
| `seasonal_ferias_verao` | Verao Planejado | 70 | Sol |
| `seasonal_balanco_anual` | Balanco do Ano | 60 | Grafico |

---

### D. TROFEUS LITURGICOS (73 trofeus)

#### Festas Moveis (10)
| ID | Nome | XP | Dificuldade |
|----|------|-----|-------------|
| `lt_cinzas` | Quarta de Cinzas | 40 | Medio |
| `lt_ramos` | Domingo de Ramos | 30 | Facil |
| `lt_quinta_santa` | Quinta-Feira Santa | 45 | Facil |
| `lt_sexta_paixao` | Sexta da Paixao | 50 | Dificil |
| `lt_pascoa` | Pascoa da Ressurreicao | 60 | Medio |
| `lt_ascensao` | Ascensao do Senhor | 55 | Dificil |
| `lt_pentecostes` | Pentecostes | 45 | Facil |
| `lt_corpus_christi` | Corpus Christi | 50 | Facil |
| `lt_sagrado_coracao` | Sagrado Coracao | 45 | Facil |
| `lt_advento` | 1o Domingo Advento | 40 | Medio |

#### Janeiro (10)
| ID | Nome |
|----|------|
| `lt_maria_mae_deus` | Maria Mae de Deus |
| `lt_epifania` | Epifania do Senhor |
| `lt_batismo_senhor` | Batismo do Senhor |
| `lt_antonio_abade` | Santo Antonio Abade |
| `lt_sebastiao` | Sao Sebastiao |
| `lt_ines` | Santa Ines |
| `lt_francisco_sales` | Sao Francisco de Sales |
| `lt_conv_paulo` | Conversao de Sao Paulo |
| `lt_tomas_aquino` | Sao Tomas de Aquino |
| `lt_joao_bosco` | Sao Joao Bosco |

#### Fevereiro-Dezembro (53 trofeus)
*(Cada mes tem 5-11 santos/festas - ver arquivo completo: `packages/gamification/src/liturgicalTrophies.ts`)*

#### Trofeus Compostos (3)
| ID | Nome | XP | Dificuldade |
|----|------|-----|-------------|
| `lt_pedro_paulo` | Sao Pedro e Paulo | 50 | Medio |
| `lt_santana` | Sant'Ana e Sao Joaquim | 35 | Facil |
| `lt_cristo_rei` | Cristo Rei do Universo | 60 | Dificil |

---

## Proposta de Implementacao

### Abordagem: Config Map por Trofeu
Criar um mapa de configuracao de animacao para cada trofeu (ou categoria):

```typescript
interface TrophyAnimationConfig {
  // Movimento principal
  primaryMotion: "spin" | "float" | "bounce" | "shake" | "pulse" | "swing";
  motionSpeed: number; // ms

  // Efeito secundario
  secondaryEffect: "glow" | "sparkle" | "trail" | "ripple" | "none";
  effectColor?: string;

  // Entrada
  entryAnimation: "scale" | "fade" | "slide" | "flip";
  entryDuration: number;

  // Particulas
  particles: "stars" | "hearts" | "fire" | "snow" | "confetti" | "none";
  particleCount: number;
}
```

### Categorias de Animacao Sugeridas
| Categoria | Trofeus | Animacao |
|-----------|---------|----------|
| Financeiro | budget_*, savings_*, wants_* | Moedas caindo + brilho dourado |
| Streak | streak_* | Chama crescente + particulas fogo |
| Transacao | tx_*, first_transaction, ten_transactions | Escrita/registro + flash |
| Level | level_* | Explosao de estrelas + escala |
| Religioso | lt_*, first_dizimo, dizimo_* | Luz divina + aureola |
| Sazonal (festa) | seasonal_carnaval, seasonal_festa_junina | Confete + cores vibrantes |
| Sazonal (economia) | seasonal_black_friday, seasonal_*_consciente | Cofre + moedas |
| Sazonal (familia) | seasonal_dia_maes, seasonal_dia_pais | Coracoes + brilho suave |
| Mensal | monthly_* | Selo carimbado + flash |

### Processo com Acompanhamento
1. Definir a config de animacao para CADA trofeu individualmente
2. Implementar um de cada vez
3. Mostrar preview para aprovacao antes de prosseguir
4. Ajustar parametros baseado no feedback

## Arquivos a Modificar
- `src/components/gamification/AnimatedTrophy.tsx` - refatorar para aceitar config
- `src/components/gamification/AnimatedSeasonalTrophy.tsx` - refatorar para config per-trophy
- Criar: `src/constants/trophyAnimationConfigs.ts` - mapa ID -> config
- `src/components/gamification/SurpriseTrophyCard.tsx` - passar config
- `src/components/gamification/TrophyDecorationFactory.tsx` - coordenar com animacao
