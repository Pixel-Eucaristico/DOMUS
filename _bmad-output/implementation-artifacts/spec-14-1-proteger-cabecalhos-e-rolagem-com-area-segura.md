---
title: 'Story 14.1: Proteger cabeçalhos e rolagem com área segura'
type: 'bugfix'
created: '2026-11-16'
status: 'done'
baseline_revision: 'b204b836d9a18dc87f4330efddc04784ef2a5eed'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Testes de renderização/rolagem em runtime para HomeScreen e AddTransactionScreen
    evidence: |-
      Vitest neste repositório não monta componentes react-native (AGENTS.md) e não há @testing-library/react-native.
    location: >-
      app/(tabs)/index.tsx:288-350, app/add-transaction.tsx:108-118
    severity: medium
  - summary: >-
      Mover paddingTop: insets.top + webTopInset para o View raiz em app/(tabs)/accounts.tsx
    evidence: |-
      app/(tabs)/accounts.tsx:85-91 ainda aplica insets.top no contentContainerStyle do ScrollView; fora do escopo da Story 14.1.
    location: >-
      app/(tabs)/accounts.tsx:85-91
    severity: low
---

<intent-contract>

## Intent

**Problem:** Na Home (`app/(tabs)/index.tsx`) e na tela de criação/edição de transação (`app/add-transaction.tsx`), o `insets.top` é aplicado apenas no `contentContainerStyle.paddingTop` do `ScrollView`/`KeyboardAwareScrollViewCompat` (que inicia em `y = 0` sob a barra de status translúcida do Android), fazendo o conteúdo rolado (`Orçamento 50/30/20`, `PagBank(PJ)`) invadir o relógio e ícones do sistema; além disso, o bloco esquerdo do cabeçalho da Home não encolhe (`flexShrink: 1` ausente) e empurra os 4 botões de ação para fora da borda direita em telas estreitas.

**Approach:** Mover a proteção de `insets.top + webTopInset` para o container raiz externo (com `theme.background`) tanto em `app/(tabs)/index.tsx` quanto em `app/add-transaction.tsx`, e tornar o cabeçalho da Home responsivo (`flex: 1, minWidth: 0` no bloco esquerdo, `numberOfLines={1}` no subtítulo, `flexShrink: 0` em `headerActions` e métricas compactas em `src/modules/layout/homeHeaderLayout.ts`) para que os 4 botões caibam inteiros em telas a partir de 320px/360px.

## Boundaries & Constraints

**Always:**
- O `ScrollView` de `app/(tabs)/index.tsx` e o `KeyboardAwareScrollViewCompat` de `app/add-transaction.tsx` devem começar abaixo de `insets.top + webTopInset`, mantendo a faixa da barra de status coberta pelo `backgroundColor: theme.background` do container raiz durante toda a rolagem.
- Na barra superior da Home (`DOMUS`), os 4 botões de ação (Sync, Scanner, IA e Engrenagem de Configurações) devem permanecer com `flexShrink: 0` e dimensões/espaçamentos que caibam dentro da largura útil sem corte na borda direita em telas Android comuns (ex.: `360dp`) e compactas (`320dp`).
- O bloco esquerdo do cabeçalho (`DomusLogo`, ícone opcional, `DOMUS` e `{archetype} / Nível {level}`) deve encolher (`flex: 1, minWidth: 0`) sem sobrepor nem cortar os botões da direita.
- Manter os padrões de teclado da Epic 13 (`KeyboardAwareScrollViewCompat`, `SCROLL_BOTTOM_PADDING`) intactos em `app/add-transaction.tsx`.

**Never:**
- Nunca usar `vi.mock("react-native")` no Vitest (`AGENTS.md`).
- Nunca usar Views maiores que a tela com animação (`absoluteFillObject` apenas).
- Nunca alterar `app/_layout.tsx` de forma que quebre edge-to-edge ou o sistema único de teclado da Epic 13.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rolagem na Home (`app/(tabs)/index.tsx`) | `insets.top > 0` (Android edge-to-edge) e usuário rola para baixo (`Orçamento 50/30/20`) | Container raiz tem `paddingTop: insets.top + webTopInset` com `theme.background`; `ScrollView` nunca invade `0..insets.top` | Sem erro |
| Rolagem em criar/editar transação (`app/add-transaction.tsx`) | `insets.top > 0` e usuário rola para baixo (ex.: `PagBank(PJ)`) | Container `<View>` externo tem `paddingTop: insets.top + webTopInset` com `theme.background`; `KeyboardAwareScrollViewCompat` rola abaixo da área segura | Sem erro |
| Largura do cabeçalho da Home (`320dp` / `360dp`) | `computeHomeHeaderFit(screenWidth)` com 4 botões + padding + gap | `actionsWidth + horizontalPadding * 2 < screenWidth` e `availableBrandWidth > 0` (sem overflow à direita) | Larguras pequenas ainda mantêm `availableBrandWidth >= 0` |

</intent-contract>

## Code Map

- `app/(tabs)/index.tsx:288-350,620-640` -- `s.root`, `s.scrollView`, `s.scrollContent` (`paddingTop: insets.top + webTopInset + 16`), `s.header`, `s.headerActions`, `s.settingsBtn`.
- `app/add-transaction.tsx:110-130,430-455` -- `<KeyboardAwareScrollViewCompat>` como elemento raiz com `paddingTop: insets.top + webTopInset + 16` em `contentContainerStyle`.
- `app/_layout.tsx:408-417` -- `<KeyboardProvider statusBarTranslucent navigationBarTranslucent>` e `<SafeAreaProvider>` (somente leitura; confirma que a viewport começa em `y = 0`).

## Tasks & Acceptance

**Execution:**
- `src/modules/layout/homeHeaderLayout.ts` -- Criar módulo puro (sem `react-native`) com `HOME_HEADER_METRICS` (`horizontalPadding: 16`, `buttonSize: 40`, `actionsGap: 6`, `actionCount: 4`, `brandActionsGap: 8`) e `computeHomeHeaderFit(screenWidth)` calculando `actionsWidth`, `totalReservedWidth` e `availableBrandWidth` -- Permite parametrizar o cabeçalho da Home e validar matematicamente em Vitest que os 4 botões nunca extrapolam a largura da tela.
- `app/(tabs)/index.tsx` -- Mover `paddingTop: insets.top + webTopInset` para o `<View style={[s.root, { backgroundColor: theme.background, paddingTop: insets.top + webTopInset }]}>` e manter `paddingTop: 16` em `s.scrollContent`; atualizar `s.header` (`paddingHorizontal: HOME_HEADER_METRICS.horizontalPadding`, `gap: HOME_HEADER_METRICS.brandActionsGap`), dar `flex: 1, minWidth: 0` ao grupo esquerdo e `flexShrink: 1, minWidth: 0` ao bloco de texto (`numberOfLines={1}` no subtítulo de nível/arquétipo), e aplicar `flexShrink: 0`, `gap: HOME_HEADER_METRICS.actionsGap`, `width/height: HOME_HEADER_METRICS.buttonSize` em `s.headerActions`/`s.settingsBtn` -- Impede invasão da barra de status durante rolagem e elimina corte do botão de configurações na borda direita.
- `app/add-transaction.tsx` -- Envolver `<KeyboardAwareScrollViewCompat>` com `<View style={[s.root, { backgroundColor: theme.background, paddingTop: insets.top + webTopInset }]}>` e usar `paddingTop: 16` em `contentContainerStyle` (mantendo `style={{ flex: 1 }}` no `KeyboardAwareScrollViewCompat` e `paddingBottom: insets.bottom + SCROLL_BOTTOM_PADDING`) -- Garante que cabeçalho e campos como `PagBank(PJ)` nunca passem sob o relógio/ícones do Android ao rolar.
- `src/modules/layout/__tests__/homeHeaderLayout.test.ts` -- Testar `computeHomeHeaderFit` em larguras `320`, `360`, `390` e `412` (confirmando zero overflow dos 4 botões) e verificar estruturalmente via `fs.readFileSync` que `app/(tabs)/index.tsx` e `app/add-transaction.tsx` aplicam `paddingTop: insets.top + webTopInset` no container externo fora do `ScrollView`/`KeyboardAwareScrollViewCompat` -- Garante regressão zero sem `vi.mock("react-native")`.

**Acceptance Criteria:**
- Given a tela Início (`app/(tabs)/index.tsx`) e a tela de edição de transação (`app/add-transaction.tsx`) com `insets.top > 0`, when o usuário rola o conteúdo para baixo, then o `ScrollView` / `KeyboardAwareScrollViewCompat` permanece abaixo de `insets.top + webTopInset` e títulos/campos (`Orçamento 50/30/20`, `PagBank(PJ)`) não sobrepõem a barra de status.
- Given a barra superior da Home (`DOMUS`), when renderizada em telas estreitas (ex.: `320dp`–`360dp`), then os 4 botões de ação (Sync, Scanner, IA e Configurações) cabem inteiros dentro da largura da tela sem corte na borda direita.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 12 findings — high 0, medium 4, low 8, false 0, maybe-false 0
- findings:
  - `[low]` `[patch]` Faltavam `paddingLeft: insets.left` e `paddingRight: insets.right` nos containers raiz de `app/(tabs)/index.tsx` e `app/add-transaction.tsx` — adicionados em ambos.
  - `[low]` `[reject]` Comportamento de `KeyboardAwareScrollViewCompat` dentro de `<View>` com `paddingTop` — `KeyboardProvider` já gerencia teclado em edge-to-edge sem offset extra.
  - `[medium]` `[patch]` `<PixelText size={16}>DOMUS</PixelText>` em `app/(tabs)/index.tsx` não tinha `numberOfLines` nem `adjustsFontSizeToFit` — adicionadas as props em `src/components/pixel/PixelText.tsx` e aplicadas em `app/(tabs)/index.tsx`.
  - `[low]` `[patch]` `computeHomeHeaderFit(NaN)` retornava `NaN` — protegido `screenWidth` com `Number.isFinite` em `src/modules/layout/homeHeaderLayout.ts` e adicionado teste.
  - `[low]` `[reject]` `computeHomeHeaderFit` não chamado em runtime — helper matemático para validar métricas de `HOME_HEADER_METRICS` em Vitest.
  - `[low]` `[reject]` Botões de `40x40` sem `hitSlop` — espaço em `320dp` exige `40px` com `gap: 6` para os 4 botões não colidirem.
  - `[low]` `[reject]` Testes baseados em `fs.readFileSync` — padrão adotado no repo onde `vi.mock("react-native")` não funciona no Vitest.
  - `[low]` `[defer]` `app/(tabs)/accounts.tsx:85-91` tem o mesmo padrão de `ScrollView` — adiado por estar fora do escopo de `Home` e `AddTransaction` da Story 14.1.
  - `[low]` `[reject]` `paddingLeft`/`paddingRight` + loading root (mesma causa raiz do item 1) — corrigida.
  - `[medium]` `[defer]` `HomeScreen` sem teste de renderização em runtime no Vitest — adiado por ausência de harness RN.
  - `[medium]` `[defer]` `AddTransactionScreen` sem teste de renderização em runtime no Vitest — adiado por ausência de harness RN.
  - `[medium]` `[defer]` Divergência de superfície (runtime RN vs testes estáticos/matemáticos) — coberta pelos itens adiados acima.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit && npx vitest run --maxWorkers=2` -- passou após os ajustes finais (`eslint`: 0 erros, 14 warnings; `tsc --noEmit`: 0 erros; `vitest`: 141 arquivos, 3111 testes passando).

## Auto Run Result

- **Summary:** Protegidos os containers raiz de `app/(tabs)/index.tsx` e `app/add-transaction.tsx` com `insets.top + webTopInset`, `insets.left` e `insets.right` (evitando invasão da barra de status durante rolagem), e ajustado o cabeçalho da Home (`HOME_HEADER_METRICS`, `flex: 1, minWidth: 0`, `numberOfLines={1}`, `adjustsFontSizeToFit` em `PixelText`) para acomodar os 4 botões sem corte à direita.
- **Files changed:**
  - `src/modules/layout/homeHeaderLayout.ts` — `HOME_HEADER_METRICS` e `computeHomeHeaderFit` com guarda `Number.isFinite`.
  - `src/components/pixel/PixelText.tsx` — suporte opcional a `numberOfLines` e `adjustsFontSizeToFit`.
  - `app/(tabs)/index.tsx` — `paddingTop/Left/Right` no `s.root` fora do `ScrollView` e cabeçalho responsivo sem corte.
  - `app/add-transaction.tsx` — `<View>` raiz com `paddingTop/Left/Right` envolvendo `KeyboardAwareScrollViewCompat`.
  - `src/modules/layout/__tests__/homeHeaderLayout.test.ts` — 8 testes validando `computeHomeHeaderFit` (320–412dp e `NaN`) e a estrutura de área segura das duas telas.
- **Review breakdown:** 3 itens corrigidos por patch (1 `medium`, 2 `low`), 4 adiados (3 `medium`/`defer` agrupados na ausência de harness RN + 1 `low` `accounts.tsx`), 5 rejeitados (`low`).
- **Follow-up review recommendation:** `false` (apenas 1 entrada `medium` corrigida por patch).
- **Verification:** `eslint` (0 erros), `tsc --noEmit` (0 erros) e `vitest run --maxWorkers=2` (141 arquivos, 3111 testes passando).
