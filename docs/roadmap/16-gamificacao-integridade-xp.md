# Tarefa 16 - Gamificação: Integridade do XP, Nível Derivado e Streak Robusto

## Prioridade: MÉDIO | Urgência: MÉDIA
## Estimativa: ~4-6h | Arquivos: ~6-8

---

## Contexto
Análise feita com os agentes GDS (Samus Shepard e Cloud Dragonborn) e revisada em roundtable (bmad-party-mode).
Premissas do produto: app individual, offline-first, um usuário; objetivo é disciplina e hábito para aprender o 50/30/20; lado católico é núcleo (com opção de desligar).

## Problema
1. `XP_GAINED` e `ACHIEVEMENT_UNLOCKED` não são deduplicados no reducer: o merge entre aparelhos do próprio usuário pode somar XP duas vezes.
2. O nível é persistido como fato (`LEVEL_UP`) em vez de derivado do XP total.
3. O anti-farm atual (deduzir XP ao excluir transação) pune a correção de erros; o objetivo real é impedir excluir e relançar para farmar XP.
4. O streak calcula dias com `Date` local (`Math.floor(diffMs/86400000)`), quebrando na virada de horário de verão, e aceita datas retroativas.

## Escopo (esta tarefa)
1. **Reducer idempotente** (`packages/gamification/src/reducer.ts`): ignorar eventos com `event.id` já visto (`XP_GAINED`, `ACHIEVEMENT_UNLOCKED`, troféus). Eventos legados não são reescritos.
2. **Nível derivado**: calcular o nível com `levelEngine.getLevelInfo(totalXp)`. `LEVEL_UP` continua existindo só para disparar toast; eventos antigos permanecem válidos.
3. **Anti-farm por cota diária de registros pontuáveis + `transactionId`** (`src/hooks/useGamificationEffects.ts` / `xpEngine.ts`):
   - Atrelar eventos `XP_GAINED` de transação ao `transactionId` único para idempotência pura (compatível com futuro sync social P2P).
   - Aplicar cota de pontuação diária de hábito (ex: até 5 registros no dia concedem XP, mas o usuário pode cadastrar transações ilimitadas normalmente sem travas).
   - Remover a dedução punitiva de XP ao excluir transação (o usuário pode corrigir dados sem perder pontos; a cota de 5 transações/dia já impede o farm infinito de deletar e recriar).
4. **Curva de níveis suavizada e nível derivado puro**:
   - Nível passa a ser função pura calculada a partir de `totalXp` (`levelEngine.getLevelInfo(totalXp)`), sem o salto exponencial inalcançável de $1.5^n$.
   - `LEVEL_UP` serve apenas como trigger de celebração/toast de UI.
5. **Streak robusto** (`packages/gamification/src/streakEngine.ts`): diferença de dias via strings `YYYY-MM-DD` (sem `Date` local), rejeitar `activeDate` anterior a `lastActiveDate`, testes de horário de verão em `__tests__/gamification.test.ts`.

## Fora de escopo (próximas tarefas)
- **Tarefa 17:** Feedback 50/30/20 positivo sem penalidade de XP (trocar penalidade por card educativo e bônus de melhora mensal).
- **Tarefa 18:** Sistema de Recompensas Funcionais por Nível (desbloqueio de relatórios, temas católicos/laicos e metas orçamentárias customizadas nos níveis 2, 5, 10).
- **Fase Futura:** Protocolo de atestação e sincronização social descentralizada via relay P2P/Nostr.

## Critérios de aceite
- [ ] Replay de eventos duplicados (mesmo `event.id` ou mesmo `transactionId`) não credita XP duplicado.
- [ ] Transações geram XP normalmente até a cota diária (5 registros/dia com XP); além disso, salvam sem pontuar e sem mensagens de bloqueio.
- [ ] Excluir transação não subtrai XP do usuário.
- [ ] Nível reflete com exatidão a função de `totalXp`.
- [ ] Streak correto atravessando a virada de horário de verão e rejeita datas retroativas.
- [ ] Testes do pacote `gamification` cobrindo todos esses cenários passando com 100% de sucesso.
