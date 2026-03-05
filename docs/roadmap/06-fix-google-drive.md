# Tarefa 06 - Corrigir Conexao Google Drive no APK

## Prioridade: MEDIO-COMPLEXO | Urgencia: CRITICA
## Estimativa: ~4-6h | Arquivos: ~4

---

## Problema
A conexao com Google Drive nao funciona no APK buildado. O erro diz "parametros incorretos" (incorrect parameters). Provavelmente OAuth Client ID misconfigured.

## Diagnostico Detalhado

### Fluxo do Erro
```
Usuario toca "Conectar Google Drive"
  -> useGoogleDriveBackup.ts: Google.useAuthRequest() com clientIds
  -> OAuth flow abre (usuario autentica com sucesso)
  -> Tokens salvos com clientId armazenado
  -> App tenta upload de backup -> precisa refresh token
  -> GoogleDriveService.refreshAccessToken() chamado
  -> POST para https://oauth2.googleapis.com/token
  -> Google rejeita: "incorrect parameters" / "invalid_client"
```

### Causa Raiz Provavel

#### 1. Tipo de Client ID Errado no Google Cloud Console
O `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (`758261047391-mbe9r0bs8t35fvdvthp0d7hqviu9tgbf.apps.googleusercontent.com`) pode ter sido criado como tipo **"Web application"** ao inves de **"Android"**.

**Para Android nativo, o client deve ser:**
- Tipo: **Android**
- Package: `br.com.pixeleucaristico.domus`
- SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

#### 2. Refresh Token com Client ID Incompativel
```typescript
// useGoogleDriveBackup.ts:78-79
const clientId = IOS_CLIENT_ID || ANDROID_CLIENT_ID || WEB_CLIENT_ID;
```
O clientId e armazenado nos tokens salvos e reutilizado no refresh. Se o tipo nao bate, Google rejeita.

#### 3. Redirect URI Mismatch
```typescript
// useGoogleDriveBackup.ts:44-48
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: "orcafacil",
  path: "oauthredirect",
});
// Resultado no APK: orcafacil://oauthredirect
```
Este URI precisa estar registrado exatamente no Google Cloud Console.

### Arquivos Envolvidos
| Arquivo | Papel |
|---------|-------|
| `src/hooks/useGoogleDriveBackup.ts` | OAuth setup + client ID selection |
| `src/modules/backup/infrastructure/GoogleDriveService.ts` | Token refresh + API calls |
| `.env` | Client IDs configurados |
| `app.json` | Package name |

### Configuracao Atual (.env)
```
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID="758261047391-..."
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=""     # VAZIO
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=""     # VAZIO
```

## Solucao Proposta

### Passo 1: Verificar Google Cloud Console
1. Acessar https://console.cloud.google.com/apis/credentials
2. Localizar o client ID `758261047391-mbe9r0bs8t35fvdvthp0d7hqviu9tgbf`
3. Verificar tipo: DEVE ser **"Android"** (nao "Web application")
4. Verificar package name: `br.com.pixeleucaristico.domus`
5. Verificar SHA-1 fingerprint: deve corresponder a chave de assinatura do APK

### Passo 2: Criar Client IDs Corretos (se necessario)
- **Android client:** tipo Android, com package e SHA-1 do keystore
- **Web client:** tipo Web application (necessario para refresh token em alguns fluxos)
  - Redirect URI: `https://auth.expo.io/@user/orcafacil`

### Passo 3: Obter SHA-1 do Keystore
```bash
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
# Para release:
keytool -list -v -keystore <path-to-release-keystore>
```

### Passo 4: Atualizar .env
```
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID="<novo-android-client-id>"
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="<novo-web-client-id>"
```

### Passo 5: Limpar Tokens Cacheados
Usuarios afetados precisam desconectar e reconectar o Google Drive para limpar tokens invalidos.

### Passo 6: Adicionar Logging de Debug
Em `GoogleDriveService.ts`, logar qual client ID esta sendo usado e qual erro exato o Google retorna.

## Referencia Doc Oficial
- OAuth Android: https://developers.google.com/identity/protocols/oauth2/native-app
- Expo AuthSession: https://docs.expo.dev/versions/latest/sdk/auth-session/
- Google Drive API: https://developers.google.com/drive/api/guides/about-sdk

## Historico de Tentativas
Commits anteriores mostram tentativas de fix:
- `d62e8f0` (Mar 3): "fix: usar proxy Expo no redirect URI"
- `aa1dfad` (Mar 3): "fix: usar redirect URI explicito"
- `000c643`: "feat: backup automatico no Google Drive"
