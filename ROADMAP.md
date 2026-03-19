# Roadmap DOMUS — Tarefas Pendentes

> Tarefas concluídas foram movidas para [docs/history/COMPLETED.md](docs/history/COMPLETED.md)
> Diário de desenvolvimento em [docs/history/CHANGELOG.md](docs/history/CHANGELOG.md)

---

## Fase 3: Design System "Premium" (Tamagui & Rive)

*Foco: Transformar a identidade visual e a performance da interface.*

- [ ] **Migração para Tamagui:**
    - Implementar Temas Dinâmicos (Católico/Laico) com suporte nativo a Dark Mode.
    - Substituir `StyleSheet` tradicional por componentes atómicos do Tamagui para renderização ultra-rápida.
- [ ] **Animações Interativas (Troféus):**
    - Integrar `@rive-app/react-native`.
    - Converter os 167 troféus em vetores animados que reagem ao toque e brilham ao ganhar XP.
- [ ] **Listas Ultra-Rápidas (FlashList):**
    - Substituir `FlatList` pelo **FlashList (Shopify)** para garantir scroll de 120Hz constante em ecrãs modernos.

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
URGÊNCIA BAIXA (quando houver tempo):
  Fase 3 - Design System Premium ....... [COMPLEXO]         ~40-60h
  08 - Animação Troféus ................ [COMPLEXO]         ~15-25h
  09 - Olerite OCR (parte restante) .... [COMPLEXO]         ~4-6h
```

---

## Checklist de Novas Dependências (Para Instalar)

```bash
# UI & Performance
yarn add tamagui @rive-app/react-native @shopify/flash-list @bsky.app/expo-scroll-edge-effect

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
 