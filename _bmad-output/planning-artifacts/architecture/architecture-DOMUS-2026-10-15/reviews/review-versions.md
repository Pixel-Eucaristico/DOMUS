# Revisão de versões e realidade — ARCHITECTURE-SPINE (DOMUS)

Data: 2026-10-15. Escopo: tabela Stack, tecnologias nomeadas, afirmações de CI/deploy e de serviços. Spine e código não foram editados.
Métodos: leitura de `package.json`, `eas.json`, `app.json`, workflows, `.gitlab-ci.yml`, `src/modules`, `server/`; WebSearch (resultados de busca, não páginas oficiais lidas).
Limitação: não há `node_modules`, então não foi possível ler versões instaladas nem rodar `npm ls`/`expo-doctor`.

## Veredito

A tabela Stack bate linha a linha com o `package.json`, mas é só espelho do manifesto: o spine não registra que o Expo SDK 54 já está duas versões atrás (55 em fev/2026, 56 em mai/2026) nem que o Tamagui está no rc.26 enquanto a web mostra rc.41; as afirmações de CI/deploy estão parcialmente imprecisas.

## 1. Conferência da tabela Stack contra package.json

| Item do spine | package.json | Resultado |
| --- | --- | --- |
| Expo SDK ~54.0.33 | `expo ~54.0.33` | confere |
| React Native 0.81.5 | `react-native 0.81.5` | confere |
| React 19.1.0 | `react 19.1.0` (e react-dom 19.1.0) | confere |
| TypeScript ~5.9.2 | devDeps `typescript ~5.9.2` | confere |
| Expo Router ~6.0.23 | `expo-router ~6.0.23` | confere |
| expo-sqlite ^16.0.10 | `^16.0.10` | confere |
| nostr-tools ^2.23.1 | `^2.23.1` | confere |
| Vitest ^4.0.18 | `^4.0.18` (em `dependencies`, não em devDependencies) | confere (ressalva abaixo) |
| Tamagui ^2.0.0-rc.26 | `tamagui`, `@tamagui/core`, `@tamagui/config` todos `^2.0.0-rc.26` | confere |
| Express ^5.0.1 | `^5.0.1` | confere |
| Node (CI) 20 | `node-version: 20` em build-android.yml (2x), build-ios.yml; `NODE_VERSION: "20"` no GitLab | confere, mas sem patch (ver achado 4) |

Ausentes da tabela e que carregam decisões: `@react-native-firebase/*` 23.8.6, `react-native-reanimated ~4.1.1`, `react-native-worklets 0.5.1`, `drizzle-orm ^0.39.3`, `pg`, `react-native-vision-camera`, `expo-dev-client`, new architecture ligada (`newArchEnabled: true`), `reactCompiler: true`, `babel-plugin-react-compiler` em versão beta pinada por data (`19.0.0-beta-e993439-20250117`).

## 2. Confirmação contra a web

- Expo SDK 54 existe e é a última versão com Legacy Architecture; SDK 55 saiu em 25/02/2026 (RN 0.83, React 19.2) e SDK 56 em 21/05/2026 (RN 0.85, React 19.2, Hermes V1 padrão). Em out/2026 o SDK 54 está a duas versões do atual. Confirmado só por resultados de busca; não li a política oficial de suporte do Expo.
- Tamagui 2.0.0-rc.26 existe, mas a busca mostra rc.41 como mais recente. O spine/`package.json` estão ~15 candidatas atrás. Não confirmei se 2.0 estável já saiu.
- expo-sqlite 16, Vitest 4, nostr-tools 2.23, Express 5: não confirmados na web (nenhuma busca feita). Sem evidência de problema, mas também sem checagem. Consta apenas que existem no `package.json`.
- Requisito do Google Play de target API: a busca só retornou o requisito de API 35 (2025). O `app.json` fixa `compileSdkVersion` e `targetSdkVersion` em 35. Não confirmei o requisito para 2026; não confirmado.

## 3. Verificação no repo

| Afirmação do spine | Realidade |
| --- | --- |
| EAS workflows: preview APK, produção AAB/iOS, deploy web | `.eas/workflows/build.yml` (push em main, preview APK), `create-production-builds.yml` (sem trigger `on:`, só manual; android+ios), `deploy-web.yml` (push em main). `eas.json`: preview apk, production app-bundle. Confere. |
| GitHub Actions: APK, AAB, Web | `build-android.yml` faz APK + AAB (`assembleRelease bundleRelease`) + Web. Existe também `build-ios.yml` (macOS, archive sem assinatura, em tags `v*`), que o spine omite. |
| GitLab CI: APK debug/release, iOS em runner macOS | `build:android` (debug), `build:android:release`, `build:ios` existem. Runner macOS do iOS não verificado. |
| Firebase Crashlytics, Analytics, Performance instalados | Instalados no `package.json` e no `app.json`; no código só `AnalyticsService.ts` importa `@react-native-firebase`. Crashlytics e Perf instalados sem uso visível em `src/app/packages`. |
| Google Drive (backup) | `src/modules/backup/infrastructure/GoogleDriveService.ts` e `GoogleOAuthWeb.ts` existem. Confere. |
| Provedores de IA "Gemini e outros" | `AIProviderFactory` tem openai, gemini, claude, deepseek, qwen. O spine pode nomear os cinco. |
| Express "server estático" | `server/` tem `db.ts`, `syncRoutes.ts`, `routes.ts`, `storage.ts` com drizzle/pg/Neon. Já é mais que servidor estático (o spine reconhece em Deferred, mas a tabela Stack diz só "server estático"). |
| Sem script `test`/`typecheck`; ESLint ignora `packages/*` | Confirmado (`eslint.config.js` ignora `packages/*`; `vitest.config.ts` existe; scripts sem `test`). |
| Tamagui em uso | Usado em `src/components/tamagui/*` e em telas. Confere. |

Ressalva de lockfile: `package-lock.json` e `yarn.lock` estão versionados e o `AGENTS.md` diz que o desenvolvimento local usa pnpm. O spine não registra qual é o gestor canônico.

## Achados

1. **[high] Expo SDK 54 desatualizado e sem decisão registrada.** Dois SDKs novos saíram; SDK 54 é o último com Legacy Architecture. O spine lista "~54.0.33" como fato, sem dizer se é fixação deliberada. Correção: acrescentar nota/decisão "SDK 54 fixado até X" com motivo e gatilho de upgrade (SDK 55 remove `newArchEnabled`; patches de `expo-asset`, `expo-audio`, `react-native-keyboard-controller`, `rn-tourguide` precisam ser reavaliados), e confirmar a política de suporte do Expo/EAS na fonte oficial.
2. **[medium] Tamagui em release candidate, defasado.** Spine/`package.json` em rc.26, web mostra rc.41; é pré-release que sustenta toda a UI tokenizada. Correção: marcar na tabela como "RC, não estável", registrar risco/gatilho para 2.0 estável e conferir o changelog entre rc.26 e a versão atual.
3. **[medium] Diagrama de CI/deploy incompleto e sem estado de uso.** Falta o `build-ios.yml` do GitHub Actions; `create-production-builds.yml` é manual; três pipelines paralelos (EAS, GitHub, GitLab) sem dizer qual é canônico. Correção: listar os workflows reais, o gatilho de cada um e declarar a fonte de verdade de release.
4. **[medium] "Node (CI) 20" sem patch e sem alinhamento com o SDK.** Não há `.nvmrc` nem `engines`; "20" flutua. Não confirmei o Node mínimo do Expo SDK 54/RN 0.81. Correção: verificar o requisito oficial, fixar versão (`.nvmrc`/`engines`) e registrar na tabela.
5. **[low] Tabela Stack omite o que bate com regras e decisões.** Faltam Firebase 23.8.6, reanimated/worklets, drizzle/pg, nova arquitetura, React Compiler beta pinado e Vitest em `dependencies` (vai no bundle de produção, deveria ser dev). Também: `compileSdk/targetSdk 35` sem confirmação do requisito de 2026 do Google Play (não confirmado). Correção: ampliar a tabela com as dependências que sustentam decisões e confirmar o requisito do Play.

## Não confirmado (pode estar desatualizado)

- Versões atuais de expo-sqlite, Vitest, nostr-tools, Express 5, react-native-firebase, drizzle-orm 0.39 (não consultados).
- Existência de Tamagui 2.0 estável.
- Política oficial de suporte do Expo para SDK 54 e requisito de target API do Google Play em 2026.
- Node mínimo exigido por Expo SDK 54.
- Versões realmente instaladas (sem `node_modules`; `package.json` usa ranges `^`, então o lockfile manda).
- Runner macOS do GitLab para iOS.
- Nenhuma fonte de starter foi usada (projeto brownfield, sem starter).
