# Prompt para Continuar Criação de Troféus Lottie

Cole este prompt no início de um novo chat:

---

Estou criando animações Lottie para troféus do app DOMUS (app financeiro pessoal em React Native/Expo).

Leia o arquivo `TROPHY-ANIMATION-GUIDE.md` na raiz do projeto para entender a arquitetura completa.

## Estado Atual
- 29 achievements com Lottie APROVADOS e integrados no app
- 1 mensal (monthly_registros) com Lottie criado mas NÃO APROVADO (precisa testar)
- 5 mensais faltam criar
- 48 sazonais faltam criar
- 113 litúrgicos faltam criar (usar assets católicos de `C:/Users/WillianQuintino/Pictures/Animated-Catholic-Icons/`)

## Fluxo de trabalho (SEGUIR SEMPRE):
1. **Pesquisar** conceito visual (WebSearch)
2. **Buscar SVGs** reais (UXWing, etc.)
3. **Converter** SVG → Lottie vertices (svgpath lib)
4. **Gerar** script JS que cria o JSON Lottie
5. **Rodar** script e copiar para preview (`DOMUS-Rive-Preview/public/assets/lottie/trophies/`)
6. **Abrir preview** (`cd DOMUS-Rive-Preview && node node_modules/vite/bin/vite.js`)
7. **Eu aprovo** ou peço ajustes
8. **Após aprovação:** registrar no `LottieTrophy.tsx` → `APPROVED_LOTTIE`, atualizar preview `App.tsx`, atualizar `ROADMAP.md`

## Regras:
- Troféus mensais/sazonais/litúrgicos: **1 arquivo** (sem tiers _t1-_t4), o app conta repetições
- Troféus achievement: **5 arquivos** (base + _t1 a _t4) com diferenças visuais progressivas
- Canvas: 200x200, 30fps, 90 frames
- Sempre pesquisar SVG real antes de criar formas geométricas
- NÃO gerar em massa — fazer UM troféu por vez, eu aprovo, depois o próximo
- Sempre copiar o JSON para o preview E rodar o server do preview
- NÃO marcar como "approved" no preview antes de EU aprovar

## Próximo troféu a fazer:
- Testar e aprovar `monthly_registros` (calendário com check)
- Depois: `monthly_equilibrado` (Mês Equilibrado)

## Build APK:
```bash
cd android && export ANDROID_HOME="C:/Users/WillianQuintino/AppData/Local/Android/Sdk" && ./gradlew assembleRelease
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n br.com.pixeleucaristico.domus/.MainActivity
```

---
