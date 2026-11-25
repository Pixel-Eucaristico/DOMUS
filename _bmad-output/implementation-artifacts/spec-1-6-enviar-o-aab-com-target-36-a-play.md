---
title: 'Story 1.6: Enviar o AAB com target 36 à Play'
type: 'chore'
created: '2026-11-25'
status: 'in-progress'
baseline_commit: 'fa38032'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/docs/checklist-android-16.md'
  - '{project-root}/docs/checklist-teclado-android-16.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Com as Stories 1.1 a 1.5 e todo o Epic 13 validados no Android 16 (API 36), o app ainda está em `1.8.0` (`versionCode: 11`) e o workflow `Gate` da CI falhou após `2026-11-20` porque 6 testes legados das Stories 4.3/4.7/4.8 não fixavam `{ now }` antes da data de corte do Grupo antigo.

**Approach:** Corrigir os testes dependentes de data/CRLF para restaurar o `Gate` 100% verde, incrementar `version` para `1.9.0` e `versionCode` para `12` (`app.json`, `package.json`, `package-lock.json`, `CHANGELOG.md`) direto na `dev`, disparar o workflow `build-android.yml` via `workflow_dispatch` na `dev` para gerar o AAB assinado com a chave de upload da Google Play, baixar e inspecionar o AAB (confirmando `targetSdkVersion=36`, `versionCode=12`, assinatura de produção e ausência de `GOCSPX-`/`CLIENT_SECRET` — antecipando a evidência da Story 1.7), deixando o AAB pronto para envio ao Play Console pelo dono.

**Decisões do dono (25/11/2026):**
- Versão: `1.9.0` / `versionCode: 12`.
- Pipeline: GitHub Actions (`build-android.yml` via `workflow_dispatch` direto na `dev`, sem criar branches extras).
- `1.3`, `13.7` e `epic-13` promovidos para `done`.

## Boundaries & Constraints

**Always:** trabalhar direto na `dev` (nunca criar outras branches); manter `npx vitest run`, `npx tsc --noEmit` e `npx eslint .` 100% verdes; verificar que o AAB gerado pelo CI usa certificado de upload (não `CN=Android Debug`), mira `targetSdkVersion=36`, declara `versionCode=12` e não contém `GOCSPX-` nem `CLIENT_SECRET` no `index.android.bundle`.

**Never:** editar `android/`, `ios/`, `packages/sync`, `replit.*` ou `.gitlab-ci.yml`; alterar `LEGACY_MIN_APP_VERSION` (`"1.8.0"`) ou `LEGACY_CUTOFF_DATE_ISO`; subir Expo SDK (Epic 8); vazar segredos em logs ou docs.

</frozen-after-approval>

## Code Map

- `app.json`, `package.json`, `package-lock.json`, `CHANGELOG.md` -- atualização de versão para `1.9.0` e `versionCode: 12`
- `src/context/__tests__/strongGroupSync.test.ts`, `src/context/__tests__/syncCoexistence.test.ts`, `src/context/__tests__/syncMigration.test.ts`, `src/modules/__tests__/nostrSync.test.ts` -- determinismo de data pré-corte (`2026-11-01`) e normalização CRLF para o `Gate` verde
- `.github/workflows/build-android.yml` -- disparo `workflow_dispatch` na `dev` (sem edição no workflow)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- `1.3`, `13.7` e `epic-13` em `done`; `1.6` em progresso → `review`

## Tasks & Acceptance

**Execution:**
- [x] Atualizar `app.json`, `package.json`, `package-lock.json` e `CHANGELOG.md` para `1.9.0` / `versionCode: 12`
- [x] Corrigir testes dependentes da data de corte (`2026-11-20`) e CRLF para `npx vitest run` passar 100% no Windows e no CI Linux
- [ ] Commitar e fazer push na `dev`, confirmar `Gate` verde e disparar `build-android.yml` (`workflow_dispatch`, `publish=false`) na `dev`
- [ ] Baixar o AAB assinado dos artefatos do run, validar certificado (não debug), `targetSdkVersion=36`, `versionCode=12` e 0 ocorrências de segredo OAuth no `index.android.bundle`, e entregar caminho/evidência ao dono para upload no Play Console

## Verification

- `npx vitest run` -- expected: 100% passando (0 falhas)
- `npx tsc --noEmit` -- expected: 0 erros
- `npx eslint .` -- expected: 0 erros
- `gh workflow run build-android.yml --ref dev -f publish=false` -- expected: run verde com artefato `domus-v1.9.0-*.aab` assinado e validado
