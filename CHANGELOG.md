# Changelog

Todas as mudanças notáveis neste projeto seguem o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [Não lançado]

> Nota: as versões 1.3.0–1.8.0 foram lançadas sem entrada neste arquivo (o histórico
> parcial está em `docs/history/CHANGELOG.md` até a 1.6.0). Este changelog volta a ser
> mantido a partir daqui.

### Corrigido
- **Grupo 50/30/20 de itens importados de nota fiscal**: itens com categorias constantes
  (ex.: `alimentacao`) eram todos contados como "Desejo" porque a categoria não existia no
  estado de domínio. Agora a importação emite `CATEGORY_CREATED` para categorias ausentes e
  `calculate503020` usa um mapa de grupos padrão como fallback (`DEFAULT_CATEGORY_GROUPS`).
- **Override de grupo (Necessidade/Desejo) por produto não persistia**: `subcategoryId` e
  `groupOverride` eram descartados ao salvar (importação de nota e lançamento manual) e
  ignorados no cálculo 50/30/20. Agora são persistidos no evento, restaurados na edição e
  respeitados em `calculate503020`, na tela de detalhe por grupo e no detalhe da transação.
- **Toggle Necessidade↔Desejo sempre disponível**: o usuário pode corrigir o grupo de
  qualquer produto (ex.: salgadinho classificado como alimento/necessidade → desejo), sem
  depender da flag `allowGroupOverride` da subcategoria NCM.
- Classificador emitia categoria `compras`/`restaurantes` que não existia na lista de
  categorias da importação (exibia "Outros") — IDs adicionados a `CATEGORY_OPTIONS`.
- **Google Drive (login Google)**: erro `DEVELOPER_ERROR` no Android agora mostra mensagem
  acionável (SHA-1/package não registrados no Google Cloud Console); ausência do
  `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` no build é detectada com mensagem clara; conexão via
  web (implicit flow) não "desaparecia" mais ao recarregar; botão "Sincronizar agora" não
  falha mais em silêncio quando o auto-backup ainda não foi gerado; texto corrigido (o
  backup fica na área privada do app no Drive, não em "Meu Drive").
- Chaves duplicadas em objetos: `sorvete` em `keywordMap.ts` e `bundleSearchBtn` em
  `AddItemModal.tsx`.
- **Classificação por IA na importação de notas nunca ativava**: `import-invoice.tsx`
  lia `aiSettings.enabled` (campo inexistente — o correto é `isEnabled`), então o
  pipeline de IA ficava sempre desligado nessa tela.
- **Parser SEFAZ**: a regex numérica podia capturar apenas o "." de "Qtde."/"Vl. Unit.",
  zerando quantidade/preço e descartando itens; agora exige ao menos um dígito.
  Suporte a datas em formato ISO (usado por alguns estados).
- **Suíte de testes 100% verde (590 testes/35 arquivos)**: atualizados testes
  desatualizados de gamificação/integração (valores de XP rebalanceados no código),
  dos adapters de IA (mensagens de erro amigáveis) e do parser SEFAZ (API atual);
  removido teste órfão `importInvoice.test.ts` (módulo inexistente); `assertOk`
  tolera `headers` indefinido em fetch mockado/polyfill.
- Metadados de backup gravavam `APP_VERSION = "1.0.0"` fixo — agora usa a versão do
  `package.json`.
- README descrevia o app como "religioso/espiritual" — corrigido para finanças pessoais.

### Alterado (IA — modelos validados em 15/07/2026)
- **Modelos por provedor atualizados** (`AI_MODELS`): OpenAI `gpt-5.6-luna`/`gpt-5.6-terra`
  (família GPT-5.6, GA 09/07/2026); Gemini `gemini-3.1-flash-lite`/`gemini-3.5-flash`;
  Claude `claude-haiku-4-5`/`claude-sonnet-5`; DeepSeek `deepseek-v4-flash`/`deepseek-v4-pro`
  (**os antigos `deepseek-chat`/`deepseek-reasoner` serão descontinuados em 24/07/2026**);
  Qwen mantém aliases `-latest`. Visão (OCR) e tabela de preços por token atualizadas.
- **Classificador NCM por IA**: o padrão Gemini era `gemini-2.0-flash`, desligado pelo
  Google em 01/06/2026 (classificação via Gemini estava quebrada) — atualizado para
  `gemini-3.1-flash-lite`; DeepSeek/Qwen/OpenAI do classificador também atualizados.
- **ClaudeAdapter**: omite `temperature` em modelos que rejeitam sampling params
  (Sonnet 5, Opus 4.7+), evitando erro 400.

### Removido
- **Login "ChatGPT OAuth"**: o fluxo reutilizava o client_id do Codex CLI contra
  `chatgpt.com/backend-api` (violação provável de ToS) e parou de funcionar.
  OpenAI agora autentica exclusivamente por API key (token), como os demais provedores.

### Documentação
- `.env.example`: documenta `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET`, o passo a passo de SHA-1
  (EAS keystore + Play App Signing) e a necessidade de configurar as variáveis no EAS;
  removidas variáveis não usadas (`ANDROID_CLIENT_ID`/`IOS_CLIENT_ID`).
- `docs/roadmap/06-fix-google-drive.md`: reescrito para o fluxo atual
  (@react-native-google-signin) com checklist de correção do login no Android.

---

## [1.2.0] - 2026-03-12

### Adicionado
- **Apoio & Anúncios**: nova seção dedicada na tela Sobre com seletor de modo de suporte centralizado
- **SupportModeSelector**: componente compartilhado entre WelcomeCarousel (slide 4) e tela Sobre — elimina duplicação de código
- **AffiliateLinks**: constantes de URLs afiliados (Amazon, Mercado Livre, Ko-fi) e chave Pix centralizadas
- **useSupportModes**: hook extraído com lógica de toggle/persistência de modos de suporte
- Opções de apoio disponíveis: Links na Lista, Banner de Afiliados, Intersticial Diário, Anúncio Nativo, Abertura do App

### Corrigido
- Carrossel de boas-vindas desaparecendo após Metro hot-reload: `TOUR_SHOWN_KEY` agora só é gravado ao **concluir** o carrossel, não ao iniciá-lo
- `SupportBanner` bloqueando o botão FAB (+): banner reposicionado abaixo do tab bar (`bottom: 0, elevation: 0`) com rendering antes do navigator para z-ordering correto
- Tour crashando ao finalizar (useTourTarget): imports ausentes e refs não declaradas corrigidos
- Botões duplicados "Reconfigurar Apoio" e "Refazer Tour" substituídos pela seção unificada

### Refatorado (Clean Code / SOLID)
- `MonetizationSettingsStore`: magic strings → constantes nomeadas (`STORAGE_KEY_*`), `DEFAULT_SUPPORT_MODE` exportado
- `useTourTarget`: magic numbers → constantes nomeadas (`SPOTLIGHT_MEASURE_DELAY_MS`, `OFF_SCREEN_THRESHOLD_PX`, etc.)
- `AppOpenAdHost`: refs renomeadas com sufixo `Ref`; condição complexa extraída como `isReturningToForeground`
- `DailyAdModal`: magic number `2500` → `PIX_COPIED_RESET_DELAY_MS`; padrão `soundManager.play + action` extraído
- `NativeAdBanner`: `49` hardcoded → `TAB_BAR_BASE_HEIGHT`
- `SupportModeSelector`: `theme: any` → `ThemeColors` tipado; opções como array de configuração

---

## [1.1.0] - 2026-03-12

### Adicionado
- WelcomeCarousel com 6 slides: boas-vindas, funcionalidades, permissões, transparência & apoio, IA financeira, conclusão
- Tour guiado interativo com spotlight nas principais funcionalidades (modo demo)
- AdMob: Banner (`SupportBanner`), Intersticial Diário (`DailyAdModal`), Native Ad (`NativeAdBanner`), App Open Ad (`AppOpenAdHost`)
- `MonetizationSettingsStore`: persistência de modos de suporte e controle de exibição diária

### Corrigido
- Crash no Android 16: SVG spotlight + null-child no `dispatchGetDisplayList`
- Google Sign-In offline: tratamento de erro ao falhar autenticação sem rede
- Foco de câmera em OcrScanScreen, QrScanScreen e QRScannerModal

---

## [1.0.0] - 2026-02-28

### Adicionado
- Lançamento inicial do DOMUS
- Gerenciamento de transações com arquitetura baseada em eventos
- SQLite criptografado local (sem servidores)
- Backup AES-256-GCM com senha do usuário
- Lista de desejos com links afiliados Amazon/Mercado Livre
- Scanner OCR para importação de notas fiscais
- IA Financeira (OpenAI, Gemini, Claude, DeepSeek, Qwen)
- Bloqueio por PIN e biometria
- Temas claro/escuro/sistema
- Gamificação: conquistas, XP, troféus sazonais
