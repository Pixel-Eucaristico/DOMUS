# Linha de Base de Memória — Expo SDK 54 (Android 16)

**Story:** 8.1 — Medir a linha de base e atualizar para o Expo SDK 55  
**Data da coleta:** 25/11/2026  
**Commit base:** `f06162f61a02d3dea678b281907b1347ca3b41cc` (branch `dev`)  
**Plataforma base:** Expo SDK `~54.0.37` · React Native `0.81.5` · React `19.1.0` · Hermes (padrão SDK 54) · New Architecture (`newArchEnabled: true`)  
**Artefato medido:** `android/app/build/outputs/apk/release/app-release.apk` (`versionName=1.9.0`, `versionCode=12`, `minSdkVersion=24`, `compileSdkVersion=36`, `targetSdkVersion=36`)  
**Aparelho:** Samsung Galaxy Tab S9 FE (`SM-X510`, serial `RX2X101N87Y`)  
**Sistema operacional:** Android 16 (`ro.build.version.release=16`, `ro.build.version.sdk=36`, build `BP4A.251205.006.X510XXSGEZI3`, tela `1440×2304`, orientação paisagem `2304×1440`)

---

## 1. Metodologia Reproduzível

1. Gerar o projeto nativo limpo no commit base (`npx expo prebuild --clean --platform android`) e compilar o APK release com JDK 17 (`.\gradlew.bat assembleRelease`), confirmando `versionName='1.9.0'`, `versionCode='12'` e `targetSdkVersion:'36'` via `aapt2 dump badging`.
2. Instalar o APK release no `SM-X510` (`adb -s RX2X101N87Y install -r android/app/build/outputs/apk/release/app-release.apk`).
3. Encerrar completamente o processo (`adb shell am force-stop br.com.pixeleucaristico.domus`), iniciar a frio (`monkey -p br.com.pixeleucaristico.domus -c android.intent.category.LAUNCHER 1`) e aguardar 6 s para o término da splash animada e hidratação do estado (estado local no aparelho: 28 eventos, 1 conta, 1 lista de desejos, tema padrão).
4. Navegar em sequência pelas 4 abas principais e pelos 4 fluxos pesados, aguardando ~3 s após cada transição (4 s ao abrir o preview real da câmera em `Importar NF → QR Code`) e validando o título/conteúdo da tela via `uiautomator dump`.
5. Em cada tela, executar **3 leituras** de `adb shell dumpsys meminfo br.com.pixeleucaristico.domus` com intervalo de **3 segundos** entre amostras.
6. Registrar `TOTAL PSS`, `TOTAL RSS`, `Java Heap`, `Native Heap`, `Graphics`, `Code`, `Private Other` e `System` (em KB e MB, usando `1 MB = 1.024 KB`), adotando o **pico das 3 amostras** por tela como referência para a regra do Epic 8 (**teto máximo de +20% em `TOTAL PSS`** nos saltos para SDK 55, 56 e 57).

> **Observação de sessão:** `Início`, `Contas`, `Desejos`, `Temporada`, `DOMUS IA` e `Sincronizar` foram medidos na mesma sessão contínua; `Importar NF / Câmera` (com câmera ativa via `QR Code`) e `Backup & Restauração` (via `Configurações e Sobre → Configurações → Backup & Restauração`) foram medidos em relançamentos limpos imediatos no mesmo APK e aparelho para garantir navegação verificada pela árvore de UI.

---

## 2. Resumo de Picos por Tela e Teto de +20% (Epic 8)

| Tela / Fluxo | Pico `TOTAL PSS` (KB / MB) | Pico `TOTAL RSS` (KB / MB) | Pico `Java Heap` (KB) | Pico `Native Heap` (KB) | Pico `Graphics` (KB) | Teto +20% `TOTAL PSS` (KB / MB) |
|---|---:|---:|---:|---:|---:|---:|
| **Início** | 281.014 KB (**274,4 MB**) | 388.569 KB (**379,5 MB**) | 17.356 KB | 61.852 KB | 69.097 KB | 337.217 KB (**329,3 MB**) |
| **Contas** | 241.725 KB (**236,1 MB**) | 349.589 KB (**341,4 MB**) | 17.144 KB | 62.568 KB | 25.125 KB | 290.070 KB (**283,3 MB**) |
| **Desejos** | 240.528 KB (**234,9 MB**) | 348.305 KB (**340,1 MB**) | 17.268 KB | 61.080 KB | 25.125 KB | 288.634 KB (**281,9 MB**) |
| **Temporada** | 259.842 KB (**253,8 MB**) | 368.841 KB (**360,2 MB**) | 20.648 KB | 68.184 KB | 30.697 KB | 311.810 KB (**304,5 MB**) |
| **DOMUS IA** | **303.734 KB (296,6 MB)** | **413.353 KB (403,7 MB)** | 29.052 KB | 86.128 KB | 41.017 KB | **364.481 KB (355,9 MB)** |
| **Backup & Restauração** | 290.924 KB (**284,1 MB**) | 398.705 KB (**389,4 MB**) | 30.628 KB | 71.924 KB | 48.849 KB | 349.109 KB (**340,9 MB**) |
| **Sincronizar** | 301.851 KB (**294,8 MB**) | 412.101 KB (**402,4 MB**) | 24.636 KB | 86.912 KB | 40.733 KB | 362.221 KB (**353,7 MB**) |
| **Importar NF / Câmera** | 298.585 KB (**291,6 MB**) | 408.330 KB (**398,8 MB**) | 22.124 KB | 73.820 KB | 58.418 KB | 358.302 KB (**349,9 MB**) |

- **Pico global da linha de base SDK 54:** `303.734 KB` (**296,6 MB** `TOTAL PSS`, registrado em `DOMUS IA`) e `413.353 KB` (**403,7 MB** `TOTAL RSS`).
- **Teto global de bloqueio (+20% `TOTAL PSS`):** `364.481 KB` (**355,9 MB**). Qualquer tela acima do seu teto individual de +20% (ou pico global acima de `355,9 MB`) nas medições das Stories 8.2, 8.4 ou 8.6 exige investigação antes de avançar de SDK.
- **Leitura por coluna:** os valores de pico exibidos em cada coluna da tabela acima representam o máximo independente entre as 3 amostras de cada tela (não necessariamente oriundos da mesma amostra; ver tabela de leituras brutas na Seção 3).

---

## 3. Leituras Brutas (3 Amostras por Tela)

| Tela / Fluxo | Amostra | `TOTAL PSS` (KB / MB) | `TOTAL RSS` (KB / MB) | `Java Heap` (KB) | `Native Heap` (KB) | `Graphics` (KB) | `Code` (KB) | `Private Other` (KB) | `System` (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Início** | #1 | 280.140 (273,6 MB) | 383.813 (374,8 MB) | 17.356 | 61.852 | 69.097 | 91.444 | 28.344 | 9.111 |
| **Início** | #2 | **281.014 (274,4 MB)** | **388.569 (379,5 MB)** | 15.104 | 61.780 | 69.097 | 91.492 | 28.384 | 12.237 |
| **Início** | #3 | 280.978 (274,4 MB) | 388.533 (379,4 MB) | 15.056 | 61.784 | 69.097 | 91.492 | 28.388 | 12.237 |
| **Contas** | #1 | **241.725 (236,1 MB)** | **349.589 (341,4 MB)** | 17.144 | 62.568 | 25.125 | 92.224 | 29.264 | 12.384 |
| **Contas** | #2 | 239.161 (233,6 MB) | 347.025 (338,9 MB) | 15.412 | 61.720 | 25.125 | 92.224 | 29.272 | 12.384 |
| **Contas** | #3 | 238.871 (233,3 MB) | 346.741 (338,6 MB) | 15.148 | 61.720 | 25.125 | 92.216 | 29.264 | 12.394 |
| **Desejos** | #1 | **240.528 (234,9 MB)** | **348.305 (340,1 MB)** | 17.268 | 61.080 | 25.125 | 92.200 | 29.368 | 12.459 |
| **Desejos** | #2 | 238.283 (232,7 MB) | 346.069 (338,0 MB) | 15.324 | 60.780 | 25.125 | 92.200 | 29.364 | 12.462 |
| **Desejos** | #3 | 238.977 (233,4 MB) | 347.613 (339,5 MB) | 15.760 | 60.716 | 25.125 | 92.284 | 29.440 | 12.552 |
| **Temporada** | #1 | **259.842 (253,8 MB)** | **368.841 (360,2 MB)** | 20.648 | 68.184 | 30.693 | 93.060 | 31.272 | 12.809 |
| **Temporada** | #2 | 257.182 (251,2 MB) | 366.193 (357,6 MB) | 18.220 | 68.112 | 30.693 | 93.076 | 31.080 | 12.825 |
| **Temporada** | #3 | 256.195 (250,2 MB) | 365.213 (356,7 MB) | 17.228 | 68.112 | 30.697 | 93.076 | 31.088 | 12.834 |
| **DOMUS IA** | #1 | **303.734 (296,6 MB)** | **413.353 (403,7 MB)** | 29.052 | 86.128 | 41.017 | 93.748 | 37.724 | 13.065 |
| **DOMUS IA** | #2 | 294.034 (287,1 MB) | 403.653 (394,2 MB) | 19.824 | 85.660 | 41.017 | 93.748 | 37.720 | 13.065 |
| **DOMUS IA** | #3 | 292.617 (285,8 MB) | 402.689 (393,3 MB) | 18.928 | 85.616 | 41.017 | 93.356 | 37.712 | 13.004 |
| **Backup & Restauração** | #1 | **290.924 (284,1 MB)** | **398.705 (389,4 MB)** | 30.628 | 71.924 | 48.849 | 93.888 | 32.324 | 10.347 |
| **Backup & Restauração** | #2 | 283.063 (276,4 MB) | 391.677 (382,5 MB) | 18.980 | 71.440 | 48.849 | 93.916 | 36.316 | 10.598 |
| **Backup & Restauração** | #3 | 282.635 (276,0 MB) | 392.101 (382,9 MB) | 18.628 | 71.084 | 48.849 | 93.920 | 36.408 | 10.706 |
| **Sincronizar** | #1 | **301.851 (294,8 MB)** | **412.101 (402,4 MB)** | 24.636 | 86.912 | 40.733 | 93.740 | 39.772 | 13.098 |
| **Sincronizar** | #2 | 295.940 (289,0 MB) | 406.205 (396,7 MB) | 18.896 | 86.748 | 40.733 | 93.724 | 39.764 | 13.115 |
| **Sincronizar** | #3 | 293.879 (287,0 MB) | 404.149 (394,7 MB) | 17.756 | 85.848 | 40.733 | 93.724 | 39.756 | 13.118 |
| **Importar NF / Câmera** | #1 | 297.162 (290,2 MB) | 405.974 (396,5 MB) | 22.124 | 73.792 | 58.418 | 97.312 | 31.644 | 10.308 |
| **Importar NF / Câmera** | #2 | **298.585 (291,6 MB)** | **408.330 (398,8 MB)** | 19.020 | 73.820 | 58.418 | 97.352 | 35.840 | 10.699 |
| **Importar NF / Câmera** | #3 | 297.939 (291,0 MB) | 407.726 (398,2 MB) | 18.932 | 73.196 | 58.418 | 97.352 | 35.896 | 10.741 |

---

## 4. Observações Técnicas da Linha de Base

- **`Início` (logo após cold start):** `Graphics` fica em `69.097 KB` (~67,5 MB) por conta dos buffers de renderização da splash animada e do widget Lottie (`Troféu do Mês`), reduzindo para ~25 MB ao alternar para `Contas`/`Desejos`.
- **`DOMUS IA` e `Sincronizar`:** representam o maior `Native Heap` (`~86–87 MB`) e maior `TOTAL PSS` (`~295–297 MB`), estabilizando ~7–10 MB abaixo do pico inicial após o GC de `Java Heap` nas amostras #2 e #3.
- **`Importar NF / Câmera`:** mantém `Graphics` elevado (`58.418 KB`, ~57,0 MB) e `Code` em `97.352 KB` (~95,1 MB) com o preview ativo da câmera (`QR Code` / `Cód. Barras` / `Galeria` / `Digitar Chave`), permanecendo estável nas 3 leituras (`290,2–291,6 MB`). Esta coleta exercitou especificamente o preview de `QR Code` (`expo-camera`), disponível no build `release` — não o fluxo `OCR — Foto` (`react-native-vision-camera`/ML Kit), restrito a `__DEV__` na tela inicial de importação.
