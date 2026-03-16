# Roadmap OrcaFacil: Sons, Motion e Gamificacao

## Fase 5: Correcoes, Polimento e Novas Features

**Ordem: Mais facil ao mais complexo, priorizando urgencia.**
**Detalhes completos em: `docs/roadmap/`**

### 03 - Testar API de OCR
- **Dificuldade:** FACIL-MEDIO | **Urgencia:** ALTA | **~1h**
- **Problema:** Testes existem mas precisam validacao antes do fix Android
- **Testes:** `packages/parsers/__tests__/` (ocrParser, classifier, importInvoice, qrcodeParser, invoiceReducer)
- **Detalhes:** [docs/roadmap/03-testar-api-ocr.md](docs/roadmap/03-testar-api-ocr.md)
- [ ] Executar suite de testes existente
- [ ] Validar cenarios de parsing (Qtd x Preco, R$ Preco)
- [ ] Verificar fallback chain do HybridOCRAdapter

### 07 - Melhorar Tour (Baloes, Setas, Minimizar)
- **Dificuldade:** COMPLEXO | **Urgencia:** MEDIA | **~8-12h**
- **Problema:** Tour reseta para step 0 ao remontar (parece travado na 1a pagina), bloqueia experimentacao, sem baloes/setas, sem minimizar
- **Bugs:** Estado nao persistido (useState local reseta), backdrop 45% bloqueia visao, sem highlight de elementos
- **Solucao:** 4 fases - Fix bugs (persist state) -> Minimizar/Badge -> Baloes/Setas -> Navegacao inteligente
- **Detalhes:** [docs/roadmap/07-melhorar-tour.md](docs/roadmap/07-melhorar-tour.md)
- [ ] Fix: Persistir step no AsyncStorage + mover estado para context
- [ ] Adicionar botao minimizar + badge flutuante
- [ ] Implementar spotlight mask + setas SVG
- [ ] Navegacao automatica para tela do step

### 08 - Animacao Individual para Cada Trofeu (167 trofeus)
- **Dificuldade:** COMPLEXO | **Urgencia:** BAIXA | **~15-25h (com acompanhamento)**
- **Problema:** Todos os trofeus usam mesma animacao generica. Precisa animacao unica por trofeu
- **Total:** 40 conquistas + 6 mensais + 48 sazonais + 73 liturgicos = 167 trofeus
- **Solucao:** Criar config map por trofeu/categoria com parametros de animacao customizados
- **Detalhes:** [docs/roadmap/08-animacao-trofeus.md](docs/roadmap/08-animacao-trofeus.md) (lista completa de todos os 167 trofeus)
- [ ] Criar `trophyAnimationConfigs.ts` com mapa de configs
- [ ] Refatorar AnimatedTrophy e AnimatedSeasonalTrophy para aceitar config
- [ ] Implementar um a um com aprovacao individual

### 09 - Leitor de Olerite por OCR
- **Dificuldade:** COMPLEXO | **Urgencia:** MEDIA | **~6-10h**
- **Depende de:** Tarefa 05 (OCR Android funcionar)
- **Problema:** Feature nova - capturar valores de medidores via OCR, armazenar historico
- **Solucao:** Novo parser + nova tela + novo tipo de evento + historico com grafico
- **Detalhes:** [docs/roadmap/09-olerite-ocr.md](docs/roadmap/09-olerite-ocr.md)
- [ ] Criar `oleriteParser.ts`
- [ ] Criar tela de captura reutilizando OcrScanScreen
- [ ] Implementar historico com grafico de evolucao
- [ ] Testes unitarios

---

## Ordem de Execucao Recomendada

```
URGENCIA CRITICA (fazer primeiro):
  05 - Fix OCR Android .......... [MEDIO]     ~3-4h

URGENCIA ALTA:
  03 - Testar API OCR ........... [FACIL]     ~1h

URGENCIA MEDIA:
  07 - Melhorar Tour ............ [COMPLEXO]  ~8-12h
  09 - Olerite OCR .............. [COMPLEXO]  ~6-10h

URGENCIA BAIXA (quando houver tempo):
  08 - Animacao Trofeus ......... [COMPLEXO]  ~15-25h
```

*Nota: Antes de cada tarefa, sera realizada uma analise tecnica detalhada com planejamento via Task Master.*

# 🚀 Plano Mestre de Evolução: DOMUS 2.0

Este documento detalha o roteiro estratégico para estabilização técnica, modernização visual e upgrade de experiência do utilizador (UX) do ecossistema DOMUS.

## ⌨️ Fase 2: Eficiência e Entrada de Dados (CONCLUIDA)
*Foco: Melhorar a interação com o teclado e a velocidade de registo de gastos.*

## 🎨 Fase 3: Design System "Premium" (Tamagui & Rive)
*Foco: Transformar a identidade visual e a performance da interface.*

- [ ] **Migração para Tamagui:**
    - Implementar Temas Dinâmicos (Católico/Laico) com suporte nativo a Dark Mode.
    - Substituir `StyleSheet` tradicional por componentes atómicos do Tamagui para renderização ultra-rápida.
- [ ] **Animações Interativas (Troféus):**
    - Integrar `@rive-app/react-native`.
    - Converter os 167 troféus em vetores animados que reagem ao toque e brilham ao ganhar XP.
- [ ] **Listas Ultra-Rápidas (FlashList):**
    - Substituir `FlatList` pelo **FlashList (Shopify)** para garantir scroll de 120Hz constante em ecrãs modernos.

## 🤖 Fase 4: Inteligência e Consultoria Financeira (Arquitetura Multi-IA)
*Foco: Transformar a IA em um consultor financeiro multimodal de nível profissional, com arquitetura desacoplada e OCR baseado em Vision AI.*

- [ ] **Interface de Chat com Gifted Chat:**
    - Bolhas de chat profissionais, suporte a anexos e indicadores de "IA a escrever".
    - Renderização de mini-gráficos financeiros diretamente dentro da conversa.
> **🤖 [MEGA-PROMPT DE IMPLEMENTAÇÃO PARA CLAUDE AI]**
> **Papel:** Atue como Engenheiro de Software Sênior especialista em React Native (Expo) e integração segura de LLMs.
> **Diretrizes Arquiteturais Estritas:**
> 1. **Segurança (BYOK - Bring Your Own Key):** Todas as chaves lidas devem vir localmente do `expo-secure-store`. **Nunca** faça hardcode, logs ou envie chaves para servidores intermediários.
> 2. **Padrão Strategy (Desacoplamento Texto x Áudio):** O usuário pode usar Claude para raciocínio financeiro (Texto) e ElevenLabs para a voz (Áudio). Construa interfaces genéricas (`ITextProvider`, `IAudioProvider`) para que os conectores sejam instanciados de forma agnóstica.
> 3. **Resiliência:** Trate limites de cota (HTTP 429), chaves inválidas (HTTP 401) e timeouts de forma amigável na UI.
> 4. **OCR Determinístico (Vision):** Para leitura de Notas Fiscais e Olerites, use o modelo Vision da IA selecionada. Exija sempre a saída em `JSON format` estrito e valide imediatamente na volta usando a biblioteca `zod`.

- [ ] **Motor Multi-Provedor de IA (Chat & Texto):**
    - Implementar adapters seguindo as documentações oficiais:
    - 🔗 **OpenAI (GPT-4o):** [Documentação Chat Completions](https://platform.openai.com/docs/api-reference/chat)
    - 🔗 **Anthropic (Claude 3.5):** [Documentação Messages API](https://docs.anthropic.com/en/api/messages)
    - 🔗 **DeepSeek (V3/R1):** [Documentação API](https://api-docs.deepseek.com/)
    - 🔗 **Qwen (Alibaba DashScope):** [Documentação Text Generation](https://help.aliyun.com/zh/model-studio/developer-reference/use-qwen-by-calling-api)

- [ ] **Motor Multi-Provedor de Áudio (Text-to-Speech / Voz):**
    - Permitir integração de áudio para leitura e ditado, operando independentemente da IA de texto.
    - 🔗 **OpenAI (TTS):** [Documentação Audio/Speech](https://platform.openai.com/docs/guides/text-to-speech)
    - 🔗 **ElevenLabs:** [Documentação Text-to-Speech](https://elevenlabs.io/docs/api-reference/text-to-speech)
    - 🔗 **Qwen (CosyVoice):** [Documentação Síntese de Áudio](https://help.aliyun.com/zh/model-studio/developer-reference/cosyvoice-quick-start)
    - ⚠️ *Aviso de Domínio: A Anthropic (Claude) não possui API nativa de Text-to-Speech ativa publicamente. Se o usuário estiver usando Claude para Chat, obrigue-o/permita-o selecionar um fallback de áudio (OpenAI ou ElevenLabs) na tela de configurações.*

- [ ] **Interface de Chat Avançada (`react-native-gifted-chat`):**
    - 🔗 **Documentação Oficial:** Repositório GitHub Gifted Chat
    - Criar tela protegida por `KeyboardAvoidingView`.
    - Suportar renderização Markdown via custom message text.
    - Ligar o estado fluído `isTyping={true}` durante o loading da requisição.
    - Interceptar respostas da IA: Utilizar a prop `renderCustomView` para desenhar "Cards de Transação" ou "Mini-Gráficos" caso a IA retorne dados financeiros formatados de forma específica.
    - Inserir botão de "Ouvir Mensagem 🔊" adjacente às bolhas de resposta para disparar o `IAudioProvider` configurado.

- [ ] **Upgrade Definitivo de OCR via Inteligência Artificial Multimodal (Vision):**
    - Substituir o processamento falho de strings por visão computacional inteligente. Capturar o olerite/fatura como Base64 e enviar para a IA resolver e mapear em categorias.
    - 🔗 **OpenAI Vision:** [Guia Vision API](https://platform.openai.com/docs/guides/vision)
    - 🔗 **Claude Vision:** [Guia de Construção com Imagens (Vision)](https://docs.anthropic.com/en/docs/build-with-claude/vision)
    - 🔗 **Qwen VL:** [Guia Vision-Language](https://help.aliyun.com/zh/model-studio/developer-reference/qwen-vl-api)
    - *Instrução para a IA:* O system prompt do OCR deve impor: "Analise esta imagem de folha de pagamento/nota fiscal. Extraia o valor líquido, descontos, CNPJ da empresa, etc., e retorne ESTRITAMENTE em formato JSON sem blocos de markdown. Não inclua conversas ou saudações."

- [ ] **Tooltips Inteligentes:**
    - Implementar `react-native-smart-tooltip` para dicas contextuais (ex: explicar a regra 50/30/20 na primeira vez que o utilizador vê o gráfico).
    - Integrar `react-native-sprinkle-toast` (Documentação Oficial) para feedbacks rápidos e visuais ao enviar mensagens, capturar erros ou salvar análises de OCR no banco de dados.
- [ ] **Upgrade de OCR:**
    - Finalizar o motor de leitura de Olerite/Holerite para automação total de receitas mensais.

---

## 📦 Checklist de Novas Dependências (Para Instalar)

```bash
# UI & Performance
yarn add tamagui @rive-app/react-native @shopify/flash-list @bsky.app/expo-scroll-edge-effect

# Tour & Overlay (SVG Mask já implementado — só validar safe-area-context)
yarn add react-native-safe-area-context

# UX & Chat
yarn add react-native-gifted-chat react-native-circular-action-menu react-native-smart-tooltip react-native-sprinkle-toast
```

### Referências das Bibliotecas

| Biblioteca | Fase | Expo Managed | Docs |
|---|---|:---:|---|
| `react-native-safe-area-context` | 1.1 | ✅ | [reactnative.directory](https://reactnative.directory/package/react-native-safe-area-context) |
| `rn-tourguide` | ~~1.2~~ incompatível | ❌ | [reactnative.directory](https://reactnative.directory/package/rn-tourguide) |
| `react-native-spotlight-tour` | ~~1.2~~ incompatível | ❌ | [reactnative.directory](https://reactnative.directory/package/react-native-spotlight-tour) |
| `react-native-masked-animated-view` | ~~1.2~~ incompatível | ❓ | [reactnative.directory](https://reactnative.directory/package/react-native-masked-animated-view) |
| `@bsky.app/expo-scroll-edge-effect` | 3 | ✅ | [reactnative.directory](https://reactnative.directory/package/@bsky.app/expo-scroll-edge-effect) |
| `react-native-smart-tooltip` | 4 | ✅ | [reactnative.directory](https://reactnative.directory/package/react-native-smart-tooltip) |
| `react-native-sprinkle-toast` | 4 | ✅ | [reactnative.directory](https://reactnative.directory/package/react-native-sprinkle-toast) |
| `@rive-app/react-native` | 3 | ✅ | [reactnative.directory](https://reactnative.directory/package/@rive-app/react-native) |
| `react-native-gifted-chat` | 4 | ✅ | [github.com](https://github.com/FaridSafi/react-native-gifted-chat) |
| `react-native-circular-action-menu` | 2 | ❓ | [github.com](https://github.com/geremih/react-native-circular-action-menu) |

Termninados
## 🤖 Fase 4: Inteligência e Consultoria Financeira (Arquitetura Multi-IA)
*Foco: Transformar a IA em um consultor financeiro multimodal de nível profissional, com arquitetura desacoplada e OCR baseado em Vision AI.*

- [ ] **Interface de Chat com Gifted Chat:**
    - Bolhas de chat profissionais, suporte a anexos e indicadores de "IA a escrever".
    - Renderização de mini-gráficos financeiros diretamente dentro da conversa.
> **🤖 [MEGA-PROMPT DE IMPLEMENTAÇÃO PARA CLAUDE AI]**
> **Papel:** Atue como Engenheiro de Software Sênior especialista em React Native (Expo) e integração segura de LLMs.
> **Diretrizes Arquiteturais Estritas:**
> 1. **Segurança (BYOK - Bring Your Own Key):** Todas as chaves lidas devem vir localmente do `expo-secure-store`. **Nunca** faça hardcode, logs ou envie chaves para servidores intermediários.
> 2. **Padrão Strategy (Desacoplamento Texto x Áudio):** O usuário pode usar Claude para raciocínio financeiro (Texto) e ElevenLabs para a voz (Áudio). Construa interfaces genéricas (`ITextProvider`, `IAudioProvider`) para que os conectores sejam instanciados de forma agnóstica.
> 3. **Resiliência:** Trate limites de cota (HTTP 429), chaves inválidas (HTTP 401) e timeouts de forma amigável na UI.
> 4. **OCR Determinístico (Vision):** Para leitura de Notas Fiscais e Olerites, use o modelo Vision da IA selecionada. Exija sempre a saída em `JSON format` estrito e valide imediatamente na volta usando a biblioteca `zod`.

- [ ] **Motor Multi-Provedor de IA (Chat & Texto):**
    - Implementar adapters seguindo as documentações oficiais:
    - 🔗 **OpenAI (GPT-4o):** [Documentação Chat Completions](https://platform.openai.com/docs/api-reference/chat)
    - 🔗 **Anthropic (Claude 3.5):** [Documentação Messages API](https://docs.anthropic.com/en/api/messages)
    - 🔗 **DeepSeek (V3/R1):** [Documentação API](https://api-docs.deepseek.com/)
    - 🔗 **Qwen (Alibaba DashScope):** [Documentação Text Generation](https://help.aliyun.com/zh/model-studio/developer-reference/use-qwen-by-calling-api)

- [ ] **Motor Multi-Provedor de Áudio (Text-to-Speech / Voz):**
    - Permitir integração de áudio para leitura e ditado, operando independentemente da IA de texto.
    - 🔗 **OpenAI (TTS):** [Documentação Audio/Speech](https://platform.openai.com/docs/guides/text-to-speech)
    - 🔗 **ElevenLabs:** [Documentação Text-to-Speech](https://elevenlabs.io/docs/api-reference/text-to-speech)
    - 🔗 **Qwen (CosyVoice):** [Documentação Síntese de Áudio](https://help.aliyun.com/zh/model-studio/developer-reference/cosyvoice-quick-start)
    - ⚠️ *Aviso de Domínio: A Anthropic (Claude) não possui API nativa de Text-to-Speech ativa publicamente. Se o usuário estiver usando Claude para Chat, obrigue-o/permita-o selecionar um fallback de áudio (OpenAI ou ElevenLabs) na tela de configurações.*

- [ ] **Interface de Chat Avançada (`react-native-gifted-chat`):**
    - 🔗 **Documentação Oficial:** Repositório GitHub Gifted Chat
    - Criar tela protegida por `KeyboardAvoidingView`.
    - Suportar renderização Markdown via custom message text.
    - Ligar o estado fluído `isTyping={true}` durante o loading da requisição.
    - Interceptar respostas da IA: Utilizar a prop `renderCustomView` para desenhar "Cards de Transação" ou "Mini-Gráficos" caso a IA retorne dados financeiros formatados de forma específica.
    - Inserir botão de "Ouvir Mensagem 🔊" adjacente às bolhas de resposta para disparar o `IAudioProvider` configurado.

- [ ] **Upgrade Definitivo de OCR via Inteligência Artificial Multimodal (Vision):**
    - Substituir o processamento falho de strings por visão computacional inteligente. Capturar o olerite/fatura como Base64 e enviar para a IA resolver e mapear em categorias.
    - 🔗 **OpenAI Vision:** [Guia Vision API](https://platform.openai.com/docs/guides/vision)
    - 🔗 **Claude Vision:** [Guia de Construção com Imagens (Vision)](https://docs.anthropic.com/en/docs/build-with-claude/vision)
    - 🔗 **Qwen VL:** [Guia Vision-Language](https://help.aliyun.com/zh/model-studio/developer-reference/qwen-vl-api)
    - *Instrução para a IA:* O system prompt do OCR deve impor: "Analise esta imagem de folha de pagamento/nota fiscal. Extraia o valor líquido, descontos, CNPJ da empresa, etc., e retorne ESTRITAMENTE em formato JSON sem blocos de markdown. Não inclua conversas ou saudações."

- [ ] **Tooltips Inteligentes:**
    - Implementar `react-native-smart-tooltip` para dicas contextuais (ex: explicar a regra 50/30/20 na primeira vez que o utilizador vê o gráfico).
    - Integrar `react-native-sprinkle-toast` (Documentação Oficial) para feedbacks rápidos e visuais ao enviar mensagens, capturar erros ou salvar análises de OCR no banco de dados.
- [ ] **Upgrade de OCR:**
    - Finalizar o motor de leitura de Olerite/Holerite para automação total de receitas mensais.

### 04 - Corrigir e Melhorar APIs de IA (CONCLUIDA)
- **Dificuldade:** MEDIO | **Urgencia:** MEDIA | **~2h**
- **Problema:** Adapters com bugs, OpenRouter substituido, faltava budget mensal e cotacao real do dolar
- **Solucao:** Corrigidos adapters, adicionados DeepSeek + Qwen, budget mensal com billing cycle, conversao bidirecional Tokens/R$/US$, cotacao USD/BRL via 3 APIs com fallback
- **Detalhes:** [docs/roadmap/04-testar-api-ia.md](docs/roadmap/04-testar-api-ia.md)
- [x] Corrigir adapters existentes (Gemini safety, Claude browser-access header, timeout 30s)
- [x] Substituir OpenRouter por DeepSeek (deepseek-chat/reasoner) e Qwen (qwen3.5-flash/plus)
- [x] Atualizar modelos: gpt-5-mini, claude-sonnet-4-6, gemini-2.5-flash/pro
- [x] Armazenamento multi-provider de API keys (chaves independentes por provider)
- [x] Budget mensal com billing cycle configuravel (dia 1-28) e rateio diario
- [x] Conversao bidirecional live Tokens / R$ / US$ na tela de config
- [x] Cotacao USD/BRL real via 3 APIs (AwesomeAPI, DolarAPI, ExchangeRate-API) com cache 30min
- [x] Fix AbortSignal.timeout para compatibilidade Hermes/RN
- [x] System prompt financeiro brasileiro (estilo "Dinheiro Com Voce")
- [x] Erro real mostrado ao usuario (nao engolido silenciosamente)
- [x] Extrair BudgetCostSection para componente isolado (ai-settings 948 -> 467 linhas)
- [x] 83 testes AI passando (5 suites: adapters, intent, profile, toon, secureKey)

### 05 - Corrigir OCR no Android (Build) - CONCLUIDA
- **Dificuldade:** MEDIO | **Urgencia:** CRITICA | **~3-4h**
- **Problema:** `react-native-text-recognition` nao linka apos build Android. Erro: "Module doesn't seem to be linked"
- **Solucao:** Migrado de `react-native-text-recognition` para `rn-mlkit-ocr` com Expo config plugin nativo
- **Detalhes:** [docs/roadmap/05-fix-ocr-android.md](docs/roadmap/05-fix-ocr-android.md)
- [x] Remover `react-native-text-recognition` e seu patch
- [x] Instalar `rn-mlkit-ocr` com config plugin (bundled latin model)
- [x] Atualizar `HybridOCRAdapter` para usar `MlkitOcr.detectFromUri()`
- [x] Atualizar provider padrao para `mlkit` em todos os arquivos
- [x] Atualizar tela de configuracoes OCR
- [x] Atualizar documentacao

### 06 - Corrigir Google Drive no APK (CONCLUIDA)
- **Dificuldade:** MEDIO-COMPLEXO | **Urgencia:** CRITICA | **~4-6h**
- **Problema:** OAuth retornava "Acesso bloqueado" (app nao verificado) + "Erro ao obter token" (faltava client_secret)
- **Solucao:** Migrado scope de `drive.file` para `drive.appdata` (nao exige verificacao Google), adicionado `client_secret` na troca de auth code e refresh token, configurado `appDataFolder` para operacoes do Drive
- **Detalhes:** [docs/roadmap/06-fix-google-drive.md](docs/roadmap/06-fix-google-drive.md)
- [x] Migrar scope para `drive.appdata` (sem verificacao)
- [x] Adicionar `client_secret` no token exchange e refresh
- [x] Configurar `appDataFolder` no upload e busca de arquivos
- [x] Testar OAuth flow completo no APK

### Fase 2 - Eficiência e Entrada de Dados (CONCLUIDA)
- [x] **Otimização de Teclado:**
    - ~~KeyboardAvoidingView nativo~~ Substituído por `react-native-avoid-softinput` (solução nativa global).
    - `AvoidSoftInput.setEnabled(true)` no `_layout.tsx` — funciona em todos os TextInput automaticamente.
    - Chat da IA usa `KeyboardProvider` local do `react-native-keyboard-controller` (isolado).
- [x] **Menu de Ações Circular (Speed Dial):**
    - FAB "+" reescrito com Reanimated — arco de 1/4 de círculo (180°→270°) centralizado.
    - 6 ações com paginação (3+3, botão rotacionar):
        - Página 1: 📄 Cadastro Manual, 🎁 Wishlist (selecionar lista + add item), 📸 NF/OCR
        - Página 2: 🤖 Chat IA, 🎙️ Comando de Voz, 💸 Transferência (modal com aba pré-selecionada)
    - Chat IA e Voz ocultos se IA desabilitada. Wishlist oculto se sem listas.
    - Backdrop semi-transparente, animação spring, sons e haptics.
- [x] **Excluir Lista de Desejos:**
    - Botão lixeira no header da tela de detalhe da lista.
    - Modal customizado de confirmação (`ConfirmDeleteModal`) com som de exclusão só na confirmação.
    - Remove lista e todos os itens associados.
- [x] **Fix UI Wishlist:**
    - Título "Lista de Desejos" com padding superior e lateral corrigidos.


---

## 🛠 Fase 1: Estabilização Crítica (Urgente)
*Foco: Eliminar o erro "Something went wrong" e os crashes de layout no Android 16 (Samsung S23+).*

**Contexto do Problema:**
O Android 16 (API 36) adotou Edge-to-Edge obrigatório por padrão. O sistema agora injeta `EdgeToEdgeReactViewGroup` na hierarquia de views, e qualquer componente que não respeite as `WindowInsets` causa o erro `null child` — um crash de layout silencioso que resulta na tela "Something went wrong". O Samsung S23+ foi o primeiro vetor de reporte por usar One UI 7 (baseado em Android 16 beta).

---

### 1.1 — Correção de Layout Edge-to-Edge
- **Dificuldade:** MÉDIO | **Urgência:** CRÍTICA | **~3-5h**
- **Raiz do Problema:** Componentes de layout base (`_layout.tsx`, `ScrollView`, modais) assumem que a área utilizável começa em `y=0`, ignorando a status bar e a navigation bar dinâmica do Android 16.
- **Arquivos Afetados:**
    - `app/_layout.tsx` — layout raiz (deve envolver tudo em `SafeAreaProvider`)
    - `app/(tabs)/_layout.tsx` — layout das abas
    - Todos os modais em `src/components/shared/` que usam `View` como container raiz
- **Solução Técnica:**
    - [ ] Instalar/verificar `react-native-safe-area-context` (já deve estar no projeto via Expo, confirmar versão >= 4.10)
    - [ ] Envolver o `_layout.tsx` raiz com `<SafeAreaProvider>`
    - [ ] Substituir `View` container por `<SafeAreaView edges={['top','bottom']}>` nos modais críticos
    - [ ] Usar o hook `useSafeAreaInsets()` nos componentes que precisam de padding dinâmico em vez de valores fixos hardcoded
    - [ ] Adicionar `android:windowSoftInputMode="adjustResize"` no `AndroidManifest.xml` se ainda não estiver presente
    - [ ] Testar em emulador Android API 35+ e no dispositivo físico Samsung S23+

---

### 1.2 — Correção do SVG Mask (renderização incorreta) e Scroll com Spotlight
- **Dificuldade:** MÉDIO-COMPLEXO | **Urgência:** ALTA | **~4-6h**
- **Arquitetura atual do tour** (não substituir por lib externa — incompatível):
    - `src/tour/tourStepConfig.ts` — 22 steps com `targetId`, `route`, `arrowDirection`
    - `src/tour/useTourTarget.tsx` — hook central: mede com `measureInWindow`, scroll automático, detector off-screen
    - `src/components/tour/TourBackdrop.tsx` — SVG Mask com spotlight (`react-native-svg`)
    - `src/tour/TourControlContext.tsx` — contexto com `setSpotlightRect`, navegação e minimizar

#### Bug A — SVG Mask renderiza na posição errada
- **Causa:** O `measureInWindow` tem delay fixo de `500ms` (`SPOTLIGHT_MEASURE_DELAY_MS`). Após navegação entre telas via `useTourNavigation`, o elemento pode não ter terminado de montar quando a medição dispara, retornando coordenadas `(0, 0, 0, 0)` ou as do step anterior.
- **Causa secundária:** `CARD_CLEARANCE = 400` hardcoded no `TourBackdrop.tsx` — o spotlight "extende" 400px para baixo independente do tamanho real do `TourInlineCard`, cortando mal em telas pequenas ou quando o card ainda não renderizou.
- **Fixes:**
    - [ ] Em `useTourTarget.tsx`: trocar o `setTimeout` fixo por retry com `requestAnimationFrame` (até 3 tentativas) — medir só quando `w > 0 && h > 0`
    - [ ] Em `TourBackdrop.tsx`: receber a altura real do card via prop (`cardHeight`) em vez de usar `CARD_CLEARANCE = 400` fixo; usar `onLayout` no `TourInlineCard` para medir e passar para cima

#### Bug B — Tour trava/minimiza sozinho durante scroll
- **Causa:** O detector off-screen em `useTourTarget.tsx` executa `setInterval` a cada `1500ms` e chama `handleMinimize()` se o card sair da viewport. Durante o scroll automático (`scrollTo` com `animated: true`), o card fica momentaneamente fora da tela — o detector dispara e minimiza o tour antes do scroll terminar.
- **Causa secundária:** `measureLayout` para rolar até o elemento usa `scrollViewRef.current as any` — se o `ScrollView` ainda não terminou de montar após a navegação (600ms de delay pode não ser suficiente em dispositivos lentos), falha silenciosamente e o elemento-alvo fica fora da tela, disparando o off-screen detector.
- **Fixes:**
    - [ ] Em `useTourTarget.tsx`: pausar o off-screen detector (`clearInterval`) durante o período de scroll — reativá-lo só após `SCROLL_TO_TARGET_DELAY_MS + 800ms`
    - [ ] Antes de chamar `measureLayout`, verificar `scrollViewRef.current !== null` e adicionar retry se retornar `y === 0 && height === 0`
    - [ ] Aumentar tolerância do off-screen: só minimizar após **2 leituras consecutivas** fora da tela (evitar falso positivo durante scroll animado)

#### Bug C — `FadeOut` do backdrop causa crash no Android 16
- **Causa:** O `Animated.View` em `TourBackdrop.tsx` usa `exiting={FadeOut.duration(150)}`. No Android 16, se o componente desmontar enquanto a animação de saída ainda roda, o Reanimated tenta acessar uma view nativa já destruída → crash JNI `obj == null`.
- **Fix:**
    - [ ] Em `TourBackdrop.tsx`: substituir `entering={FadeIn}` / `exiting={FadeOut}` por animação manual com `useSharedValue(0)` + `useAnimatedStyle` + `withTiming` — controlar o desmonte via estado interno em vez de deixar o Reanimated gerenciar o ciclo de vida

---

### 1.3 — Proteção de Nulidade no Tour
- **Dificuldade:** FÁCIL | **Urgência:** ALTA | **~1h**
- **Raiz do Problema:** O `TourOverlay` tenta medir e desenhar sobre elementos que podem ter sido desmontados da árvore (ex: navegação entre telas durante o tour). O `measure()` de uma `ref` para um elemento desmontado retorna `null` ou lança exceção, causando crash silencioso.
- **Arquivos Afetados:** `src/components/tour/TourOverlay.tsx`
- **Solução Técnica:**
    - [ ] Adicionar guard no início do render: `if (!isVisible || !targetRef?.current) return null;`
    - [ ] Envolver a chamada `targetRef.current.measure(...)` em `try/catch`
    - [ ] No callback do `measure`, verificar se os valores retornados são válidos: `if (!width || !height) return;`
    - [ ] Adicionar listener de `beforeRemove` na navegação para pausar/cancelar o tour quando o usuário navega manualmente
    - [ ] Garantir que `stopTour()` seja chamado no `useEffect` cleanup do componente hospedeiro do tour

---

### Critérios de Conclusão da Fase 1
- [ ] App abre sem crash em Samsung S23+ (Android 16) após 10 sessões consecutivas de teste
- [ ] O tour completo (22 steps) executa sem flickering, trava ou minimização indevida no mesmo dispositivo
- [ ] Nenhum erro `null child` ou `EdgeToEdgeReactViewGroup` nos logs do Metro/Logcat
- [ ] Screenshot comparativo (antes/depois) com as insets corretas nas telas principais