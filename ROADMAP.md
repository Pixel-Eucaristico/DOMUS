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

### 08 — Animação Individual para Cada Troféu (197 troféus) — INFRA CONCLUÍDA
- **Dificuldade:** COMPLEXO | **Urgência:** BAIXA | **~15-25h (com acompanhamento)**
- **Problema:** Todos os troféus usam mesma animação genérica. Precisa animação única por troféu
- **Total:** 40 conquistas + 6 mensais + 48 sazonais + 73 litúrgicos = 167 troféus
- **Solução:** Criar config map por troféu/categoria com parâmetros de animação customizados
- **Detalhes:** [docs/roadmap/08-animacao-trofeus.md](docs/roadmap/08-animacao-trofeus.md) (lista completa de todos os 167 troféus)
- [x] Criar `src/constants/trophyAnimationConfigs.ts` — 17 categorias temáticas + overrides individuais; cobre os 197 troféus reais (29 conquistas + 6 mensais + 48 sazonais + 114 litúrgicos), validado por teste
- [x] Refatorar AnimatedTrophy e AnimatedSeasonalTrophy para aceitar config (`TrophyMotion.tsx`: 6 movimentos, 4 efeitos, 4 entradas, 6 tipos de partícula)
- [x] DebugTools mostra categoria/movimento/efeito/partículas de cada troféu para revisão
- [ ] Revisão individual com aprovação — ajustar em `TROPHY_OVERRIDES` conforme feedback (preview no DebugTools)

### 09 — Leitor de Holerite por OCR ✅ CONCLUÍDA
- **Dificuldade:** COMPLEXO | **Urgência:** MÉDIA | **~6-10h**
- **Depende de:** Tarefa 05 (OCR Android — CONCLUÍDA)
- **Já implementado:** Payslip OCR schema (Zod) + VisionOCRService + scan_payslip no chat
- **Falta:**
- **Nota:** "olerite" = **holerite** (contracheque), não medidor de óleo — alinhado ao PayslipOCRSchema já existente
- [x] `packages/parsers/src/payslipParser.ts` — texto OCR → empresa, CNPJ, competência, bruto, líquido, rubricas, descontos, FGTS + confiança/avisos; normaliza o retorno do Vision OCR
- [x] Eventos `PAYSLIP_RECORDED` / `PAYSLIP_DELETED` + `domain/src/payslips.ts` (histórico, resumo, variação, % de descontos)
- [x] Tela `app/payslips.tsx`: câmera/galeria (Vision IA com fallback para OCR local) ou manual, revisão editável, lançamento opcional do líquido como receita
- [x] Histórico com gráfico de evolução (líquido × bruto) e descontos acumulados
- [x] Chat IA: "Escanear holerite" abre a revisão na tela de holerites
- [x] Testes unitários (parser 19 + domínio 9)
- **Detalhes:** [docs/roadmap/09-olerite-ocr.md](docs/roadmap/09-olerite-ocr.md)

### 10 — ~~Bug: Tour Sumindo / Saindo Fora da Tela~~ ✅ RESOLVIDO
- **Solução:** Tour com spotlight (`rn-tourguide`) removido completamente. Substituído por `ScreenIntroModal` — modal simples por tela, sem spotlight, sem scroll, sem dados fictícios. Aparece uma vez na primeira visita de cada tela.

### 11 — Bug: Barra de Progresso da Poupança não Contabiliza nos Objetivos Vinculados ✅ RESOLVIDO
- **Dificuldade:** MÉDIO | **Urgência:** ALTA
- **Causa raiz (2 bugs):**
  1. `accounts.tsx` passava `linkedItems` apenas para contas do tipo `savings` — contas `checking`/`wallet` vinculadas a objetivos nunca mostravam o accordion
  2. `AccountCard` e `WishlistItemRow` calculavam progresso com `item.price` ignorando `item.quantity` — meta exibida errada para itens com quantidade > 1
- **Correções:**
  - `accounts.tsx`: `acc.type === "savings"` → `acc.type !== "credit_card"` (alinhado com `SavingsGoalSection`)
  - `AccountCard.tsx`: `item.price ?? 0` → `(item.price ?? 0) * (item.quantity ?? 1)` (3 ocorrências)
  - `WishlistItemRow.tsx`: `item.price` → `item.price * (item.quantity ?? 1)` na barra de progresso

### 12 — Bug/Feature: IA não Responde ao "Olá" + Mensagem Diária de Boas-Vindas ✅ RESOLVIDO
- **Dificuldade:** MÉDIO | **Urgência:** MÉDIA
- **Causa raiz (bug):** Stale closure no `renderInputToolbar` do GiftedChat — `onSend` capturava `inputText = ""` do primeiro render e nunca atualizava. Sugestões funcionavam porque passavam o texto explicitamente via `handleQuickSuggestion`.
- **Correções:**
  - `ChatInputBar.tsx`: `onSend()` → `onSend(text.trim())` — passa o texto direto, independente de closure
  - `ai-chat.tsx`: `onSend` recebe `txt: string` do `ChatInputBar`, elimina dependência de `inputText` no closure
  - `ai-chat.tsx`: welcome diário com `domus_ai_last_greeting_date_v1` em AsyncStorage — gera uma vez por dia, aparece mesmo com histórico existente

### 13 — Bug/Melhoria: TTS Sobrepondo Partes + Juntar Áudios em Arquivo Único ✅
- **Dificuldade:** MÉDIO | **Urgência:** MÉDIA
- **Problemas:**
  1. O TTS estava sobrepondo a reprodução da parte anterior ao iniciar a segunda parte (race condition)
  2. Experiência fragmentada: pausas entre partes, sobreposição de fala
- **Solução implementada:** Download paralelo de todos os chunks + concatenação pura em memória (WAV: merge correto de header RIFF + data; MP3: concatenação de frames) + reprodução de arquivo único. Sem dependências externas.
- **Implementado:**
  - [x] Download de todos os chunks em paralelo (`Promise.all`)
  - [x] Concatenação WAV: merge correto do header RIFF + data chunks (sem biblioteca)
  - [x] Concatenação MP3: concatenação direta de frames (compatível com todos players)
  - [x] Reprodução única do arquivo concatenado (sem race condition possível)
  - [x] Fallback sequential com `await` correto + delay 80ms inicial (evita polling prematuro)
  - [x] Limpeza do arquivo temporário após reprodução (`finally`)

### Pendências da Fase 4
- [x] **Tooltips Inteligentes:** implementado sem dependência nova (`src/components/shared/InfoTip.tsx`, balão ancorado) + glossário `src/constants/financialGlossary.ts`
    - Dicas no orçamento 50/30/20, no dividendo CDB e na tela de holerites
    - Chat IA mostra atalhos "O que é…" para termos citados (respeita a opção Tooltips)
    - `react-native-sprinkle-toast` já está instalado e em uso
- [x] **Upgrade de OCR:** motor de Holerite finalizado (ver tarefa 09)
    - MiniChart no chat já existe (`src/components/ai/MiniChart.tsx`)
    - FinancialCard e BudgetChart já existem

---

## Ordem de Execução Recomendada

```
PRÓXIMO (rápido, alto impacto):
  3.1 - FlashList ...................... [FÁCIL]            ~2-3h
  3.2 - Temas Católico/Laico .......... [MÉDIO]            ~4-6h

MÉDIO PRAZO:
  09 - Holerite OCR .................... ✅ CONCLUÍDA
  08 - Animação Troféus (configs) ...... ✅ infra pronta — falta revisão individual

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
# react-native-smart-tooltip — dispensado: tooltips implementados in-house (InfoTip)
```

### Referências das Bibliotecas

| Biblioteca | Fase | Expo Managed | Docs |
|---|---|:---:|---|
| `@bsky.app/expo-scroll-edge-effect` | 3 | ✅ | [reactnative.directory](https://reactnative.directory/package/@bsky.app/expo-scroll-edge-effect) |
| `react-native-smart-tooltip` | 4 | ✅ | [reactnative.directory](https://reactnative.directory/package/react-native-smart-tooltip) |
| `@rive-app/react-native` | 3 | ✅ | [reactnative.directory](https://reactnative.directory/package/@rive-app/react-native) |

*Nota: Antes de cada tarefa, será realizada uma análise técnica detalhada com planejamento via Task Master.*
 
---

### 14 — Feature: Transferência com Data de Devolução (Empréstimo) ✅
- **Dificuldade:** FÁCIL-MÉDIO | **Urgência:** BAIXA
- **Contexto:** Usuário empresta dinheiro a alguém (ou a si mesmo entre contas) e quer registrar a data de devolução. Hoje só existe transferência simples sem retorno agendado.
- **Solução desejada:** Ao criar uma transferência, campo opcional "Data de devolução". Na data configurada, o app gera automaticamente uma transferência pendente de volta (`targetAccount → sourceAccount`), como lembrete/pré-lançamento.
- **Plano técnico:**
  - **`packages/events/src/types.ts`** — adicionar em `TransactionPayload`:
    ```ts
    returnDate?: string;          // YYYY-MM-DD — data esperada de devolução
    returnTransactionId?: string; // ID da transferência de retorno gerada
    isReturnTransfer?: boolean;   // marca a tx de volta para não gerar loop
    ```
  - **`packages/domain/src/reducer.ts`** — ao processar `TRANSACTION_CREATED` com `type === "transfer"` e `returnDate` presente (e `!isReturnTransfer`): criar automaticamente um segundo evento `TRANSACTION_CREATED` com `type: "transfer"`, `accountId: targetAccountId`, `targetAccountId: accountId`, `date: returnDate`, `status: "pending"`, `isReturnTransfer: true`, `returnTransactionId: id`.
  - **`src/components/transactions/TransferForm.tsx`** (ou equivalente) — adicionar DatePicker opcional "Devolução em" que popula `returnDate`.
  - **UI:** na lista de transações, transferências com `returnDate` futuro mostram badge "↩ dd/mm" indicando retorno pendente.
  - **Notificação:** na data de devolução, push notification "Lembrete: devolução de R$ X esperada hoje".
- **Implementado:**
  - [x] Campos `returnDate`, `returnTransactionId`, `isReturnTransfer` em `TransactionPayload`
  - [x] `createTransactionEvent` aceita `returnDate` — ao salvar transfer com returnDate, despacha automaticamente tx de retorno pendente
  - [x] `DatePickerField` opcional com prop `onClear` no form de transferência
  - [x] Badge "↩ dd/mm" com `theme.warning` na lista de transações
  - [x] `computeReturnTransferReminders()` no `NotificationScheduler` + registrado no pipeline

---

### 15 — Feature: Conta CDB/Poupança com Crédito Adicional para Cartão
- **Dificuldade:** MÉDIO | **Urgência:** BAIXA
- **Contexto:** Usuário quer vincular uma conta poupança/CDB a um cartão de crédito, onde o saldo depositado (não dividendos) vira crédito adicional no cartão — separado do limite configurado manualmente. Dividendos entram na conta sem inflacionar o crédito adicional.
- **Solução desejada:**
  - Conta do tipo `savings` pode ser marcada como "CDB vinculado ao cartão X"
  - `creditoAdicional = saldo_cdb - dividendos_acumulados`
  - Limite efetivo do cartão = `creditLimit (fixo) + creditoAdicional`
  - Dividendos registrados com flag especial → não somam ao crédito adicional
  - Crédito adicional é **read-only** nas configurações do cartão (não editável pelo usuário)
- **Plano técnico:**
  - **`packages/events/src/types.ts`**:
    ```ts
    // Em AccountPayload:
    linkedCreditCardId?: string;   // savings → aponta para credit_card que recebe boost
    cdbDividendsTotal?: number;    // soma acumulada de dividendos (não conta como crédito)

    // Em TransactionPayload:
    isCdbDividend?: boolean;       // receita marcada como dividendo — não altera crédito adicional
    ```
  - **`packages/domain/src/accounts.ts`** — nova função:
    ```ts
    export function getCdbAdditionalCredit(
      cdbAccount: AccountPayload,   // savings vinculada
    ): number {
      // crédito adicional = saldo atual - dividendos acumulados
      return Math.max(0, cdbAccount.balance - (cdbAccount.cdbDividendsTotal ?? 0));
    }
    ```
  - **`getAvailableCredit()`** — atualizar para somar `getCdbAdditionalCredit(linkedCdb)` ao `creditLimit` quando houver conta CDB vinculada.
  - **`packages/domain/src/reducer.ts`** — ao processar `TRANSACTION_CREATED` com `isCdbDividend: true` na conta CDB: incrementar `cdbDividendsTotal` da conta em vez de apenas o `balance`.
  - **UI — Configuração da conta savings:**
    - Toggle "Vincular como CDB a cartão" → picker de contas `credit_card`
    - Ao depositar, opção "É dividendo/rendimento" (checkbox) → seta `isCdbDividend: true`
  - **UI — Card do cartão de crédito:**
    - Exibir `Limite: R$ X (fixo) + R$ Y (CDB)` quando houver vínculo
    - Campo `creditLimit` no form fica bloqueado para edição do crédito adicional (mostra como info)
- **Implementado:**
  - [x] Campos `linkedCreditCardId`, `cdbDividendsTotal` em `AccountPayload`
  - [x] Campo `isCdbDividend` em `TransactionPayload`
  - [x] Função `getCdbAdditionalCredit()` e atualizar `getAvailableCredit()`
  - [x] Reducer: acumular `cdbDividendsTotal` em dividendos
  - [x] UI: toggle vínculo na tela de edição de conta savings
  - [x] UI: checkbox "É dividendo" ao adicionar receita na conta CDB
  - [x] UI: exibir breakdown do limite no card do cartão
 