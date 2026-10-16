# DOMUS — Google Play Store Listing

Guia completo para publicação na Google Play Console.
Todos os textos são baseados nas funcionalidades reais do app.

---

## Nome do App

**DOMUS – Finanças Pessoais & Gamificação**

> Alternativas caso já exista:
> - DOMUS Controle Financeiro
> - DOMUS – Organize suas Finanças

---

## Descrição curta (máx. 80 caracteres)

```
Controle finanças, importe notas fiscais e evolua com gamificação.
```

---

## Descrição completa

```
DOMUS – Finanças Pessoais & Gamificação

Organize sua vida financeira com privacidade. O DOMUS guarda seus dados no seu aparelho, sem servidor próprio. Alguns recursos enviam dados a serviços de terceiros, como IA, sincronização, Google Drive e consultas de notas fiscais e preços; a política de privacidade lista cada um e quando acontece.

DASHBOARD INTELIGENTE
Veja o saldo consolidado de todas as suas contas, a evolução mensal e o resumo financeiro em uma única tela. Acompanhe receitas, despesas e transferências em tempo real.

ORÇAMENTO AUTOMÁTICO 50/30/20
Suas despesas são classificadas automaticamente:
• 50% Necessidades (moradia, saúde, alimentação)
• 30% Estilo de Vida (lazer, vestuário, assinaturas)
• 20% Futuro (investimentos, poupança, reserva)

CONTAS & CARTÕES
Cadastre carteiras, contas bancárias, cartões de crédito e contas poupança. Cada conta tem cor personalizada, limite e saldo atualizados a cada transação.

IMPORTAÇÃO DE NOTA FISCAL
Escaneie o QR Code da NF-e com a câmera ou digite a chave de acesso. O DOMUS preenche a transação automaticamente via OCR — sem digitar nada.

LISTA DE DESEJOS & METAS DE POUPANÇA
Organize compras futuras com prioridades (Urgente, Alta, Média, Baixa). Vincule uma conta poupança a qualquer item e acompanhe o progresso com barra visual — veja exatamente quanto falta.

GAMIFICAÇÃO FINANCEIRA
Cada transação gera XP e mantém sua sequência diária (streak). Suba de nível e desbloqueie conquistas: Prata, Ouro e Diamante. Todo mês um troféu único é sorteado — Bronze, Prata e Ouro.

ASSISTENTE FINANCEIRO COM IA
Converse com a IA sobre suas finanças usando a sua própria chave de API. O assistente recebe um resumo do mês e, só se você liberar, suas transações, contas e outros dados, para sugerir metas e responder dúvidas. Compatível com OpenAI, Google Gemini, Claude, DeepSeek, Qwen e OpenRouter.

SINCRONIZAÇÃO ENTRE APARELHOS (OPCIONAL)
Sincronize seus aparelhos por relays Nostr públicos, com os dados cifrados com a chave do grupo. Sem servidor do DOMUS. Os registros publicados continuam nos relays mesmo depois de sair do grupo.

BACKUP CRIPTOGRAFADO
Exporte todos os dados em arquivo .domusbackup protegido por senha (AES-256-GCM). Restaure em qualquer dispositivo. Conecte o Google Drive para enviar uma cópia cifrada todo dia, automaticamente.

SEGURANÇA
Proteja o app com PIN ou biometria (digital / Face ID). O app trava automaticamente ao ir para segundo plano.

CALCULADORA DE DÍZIMO
Para usuários que contribuem com dízimo ou ofertas: calcule automaticamente o percentual sobre a renda bruta ou líquida.

FUNCIONALIDADES ADICIONAIS
• Transações recorrentes e parceladas
• Filtro por mês e ano no orçamento
• Tema claro, escuro ou automático
• Arquitetura baseada em eventos (histórico imutável)
• Armazenamento local em SQLite
• Layout responsivo para tablets

Comece hoje a construir uma vida financeira mais organizada com o DOMUS.
```

---

## Categoria

**Finanças**

---

## Tags de busca

```
controle financeiro, finanças pessoais, controle de gastos, orçamento 50 30 20,
nota fiscal, gamificação, poupança, metas financeiras, backup criptografado,
organizador financeiro, despesas, receitas, cartão de crédito
```

---

## Classificação etária

**Livre (Everyone)** — app financeiro, sem violência, sem conteúdo adulto.

---

## Política de Privacidade (obrigatória)

Fonte única: `docs/politica-de-privacidade.md` (publicada em
`https://pixel-eucaristico.com.br/domus/privacy`). O texto abaixo é cópia dela e da tela
`app/privacy-policy.tsx`; ao mudar um, mude os três.

````markdown
# Política de Privacidade — DOMUS

Última atualização: outubro de 2026

Esta política descreve o que o DOMUS faz hoje com os seus dados. O DOMUS não tem servidor
próprio que receba seus dados: eles ficam no seu aparelho. Alguns recursos, quando você os
usa ou ativa, enviam dados a serviços de terceiros. Cada um está descrito abaixo, com a
condição em que acontece.

## 1. Dados no aparelho

- **Seus registros:** transações, contas, orçamento, notas fiscais e lista de
  desejos ficam no banco de dados local do aparelho (SQLite). Esse banco não é cifrado pelo
  DOMUS; ele conta com a proteção do próprio sistema, que isola os dados de cada app. Na
  versão web, os dados ficam no armazenamento do navegador, sem cifra.
- **Segredos:** chaves de API, o código do grupo de sincronização e o acesso ao Google Drive
  ficam no armazenamento seguro do sistema (Keystore no Android, Keychain no iOS). Na web,
  ficam cifrados com uma chave do próprio navegador. Exceções: a chave do Google Cloud Vision
  e a chave da cópia automática de backup ficam no armazenamento comum do app, sem cifra.
- **PIN e biometria:** o PIN é guardado só como hash SHA-256 com salt, no armazenamento
  seguro. A biometria é processada pelo sistema; o DOMUS não acessa nem guarda dados
  biométricos.
- O DOMUS não pede CPF, RG, endereço, número de cartão nem dados bancários. Fotos de notas
  fiscais e holerites podem conter alguns desses dados (veja "Câmera e fotos").

## 2. Sincronização entre aparelhos (opcional)

- Fica desligada até você criar ou entrar num grupo com um código.
- Quando ligada, o app publica seus registros em seis relays Nostr públicos, mantidos por
  terceiros: relay.damus.io, nos.lol, relay.snort.social, relay.primal.net,
  relay.nostr.com.br e nostr.bitcoiner.social.
- O conteúdo vai cifrado com uma chave derivada do código do grupo. É uma proteção simples:
  quem souber o código, ou descobri-lo por tentativa, consegue ler os registros publicados.
- Ficam visíveis sem cifra: o identificador do aparelho gerado pelo app, o horário de
  publicação, a quantidade de registros de cada lote e a chave pública do grupo. Os relays
  também veem o endereço IP do aparelho.
- Os registros publicados continuam nos relays depois que você sai do grupo, reseta o app
  ou o desinstala. O DOMUS não consegue apagá-los.

## 3. Assistente de IA (opcional)

- Só funciona se você cadastrar a sua própria chave de API de um provedor: OpenAI, Google
  Gemini, Anthropic Claude, DeepSeek, Qwen ou OpenRouter. As chamadas saem do aparelho direto
  para o provedor, sem passar por servidor do DOMUS, e seguem a política desse provedor.
- Sem precisar de permissão, cada mensagem envia ao provedor as 6 últimas mensagens da
  conversa e mais: numa conversa comum, saldo total, receita e despesa do mês, taxa de
  poupança e a sua mensagem; num pedido de resumo do mês, esses mesmos números, as 3
  categorias com mais gastos (valor e percentual) e um índice de variação dos gastos, no
  lugar da sua mensagem; num pedido de conselho de compra, seu perfil (tolerância a risco,
  taxa de poupança, índices de impulsividade e de variação dos gastos), a tendência de
  gastos, o preço do item e a sua pergunta.
- Só se você liberar nas configurações da IA (todas começam desligadas): até 50 transações
  recentes (data, valor, categoria e descrição), contas (nome, tipo, saldo e limite),
  categorias, até 10 notas fiscais (data, emissor e valor), lista de desejos, nível e
  conquistas, e dados da sincronização, incluindo o código do grupo. Com esse código, o
  provedor de IA consegue ler os registros publicados nos relays.
- Ao revisar uma nota fiscal, o nome de um item pode ser enviado ao provedor de IA
  configurado para sugerir a categoria.
- **Voz (só se você ligar a voz):** o texto a ser falado vai ao provedor de áudio escolhido
  (OpenAI, Gemini, Qwen ou ElevenLabs), que devolve o áudio. A voz que você grava vai à
  OpenAI, ao Gemini ou à ElevenLabs para ser transcrita ou entendida.
- As respostas da IA são informativas e não são aconselhamento financeiro profissional.

## 4. Câmera e fotos

- A câmera serve para ler o QR Code de notas fiscais e para fotografar notas fiscais e
  holerites.
- Ao ler o QR Code, o app abre a página da SEFAZ do seu estado com a chave de acesso da nota,
  para buscar os itens.
- Com a IA configurada, a foto, tirada ou escolhida na galeria, vai ao provedor de IA
  escolhido para leitura do texto. Se você cadastrar uma chave do Google Cloud Vision, a
  foto também vai ao Google Cloud Vision quando a leitura feita no aparelho tem confiança
  abaixo de 60%.
- Fotos de notas e holerites podem conter nome, CPF, empregador e salário.
- O DOMUS não salva as fotos de forma permanente.

## 5. Backup e Google Drive

- **Backup manual:** gera um arquivo .domusbackup cifrado com AES-256-GCM, com chave derivada
  da sua senha (PBKDF2-SHA256, 100 mil iterações). O DOMUS não conhece a senha, e você
  escolhe para onde enviar o arquivo. Também existe a exportação sem criptografia: esse
  arquivo pode ser lido por qualquer pessoa que tenha acesso a ele.
- **Cópia automática:** no Android e no iOS, uma vez por dia, ao abrir o app, o DOMUS grava
  uma cópia cifrada (AES-256-GCM, PBKDF2-SHA256 com 100 mil iterações) na pasta do app, com
  uma chave gerada no próprio aparelho.
- **Google Drive (opcional):** se você conectar sua conta Google, essa cópia diária é
  enviada automaticamente para a pasta de dados do app no seu Drive, que fica oculta. O
  e-mail da conta e o acesso ao Drive ficam no armazenamento seguro do aparelho.

## 6. Estatísticas e anúncios

- **Firebase (Google):** Analytics (uso do app), Crashlytics (relatórios de falha) e
  Performance (desempenho) começam desligados. Só enviam dados se você aceitar no aviso de
  consentimento ou ligar em Sobre › Analytics & Performance, e você pode desligá-los a
  qualquer momento.
- **Anúncios (Google AdMob):** o modo de apoio padrão não tem anúncios. Se você escolher um
  modo de apoio com anúncios, o AdMob recebe dados do aparelho, como o ID de publicidade, e
  pode mostrar anúncios personalizados. Volte ao modo sem anúncios para parar.

## 7. Outros serviços consultados

Nestes acessos o app não envia dados pessoais, mas os serviços veem o endereço IP do aparelho:

- **Cotação do dólar** (AwesomeAPI, DolarAPI e ExchangeRate-API), para estimar o custo da IA.
- **Classificação de itens de nota:** o código de barras (EAN) do item vai ao Open Food
  Facts e ao Cosmos (Bluesoft); a tabela pública de NCM é baixada do Portal Único Siscomex.
- **Lista de desejos:** o app acessa as páginas dos produtos que você salvou para atualizar
  o preço, e busca o ícone de cada loja no serviço de ícones do Google, que recebe o
  endereço da loja.

## 8. Seus direitos e exclusão

- **Apagar os dados do aparelho:** use "Resetar aplicativo" na tela Sobre ou desinstale o
  app.
- **O reset e a desinstalação não apagam:** registros já publicados nos relays Nostr; cópias
  no seu Google Drive (apague-as no Drive ou remova o acesso do DOMUS na sua Conta Google);
  arquivos de backup que você exportou; e dados já enviados a provedores de IA, ao Firebase
  ou ao AdMob, que seguem as políticas desses serviços.
- **Exportar seus dados:** use o backup.
- **Parar envios:** saia do grupo de sincronização, desconecte o Google Drive, remova as
  chaves de IA ou desligue as permissões de dados, desligue as estatísticas e escolha o modo
  de apoio sem anúncios.

## 9. Contato

- E-mail: williancustodioquintino+domus@gmail.com
- Empresa: Pixel Eucarístico (CNPJ 55.075.291/0001-79)
````

> Coloque a URL acima no campo de política de privacidade da Play Console.

---

## Permissões justificadas (Data Safety)

Na Play Console você precisa declarar cada permissão:

| Permissão | Justificativa |
|-----------|--------------|
| CAMERA | Ler o QR Code e fotografar notas fiscais e holerites |
| READ/WRITE_EXTERNAL_STORAGE | Importar/exportar backups |
| USE_BIOMETRIC / USE_FINGERPRINT | Bloqueio de segurança do app |
| INTERNET | Sincronização P2P, assistente IA, busca de cotação USD/BRL |

---

## Screenshots recomendados (1080x1920)

Capturar estas 5 telas:

1. **Dashboard** — saldo consolidado + cards de XP/Nível/Streak
2. **Orçamento 50/30/20** — barras de progresso coloridas
3. **Contas & Cartões** — lista de contas com cores
4. **Lista de Desejos** — itens com prioridade e barra de poupança
5. **Temporada** — conquistas, troféus, nível e XP

Opcionais:
6. Importação de nota fiscal (QR Code)
7. Chat com IA
8. Tela de backup

---

## Checklist antes do build

- [x] `app.json` — package name definido
- [x] `app.json` — versionCode: 1
- [x] `app.json` — version: 1.0.0
- [x] `app.json` — adaptiveIcon configurado
- [x] `app.json` — projectId do EAS
- [x] `eas.json` — production profile com app-bundle
- [x] `eas.json` — credentialsSource: remote
- [ ] Política de privacidade hospedada em URL pública
- [ ] Google Service Account Key configurada (para futuro eas submit)
- [ ] Screenshots capturados
- [ ] Primeiro upload manual feito no Play Console

---

## Passo a passo para publicar

### 1. Google Play Console
1. Acesse https://play.google.com/console
2. "Criar app" → preencha nome, idioma (pt-BR), tipo (App), gratuito
3. Preencha Ficha da Play Store (nome, descrições, ícone, screenshots)
4. Preencha Classificação de conteúdo
5. Preencha Segurança dos dados (Data Safety) — usar tabela de permissões acima
6. Preencha Política de privacidade (URL)

### 2. Build
```sh
eas login
eas build --platform android --profile production
```

### 3. Download do .aab
Após o build terminar, faça download pelo link no terminal ou em https://expo.dev

### 4. Upload manual (primeira vez)
No Play Console → Testes → Teste Alfa → Criar release → Upload do .aab

### 5. Próximas vezes (automático)
```sh
eas build --platform android --profile production --auto-submit
```
