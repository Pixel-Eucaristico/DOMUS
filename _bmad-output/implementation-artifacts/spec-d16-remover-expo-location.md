---
title: 'D16: Remover o expo-location e bloquear permissões sem uso'
type: 'chore'
created: '2026-10-16'
status: 'done'
baseline_commit: '3374d8053939dd6681a270731e39e0f583ab7159'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/docs/data-safety.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O APK de release (CI run #71) pede `ACCESS_FINE_LOCATION` e `ACCESS_COARSE_LOCATION` porque `expo-location` está em `package.json` desde a v1.4.0 sem nenhum uso no código; também pede `SYSTEM_ALERT_WINDOW`, que o app não usa. O Play cobra declaração e justificativa dessas permissões no envio do AAB (Story 1.6, até 25/10/2026). Adiado D16, achado A6 de `docs/data-safety.md`.

**Approach:** Remover `expo-location` com o npm 10 (o `package-lock.json` precisa servir ao `npm ci` da CI com Node 20) e acrescentar as três permissões a `android.blockedPermissions` em `app.json`, que já bloqueia `RECEIVE_BOOT_COMPLETED`. Conferir num prebuild descartável que o manifesto as remove, e atualizar `docs/data-safety.md` §4 e o `PLAY_STORE_LISTING.md`.

</frozen-after-approval>

## Implementation Notes

- `npx npm@10 uninstall expo-location`: sai de `package.json` e de `package-lock.json` (10 linhas); `npx npm@10 ci --dry-run` sem erro (o repositório não tem `yarn.lock`).
- `app.json` `android.blockedPermissions`: + `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `SYSTEM_ALERT_WINDOW` (já tinha `RECEIVE_BOOT_COMPLETED`).
- Prebuild descartável (`expo prebuild --platform android --no-install` numa cópia em scratchpad): `AndroidManifest.xml` com as quatro permissões em `tools:node="remove"`. O merge do Gradle as tira do APK; prova final no manifesto do AAB da Story 1.6 (sem JDK local).
- `SYSTEM_ALERT_WINDOW` bloqueada para todas as variantes: o app não usa sobreposição; o menu de desenvolvimento do Expo funciona sem ela.
- `docs/data-safety.md` §4 e A6, `PLAY_STORE_LISTING.md` e o D16 atualizados.
- Por que as duas coisas: remover a dependência tira a origem; o bloqueio em `app.json` garante que nenhuma outra biblioteca traga essas permissões de volta sem aviso. O AdMob e o Firebase não dependem de permissão de localização (o AdMob estima a localização aproximada pelo IP, F10 do `data-safety.md`).
- `README.md`: tirada a linha do `expo-location`. Checklist do `PLAY_STORE_LISTING.md`: novo item para conferir o manifesto do AAB.

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| `README.md` ainda lista `expo-location` | low | `README.md:139`. **patch**. |
| Docs dizem "removidas" sem build que prove | medium | Só há o prebuild descartável. **patch**: "bloqueadas em `app.json`; confirmar no AAB"; A6 no passado. |
| Origem do `SYSTEM_ALERT_WINDOW` sem investigação | low | Estava no APK de release (run #71), logo vem do manifesto principal e o bloqueio vale no release. **patch** na tabela. Efeito no debug não testado; só afeta desenvolvimento. |
| Nota "yarn.lock revertido" falsa | low | O repositório não tem `yarn.lock`. **patch**. |
| D16 resolvido no `summary` em vez do `evidence` | low | Convenção do arquivo. **patch**. |
| Checklist sem conferência do manifesto do AAB | low | **patch** no `PLAY_STORE_LISTING.md`. |
| Sem justificativa de remover e bloquear; efeito no AdMob | low | **patch** nas notas acima. |
| Sem guarda automática do manifesto na CI | low | Exige gate de CI (Story 2.8). rejeitado |
| Status da spec | false | Acertado na finalização. |

