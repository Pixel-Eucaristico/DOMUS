# Roadmap OrcaFacil: Sons, Motion e Gamificação

## 🚀 Fase 1: Infraestrutura Core (✅ CONCLUÍDA)
- [x] **AudioService / SoundManager.ts:** Singleton via `expo-av`.
- [x] **Toggle "Efeitos Sonoros":** Nas configurações e no `AppStateProvider`.
- [x] **Componentes Motion:** `AnimatedCard` (stagger), `AnimatedIconButton`.
- [x] **Pre-load de áudios no Splash:** `tap`, `success`, `pop`, `error`, `trash`, `level-up`.

## 🏃 Fase 2: Taxonomia de Categorias (UX) (✅ CONCLUÍDA)
- [x] **Refatoração Tríade 50/30/20:** Categorias unificadas e mapeadas.
- [x] **Grid Seletor Agrupado:** Implementado com Reanimated Layout Transitions.
- [x] **Busca Instantânea:** Filtro em tempo real com normalização de texto.
- [x] **Seção "Recentes/Sugeridas":** Hook `useCategoryIntelligence` criado e integrado.

## 🏃 Fase 3: Motor de Troféus (Gamification) (✅ CONCLUÍDA)
- [x] **Sistema de Conquistas:** 8 conquistas (Prata/Ouro/Diamante) com `checkNewAchievements()`.
- [x] **Componente AnimatedTrophy:** Animação rotateY pseudo-3D com `Math.cos(rotation)`.
- [x] **SVG Premium:** Gradientes radiais (Ouro/Prata/Diamante) com shine animado via Reanimated.
- [x] **AchievementToast:** Toast com som + haptic auto-dismiss em 4s.
- [x] **Grid em Season:** Exibe troféus desbloqueados (animados) e bloqueados (cadeado).

## ✅ Fase 4: Demo Mode / Guided Tour (CONCLUÍDA)
- [x] **Sandbox State:** `isDemoActive` + `demoEvents` no `DemoModeProvider` com `mockDemoEvents.ts`.
- [x] **Interceptador de Dispatch:** `dispatch` em `AppStateProvider` roteia para `dispatchDemoEvent` quando `isDemoActive`, sem tocar no SQLite.
- [x] **Guided Tour:** `TourOverlay` 4 passos com máquina de estados local, `stopDemo()` no fim.
- [x] **Auto-cleanup:** `stopDemo()` limpa `demoEvents` e desativa `isDemoActive`.
- [x] **First-launch detection:** `DemoModeProvider` detecta primeiro acesso via `AsyncStorage("domus_tour_shown_v1")` e inicia o tour automaticamente.

---
*Nota: Antes de cada fase, será realizada uma análise técnica detalhada.*
