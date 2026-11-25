# Checklist de Validação de Teclado — Android 16 (API 36) e Web

**Story:** 13.7 — Verificar todos os campos no aparelho  
**Data da execução:** 25/11/2026  
**Commit base:** `a88548f97539d2786e641efc37cfe3aaace2b1ea` (branch `dev`)  
**Documento relacionado:** [Checklist de Validação — Android 16 (API 36) (Story 1.3)](./checklist-android-16.md)  
**Referência de escopo:** `_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-20-teclado.md` (§1 e FR-29)

## Ambiente validado

- **Aparelho físico Android 16:** Samsung Galaxy Tab S9 FE (`SM-X510`, serial `RX2X101N87Y`, Android 16 / API 36, `1440×2304`, `Override density: 360` → `scale = 2,25`, barra de tarefas One UI ativa) em **retrato** (`1440×2304`, `640×1024 dp`) e **paisagem** (`2304×1440`, `1024×640 dp`).
- **Builds Android testados:**
  - `release`: `android/app/build/outputs/apk/release/app-release.apk` (recompilado e reinstalado após a correção encontrada em `CategoryPickerModal` e `StoreGridModal`).
  - `debug`: `android/app/build/outputs/apk/debug/app-debug.apk` conectado via Metro para os fluxos restritos a `__DEV__` (`DebugTools` e `ocr-settings`), com reinstalação do APK `release` final e restauração da rotação automática (`accelerometer_rotation = 1`) ao término.
- **Navegador web:** Exportação estática `npx expo export --platform web` validada via Chromium/Edge headless (CDP) em **`412×900`** (retrato móvel) e **`800×360`** (paisagem baixa), com **0 exceções JS** de página.
- **Fora de escopo por disponibilidade de hardware (decisão do dono em 25/11/2026):**
  - Celular Android 16 com tela pequena (`≤ 640 dp` em retrato): `N/A (sem aparelho)`.
  - Aparelho legado Android 7–10 (API 24–29): `N/A (sem aparelho)`.

> **Critério FR-29 verificado em cada grupo:** campo focado visível acima do teclado virtual com folga alvo de **≥ 8 dp** (`(ime_top - field_y2) / 2,25`), botão principal alcançável no 1º toque com teclado aberto, restauração limpa sem faixa em branco ao fechar o teclado e `adb logcat` sem erros fatais do app.

---

## 1. Telas com formulário (Story 13.2 + `PayslipReview`)

Todas usam `KeyboardAwareScrollViewCompat` (`bottomOffset`, `keyboardShouldPersistTaps="handled"` e fallback `ScrollView` na web).

| Superfície | Android 16 (`SM-X510`) | Web (`412×900` / `800×360`) | Evidência e medições |
|---|---|---|---|
| `app/add-transaction.tsx` | ✅ Passou *(retrato)* | ✅ Passou | Editando `Cafe13` (a partir de `Contas` → `Conta13`): campo descrição em `y=1209..1308` com teclado em `ime_top=1521` (**`+94,7 dp`** de folga), cabeçalho e botão salvar `✓` visíveis; fecha o teclado restaurando posição sem sobra. |
| `app/ai-settings.tsx` | ✅ Passou *(retrato)* | ✅ Passou | Em `IA Financeira`: seção `Orçamento e uso` (`Mensal`, campos `Tokens`, `R$` e `US$ 8.40` em `y=808..894`, `ime_top=1521`, **`+278,7 dp`** de folga) com `USO DE TOKENS HOJE` visível acima do teclado numérico; chave API e seção de orçamento também validadas na web. |
| `app/backup.tsx` | ✅ Passou *(retrato)* | ✅ Passou | Campo `Repita a senha` em `y=1132..1213` com `ime_top=1521` (**`+136,9 dp`** de folga); fechamento limpa o espaço sem sobra. |
| `app/about.tsx` (`Fale Conosco`) | ✅ Passou *(retrato)* | ✅ Passou | Campo multilinha `Fale Conosco` em `y=1210..1426` com `ime_top=1521` (**`+42,2 dp`** de folga), botão `Enviar mensagem` visível abaixo e restauração limpa ao fechar. |
| `app/ocr-settings.tsx` (`__DEV__`) | ✅ Passou *(retrato)* | ✅ Passou | Validado no build `debug` no `SM-X510` (`Importar NF` → `Configurar OCR`): campo `API Key do Cloud Vision` subiu de `y=2108..2211` para `y=1301..1413` (`ime_top=1521`, **`+48,0 dp`** de folga); rolando com teclado aberto, `Salvar Configurações` ficou visível em `y=1231..1339` (`+80,9 dp`); ao fechar o teclado restaurou para `y=2108..2220`. |
| `app/sync.tsx` (`Entrar`) | ✅ Passou *(retrato)* | ✅ Passou | Campo segredo `DOMUS1-XXXX-XXXX-...` em `y=1313..1421` (`ime_top=1521`, **`+44,4 dp`** de folga); ao fechar o teclado restaurou para `y=1358..1466`. |
| `src/components/invoice/ParsedScreen.tsx` | ✅ Passou *(retrato)* | ✅ Passou | `Importar NF` → `Lançar manualmente` → `Adicionar`: rodapé (`Total da Nota`, `Cancelar`, `Confirmar Importação`) sobe colado acima do teclado numérico sem lacuna (`KeyboardStickyView`); campo `NCM (opcional)` focado em `y=1020..1101` (**`+186,7 dp`** acima do teclado, acima do rodapé); restaura para `y=1203..1284` ao fechar. |
| `src/components/payslip/PayslipReview.tsx` | ✅ Passou *(retrato)* | ✅ Passou | `Holerites` → `Preencher à mão`: campo `SALÁRIO LÍQUIDO` em `y=1237..1340` (`ime_top=1521`, **`+80,4 dp`** de folga) com `Lançar o líquido como receita` visível logo acima do teclado numérico; botão `Salvar holerite` acessível na rolagem. |

---

## 2. Modais com formulário (Story 13.3 — `KeyboardSheet`)

Todos usam `KeyboardSheet` + `KeyboardSafeView` + `useSheetBackdropPress`.

| Superfície | Android 16 (`SM-X510`) | Web (`412×900` / `800×360`) | Evidência e medições |
|---|---|---|---|
| `TransactionBottomSheet` | ✅ Passou *(retrato)* | ✅ Passou | `Início` → FAB `+` → `Cadastro`: `Valor` (`25.50`, **`+391,1 dp`**), `Descrição` (`Cafe13`, **`+89,8 dp`**); botão `✓ Salvar` colado no rodapé acima do teclado e respondeu no **1º toque** com teclado aberto, salvando a transação sem sobra visual. |
| `AccountFormModal` | ✅ Passou *(retrato e paisagem)* | ✅ Passou | **Retrato:** campo `Conta13` subiu de `y=1601..1700` para `y=899..998` (**`+232,4 dp`**), `✓ Criar conta` colado acima do teclado; **R1 validado** (1º toque no fundo escuro fechou apenas o teclado, mantendo o modal aberto). **Paisagem (`2304×1440`):** `ime_top=729`, `Ex: Nubank` em `y=357..456` (**`+121,3 dp`**) com `✓ Criar conta` visível acima do teclado. |
| `CreateListModal` | ✅ Passou *(retrato)* | ✅ Passou | `Desejos` → `+`: campo `Lista13` em `y=1125..1224` (**`+132,0 dp`**), `Cancelar` e `+ Criar Lista` acima do teclado. *Observação (D49 em `deferred-work.md`):* no Android 16, o `autoFocus` em `<TInput>` dentro deste `<Modal>` não abriu o teclado automaticamente sem toque explícito (diferente do `CategoryPickerModal`, cujo `<TextInput autoFocus>` abriu o teclado sozinho); ao tocar, a subida e o salvamento funcionaram normalmente. |
| `AddItemModal` | ✅ Passou *(retrato + modal aninhado)* | ✅ Passou | `Desejos` → `Lista13` → `Adicionar Item`: campo `Teclado13`/`Nested13` em `y=595..694` (**`+367,6 dp`**), `+ Adicionar à lista` colado acima do teclado e cabeçalho preservado. **Aninhamento validado:** com o teclado aberto no `AddItemModal`, abrir o `CategoryPickerModal`, filtrar `"fru"` e tocar em `"Frutas"` retornou limpo ao `AddItemModal` (`y=595..694`, `+367,6 dp`) sem faixa em branco nem crash. |
| `OleriteCapturePreviewModal` | ✅ Passou *(retrato e paisagem)* | `N/A (fluxo nativo Medidor)` | `Leitor de Olerite / Medidor` → `Digitar Manual`: **retrato** — `Local / Identificação` subiu de `y=1771..1870` para `y=1069..1168` (`ime_top=1521`, **`+156,9 dp`**) com `Cancelar` e `Salvar Leitura` (`y=1384..1492`) visíveis acima do teclado; **paisagem (`2304×1440`)** — `ime_top=729`, campo em `y=358..457` (**`+120,9 dp`**). |

---

## 3. Buscas e diálogos em modal (Story 13.4 — `KeyboardListSheet` e `KeyboardSheet` com `placement`)

| Superfície | Android 16 (`SM-X510`) | Web (`412×900` / `800×360`) | Evidência e medições |
|---|---|---|---|
| `CategoryPickerModal` | ✅ Passou *(após correção — retrato, paisagem e aninhado)* | ✅ Passou | **Bug real encontrado e corrigido:** na primeira rodada no Android 16, o `<FlashList>` colapsou para `0 px` dentro do `KeyboardListSheet` com `maxHeightRatio={0.8}` (sem `heightRatio`), ocultando todas as categorias e o estado vazio. Corrigido para `heightRatio={0.8}` e revalidado no APK `release`: `autoFocus` abriu o teclado automaticamente; em **retrato**, busca em `y=214..304` (**`+540,9 dp`**) com toda a lista visível, `"zzzzz"` exibindo `"Nenhuma categoria encontrada"` (`y=392..444`), `"fru"` exibindo `"Frutas"` (`y=325..483`); em **paisagem** (`2304×1440`), `ime_top=729`, busca com **`+188,9 dp`** e `"Frutas"` visível; **1º toque** em `"Frutas"` com teclado aberto selecionou a categoria e voltou limpo tanto ao `ParsedScreen` quanto ao `AddItemModal` (aninhado sobre `KeyboardSheet` com teclado do pai aberto). |
| `StoreGridModal` | ✅ Passou *(após correção — retrato e paisagem)* | ✅ Passou | Mesmo padrão `<FlashList>` dentro de `KeyboardListSheet` corrigido (`maxHeightRatio={0.75}` → `heightRatio={0.75}`). Revalidado no APK `release` (`AddItemModal` → lupa → `Mais lojas...`): em **retrato**, grade (`Amazon`, `Mercado Livre`) visível, busca focada em `y=268..371` (`ime_top=1521`, **`+511,1 dp`**), filtro `"ama"` exibindo `Amazon` (`y=428..727`) e `"amazzzzz"` exibindo `"Nenhuma loja encontrada."` (`y=473..525`); em **paisagem (`2304×1440`)**, `ime_top=729`, busca em `y=268..371` (**`+159,1 dp`**) com `Amazon` (`y=428..702`) visível acima do teclado. |
| `AccountPicker` compacto | ✅ Passou *(retrato)* | ✅ Passou | Aberto de `PayslipReview` (`Conta da receita`): `Buscar conta...` subiu de `y=1884..1942` para `y=1182..1240` (**`+124,9 dp`**) com `Conta13` visível; filtro `"zzzzz"` em `y=1255..1313` (**`+92,4 dp`**) exibindo `"Nenhuma conta encontrada"` (`y=1419..1476`). **R1 validado:** 1º toque no fundo escuro (`y=300`) fechou só o teclado (`ime_shown=False`, modal mantido aberto); 2º toque fechou o modal. |
| Diálogo `"APAGAR TUDO"` (`app/about.tsx`) | ✅ Passou *(retrato)* | ✅ Passou | Campo de confirmação subiu de `y=1318..1433` para `y=981..1096` (**`+188,9 dp`**) com `Cancelar` e `Resetar` visíveis acima do teclado. |
| `WelcomeCarousel` (chave IA no onboarding) | `N/A (validado na web — decisão do dono)` | ✅ Passou | Validado em navegador limpo (`412×900` e `800×360`) sem apagar os dados do tablet: slide da chave de IA renderiza com campo, rodapé e botão `Pular` sem corte nem erros JS. |
| `DebugTools` (`__DEV__`) | ✅ Passou *(retrato)* | `N/A (__DEV__ nativo)` | Validado no build `debug` no `SM-X510`: aba `TROPHIES` com busca `Search trophies...` subiu de `y=834..933` para `y=574..673` (**`+376,9 dp`**), filtro `"passos"` exibiu `"1 troféus encontrados"` e `"Primeiros Passos"` (`y=765..920`); troca para aba `STATE` com teclado aberto (`measureKey={activeTab}`) fechou o teclado limpo; foco em `Saldo...` subiu de `y=1024..1114` para `y=764..854` (**`+296,4 dp`**). |

---

## 4. Chat da IA (Story 13.5 — `app/ai-chat.tsx`)

Provider único na raiz (`app/_layout.tsx`) e `KeyboardProvider` interno do GiftedChat removido pelo patch `patches/react-native-gifted-chat+3.3.2.patch`.

| Cenário | Android 16 (`SM-X510`) | Web (`412×900` / `800×360`) | Evidência e medições |
|---|---|---|---|
| **Retrato** — foco, texto longo, envio no 1º toque e cabeçalho | ✅ Passou | ✅ Passou | Barra de entrada em repouso `y=2089..2184`; com teclado aberto (`ime_top=1521`) e texto longo, a borda externa do `EditText` ficou em `y=1357..1504` (`17 px` = **`+7,6 dp`** até o topo do teclado, resultado do arredondamento de `1 px` em `scale=2,25` sobre `CHAT_KEYBOARD_GAP (2 dp) + inputRow paddingVertical (6 dp) = 8 dp` — com o `paddingBottom: 8 dp` interno do `TextInput`, o texto fica a `15,6 dp` do teclado, sem sobreposição nem deslocamento duplo). Cabeçalho `DOMUS IA` preservado em `y=95`. **Envio no 1º toque com teclado aberto validado:** digitado `"Oi DOMUS"`, toque único no botão enviar publicou a bolha (`y=529..673`) e limpou o campo mantendo o teclado estável. |
| **Paisagem** (`2304×1440`, `640 dp` de altura) | ✅ Passou | ✅ Passou | `ime_top=729`, borda externa do `EditText` em `y=616..710` (`19 px` = **`+8,4 dp`**), cabeçalho, banner, barra de uso e sugestões visíveis sem sobreposição nem deslocamento duplo. |
| **Estabilidade** — 5 ciclos abrir/fechar teclado + 5 ciclos entrar/sair da tela | ✅ Passou | ✅ Passou | Após 5 ciclos abrir/fechar, o fundo do compositor retornou exatamente para `y=2183` (0 px de sobra); 5 ciclos entrar/sair do chat com **0 crashes** (`null child` / `dispatchDetachedFromWindow`) e modais da 13.3 continuaram subindo normalmente após sair do chat. |

---

## 5. Chave manual da NF sobre a câmera (Story 13.6 — `QrScanScreen`)

Barra única em `KeyboardStickyView` com `offset.opened` vindo de `computeQrKeyBarLayout`.

| Cenário | Android 16 (`SM-X510`) | Web (`412×900` / `800×360`) | Evidência e medições |
|---|---|---|---|
| **Retrato** — `autoFocus`, normalização com espaços (44 dígitos), `Cancelar` e troca de aba | ✅ Passou | `N/A (câmera nativa)` | `Importar NF` → `QR Code` → `Digitar Chave`: `autoFocus` abriu teclado numérico (`ime_top=1521`), campo em `y=1173..1279` (**`+107,6 dp`**); entrada com espaços (`"3526 1112 ... 0018"`, 54 caracteres) normalizada ao vivo para 44 dígitos (`44/44 dígitos`) com `Consultar SEFAZ` visível; `Cancelar` e troca para aba `Cód. Barras` fecharam o teclado (`ime_shown=False`) sem piscar a câmera. |
| **Paisagem** (`2304×1440`, `640 dp` de altura) | ✅ Passou | `N/A (câmera nativa)` | `ime_top=729`, campo em `y=381..487` (**`+107,6 dp`**), barra superior, contagem `44/44 dígitos`, `Cancelar` e `Consultar SEFAZ` todos íntegros entre o topo e o teclado. |

---

## 6. Bug Encontrado, Correção e Regressão Protegida

Durante a validação no Android 16 real (`SM-X510`), foi identificado um defeito real que os testes unitários e a renderização web não capturavam:

- **Sintoma:** ao abrir `CategoryPickerModal` no Android 16, apenas o cabeçalho (`Selecionar Categoria`) e a barra de busca apareciam; a lista `<FlashList>` colapsava para **`0 px` de altura**, escondendo todas as categorias e até o estado vazio (`"Nenhuma categoria encontrada"`).
- **Causa raiz:** `CategoryPickerModal.tsx` e `StoreGridModal.tsx` usavam `<KeyboardListSheet maxHeightRatio={...}>` (sem `heightRatio`) com `<FlashList>` em `list=`. Sem `heightRatio`, o `KeyboardListSheet` aplica apenas `maxHeight` na folha e `flexShrink: 1, minHeight: 0` (sem `flexGrow: 1`) no contêiner da lista. No Android nativo, `@shopify/flash-list` (v2) exige um pai com altura definida para calcular o viewport da lista.
- **Correção aplicada:**
  1. `src/components/shared/CategoryPickerModal.tsx`: `maxHeightRatio={0.8}` → `heightRatio={0.8}`.
  2. `src/components/wishlist/StoreGridModal.tsx`: `maxHeightRatio={0.75}` → `heightRatio={0.75}`. *(Exceção intencional ao R-5 da Story 13.4: folhas com `FlashList` mantêm altura fixa com `flexShrink: 1` acima do teclado em vez de encolher ao conteúdo, pois `@shopify/flash-list` v2 colapsa para `0 px` sem altura definida no Android nativo; folhas baseadas em `ScrollView` como o `AccountPicker` compacto preservam o encolhimento ao conteúdo com `maxHeightRatio`.)*
  3. `src/components/shared/keyboardSheetLayout.ts` e `src/components/shared/KeyboardListSheet.tsx`: extraído o helper puro `listSheetSize(windowHeight, maxHeightRatio, heightRatio)` com limitação de razão válida em `(0, 1]`, devolvendo `{ size, fillList, effectiveRatio }` e amarrando `fillList && s.listFill` (`flexGrow: 1`) no `KeyboardListSheet`.
  4. `src/components/shared/__tests__/keyboardSheetLayout.test.ts` e `src/components/__tests__/keyboardScroll.test.ts`: testes unitários para `listSheetSize`, guarda em `keyboardListSheetViolations` exigindo `listSheetSize(…)` + `listFill: { flexGrow: 1 }` + `fillList && s.listFill`, e guarda em `modalListViolations` (com expansão de JSX local e aliases de `FlashList`) exigindo `heightRatio` literal válido em `(0, 1]` sempre que `list=` usar `FlashList`.
- **Revalidação:** APK `release` recompilado (`assembleRelease -PreactNativeArchitectures=arm64-v8a`), reinstalado no `SM-X510` e revalidado visualmente em ambos os modais (`CategoryPickerModal` em retrato/paisagem + 0 resultados + seleção no 1º toque + aninhado em `AddItemModal`; `StoreGridModal` em retrato/paisagem + busca + 0 resultados), além de reexportação web (`npx expo export --platform web`).

---

## 7. Verificação Automatizada Final

- **Suítes do Epic 13** (`keyboardScroll.test.ts`, `keyboardScrollDefaults.test.ts`, `keyboardSheetLayout.test.ts`, `keyboardStickyOffset.test.ts`, `chatKeyboardLayout.test.ts`, `qrKeyBarLayout.test.ts`, `parsedFooterLayout.test.ts`, `welcomeCarouselLayout.test.ts`, `patches/__tests__/keyboardControllerPatch.test.ts`): **100% passando** (incl. `keyboardScroll.test.ts` com 279 testes e `keyboardSheetLayout.test.ts` com 69 testes).
- **Suíte completa (`npx vitest run`):** **147/153 arquivos, 3.213/3.222 testes passando** — as 9 falhas restantes são pré-existentes em ambiente Windows/data (`2026-11-25`) sem relação com o Epic 13 (`src/context/__tests__/syncCoexistence.test.ts`, `src/context/__tests__/syncMigration.test.ts`, `src/modules/__tests__/nostrSync.test.ts` CRLF).
- `npx tsc --noEmit`: **0 erros** (sem `expo-env.d.ts`).
- `npx eslint .`: **0 erros** (14 warnings pré-existentes fora dos arquivos tocados).
- `npx expo export --platform web`: **exit 0**.
