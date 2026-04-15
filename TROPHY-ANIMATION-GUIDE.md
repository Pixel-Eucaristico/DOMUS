# Guia de Criação de Animações Lottie para Troféus DOMUS

## Visão Geral
- **213 troféus** total: 29 achievements, 6 mensais, 48 sazonais, 113 litúrgicos
- **30 com Lottie APROVADOS** (29 achievements + 1 mensal), faltam **183**
- Troféus de achievement têm **4 tiers** (Bronze/Prata/Ouro/Diamante) = 5 arquivos cada
- Troféus mensais têm **1 arquivo** (sem tiers)
- Troféus sazonais têm **3 tiers** (Bronze/Prata/Ouro) = 3 arquivos: base + _t2 + _t3
- Troféus litúrgicos: verificar no código se têm tiers

## Arquitetura

### Projeto Preview (para visualizar antes de aprovar)
- **Local:** `C:/Code/ReactNative/DOMUS-Rive-Preview/`
- **Rodar:** `cd DOMUS-Rive-Preview && node node_modules/vite/bin/vite.js`
- **URL:** `http://localhost:5173/`
- **Trofeus:** `src/trophyList.ts` (213 IDs)
- **Status:** `src/App.tsx` → `APPROVED_DEFAULTS`
- **Player:** `src/TrophyPreview.tsx` (lottie-web, tier selector)
- **Assets:** `public/assets/lottie/trophies/*.json`

### Projeto Principal DOMUS
- **Assets Lottie:** `assets/lottie/trophies/*.json`
- **Componente:** `src/components/gamification/LottieTrophy.tsx`
  - `APPROVED_LOTTIE` = registry de troféus com Lottie (require() estáticos)
  - Fallback: LottieTrophy → AnimatedTrophy (SVG) → AnimatedSeasonalTrophy
- **Grid:** `src/components/gamification/AchievementGrid.tsx`
- **Modal:** `src/components/gamification/TrophyDetailModal.tsx`
- **Types:** `packages/gamification/src/types.ts`
- **Reducer:** `packages/gamification/src/reducer.ts`

### Scripts de Geração
- **Local:** `scripts/gen_trophy_*.js` (1 por troféu)
- **SVG Vertices:** `scripts/lottie-verts*.json` (convertidos de SVGs reais)
- **SVG Refs:** `scripts/ref-*.svg` (SVGs de referência do UXWing)
- **Templates:** `scripts/trophy-templates.js` (config de 213 troféus)

## Fluxo de Criação (6 passos)

### 1. Pesquisar conceito visual
```
WebSearch: "best trophy animation concept for [nome do troféu]"
```
Definir: elementos visuais, metáfora, cores, animação entrada/idle.

### 2. Buscar SVGs reais
```
WebFetch: https://uxwing.com/[nome]-icon/
Download: curl -sL "[url]" -o scripts/ref-[nome].svg
```
Fontes: UXWing (gratuito, sem atribuição), assets locais em `C:/Users/WillianQuintino/Pictures/Animated-Catholic-Icons/`

### 3. Converter SVG → Lottie vertices
```javascript
const SvgPath = require('svgpath');
// Separar subpaths: fullD.split(/(?=M)/)
// Converter cada: svgToLottie(d, scale, offsetX, offsetY)
// Salvar: scripts/lottie-verts-[nome].json
```

### 4. Gerar script de animação
```javascript
// scripts/gen_trophy_[id].js
// Canvas: 200x200, 30fps, 90 frames (3s loop)
// Layers: Sparkles > Elementos > Glow (ordem = frente → trás)
// Timing: 0-16 entrada bounce, 16-30 elementos secundários, 30+ loop idle
// Salvar: assets/lottie/trophies/[id].json + [id]_t1-t4.json
// + copiar para DOMUS-Rive-Preview/public/assets/lottie/trophies/
```

### 5. Preview
- Adicionar em `DOMUS-Rive-Preview/src/App.tsx` → `APPROVED_DEFAULTS` como "pending"
- Recarregar preview, clicar no card, testar tiers

### 6. Aprovar e integrar
Após aprovação:
- Mudar status para "approved" no preview
- Adicionar no `LottieTrophy.tsx` → `APPROVED_LOTTIE`
- Atualizar `ROADMAP.md`

## Padrão de Animação Lottie JSON

```javascript
{
  v: "5.7.4", fr: 30, ip: 0, op: 90, w: 200, h: 200,
  nm: "Nome do Troféu", ddd: 0, assets: [], markers: [],
  layers: [
    // Primeira layer = na FRENTE (renderiza por cima)
    // Última layer = ATRÁS
    sparkles,     // estrelas piscando
    mainElement,  // elemento principal (moeda, escudo, etc.)
    secondaryEl,  // elemento secundário
    glow,         // brilho de fundo
    confetti,     // opcional: confetti particles
    borderGlow,   // opcional: borda brilhante
  ]
}
```

### Helpers comuns
```javascript
const bY = 108; // posição Y base (centro vertical)
const io = {i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}}; // easing
const io3 = {i:{x:[.667,.667,.667],y:[1,1,1]},o:{x:[.333,.333,.333],y:[0,0,0]}}; // easing 3D

// Float animation (sobe/desce suave)
function floatKF(baseY, startFrame) { ... }

// Make fill
function mf(color) { return {ty:"fl",c:{a:0,k:color},o:{a:0,k:100},r:1,bm:0,nm:"F"} }

// Make stroke
function ms(color, width) { return {ty:"st",c:{a:0,k:color},o:{a:0,k:100},w:{a:0,k:width},lc:2,lj:2,bm:0,nm:"S"} }
```

### Cores por Tier
```javascript
const TIER_COLORS = {
  1: { coin: [.804,.498,.196,1], glow: [.804,.498,.196,1] },  // Bronze
  2: { coin: [.75,.75,.78,1], glow: [.75,.75,.78,1] },        // Prata
  3: { coin: [1,.843,0,1], glow: [1,.843,0,1] },              // Ouro
  4: { coin: [.31,.765,.969,1], glow: [.31,.765,.969,1] },     // Diamante
};
```

## Troféus Faltantes

### Mensais (5 restantes - sem tiers)
- monthly_equilibrado (Mês Equilibrado) ⚖️
- monthly_poupanca (Poupança do Mês) 💰
- monthly_controle (Controle Total) 🛡️
- monthly_dizimo (Oferta Mensal) 🙏
- monthly_saldo_positivo (No Azul) 📈

### Sazonais (48 - sem tiers)
- seasonal_ano_novo, seasonal_carnaval, seasonal_dia_mulher...
- Ver lista completa em `DOMUS-Rive-Preview/src/trophyList.ts`

### Litúrgicos (113 - sem tiers)
- lt_maria_mae_deus, lt_epifania, lt_batismo_senhor...
- Assets católicos disponíveis: `C:/Users/WillianQuintino/Pictures/Animated-Catholic-Icons/`
  - 75 SVGs titulados em `Design/SVG/Expanded/Titled/`
  - 45 Lottie JSONs animados em `Animation/Json/`
  - Incluem: Sacred Heart, Church, Rosary, Cross, Angel, etc.

## Bug Conhecido
- O preview (`TrophyPreview.tsx`) tenta carregar `{id}_t{tier}.json` primeiro. Para troféus mensais (sem tiers), se existirem arquivos `_t1`-`_t4` antigos do batch, o preview carrega o antigo em vez do novo. **Solução:** deletar `_t*` arquivos antigos do preview.

## Ferramentas de IA Tentadas
- **Gemini CLI** — gera JSON mas qualidade limitada, MCP do Rive não funciona no Windows
- **OmniLottie** — instalado em `C:/Code/OmniLottie/` mas modelo incompatível com Windows (path hardcoded Linux)
- **LottieFiles MCP** — API requer autenticação (403)
- **Melhor abordagem atual:** gerar por código (scripts Node.js) com SVGs reais de referência
