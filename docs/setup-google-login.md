# Passo a passo — Configurar o login Google (Drive) no GitHub, local e no Expo

Guia definitivo para o login Google/backup no Drive voltar a funcionar no Android.
São 5 partes: **A)** Google Cloud/Firebase (uma vez), **B)** local (`.env`),
**C)** GitHub (secrets do Actions), **D)** Expo/EAS, **E)** teste.

O app usa 1 credencial em tempo de build e 1 registro no console. **O app não usa nem
guarda o client secret do Google**: o token do Drive vem do Google Sign-In nativo
(`GoogleSignin.getTokens()`), e qualquer `EXPO_PUBLIC_*` vai embutida no bundle.
Se você ainda tem o secret em algum lugar, não o copie para variável de ambiente.

| O quê | Onde é usado |
|---|---|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (cliente **Web**) | `GoogleSignin.configure` (`webClientId`) |
| Cliente OAuth **Android** (package + SHA-1) | Validado pelo Google Play Services no aparelho — **sem ele o login falha com DEVELOPER_ERROR** |

---

## Parte A — Google Cloud Console + Firebase (fazer uma única vez)

### A1. Colete os SHA-1 de TODOS os certificados que assinam seus builds

Você tem até 3 origens de assinatura — registre todos os SHA-1 que usar:

1. **Keystore do GitHub Actions** (secret `ANDROID_KEYSTORE_BASE64`):
   ```bash
   # No seu PC, com o arquivo .keystore original (o mesmo que virou o secret):
   keytool -list -v -keystore release.keystore -alias SEU_ALIAS
   # Copie a linha "SHA1: XX:XX:..."
   ```
2. **Keystore do EAS** (builds feitos com `eas build`):
   ```bash
   npx eas credentials -p android
   # → selecione o perfil (production/preview) → Keystore → veja o SHA-1
   ```
3. **Play App Signing** (somente se publica na Play Store — a loja RE-ASSINA o AAB!):
   Play Console → seu app → **Test and release → App integrity →
   App signing key certificate** → copie o SHA-1.
   > É por isso que "funcionava no APK de teste e parou na versão da loja":
   > o SHA-1 da loja é diferente do seu keystore.

### A2. Registre os SHA-1 no Firebase

1. Acesse https://console.firebase.google.com → projeto **domus-finance-97990251-ae0b0**.
2. ⚙️ **Project settings → Your apps →** app Android `br.com.pixeleucaristico.domus`.
3. **Add fingerprint** → cole cada SHA-1 da etapa A1 (pode adicionar vários).
4. Baixe o novo **google-services.json** e substitua o da raiz do repositório
   (o campo `oauth_client` deixará de ser `[]`). Commite o arquivo.

> O Firebase cria automaticamente os clientes OAuth Android no projeto
> Google Cloud vinculado — um por SHA-1.

### A3. Cliente Web (só o ID) e API do Drive

1. Acesse https://console.cloud.google.com/apis/credentials — **confira no topo
   que o projeto selecionado é o MESMO do Firebase** (`domus-finance-97990251`).
2. Em **Credentials** você verá os clientes Android criados pelo Firebase.
   Procure um cliente do tipo **"Web application"** (o Firebase geralmente cria
   um chamado "Web client (auto created by Google Service)").
   - Se não existir: **Create credentials → OAuth client ID → Web application**.
3. Abra o cliente Web e copie o **Client ID** → será o `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
   Não copie o client secret: o app não o usa.
4. Em **APIs & Services → Library**, ative a **Google Drive API**.
5. Em **OAuth consent screen**: se o app estiver em "Testing", adicione seu
   e-mail em **Test users** (ou publique o app). Escopo usado:
   `https://www.googleapis.com/auth/drive.appdata`.

---

## Parte B — Local (`.env`) — para rodar em desenvolvimento

Na raiz do projeto (o `.env` já está no `.gitignore`, nunca é commitado):

```bash
cp .env.example .env   # se ainda não existir
```

Edite o `.env`:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="123456789-xxxxxxxx.apps.googleusercontent.com"
```

Depois **reinicie o Metro com cache limpo** (as `EXPO_PUBLIC_*` são lidas no build do bundle):

```bash
npx expo start -c
```

> Lembrete: no Expo Go o login nativo do Google NÃO funciona (precisa do módulo
> nativo) — teste em development build (`npx expo run:android`) ou build EAS.

---

## Parte C — GitHub (secrets usados pelo workflow `build-android.yml`)

O workflow já injeta tudo sozinho — ele só precisa dos secrets existirem.

1. No GitHub: **repositório → Settings → Secrets and variables → Actions →
   New repository secret**. Crie:

   | Secret | Valor |
   |---|---|
   | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Client ID do cliente **Web** (A3) |
   | `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Client ID do cliente **Android** criado pelo Firebase para o SHA-1 do keystore do GitHub (visível em Cloud Console → Credentials) |
   | `ANDROID_KEYSTORE_BASE64` | `base64 -w0 release.keystore` (se ainda não existir) |
   | `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD` | Dados do mesmo keystore |

   > Sem os secrets de keystore o workflow gera APK **não assinado** — o login
   > Google nunca funcionará nesse APK. E o SHA-1 desse keystore PRECISA estar
   > registrado no Firebase (etapa A2).

2. Pelo terminal, se preferir (com o GitHub CLI autenticado):
   ```bash
   gh secret set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --body "123456789-xxx.apps.googleusercontent.com"
   gh secret set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --body "123456789-yyy.apps.googleusercontent.com"
   ```

3. Dispare um build: push na `main` ou **Actions → Build Android & Web →
   Run workflow**, e baixe o APK da pré-release gerada.

---

## Parte D — Expo / EAS (builds `eas build`)

As `EXPO_PUBLIC_*` precisam existir no ambiente do EAS **no momento do build**
(o `eas.json` não define `env`, então configure no projeto EAS):

1. Pelo CLI (repita para `preview` e `production`):
   ```bash
   npx eas env:create --environment production \
     --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID \
     --value "123456789-xxx.apps.googleusercontent.com" \
     --visibility plaintext

   npx eas env:create --environment preview --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "..." --visibility plaintext
   ```
   Ou pelo site: https://expo.dev → seu projeto → **Environment variables**.

2. Confirme que o SHA-1 do keystore do EAS (A1, item 2) foi adicionado no
   Firebase (A2). Se você recriar o keystore no EAS, o SHA-1 muda — registre o novo.

3. Gere o build:
   ```bash
   npx eas build -p android --profile preview     # APK de teste
   npx eas build -p android --profile production  # AAB para a Play Store
   ```

4. **Play Store**: após subir o AAB, confirme que o SHA-1 do **App signing key**
   (A1, item 3) também está no Firebase — sem isso o login falha SÓ na versão
   instalada pela loja.

---

## Parte E — Testar e diagnosticar

1. Instale o build novo, abra **Backup → Conectar Google Drive**.
2. Se algo falhar, a mensagem na tela agora diz a causa exata:

   | Mensagem | Causa | Correção |
   |---|---|---|
   | "Google Client ID nao configurado" | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` não estava no ambiente do build | Partes B/C/D |
   | "Configuracao OAuth invalida (DEVELOPER_ERROR)..." | SHA-1 do certificado deste build não registrado | Partes A1/A2 |

3. Usuários que já tinham conectado antes: **Desconectar → Conectar** de novo
   para renovar os tokens.
