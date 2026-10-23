---
title: 'Story 3.5: rejeitar timestamp no futuro e nunca reescrevê-lo'
type: 'bugfix'
created: '2026-10-23'
status: 'in-progress'
baseline_commit: 'd326909'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-2-quarentena-no-replay.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-4-ordem-total-do-replay.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Um aparelho do grupo com o relógio adiantado gera eventos "do futuro". Pela ordem da Story 3.4 eles passam na frente de tudo o que acontecer depois, e o histórico fica bagunçado em todos os aparelhos.

**Approach:** No replay, evento de outro aparelho com `timestamp` acima de `agora + 24 h` vai para a Quarentena (motivo "horário no futuro") e não altera o estado. Ele continua no log sem nenhuma mudança: quando o horário dele deixar de estar à frente do limite, passa a valer sozinho, como na Story 3.3. O limite de 24 h é uma constante única no código.

## Boundaries & Constraints

**Always:** constante única `MAX_FUTURE_SKEW_MS = 24 h` exportada de um só lugar e usada por quem precisar; o "agora" entra no replay como parâmetro (padrão `Date.now()`), para o teste não depender do relógio; a regra vale só para eventos de outro aparelho (`deviceId` diferente do aparelho atual): os do próprio aparelho seguem valendo, para um relógio local errado não esconder os dados do próprio usuário; o `timestamp` aceito nunca é reescrito em nenhum caminho (memória, SQLite, backup, publicação); a importação pelo sync continua gravando o evento (a 3.1 só recusa acima de 2100).

**Never:** corrigir, arredondar ou trocar o `timestamp` de um evento; apagar o evento do log; mudar o cursor dos relays (Story 3.6).

## I/O & Edge-Case Matrix

| Cenário | Evento | Resultado |
|---|---|---|
| Outro aparelho, horário normal | `t ≤ agora + 24 h` | aplicado |
| Outro aparelho, adiantado | `t = agora + 25 h` | Quarentena "horário no futuro", estado igual ao sem ele |
| Mesmo evento mais tarde | replay quando `agora ≥ t − 24 h` | aplicado, sem mudança no log |
| Próprio aparelho adiantado | `deviceId` = aparelho atual, `t = agora + 3 dias` | aplicado (como hoje) |
| Limite exato | `t = agora + 24 h` | aplicado |
| Nunca reescrito | evento aceito passa por hidratação, restauração, exportação e publicação | `timestamp` idêntico |

</frozen-after-approval>

## Code Map

- `src/context/replay.ts` -- `replayAllEvents(events, options)`; Quarentena
- `src/context/AppStateProvider.tsx` -- chama o replay (passar o `deviceId` atual)
- `src/context/localEventLog.ts`, `src/hooks/useEventStore.ts`, `src/hooks/useBackupRestore.ts`, `src/modules/nostrSync.ts` -- caminhos por onde o `timestamp` passa

## Tasks & Acceptance

**Execution:**
- [ ] Constante, regra no replay (com `now` e `currentDeviceId` nas opções) e chamada no `AppStateProvider`
- [ ] Testes da matriz, incluindo o mesmo log com `now` diferente

**Acceptance Criteria:**
- Given um evento de outro aparelho com horário acima de agora + 24 h, when há replay, then ele vai para a Quarentena e o estado não muda
- Given um evento aceito, when passa por qualquer caminho do app, then o `timestamp` não muda

## Verification

- `npx vitest run` e `npx tsc --noEmit` sem falhas novas
