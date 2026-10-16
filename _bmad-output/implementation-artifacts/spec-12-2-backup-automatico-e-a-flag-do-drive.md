---
title: 'Story 12.2: Fazer o backup automático obedecer à escolha do usuário'
type: 'refactor'
created: '2026-10-16'
status: 'done'
baseline_commit: '4d3f2445c4defe79b2d869cc48475d42ac98123a'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O adiado D11 dizia que o backup automático "ignora o interruptor". A investigação mostrou que esse interruptor não existe na interface: ele mora em `src/modules/backup/application/AutoBackupService.ts`, que não é importado por nenhum arquivo (código morto, com chaves próprias `domus_auto_backup_enabled`, `domus_auto_backup_password` e intervalo). O backup que roda é `src/hooks/useAutoBackup.ts`: cópia diária cifrada só no aparelho e envio ao Drive apenas se o usuário conectou o Drive.

**Approach:** Decisão do dono (16/10/2026): **limpar e manter**. Remover o `AutoBackupService` morto; o comportamento do app não muda. A flag do envio ao Drive é conectar o Drive (já existente), coerente com a regra "as flags existentes são o mecanismo". A cópia local não sai do aparelho. A Story 12.7 já cobre o texto "o que transmite / o que perde" do Drive.

</frozen-after-approval>

## Implementation Notes

- `git rm src/modules/backup/application/AutoBackupService.ts`: nenhum importador em `src/`, `app/` ou `packages/` (nem no histórico, desde `7d8a27f`), então nenhum aparelho tem as chaves dele e não há migração.
- Comportamento do app inalterado: `useAutoBackup` continua gravando a cópia diária cifrada no aparelho e só envia ao Drive com o Drive conectado (`GoogleDriveService.isConnected()`).
- A chave que cifra a cópia (`domus_auto_backup_device_key`) segue em `AsyncStorage` em texto puro; isso é da Story 6.2, revista para uma chave só.
- Plano alinhado: Story 12.2 e 6.2 em `epics.md`, nota no FR-28 do PRD, no `epic-12-context.md` e no D11.
- `npx tsc --noEmit`: 0 erros; `npx vitest run src/modules/backup`: 28 passaram.

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Story 6.2 incoerente (título e critérios com "chave e senha") | medium | Só o Given tinha mudado. **patch**: story reescrita para a chave única. |
| Critério da 12.2 vago (onde procurar; "intervalo" ambíguo) | low | `useAutoBackup.ts:16` tem intervalo fixo próprio. **patch**: `git grep` exato com `domus_auto_backup_interval_h` em `src app`. |
| FR-28 do PRD, contexto do Epic 12 e proposta ainda citam o interruptor | low | **patch** com nota no PRD e no contexto; a proposta é registro histórico. |
| Chave da cópia local em texto puro não citada | low | `useAutoBackup.ts:31-46`. **patch**: nota acima, com a Story 6.2. |
| Título e chave da 12.2 no sprint não renomeados | low | A chave é estável para as ferramentas; renomear não traz ganho. rejeitado |
| Evidência do D11 aponta código que não existe mais | low | É registro histórico; o resultado foi anotado no resumo. rejeitado |
| Falta teste do envio condicionado ao Drive | low | Comportamento não mudou nesta story; extrair a decisão é refatoração nova. rejeitado |
| "Drive conectado" como consentimento × NFR-8 | false | Não há NFR-8 no PRD; a decisão do dono está no Intent desta spec e no FR-28. |
| Spec incompleta / status `in-progress` | false | Preenchidos na finalização do oneshot. |
| Mudanças divididas entre stage e working tree | false | O commit leva tudo junto. |

