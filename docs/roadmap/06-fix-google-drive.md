# Tarefa 06 - Corrigir Conexao Google Drive no Android

## Prioridade: MEDIO-COMPLEXO | Urgencia: CRITICA
## Status: DIAGNOSTICADO (2026-07) — causa raiz e de CONFIGURACAO, nao de codigo

---

## Problema
O login com Google (backup no Drive) funcionava e parou de funcionar no Android.

## Fluxo Atual (pos-migracao para Google Sign-In nativo)

Desde `bc8bdae` (mar/2026) o app NAO usa mais `expo-auth-session` no nativo.
O fluxo atual e:

```
Usuario toca "Conectar" (app/backup.tsx)
  -> useGoogleDriveBackup.connectNative()
  -> @react-native-google-signin: GoogleSignin.signIn()
       (configurado com webClientId = EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true -> retorna serverAuthCode)
  -> exchangeCodeForTokens(serverAuthCode)
       POST https://oauth2.googleapis.com/token
       com client_id = WEB_CLIENT_ID e client_secret = EXPO_PUBLIC_GOOGLE_CLIENT_SECRET
  -> tokens salvos no SecureStore (GoogleDriveService)
  -> refresh automatico via refresh_token
```

## Requisitos para o login funcionar no Android

1. **Cliente OAuth "Web application"** no Google Cloud Console.
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` e `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET`
   devem apontar para ele.
2. **Cliente OAuth "Android"** no MESMO projeto do Cloud Console, com:
   - Package: `br.com.pixeleucaristico.domus`
   - SHA-1 do certificado que ASSINA o build instalado.
   O `google-services.json` do repo tem `"oauth_client": []` (vazio) — forte
   indicio de que esse cliente Android nunca foi criado/registrado.
3. **Variaveis de ambiente em tempo de BUILD** (`EXPO_PUBLIC_*` sao embutidas
   no bundle durante o build). O `eas.json` NAO define `env` — as variaveis
   precisam estar configuradas no EAS (dashboard ou `eas env:create`) para os
   perfis `preview` e `production`.

## Por que "funcionava antes e parou"

Causas mais provaveis (nesta ordem):

1. **Play App Signing**: builds `production` sao AAB re-assinados pelo Google
   Play com a chave de App Signing, cujo SHA-1 e DIFERENTE do keystore do EAS.
   Se apenas o SHA-1 do EAS foi registrado, o APK de teste funciona e a versao
   da Play Store falha com `DEVELOPER_ERROR` (code 10).
2. **Env vars ausentes no build**: se `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` ou
   `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` nao estiverem no ambiente do EAS no
   momento do build, o app mostra "Google Client ID nao configurado" ou falha
   na troca do token.
3. **Migracao de fluxo** (`bc8bdae`): o fluxo antigo via `expo-auth-session`
   usava o proxy do Expo e nao exigia cliente Android com SHA-1. O fluxo
   nativo atual EXIGE. Um build gerado apos a migracao sem registrar o
   cliente Android quebra o login.

## Checklist de correcao

- [ ] Cloud Console -> Credentials -> criar cliente **Android** com package
      `br.com.pixeleucaristico.domus` e os **DOIS** SHA-1:
  - [ ] SHA-1 do keystore EAS: `eas credentials` -> Android -> Keystore
  - [ ] SHA-1 do Play App Signing: Play Console -> Test and release ->
        App integrity -> App signing key certificate
- [ ] Confirmar que o cliente Web (ID + secret) esta no mesmo projeto
- [ ] `eas env:create` para `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` e
      `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` (perfis preview e production)
- [ ] Rebaixar `google-services.json` atualizado do Firebase Console (apos
      adicionar os SHA-1 la tambem, o campo `oauth_client` deixa de ser vazio)
- [ ] Gerar novo build e testar: APK preview E versao da Play Store
- [ ] Usuarios afetados: desconectar e reconectar o Drive para renovar tokens

## Melhorias de codigo ja aplicadas (jul/2026)

- `useGoogleDriveBackup.ts`: `DEVELOPER_ERROR` agora exibe mensagem acionavel
  (SHA-1/package nao registrados) em vez de erro generico; troca de token
  valida `CLIENT_SECRET` ausente com mensagem clara.
- `GoogleDriveService.isConnected()`: reconhece sessao web (implicit flow, sem
  refresh token) enquanto o access token nao expirou.
- `.env.example`: documenta `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` e o passo a
  passo de SHA-1/EAS (as variaveis antigas `ANDROID_CLIENT_ID`/`IOS_CLIENT_ID`
  nao sao mais usadas pelo codigo).

## Nota de seguranca

O client secret de um cliente OAuth Web embutido em `EXPO_PUBLIC_*` fica
visivel no bundle do app. Para apps instalados o Google trata esse secret como
nao-confidencial, mas o ideal a medio prazo e mover a troca/refresh de tokens
para um backend proprio ou usar cliente do tipo instalado sem secret.

## Referencia Doc Oficial
- https://react-native-google-signin.github.io/docs/troubleshooting (DEVELOPER_ERROR)
- OAuth Android: https://developers.google.com/identity/protocols/oauth2/native-app
- Google Drive API: https://developers.google.com/drive/api/guides/about-sdk
