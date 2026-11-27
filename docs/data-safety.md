# Data safety — folha de respostas do formulário

Última atualização: 9 de novembro de 2026 (Story 4.10; criptografia ponta a ponta reativada após corte definitivo do canal legado)

> Levantamento do que sai do aparelho, para o dono preencher o formulário *Data safety* do
> Play Console (Story 1.6). Descreve o comportamento da `dev` atual, com as Stories 12.1 a
> 12.6 entregues. Tem de dizer o mesmo que `docs/politica-de-privacidade.md` (citada como
> "Política §N"). Ao mudar um fluxo, mude a política, este arquivo e o formulário.
> Os tipos de dado seguem as categorias do Play em português.

## 1. Respostas gerais

| Pergunta do formulário | Resposta | Por quê |
|---|---|---|
| O app coleta ou compartilha algum dos tipos de dados do usuário exigidos? | **Sim** | IA, sincronização, Drive, Firebase e AdMob enviam dados a terceiros (seção 2). O DOMUS não tem servidor próprio. |
| Todos os dados do usuário coletados pelo app são criptografados em trânsito? | **Sim** | Provedores de IA, Drive, Firebase, AdMob e consultas usam HTTPS; os relays Nostr usam `wss://` (`src/modules/nostrSync.ts:25-32`). O Android 9+ bloqueia HTTP sem cifra por padrão e o app não libera (`app.json` e `plugins/` sem `usesCleartextTraffic`). Ver achado 3. |
| Vocês oferecem uma forma de os usuários solicitarem a exclusão dos dados? | **Não** | Decisão do dono (16/10/2026): o desenvolvedor não guarda dados em servidor e não consegue apagar os de terceiros. A Política §8 explica o reset local ("Resetar aplicativo" em Sobre) e o que ele não apaga. |
| O app contém anúncios? | **Sim** | Só nos modos de apoio com anúncio; o padrão é sem anúncio (Política §6). |
| O app usa o ID de publicidade? | **Sim** | O SDK do Google Mobile Ads lê o ID de publicidade nos modos de apoio com anúncio, para publicidade e prevenção de fraude (plugin `react-native-google-mobile-ads` no `app.json`). O Firebase Analytics também pode lê-lo, só depois do opt-in (F7): não há `google_analytics_adid_collection_enabled=false` no `app.json` nem em `plugins/`. A permissão `AD_ID` vai em todo build (seção 4). |
| Os dados ficam cifrados de ponta a ponta? | **Sim** | O canal de sincronização entre aparelhos usa criptografia autenticada de ponta a ponta (AES-256-GCM) baseada em segredo de grupo de 256 bits gerado localmente e derivado via HKDF-SHA256 (`src/modules/strongGroup/eventCipher.ts`, `src/modules/strongGroup/groupSecret.ts`), assim como o backup no Drive (`F2`). O canal legado em cifra XOR foi descontinuado na Story 4.9 (corte por data em `20/11/2026` em `strongGroupSync.ts:41-43`); apenas `deviceId`/metadados de `F1` e os fluxos `F3–F10` não são E2EE. |
| Validação independente de segurança (MASA)? | **Não** | Nunca foi feita. |

## 2. Fluxos que saem do aparelho

"Coletado" e "Compartilhado" seguem as definições do Play: coletado é todo dado que sai do
aparelho; compartilhado é a transferência a terceiros fora das isenções (ação iniciada pelo
usuário, prestador de serviço do desenvolvedor). Nas linhas marcadas "conservador", a isenção
seria discutível e a recomendação é declarar.

| # | Fluxo e destino | Tipos de dado do Play | Finalidade | Opcional e como ativar | Coletado / Compartilhado | Evidência |
|---|---|---|---|---|---|---|
| F1 | **Sincronização**: seis relays Nostr públicos (relay.damus.io, nos.lol, relay.snort.social, relay.primal.net, relay.nostr.com.br, nostr.bitcoiner.social) | Informações financeiras (Outras informações financeiras; Histórico de compras: notas fiscais e lista de desejos); IDs do dispositivo ou outros IDs (identificador do aparelho gerado pelo app, em claro); opcionalmente, chaves de API de IA e OCR cifradas com AES-256-GCM (derivação de chave dedicada) mediante opt-in | Funcionalidade do app | Sim: desligada até criar ou entrar num grupo com um segredo de grupo (tela Sincronização); a sincronização de chaves de API de IA e OCR é um opt-in separado (desligado por padrão), disponível apenas no app nativo (Android/iOS) com Grupo forte | Coletado: sim. Compartilhado: **sim (conservador)**: relays públicos guardam os lotes cifrados com AES-256-GCM mesmo depois de o usuário desinstalar o app; sem o Segredo de 256 bits os relays veem apenas texto cifrado autenticado e metadados de rede (IP, timestamp, tamanho e chave pública do grupo) | Política §2; `src/modules/strongGroup/eventCipher.ts`, `src/modules/strongGroup/groupSecret.ts`, `nostrSync.ts:25-32,493-613` |
| F2 | **Google Drive**: pasta de dados do app (oculta) na conta Google do usuário | Informações financeiras (cópia diária de todos os registros, incluindo `deviceId` cifrado com AES-256-GCM e chave gerada no aparelho). No nativo o login e o e-mail vêm do Android Credential Manager + `AuthorizationClient` / iOS `GIDSignIn` (`modules/domus-google-auth`); na web o e-mail vem de `oauth2/v2/userinfo` apenas para exibição local. Quando a sincronização Nostr (F1) está ativa, a preferência `domus_gdrive_backup_pref_v1` (`{ enabled, email? }`, sem tokens OAuth) também é sincronizada cifrada em AES-256-GCM via F1 | Funcionalidade do app (backup) | Sim: só ao conectar a conta Google na tela de Backup | Coletado: sim. Compartilhado: não (ação iniciada pelo usuário, para a própria conta) | Política §5; `src/hooks/useAutoBackup.ts`, `GoogleDriveService.ts:52-91,296-307`, `GoogleNativeAuth.ts`, `syncedDriveBackupPref.ts` |
| F3 | **Assistente de IA (texto)**: provedor escolhido pelo usuário (OpenAI, Google Gemini, Anthropic Claude, DeepSeek, Qwen ou OpenRouter), com a chave de API do próprio usuário | Informações financeiras (saldo, receita, despesa, poupança, categorias de gasto, perfil de conselho de compra; com permissão, até 50 transações, contas, notas fiscais, lista de desejos, troféus/conquistas e metadados de sincronização); Outro conteúdo gerado pelo usuário (mensagens da conversa e nomes de itens de nota para sugerir categoria) | Funcionalidade do app | Sim: só funciona depois de cadastrar uma chave de API e ligar "Ativar IA"; dados detalhados só são enviados com as permissões das configurações da IA ativas (todas começam desligadas). O código ou segredo do grupo nunca vai à IA (Story 12.1) | Coletado: sim. Compartilhado: não (ação iniciada pelo usuário, com a chave dele) | Política §3; `ConsultantChatUseCase.ts`, `AIContextBuilder.ts:45-53`, `packages/ai/src/adapters/*` |
| F4 | **IA por voz**: texto a ser falado → OpenAI, Gemini, Qwen ou ElevenLabs; voz gravada → OpenAI, Gemini ou ElevenLabs | Gravações de voz ou som (voz gravada, só para OpenAI, Gemini ou ElevenLabs, para transcrição); Outro conteúdo gerado pelo usuário (texto enviado para virar fala) | Funcionalidade do app | Sim: só se ligar a voz no chat da IA (TTS envia texto quando a saída falada está ativa; o microfone é pedido apenas para gravação de voz) | Coletado: sim. Compartilhado: não (ação iniciada pelo usuário) | Política §3; `src/hooks/useVoiceRecorder.ts`, `app/ai-chat.tsx` |
| F5 | **Leitura de fotos por IA (OCR)**: fotos de **nota fiscal e holerite**, tiradas ou escolhidas na galeria pelo chat da IA ou na tela de holerites, vão ao provedor de IA escolhido (OpenAI, Gemini, Claude ou Qwen) | Fotos (podem conter nome, CPF, empregador e salário); Informações financeiras (valores da nota e do holerite) | Funcionalidade do app | Sim: só com "Ativar IA" e "OCR por Visão (IA)" ligados, no chat da IA ou na tela de holerites; a foto é enviada quando o usuário fotografa ou escolhe a imagem | Coletado: sim. Compartilhado: não (ação iniciada pelo usuário) | Política §4; `packages/ai/src/vision/VisionOCRService.ts:24-86`, `src/hooks/usePayslipScanner.ts:33-40` |
| F6 | **OCR de terceiros: Google Cloud Vision**: as mesmas fotos de nota fiscal e holerite | Fotos; Informações financeiras | Funcionalidade do app | Sim: só se o usuário cadastrar uma chave do Cloud Vision; a foto vai quando a leitura no aparelho falha ou tem confiança abaixo de 60%, ou primeiro, se o Cloud Vision for o provedor principal | Coletado: sim. Compartilhado: não (ação iniciada pelo usuário, com a chave dele) | Política §4; `packages/parsers/src/hybridOcrAdapter.ts:66-75,200-215`, `src/hooks/useInvoiceScanner.ts` |
| F7 | **Firebase Analytics** (Google) | Interações com o app (telas e eventos de uso); IDs do dispositivo ou outros IDs (ID da instalação do app e, quando houver, o ID de publicidade) | Análise | Sim: desligado por padrão; liga no aviso de consentimento ou em Sobre › Analytics & Performance | Coletado: sim. Compartilhado: não (prestador de serviço do desenvolvedor) | Política §6 (ID da instalação, IP e ID de publicidade citados desde a Story 12.7); `firebase.json`, `src/modules/analytics/infrastructure/AnalyticsService.ts` |
| F8 | **Firebase Crashlytics** (Google) | Registros de falhas; Diagnóstico; IDs do dispositivo ou outros IDs | Análise | Sim: idem F7 | Coletado: sim. Compartilhado: não (prestador de serviço) | Política §6; `firebase.json`, `AnalyticsService.ts` |
| F9 | **Firebase Performance** (Google) | Diagnóstico (desempenho e tempo de rede); IDs do dispositivo ou outros IDs | Análise | Sim: idem F7 | Coletado: sim. Compartilhado: não (prestador de serviço) | Política §6; `firebase.json` |
| F10 | **Anúncios: Google AdMob** | IDs do dispositivo ou outros IDs (ID de publicidade); Localização aproximada (derivada do endereço IP pelo SDK); Interações com o app; Diagnóstico | Publicidade ou marketing; Análise; Prevenção contra fraudes, segurança e conformidade | Sim: o modo de apoio padrão não tem anúncio; ativa ao escolher um modo de apoio com anúncio. Os anúncios são não personalizados por padrão; o interruptor "Anúncios personalizados" (Sobre › Apoio & Anúncios, desligado por padrão, revogável no mesmo lugar) libera a personalização (Story 12.4) | Coletado: sim. Compartilhado: **sim**: mesmo não personalizados, o SDK envia ao Google o ID de publicidade e dados do aparelho para entregar e medir os anúncios | Política §6; `src/modules/monetization/adConsent.ts` (`adRequestOptions`), `SupportModeSelector.tsx` |
| F11 | **SEFAZ do estado**: página da nota aberta pelo QR Code, com a chave de acesso | Histórico de compras (chave de acesso da nota lida) | Funcionalidade do app | Sim (só ao ler o QR Code): o usuário escolhe ler a nota; por ser ação do usuário, fica fora da flag da Story 12.6 | Coletado: sim. Compartilhado: não (ação iniciada pelo usuário) | Política §4; `src/hooks/useInvoiceWebView.ts`, `packages/parsers/src/sefazService.ts` |
| F12 | **Código de barras**: o EAN do item da nota vai ao Open Food Facts e ao Cosmos (Bluesoft) | Nenhum tipo declarável pela política (código do produto, sem dado pessoal); ver achado 2 | Funcionalidade do app | Sim: só com a flag "Consultas de itens, preços e ícones" ligada (Sobre › Configurações; desligada em instalação nova, ligada com aviso único para quem já usava; Story 12.6) | Não declarar | Política §7; `packages/parsers/src/classifier/eanLookup.ts:16,48`, `src/modules/privacy/externalLookups.ts` |
| F13 | **Tabela NCM**: download da tabela pública do Portal Único Siscomex | Nenhum (só download) | Funcionalidade do app | Sim: idem F12 | Não declarar | Política §7; `packages/parsers/src/classifier/classifyItem.ts:131` |
| F14 | **Preços da lista de desejos**: o app acessa as páginas dos produtos salvos | Nenhum tipo declarável pela política (o site vê o endereço IP e a página pedida); ver achado 2 | Funcionalidade do app | Sim: idem F12; desligada, mostra o último preço salvo | Não declarar | Política §7; `src/hooks/usePriceRefresh.ts` |
| F15 | **Ícones de loja**: serviço de ícones do Google recebe o domínio da loja | Nenhum (domínio da loja) | Funcionalidade do app | Sim: idem F12; desligada, mostra ícone genérico | Não declarar | Política §7; `src/components/wishlist/storeIcon.ts` |
| F16 | **Cotação do dólar**: AwesomeAPI, DolarAPI e ExchangeRate-API | Nenhum (só leitura da cotação) | Funcionalidade do app (custo estimado da IA) | Sim (ao abrir o painel da IA; fica fora do interruptor "Consultas de itens, preços e ícones") | Não declarar | Política §7; `src/modules/ai/infrastructure/TokenPricingService.ts:41-92` |

O backup manual (Política §5) não é um fluxo do app: o arquivo vai para onde o usuário
escolher na folha de compartilhamento do sistema. Fotos não ficam salvas de forma permanente (Política §4). PIN e biometria nunca saem do
aparelho (Política §1). As notificações são locais, agendadas no aparelho, sem token de push.

## 3. Resumo por tipo de dado (para preencher o formulário)

| Tipo de dado do Play | Fluxos | Coletado | Compartilhado | Opcional | Finalidades |
|---|---|---|---|---|---|
| Informações financeiras: Histórico de compras | F1, F3, F11 | Sim | Sim (F1) | Sim | Funcionalidade do app |
| Informações financeiras: Outras informações financeiras | F1, F2, F3, F5, F6 | Sim | Sim (F1) | Sim | Funcionalidade do app |
| Fotos e vídeos: Fotos | F5, F6 | Sim | Não | Sim | Funcionalidade do app |
| Áudio: Gravações de voz ou som | F4 | Sim | Não | Sim | Funcionalidade do app |
| Mensagens: Outras mensagens no app | F3 | Sim | Não | Sim | Funcionalidade do app |
| Atividade no app: Outro conteúdo gerado pelo usuário | F3, F4 | Sim | Não | Sim | Funcionalidade do app |
| Atividade no app: Interações com o app | F3, F7, F10 | Sim | Sim (F10) | Sim | Funcionalidade do app; Análise; Publicidade ou marketing |
| Informações e desempenho do app: Registros de falhas | F8 | Sim | Não | Sim | Análise |
| Informações e desempenho do app: Diagnóstico | F8, F9, F10 | Sim | Sim (F10) | Sim | Análise; Prevenção contra fraudes, segurança e conformidade |
| IDs do dispositivo ou outros IDs | F1, F7, F8, F9, F10 | Sim | Sim (F1, F10) | Sim | Funcionalidade do app; Análise; Publicidade ou marketing; Prevenção contra fraudes, segurança e conformidade |
| Local: Localização aproximada | F10 | Sim | Sim (F10) | Sim (só nos modos de apoio com anúncio) | Publicidade ou marketing; Análise; Prevenção contra fraudes, segurança e conformidade |

O formulário só aceita "opcional" se o usuário puder evitar todos os fluxos daquele tipo.
Cada linha acima só tem fluxos que o usuário ativa ou escolhe (`F11` ocorre só ao ler o QR Code; `expo-share-intent` ocorre só quando o usuário compartilha um link). As chaves de API/OCR sincronizadas opcionalmente em `F1` são credenciais de terceiros cifradas com AES-256-GCM (cobertas por cautela em `Outras informações financeiras`).

## 4. Permissões do Android

Permissões declaradas em `app.json` (`android.permissions`). `RECEIVE_BOOT_COMPLETED` está em
`blockedPermissions` e não entra no app.

| Permissão | Justificativa |
|-----------|--------------|
| CAMERA | Ler o QR Code e fotografar notas fiscais e holerites |
| READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE | Importar e exportar arquivos de backup e escolher fotos de notas e holerites na galeria |
| USE_BIOMETRIC / USE_FINGERPRINT | Desbloquear o app com biometria; o processamento é do sistema e o DOMUS não guarda dados biométricos |
| RECORD_AUDIO | Gravar a pergunta por voz no chat da IA, só quando o usuário liga a voz; o áudio vai ao provedor de voz escolhido |
| MODIFY_AUDIO_SETTINGS | Ajustar o modo de áudio para gravar a voz e tocar a resposta falada da IA |
| POST_NOTIFICATIONS | Mostrar lembretes locais de vencimento, orçamento, metas e resumo semanal, agendados no aparelho |

### Permissões no APK/AAB final (manifesto mesclado)

Verificação mais recente no AAB assinado de produção (`docs/verificacao-aab-1-9-0.md`, versão `1.9.0` / `versionCode 12`, run `45688642633`, `2e2de34`, target SDK 36), complementando a leitura inicial do APK de release da `dev` (run #71, `c93928a`, versão 1.8.0/10), além das do `app.json`:

| Permissão | Origem | Situação |
|-----------|--------|----------|
| INTERNET, ACCESS_NETWORK_STATE | React Native, Firebase, AdMob | Necessárias (IA, sincronização, Drive, Firebase, AdMob e consultas da seção 2) |
| WAKE_LOCK, FOREGROUND_SERVICE, FOREGROUND_SERVICE_MEDIA_PLAYBACK, VIBRATE | Firebase, áudio, notificações | Necessárias para o funcionamento interno |
| com.google.android.gms.permission.AD_ID, ACCESS_ADSERVICES_AD_ID / ATTRIBUTION / TOPICS | SDK do AdMob | Declarar o ID de publicidade (seção 3) |
| com.google.android.c2dm.permission.RECEIVE, BIND_GET_INSTALL_REFERRER_SERVICE | Firebase / Play | Internas |
| Permissões de selo no ícone (Samsung, Huawei, Oppo, HTC, Sony e outras) | Notificações | Só o contador no ícone |
| ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION | `expo-location`, que nenhum código usava | Estavam no run #71. **Removidas (D16): confirmadas `0` ocorrências no AAB `1.9.0 / versionCode 12`** (`docs/verificacao-aab-1-9-0.md`) |
| SYSTEM_ALERT_WINDOW | manifesto gerado pelo prebuild (estava no APK de release, então não vem só do debug) | Estava no run #71. **Removida (D16): confirmada `0` ocorrências no AAB `1.9.0 / versionCode 12`** (`docs/verificacao-aab-1-9-0.md`); o app não usa |

O app não declara `usesCleartextTraffic` nem configuração de rede: com target 36, o Android
bloqueia HTTP sem cifra por padrão, o que sustenta a resposta "cifrado em trânsito".

## 5. Achados

1. **Busca de produto na lista de desejos fora da política.** Ao adicionar um item, o app
   abre a busca da Amazon ou do Mercado Livre com o nome do produto e um código de afiliado
   (`src/components/wishlist/AddItemModal.tsx:481-494`, `WishlistSearchWebView.tsx:33-34`).
   É navegação iniciada pelo usuário e não entra no formulário. **Resolvido (D17, Story 12.7):**
   a Política §7 passou a citá-la.
2. **Consultas sem dado pessoal (F12, F14).** A Política §7 diz que essas consultas não
   enviam dados pessoais; por isso não entram no formulário. Junto do endereço IP, porém, o
   EAN de itens comprados e a página de um desejo dizem algo sobre o usuário. Se o dono
   preferir declarar, o tipo é "Histórico de compras", e a política precisa mudar junto. A
   flag de envio da Story 12.6 resolve a parte de consentimento (entregue).
3. **Cifra em trânsito depende do bloqueio de HTTP.** A SEFAZ e as páginas da lista de
   desejos usam o endereço do QR Code ou do link salvo, que pode ser `http://`. O Android
   bloqueia esse tráfego no build de release com target 36 (o app não libera HTTP), então
   nada sai sem TLS, mas essas páginas falham. Conferido no APK de release da CI (sem
   `usesCleartextTraffic` nem configuração de rede).
4. **Firebase e AdMob: identificadores e IP.** A Política §6 cita o ID de publicidade só para
   o AdMob e não diz que o Firebase usa um ID da instalação do app nem que esses serviços
   veem o endereço IP. O formulário declara "IDs do dispositivo ou outros IDs" nos dois.
   **Resolvido (D17, Story 12.7):** a Política §6 cita o ID da instalação, o IP, o ID de
   publicidade no Analytics e a localização aproximada do AdMob.
5. **Anúncios personalizados sem consentimento** (D9, Story 12.4). O formulário declara o
   compartilhamento para publicidade. **Resolvido (Story 12.4; política na 12.7, D22):** os
   anúncios são não personalizados por padrão, com o interruptor "Anúncios personalizados"
   em Sobre › Apoio & Anúncios.
6. **A6 — Localização sem uso.** O APK de release do run #71 pedia `ACCESS_FINE_LOCATION` e
   `ACCESS_COARSE_LOCATION` porque `expo-location` está em `package.json` desde a v1.4.0, sem
   nenhum uso no código. O Play exige justificativa e declaração de localização para essas
   permissões. **Resolvido (D16, 16/10/2026):** `expo-location` removido e as permissões de
   localização e `SYSTEM_ALERT_WINDOW` bloqueadas em `app.json` (o prebuild gera
   `tools:node="remove"`). Conferir no manifesto do AAB da Story 1.6. **Não** declarar
   localização *precisa*: o app nunca a lê. A localização *aproximada* que o SDK de anúncios deriva do IP é
   declarada em F10.

