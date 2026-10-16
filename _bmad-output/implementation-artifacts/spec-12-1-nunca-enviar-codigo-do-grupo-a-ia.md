---
title: 'Story 12.1: Nunca enviar o código do grupo à IA'
type: 'bugfix'
created: '2026-10-16'
status: 'done'
baseline_commit: '3d90df52b8342057a49bcc90f71d55e990fc41e3'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Com a permissão "sync" ligada nas configurações da IA, `buildFinancialContext` (`src/modules/ai/application/AIContextBuilder.ts:121`) envia `- Grupo: ${s.groupId}`, e `groupId` é o próprio código do grupo (`src/context/SyncProvider.tsx:46`, `engine.groupCode`), única chave do sync. Com ele o provedor de IA lê tudo o que foi publicado nos relays (D10).

**Approach:** O contexto da IA passa a receber só se há grupo (`inGroup: boolean`) em vez do código, e a linha vira "Grupo: configurado" ou "Grupo: nenhum". Os chamadores em `src/hooks/useAIConsultant.ts` (linhas ~116 e ~172) passam `!!syncCtx.groupId`. Um teste do construtor garante que o código não aparece com todas as permissões ligadas.

</frozen-after-approval>

## Implementation Notes

- `AIContextBuilder.ts`: `SyncInfo.groupId` (string) virou `inGroup` (boolean); a linha do contexto mostra "Grupo: configurado" ou "Grupo: nenhum". Trocar o tipo impede que um chamador volte a passar o código.
- `useAIConsultant.ts` (2 pontos): passa `!!syncCtx.groupId`.
- Teste novo `src/modules/ai/application/__tests__/AIContextBuilder.test.ts`: falhou antes da correção e passa depois.
- Verificado que nenhum outro caminho da IA (`packages/ai`, `src/modules/ai`, `src/components/ai`, `ai-chat`, `ai-settings`) lê `groupCode`/`groupId`.
- `npx vitest run src/modules/ai`: 19 passaram; `npx tsc --noEmit`: 0 erros; `eslint` nos arquivos: limpo.
- Após a revisão: helper puro `toSyncInfo` em `AIContextBuilder.ts` (único ponto que converte o sync para a IA), usado nos dois chamadores; teste com código sentinela; texto da permissão de sync e a política (três textos) atualizados.

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Teste não pega vazamento (sem valor sentinela) e o mapeamento nos dois chamadores não tem teste | medium | O teste antigo passava sem código no input. **patch**: `toSyncInfo` + teste com `ABC-SECRET-123` em todo o contexto. |
| Falta caso com a permissão de sync desligada | low | Correção direta. **patch**: teste que a seção some. |
| `as AIDataPermissions` esconde chave nova | low | Correção direta. **patch**: `ALL_ON` montado das chaves de `DEFAULT_AI_DATA_PERMISSIONS`. |
| Texto da permissão de sync ainda diz "Grupo de sincronização" | medium | `AISettings.ts:59`, mostrado no pedido de consentimento. **patch**. |
| Política diz que o código do grupo vai à IA | medium | `docs/politica-de-privacidade.md:59-60` e cópias. **patch** nos três textos. |
| Spec sem critérios de aceite | false | A rota oneshot dispensa essas seções (template). |
| Status inconsistente entre spec e sprint | false | A finalização do oneshot leva os dois a `done`/`review`. |
| Chave da story ≠ nome do arquivo | low | A resolução usa o prefixo numérico `12-1`; sem efeito. rejeitado |

