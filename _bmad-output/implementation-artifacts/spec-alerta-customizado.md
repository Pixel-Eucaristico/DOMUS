---
title: 'Trocar o alerta nativo pelo alerta customizado do app'
type: 'bugfix'
created: '2026-10-23'
status: 'done'
baseline_commit: 'a6a9a6f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O app mostra o alerta nativo do Android (`Alert.alert`, e `window.confirm`/`window.alert` na web) em 48 lugares de 25 arquivos, fora do visual do DOMUS. A regra do dono é usar sempre o alerta customizado. Além disso, na tela Sobre, a linha "Consultas de itens, preços e ícones" ficou fora do padrão: o texto longo da Story 12.7 ocupa 12 linhas e desalinha o interruptor.

**Approach:**
- Um alerta customizado único, no estilo do `ConfirmDeleteModal` (folha que sobe, tema do app, botões `TButton`), montado uma vez na raiz (`app/_layout.tsx`) e chamado de qualquer lugar por uma função com a mesma forma do `Alert.alert` (título, mensagem, botões com `text`, `style` "cancel"/"destructive"/"default" e `onPress`) e um `appConfirm(...)` que devolve `Promise<boolean>`. Funciona igual no Android, iOS e web.
- Trocar os 48 usos; `confirmAsync` passa a usar o alerta customizado.
- Na tela Sobre, a linha da flag mostra uma descrição curta do tamanho das outras e um "Saiba mais" que abre o alerta customizado com o texto completo da Story 12.7 (o que envia e o que se perde), mantendo o que a 12.7 pede.
- Registrar a regra no `AGENTS.md`.

## Boundaries & Constraints

**Always:** texto em pt-BR com acentos; mesmos títulos, mensagens, botões e efeitos de cada alerta trocado (inclusive o que acontece ao cancelar ou tocar fora, que vale como o botão "cancel" ou, sem ele, como fechar); um alerta por vez, os seguintes em fila; chamável fora de componentes (serviços e hooks); a lógica da fila fica num módulo sem `react-native`, testável no vitest; um teste falha se aparecer `Alert.alert`, `window.alert` ou `window.confirm` em `app/` ou `src/`.

**Never:** mudar o que cada alerta faz; usar `Alert` do `react-native` em código novo; mexer em `packages/sync`, `ios/`, `android/`.

## I/O & Edge-Case Matrix

| Cenário | Chamada | Resultado |
|---|---|---|
| Aviso simples | `appAlert("Erro", "Falhou")` | alerta customizado com botão "OK" |
| Confirmação | botões Cancelar + Excluir (`destructive`) | Excluir em vermelho; cada botão chama o seu `onPress` |
| Tocar fora / voltar do Android | alerta com botão `cancel` | chama o `onPress` do cancel |
| `appConfirm` | usuário confirma / cancela | `true` / `false` |
| Dois alertas seguidos | duas chamadas | o segundo aparece depois de fechar o primeiro |
| Chamado antes de a raiz montar | serviço no início do app | aparece quando a raiz monta |
| Web | qualquer alerta | mesmo alerta customizado (não `window.confirm`) |

</frozen-after-approval>

## Code Map

- `src/components/shared/ConfirmDeleteModal.tsx` -- estilo de referência
- `app/_layout.tsx` -- onde montar o alerta
- `src/utils/confirmAsync.ts` -- passa a usar o alerta customizado
- 25 arquivos com `Alert.alert` / `window.confirm` / `window.alert` (`grep -rn` em `app` e `src`)
- `app/about.tsx` (`SwitchRow`), `src/constants/privacyFlagTexts.ts`, `src/components/privacy/PrivacyFlagNote.tsx` -- linha da flag
- `AGENTS.md` -- registrar a regra

## Tasks & Acceptance

**Execution:**
- [x] Fila pura (sem `react-native`) + alerta customizado + montagem na raiz + testes da fila
- [x] Trocar os 48 usos e o `confirmAsync`; teste que barra o alerta nativo
- [x] Linha da flag na tela Sobre com descrição curta e "Saiba mais"
- [x] Regra no `AGENTS.md`

**Acceptance Criteria:**
- Given qualquer alerta do app, when ele aparece, then é o alerta customizado, no Android, no iOS e na web
- Given a tela Sobre, when vejo a linha "Consultas de itens, preços e ícones", then ela tem o tamanho e o alinhamento das outras, e o "Saiba mais" mostra o texto completo

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| iOS: o alerta montado na raiz não aparece sobre outro Modal ou tela `presentation: "modal"`, e a fila trava | high | `RCTModalHostViewComponentView` apresenta do controller da raiz. **patch**: pilha de hosts — modais e telas modais montam um `AppAlertHost` próprio; o último montado mostra os alertas. — **aplicado**. |
| Android 16: host entrando/saindo como filho direto da raiz ("null child at index N"); troca de `key` a cada alerta | medium | Comentário do `_layout`. **patch**: o `Modal` do host fica sempre montado e só muda `visible`, sem `key` por alerta. — **aplicado**. |
| Teclado aberto cobre os botões do alerta (folha embaixo) | medium | **patch**: `Keyboard.dismiss()` ao mostrar. — **aplicado**. |
| Alerta por cima da tela de bloqueio, botões tocáveis sem desbloquear | medium | **patch**: com o app bloqueado o host esconde o alerta, que volta depois de desbloquear. — **aplicado**. |
| Ordem dos botões e índice só no host, sem teste (Excluir × Cancelar) | medium (gap) | **patch**: função pura de layout dos botões, testada; o host só desenha. — **aplicado**. |
| Teste de proteção deixa passar `w.confirm`, `confirm(` solto, `Alert["alert"]`, `Alert?.alert`, `require`, `window.prompt`, `react-native-web`, pastas `components/` e `lib/`, `.js` | medium | **patch** + auto-teste com cada formato. — **aplicado**. |
| Texto curto da flag fixo no `about.tsx`; "Saiba mais" como link aninhado (TalkBack) | low | **patch**: texto curto em `privacyFlagTexts.ts`; "Saiba mais" como botão acessível. O texto completo continua a um toque (decisão do dono). — **aplicado**. |
| `onDismiss` não é chamado quando há botão cancelar; ramo sem teste | low | **patch**: chama os dois e testa. — **aplicado**. |
| `DEFAULT_BUTTONS` compartilhado e mutável | low | **patch**. — **aplicado**. |
| Contagem da spec (48/25 × 49/26) | low | **patch** nas notas. — **aplicado**. |
| Alerta preso na fila se o host sair da árvore (ErrorBoundary) | low | **defer**: a pilha de hosts reduz o caso; registrar. |
| Host montado na raiz sem teste automático | low (gap) | **defer**: precisa de Playwright no build web da CI (D27). |
| Som "tap" a mais nos botões | low | **reject**: padrão dos botões do app. |
| `ai-settings`: duas permissões aceitas em fila, a segunda apaga a primeira | low | **defer**: bug antigo do fechamento; registrar. |

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas
- Build web e captura da tela Sobre e de um alerta (Playwright)

## Implementation Notes

- **Fila** `src/services/appAlert.ts` (sem `react-native`): `appAlert(title, message?, buttons?, options?)` com a forma do `Alert.alert` (padrão: um botão "OK" novo a cada alerta; botões e opções copiados e congelados), `appConfirm({ title, message, confirmLabel, cancelLabel = "Cancelar", destructive })` → `Promise<boolean>`, FIFO com um visível por vez, `subscribeAppAlert` (entrega o atual na hora: chamadas antes de algum host montar aparecem quando ele assina), `pressAppAlertButton` (fecha e depois chama o `onPress`, então um `onPress` que abre outro alerta entra na fila) e `dismissAppAlert`.
- **Tocar fora / voltar do Android / Esc na web:** chama o `onPress` do botão "cancel" (se houver) e o `onDismiss` (se houver). `cancelable: false` bloqueia. Sem `cancelable` explícito, sem botão "cancel" e sem `onDismiss`, só fecha se nenhum botão tiver efeito (ex.: o `[{ text: "OK", onPress: router.back }]` de `ocr-settings` exige o toque, como o padrão do Android).
- **Pilha de hosts (iOS):** `registerAppAlertHost()` põe o host na pilha; `getAppAlertForHost(id)` só devolve o alerta ao host de cima (o montado por último que ainda está montado). Ao desmontar, o anterior assume, sem perder a fila. Hosts montados: raiz (`app/_layout.tsx`), dentro do `Modal` de `AccountFormModal`, `TransactionBottomSheet`, `AffiliateFallbackModal` (`DailyAdModal.tsx`), `WelcomeCarousel` (cobre o `SupportModeSelector` dele) e `DebugTools`, e nas telas com `presentation: "modal"` (`add-transaction`, `onboarding`, `sync`, por um wrapper `…Route` no export default). Os outros `Modal` do app não chamam alertas (grep dos chamadores de `appAlert`/`confirmAsync`).
- **Bloqueio:** `SecurityGuard` (`app/_layout.tsx`) chama `setAppAlertLocked(isLoading || isLocked)`. Bloqueado, nenhum host mostra alerta e toques/fechar são ignorados (nenhum botão roda); ao desbloquear, o mesmo alerta volta.
- **Host** `src/components/shared/AppAlertHost.tsx`: folha que sobe no estilo do `ConfirmDeleteModal` (mesmas medidas, cores do tema via `useAppState`, `TButton`), ícone `alert-triangle` (vermelho) com botão destrutivo e `info` nos demais; mensagem longa rola; `Keyboard.dismiss()` ao mostrar cada alerta. Ordem e aparência dos botões vêm da função pura `layoutAppAlertButtons` (testada): 1–2 botões curtos lado a lado com cancelar à esquerda; 3 botões ou rótulo com mais de 14 caracteres empilhados com cancelar por último. No Android/iOS o `Modal` fica sempre montado e só muda `visible` (sem `key` por alerta). Na web o host só monta o `Modal` quando há alerta: o `Modal` do react-native-web entra no DOM ao montar, e montado desde o início ficava por baixo de Modais abertos depois (visto no Playwright com o `ScreenIntroModal`).
- **Por que `Modal` do React Native e não `Sheet`/`Dialog` do Tamagui:** o `tamagui.config.ts` usa `@tamagui/config/v5` sem driver de animação (o `Sheet` depende dele para subir e para o arrastar), e os overlays do Tamagui se renderizam por portal na raiz do `TamaguiProvider`, ou seja, dentro da janela principal; um `Modal` nativo já aberto (ex.: `AccountFormModal`, que mostra "Nome obrigatório") ficaria por cima. O `Modal` do RN abre uma janela própria, trata o voltar do Android (`onRequestClose`) e o Esc na web, sem dependência nem provider novo. Os botões continuam `TButton` (Tamagui).
- **Trocas:** 49 chamadas em 26 arquivos de `app/` e `src/`: 42 `Alert.alert` (incluindo o do `confirmAsync`), 3 `window.confirm`, 2 `w.confirm` (`globalThis` em `_layout` e `confirmAsync`) e 2 `alert(` globais (`DebugTools`, só em dev, agora com a mensagem como título). O `confirmAsync` virou `appConfirm` com "Cancelar" + rótulo destrutivo. Títulos, mensagens, botões e efeitos mantidos.
- **Diferenças inevitáveis, só na web** (onde antes havia `window.confirm`): o aviso único de "Consultas de itens, preços e ícones" mostra os botões "Desligar"/"Manter ligado" como no Android, em vez do texto "OK = Manter ligado · Cancelar = Desligar"; os dois de `ai-settings` usam o mesmo alerta do Android; remover item da lista de desejos na web usa o mesmo `ConfirmDeleteModal` do Android (mesmo texto `Remover "<nome>" da lista?`). No Android, tocar fora de um alerta com botão "cancel" agora chama esse botão (antes, sem `cancelable: true`, o toque fora era ignorado), como pede a matriz.
- **Guarda:** `src/services/__tests__/noNativeAlert.test.ts` varre `app/`, `src/`, `components/`, `lib/` e `constants/` (`.ts/.tsx/.js/.jsx`, fora testes). Remove comentários com um leitor que respeita strings, templates e regex (`"http://…"` e `"src/**/*.ts"` não viram comentário) e acusa `.alert/.confirm/.prompt(` (inclusive `?.` e `w.confirm`), `alert/confirm/prompt(` soltos, `["alert"]`, `import … Alert … from "react-native"`/`"react-native-web"` (com alias e várias linhas), `require("react-native")` com `Alert` e `X.Alert`. Auto-teste com 29 formatos de desvio que precisam ser acusados e 11 usos legítimos que não podem ser. O parâmetro `confirm` de `runIfConfirmed` (`src/modules/backup/application/confirmedExport.ts`) virou `askConfirmation`.
- **Tela Sobre:** a linha da flag usa `PRIVACY_FLAG_TEXTS.externalLookups.title` e o novo `shortDescription` ("Busca produtos, preços e ícones online.", em `src/constants/privacyFlagTexts.ts`, com teste de tamanho), mais um "Saiba mais" separado (`Pressable`, `accessibilityRole="button"`, `accessibilityLabel="Saiba mais sobre …"`) que abre `appAlert(title, formatPrivacyFlagText("externalLookups"))` com o texto completo da 12.7. O interruptor fica alinhado com o de "Efeitos Sonoros".
- **Testes:** `src/services/__tests__/appAlert.test.ts` (26: fila, botões, fechar com/sem cancel e só com `onDismiss`, `appConfirm`, antes de montar, botões próprios, pilha de hosts, bloqueio, `layoutAppAlertButtons`), guarda (42) e `privacyFlagTexts.test.ts` (+1).
- **Verificação:** `npx vitest run` 70 arquivos / 1346 testes passando; `npx tsc --noEmit` sem erros. Build web + Playwright (`v2-*.png`): linha da flag, "Saiba mais" com o texto completo, Esc fecha, "Limpar histórico da IA" (destrutivo) e "Cancelar" sem efeito, e "Nome obrigatório" por cima do `Modal` de `AccountFormModal` (host do Modal) com "OK" voltando ao formulário; nenhum diálogo nativo do navegador.
- **Não verificado:** Android e iOS reais (só web); a pilha de hosts no iOS segue a análise do review.
