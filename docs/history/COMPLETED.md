# DOMUS — Tarefas Concluídas

> Registro detalhado de todas as fases e tarefas finalizadas, com datas de conclusão do Git.

---

## Fase 2: Eficiência e Entrada de Dados

**Status:** CONCLUÍDA em 15/03/2026 (release v1.4.0)

### Otimização de Teclado
- ~~KeyboardAvoidingView nativo~~ Substituído por `react-native-avoid-softinput` (solução nativa global)
- `AvoidSoftInput.setEnabled(true)` no `_layout.tsx` — funciona em todos os TextInput automaticamente
- Chat da IA usa `KeyboardProvider` local do `react-native-keyboard-controller` (isolado)

### Menu de Ações Circular (Speed Dial)
- FAB "+" reescrito com Reanimated — arco de 1/4 de círculo (180°→270°) centralizado
- 6 ações com paginação (3+3, botão rotacionar):
  - Página 1: Cadastro Manual, Wishlist, NF/OCR
  - Página 2: Chat IA, Comando de Voz, Transferência
- Chat IA e Voz ocultos se IA desabilitada. Wishlist oculto se sem listas
- Backdrop semi-transparente, animação spring, sons e haptics

### Excluir Lista de Desejos
- Botão lixeira no header da tela de detalhe da lista
- Modal customizado de confirmação (`ConfirmDeleteModal`) com som de exclusão só na confirmação
- Remove lista e todos os itens associados

### Fix UI Wishlist
- Título "Lista de Desejos" com padding superior e lateral corrigidos

---

## Fase 4: Inteligência e Consultoria Financeira (Parcial)

### Motor Multi-Provedor de IA (Chat & Texto)

**Status:** CONCLUÍDO em 07/03/2026

- **OpenAI** — `gpt-5-mini` / `gpt-5.4` (`max_completion_tokens`, sem `temperature` para gpt-5.x)
- **Gemini** — `gemini-2.5-flash` / `gemini-2.5-pro`
- **Claude** — `claude-haiku-4-5` / `claude-sonnet-4-6` (`anthropic-version: 2023-06-01`)
- **DeepSeek** — `deepseek-chat` / `deepseek-reasoner` (OpenAI-compatible)
- **Qwen** — `qwen-turbo-latest` / `qwen-plus-latest` via DashScope
- System prompt financeiro brasileiro (estilo William Ribeiro / "Dinheiro Com Voce")
- Proibição de tabelas markdown no prompt
- Links para documentação oficial e geração de API key por provider

### Motor Multi-Provedor de Audio (TTS)

**Status:** CONCLUÍDO em 16/03/2026

- **OpenAI TTS** — `gpt-4o-mini-tts`, 13 vozes
- **Gemini TTS** — TTS nativo
- **ElevenLabs** — `eleven_multilingual_v2`, 21 vozes premade, `language_code: "pt"`
- Claude/DeepSeek/Qwen sem TTS — usuário seleciona audio provider separado
- Cálculo de custo TTS por caracteres (`TokenTracker.recordTTSChars`)
- Aviso de que ElevenLabs requer plano pago para vozes via API

### Motor Multi-Provedor de STT (Speech-to-Text)

**Status:** CONCLUÍDO em 16/03/2026

- **OpenAI** — `gpt-4o-mini-transcribe`
- **Gemini** — áudio multimodal direto
- **ElevenLabs** — Scribe v1 (`/v1/speech-to-text`)
- Claude/DeepSeek/Qwen — usa STT do audio provider configurado
- Mic desabilitado quando não há STT disponível

### Interface de Chat Avançada (react-native-gifted-chat)

**Status:** CONCLUÍDO em 17/03/2026

- Markdown rendering (negrito, itálico, listas, títulos, código)
- `isTyping` durante loading
- `renderCustomView` para Cards de Transação / FinancialCard
- Botão "Ouvir Mensagem" + long-press copiar + smart links
- Scroll to bottom + Quick Suggestions + Swipe-to-reply
- Avatar por provider (ícone + cor oficial, mantido no histórico)
- Histórico local (AsyncStorage), contexto IA = só sessão atual
- Replay de áudio gravado, auto-play TTS, TTS sequencial por chunks
- Barra de uso (texto + áudio, custo R$), ProviderSwitchModal
- `useFocusEffect` recarrega settings ao voltar das config

### OCR via Vision AI (Parcial)

**Status:** Parcialmente concluído em 18/03/2026

- [x] VisionOCRService com schemas Zod (Invoice + Payslip)
- [x] Suporte OpenAI Vision, Claude Vision, Gemini Vision, Qwen VL
- [ ] ~~Finalizar motor de leitura de Olerite/Holerite~~ → movido para Fase 5

### Controle e Configurações

**Status:** CONCLUÍDO em 17/03/2026

- Toggle master "Ativar IA", "Modo Voz", "Falar direto"
- Seleção independente de provider texto/áudio
- Budget diário/mensal com billing cycle
- Dashboard de uso + permissões granulares de dados
- CircuitBreaker com reset ao trocar provider

---

## Task 04 — Corrigir e Melhorar APIs de IA

**Status:** CONCLUÍDA em 07/03/2026
**Dificuldade:** MÉDIO | **Tempo:** ~2h
**Detalhes:** [docs/roadmap/04-testar-api-ia.md](../roadmap/04-testar-api-ia.md)

- Corrigidos adapters existentes (Gemini safety, Claude browser-access header, timeout 30s)
- Substituído OpenRouter por DeepSeek (deepseek-chat/reasoner) e Qwen (qwen3.5-flash/plus)
- Atualizado modelos: gpt-5-mini, claude-sonnet-4-6, gemini-2.5-flash/pro
- Armazenamento multi-provider de API keys (chaves independentes por provider)
- Budget mensal com billing cycle configurável (dia 1-28) e rateio diário
- Conversão bidirecional live Tokens / R$ / US$ na tela de config
- Cotação USD/BRL real via 3 APIs (AwesomeAPI, DolarAPI, ExchangeRate-API) com cache 30min
- Fix AbortSignal.timeout para compatibilidade Hermes/RN
- System prompt financeiro brasileiro (estilo "Dinheiro Com Voce")
- Erro real mostrado ao usuário (não engolido silenciosamente)
- Extrair BudgetCostSection para componente isolado (ai-settings 948 → 467 linhas)
- 83 testes AI passando (5 suítes: adapters, intent, profile, toon, secureKey)

---

## Task 05 — Corrigir OCR no Android (Build)

**Status:** CONCLUÍDA em 07/03/2026
**Dificuldade:** MÉDIO | **Tempo:** ~3-4h
**Detalhes:** [docs/roadmap/05-fix-ocr-android.md](../roadmap/05-fix-ocr-android.md)

**Problema:** `react-native-text-recognition` não linkava após build Android ("Module doesn't seem to be linked")

**Solução:** Migrado para `rn-mlkit-ocr` com Expo config plugin nativo

- Removido `react-native-text-recognition` e seu patch
- Instalado `rn-mlkit-ocr` com config plugin (bundled latin model)
- Atualizado `HybridOCRAdapter` para usar `MlkitOcr.detectFromUri()`
- Atualizado provider padrão para `mlkit` em todos os arquivos
- Atualizada tela de configurações OCR
- Atualizada documentação

---

## Task 06 — Corrigir Google Drive no APK

**Status:** CONCLUÍDA em 07/03/2026
**Dificuldade:** MÉDIO-COMPLEXO | **Tempo:** ~4-6h
**Detalhes:** [docs/roadmap/06-fix-google-drive.md](../roadmap/06-fix-google-drive.md)

**Problema:** OAuth retornava "Acesso bloqueado" (app não verificado) + "Erro ao obter token" (faltava client_secret)

**Solução:** Migrado scope de `drive.file` para `drive.appdata` + adicionado `client_secret`

- Migrado scope para `drive.appdata` (sem verificação Google)
- Adicionado `client_secret` no token exchange e refresh
- Configurado `appDataFolder` no upload e busca de arquivos
- Testado OAuth flow completo no APK

---

## Fase 1: Estabilização Crítica (Android 16 Edge-to-Edge)

**Status:** CONCLUÍDA em ~13/03/2026 (commits b86a84f, 4f58988, 6a56aee)

### 1.1 — Correção de Layout Edge-to-Edge
- `SafeAreaProvider` envolvendo toda a app em `app/_layout.tsx`
- `useSafeAreaInsets` em 14+ arquivos (tabs, modais, settings)
- Patch `react-native-keyboard-controller` com `cleanNullChildren()` via reflection
- Proteção contra null-child no `EdgeToEdgeReactViewGroup`
- Montagem condicional de overlays/modais só após splash completar

### 1.2 — Correção do SVG Mask e Scroll com Spotlight
- Arquitetura refatorada: `TourBackdrop` e `useTourTarget` removidos
- Integração com `rn-tourguide` para medição robusta
- Animações com Reanimated padrão (FadeIn/FadeInDown/springify)
- Sem off-screen detector — substituído por arquitetura event-driven

### 1.3 — Proteção de Nulidade no Tour
- `TourPageHost` com try/catch em `measure()`
- Fallback timeout de 1200ms se `canStart` não disparar
- Back button handler com minimize gracioso
- Null checks em `scrollRef?.current?.scrollTo()`

---

## Task 03 — Testar API de OCR

**Status:** CONCLUÍDA (testes existem e fallback chain implementada)

- 6 arquivos de teste em `packages/parsers/__tests__/`: ocrParser, classifier, importInvoice, qrcodeParser, invoiceReducer, sefazParser
- `HybridOCRAdapter` com fallback chain: mlkit → cloudvision
- Confidence threshold ≥ 0.6 com retry automático
- Providers suportados: mlkit (default), tesseract (web), cloudvision (pago)

---

## Task 07 — Melhorar Tour (Balões, Setas, Minimizar)

**Status:** CONCLUÍDA em ~14/03/2026 (commit a99f55c)

- TourArrow (setas SVG entre steps)
- TourMiniBadge (badge flutuante para minimizar/retomar)
- TourGuideTooltip (balões customizados)
- TourPageHost + TourPageContext (contexto por página)
- TourModalCard + TourInlineCard (cards de instrução)
- WelcomeCarousel (onboarding inicial)
- Navegação entre grupos de tour (useTourGroupNavigation)
- **Persistência no AsyncStorage:** grupo, fase, modal, minimize state
- **Restauração completa** ao reiniciar app (lê 6 chaves do AsyncStorage)
- **Navegação automática** para tela correta via `useTourGroupNavigation` (10 grupos de páginas)

---

## Task 02 — Correção do Som em Áreas Sem Áudio

**Status:** CONCLUÍDA em 06/03/2026

- Correção completa de áreas sem feedback sonoro
- Commit: `02 - Correcao do Som em Areas Sem Audio (completo)`
