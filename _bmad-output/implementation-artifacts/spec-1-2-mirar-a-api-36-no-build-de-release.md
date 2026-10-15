---
title: 'Story 1.2: Mirar a API 36 no build de release'
type: 'chore'
created: '2026-10-15'
status: 'done'
baseline_commit: '9e345a19ab43d8e5425e4036587578ebef2c5310'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/docs/decisoes-do-dono.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `app.json` declara `compileSdkVersion` 35 e `targetSdkVersion` 35, e a Play exige target 36 (prazo interno 25/10/2026, final 01/11/2026). Além disso, `expo-doctor` está em 17/18 (4 pacotes do SDK 54 com patch novo) e o patch do `expo-asset` é de 12.0.12 enquanto o lockfile resolve 12.0.13 (aviso do `patch-package`).

**Approach:** Subir `compileSdkVersion` e `targetSdkVersion` para 36 em `expo-build-properties`, atualizar os 4 pacotes pelo `npx expo install --check` (com `package-lock.json`) e regerar o patch do `expo-asset`. Provar o target 36 com `expo prebuild` local e com o APK/AAB gerado pela CI.

**Decisões do dono:** commits sobre `origin/dev` e push direto (sem branch por story); o escopo inclui o `expo install --check` e o patch do `expo-asset`.

## Boundaries & Constraints

**Always:** manter `minSdkVersion` 24; manter o lockfile único do npm (`package-lock.json`, a CI roda `npm ci`); trabalhar num worktree detached de `origin/dev`.

**Never:** mudar `version` ou `versionCode` (Story 1.6); subir o Expo SDK (Epic 8); editar `android/` ou `ios/`; alterar o GitLab CI, `packages/sync`, `replit.*`; dar `git push` ou disparar workflow sem confirmação do dono.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Prebuild | `app.json` com 36 | `android/` gerado declara `compileSdkVersion` e `targetSdkVersion` 36 | Erro do prebuild: parar e reportar |
| Patches | `npm ci` na árvore nova | os 4 patches aplicam sem aviso de versão | Patch falha: parar, listar o erro |
| CI | `workflow_dispatch` na `dev` | `assembleRelease` e `bundleRelease` verdes; `aapt2 dump badging` do APK mostra `targetSdkVersion:'36'` | Build vermelho: reportar o log, não mascarar |

</frozen-after-approval>

## Code Map

- `app.json:55-61` -- `expo-build-properties`: `compileSdkVersion` e `targetSdkVersion` 35 → 36
- `package.json`, `package-lock.json` -- `expo` 54.0.36→~54.0.37, `expo-constants` 18.0.13→~18.0.14, `expo-file-system` 19.0.23→~19.0.24, `expo-local-authentication` 17.0.8→~17.0.9
- `patches/expo-asset+12.0.12.patch` -- renomear/regerar para 12.0.13 (`npx patch-package expo-asset`)
- `plugins/withOrientationFix.js`, `plugins/withGwpAsan.js` -- só leitura: não fixam SDK 35; não mudam
- `.github/workflows/build-android.yml` -- só leitura: dispara em `main`, tags e `workflow_dispatch`; release só em `main` ou tag, então disparar na `dev` apenas anexa APK/AAB como artefatos
- Ambiente local: sem JDK; Android SDK com platforms 34 e 36; build completo só na CI

## Tasks & Acceptance

**Execution:**
- [x] `app.json` -- trocar `compileSdkVersion` e `targetSdkVersion` para 36 -- exigência da Play
- [x] `package.json`, `package-lock.json` -- `npx expo install --check` e aplicar as 4 atualizações -- `expo-doctor` 18/18
- [x] `patches/expo-asset+12.0.12.patch` -- regerar para a versão instalada e apagar o antigo -- limpar o aviso do `patch-package`
- [x] `npx expo prebuild --platform android --no-install` em cópia descartável -- provar o target 36 sem JDK
- [x] `npx tsc --noEmit`, `npx vitest run`, `npx expo lint`, `npx expo-doctor` -- sem regressão
- [x] commits por tema sobre `origin/dev` -- sem push nesta etapa
- [ ] publicar e disparar `build-android.yml` na `dev` -- só com confirmação; verificar `targetSdkVersion` do APK com `aapt2`

**Acceptance Criteria:**
- Given `app.json` com `targetSdkVersion` 35, when altero `expo-build-properties` para 36 e `compileSdkVersion` 36, then o build de release gera um AAB que declara target 36.
- Given a árvore atualizada, when rodo `npm ci`, then o `patch-package` aplica os 4 patches de `patches/` sem erro.
- Given o push na `dev`, when disparo o workflow Android, then ele termina verde.

## Implementation Notes

- Trabalhar no worktree `/private/tmp/claude-501/-Users-epj-Documents-Code-outros-DOMUS/9034a734-1b16-4306-ba4b-8975b6828bb5/scratchpad/w-1-2` (detached em `9e345a1`, `node_modules` já instalado com `npm ci`).
- Sem `git push` nesta etapa. Commits locais com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` e `Claude-Session: https://claude.ai/code/session_01Uh4mHTXHGNTysswjGRf5QF` no fim da mensagem.
- Linha de base medida na `dev`: `tsc` 0 erros, `vitest` 620 passam e 1 falha (`season`, depende da data), lint 0 erros e 1 aviso.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| E1/E2/E7/V3/B3 patch do `expo-asset` x lockfile (12.0.12 vs 12.0.13) | false | `package.json` pede `~12.0.13` e o lockfile resolve 12.0.13; `npm ci` imprime `expo-asset@12.0.13 ✔` sem aviso. Os revisores leram o checkout principal, defasado. |
| E8 patch copiado e não regerado | false | O patch aplica limpo em 12.0.13; só mudou a linha `index`, porque o arquivo upstream é o mesmo. |
| E3/V5/B4 `agent-cli-detector` novo, sem vetting | false | `npm view`: repositório `expo/agent-cli-detector`, mantido pela equipe da Expo, puxado por `@expo/cli@54.0.27`; `npm audit signatures`: 1.452 pacotes com assinatura verificada. |
| E4 `vitest/node_modules/yaml` removido do lock | false | `vitest run` no baseline: 620 passam, 1 falha (`season`). |
| E6 licença do `@expo/xcpretty` mudou no lock | low | Só metadado vindo do upstream; sem efeito no build. |
| E5/V1/B2 sem prova de que o build API 36 funciona | maybe-false | Prebuild local declara `compileSdkVersion=36` e `targetSdkVersion=36`; falta o `assembleRelease`/`bundleRelease` real (sem JDK local). Fica na tarefa pendente de disparar `build-android.yml` na `dev`. |
| V1 sem teste automatizado de target SDK | low | A story é de configuração; a prova é o prebuild e a CI. Gate automático é escopo da Story 2.8. |
| B1 predictive back por padrão no target 36 | medium | Real e fora do alcance do diff: comportamento de runtime, a validar no aparelho. Vai para a checklist da Story 1.3 (D6). |
| B1 trava de orientação ignorada em telas grandes | false | `app.json` tem `"orientation": "default"`, sem trava de retrato; a trava do scanner ML Kit já é removida por `withOrientationFix`. |
| B2 AGP/Gradle e plataforma 36 não fixados | false | Expo SDK 54 mira API 36 por padrão (PRD); o prebuild gerou o projeto sem erro. |
| B2 `eas.json`, plugins ou docs fixam 35 | low | Só `docs/firebase-analytics-performance.md:293` mostrava 35: corrigido (commit `e9597f1`). `.gitlab-ci.yml` usa `ANDROID_COMPILE_SDK: "34"`: legado, não tocar (AD-11). |
| B4 churn de ~150 linhas no lockfile | low | Transitivas movidas dentro do semver pelo `npm install` (tar, undici etc.); inevitável sem fixar tudo; assinaturas verificadas. |
| B5 bumps Expo parciais, sem `--check`/doctor | false | `expo install --check` lista exatamente os 4 pacotes; `expo-doctor` 18/18. |
| B6 `yarn.lock`, modo 100755, baseline no Node 20 | false | `yarn.lock` foi removido pela `main`; o modo do lockfile é pré-existente; as deps novas exigem Node >=18; `tsc`/`vitest` no baseline. |

**Rota:** nenhum `intent_gap` nem `bad_spec`. Um `patch` (doc com SDK 35, commit `e9597f1`, aplicado direto por ser uma linha). Um `defer` (D6: checklist do Android 16 para a Story 1.3). O resto foi rejeitado como `false`/`low`. `maybe-false` de prova do build real fica na tarefa de CI pendente. Sem loopback (`review_loop_iteration` = 0).

## Verification

**Commands:**
- `npx expo-doctor` -- expected: 18/18
- `npx expo prebuild --platform android --no-install` (cópia descartável) -- expected: `compileSdkVersion` e `targetSdkVersion` 36 no `android/`
- `npm ci` -- expected: 4 patches aplicados, sem aviso de versão
- `npx tsc --noEmit` -- expected: 0 erros
- `npx vitest run` -- expected: só a falha de `season`
- `aapt2 dump badging <apk>` -- expected: `targetSdkVersion:'36'`
