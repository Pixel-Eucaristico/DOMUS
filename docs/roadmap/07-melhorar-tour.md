# Tarefa 07 - Melhorar Tour com Baloes, Setas e Minimizar

## Prioridade: COMPLEXO | Urgencia: MEDIA
## Estimativa: ~8-12h | Arquivos: ~5-8

---

## Problema
O tour atual fica apenas na primeira pagina (reseta para step 0 ao remontar), bloqueia a experimentacao do usuario, nao tem baloes/setas apontando para elementos, e nao permite minimizar/retomar.

## Diagnostico Detalhado

### Bugs Criticos

#### 1. Estado reseta para step 0
```typescript
// TourOverlay.tsx:154-156
useEffect(() => {
  if (isDemoActive) setCurrentStep(0); // SEMPRE reseta!
}, [isDemoActive]);
```
Qualquer remontagem do componente (mudanca de tela, etc.) reseta o step.

#### 2. Sem persistencia de progresso
`DemoModeProvider.tsx` NAO salva o step atual no AsyncStorage. So salva se o tour foi mostrado (`TOUR_SHOWN_KEY`).

#### 3. Backdrop bloqueia interacao visual
```typescript
// TourOverlay.tsx:273
backgroundColor: "rgba(0,0,0,0.45)" // 45% opaco sobre toda a tela
```

### Recursos Ausentes
- Sem setas/arrows apontando para elementos da UI
- Sem spotlight/highlight no elemento alvo
- Sem baloes posicionados relativos ao alvo
- Sem minimizar/colapsar o tour
- Sem indicador de progresso visivel durante uso normal
- Sem navegacao inteligente (ir para tela do step automaticamente)

### 17 Steps do Tour Atual
| Step | Feature | Tag |
|------|---------|-----|
| 1 | Boas-vindas ao DOMUS | Sandbox |
| 2 | Dashboard e Saldo | Aba: Inicio |
| 3 | Regra 50/30/20 | Aba: Inicio |
| 4 | Contas e Cartoes | Aba: Contas |
| 5 | Registrar Transacao | Funcao |
| 6 | Importar Nota Fiscal | Funcao |
| 7 | Calculadora de Dizimo | Funcao |
| 8 | Lista de Desejos | Aba: Desejos |
| 9 | Meta de Poupanca | Funcao |
| 10 | Conquistas e XP | Aba: Temporada |
| 11 | Trofeu Mensal | Aba: Temporada |
| 12 | Assistente IA | Recurso |
| 13 | PIN/Biometria | Recurso |
| 14 | Backup Criptografado | Recurso |
| 15 | Sync Multi-Dispositivo | Recurso |
| 16 | Tudo Pronto! | Final |

### Arquivos Envolvidos
| Arquivo | Papel |
|---------|-------|
| `src/components/shared/TourOverlay.tsx` | Componente principal (387 linhas) |
| `src/context/DemoModeProvider.tsx` | Estado demo/tour |
| `app/_layout.tsx` | Integracao global |
| `app/about.tsx` | Botao "Refazer Tour" |

## Solucao Proposta

### Fase A: Fix Bugs Criticos
1. **Persistir step no AsyncStorage:**
   ```typescript
   const TOUR_STEP_KEY = "domus_tour_step_v1";
   // Salvar a cada mudanca de step
   // Restaurar no mount ao inves de resetar para 0
   ```

2. **Mover estado para DemoModeProvider:**
   - `currentTourStep` no contexto (nao local state)
   - `setTourStep()` exposto pelo provider
   - Evita reset em remontagens

### Fase B: Minimizar/Retomar
1. **Adicionar botao "Minimizar"** no tour card
2. **Badge flutuante** quando minimizado: "Tour: 5/17 - Toque para continuar"
3. **Estado `isTourMinimized`** no DemoModeProvider
4. **Gesture handler** para arrastar o badge

### Fase C: Baloes e Setas
1. **Sistema de spotlight:** Mask SVG com recorte no elemento alvo
2. **Posicionamento relativo:** Medir posicao do elemento alvo com `onLayout` + `measure()`
3. **Seta direcional:** Componente SVG de seta que aponta para o alvo
4. **Cada step define o alvo:**
   ```typescript
   interface TourStep {
     title: string;
     description: string;
     tag: string;
     targetRef?: string; // ID do elemento a destacar
     arrowDirection?: "up" | "down" | "left" | "right";
     position?: "top" | "bottom" | "center";
   }
   ```

### Fase D: Navegacao Inteligente
1. Cada step associado a uma rota/tab
2. Ao avancar, navegar automaticamente para a tela correta
3. Ao voltar, retornar para tela anterior

## Bibliotecas Sugeridas (opcional)
- `react-native-copilot` - tour guiado com spotlight
- `react-native-walkthrough-tooltip` - tooltips posicionados
- Implementacao custom com Reanimated + SVG (mais controle)

## Pontos de Atencao
- Tour funciona no modo sandbox (isDemoActive) com dados mock
- `stopDemo()` deve limpar o step salvo
- "Refazer Tour" em about.tsx deve resetar step para 0
- Manter compatibilidade com o sistema de missions do onboarding (packages/onboarding/)
