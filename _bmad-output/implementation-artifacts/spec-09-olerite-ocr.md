---
title: 'Tarefa 09 — Leitor de Olerite por OCR (Parser, Event Sourcing, Captura e Histórico)'
type: 'feature'
created: '2026-11-05'
status: 'done'
baseline_revision: 'a6385437b6a65c08c9cf3a554761e365ea765a09'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: []
deferred:
  - 'src/hooks/useOleriteScanner.ts — automated test coverage for OCR fallback and confirmReading event dispatch flow requires a React Native hook test harness not yet configured in the repository'
---

<intent-contract>

## Intent

**Problem:** O DOMUS já possui infraestrutura de OCR híbrido (`HybridOCRAdapter`, `OcrScanScreen`) e leitura de holerite no chat, mas falta o módulo dedicado de leitura de medidores (`Olerite`) especificado em `docs/roadmap/09-olerite-ocr.md`: parser numérico dedicado (`oleriteParser.ts`), persistência no event sourcing (`OLERITE_READING_ADDED`), hook de captura, tela dedicada `app/olerite.tsx` com guia visual de medidor, preview/correção manual e histórico cronológico com gráfico de evolução e cálculo de consumo médio.

**Approach:** Criar `packages/parsers/src/oleriteParser.ts` para extrair leituras numéricas e unidades de textos OCR; estender `packages/events` e `packages/domain` com o evento `OLERITE_READING_ADDED`, estado `oleriteReadings` e helpers de cálculo de evolução/consumo médio; parametrizar `OcrScanScreen` com título, dica e guia visual opcionais; criar `useOleriteScanner` e os componentes `src/components/olerite/` integrados na rota `app/olerite.tsx`, acompanhados de testes unitários em Vitest.

## Boundaries & Constraints

**Always:**
- Manter compatibilidade retroativa em `OcrScanScreen.tsx` (novas props `title`, `hintText`, `showMeterGuide` devem ser opcionais com defaults idênticos ao comportamento atual de `app/import-invoice.tsx`).
- Representar timestamps em `OleriteReadingPayload` como ISO string (`string`) ou epoch ms serializável no event sourcing (`packages/events/src/types.ts`), mantendo `OleriteReading` no parser compatível com `Date` e serialização limpa.
- Garantir que `createInitialState()` em `packages/domain/src/state.ts` inicialize `oleriteReadings: {}` sem quebrar nenhum teste existente de `domainReducer` ou `replayEvents`.
- Validar ranges numéricos no parser (`value > 0` e `value <= 1_000_000`, `confidence` entre `0` e `1`) e normalizar separadores decimais/milhares brasileiros e internacionais (`"123.456"`, `"1234,5 L"`, `"Vol: 45.2"`).

**Never:**
- Não alterar o fluxo existente de importação de notas fiscais (`app/import-invoice.tsx`, `useInvoiceScanner.ts`) nem o fluxo `scan_payslip` do chat de IA (`app/ai-chat.tsx`).
- Não adicionar dependências externas novas ao `package.json`; reutilizar `@packages/parsers`, `OcrScanScreen`, Tamagui/StyleSheet e componentes existentes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Padrão decimal com vírgula e unidade | `ocrText = "Medidor 1234,5 L"`, `confidence = 0.92` | `parseOleriteFromOCR` retorna `{ value: 1234.5, unit: "L", confidence: 0.92, ... }` | Nenhum erro |
| Padrão prefixado com ponto decimal | `ocrText = "Vol: 45.2 ml"` | `parseOleriteFromOCR` retorna `{ value: 45.2, unit: "ml", ... }` | Nenhum erro |
| Padrão numérico de medidor com ponto | `ocrText = "123.456 m3"` | `parseOleriteFromOCR` retorna `{ value: 123.456, unit: "m³" (ou "m3"), ... }` | Nenhum erro |
| Texto sem números válidos ou vazio | `ocrText = ""` ou `"SEM LEITURA"` | `parseOleriteFromOCR` retorna `null` | Hook define erro amigável e permite digitação manual |
| Valor negativo, zero ou fora de faixa | `ocrText = "0,00"` ou `"-45 L"` | Ignora tokens inválidos; se nenhum valor positivo em `(0, 1_000_000]` existir, retorna `null` | Validação bloqueia salvamento com `value <= 0` |
| Cálculo de consumo médio no histórico | 0 ou 1 leitura registrada no histórico | Consumo médio retorna `0` (sem divisão por zero) e gráfico exibe estado vazio ou barra única | Nenhum erro |
| Cálculo de consumo médio com >= 2 leituras | Leituras cronológicas `[100, 150, 210]` | Variações `[+50, +60]`, consumo/variação média `55` | Ordena por timestamp ascendente antes de calcular deltas |

</intent-contract>

## Code Map

- `packages/parsers/src/types.ts` -- Interfaces de OCR (`OCRResult` L50-53, `OCRAdapter` L55-57). Adicionar `OleriteReading` e `OleriteParseOptions`.
- `packages/parsers/src/oleriteParser.ts` -- Novo arquivo. Implementar `parseOleriteFromOCR(ocrText: string, options?: OleriteParseOptions): OleriteReading | null` e `parseOleriteFromImage(imageUri: string, ocrAdapter: OCRAdapter, options?: OleriteParseOptions): Promise<OleriteReading | null>`.
- `packages/parsers/index.ts` -- Barrel do pacote `@packages/parsers` (L1-70). Exportar tipos e funções de `oleriteParser.ts`.
- `packages/events/src/types.ts` -- `EVENT_TYPES` (L1-11) e `DomainEvent` (L198-207). Adicionar `OLERITE_READING_ADDED: "OLERITE_READING_ADDED"`, `OleriteReadingPayload`, `OleriteReadingAddedEvent` e incluí-lo na union `DomainEvent`.
- `packages/events/index.ts` -- Re-exportar `OleriteReadingPayload` e `OleriteReadingAddedEvent`.
- `packages/domain/src/state.ts` -- `AppState` (L14-19) e `createInitialState` (L21-28). Adicionar `oleriteReadings: Record<string, OleriteReadingPayload>`.
- `packages/domain/src/olerite.ts` -- Novo módulo de domínio com `createOleriteReadingEvent`, `getChronologicalOleriteReadings`, `calculateAverageOleriteConsumption` e `getOleriteEvolutionSeries`.
- `packages/domain/src/reducer.ts` -- `domainReducer` (L5-141). Tratar `EVENT_TYPES.OLERITE_READING_ADDED` adicionando a leitura em `state.oleriteReadings[payload.id]`.
- `packages/domain/index.ts` -- Exportar helpers de `src/olerite.ts`.
- `src/components/invoice/OcrScanScreen.tsx` -- `Props` (L13-20), top bar title (L92) e hint bubble (L97-105). Adicionar props opcionais `title?: string`, `hintText?: string`, `showMeterGuide?: boolean` para exibir moldura visual central de enquadramento do medidor.
- `src/hooks/useOleriteScanner.ts` -- Novo hook seguindo o padrão de `src/hooks/useInvoiceScanner.ts` (L39-65) e `OCRConfigService`, gerenciando câmera, execução do OCR (`parseOleriteFromImage`), estado de preview editável (`value`, `unit`, `location`) e confirmação via `dispatchDomainEvent(createOleriteReadingEvent(...))`.
- `src/components/olerite/OleriteCapturePreviewModal.tsx` -- Novo componente de preview do valor extraído pelo OCR com edição manual de valor, unidade (`L`, `ml`, `m³`, `kWh`) e local opcional antes de salvar.
- `src/components/olerite/OleriteHistoryView.tsx` -- Novo componente listando leituras em ordem cronológica, card de consumo/variação média e gráfico de evolução dos valores.
- `app/olerite.tsx` -- Nova tela principal integrando `OleriteHistoryView`, botão de nova captura via `OcrScanScreen` (em modo medidor) e `OleriteCapturePreviewModal`.
- `app/_layout.tsx` -- `RootLayoutNav` (L224-235). Registrar `<Stack.Screen name="olerite" options={{ headerShown: false }} />`.
- `packages/parsers/__tests__/oleriteParser.test.ts` -- Testes unitários completos para `parseOleriteFromOCR`, `parseOleriteFromImage`, reducer `OLERITE_READING_ADDED` e cálculo de histórico/consumo médio.

## Tasks & Acceptance

**Execution:**
- `packages/parsers/src/types.ts` -- Adicionar interfaces `OleriteReading` (`value`, `unit`, `confidence`, `imageUri`, `timestamp`, `location?`) e `OleriteParseOptions` -- Contratos compartilhados pelo parser e hook.
- `packages/parsers/src/oleriteParser.ts` -- Implementar `parseOleriteFromOCR` e `parseOleriteFromImage` suportando padrões de medidores (`"123.456"`, `"1234,5 L"`, `"Vol: 45.2"`, unidades `L`, `ml`, `m³`, `m3`, `kWh`) e validação numérica -- Extração confiável de leituras via OCR.
- `packages/parsers/index.ts` -- Re-exportar `OleriteReading`, `OleriteParseOptions`, `parseOleriteFromOCR` e `parseOleriteFromImage` -- Expor API pública em `@packages/parsers`.
- `packages/events/src/types.ts` e `packages/events/index.ts` -- Adicionar `EVENT_TYPES.OLERITE_READING_ADDED`, `OleriteReadingPayload`, `OleriteReadingAddedEvent` e incluí-lo em `DomainEvent` -- Suporte a event sourcing para leituras de medidor.
- `packages/domain/src/state.ts`, `packages/domain/src/olerite.ts`, `packages/domain/src/reducer.ts` e `packages/domain/index.ts` -- Adicionar `oleriteReadings` ao `AppState`, tratar `OLERITE_READING_ADDED` no `domainReducer` e criar helpers `createOleriteReadingEvent`, `getChronologicalOleriteReadings`, `calculateAverageOleriteConsumption` e `getOleriteEvolutionSeries` -- Persistência reativa e cálculos de evolução e consumo médio no domínio.
- `src/components/invoice/OcrScanScreen.tsx` -- Adicionar props opcionais `title?: string`, `hintText?: string` e `showMeterGuide?: boolean` (renderizando moldura retangular guia para posicionar o medidor quando `showMeterGuide === true`) -- Reutilizar tela de câmera conforme arquitetura proposta sem afetar notas fiscais.
- `src/hooks/useOleriteScanner.ts` -- Criar hook integrando `createHybridOCRAdapter`, `OCRConfigService`, `parseOleriteFromImage`, estado de rascunho para correção manual e salvamento via `useAppState().dispatchDomainEvent` -- Orquestrar captura OCR, edição manual e gravação no EventStore.
- `src/components/olerite/OleriteCapturePreviewModal.tsx` e `src/components/olerite/OleriteHistoryView.tsx` -- Criar componentes de preview/edição manual da leitura extraída e visualização de histórico cronológico com gráfico de evolução e resumo de consumo médio -- Entregar interface completa de conferência e análise histórica.
- `app/olerite.tsx` e `app/_layout.tsx` -- Criar rota `app/olerite.tsx` conectando `useOleriteScanner`, `OcrScanScreen`, `OleriteCapturePreviewModal` e `OleriteHistoryView`, e registrar a screen `olerite` no Stack de `app/_layout.tsx` -- Tornar a funcionalidade acessível pela navegação do app.
- `packages/parsers/__tests__/oleriteParser.test.ts` -- Criar suíte de testes unitários cobrindo todos os cenários da matriz I/O (`parseOleriteFromOCR`, `parseOleriteFromImage`, `domainReducer` com `OLERITE_READING_ADDED` e cálculo de consumo médio/evolução) -- Garantir regressão zero e cobertura dos casos de borda.

**Acceptance Criteria:**
- Given um texto OCR de medidor como `"1234,5 L"`, `"123.456"` ou `"Vol: 45.2 ml"`, when `parseOleriteFromOCR` é chamado, then retorna um objeto `OleriteReading` com `value` numérico normalizado, `unit` extraída (ou `"L"` como padrão), `confidence`, `imageUri` e `timestamp`.
- Given um texto OCR sem números válidos ou com valores menores/iguais a zero, when `parseOleriteFromOCR` é chamado, then retorna `null`.
- Given um evento `OLERITE_READING_ADDED` criado por `createOleriteReadingEvent`, when processado por `domainReducer`, then a leitura é armazenada em `state.oleriteReadings[id]` e `calculateAverageOleriteConsumption` retorna a média das variações entre leituras cronológicas consecutivas.
- Given a tela `app/olerite.tsx`, when o usuário inicia uma captura, then `OcrScanScreen` é exibido em modo medidor (`showMeterGuide`), processa a foto via OCR e abre `OleriteCapturePreviewModal` permitindo corrigir valor/unidade/local antes de confirmar.
- Given leituras salvas em `state.oleriteReadings`, when `OleriteHistoryView` é renderizado em `app/olerite.tsx`, then exibe a lista cronológica de leituras, o consumo médio entre leituras e o gráfico de evolução dos valores.

## Spec Change Log

## Review Triage Log

### 2026-11-05 — Review pass
- verdicts: 22 findings — high 4, medium 11, low 5, false 2, maybe-false 0
- [medium] [patch] Missing navigation entry point to `/olerite` — Patched by adding `"olerite"` action (`label: "Medidor"`) to `fabActions` in `app/(tabs)/index.tsx`.
- [high] [patch] Broken regex word boundary for `m³` and missing `kw/h` in `packages/parsers/src/oleriteParser.ts` — Patched by replacing `\b` with `(?=$|\s|[^\w³])` and supporting `kw\/?h`.
- [medium] [patch] Flawed dot/comma normalization in `parseMeterNumber` for multi-comma strings — Patched by rejecting strings with more than one comma (`trimmed.split(",").length > 2`).
- [medium] [patch] Mixed units corrupt consumption metrics in `packages/domain/src/olerite.ts` — Patched so deltas and average consumption only compute across consecutive readings with matching units (`prev.unit === current.unit`).
- [low] [reject] Missing update and delete events/actions for readings — Out of scope of `docs/roadmap/09-olerite-ocr.md`, which specifies only `OLERITE_READING_ADDED`.
- [false] [reject] Ephemeral camera image URIs and fallback to `primaryUri` in `useOleriteScanner.ts` — Refuted: `parseOleriteFromImage` sets `parsedReading.imageUri` to the matched `uri`.
- [medium] [patch] Unvalidated string timestamps in `createOleriteReadingEvent` — Patched to validate `new Date(params.timestamp)` via `Number.isNaN(d.getTime())` and fall back to `new Date().toISOString()`.
- [low] [reject] Negative deltas from meter resets are not handled specially — Unlikely in everyday use; signed deltas are intentional and adding reset heuristics would add complexity not in the intent.
- [low] [reject] History list order and lack of virtualization in `OleriteHistoryView.tsx` — Cosmetic preference; roadmap specifies chronological list and virtualization adds unnecessary complexity.
- [low] [patch] Stale `errorMessage` when editing value in `OleriteCapturePreviewModal` / `useOleriteScanner` — Patched `setDraftValueText` in `src/hooks/useOleriteScanner.ts` to clear `setErrorMessage(null)`.
- [false] [reject] Misleading multi-photo hint in `OcrScanScreen.tsx` when `showMeterGuide` is enabled — Refuted: `useOleriteScanner.handleProcessPhotos` iterates over all captured `uris` as fallbacks if the first photo yields no valid reading.
- [medium] [patch] Missing unit tests for `"m³"` in `parseOleriteFromOCR` — Patched by adding unit tests in `packages/parsers/__tests__/oleriteParser.test.ts`.
- [high] [patch] `packages/parsers/src/oleriteParser.ts:78-79` greedy `[:=-]?` consumes minus sign in `'Medidor -45 L'` — Patched by replacing `[:=-]?` with `(?:[:=]|-(?!\d))?`.
- [high] [patch] `packages/parsers/src/oleriteParser.ts:78-84` word boundary `\b` fails after `'³'` — Patched by replacing `\b` with `(?=$|\s|[^\w³])`.
- [medium] [patch] `src/hooks/useOleriteScanner.ts:214` calls `soundManager.play("coin")` with invalid `SoundEffect` — Patched to `soundManager.play("success")`.
- [medium] [patch] `packages/domain/src/olerite.ts:85-123` subtracts incompatible units — Patched to only compute deltas across consecutive readings with identical units.
- [low] [patch] `src/components/olerite/OleriteHistoryView.tsx:73-76` `maxChartValue` uses floor `1` across all readings instead of visible slice — Patched to compute `visibleSeries = evolutionSeries.slice(-8)` and `Math.max(...visibleSeries.map((pt) => pt.value), 0.001)`.
- [medium] [patch] `packages/domain/src/olerite.ts:31-37` invalid `Date` throws `RangeError` on `toISOString()` — Patched by checking `Number.isNaN(d.getTime())` before calling `toISOString()`.
- [medium] [patch] Multi-number OCR candidate ranking and date/time stripping in `parseOleriteFromOCR` are unverified — Patched by adding multi-number and date/time stripping unit test in `packages/parsers/__tests__/oleriteParser.test.ts`.
- [low] [defer] `useOleriteScanner` OCR fallback and `confirmReading` event dispatch flow have no test coverage — Deferred: repository Vitest setup covers pure packages under `packages/` and has no React Native hook/component test harness.
- [high] [patch] `m³\b` word boundary failure in `packages/parsers/src/oleriteParser.ts` — Patched by replacing `\b` with `(?=$|\s|[^\w³])`.
- [medium] [patch] `app/olerite.tsx` has no navigation trigger from the app UI — Patched by adding `"olerite"` action (`label: "Medidor"`) to `fabActions` in `app/(tabs)/index.tsx`.

## Design Notes

**Normalização numérica em `parseOleriteFromOCR`:**
Medidores frequentemente exibem números nos formatos `"1234,5"`, `"1.234,56"`, `"123.456"` ou precedidos por rótulos (`"Vol: 45.2"`, `"Leitura: 00128,4 m3"`).
```ts
// Se houver vírgula e ponto ("1.234,5"), pontos são milhar e vírgula é decimal.
// Se houver apenas vírgula ("1234,5"), vírgula é decimal.
// Se houver apenas ponto ("45.2" ou "123.456"), ponto é tratado como separador decimal do medidor.
```

## Verification

**Commands:**
- `./node_modules/.bin/vitest run packages/parsers/__tests__/oleriteParser.test.ts` -- expected: todos os testes do parser e domínio de olerite passam com exit code 0.
- `./node_modules/.bin/vitest run packages/events/__tests__/events.test.ts packages/parsers/__tests__/ocrParser.test.ts` -- expected: testes existentes de eventos e OCR continuam passando sem regressão.

## Auto Run Result

**Summary of Implemented Change:**
Implementado o módulo completo da **Tarefa 09 — Leitor de Olerite por OCR**, incluindo o parser dedicado de medidores (`parseOleriteFromOCR` e `parseOleriteFromImage`), suporte completo a Event Sourcing (`OLERITE_READING_ADDED`, `oleriteReadings` no `AppState`, `domainReducer` e helpers de cálculo cronológico/evolução/consumo médio), extensão retrocompatível de `OcrScanScreen` com moldura guia de medidor (`showMeterGuide`), hook `useOleriteScanner`, componentes de conferência/edição manual (`OleriteCapturePreviewModal`) e histórico analítico (`OleriteHistoryView`), tela `app/olerite.tsx`, atalho no menu rápido da Home (`app/(tabs)/index.tsx`) e suíte de testes unitários em Vitest.

**Files Changed:**
- `packages/parsers/src/types.ts` — Adicionadas as interfaces `OleriteReading` e `OleriteParseOptions`.
- `packages/parsers/src/oleriteParser.ts` — Implementados `parseOleriteFromOCR` e `parseOleriteFromImage` com normalização numérica, extração de unidades (`L`, `ml`, `m³`, `kWh`) e validação de faixa.
- `packages/parsers/index.ts` — Re-exportados os tipos e funções de `oleriteParser.ts`.
- `packages/events/src/types.ts` — Adicionados `EVENT_TYPES.OLERITE_READING_ADDED`, `OleriteReadingPayload`, `OleriteReadingAddedEvent` e integração na union `DomainEvent`.
- `packages/events/index.ts` — Re-exportados `OleriteReadingPayload` e `OleriteReadingAddedEvent`.
- `packages/domain/src/state.ts` — Adicionado `oleriteReadings: Record<string, OleriteReadingPayload>` ao `AppState` e `createInitialState()`.
- `packages/domain/src/olerite.ts` — Implementados `createOleriteReadingEvent`, `getChronologicalOleriteReadings`, `calculateAverageOleriteConsumption` e `getOleriteEvolutionSeries`.
- `packages/domain/src/reducer.ts` — Adicionado suporte a `EVENT_TYPES.OLERITE_READING_ADDED` no `domainReducer`.
- `packages/domain/index.ts` — Re-exportados os helpers de `packages/domain/src/olerite.ts`.
- `src/components/invoice/OcrScanScreen.tsx` — Adicionadas props opcionais `title`, `hintText` e `showMeterGuide` com moldura visual central para enquadramento de medidor.
- `src/hooks/useOleriteScanner.ts` — Criado hook para orquestrar câmera, OCR híbrido (`parseOleriteFromImage`), edição manual de rascunho e despacho de `OLERITE_READING_ADDED`.
- `src/components/olerite/OleriteCapturePreviewModal.tsx` — Criado modal de preview com edição manual de valor, unidade (`L`, `ml`, `m³`, `kWh`) e localização.
- `src/components/olerite/OleriteHistoryView.tsx` — Criada view de histórico cronológico com gráfico de barras de evolução e resumo de consumo médio.
- `app/olerite.tsx` — Criada tela principal integrando histórico, câmera OCR em modo medidor e modal de preview/confirmação.
- `app/_layout.tsx` — Registrada a rota `<Stack.Screen name="olerite" options={{ headerShown: false }} />`.
- `app/(tabs)/index.tsx` — Adicionado atalho `"Medidor"` no botão de ação rápida (FAB) da Home navegando para `/olerite`.
- `packages/parsers/__tests__/oleriteParser.test.ts` — Criada suíte de testes unitários cobrindo parser OCR, casos de borda (`m³`, `kw/h`, rótulos com sinal negativo, múltiplos números/datas), `domainReducer` e cálculos de evolução/consumo médio.

**Review Findings:**
- **Patches Applied (15 findings across 4 high, 9 medium, 2 low):**
  - Corrigida regex de unidades em `packages/parsers/src/oleriteParser.ts` para reconhecer `m³` (substituindo `\b` após `³` por `(?=$|\s|[^\w³])`) e `kw/h`.
  - Corrigida regex de rótulos prefixados em `packages/parsers/src/oleriteParser.ts` (`(?:[:=]|-(?!\d))?`) para não consumir o sinal de menos em valores negativos como `"Medidor -45 L"`.
  - Adicionada rejeição de strings com múltiplas vírgulas em `parseMeterNumber`.
  - Ajustados `getOleriteEvolutionSeries` e `calculateAverageOleriteConsumption` em `packages/domain/src/olerite.ts` para calcular deltas apenas entre leituras consecutivas de mesma unidade.
  - Adicionada validação de `Date` inválida em `createOleriteReadingEvent` com fallback seguro para `new Date().toISOString()`.
  - Corrigida chamada `soundManager.play("success")` e limpeza de `errorMessage` ao editar valor em `src/hooks/useOleriteScanner.ts`.
  - Ajustada escala `maxChartValue` do gráfico em `src/components/olerite/OleriteHistoryView.tsx` para usar os pontos visíveis (`slice(-8)`) e piso `0.001`.
  - Adicionado ponto de entrada de navegação `"Medidor"` (`router.push("/olerite")`) no FAB de `app/(tabs)/index.tsx`.
  - Expandida a suíte `packages/parsers/__tests__/oleriteParser.test.ts` com testes para `"m³"`, `"kw/h"`, `"Medidor -45 L"`, múltiplos números com datas/horas e unidades mistas no histórico.
- **Deferred (1 finding):**
  - `src/hooks/useOleriteScanner.ts` — Testes automatizados de hook React Native para o fluxo de câmera/OCR e `confirmReading` (repositório possui Vitest configurado apenas para pacotes puros em `packages/`).
- **Rejected (6 findings — 2 false, 4 low):**
  - Refutados 2 falsos positivos sobre `imageUri` no fallback de múltiplas fotos e dica de múltiplas fotos em `OcrScanScreen`.
  - Rejeitados 4 itens fora de escopo/preferência cosmética (eventos de edição/exclusão não previstos no roadmap, heurística de reset de medidor e virtualização/inversão da lista cronológica).

**Follow-up Review Recommendation:**
- `followup_review_recommended: true` — Recomendado pois o primeiro ciclo de review aplicou patches para 4 findings `high` e 9 findings `medium` (além de 2 `low`). Risco residual: a integração de UI/hook React Native (`useOleriteScanner` e `app/olerite.tsx`) não possui harness de testes de componentes automatizados.

**Verification Performed:**
- `./node_modules/.bin/vitest run packages/parsers/__tests__/oleriteParser.test.ts` (16 testes passando).
- `./node_modules/.bin/vitest run packages/events/__tests__/events.test.ts packages/parsers/__tests__/ocrParser.test.ts` (22 testes passando).
- `./node_modules/.bin/vitest run packages/domain/__tests__/budget.test.ts packages/domain/__tests__/finance.test.ts packages/domain/__tests__/inventory.test.ts packages/domain/__tests__/ShoppingTrip.test.ts packages/domain/__tests__/tasks.test.ts` (40 testes passando).

**Residual Risks:**
- Fluxos de UI e câmera em `useOleriteScanner.ts` / `app/olerite.tsx` dependem de validação manual em dispositivo/emulador por ausência de infraestrutura de testes de componentes React Native no projeto.
