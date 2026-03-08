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

Organize sua vida financeira com privacidade total. O DOMUS armazena tudo no seu dispositivo — nenhum dado vai para servidores de terceiros.

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
Converse com a IA sobre suas finanças. O assistente analisa seu histórico, sugere metas e responde dúvidas com base nos seus dados reais. Compatível com OpenAI, Google Gemini, Claude, DeepSeek e Qwen.

SINCRONIZAÇÃO P2P SEM NUVEM
Sincronize dispositivos via relays Nostr com criptografia ponta-a-ponta. Sem servidor central — seus dados ficam sempre sob seu controle.

BACKUP CRIPTOGRAFADO
Exporte todos os dados em arquivo .domusbackup protegido por senha (AES-256-GCM). Restaure em qualquer dispositivo. Também compatível com Google Drive.

SEGURANÇA
Proteja o app com PIN ou biometria (digital / Face ID). O app trava automaticamente ao ir para segundo plano.

CALCULADORA DE DÍZIMO
Para usuários que contribuem com dízimo ou ofertas: calcule automaticamente o percentual sobre a renda bruta ou líquida.

FUNCIONALIDADES ADICIONAIS
• Transações recorrentes e parceladas
• Filtro por mês e ano no orçamento
• Tema claro, escuro ou automático
• Arquitetura baseada em eventos (histórico imutável)
• Armazenamento local com SQLite criptografado
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

Precisa estar hospedada em uma URL pública. Sugestão de texto:

```
Política de Privacidade — DOMUS

Última atualização: março de 2026

O DOMUS ("nós") respeita sua privacidade. Esta política descreve como tratamos seus dados.

1. COLETA DE DADOS
O DOMUS armazena todos os dados financeiros exclusivamente no dispositivo do usuário.
Nenhum dado pessoal ou financeiro é enviado para servidores externos automaticamente.

2. CÂMERA
A câmera é usada apenas para escanear QR Codes de notas fiscais (NF-e).
Nenhuma imagem é armazenada ou transmitida.

3. BIOMETRIA
A biometria (digital ou facial) é usada apenas para desbloquear o aplicativo.
Os dados biométricos não saem do dispositivo e são gerenciados pelo sistema operacional.

4. SINCRONIZAÇÃO (OPCIONAL)
Quando ativada, a sincronização P2P transmite dados criptografados (ponta-a-ponta)
via relays públicos Nostr. Nenhum servidor central armazena seus dados.

5. ASSISTENTE IA (OPCIONAL)
Ao usar o assistente de IA, os dados necessários para a conversa são enviados ao
provedor escolhido pelo usuário (OpenAI, Google, Anthropic, DeepSeek ou Qwen).
Esta funcionalidade é opcional e requer configuração manual pelo usuário.

6. BACKUP (OPCIONAL)
Backups são criptografados com AES-256-GCM e protegidos por senha definida pelo
usuário. O arquivo pode ser salvo localmente ou enviado ao Google Drive pelo
próprio usuário.

7. COMPARTILHAMENTO
Não compartilhamos, vendemos ou transferimos dados pessoais a terceiros.

8. CONTATO
Em caso de dúvidas: [SEU_EMAIL]

Pixel Eucarístico — Tecnologia com propósito.
```

> Hospede esse texto em uma URL (ex: GitHub Pages, site próprio) e coloque na Play Console.

---

## Permissões justificadas (Data Safety)

Na Play Console você precisa declarar cada permissão:

| Permissão | Justificativa |
|-----------|--------------|
| CAMERA | Escanear QR Code de notas fiscais |
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
