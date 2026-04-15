# Changelog

Todas as mudanças notáveis neste projeto seguem o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

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
