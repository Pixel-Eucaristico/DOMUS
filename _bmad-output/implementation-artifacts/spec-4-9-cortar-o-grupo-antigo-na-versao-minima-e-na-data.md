---
title: 'Story 4.9: Cortar o Grupo antigo na versão mínima e na data'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_revision: '6631452671fc68773f089a6f29805620f3f5eb84'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-7-manter-o-grupo-antigo-e-o-forte-ao-mesmo-tempo.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-8-migrar-um-aparelho-do-grupo-antigo-para-o-forte.md'
  - '{project-root}/src/context/strongGroupSync.ts'
  - '{project-root}/src/context/useSyncEngine.ts'
  - '{project-root}/app/sync.tsx'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O canal de sincronização legado (código de 6 caracteres e cifra XOR de 30 bits exposta publicamente em relays Nostr) é estruturalmente vulnerável a ataques de força bruta. Para que o aplicativo garanta segurança criptográfica real e possa reativar com veracidade a declaração pública de "criptografia ponta a ponta" na loja e nas políticas (Story 4.10), o formato legado deve ser encerrado em definitivo ao término da janela de convivência de 14 dias (ou caso o app esteja abaixo da versão mínima), sem jamais apagar o histórico local e permitindo aos usuários migrar para o Grupo forte.

**Approach:** Definir constantes de corte e versão mínima (`LEGACY_CUTOFF_DATE_ISO`, `LEGACY_CUTOFF_TIMESTAMP`, `LEGACY_MIN_APP_VERSION`) em `src/context/strongGroupSync.ts` com funções puras de inspeção (`isLegacyCutoffReached`, `isLegacySyncDisabled`); interromper integralmente leituras (subscrição e pull) e escritas (push) no canal legado quando a data limite for atingida ou a versão for incompatível; emitir aviso visual claro na interface (`app/sync.tsx`) e em `errorMessage` orientando a migração ou atualização; transmitir previamente um evento de aviso no canal legado antes da data de corte; registrar formalmente o risco residual do histórico passado em XOR em `docs/risco-residual-xor.md`; e assegurar que o banco de dados e os eventos locais permaneçam 100% preservados e disponíveis para migração.

## Boundaries & Constraints

**Always:**
- Interromper completamente leitura (pull e subscrição) e escrita (push) no canal legado quando `now >= LEGACY_CUTOFF_TIMESTAMP` ou quando a versão do aplicativo estiver abaixo de `LEGACY_MIN_APP_VERSION`.
- Preservar integralmente o histórico local de eventos (EventStore / SQLite / AsyncStorage). Nenhum evento local é apagado no corte.
- Exibir aviso informativo claro na interface (`app/sync.tsx`) e em `errorMessage` explicando o encerramento do formato fraco e orientando o usuário a migrar para o sync seguro ou atualizar o app.
- Manter disponível a ação "Migrar para o sync seguro" (Story 4.8) para que aparelhos no canal legado (inclusive atualizados pós-corte) possam transicionar seus eventos locais acumulados para o Grupo forte sem perdas e sem duplicações.
- Publicar previamente um evento de aviso (`LEGACY_GROUP_CUTOFF_WARNING`) no canal legado antes do corte para alertar outros aparelhos na rede.
- Registrar em `docs/risco-residual-xor.md` a análise técnica e o risco residual do histórico passado transmitido em cifra XOR através de relays públicos.
- Utilizar os diálogos customizados do aplicativo (`appAlert`/`appConfirm`), nunca alertas nativos do sistema.
- Textos de UI estritamente em pt-BR com acentuação completa.

**Never:**
- Nunca ler nem escrever no canal legado após a data de corte (`now >= LEGACY_CUTOFF_TIMESTAMP`).
- Nunca apagar os eventos locais do aparelho ao desativar o canal legado.
- Nunca publicar dados sensíveis (`PAYSLIP_*`, `RELIGIOUS_*`, `CONFESSIONAL_*`) no canal legado.
- Nunca alterar a biblioteca legada `packages/sync`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pré-corte ativo | `now < LEGACY_CUTOFF_TIMESTAMP`, aparelho no canal legado | Leitura e escrita normais no grupo legado; publica evento de aviso prévio de corte | N/A |
| Chegada da data de corte | `now >= LEGACY_CUTOFF_TIMESTAMP`, aparelho em ambos os canais | Canal legado é desconectado (sem pull, sem subscrição e sem push para legacy); canal forte assume sync exclusivo | Silencioso e seguro; sem interrupção no forte |
| Aparelho exclusivo no legado pós-corte | `now >= LEGACY_CUTOFF_TIMESTAMP`, sem grupo forte | Canal legado bloqueado para leitura e escrita; UI exibe aviso de descontinuação e mantém card "Migrar para o sync seguro" | Mostra aviso pedindo para migrar ou atualizar |
| Migração pós-corte | Aparelho atualizado pós-corte clica em "Migrar para o sync seguro" | Cria grupo forte e publica os 20 eventos locais sem duplicar (Story 4.8) | Se relays offline, exibe aviso e tenta depois |
| Versão abaixo da mínima | `currentVersion < LEGACY_MIN_APP_VERSION` | Canal legado bloqueado; emite mensagem solicitando atualização do aplicativo | Orienta atualização na loja |
| Integridade dos eventos locais | Corte executado no dispositivo | 100% dos eventos locais em SQLite e EventStore permanecem intactos | Zero perda de dados locais |

</intent-contract>

## Code Map

- `src/context/strongGroupSync.ts` -- Definir constantes `LEGACY_CUTOFF_DATE_ISO`, `LEGACY_CUTOFF_TIMESTAMP`, `LEGACY_MIN_APP_VERSION`, `LEGACY_CUTOFF_MESSAGE`, `LEGACY_VERSION_TOO_OLD_MESSAGE` e funções puras `isLegacyCutoffReached(now?)`, `isAppVersionDeprecatedForLegacy(version?)`, `isLegacySyncDisabled(options?)`; atualizar `loadCoexistingGroups` para respeitar o corte (não ativar canal legado quando descontinuado, sinalizando `legacyCutoff: boolean`).
- `src/context/useSyncEngine.ts` -- No boot e loops periódicos, verificar `isLegacySyncDisabled()`; se cortado, desativar `legacySubRef`, ignorar push/pull para o grupo legado e definir aviso orientando migração quando não houver grupo forte; antes do corte, publicar evento de aviso `LEGACY_GROUP_CUTOFF_WARNING` no canal legado uma única vez.
- `app/sync.tsx` -- Exibir banner/card de aviso pós-corte quando o aparelho estiver com o canal legado descontinuado, mantendo o botão "Migrar para o sync seguro" acessível.
- `docs/risco-residual-xor.md` -- Novo documento formal registrando a análise de segurança, histórico em cifra XOR e mitigação através do Grupo forte.
- `src/context/__tests__/syncCutoff.test.ts` -- Suíte de testes unitários para a Story 4.9 cobrindo data de corte, versão mínima, interrupção estrita de leitura/escrita no canal legado, publicação do evento de aviso prévio e preservação dos eventos locais.

## Tasks & Acceptance

**Execution:**
- [x] `src/context/strongGroupSync.ts` -- Implementar constantes de corte (`LEGACY_CUTOFF_DATE_ISO`, `LEGACY_CUTOFF_TIMESTAMP`, `LEGACY_MIN_APP_VERSION`) e funções de verificação `isLegacyCutoffReached`, `isAppVersionDeprecatedForLegacy` e `isLegacySyncDisabled`.
- [x] `src/context/useSyncEngine.ts` -- Integrar corte no motor de sincronização: desativar subscrição, pull e push para canal legado pós-corte; publicar evento de aviso prévio antes do corte; manter eventos locais preservados e status de aviso ativo.
- [x] `app/sync.tsx` -- Adicionar aviso visual explicativo quando o canal legado estiver cortado, orientando migração ou atualização.
- [x] `docs/risco-residual-xor.md` -- Registrar documentação formal de risco residual do formato legado em XOR.
- [x] `src/context/__tests__/syncCutoff.test.ts` -- Criar testes unitários para corte de data, versão mínima, bloqueio de leitura/escrita legado e integridade do histórico local.

**Acceptance Criteria:**
- Given a data de corte e a versão mínima definidas pelo dono (14 dias depois da publicação do FR-13)
- When chega a data de corte
- Then o app deixa de ler e de escrever no Grupo antigo e mostra uma mensagem pedindo para migrar ou atualizar
- And antes do corte o app publica no Grupo antigo um evento de aviso (versões antigas o ignoram, então o dono também avisa os usuários)
- And o histórico já publicado em XOR é registrado como risco residual em `docs/`
- And os eventos locais não são apagados.

## Spec Change Log

_None._

## Review Triage Log

_None._

## Design Notes

1. **Parâmetros de Corte:**
   - Data de corte: `2026-11-20T00:00:00.000Z` (`LEGACY_CUTOFF_TIMESTAMP`), correspondendo a 14 dias após a disponibilização do segredo forte (Story 4.1-4.3 em 06/11/2026).
   - Versão mínima: `1.8.0` (`LEGACY_MIN_APP_VERSION`).
2. **Bloqueio Completo de I/O no Legado:**
   - Quando `isLegacySyncDisabled()` retorna verdadeiro:
     - `subRef` legado nunca é aberto (ou é fechado caso ativo).
     - `pushAllGroups` não inclui o grupo legado.
     - `pullAllGroups` não busca eventos do grupo legado.
     - Nenhum evento trafega em XOR na rede após a data de corte.
3. **Aviso Prévio no Canal Legado:**
   - Antes do corte (`now < LEGACY_CUTOFF_TIMESTAMP`), o aparelho publica no grupo legado um evento `LEGACY_GROUP_CUTOFF_WARNING` contendo a data de corte e instruções. Aparelhos antigos com a versão antiga ignoram o evento no replay (desconhecido/quarentena conforme Story 3.3).
4. **Preservação de Dados e Caminho de Migração:**
   - Os eventos locais permanecem 100% gravados e acessíveis no app.
   - Mesmo após o corte, `canMigrateToStrongGroup` permanece habilitado para quem tem código legado salvo, permitindo ao usuário migrar imediatamente e publicar seus 20 eventos locais acumulados no canal forte com AES-GCM (Story 4.8).
5. **Registro de Risco Residual:**
   - Criado `docs/risco-residual-xor.md` explicando o vetor de ataque nos relays (chave pública derivada de código de 30 bits) e comprovando a eficácia do corte e da migração para o segredo forte de 256 bits.

## Verification

**Commands:**
- `npx vitest run src/context/__tests__/syncCutoff.test.ts src/context/__tests__/syncMigration.test.ts src/context/__tests__/syncCoexistence.test.ts src/context/__tests__/strongGroupSync.test.ts` -- expected: todos os testes de corte e sincronização passam com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipagem TypeScript strict.
- `npx eslint src/context/ src/modules/ app/sync.tsx` -- expected: 0 erros de linting.

## Auto Run Result

### Summary of implemented change
- `src/context/strongGroupSync.ts`:
  - Definidas constantes `LEGACY_CUTOFF_DATE_ISO = "2026-11-20T00:00:00.000Z"`, `LEGACY_CUTOFF_TIMESTAMP = 1795132800000`, `LEGACY_MIN_APP_VERSION = "1.8.0"`, `LEGACY_CUTOFF_MESSAGE`, `LEGACY_VERSION_TOO_OLD_MESSAGE`, `LEGACY_GROUP_CUTOFF_WARNING_TYPE` e `LEGACY_CUTOFF_WARNING_STORAGE_KEY_PREFIX`.
  - Implementadas funções puras `compareSemver(v1, v2)`, `isLegacyCutoffReached(now?)`, `isAppVersionDeprecatedForLegacy(version?)`, `isLegacySyncDisabled(options?)`, `getLegacySyncDisabledReason(options?)` e `createLegacyCutoffWarningEvent(deviceId, cutoffDate?)`.
  - Atualizado `loadCoexistingGroups(options?)` para retornar `legacy: null`, `legacyCutoff: true`, `legacyCutoffReason` e `legacyCode` quando o corte for atingido ou a versão for obsoleta, preservando o código salvo sem ativar canais de rede.
  - Atualizado `canMigrateToStrongGroup` para permitir migração assistida pós-corte quando `legacyCutoff` ou `legacyCode` estiver presente e sem Grupo forte ativo.
- `src/context/useSyncEngine.ts`:
  - Adicionado suporte a `now?: () => number` e `version?: string` em `UseSyncEngineArgs`.
  - Fiação de corte no motor: bloqueados push (`pushAllGroups`), pull (`pullAllGroups`) e subscrição ao vivo (`legacySubRef`) para o canal legado pós-corte ou em versão obsoleta via `isLegacySyncDisabled`.
  - No boot e em `doSync`, se apenas o grupo legado estiver configurado e descontinuado, define `syncStatus: "offline"` e `errorMessage` com orientações em pt-BR pedindo para migrar ou atualizar.
  - Se o corte ocorrer em runtime durante `doSync`, cancela `legacySubRef`, recarrega estado e atualiza UI.
  - Implementado envio prévio único do evento `LEGACY_GROUP_CUTOFF_WARNING` no canal legado antes da data de corte via `publishLegacyCutoffWarningIfNeeded`, persistindo registro no storage e no tracker.
- `app/sync.tsx`:
  - Exibido banner informativo de encerramento (`testID="legacy-cutoff-banner"`) quando `coexistingGroups.legacyCutoff` estiver ativo sem grupo forte, com ícone de aviso e mensagem explicando o corte e orientando migração ou atualização.
  - Badge do código legado estilizado em destaque de aviso (`theme.danger`) quando descontinuado.
  - Mantido acessível o card e botão "Migrar para o sync seguro" (`testID="migration-card"` e `testID="migrate-to-strong-group-button"`), permitindo transição com 1 toque.
- `docs/risco-residual-xor.md`:
  - Documento formal detalhado em pt-BR com acentuação completa registrando histórico, análise de vulnerabilidade da cifra XOR e do código de 30 bits em relays públicos, mitigações aplicadas, avaliação do risco residual histórico e habilitação técnica para a Story 4.10.
- `src/context/__tests__/syncCutoff.test.ts`:
  - Suíte completa com 24 testes unitários cobrindo: constantes, funções puras semver/corte/versão, bloqueio de leitura e escrita em `loadCoexistingGroups`, migração pós-corte com preservação dos 20 eventos locais acumulados e publicação com cifra AES-GCM no Grupo forte sem duplicações, transmissão única do evento de aviso prévio e contratos de código em `useSyncEngine` e `app/sync.tsx`.

### Verification performed
- `npx vitest run src/context/__tests__/syncCutoff.test.ts src/context/__tests__/syncMigration.test.ts src/context/__tests__/syncCoexistence.test.ts src/context/__tests__/strongGroupSync.test.ts`: 112 testes passando em 4 suítes com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros de tipagem TypeScript strict.
- `npx eslint src/context/useSyncEngine.ts src/context/strongGroupSync.ts src/context/SyncProvider.tsx app/sync.tsx src/context/__tests__/syncCutoff.test.ts`: 0 erros de linting.
- `npx vitest run`: 2619 testes passando em 113 suítes com 0 falhas.

## Review Triage Log

### Rodada 1 (Parallel Multi-Lens Review)
- **Blind Hunter (Lens 1):**
  - [HIGH] Identificou colisão NIP-33 no `batchId` ao publicar o aviso prévio com `deviceId` real (sobrescreveria o lote 0 de transações do usuário nos relays). *Ação: corrigido usando namespace dedicado `notice-${did}`.*
  - [HIGH] Identificou chamadas a `loadCoexistingGroups()` sem opções em `useSyncEngine.ts`. *Ação: corrigido repassando `{ now: now(), version }` em todas as 4 invocações (`boot`, `doSync`, `createGroup`, `joinGroup`).*
  - [MEDIUM] Omissão da verificação de versão obsoleta e concorrência em `publishLegacyCutoffWarningIfNeeded`. *Ação: corrigido com `isLegacySyncDisabled` e ref de lock assíncrono.*
  - [MEDIUM] Botões manuais de sync e botão de QR Code visíveis quando canal legado está cortado. *Ação: corrigido ocultando QR Code e seção manual de sync quando `isLegacyCutoff` for verdadeiro.*
- **Edge Case Hunter (Lens 2):**
  - [MEDIUM] `SyncProvider.tsx` não repassava versão real do aplicativo para `useSyncEngine`. *Ação: corrigido conectando `Constants.expoConfig?.version` em `SyncProvider.tsx`.*
  - [LOW] Falha no parse de versões SemVer com pré-release pontuado (`1.8.0-rc.1`). *Ação: aprimorado `compareSemver` para tratar pre-releases conforme SemVer 2.0.0.*
  - [LOW] Callback de subscrição ao vivo legado ativo pós-corte antes do próximo ciclo de sync. *Ação: adicionada verificação de corte com fechamento do socket dentro do callback de streaming.*
- **Verification Gap Reviewer (Lens 3):**
  - [HIGH] Falta de testes comportamentais executáveis (presença de `toContain` estáticos). *Ação: adicionados testes comportamentais com mock de EventStore (verificando que nada é deletado), teste de retorno `null` em `loadActiveSyncGroup` pós-corte sem grupo forte, e testes de precedência de razões.*
- **Intent Alignment Auditor (Lens 4):**
  - Veredito: Conformidade Total com o Epic 4 e requisitos funcionais do FR-13.
- **Status pós-correções:** Todos os 112 testes de sincronização verdes, suíte completa de 2.619 testes verde, tipagem estrita TypeScript limpa com 0 erros, e 0 erros de linting. Follow-up review recomendado: false.
