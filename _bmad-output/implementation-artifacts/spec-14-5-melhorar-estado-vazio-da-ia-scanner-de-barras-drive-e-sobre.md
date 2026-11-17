---
title: 'Story 14.5: Melhorar estado vazio da IA, scanner de barras, Drive e Sobre'
type: 'bugfix'
created: '2026-11-17'
status: 'done'
baseline_revision: '530b471d3647623b8cecf4de608919deceebbbc1'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:**
1. Na tela `DOMUS IA` (`app/ai-chat.tsx`), quando `settings.isEnabled` é `false` e não há mensagens, `renderChatFooter` omite `QuickSuggestions` e `handleSend`/`handleQuickSuggestion` bloqueiam o envio com `if (!settings.isEnabled) return`, impedindo as sugestões clicáveis de análise local (mesmo `ConsultantChatUseCase.execute` já suportando fallback local). Além disso, o banner de configuração só navega para `/ai-settings` ao tocar exatamente na palavra `"Configurações"`, e `src/components/ai/ChatInputBar.tsx` exibe uma barra de formatação Markdown (`B`, `I`, `<>`, lista, `-`) desnecessária no campo de mensagem.
2. No scanner de notas (`src/components/invoice/QrScanScreen.tsx`), a aba `Cód. Barras` usa a mesma janela de mira quadrada (`height: 260`, `flex: 6`) do QR Code em vez de uma mira retangular horizontal.
3. Na aba `Drive` de *Backup & Restauração* (`app/backup.tsx`), `driveAccountRow` não possui `gap` entre o e-mail truncado e o botão `Desconectar`.
4. Na tela *Sobre o DOMUS* (`app/about.tsx`), o título do cabeçalho é `"Sobre o DOMUS"` (igual ao 2º card, em vez de `"Configurações e Sobre"`) e o 1º card repete `"Pixel Eucarístico"` duas vezes seguidas (no `title` do `SectionCard` e no `<PixelText>` logo abaixo).

**Approach:**
- Liberar `QuickSuggestions` e envio/sugestão local em `app/ai-chat.tsx` mesmo quando `!settings.isEnabled`, tornar todo o banner de configuração clicável para `/ai-settings`, e remover `MD_BUTTONS`/`mdBar` de `src/components/ai/ChatInputBar.tsx`.
- Extrair `getScanAimWindowLayout(scanMode)` em `src/components/invoice/qrKeyBarLayout.ts` retornando `{ height: 120, focusedFlex: 10 }` para `"barcode"` e `{ height: 260, focusedFlex: 6 }` para `"qr"`, aplicando em `src/components/invoice/QrScanScreen.tsx`.
- Adicionar `gap: 12` (e `minWidth: 0` em `driveAccountLeft`) em `app/backup.tsx`.
- Alterar o título do cabeçalho de `app/about.tsx` para `"Configurações e Sobre"` e remover o `<PixelText>` duplicado `"Pixel Eucarístico"`.

## Boundaries & Constraints

**Always:**
- Em `app/ai-chat.tsx`:
  - `renderChatFooter` deve renderizar `QuickSuggestions` quando `!compact` (independentemente de `settings.isEnabled`).
  - `handleSend` e `handleQuickSuggestion` devem permitir envio para análise local mesmo com `!settings.isEnabled` (sem `if (!settings.isEnabled) return`).
  - Todo o banner `!settings.isEnabled` deve ser clicável (`TouchableOpacity` -> `router.push("/ai-settings")`).
- Em `src/components/ai/ChatInputBar.tsx`:
  - Remover completamente a barra de formatação Markdown (`MD_BUTTONS`, `mdBar`, `handleFormat`, `selection`) mantendo `inputRow`, `ChatActionMenu`, `TextInput`, microfone e botão de envio intactos.
- Em `src/components/invoice/QrScanScreen.tsx`:
  - Quando `scanMode === "barcode"`, a janela de mira (`middle`/`focused`) deve usar formato retangular horizontal (`height: 120`, `focusedFlex: 10`), mantendo `height: 260`, `focusedFlex: 6` para `"qr"`.
- Em `app/backup.tsx`:
  - `driveAccountRow` deve ter `gap: 12` (e `driveAccountLeft` com `minWidth: 0`) para espaçamento claro entre o e-mail truncado e `Desconectar`.
- Em `app/about.tsx`:
  - O título do cabeçalho deve ser `"Configurações e Sobre"`.
  - O card `Pixel Eucarístico` não deve repetir `"Pixel Eucarístico"` no `<PixelText>` logo abaixo do título do card.

**Never:**
- Nunca quebrar os testes existentes em `src/components/__tests__/keyboardScroll.test.ts` ou `src/components/ai/__tests__/chatKeyboardLayout.test.ts`.
- Nunca usar `vi.mock("react-native")` no Vitest (`AGENTS.md`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mira QR vs Barras | `getScanAimWindowLayout("qr")` | `{ height: 260, focusedFlex: 6 }` | N/A |
| Mira Barras horizontal | `getScanAimWindowLayout("barcode")` | `{ height: 120, focusedFlex: 10 }` (`height < 160` e mais largo que `"qr"`) | N/A |
| IA sem chave com mensagens vazias | `app/ai-chat.tsx` com `!settings.isEnabled` | `QuickSuggestions` visível no footer; banner inteiro navega para `/ai-settings`; toque em sugestão chama `handleSend` sem retorno precoce | Fallback local via `ConsultantChatUseCase` |
| Input da IA sem Markdown bar | `src/components/ai/ChatInputBar.tsx` | Sem `MD_BUTTONS` / `mdBar` | N/A |
| Drive e-mail longo | `app/backup.tsx` `driveAccountRow` | `gap: 12` e `minWidth: 0` garantindo separação antes de `Desconectar` | N/A |
| Tela Sobre | `app/about.tsx` | Cabeçalho `"Configurações e Sobre"`; `"Pixel Eucarístico"` aparece no `title` do card sem `<PixelText>` repetido | N/A |

</intent-contract>

## Code Map

- `app/ai-chat.tsx:195-220,730-740,825-829` -- `handleSend`, `handleQuickSuggestion`, banner `!settings.isEnabled`, `renderChatFooter`.
- `src/components/ai/ChatInputBar.tsx:1-125,175-225` -- `MD_BUTTONS`, `handleFormat`, `s.mdBar`, `s.mdBtn`.
- `src/components/invoice/qrKeyBarLayout.ts` & `src/components/invoice/QrScanScreen.tsx:120-130,253-255` -- janela de mira `middle`/`focused`.
- `app/backup.tsx:320-330,475-478` -- `driveAccountRow`, `driveAccountLeft`.
- `app/about.tsx:82-100` -- título `"Sobre o DOMUS"` e `<PixelText>` duplicado `"Pixel Eucarístico"`.

## Tasks & Acceptance

**Execution:**
- `app/ai-chat.tsx` -- Remover `if (!settings.isEnabled) return;` de `handleSend` e `handleQuickSuggestion` (e atualizar deps dos callbacks), mudar `renderChatFooter` de `settings.isEnabled && !compact` para `!compact`, e transformar o banner `!settings.isEnabled` em `TouchableOpacity` navegando para `/ai-settings` (com `accessibilityRole="button"`).
- `src/components/ai/ChatInputBar.tsx` -- Remover `FormatBtn`, `MD_BUTTONS`, `selection`/`setSelection`, `handleFormat`, o bloco `s.mdBar` no JSX e estilos `mdBar`/`mdBtn`.
- `src/components/invoice/qrKeyBarLayout.ts` & `src/components/invoice/QrScanScreen.tsx` -- Exportar `getScanAimWindowLayout(scanMode: "qr" | "barcode")` em `qrKeyBarLayout.ts` (`{ height: 260, focusedFlex: 6 }` vs `{ height: 120, focusedFlex: 10 }`) e aplicar dinamicamente em `QrScanScreen.tsx` (`middle` e `focused`).
- `app/backup.tsx` -- Adicionar `gap: 12` em `driveAccountRow` e `minWidth: 0` em `driveAccountLeft`.
- `app/about.tsx` -- Alterar o título do cabeçalho para `"Configurações e Sobre"` e remover a linha `<PixelText size={9} color={theme.primaryColor} style={{ marginBottom: 8 }}>Pixel Eucarístico</PixelText>` (mantendo `PixelText` importado apenas se ainda usado no arquivo).
- `src/components/invoice/__tests__/qrKeyBarLayout.test.ts` & `src/modules/ai/__tests__/story145UiFixes.test.ts` (novo teste puro sem `react-native`) -- Testar `getScanAimWindowLayout`, verificar remoção da barra Markdown, banner clicável, footer sem `settings.isEnabled` gate, `gap: 12` em `app/backup.tsx`, e título + ausência de duplicação em `app/about.tsx`.

**Acceptance Criteria:**
- Given `app/ai-chat.tsx` sem mensagens, when aberta, then exibe sugestões clicáveis para análise local, o banner inteiro navega para `/ai-settings` ao tocar e a barra Markdown foi removida de `ChatInputBar.tsx`.
- Given `QrScanScreen.tsx` na aba `Cód. Barras`, when exibida, then a janela de mira é retangular horizontal.
- Given `app/backup.tsx` na aba `Drive`, when conectado, then há espaçamento claro (`gap: 12`) entre o e-mail truncado e `Desconectar`.
- Given `app/about.tsx`, when aberta, then o título é `"Configurações e Sobre"` e `"Pixel Eucarístico"` não se repete duas vezes seguidas no mesmo card.

## Spec Change Log

- **Review triage (2026-11-17):**
  - `app/ai-chat.tsx`: `detectMissingPermission` protegido por `if (settings.isEnabled)` em `handleSend`; `voiceEnabled` em `renderInputToolbar` exige `settings.isEnabled &&`.
  - `src/components/invoice/qrKeyBarLayout.ts` & `QrScanScreen.tsx`: `ScanAimWindowLayout` / `getScanAimWindowLayout` agora inclui `hintMarginTop` (`146` para `"qr"`, `76` para `"barcode"`) aplicado em `s.hintWrap`.
  - `app/backup.tsx`: `flexShrink: 0` adicionado ao botão `Desconectar` (`TouchableOpacity` e `s.driveDisconnect`).
  - Testes atualizados para cobrir as verificações acima.

## Review Triage Log
- **Intent Alignment Auditor:** `No findings.`
- **Blind Hunter (1 low):**
  - `[fixed]` Calculado `hintMarginTop` dinamicamente em `getScanAimWindowLayout(scanMode)` (`146` para `"qr"`, `76` para `"barcode"`) e aplicado em `s.hintWrap` de `QrScanScreen.tsx`.
- **Edge Case Hunter (2 medium, 1 low):**
  - `[fixed]` Protegido `detectMissingPermission` em `handleSend` com `if (settings.isEnabled)` para que análises locais não disparem modal de permissão para IA externa.
  - `[fixed]` `hintWrap` ajustado via `aimLayout.hintMarginTop` (mesmo item do Blind Hunter).
  - `[fixed]` Adicionado `settings.isEnabled &&` no cálculo de `voiceEnabled` em `renderInputToolbar` de `app/ai-chat.tsx`.
- **Verification Gap (2 medium, 2 low):**
  - `[fixed]` Adicionadas asserções de wiring de `aimLayout.height`, `aimLayout.focusedFlex` e `aimLayout.hintMarginTop` em `QrScanScreen.tsx`, `title="Pixel Eucarístico"` em `app/about.tsx`, preservação de `inputRow`/`ChatActionMenu`/`TextInput` em `ChatInputBar.tsx`, e checagens menos frágeis de `renderChatFooter` e banner `TouchableOpacity` em `story145UiFixes.test.ts`.
- **Extra polish:**
  - `[fixed]` Adicionado `flexShrink: 0` no botão `Desconectar` em `app/backup.tsx`.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit` -- **PASS** (0 erros no `eslint`, 14 warnings pré-existentes fora dos arquivos alterados; 0 erros no `tsc --noEmit`).
- `npx vitest run src/components/invoice/__tests__/qrKeyBarLayout.test.ts src/modules/ai/__tests__/story145UiFixes.test.ts src/components/__tests__/keyboardScroll.test.ts src/components/ai/__tests__/chatKeyboardLayout.test.ts` -- **PASS** (4/4 arquivos, 337/337 testes passando).
- `npx vitest run --maxWorkers=2` -- **PASS** (145/145 arquivos de teste, 3140/3140 testes passando).

## Auto Run Result
- **Status:** `done`
- **Review loop iterations:** `1`
- **Follow-up review recommended:** `false`
