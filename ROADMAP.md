# Roadmap OrcaFacil: Sons, Motion e Gamificacao

## Fases Concluidas

### Fase 1: Infraestrutura Core (CONCLUIDA)
- [x] **AudioService / SoundManager.ts:** Singleton via `expo-av`.
- [x] **Toggle "Efeitos Sonoros":** Nas configuracoes e no `AppStateProvider`.
- [x] **Componentes Motion:** `AnimatedCard` (stagger), `AnimatedIconButton`.
- [x] **Pre-load de audios no Splash:** `tap`, `success`, `pop`, `error`, `trash`, `level-up`.

### Fase 2: Taxonomia de Categorias (UX) (CONCLUIDA)
- [x] **Refatoracao Triade 50/30/20:** Categorias unificadas e mapeadas.
- [x] **Grid Seletor Agrupado:** Implementado com Reanimated Layout Transitions.
- [x] **Busca Instantanea:** Filtro em tempo real com normalizacao de texto.
- [x] **Secao "Recentes/Sugeridas":** Hook `useCategoryIntelligence` criado e integrado.

### Fase 3: Motor de Trofeus (Gamification) (CONCLUIDA)
- [x] **Sistema de Conquistas:** 8 conquistas (Prata/Ouro/Diamante) com `checkNewAchievements()`.
- [x] **Componente AnimatedTrophy:** Animacao rotateY pseudo-3D com `Math.cos(rotation)`.
- [x] **SVG Premium:** Gradientes radiais (Ouro/Prata/Diamante) com shine animado via Reanimated.
- [x] **AchievementToast:** Toast com som + haptic auto-dismiss em 4s.
- [x] **Grid em Season:** Exibe trofeus desbloqueados (animados) e bloqueados (cadeado).

### Fase 4: Demo Mode / Guided Tour (CONCLUIDA)
- [x] **Sandbox State:** `isDemoActive` + `demoEvents` no `DemoModeProvider` com `mockDemoEvents.ts`.
- [x] **Interceptador de Dispatch:** `dispatch` em `AppStateProvider` roteia para `dispatchDemoEvent` quando `isDemoActive`, sem tocar no SQLite.
- [x] **Guided Tour:** `TourOverlay` 4 passos com maquina de estados local, `stopDemo()` no fim.
- [x] **Auto-cleanup:** `stopDemo()` limpa `demoEvents` e desativa `isDemoActive`.
- [x] **First-launch detection:** `DemoModeProvider` detecta primeiro acesso via `AsyncStorage("domus_tour_shown_v1")` e inicia o tour automaticamente.

---

## Fase 5: Correcoes, Polimento e Novas Features

**Ordem: Mais facil ao mais complexo, priorizando urgencia.**
**Detalhes completos em: `docs/roadmap/`**

### 01 - Mudar Cor do Modal Catolico (CONCLUIDA)
- **Dificuldade:** FACIL | **Urgencia:** BAIXA | **~30 min**
- **Problema:** Cores hardcoded no modal `ReligiousPreferenceModal.tsx` podem nao estar alinhadas com design desejado
- **Arquivo:** `src/components/shared/ReligiousPreferenceModal.tsx`
- **Solucao:** Alterar valores de cores no StyleSheet para usar o tema do App
- **Detalhes:** [docs/roadmap/01-cor-modal-catolico.md](docs/roadmap/01-cor-modal-catolico.md)
- [x] Definir novas cores com o designer (Integrado ao sistema de Temas/Arquétipos)
- [x] Aplicar e testar em tema claro/escuro (Validado via DebugTools)

### 02 - Correcao do Som em Areas Sem Audio (CONCLUIDA)
- **Dificuldade:** FACIL | **Urgencia:** MEDIA | **~2h**
- **Problema:** SoundManager funciona mas 15+ componentes nao o utilizam. 4 sons definidos (`levelUp`, `reveal`, `trash`, `error`, `share`) nunca sao tocados
- **Areas criticas:** Invoice Import (7 arquivos), Gamificacao (3), Transacoes (1), IA (3), Wishlist (2+)
- **Solucao:** Adicionar `soundManager.play()` nos handlers de cada componente
- **Detalhes:** [docs/roadmap/02-correcao-som.md](docs/roadmap/02-correcao-som.md)
- [x] Adicionar sons no Invoice Import (7 telas)
- [x] Adicionar sons na Gamificacao (reveal, levelUp)
- [x] Adicionar sons em Transacoes, IA, Wishlist
- [x] Mapear som `trash` para acoes de delete
- [x] Mapear som `error` para falhas
- [x] Mapear som `share` para camera shutter e QR scan
- [x] Cobertura completa: 20+ componentes, 9/9 sons mapeados, 100% dos interativos

### 03 - Testar API de OCR
- **Dificuldade:** FACIL-MEDIO | **Urgencia:** ALTA | **~1h**
- **Problema:** Testes existem mas precisam validacao antes do fix Android
- **Testes:** `packages/parsers/__tests__/` (ocrParser, classifier, importInvoice, qrcodeParser, invoiceReducer)
- **Detalhes:** [docs/roadmap/03-testar-api-ocr.md](docs/roadmap/03-testar-api-ocr.md)
- [ ] Executar suite de testes existente
- [ ] Validar cenarios de parsing (Qtd x Preco, R$ Preco)
- [ ] Verificar fallback chain do HybridOCRAdapter

### 04 - Testar Todas as APIs de IA
- **Dificuldade:** MEDIO | **Urgencia:** MEDIA | **~2h**
- **Problema:** 3 adapters (OpenAI gpt-4.1, Gemini 2.5, Claude sonnet-4-6) precisam validacao e2e
- **Testes:** `packages/ai/__tests__/` + `src/modules/ai/infrastructure/__tests__/`
- **Detalhes:** [docs/roadmap/04-testar-api-ia.md](docs/roadmap/04-testar-api-ia.md)
- [ ] Executar testes unitarios existentes
- [ ] Validar CircuitBreaker, Cache, TokenTracker
- [ ] Testar cada adapter com API key real (manual)

### 05 - Corrigir OCR no Android (Build) - CONCLUIDA
- **Dificuldade:** MEDIO | **Urgencia:** CRITICA | **~3-4h**
- **Problema:** `react-native-text-recognition` nao linka apos build Android. Erro: "Module doesn't seem to be linked"
- **Solucao:** Migrado de `react-native-text-recognition` para `rn-mlkit-ocr` com Expo config plugin nativo
- **Detalhes:** [docs/roadmap/05-fix-ocr-android.md](docs/roadmap/05-fix-ocr-android.md)
- [x] Remover `react-native-text-recognition` e seu patch
- [x] Instalar `rn-mlkit-ocr` com config plugin (bundled latin model)
- [x] Atualizar `HybridOCRAdapter` para usar `MlkitOcr.detectFromUri()`
- [x] Atualizar provider padrao para `mlkit` em todos os arquivos
- [x] Atualizar tela de configuracoes OCR
- [x] Atualizar documentacao

### 06 - Corrigir Google Drive no APK (CONCLUIDA)
- **Dificuldade:** MEDIO-COMPLEXO | **Urgencia:** CRITICA | **~4-6h**
- **Problema:** OAuth retornava "Acesso bloqueado" (app nao verificado) + "Erro ao obter token" (faltava client_secret)
- **Solucao:** Migrado scope de `drive.file` para `drive.appdata` (nao exige verificacao Google), adicionado `client_secret` na troca de auth code e refresh token, configurado `appDataFolder` para operacoes do Drive
- **Detalhes:** [docs/roadmap/06-fix-google-drive.md](docs/roadmap/06-fix-google-drive.md)
- [x] Migrar scope para `drive.appdata` (sem verificacao)
- [x] Adicionar `client_secret` no token exchange e refresh
- [x] Configurar `appDataFolder` no upload e busca de arquivos
- [x] Testar OAuth flow completo no APK

### 07 - Melhorar Tour (Baloes, Setas, Minimizar)
- **Dificuldade:** COMPLEXO | **Urgencia:** MEDIA | **~8-12h**
- **Problema:** Tour reseta para step 0 ao remontar (parece travado na 1a pagina), bloqueia experimentacao, sem baloes/setas, sem minimizar
- **Bugs:** Estado nao persistido (useState local reseta), backdrop 45% bloqueia visao, sem highlight de elementos
- **Solucao:** 4 fases - Fix bugs (persist state) -> Minimizar/Badge -> Baloes/Setas -> Navegacao inteligente
- **Detalhes:** [docs/roadmap/07-melhorar-tour.md](docs/roadmap/07-melhorar-tour.md)
- [ ] Fix: Persistir step no AsyncStorage + mover estado para context
- [ ] Adicionar botao minimizar + badge flutuante
- [ ] Implementar spotlight mask + setas SVG
- [ ] Navegacao automatica para tela do step

### 08 - Animacao Individual para Cada Trofeu (167 trofeus)
- **Dificuldade:** COMPLEXO | **Urgencia:** BAIXA | **~15-25h (com acompanhamento)**
- **Problema:** Todos os trofeus usam mesma animacao generica. Precisa animacao unica por trofeu
- **Total:** 40 conquistas + 6 mensais + 48 sazonais + 73 liturgicos = 167 trofeus
- **Solucao:** Criar config map por trofeu/categoria com parametros de animacao customizados
- **Detalhes:** [docs/roadmap/08-animacao-trofeus.md](docs/roadmap/08-animacao-trofeus.md) (lista completa de todos os 167 trofeus)
- [ ] Criar `trophyAnimationConfigs.ts` com mapa de configs
- [ ] Refatorar AnimatedTrophy e AnimatedSeasonalTrophy para aceitar config
- [ ] Implementar um a um com aprovacao individual

### 09 - Leitor de Olerite por OCR
- **Dificuldade:** COMPLEXO | **Urgencia:** MEDIA | **~6-10h**
- **Depende de:** Tarefa 05 (OCR Android funcionar)
- **Problema:** Feature nova - capturar valores de medidores via OCR, armazenar historico
- **Solucao:** Novo parser + nova tela + novo tipo de evento + historico com grafico
- **Detalhes:** [docs/roadmap/09-olerite-ocr.md](docs/roadmap/09-olerite-ocr.md)
- [ ] Criar `oleriteParser.ts`
- [ ] Criar tela de captura reutilizando OcrScanScreen
- [ ] Implementar historico com grafico de evolucao
- [ ] Testes unitarios

---

## Ordem de Execucao Recomendada

```
URGENCIA CRITICA (fazer primeiro):
  05 - Fix OCR Android .......... [MEDIO]     ~3-4h
  06 - Fix Google Drive ......... [CONCLUIDA]

URGENCIA ALTA:
  03 - Testar API OCR ........... [FACIL]     ~1h

URGENCIA MEDIA:
  01 - Cor Modal Catolico ....... [CONCLUIDA] ~30min
  02 - Correcao Sons ............ [CONCLUIDA] ~2h
  04 - Testar APIs IA ........... [MEDIO]     ~2h
  07 - Melhorar Tour ............ [COMPLEXO]  ~8-12h
  09 - Olerite OCR .............. [COMPLEXO]  ~6-10h

URGENCIA BAIXA (quando houver tempo):
  08 - Animacao Trofeus ......... [COMPLEXO]  ~15-25h
```

*Nota: Antes de cada tarefa, sera realizada uma analise tecnica detalhada com planejamento via Task Master.*
