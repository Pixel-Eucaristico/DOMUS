# Checklist de Validação — Android 16 (API 36)

**Story:** 1.3 — Validar no Android 16 e corrigir o que quebrar  
**Data da execução:** 24–25/11/2026  
**Checklist complementar (Epic 13 — Teclado):** [Checklist de Validação de Teclado — Android 16 e Web (Story 13.7)](./checklist-teclado-android-16.md)  
**Commit base:** `4ef3eda9c7df6356b3bc5d764d29028955bcd6a8` (branch `dev`)  
**Aparelho validado:** Samsung Galaxy Tab S9 FE (`SM-X510`, serial `RX2X101N87Y`)  
**Sistema:** Android 16 (`ro.build.version.release=16`, `ro.build.version.sdk=36`, `arm64-v8a`, `1440×2304`, tela grande com barra de tarefas One UI)  
**Builds validados:**
- `release`: `android/app/build/outputs/apk/release/app-release.apk` (`versionCode=11`, `versionName=1.8.0`, `minSdkVersion=24`, `targetSdkVersion=36`, `compileSdkVersion=36`)
- `debug`: `android/app/build/outputs/apk/debug/app-debug.apk` (conectado via Metro para `DebugTools`, disponível apenas em `__DEV__`)

---

## 1. Inspeção do APK Release e Segurança

| Item | Status | Evidência |
|---|---|---|
| `targetSdkVersion` e `compileSdkVersion` = 36 (`aapt2 dump badging`) | ✅ Passou | `minSdkVersion:'24'`, `targetSdkVersion:'36'`, `compileSdkVersion='36'`, `versionCode='11'`, `versionName='1.8.0'` |
| Permissões bloqueadas ausentes no APK (D16) | ✅ Passou | Nenhuma ocorrência de `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `RECEIVE_BOOT_COMPLETED` nem `SYSTEM_ALERT_WINDOW` no `aapt2 dump badging` |
| Ausência de segredo OAuth do Google no `index.android.bundle` (Stories 1.1 / 1.7) | ✅ Passou | Removida a variável pública de segredo OAuth do Google do `.env` local antes do build; inspeção do `assets/index.android.bundle` (`22.7 MB`) confirmou 0 ocorrências de segredo OAuth ou de seu prefixo |

---

## 2. Fluxos Obrigatórios da Story 1.3 (em ordem)

| # | Fluxo | Status | Evidência no `SM-X510` (Android 16 / API 36) |
|---|---|---|---|
| 1 | **Abas principais (`Início`, `Contas`, `Desejos`, `Temporada`) — paisagem e retrato (edge-to-edge e tela grande / D6)** | ✅ Passou | Todas as 4 abas foram abertas e inspecionadas visualmente tanto em paisagem (`2304×1440`) quanto em retrato (`1440×2304`). Cabeçalhos respeitam a barra de status no topo e a barra de abas/FAB ficam acima da barra de tarefas Android 16, com 0 erros fatais no `logcat`. |
| 2 | **Introdução por tela, gesto/botão Voltar e `BackHandler` de holerites (D6 + Mali)** | ✅ Passou *(após correção)* | `WelcomeCarousel`, `ScreenIntroModal` (`Contas`, `Desejos`, `Temporada`, `Sincronizar`, `Configurações`, `Backup`) e modal `Nova conta` abriram sem crash Mali e fecharam via Voltar. Em `app/payslips.tsx` (`Holerites` → `Preencher à mão` → `Revisar holerite`), o único `BackHandler.addEventListener("hardwareBackPress")` do app interceptou o 1º Voltar retornando para `Holerites`, e o 2º Voltar retornou para `Início` (`0` erros do app no `logcat`). **Bug encontrado e corrigido:** pressionar Voltar na tela inicial (`Início`) disparava crash fatal (`NullPointerException` em `ViewGroup.dispatchDetachedFromWindow` durante `handleDestroyActivity`). Corrigido em `patches/react-native-keyboard-controller+1.18.5.patch` e revalidado no APK `release` com 0 erros no `logcat`. |
| 3 | **Câmera / OCR / Scanner NF-e / Holerites (incl. D18 e 2.2)** | ✅ Passou *(câmera, galeria, D18 `http://` SEFAZ e holerites)* / ⚠️ *NFC-e física real pendente do dono (2.2)* | `Importar NF` → `QR Code` abriu preview real da câmera em paisagem e retrato (barra superior abaixo da status bar e botões `Galeria`/`Digitar Chave` acima da taskbar) e encerrou limpo via Voltar. Tela `Holerites` (`Câmera`, `Galeria`, `Preencher à mão`) validada sem erro. **Bug D18 reproduzido e corrigido:** um QR Code `http://` da SEFAZ lido via `Galeria` falhou no WebView em target 36 por bloqueio cleartext (*"Erro ao carregar a página da SEFAZ. Verifique sua conexão."*). Corrigido promovendo `http://` → `https://` em `packages/parsers/src/qrcodeParser.ts` e revalidado no APK `release` com o mesmo QR Code, carregando a página oficial `https://www.nfce.fazenda.sp.gov.br/...` no WebView. A leitura de um cupom fiscal NFC-e físico real (extração de emitente, itens, total e data — Story 2.2) depende de um cupom físico em mãos do dono. |
| 4 | **Backup local, restauração e Google Drive (sem segredo OAuth público)** | ✅ Passou | **Exportação local:** `Backup & Restauração` → `Exportar` exibiu o alerta customizado (`appConfirm`) para exportação sem criptografia, gerou `domus-backup-*.domusbackup` e abriu o compartilhamento nativo do Android 16 sem erro. **Restauração local:** aba `Restaurar` → `Auto-backup local` → `Restaurar auto-backup` → modal `Confirmar restauração` → concluiu com `"16 eventos restaurados com sucesso."` (`0` erros no `logcat`). **Google Drive:** aba `Drive` conectou nativamente via `GoogleSignin.getTokens()` (sem segredo OAuth) e concluiu upload completo (`domus-backup.domusbackup`, `Último sync: 25/11, 00:38`). |
| 5 | **Sync Nostr (Grupo forte)** | ✅ Passou | `Sincronizar` → `Criar grupo` (Segredo forte `DOMUS1-...`) gerou o segredo, conectou aos 6 relays públicos e concluiu o sync (`Sincronizado`, 19 eventos, `25/11 00:49`) sem travar a UI nem erros no `logcat`. Rodapé rola acima da barra de tarefas. |

---

## 3. Critérios Transferidos (D6, D15, D18, Stories 2.2, 2.3 e 2.6)

| Origem | Item | Status | Evidência / Ação tomada |
|---|---|---|---|
| **D6** | Edge-to-edge, predictive back, tela grande e proteção Mali no Android 16 | ✅ Passou *(após correção)* | Validado nas 4 abas em retrato e paisagem, `ScreenIntroModal`, `WelcomeCarousel`, `app/payslips.tsx` (`BackHandler`) e Voltar na `Início` (crash `dispatchDetachedFromWindow` corrigido e revalidado no APK `release`). |
| **D18** | Páginas `http://` da SEFAZ (QR Code) em release target 36 | ✅ Reproduzido, corrigido e revalidado | Reproduzida a falha cleartext no WebView ao ler QR Code `http://` via `Galeria`. Corrigido em `packages/parsers/src/qrcodeParser.ts` (`upgradeSefazHttpToHttps`), testado em `packages/parsers/__tests__/qrcodeParser.test.ts` e revalidado no APK `release` no `SM-X510` (carregou `https://www.nfce.fazenda.sp.gov.br/...` sem erro). |
| **Story 2.2** | Leitura de NFC-e física real (emitente, itens, total, data) | ⚠️ Parcial *(aguarda cupom físico do dono)* | Scanner QR (câmera + galeria), upgrade `https://` da SEFAZ e tela de chave manual validados no Android 16. A validação ponta a ponta com um cupom fiscal físico real permanece pendente para o dono executar com uma nota em mãos (decisão a confirmar na revisão final da Story 1.3). |
| **Story 2.3** | Erro HTTP de IA exibido de forma amigável sem travar o chat | ✅ Passou | Chave inválida configurada em `IA Financeira` (OpenAI) e enviada mensagem no chat `DOMUS IA`: exibiu `"Erro ao consultar openai: Chave de API do OpenAI invalida ou expirada. Verifique sua chave nas configuracoes de IA."` com fallback para análise local, sem travar nem gerar erro fatal no `logcat`. |
| **Story 2.6** | `DebugTools` abre e funciona sem erro | ✅ Passou | Validado no build `debug` (`__DEV__`) no `SM-X510`: botão flutuante abriu o modal `Debug Kitchen Sink` (`ARCHETYPES`, `TROPHIES`, `STATE`, `TRIGGERS`), troca de abas e fechamento por Voltar sem erro no `logcat`. |
| **Story 2.6** | `AnimatedSeasonalTrophy` / troféus Lottie abrem sem erro | ✅ Passou | `Troféu do Mês` em `Início` e `Troféu Surpresa do Mês` (`Consciência no Consumo`) em `Temporada` renderizaram normalmente em paisagem e retrato sem erro no `logcat`. |
| **Story 2.6** | `WishlistSearchWebView` abre e carrega busca web sem erro | ✅ Passou | `Desejos` → nova lista `TesteA16` → `Adicionar Item` → lupa → `Amazon`: `WishlistSearchWebView` carregou `amazon.com.br` por completo (632 nós no WebView), barra superior abaixo da status bar e fechamento limpo via Voltar, 0 erros no `logcat`. |
| **D15** | Medição do PBKDF2 do PIN (30 mil iterações em JS puro / Hermes) | ✅ Medido, corrigido e revalidado | No `SM-X510` (Android 16, Exynos 1380, Hermes), a derivação PBKDF2 de 30.000 iterações superou largamente o limiar de 300 ms (~3–6 s puros de derivação; ~13,2–13,9 s wall-clock com polling `uiautomator`). Corrigido com yield antes do hash (`yieldToPaint`), orquestração pura com guarda contra duplo toque, cancelamento seguro e recuperação de erro em `src/modules/security/application/pinVerificationFlow.ts`, `LockScreen.tsx`, `useSecuritySetup.ts`, `securitySetupReducer.ts` e `app/security-settings.tsx`. **Revalidado no APK `release` no `SM-X510`:** capturadas evidências visuais de `"Salvando PIN…"` e `"Verificando PIN…"` renderizando com `ActivityIndicator` e botão `X` desabilitado antes do fim da derivação (`0` erros no `logcat`). |

---

## 4. Correções Aplicadas Nesta Story

1. **`patches/react-native-keyboard-controller+1.18.5.patch`** (+ teste `patches/__tests__/keyboardControllerPatch.test.ts`):
   - Removida a sobrescrita síncrona de `eventView.removeSelf()` em `removeKeyboardCallbacks()`, que corrompia `mChildren` de `android.R.id.content` durante `ViewGroup.dispatchDetachedFromWindow()` ao pressionar Voltar na tela inicial no Android 16.
   - Mantida a proteção `cleanNullChildren()` em `dispatchDraw()` contra `dispatchGetDisplayList` no Android 16+, com teste validando o parse real pelo `patch-package` (`parsePatchFile`) e o arquivo aplicado em `node_modules`.
2. **`src/modules/security/application/pinVerificationFlow.ts`**, **`src/components/security/LockScreen.tsx`**, **`src/hooks/useSecuritySetup.ts`**, **`src/modules/security/application/securitySetupReducer.ts`** e **`app/security-settings.tsx`** (+ testes `securitySetupReducer.test.ts` e `pinVerificationFlow.test.ts`):
   - Adicionado yield de macrotask (`yieldToPaint`) antes de `pbkdf2Async`, guarda síncrona contra duplo toque, cancelamento seguro em `RESET`/desmontagem, `try/catch` em todos os fluxos assíncronos, tratamento de `locked`/`not_configured` e texto `"Verificando PIN…"` / `"Salvando PIN…"` com botão `X` desabilitado durante a derivação (D15).
3. **`packages/parsers/src/qrcodeParser.ts`** (+ teste `packages/parsers/__tests__/qrcodeParser.test.ts`):
   - Promovidas URLs `http://` da SEFAZ para `https://` (`upgradeSefazHttpToHttps`) para evitar falha cleartext em WebView no Android 16 target 36 (D18).
4. **`packages/wishlist/src/affiliateConfig.ts`** e **`src/components/monetization/AffiliateLinks.ts`** (+ teste `packages/wishlist/__tests__/affiliateConfig.test.ts`) *(ajuste solicitado pelo dono durante a sessão)*:
   - Atualizado o ID de Associado Amazon de `willianquinti-20` para `willianquin03-20` e unificada a URL em `AffiliateLinks.ts` derivando de `AFFILIATE_CONFIG`.
