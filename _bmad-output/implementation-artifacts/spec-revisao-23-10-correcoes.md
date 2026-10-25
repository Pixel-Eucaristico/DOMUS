---
title: 'Correções da revisão completa de 23/10 (Stories 3.3, 3.4, assinatura do build e alerta)'
type: 'bugfix'
created: '2026-10-25'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-alerta-customizado.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-4-ordem-total-do-replay.md'
---

## Intent

**Problem:** A revisão completa do que entrou no `dev` em 22–23/10 (lentes adversarial, casos extremos e lacunas de teste; 33 achados) mostrou falhas que podem travar confirmações, assinar o release com a chave errada e deixar eventos fora do sync ou fora de ordem.

**Approach:** Três frentes independentes, na prioridade que o dono aprovou ("vai próximo passo", 25/10): (A) fila e host do alerta; (B) assinatura do build + acentos que faltam nas telas; (C) eventos "local" e ordem.

## Review Triage Log

| Frente | Achado | Veredito |
|---|---|---|
| A | Host "do topo" = último montado: raiz pode ficar por cima de modal montado no mesmo commit; host de tela modal escondida por outra tela (`/sync` → `/backup`) recebe os alertas | **patch**: hosts registram/saem pelo foco da tela (`useFocusEffect`) e a raiz é sempre a base; teste de montagem simultânea |
| A | Fila trava se o host do primeiro alerta não está visível | **patch**: sem host visível, o alerta vai para o próximo host disponível (ou a raiz) |
| A | Com o app bloqueado, `appConfirm` fica pendente para sempre | **patch**: ao bloquear, confirmações pendentes resolvem `false`; avisos sem efeito voltam após desbloquear |
| A | Aviso de privacidade das consultas marcado como visto antes de aparecer | **patch**: marcar só ao tocar num botão |
| A | Fechar roda o `onPress` do cancelar **e** o `onDismiss` | **patch**: um só: o do cancelar, senão `onDismiss` |
| B | Plugin de assinatura: `indexOf("release {")` frágil; marcador único para duas inserções | **patch** + teste do plugin sobre o `build.gradle` do template |
| B | CI: senhas com `\`, `:`, `=`, `#`, `$` quebram o `gradle.properties`; secrets incompletos falham tarde | **patch**: passar por `ORG_GRADLE_PROJECT_*` (env) e checar os 4 secrets |
| B | CI sem conferir o certificado do APK | **patch**: `apksigner verify --print-certs` falha se for a chave de depuração com `HAS_KEYSTORE=true` |
| B | Textos sem acento (ai-settings, sync e outros) | **patch** |
| C | Categorias padrão e recuperação de XP gravam sem normalizar/carimbar | **patch**: mesmo helper do `dispatch` |
| C | Eventos "local" não vão para o sync | **patch**: publicar pelo `eventsForExport` (carimbo do id) |
| C | Restauração grava "local" no banco | **patch**: carimbar quando o id do aparelho é conhecido |
| C | Ids de recuperação de XP e de depuração com prefixo e horário separado | **patch**: `createEvent`/mesmo instante |
| C | Horário "0x1A"/"0b11" vira número | **patch**: só decimal |
| C | Id repetido no `dispatch` ainda conta e dispara sync | **patch** |
| C | Teste de ponta a ponta do sync copia a junção antiga; ligações do `useEventStore` e da exportação sem teste | **patch**: helpers puros usados pelos hooks e testados |
| C | Logs antigos com eventos do mesmo ms podem trocar de ordem na atualização | **defer** (D32): medir em logs reais; desempate por ordem de gravação para ids antigos |
| C | `dispatch` refaz o log inteiro a cada evento | **defer** (D33): inserção ordenada quando virar gargalo |
| C | `SELECT_SINCE_SQL` com `timestamp > ?` | **defer**: só o sync legado usa (`packages/sync`, intocável) |
| C | `generateId` com relógio que volta | **reject**: risco mínimo, documentado |

## Verification

- `npx vitest run`, `npx tsc --noEmit` e build web sem falhas novas
