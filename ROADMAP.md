# Roadmap DOMUS — Tarefas Pendentes

> Tarefas concluídas foram movidas para [docs/history/COMPLETED.md](docs/history/COMPLETED.md)
> Diário de desenvolvimento em [docs/history/CHANGELOG.md](docs/history/CHANGELOG.md)

---

## Fase 3: Design System "Premium" (Tamagui & Rive)

*Foco: Transformar a identidade visual e a performance da interface.*

**Estado atual:**
- 6 archetypes de tema (explorer, organizer, planner, strategist, investor, independent) × light/dark = 12 variantes
- Engine em `packages/theme/src/themeEngine.ts`, hook `useThemePreferences`
- 135 arquivos usam `StyleSheet.create()`, tema aplicado via inline styles
- 6 arquivos usam `FlatList` efetivamente
- 33 arquivos de troféus com `react-native-reanimated` + `react-native-svg`
- Flag `isCatholic` já implementado (AsyncStorage + modal de preferência)

---

### 3.1 — Listas Ultra-Rápidas (FlashList) — CONCLUÍDA
- **Dificuldade:** FÁCIL | **Urgência:** MÉDIA | **~2-3h**
- **Impacto:** Scroll 120Hz em listas longas (wishlist, categorias, lojas, troféus debug)
- **Dependência:** `@shopify/flash-list@2.0.2` (instalado via expo)
- **Arquivos migrados** (5 arquivos — FlatList → FlashList):
    - [x] `app/(tabs)/wishlist.tsx` — estimatedItemSize: 100
    - [x] `app/wishlist/index.tsx` — estimatedItemSize: 100
    - [x] `src/components/shared/CategoryPickerModal.tsx` — estimatedItemSize: 48
    - [x] `src/components/wishlist/StoreGridModal.tsx` — estimatedItemSize: 80 (grid 5 cols)
    - [x] `src/components/debug/DebugTools.tsx` — estimatedItemSize: 72
- **Nota:** Zero FlatList restante no código-fonte

### 3.2 — Temas Dinâmicos Católico/Laico
- **Dificuldade:** MÉDIO | **Urgência:** MÉDIA | **~4-6h**
- **Já existe:** `isCatholic` flag + `ReligiousPreferenceModal` + 6 archetypes com dark mode
- **Falta implementar:**
    - [x] Criar paleta católica em `themeEngine.ts`: 6 archetypes × light/dark = 12 variantes católicas (dourado/vinho/marfim/bordô)
    - [x] Criar paleta laica: paleta original mantida (já funciona)
    - [x] Modificar `getThemeForArchetype(archetype, isDark, isCatholic)` — 3º parâmetro adicionado + hook atualizado
    - [x] Adicionar ícones litúrgicos sutis nos headers quando `isCatholic=true`
        - `CatholicHeaderIcon` component com 5 ícones SVG inline (cross, heart, dove, chalice, fish)
        - Rotação diária automática, opacity 0.3, tamanho 16px
        - Adicionado nos 4 tabs: Home, Wishlist, Contas, Temporada
        - 6 SVGs copiados para `assets/icons/catholic/` (celtic-cross, sacred-heart, rosary, divine-light, holy-candle, church-window)
    - [x] Testar 12 variantes existentes + 12 católicas = 24 temas total

### 3.3 — Migração Gradual para Tamagui — CONCLUÍDA
- **Status:** Etapas A, B e C completas em 19/03/2026
- **Detalhes:** Movidos para [docs/history/COMPLETED.md](docs/history/COMPLETED.md)

### 3.4 — Animações Lottie para Troféus (167 troféus individuais)
- **Dificuldade:** COMPLEXO | **Urgência:** BAIXA | **~15-25h**
- **Dependência:** `yarn add @rive-app/react-native`
- **Referência:** [rive_animated_icons](https://github.com/nikkieke/rive_animated_icons) — exemplos de ícones animados com Rive em apps mobile
- **Assets locais:** `C:\Users\WillianQuintino\Pictures\Animated-Catholic-Icons\`
    - 45 Lottie JSONs animados (prontos para uso com `lottie-react-native`)
    - 75 SVGs titulados + PNG, PDF, Figma, After Effects (.aep), GIF, MP4
    - **Ícones animados disponíveis (75):**
      Advent Wreath, Altar, Angel Wings, Angel, Baptism, Begena, Belgium Church, Bible Book, Bible, Candleholder, Catholic Church, Catholic Nun, Catholic Priest, Celtic Cross, Cemetery Gate, Christ Blessing, Christian Banner, Christian Grave, Christian Locket, Christian Necklace, Church Donation, Church Lamp, Church Organ, Church Window, Church, Coffin, Communion Food, Coptic Cross, Crown, Divine Light, Easter Cross, Easter Egg, Eggs Basket, Eucharist, Gothic Cross, Holding Candle, Holy Bell, Holy Candle, Holy Communion, Holy Lamb, Holy Scripture, Holy Water, Jesus Hands, Jesus Sculpture, Jesus Statue, Mother Mary, Nativity Scene, Oath, Oil Lamp, Papal Tiara, Peace Sign, Pope Hat, Prayer Mat, Praying Nun, Presbyterian Cross, Rabbit, Reading Bible, Rosary, Sacred Heart, Saint Patrick, Seraph Cherub, Seraphim, Sparkle Firework, St Cathedral, Vigil Lamp, Wedding Rings
- **Componentes atuais:** `AnimatedTrophy.tsx` + `AnimatedSeasonalTrophy.tsx` (SVG + Reanimated)

#### Estilo Visual por Categoria

**Troféus Litúrgicos (73) — Flat/Ilustração de Santos:**
- Silhuetas estilizadas flat design dos santos católicos
- Ex: São Francisco → silhueta com pássaros, Nossa Senhora Aparecida → manto azul estilizado
- Carlo Acutis → silhueta jovem com laptop/hóstia
- Fontes: SVGs flat de repositórios abertos (Wikimedia, OpenClipart, Flaticon)
- Animação: aureola brilhando, elementos flutuando suavemente

**Troféus Sazonais (48) — SVG Temático do Evento Real:**
- Cada troféu tem um SVG representativo do tema concreto:
  - Dia do Consumidor → carrinho de compras animado
  - Dia dos Namorados → casal se abraçando / corações
  - Black Friday → sacolas de compra com etiquetas
  - Natal → árvore de Natal com estrela brilhando
  - Páscoa → coelho com ovos coloridos
  - Dia das Mães → flores / abraço mãe-filho
  - Dia dos Pais → gravata / ferramentas
  - Carnaval → máscara com confetes
  - Ano Novo → fogos de artifício / relógio
  - Dia do Trabalho → capacete / engrenagens
- Fontes: SVGRepo, Undraw, OpenClipart, Storyset (free)

**Troféus de Conquista (40) — Ícones Temáticos + Medalha:**
- Ícone SVG do tema no centro (cofre, gráfico subindo, moeda, estrela, foguete)
- Borda de medalha animada conforme raridade (bronze/prata/ouro/diamante)
- Ex: "Primeira Economia" → cofrinho com moeda caindo + borda bronze
- Ex: "Mestre do Orçamento" → gráfico com check + borda ouro

**Troféus Mensais (6) — Calendário Animado:**
- Ícone de calendário com número do mês + elemento sazonal
- Borda que pulsa conforme streak (meses consecutivos)

#### Setup — CONCLUÍDO
- [x] `@rive-app/react-native@0.3.0` instalado
- [x] `LottieTrophy.tsx` criado (fallback SVG automático quando .json não existe, suporte a tiers por rarity)
- [x] `assets/rive/trophies/` diretório criado
- [x] Projeto preview web: `C:\Code\ReactNative\DOMUS-Rive-Preview\` (React + Vite + @rive-app/react-canvas)
- [x] `completionCounts: Record<string, number>` no GamificationState + reducer + badges ×N

#### Produção — EM PROGRESSO (troféu a troféu)

**Ferramentas:**
- Rive Desktop (Windows): baixar de [rive.app/downloads](https://rive.app/downloads)
- Rive MCP Server: `@rive-mcp/server-core` (configurado no Gemini CLI)
- Gemini CLI: gera animações via MCP quando Rive Desktop está aberto
- Preview web: `C:\Code\ReactNative\DOMUS-Rive-Preview\` (`npm run dev`)

**Fluxo por troféu:**
1. Abrir Rive Desktop → Gemini CLI envia comandos via MCP
2. Gemini cria a animação com 4 tiers (Bronze/Prata/Ouro/Diamante)
3. Exportar .riv → colocar em `assets/rive/trophies/{id}.riv`
4. Aprovar no preview web → adicionar ID no `APPROVED_RIV` em `RiveTrophy.tsx`

**Prompt base para Gemini CLI (copiar e adaptar):**
```
Usando o Rive MCP, crie animação para o troféu "{NOME}" (ID: {ID}).
Conceito: {DESCRIÇÃO VISUAL}
4 tiers via State Machine Number Input 'tier':
- tier=1 Bronze: cores #CD7F32/#8B5A2B
- tier=2 Prata: cores #C0C0C0/#808080
- tier=3 Ouro: cores #FFD700/#DAA520
- tier=4 Diamante: cores #4FC3F7/#0288D1
Estados: idle (flutuando), unlock (trigger: animação principal), tap (trigger: wiggle+flash)
200x200px, fundo transparente.
Salve: C:/Code/ReactNative/DOMUS/assets/rive/trophies/{ID}.riv
```

**Progresso: 80/213 troféus aprovados (29 achievements + 6 mensais + 45 sazonais)**
- [x] 29 achievements com Lottie APROVADOS (4 tiers cada)
- [x] `monthly_registros` — Registrador do Mês (calendário + check verde + estrela, sem tiers) ✓ APROVADO
- [x] `monthly_equilibrado` — Mês Equilibrado (balança azul + check verde, sem tiers) ✓ APROVADO
- [x] `monthly_poupanca` — Poupança do Mês (porquinho cofrinho SVG + moeda caindo, sem tiers) ✓ APROVADO
- [x] `monthly_controle` — Controle Total (escudo Bootstrap SVG + checkmark branco + pulso, sem tiers) ✓ APROVADO
- [x] `monthly_dizimo` — Oferta Mensal (mãos em oração SVG + coração + cruz + raios, sem tiers) ✓ APROVADO
- [x] `monthly_saldo_positivo` — No Azul (gráfico tendência + dots + seta verde + badge +, sem tiers) ✓ APROVADO

- [x] `seasonal_ano_novo` — Recomeço de Ouro (fogos de artifício + estrela dourada + ribbon, sem tiers) ✓ APROVADO

- [x] `seasonal_planejamento_anual` — Arquiteto do Ano (clipboard + checklist + estrela, sem tiers) ✓ APROVADO

- [x] `seasonal_dia_de_reis` — Encerramento Sábio (coroa Tabler SVG + 3 gemas + estrela, sem tiers) ✓ APROVADO

- [x] `seasonal_queima_velhos` — Renovação Financeira (fogo Bootstrap SVG + broto verde + brasas, sem tiers) ✓ APROVADO

- [x] `seasonal_carnaval` — Folião Consciente (máscaras teatro FA SVG + confetes, sem tiers) ✓ APROVADO

- [x] `seasonal_valentine` — Amor com Planejamento (coração FA SVG + moeda + mini corações + heartbeat, 3 tiers) ✓ APROVADO

- [x] `seasonal_quaresma` — Jejum de Gastos (cruz FA SVG + moeda com slash + raios, 3 tiers) ✓ APROVADO

- [x] `seasonal_mes_coracao` — Coração no Azul (coração azul FA SVG + ECG + heartbeat, 3 tiers) ✓ APROVADO

- [x] `seasonal_dia_mulher` — Diversidade Financeira (Venus FA SVG + flores + pulse, 3 tiers) ✓ APROVADO

- [x] `seasonal_dia_consumidor` — Consumidor Inteligente (carrinho FA SVG + moedas + badge, 3 tiers) ✓ APROVADO

- [x] `seasonal_inicio_outono` — Guarda-Roupa Consciente (folha FA SVG + cabide + folhas caindo, 3 tiers) ✓ APROVADO

- [x] `seasonal_prep_pascoa` — Páscoa Planejada (ovo BS SVG + pintinho + mini ovos, 3 tiers) ✓ APROVADO

- [x] `seasonal_pascoa` — Páscoa sem Dívidas (coelho UXWing SVG + check + mini ovos, 3 tiers) ✓ APROVADO

- [x] `seasonal_tiradentes` — Resistência Financeira (espadas cruzadas SVG + escudo BS + triângulo Inconfidência, 3 tiers) ✓ APROVADO

- [x] `seasonal_descobrimento` — Descobridor do Orçamento (bússola BS SVG + agulha giratória + N/S/E/W + bandeira BR, 3 tiers) ✓ APROVADO

- [x] `seasonal_independencia` — Independência Financeira (troféu verde com losango BR + círculo azul + fogos de artifício nas cores do Brasil, 3 tiers) ✓ APROVADO

- [x] `seasonal_prep_crianca` — Reserve para as Crianças (caixa de presente com laço + moedas + estrelas, 3 tiers) ✓ APROVADO

- [x] `seasonal_primavera` — Florescimento Financeiro (flor daisy bezier real + caule + folhas + moedas, 3 tiers) ✓ APROVADO

- [x] `seasonal_mes_boleto` — Mestre dos Boletos (receipt BS SVG + barcode + check stamp, 3 tiers) ✓ APROVADO

- [x] `seasonal_dia_trabalho` — Valorize seu Trabalho (martelo Game-icons SVG + engrenagem + moeda, 3 tiers) ✓ APROVADO

- [x] `seasonal_dia_maes` — Presente com Carinho (flor 6 pétalas + coração + heartbeat, 3 tiers) ✓ APROVADO

- [x] `seasonal_combate_fumo` — Hábito Saudável (cigarro + proibido + coração verde, 3 tiers) ✓ APROVADO

- [x] `seasonal_abolicao` — Liberdade Financeira (corrente quebrando Game-icons SVG + pomba FA SVG + raios, 3 tiers) ✓ APROVADO

- [x] `seasonal_dia_namorados` — Amor Equilibrado (casal homem+mulher vestido + coração + heartbeat, 3 tiers) ✓ APROVADO

- [x] `seasonal_festa_junina` — Arraial Controlado (fogueira Game-icons SVG + bandeirinhas + balões São João, 3 tiers) ✓ APROVADO

- [x] `seasonal_meio_ambiente` — Consumo Consciente (árvore BS SVG + tronco + reciclagem BS SVG + gotas, 3 tiers) ✓ APROVADO

- [x] `seasonal_corpus_christi` — Feriado Planejado (ostensório geométrico + sunburst + hóstia + gemas, 3 tiers) ✓ APROVADO

- [x] `seasonal_ferias_julho` — Férias Inteligentes (guarda-sol praia + areia + mar + sol + moeda, 3 tiers) ✓ APROVADO

- [x] `seasonal_dia_avos` — Raízes Sólidas (árvore com raízes Game-icons SVG + coração + óculos, 3 tiers) ✓ APROVADO

- [x] `seasonal_nossa_sra_carmo` — Oferta do Coração (escapulário + cruz Jesus + M/estrelas Maria + coração, 3 tiers) ✓ APROVADO

- [x] `seasonal_inverno` — Aquecimento Econômico (xícara quente + vapor + moeda, 3 tiers) ✓ APROVADO

- [x] `seasonal_dia_pais` — Presente sem Parcelas (gravata Game-icons SVG + presente + moeda, 3 tiers) ✓ APROVADO

- [x] `seasonal_dia_estudante` — Educação Financeira (livro aberto + moedas flutuando + estrelas, 3 tiers) ✓ APROVADO

- [x] `seasonal_volta_aulas` — Volta às Aulas Planejada (mochila UXWing SVG real + moeda + sparkles, 3 tiers) ✓ APROVADO

- [x] `seasonal_liquidacao_inverno` — Liquidação com Cabeça (etiqueta Bootstrap tag-fill SVG + moeda + %, 3 tiers) ✓ APROVADO

**Próximo:** Troféus sazonais (16 restantes)

---

### Ordem de Execução da Fase 3

```
RÁPIDO (fazer primeiro):
  3.1 - FlashList .................. [FÁCIL]     ~2-3h

MÉDIO (após FlashList):
  3.2 - Temas Católico/Laico ....... [MÉDIO]     ~4-6h

LONGO PRAZO (quando houver tempo):
  3.3 - Migração Tamagui ........... [COMPLEXO]  ~40-60h
  3.4 - Animações Lottie ............. [COMPLEXO]  ~15-25h (depende de assets)
```

---

## Fase 5: Correções, Polimento e Novas Features

**Detalhes completos em: `docs/roadmap/`**

### 08 — Animação Individual para Cada Troféu (167 troféus)
- **Dificuldade:** COMPLEXO | **Urgência:** BAIXA | **~15-25h (com acompanhamento)**
- **Problema:** Todos os troféus usam mesma animação genérica. Precisa animação única por troféu
- **Total:** 40 conquistas + 6 mensais + 48 sazonais + 73 litúrgicos = 167 troféus
- **Solução:** Criar config map por troféu/categoria com parâmetros de animação customizados
- **Detalhes:** [docs/roadmap/08-animacao-trofeus.md](docs/roadmap/08-animacao-trofeus.md) (lista completa de todos os 167 troféus)
- [ ] Criar `trophyAnimationConfigs.ts` com mapa de configs
- [ ] Refatorar AnimatedTrophy e AnimatedSeasonalTrophy para aceitar config
- [ ] Implementar um a um com aprovação individual

### 09 — Leitor de Olerite por OCR (Parcial)
- **Dificuldade:** COMPLEXO | **Urgência:** MÉDIA | **~6-10h**
- **Depende de:** Tarefa 05 (OCR Android — CONCLUÍDA)
- **Já implementado:** Payslip OCR schema (Zod) + VisionOCRService + scan_payslip no chat
- **Falta:**
- [ ] Criar `oleriteParser.ts` (parser dedicado para medidores)
- [ ] Criar tela de captura dedicada reutilizando OcrScanScreen
- [ ] Implementar histórico com gráfico de evolução
- [ ] Testes unitários
- **Detalhes:** [docs/roadmap/09-olerite-ocr.md](docs/roadmap/09-olerite-ocr.md)

### 10 — Bug: Tour Sumindo / Saindo Fora da Tela
- **Dificuldade:** MÉDIO | **Urgência:** ALTA
- **Problema:** O tour guiado está com comportamento bugado — elementos saem fora dos limites da tela e o overlay desaparece inesperadamente durante a navegação
- **Investigar:**
  - [ ] Verificar cálculo de posição do highlight (scroll offset não considerado?)
  - [ ] Checar se `measure()` / `measureInWindow()` retorna coordenadas corretas em todos os tamanhos de tela
  - [ ] Garantir que o tour respeita `SafeAreaInsets` (notch, barra de status)
  - [ ] Testar em dispositivos com telas menores e com teclado aberto

### 11 — Bug: Barra de Progresso da Poupança não Contabiliza nos Objetivos Vinculados
- **Dificuldade:** MÉDIO | **Urgência:** ALTA
- **Problema:** A barra que calcula o progresso na poupança (com flag de objetivo) não reflete corretamente nos objetivos vinculados exibidos no menu sanfona (accordion)
- **Investigar:**
  - [ ] Verificar se o valor acumulado na poupança está sendo propagado para o `goalId` vinculado
  - [ ] Checar se a query/selector de objetivos relê o saldo após transações de poupança
  - [ ] Garantir que o cálculo de `currentAmount` do objetivo considera depósitos categorizados como poupança
  - [ ] Testar criação de objetivo → vincular à poupança → adicionar transação → verificar barra no accordion

### 12 — Bug/Feature: IA não Responde ao "Olá" + Mensagem Diária de Boas-Vindas
- **Dificuldade:** MÉDIO | **Urgência:** MÉDIA
- **Problemas:**
  1. Ao enviar "Olá" para a IA ela não responde (só funciona ao clicar nas sugestões)
  2. Claude funciona nas sugestões mas não no input livre
  3. Seria ideal: a IA enviar automaticamente uma mensagem de boas-vindas diária ao abrir o chat
- **Investigar:**
  - [ ] Checar se o handler de envio de mensagem livre está conectado corretamente ao provider ativo
  - [ ] Verificar se há algum filtro ou validação bloqueando mensagens curtas/saudações
  - [ ] Implementar mensagem de boas-vindas diária: ao abrir o chat, se for o primeiro acesso do dia, a IA envia automaticamente uma mensagem de boas-vindas personalizada (nome do usuário, dica financeira do dia, humor/motivação)
  - [ ] Armazenar `lastGreetingDate` em AsyncStorage para não repetir no mesmo dia

### 13 — Bug/Melhoria: TTS Sobrepondo Partes + Juntar Áudios em Arquivo Único
- **Dificuldade:** MÉDIO | **Urgência:** MÉDIA
- **Problemas:**
  1. O TTS está sobrepondo a reprodução da parte anterior ao iniciar a segunda parte (race condition)
  2. Experiência fragmentada: pausas entre partes, sobreposição de fala
- **Solução desejada:** Baixar todas as partes, concatenar em um único arquivo de áudio e reproduzir o arquivo final unificado
- **Investigar/Implementar:**
  - [ ] Pesquisar melhor abordagem para concatenar áudio no React Native (ex: `react-native-audio-toolkit`, `ffmpeg-kit-react-native`, ou API nativa)
  - [ ] Baixar todas as partes em paralelo antes de iniciar reprodução
  - [ ] Concatenar os buffers/arquivos de áudio em um único arquivo temporário
  - [ ] Reproduzir apenas o arquivo final concatenado (sem fragmentação)
  - [ ] Fallback: se concatenação falhar, reproduzir partes em sequência com await correto (sem sobreposição)
  - [ ] Limpar arquivo temporário após reprodução

### Pendências da Fase 4
- [ ] **Tooltips Inteligentes:** `react-native-smart-tooltip` (não instalado ainda)
    - `react-native-sprinkle-toast` já está instalado e em uso
- [ ] **Upgrade de OCR:** Finalizar motor de Olerite/Holerite para automação total
    - MiniChart no chat já existe (`src/components/ai/MiniChart.tsx`)
    - FinancialCard e BudgetChart já existem

---

## Ordem de Execução Recomendada

```
PRÓXIMO (rápido, alto impacto):
  3.1 - FlashList ...................... [FÁCIL]            ~2-3h
  3.2 - Temas Católico/Laico .......... [MÉDIO]            ~4-6h

MÉDIO PRAZO:
  09 - Olerite OCR (parte restante) .... [COMPLEXO]         ~4-6h
  08 - Animação Troféus (configs) ...... [COMPLEXO]         ~15-25h

LONGO PRAZO:
  3.3 - Migração Tamagui .............. [COMPLEXO]         ~40-60h
  3.4 - Animações Lottie ................ [COMPLEXO]         ~15-25h
```

---

## Checklist de Novas Dependências (Para Instalar)

```bash
# UI & Performance
yarn add tamagui @rive-app/react-native @bsky.app/expo-scroll-edge-effect
# @shopify/flash-list — já instalado (v2.0.2)

# UX
yarn add react-native-smart-tooltip
```

### Referências das Bibliotecas

| Biblioteca | Fase | Expo Managed | Docs |
|---|---|:---:|---|
| `@bsky.app/expo-scroll-edge-effect` | 3 | ✅ | [reactnative.directory](https://reactnative.directory/package/@bsky.app/expo-scroll-edge-effect) |
| `react-native-smart-tooltip` | 4 | ✅ | [reactnative.directory](https://reactnative.directory/package/react-native-smart-tooltip) |
| `@rive-app/react-native` | 3 | ✅ | [reactnative.directory](https://reactnative.directory/package/@rive-app/react-native) |

*Nota: Antes de cada tarefa, será realizada uma análise técnica detalhada com planejamento via Task Master.*
 
 