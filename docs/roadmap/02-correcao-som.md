# Tarefa 02 - Correcao do Som em Areas Sem Audio

## Prioridade: FACIL | Urgencia: MEDIA
## Estimativa: ~2h | Arquivos: ~15

---

## Problema
O SoundManager esta implementado e funciona corretamente, mas varias telas e componentes nao utilizam os sons disponiveis. Alem disso, 4 sons definidos (`levelUp`, `reveal`, `trash`, `error`, `share`) nunca sao tocados em lugar nenhum.

## Diagnostico Detalhado

### Sons Disponiveis (9 total)
| Som | Arquivo | Tamanho | Usado? |
|-----|---------|---------|--------|
| `tap` | tap.mp3 | 4.9 KB | Sim (parcial) |
| `success` | success.mp3 | 42 KB | Sim (parcial) |
| `error` | error.mp3 | 32 KB | NAO |
| `trash` | trash.mp3 | 18 KB | NAO |
| `pop` | pop.mp3 | 28 KB | Sim (parcial) |
| `levelUp` | level-up.mp3 | 138 KB | NAO |
| `reveal` | reveal.mp3 | 287 KB | NAO |
| `share` | share.mp3 | 35 KB | NAO |
| `tabSwitch` | tab-switch.mp3 | 18 KB | Sim |

### Areas SEM Som (precisam correcao)

#### Invoice Import (7 arquivos - CRITICO)
- `src/components/invoice/IdleScreen.tsx` - botoes QR/OCR/Manual sem som
- `src/components/invoice/QrScanScreen.tsx` - acoes de camera sem som
- `src/components/invoice/OcrScanScreen.tsx` - captura OCR sem som
- `src/components/invoice/WebViewScreen.tsx` - navegacao sem som
- `src/components/invoice/ErrorScreen.tsx` - retry/settings sem som
- `src/components/invoice/ParsedScreen.tsx` - editar/adicionar/remover itens sem som
- `src/components/invoice/ScanningScreen.tsx` - scanning sem som

#### Gamificacao (3 arquivos)
- `src/components/gamification/SurpriseTrophyCard.tsx` - deveria usar `reveal`
- `src/components/gamification/AnimatedTrophy.tsx` - deveria usar som na animacao
- `src/components/gamification/TrophyDecorationFactory.tsx`

#### Transacoes (1 arquivo)
- `src/components/transaction/ItemsSection.tsx` - add/remove/edit sem som

#### IA/Chat (3 arquivos)
- `src/components/ai/APIKeyManager.tsx`
- `src/components/ai/ChatBubble.tsx`
- `src/components/ai/ProviderSelector.tsx`

#### Wishlist (2+ arquivos)
- `src/components/wishlist/ShareToWishlistModal.tsx`
- `src/components/wishlist/SavingsGoalSection.tsx`

## Solucao

### Mapeamento de Som por Acao
| Acao | Som Recomendado |
|------|----------------|
| Clique em botao | `tap` |
| Abrir modal/popup | `pop` |
| Sucesso/conclusao | `success` |
| Erro/falha | `error` |
| Deletar item | `trash` |
| Level up | `levelUp` |
| Revelar trofeu surpresa | `reveal` |
| Compartilhar | `share` |
| Trocar aba | `tabSwitch` |

### Implementacao
1. Importar `soundManager` em cada componente:
   ```typescript
   import { soundManager } from "@/services/SoundManager";
   ```
2. Adicionar `soundManager.play("efeito")` nos handlers de cada acao
3. Para level up: integrar no `levelEngine` ou no componente que detecta subida de nivel

## Arquivos Principais
- `src/services/SoundManager.ts` (referencia - nao precisa alterar)
- Todos os componentes listados acima
