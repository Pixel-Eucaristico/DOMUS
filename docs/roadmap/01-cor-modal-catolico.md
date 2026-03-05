# Tarefa 01 - Mudar a cor do Modal "Voce e Catolico?"

## Prioridade: FACIL | Urgencia: BAIXA
## Estimativa: ~30 min | Arquivos: 1

---

## Problema
O modal de pergunta religiosa usa cores purpura/roxo escuro que pode nao estar alinhado com a identidade visual desejada ou pode nao ter contraste suficiente.

## Arquivo Afetado
- `src/components/shared/ReligiousPreferenceModal.tsx`

## Cores Atuais
| Elemento | Cor Atual |
|----------|-----------|
| Background | `#12082A` (roxo escuro) |
| Borda | `#4C1D95` (purpura) |
| Sombra/Glow | `#7C3AED` (violeta) |
| Titulo | `#F5F3FF` (branco lavanda) |
| Subtitulo | `#C4B5FD` (lilas claro) |
| Info row bg | `#1E1040` (roxo medio) |
| Info row text | `#A78BFA` (ametista) |
| Botao "Sim" bg | `#7C3AED` (violeta) |
| Botao "Sim" text | `#FFFFFF` (branco) |
| Botao "Agora nao" bg | `#FFFFFF10` (transparente) |
| Botao "Agora nao" borda | `#FFFFFF22` |
| Botao "Agora nao" text | `#9CA3AF` (cinza) |
| Footer | `#6B7280` (cinza medio) |

## Solucao
Alterar os valores de cores no StyleSheet do componente `ReligiousPreferenceModal.tsx`. As cores estao hardcoded nas linhas de estilo (a partir da linha ~260).

## Pontos de Atencao
- O modal e usado em 3 locais: `_layout.tsx`, `season.tsx`, `SurpriseTrophyCard.tsx`
- Verificar se a nova cor combina com o tema claro E escuro do app
- Manter contraste WCAG AA (4.5:1 para texto)
