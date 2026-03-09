# Tour Crash Fixes — Samsung S23+ e similares

Data: 2026-03-09
Dispositivo afetado: Samsung Galaxy S23+ (GPU Mali, Android 14+)
Problema: App crashava ao abrir o passo do QR Code no tour guiado.

---

## #1 — Backdrop 30.000px crashando GPU

**Arquivos**: `src/tour/useTourTarget.tsx`, `src/components/tour/TourBackdrop.tsx`

**Problema**: O backdrop do tour usava `width: 30000, height: 30000` com
`top: -10000, left: -10000` para cobrir toda a tela. Isso criava uma
Animated.View de 30.000x30.000 pixels com animacao FadeIn do Reanimated.
GPUs Mali (Samsung Galaxy S series) tem limite de textura e esse tamanho
causa crash nativo por exceder a memoria grafica.

**Solucao**: Substituido por `top: 0, left: 0, right: 0, bottom: 0` que
usa o layout system do React Native para cobrir a tela inteira sem criar
texturas gigantes.

**NUNCA MAIS FAZER**: Usar dimensoes maiores que a tela (>5000px) em Views
com animacao. Preferir sempre `absoluteFillObject` ou `top/left/right/bottom: 0`.

---

## #2 — WebView require() dinamico no render

**Arquivo**: `src/components/invoice/WebViewScreen.tsx`

**Problema**: `require("react-native-webview").default` era chamado dentro do
corpo do componente (render function). Em Samsung, isso pode falhar se o modulo
nativo nao estiver pronto, causando crash sem error boundary.

**Solucao**:
- Movido o require para fora do componente (module scope) com try/catch
- Adicionado fallback visual se NativeWebView for null
- Adicionadas props de estabilidade Android:
  - `originWhitelist={["*"]}`
  - `setSupportMultipleWindows={false}`
  - `onRenderProcessGone` — callback quando processo WebView morre (Android)
  - `onContentProcessDidTerminate` — callback equivalente para iOS

**NUNCA MAIS FAZER**: Usar require() dinamico dentro de render functions para
modulos nativos. Sempre carregar no module scope.

---

## #3 — View vazio durante carregamento de permissao

**Arquivo**: `app/import-invoice.tsx`

**Problema**: Quando `scanner.permission` era null (ainda carregando),
retornava `<View />` vazio. Durante o tour, isso criava um estado
inconsistente — o TourOverlay tentava renderizar o card inline mas o
target nao existia.

**Solucao**: Substituido por um ActivityIndicator centralizado com
background correto do tema.

---

## #4 — measureInWindow com valores invalidos

**Arquivo**: `src/tour/useTourTarget.tsx`

**Problema**: O auto-minimize usava `measureInWindow` a cada 1 segundo,
mas durante transicoes de tela o callback retornava valores invalidos
(NaN, 0, undefined), causando comportamento erratico.

**Solucao**:
- Adicionado delay inicial de 800ms antes de comecar a medir
- Intervalo aumentado de 1000ms para 1500ms
- Guards: `Number.isFinite()` e check `y === 0 && h === 0`
- try/catch ao redor do measureInWindow (pode falhar durante unmount)

---

## #5 — Overflow de conteudo na IdleScreen

**Arquivo**: `src/components/invoice/IdleScreen.tsx`

**Problema**: A IdleScreen usa `justifyContent: "center"` com `flex: 1`.
Quando o TourInlineCard renderiza abaixo do botao QR, o conteudo total
(icone + titulo + botoes + TourCard) pode exceder a altura da tela.
Sem protecao, elementos saem da area visivel, podendo causar problemas
de layout e medicao.

**Solucao**: Container trocado de `View` para `ScrollView` com
`contentContainerStyle` e `flexGrow: 1` para permitir scroll quando
o TourCard excede a altura da tela.

---

## Checklist para futuros passos do tour

- [ ] Nunca usar Views > 5000px com animacao Reanimated
- [ ] Sempre carregar modulos nativos (WebView, Camera) no module scope
- [ ] Sempre ter fallback/loading para estados de permissao
- [ ] Testar measureInWindow com guards de valores invalidos
- [ ] Testar em Samsung Galaxy S series antes de release
