# Verificação do AAB Assinado — DOMUS `1.10.0` (`versionCode: 13`)

**Escopo:** Release pós-Epic 8 (`Expo SDK 57` + `Credential Manager` / `AuthorizationClient` + reconexão explicada do Google Drive + correções das retrospectivas dos Epics 1, 8 e 13)  
**Data:** 27/11/2026  
**Branch / Commit:** `dev` (`e94d0c312a9bc35c7b2da2e56c413d283e5095da`)  
**Run do GitHub Actions:** [`46042996594`](https://github.com/Pixel-Eucaristico/DOMUS/actions/runs/46042996594) (`Build Android & Web`, 100% verde — `Gate` 2m20s, `Build Release APK + AAB` 28m00s, `Build Web` 1m46s)  
**Artefatos gerados (`domus-android-1.10.0-e94d0c3`):**
- `domus-v1.10.0-e94d0c3.aab` (`131.315.559` bytes) — cópia local salva em `C:\Users\willianquintino\Downloads\domus-1.10.0\domus-android-1.10.0-e94d0c3\domus-v1.10.0-e94d0c3.aab`
- `domus-v1.10.0-e94d0c3.apk` (`229.672.209` bytes)

## 1. Assinatura de Upload (Produção — credencial oficial `YcceuoCtWl`)

- **Verificação no workflow:** `Check signing secrets` e `Verify APK certificate` aprovados (`apksigner`, sem `CN=Android Debug`).
- **Inspeção local (`keytool -printcert -jarfile domus-v1.10.0-e94d0c3.aab`):**
  - Entrada de assinatura: `META-INF/A2DE3E38.RSA` (`SHA256withRSA`, RSA 2048 bits)
  - Número de série: `651b6f53dfd0e979`
  - Validade: `08/03/2026` até `24/07/2053`
  - **SHA-1:** `27:FD:78:69:3F:03:BF:62:05:43:65:D9:1C:97:B1:7E:1C:B0:64:9F`
  - **SHA-256:** `C1:F6:31:12:D4:10:A7:BA:08:77:86:5C:24:67:6C:E9:D2:90:38:93:D4:F1:AA:D8:2C:9B:58:95:86:68:62:95`

## 2. Metadados e Target API (`aapt2 dump badging`)

- **Package:** `br.com.pixeleucaristico.domus`
- **Versão:** `versionName='1.10.0'`, `versionCode='13'`
- **SDKs:** `minSdkVersion='24'`, `compileSdkVersion='36'`, `targetSdkVersion='36'` (`platformBuildVersionName='16'`)
- **Permissões bloqueadas:** `0` ocorrências de `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `RECEIVE_BOOT_COMPLETED` ou `SYSTEM_ALERT_WINDOW`.

## 3. Auditoria do Bundle JS no AAB (`base/assets/index.android.bundle`)

- Tamanho do bundle: `23.957.772` bytes
- **`GOCSPX-`:** `0` ocorrências
- **`CLIENT_SECRET`:** `0` ocorrências
- **Marcador `domus-backup` (leitura íntegra):** `2` ocorrências confirmadas
- **ID de Associado Amazon (`willianquin03-20`):** `1` ocorrência confirmada

## 4. Próximo passo manual (Google Play Console → Story 1.8)

1. Enviar `domus-v1.10.0-e94d0c3.aab` (`C:\Users\willianquintino\Downloads\domus-1.10.0\domus-android-1.10.0-e94d0c3\domus-v1.10.0-e94d0c3.aab`) no Google Play Console e confirmar aceitação com `targetSdkVersion=36`.
2. Sincronizar a ficha da loja (`PLAY_STORE_LISTING.md`), o formulário *Data safety* (`docs/data-safety.md`) e a política hospedada em `https://pixel-eucaristico.com.br/domus/privacy`.
3. Após adoção da versão `1.10.0` nos aparelhos ativos, revogar o `client_secret` antigo no Google Cloud Console para concluir a **Story 1.8** e encerrar o **Epic 1**.
