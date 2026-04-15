# DOMUS — Diário de Desenvolvimento

> Registro cronológico de todas as entregas do projeto, com datas extraídas do histórico Git.

---

## v1.6.0 — 18 de Março de 2026

**NCM Categories + AI Vision OCR + SOLID Refactor**

| Data | Commit |
|------|--------|
| 18/03 | `release: v1.6.0` |
| 18/03 | `feat(parsers, ui): centralize category helpers and hints` |
| 18/03 | `feat(ai-chat): add Vision OCR for invoices and payslips` |
| 17/03 | `feat(ai): Track and display AI token usage` |
| 17/03 | `feat(item-groups): add display and override for item groups` |
| 17/03 | `feat(ai-classify): add multi-provider item classification` |
| 17/03 | `feat(components): introduce ProductFormCard` |
| 17/03 | `feat: Add category selection for items` |
| 17/03 | `feat(classification): implement granular NCM and EAN classification` |

**Destaques:**
- Vision OCR para faturas e holerites via OpenAI, Claude, Gemini e Qwen
- Classificação granular NCM/EAN com múltiplos providers de IA
- Rastreamento e exibição de uso de tokens/custos
- Grupos de itens (Necessidade/Desejo/Poupança) com override manual
- Centralização de helpers de categorias e hints

---

## v1.5.0 — 17 de Março de 2026

**Multi-IA completa (Chat/TTS/STT/Vision) + Code Cleanup**

| Data | Commit |
|------|--------|
| 17/03 | `release: v1.5.0` |
| 17/03 | `docs: update AI features and Tour roadmap` |
| 16/03 | `feat: adicionar suporte ao ElevenLabs e otimizar conversão de áudio para base64` |
| 16/03 | `feat: adicionar suporte ao ElevenLabs para transcrição de áudio (Scribe v1)` |
| 16/03 | `feat: rastreamento e cálculo de custos de caracteres TTS por provedor` |
| 16/03 | `feat: melhorar cálculo de uso e exibição de tokens no AIUsageBar` |
| 16/03 | `feat: recarregamento de configurações e melhorias na interface de uso de IA` |
| 16/03 | `feat: novos avatares de provedor e otimizar seleção de vozes TTS` |
| 16/03 | `feat: melhorar detecção de problemas de provedor com mensagens adicionais` |

**Destaques:**
- ElevenLabs integrado (TTS com 21 vozes + STT Scribe v1)
- Rastreamento de custos TTS por caracteres
- Avatares por provider no chat
- Barra de uso melhorada com conversão Tokens/R$/US$
- Recarregamento automático de config ao voltar da tela de settings

---

## v1.4.0 — 16 de Março de 2026

**Multi-IA Audio/Vision/Chat (Fase 4)**

| Data | Commit |
|------|--------|
| 16/03 | `release: v1.4.0` |
| 16/03 | `feat: add auto-play TTS feature and Gemini TTS model selection` |
| 16/03 | `feat: Implement Vision OCR Service for document processing` |
| 15/03 | `feat: atualizar roadmap e otimizar estilo da lista de desejos` |
| 15/03 | `feat: modal de confirmação para exclusão de listas na wishlist` |
| 15/03 | `feat: refatorar cálculo de posições dos itens no HomeFab` |
| 15/03 | `feat: atualizar sons de interação na wishlist` |
| 15/03 | `feat: exclusão de listas no wishlist com eventos e manipulação de estado` |
| 15/03 | `feat: react-native-gifted-chat + react-native-avoid-softinput` |

**Destaques:**
- Auto-play TTS + seleção de modelo Gemini TTS
- VisionOCRService com schemas Zod (Invoice + Payslip)
- Exclusão de listas de desejos com modal de confirmação
- Speed Dial (FAB) com cálculo de posições refatorado
- GiftedChat integrado + avoid-softinput

---

## v1.3.0 — 15 de Março de 2026

**GiftedChat + keyboard fix**

| Data | Commit |
|------|--------|
| 15/03 | `release: v1.3.0` |
| 15/03 | `feat: substituir KeyboardAvoidingView por react-native-avoid-softinput` |
| 15/03 | `feat: KeyboardAwareScrollView e KeyboardSafeView em vários componentes` |
| 15/03 | `feat(chat): integrar react-native-gifted-chat e refatorar componentes de chat` |

**Destaques:**
- Migração para react-native-gifted-chat
- Substituição de KeyboardAvoidingView por solução nativa global (avoid-softinput)
- KeyboardSafeView reutilizável

---

## v1.2.0 — 12 de Março de 2026

**Monetização + Tour + Estabilização Android 16**

| Data | Commit |
|------|--------|
| 14/03 | `release: v1.2.13 — bump version + fix CI disk space` |
| 14/03 | `feat(tour): atualizar lógica de navegação e botão anterior` |
| 14/03 | `feat(tour): TourGuideTooltip, scroll automático, IDs atualizados` |
| 13/03 | `feat: correções de layout e estabilidade para Android 16` |
| 12/03 | `feat: roadmap detalhado para evolução do DOMUS 2.0` |
| 12/03 | `feat(monetization): centralize support mode selector` |
| 12/03 | `fix(tour): SVG spotlight + eliminar null-child crash no Android 16` |
| 12/03 | `feat: welcome carousel to demo mode + analytics service` |

**Destaques:**
- Tour guiado com SVG spotlight, setas, badges, navegação por grupos
- WelcomeCarousel (onboarding)
- Correções de crash Android 16 (EdgeToEdgeReactViewGroup)
- Monetização centralizada (support mode selector)

---

## v1.1.0 — 9 de Março de 2026

**Firebase + Tour + Estabilização Samsung S23+**

| Data | Commit |
|------|--------|
| 11/03 | `feat: voice mode (OpenAI Whisper + Gemini multimodal)` |
| 11/03 | `feat: wishlist kit/bundle, busca inteligente por loja` |
| 10/03 | `ci: publicar APK release no GitHub Releases automaticamente` |
| 09/03 | `feat: Firebase Crashlytics with user consent + fix tour crash Samsung S23+` |
| 09/03 | `fix: refactor tour fixes, ScrollView on IdleScreen, bump v1.1.0` |
| 09/03 | `feat: notificações locais, Firebase Analytics & Performance com consentimento` |
| 08/03 | `fix: crash Samsung Galaxy S24 no keyboard-controller` |
| 08/03 | `feat: workflow de deploy web + docs Play Store` |

**Destaques:**
- Firebase Crashlytics, Analytics e Performance com consentimento
- Notificações locais
- Voice mode (OpenAI Whisper + Gemini multimodal STT)
- Wishlist com kit/bundle e busca por loja
- CI: APK publicado automaticamente no GitHub Releases
- Fix crashes Samsung S23+/S24 (tour, keyboard-controller)

---

## v1.0.0 — 7 de Março de 2026

**Motor Multi-IA + OCR + Google Drive + Budget**

| Data | Commit |
|------|--------|
| 07/03 | `feat: replace OpenRouter with DeepSeek/Qwen, monthly budget, USD/BRL conversion` |
| 07/03 | `feat(ai): per-provider token limits, themed usage bar` |
| 07/03 | `feat(ai): fix adapters, add OpenRouter, multi-key storage, permissions` |
| 07/03 | `feat: fix Google Drive OAuth, refactor OCR parser fields` |
| 07/03 | `feat: add sound feedback to AI settings and budget controls` |
| 07/03 | `feat: configurable token budget, cost estimation in BRL` |
| 07/03 | `feat: unlimited budget mode with toggle switch` |
| 07/03 | `feat: Adiciona tour guiado interativo e tela de chat com IA` |
| 06/03 | `02 - Correção do Som em Áreas Sem Áudio (completo)` |
| 03/03 | `feat: backup automático no Google Drive (OAuth + Drive API)` |
| 02/03 | `feat: módulo wishlist completo com atualização automática de preços` |

**Destaques:**
- 5 providers de IA: OpenAI, Gemini, Claude, DeepSeek, Qwen
- Budget diário/mensal com billing cycle e cotação USD/BRL em tempo real
- Fix OCR Android (migração para rn-mlkit-ocr)
- Fix Google Drive OAuth (scope drive.appdata + client_secret)
- Backup automático Google Drive
- Módulo Wishlist completo
- Correção de som em áreas sem áudio
- Tour guiado interativo + chat com IA

---

## v0.x — Fevereiro de 2026

**Fundação do Projeto**

| Data | Commit |
|------|--------|
| 26/02 | `fix: OCR usa Tesseract.js (única biblioteca compatível com Expo)` |
| 26/02 | `refactor(ocr): change default provider to Tesseract` |
| 14/02 | `feat: Add five new domain packages (gamification, personality, onboarding)` |
| 14/02 | `feat: Add invoice parsing and classification capabilities` |
| 14/02 | `feat: Add local event storage using SQLite` |
| 12/02 | `feat: Add invoice parsing and classification features` |
| 12/02 | `feat: Implement P2P synchronization with event sourcing` |
| 12/02 | `feat: Implement core financial logic and add unit tests` |
| 11/02 | `Initial commit` |

**Destaques:**
- Setup inicial do monorepo
- Lógica financeira core + testes unitários
- Sincronização P2P com event sourcing
- Parsing de notas fiscais e classificação
- SQLite para armazenamento local de eventos
- Gamificação, personalidade, onboarding
- OCR inicial com Tesseract.js
