---
title: 'Trocar o alerta nativo pelo alerta customizado do app'
type: 'bugfix'
created: '2026-10-23'
status: 'in-progress'
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
| iOS: o alerta montado na raiz não aparece sobre outro Modal ou tela `presentation: "modal"`, e a fila trava | high | `RCTModalHostViewComponentView` apresenta do controller da raiz. **patch**: pilha de hosts — modais e telas modais montam um `AppAlertHost` próprio; o último montado mostra os alertas. |
| Android 16: host entrando/saindo como filho direto da raiz ("null child at index N"); troca de `key` a cada alerta | medium | Comentário do `_layout`. **patch**: o `Modal` do host fica sempre montado e só muda `visible`, sem `key` por alerta. |
| Teclado aberto cobre os botões do alerta (folha embaixo) | medium | **patch**: `Keyboard.dismiss()` ao mostrar. |
| Alerta por cima da tela de bloqueio, botões tocáveis sem desbloquear | medium | **patch**: com o app bloqueado o host esconde o alerta, que volta depois de desbloquear. |
| Ordem dos botões e índice só no host, sem teste (Excluir × Cancelar) | medium (gap) | **patch**: função pura de layout dos botões, testada; o host só desenha. |
| Teste de proteção deixa passar `w.confirm`, `confirm(` solto, `Alert["alert"]`, `Alert?.alert`, `require`, `window.prompt`, `react-native-web`, pastas `components/` e `lib/`, `.js` | medium | **patch** + auto-teste com cada formato. |
| Texto curto da flag fixo no `about.tsx`; "Saiba mais" como link aninhado (TalkBack) | low | **patch**: texto curto em `privacyFlagTexts.ts`; "Saiba mais" como botão acessível. O texto completo continua a um toque (decisão do dono). |
| `onDismiss` não é chamado quando há botão cancelar; ramo sem teste | low | **patch**: chama os dois e testa. |
| `DEFAULT_BUTTONS` compartilhado e mutável | low | **patch**. |
| Contagem da spec (48/25 × 49/26) | low | **patch** nas notas. |
| Alerta preso na fila se o host sair da árvore (ErrorBoundary) | low | **defer**: a pilha de hosts reduz o caso; registrar. |
| Host montado na raiz sem teste automático | low (gap) | **defer**: precisa de Playwright no build web da CI (D27). |
| Som "tap" a mais nos botões | low | **reject**: padrão dos botões do app. |
| `ai-settings`: duas permissões aceitas em fila, a segunda apaga a primeira | low | **defer**: bug antigo do fechamento; registrar. |

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas
- Build web e captura da tela Sobre e de um alerta (Playwright)

## Implementation Notes

- **Fila** `src/services/appAlert.ts` (sem `react-native`): `appAlert(title, message?, buttons?, options?)` com a forma do `Alert.alert` (padrão: um botão "OK"), `appConfirm({ title, message, confirmLabel, cancelLabel = "Cancelar", destructive })` → `Promise<boolean>`, FIFO com um visível por vez, `subscribeAppAlert` (entrega o atual na hora, então chamadas antes de a raiz montar aparecem quando o host assina), `pressAppAlertButton` (fecha e depois chama o `onPress`, então um `onPress` que abre outro alerta entra na fila) e `dismissAppAlert`.
- **Tocar fora / voltar do Android / Esc na web:** vale como o botão "cancel"; sem ele, chama `onDismiss`. `cancelable: false` bloqueia. Sem `cancelable` explícito, sem botão "cancel" e sem `onDismiss`, só fecha se nenhum botão tiver efeito (ex.: o `[{ text: "OK", onPress: router.back }]` de `ocr-settings` exige o toque, como o padrão do Android).
- **Host** `src/components/shared/AppAlertHost.tsx`: folha que sobe no estilo do `ConfirmDeleteModal` (mesmas medidas, cores do tema, `TButton`), ícone `alert-triangle` (vermelho) quando há botão destrutivo e `info` nos demais; 1–2 botões lado a lado (cancelar à esquerda), 3 botões ou rótulo com mais de 14 caracteres empilhados (cancelar por último); mensagem longa rola. Montado uma vez em `app/_layout.tsx` (`AppAlertHostMount`, dentro do `AppStateProvider`/`TamaguiProvider`, fora do slot condicional pós-splash).
- **Por que `Modal` do React Native e não `Sheet`/`Dialog` do Tamagui:** o `tamagui.config.ts` usa `@tamagui/config/v5` sem driver de animação (o `Sheet` depende dele para subir e para o arrastar), e os overlays do Tamagui se renderizam por portal na raiz do `TamaguiProvider`, ou seja, dentro da janela principal; no Android, um `Modal` nativo já aberto (ex.: `AccountFormModal`, que mostra "Nome obrigatório") fica por cima e esconderia o alerta. O `Modal` do RN abre uma janela própria por cima dos outros, trata o voltar do Android (`onRequestClose`) e o Esc na web, sem dependência nem provider novo. Os botões continuam `TButton` (Tamagui).
- **Trocas:** 42 `Alert.alert` (incluindo o do `confirmAsync`), 3 `window.confirm` e 2 `alert(` globais (`DebugTools`, só em dev) em 26 arquivos de `app/` e `src/`; o `confirmAsync` (agora `appConfirm` com "Cancelar" + rótulo destrutivo). Títulos, mensagens, botões e efeitos mantidos.
- **Diferenças inevitáveis, só na web** (onde antes havia `window.confirm`): o aviso único de "Consultas de itens, preços e ícones" agora mostra os botões "Desligar"/"Manter ligado" como no Android, em vez do texto "OK = Manter ligado · Cancelar = Desligar"; os dois de `ai-settings` usam o mesmo alerta do Android; remover item da lista de desejos na web passa a usar o mesmo `ConfirmDeleteModal` do Android (mesmo texto `Remover "<nome>" da lista?`). No Android, tocar fora de um alerta com botão "cancel" agora chama esse botão (antes, sem `cancelable: true`, o toque fora era ignorado), como pede a matriz.
- **Guarda:** `src/services/__tests__/noNativeAlert.test.ts` varre `app/` e `src/` (fora testes, ignorando comentários) e falha com `Alert.alert(`, `window.alert(`, `window.confirm(`, `globalThis.alert/confirm(`, `alert(` global e `import { Alert } from "react-native"`. Testes da fila em `src/services/__tests__/appAlert.test.ts` (13).
- **Tela Sobre:** a linha da flag mostra "Busca produtos, preços e ícones online." com "Saiba mais" na mesma frase, que abre `appAlert("Consultas de itens, preços e ícones", formatPrivacyFlagText("externalLookups"))` (texto completo da 12.7, com linha em branco entre "Envia:" e "Sem isso:"). `SwitchRow` ganhou `onLearnMore` opcional.
- **Verificação:** `npx vitest run` 70 arquivos / 1292 testes passando; `npx tsc --noEmit` sem erros. Build web + Playwright: linha da flag alinhada com "Efeitos Sonoros", "Saiba mais" abre o alerta, Esc fecha, "Limpar histórico da IA" mostra o alerta destrutivo e "Cancelar" fecha sem efeito; nenhum diálogo nativo do navegador disparou.
- **Risco não verificado:** só a web foi vista; no iOS, abrir um `Modal` do RN enquanto outro `Modal` está aberto pode não aparecer em algumas versões (o app é Android).

