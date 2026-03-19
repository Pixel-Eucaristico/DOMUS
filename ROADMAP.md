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

### 3.3 — Migração Gradual para Tamagui
- **Dificuldade:** COMPLEXO | **Urgência:** BAIXA | **~40-60h (longo prazo)**
- **Estratégia:** Migração incremental, NÃO big-bang (135 arquivos com StyleSheet)
- **Dependência:** `yarn add tamagui @tamagui/config`

#### Etapa A — Setup (~4h)
- [ ] Instalar Tamagui + criar `tamagui.config.ts` com tokens mapeados dos 6 archetypes
- [ ] Configurar `TamaguiProvider` no `_layout.tsx` (coexistir com sistema atual)
- [ ] Criar componentes base: `TButton`, `TCard`, `TText`, `TInput`

#### Etapa B — Componentes Atómicos (~15h)
- [ ] Migrar botões (`Pressable` + styles → `TButton`)
- [ ] Migrar cards de conta, transação, troféu
- [ ] Migrar inputs de formulário
- [ ] Migrar modais (containers com `View` → `TCard`)

#### Etapa C — Telas Completas (~20-30h)
- [ ] Migrar telas uma a uma, priorizando as mais usadas
- [ ] Remover `StyleSheet.create` dos arquivos migrados
- [ ] Garantir paridade visual light/dark em todas as telas

### 3.4 — Animações Rive para Troféus (167 troféus individuais)
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

#### Implementação Técnica
- [ ] Buscar/criar SVGs flat para os 73 santos litúrgicos (silhuetas estilizadas)
- [ ] Buscar/criar SVGs temáticos para os 48 eventos sazonais
- [ ] Criar SVGs de conquista (40 ícones + 4 bordas de raridade)
- [ ] Converter SVGs → arquivos `.riv` no editor Rive (community, gratuito)
- [ ] Adicionar State Machines: idle (flutuando), tap (celebração), unlock (brilho + partículas)
- [ ] Criar `trophyAnimationConfigs.ts` mapeando cada troféu ao `.riv` + parâmetros
- [ ] Refatorar `AnimatedTrophy` para: se `.riv` existe → Rive, senão → fallback SVG atual
- [ ] Armazenar `.riv` em `assets/rive/trophies/` organizado por categoria

---

### Ordem de Execução da Fase 3

```
RÁPIDO (fazer primeiro):
  3.1 - FlashList .................. [FÁCIL]     ~2-3h

MÉDIO (após FlashList):
  3.2 - Temas Católico/Laico ....... [MÉDIO]     ~4-6h

LONGO PRAZO (quando houver tempo):
  3.3 - Migração Tamagui ........... [COMPLEXO]  ~40-60h
  3.4 - Animações Rive ............. [COMPLEXO]  ~15-25h (depende de assets)
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
  3.4 - Animações Rive ................ [COMPLEXO]         ~15-25h
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
 