# Verificação do AAB Assinado — DOMUS `1.9.0` (`versionCode: 12`)

**Stories:** 1.6 (AAB com target 36 para a Play) e pré-validação de bundle da 1.7  
**Data:** 25/11/2026  
**Branch / Commit:** `dev` (`2e2de34f00cc3ca92e3058b899861eae787567cb`)  
**Run do GitHub Actions:** [`45688642633`](https://github.com/Pixel-Eucaristico/DOMUS/actions/runs/45688642633) (`Build Android & Web`, 100% verde)  
**Artefatos gerados:** `domus-v1.9.0-2e2de34.aab` (121.882.857 bytes) e `domus-v1.9.0-2e2de34.apk` (212.173.496 bytes)

## 1. Assinatura de Upload (Produção — mesma credencial `YcceuoCtWl` do EAS)

- **Secrets configurados no GitHub Actions:** `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (exportados sem alteração da credencial oficial `YcceuoCtWl`; cópia local `.jks` preservada e ignorada pelo `.gitignore`).
- **Verificação no workflow:** passo `Verify APK certificate` aprovado (`apksigner`, sem `CN=Android Debug`).
- **Inspeção local (`keytool -printcert -jarfile domus-v1.9.0-2e2de34.aab`):**
  - Entrada de assinatura: `META-INF/A2DE3E38.RSA` (`SHA256withRSA`, RSA 2048 bits)
  - Número de série: `651b6f53dfd0e979`
  - Validade: `08/03/2026` até `24/07/2053`
  - **SHA-1:** `27:FD:78:69:3F:03:BF:62:05:43:65:D9:1C:97:B1:7E:1C:B0:64:9F`
  - **SHA-256:** `C1:F6:31:12:D4:10:A7:BA:08:77:86:5C:24:67:6C:E9:D2:90:38:93:D4:F1:AA:D8:2C:9B:58:95:86:68:62:95`

## 2. Metadados e Target API (`aapt2 dump badging`)

- **Package:** `br.com.pixeleucaristico.domus`
- **Versão:** `versionName='1.9.0'`, `versionCode='12'`
- **SDKs:** `minSdkVersion='24'`, `compileSdkVersion='36'`, `targetSdkVersion='36'` (`platformBuildVersionName='16'`)
- **Permissões bloqueadas:** `0` ocorrências de `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `RECEIVE_BOOT_COMPLETED` ou `SYSTEM_ALERT_WINDOW`.

## 3. Auditoria do Bundle JS no AAB (`base/assets/index.android.bundle`)

- Tamanho do bundle: `22.720.304` bytes
- **Prefixo de segredo OAuth do Google:** `0` ocorrências
- **Nome de variável/campo de segredo OAuth do Google:** `0` ocorrências
- **ID de Associado Amazon (`willianquin03-20`):** `1` ocorrência confirmada
- **Variável pública legada removida também do ambiente `production` no EAS:** confirmada presença apenas de `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` e `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

## 4. Conclusão da Story 1.7 (Verificação sem `client_secret` + Drive real)

- **Auditoria do AAB `1.9.0` (`run 45688642633`, `base/assets/index.android.bundle`, `22.720.304` bytes):** `0` ocorrências de `GOCSPX-`, `0` ocorrências de `CLIENT_SECRET`.
- **Reauditoria no APK release pós-Epic 8 (`Expo SDK 57`, `assets/index.android.bundle`, `24.220.764` bytes, 27/11/2026):** `0` ocorrências de `GOCSPX-`, `0` ocorrências de `CLIENT_SECRET` (`domus-backup` confirmado no bundle); `git grep` em `app/`, `src/`, `components/`, `plugins/`, `modules/`, `.github/` e `app.json` com `0` ocorrências.
- **Validação em Android 16 real (`Samsung Galaxy Tab S9 FE`, `SM-X510`, API 36):**
  - Pré-Epic 8 (`25/11/2026`, `docs/checklist-android-16.md`): conexão nativa ao Google Drive sem `client_secret` e upload completo (`domus-backup.domusbackup`, `Último sync: 25/11, 00:38`).
  - Pós-Epic 8 (`26/11/2026`, Stories 8.8 e 8.9): login moderno via Credential Manager + `AuthorizationClient` (`gamerwyll@gmail.com`), upload completo de `domus-backup.domusbackup` para `appDataFolder` e listagem ao vivo (`26/11/2026, 18:38 · 8,6 KB`) com `0` erros no `logcat`.
- **Próximo passo pós-adoção (Story 1.8):** após confirmar a publicação/adoção da versão sem segredo nos aparelhos ativos, revogar/rotacionar o `client_secret` antigo no Google Cloud Console (mantendo a Story 1.8 em `backlog` até esse marco).
