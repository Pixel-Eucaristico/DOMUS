---
title: 'Story 12.5: Avisar antes da exportação sem criptografia'
type: 'feature'
created: '2026-10-16'
status: 'done'
baseline_commit: '11a96ace5019107fd5e9a37f9bf508285c73add7'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Com o interruptor "Criptografar backup" desligado em `app/backup.tsx`, o botão "Exportar sem criptografia" chama `handleExportPlain` (`src/hooks/useBackupRestore.ts`) e gera na hora um arquivo com todos os eventos legíveis, sem confirmação (D12).

**Approach:** `handleExportPlain` pede confirmação antes de exportar, com o aviso de que qualquer pessoa com o arquivo lê todos os dados; sem confirmação, nada é exportado. Um helper `confirmAsync` em `src/utils/` usa `Alert` no nativo e `window.confirm` na web (onde o `Alert` com botões não funciona).

</frozen-after-approval>

## Implementation Notes

- `src/utils/confirmAsync.ts`: novo helper (Alert no nativo com Cancelar/confirmação destrutiva e `onDismiss` como cancelamento; `window.confirm` na web).
- `src/hooks/useBackupRestore.ts`: `handleExportPlain` pergunta antes; cancelado, retorna sem exportar nem mudar o status.
- Sem teste automatizado: depende de `Alert`/`Platform` (`react-native` não carrega no vitest, AGENTS.md).
- `npx tsc --noEmit`: 0 erros; `eslint` nos arquivos: limpo.
- Após a revisão: decisão em `src/modules/backup/application/confirmedExport.ts` (`runIfConfirmed`, puro, 3 testes: cancelado não exporta, confirmado exporta uma vez, erro propaga) e texto do aviso em `PLAIN_EXPORT_WARNING` (cita o compartilhamento); guarda contra toque duplo (`useRef`); cancelar volta o status a `idle`; aviso da tela com o mesmo teor do diálogo.
- `npx vitest run src/modules/backup`: passaram; `npx tsc --noEmit`: 0 erros; `eslint`: limpo.

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Toque duplo abre dois diálogos e duas exportações | low | Status não sai de `idle` durante o `Alert`. **patch**: guarda com `useRef`. |
| Sem teste de "sem confirmação, nada é exportado" | medium | **patch**: `runIfConfirmed` puro + 3 testes. |
| Aviso da tela mais fraco que o diálogo | low | **patch** no texto de `app/backup.tsx`. |
| Diálogo não cita o compartilhamento a terceiros | low | **patch** no texto. |
| Status antigo fica após cancelar | low | **patch**: volta a `idle`. |
| Web sem `window.confirm` cancela em silêncio | low | Navegadores sempre têm `window.confirm`. rejeitado |
| Outros confirms do app não usam o helper | low | Fora do escopo; não há dano. rejeitado |
| Botão destrutivo fixo no helper | low | Único uso hoje é destrutivo. rejeitado |
| Spec sem registro de teste manual / status | false | Rota oneshot; o caso testável virou teste automatizado; status acertado aqui. |

