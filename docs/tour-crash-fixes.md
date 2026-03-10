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

## #6 — EdgeToEdgeReactViewGroup "null child" crash (Samsung Android 14+)

**Arquivos**: `android/app/src/main/java/.../MainApplication.kt`,
`patches/react-native-keyboard-controller+1.18.5.patch`

**Erro**:
```
java.lang.IllegalStateException: EdgeToEdgeReactViewGroup contains null child
at index 2 when traversal in dispatchGetDisplayList
```

**Problema**: Samsung Android 14+ tem um metodo privado `dispatchGetDisplayList()`
no ViewGroup que traversa `mChildren[]` diretamente (sem `getChildAt`).
Quando o Fabric (New Architecture) remove Views filhas durante navegacao
de tela, `mChildren[i]` fica null antes de `mChildrenCount` decrementar.
O `EdgeToEdgeReactViewGroup` do `react-native-keyboard-controller` envolve
toda a arvore React, entao qualquer navegacao pode provocar o crash.

**Tentativas que FALHARAM** (documentadas para nao repetir):

1. **Override `dispatchDraw()` com try-catch** — Samsung NAO chama
   `dispatchDraw()` antes de `dispatchGetDisplayList()`. O crash acontece
   ANTES do dispatchDraw ser invocado.

2. **Override `draw()` com try-catch** — Samsung tambem bypassa `draw()`.
   A pipeline vai direto de `updateDisplayListIfDirty()` para
   `dispatchGetDisplayList()` sem passar por `draw()` ou `dispatchDraw()`.

3. **`removeViewInLayout()` ao inves de `removeView()`** — Nao ajudou pois
   o crash nao vem do removeView da lib, e sim do Fabric removendo React
   children durante a reconciliacao da arvore.

4. **`OnPreDrawListener` + reflection para limpar nulls em `mChildren`** —
   Android 14+ bloqueia acesso a `mChildren` e `mChildrenCount` via
   reflection (hidden API restrictions). O `isAccessible = true` falha
   silenciosamente.

5. **`Thread.setDefaultUncaughtExceptionHandler` ANTES do RN** — O handler
   era sobrescrito pelo React Native, Expo DevLauncher e Firebase Crashlytics
   durante suas proprias inicializacoes.

6. **`Thread.setDefaultUncaughtExceptionHandler` DEPOIS do RN** — Capturou
   a excecao mas o main Looper morria (stack unwind), causando freeze/ANR.

**Solucao que FUNCIONOU**: Main Looper wrapper ("Cockroach" pattern).

**Arquivo**: `android/app/src/main/java/.../MainApplication.kt`

Apos toda a inicializacao (loadReactNative, Expo, Firebase), posta um
Runnable no main Handler que entra em loop infinito chamando `Looper.loop()`.
Quando Samsung lanca o `IllegalStateException`, o catch verifica se e o
crash especifico ("null child" + "dispatchGetDisplayList"), engole a excecao
e faz `continue` para reiniciar o Looper. O proximo frame renderiza
normalmente. Qualquer outra excecao e encaminhada ao handler padrao.

```kotlin
mainHandler.post {
  while (true) {
    try {
      Looper.loop()
    } catch (e: Throwable) {
      if (e is IllegalStateException &&
          e.message?.contains("null child") == true &&
          e.message?.contains("dispatchGetDisplayList") == true) {
        continue // Samsung crash — restart Looper
      }
      Thread.getDefaultUncaughtExceptionHandler()
        ?.uncaughtException(Thread.currentThread(), e)
      break
    }
  }
}
```

**Por que funciona**: `Looper.loop()` e o event loop do main thread Android.
Quando uma excecao escapa do Looper, normalmente o processo morre. Ao
re-chamar `Looper.loop()` dentro do catch, reiniciamos o event loop e o
proximo frame desenha com a arvore ja consistente (o Fabric terminou de
reconciliar).

**NUNCA MAIS FAZER**:
- Confiar que `dispatchDraw` ou `draw` capturam crashes de rendering Samsung
- Usar reflection para `mChildren` em Android 14+ (bloqueado)
- Setar UncaughtExceptionHandler antes do RN/Expo/Firebase (sera sobrescrito)

---

## Checklist para futuros passos do tour

- [ ] Nunca usar Views > 5000px com animacao Reanimated
- [ ] Sempre carregar modulos nativos (WebView, Camera) no module scope
- [ ] Sempre ter fallback/loading para estados de permissao
- [ ] Testar measureInWindow com guards de valores invalidos
- [ ] Testar em Samsung Galaxy S series antes de release
- [ ] Patches nativos: guardar em `draw()` alem de `dispatchDraw()` para Samsung
