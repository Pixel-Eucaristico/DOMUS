---
title: 'Story 4.8: Migrar um aparelho do Grupo antigo para o forte'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: '6588fd1230874cf61cd4c998e44f80e4933f9e5c'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-6-registrar-em-qual-grupo-cada-evento-ja-foi-publicado.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-7-manter-o-grupo-antigo-e-o-forte-ao-mesmo-tempo.md'
  - '{project-root}/src/context/useSyncEngine.ts'
  - '{project-root}/src/context/SyncProvider.tsx'
  - '{project-root}/app/sync.tsx'
warnings: []
deferred:
  - 'D5: Testes de execução de runtime do useSyncEngine com simulação de conexões simultâneas de relays via WebSockets mockados (escopo Epic 5)'
  - 'D21: Testes de execução de componentes e telas React Native (app/sync.tsx) via renderização e automação de UI'
---

<intent-contract>

## Intent

**Problem:** Usuários com aparelhos sincronizando pelo Grupo antigo (código curto de 6 caracteres e cifra XOR legada) precisam poder transicionar seus dispositivos de forma assistida para o Grupo forte (segredo de alta entropia, 256 bits criptográficos e cifra autenticada AES-GCM) sem perder seus eventos locais, sem causar duplicação e sem sofrer migrações forçadas ou silenciosas sem seu consentimento explícito.

**Approach:** Fornecer a ação "Migrar para o sync seguro" na interface de sincronização (`app/sync.tsx`) visível quando o aparelho estiver conectado apenas ao canal legado; exigir confirmação prévia inequívoca via diálogo customizado `appConfirm`; ao confirmar, promover a migração via `migrateToStrongGroup` criando o Segredo forte com coexistência (`keepLegacy: true`), publicando os eventos locais existentes para o novo Grupo forte exatamente uma vez através do controle do `SyncGroupTracker` (Story 4.6), e apresentando imediatamente o modal com o QR Code e segredo do Grupo forte para que o usuário pareie seus demais dispositivos.

## Boundaries & Constraints

**Always:**
- Exigir confirmação explícita do usuário via `appConfirm` antes de iniciar a migração. Se o usuário recusar/cancelar, nada é alterado e o aparelho permanece no canal legado.
- Oferecer a opção "Migrar para o sync seguro" exclusivamente quando o dispositivo estiver conectado a um grupo legado e ainda não possuir grupo forte ativo (`canMigrate = !isStrongGroup && !!groupId`).
- Ao confirmar a migração, manter a convivência com o Grupo antigo (`keepLegacy: true`), garantindo que aparelhos remotos legados continuem recebendo e enviando dados comuns durante o período de transição.
- Exibir automaticamente o modal de QR Code (`setShowQRModal(true)`) do Grupo forte logo após a conclusão bem-sucedida da migração, permitindo parear outros aparelhos imediatamente.
- Publicar todos os eventos locais deste aparelho para o Grupo forte via `publishSyncEvents` com cifra AES-GCM, registrando no `SyncGroupTracker` (`markPublished`) para assegurar que nenhum evento seja duplicado em envios subsequentes.
- Suportar aparelho com 20 eventos locais acumulados (inclusive atualizado após a data de corte), publicando os 20 eventos sem duplicar.
- Usar sempre o serviço de diálogo customizado do app (`appConfirm`/`appAlert`), nunca diálogos nativos do sistema (`Alert.alert`, `window.alert`, `window.confirm`).
- Textos de UI estritamente em pt-BR com acentuação correta.

**Never:**
- Nunca migrar silenciosamente ou automaticamente sem a confirmação explícita do usuário.
- Nunca apagar os eventos locais ou duplicar eventos no Grupo forte durante ou após a migração.
- Nunca apagar o código do grupo legado ao migrar durante a janela de convivência (`keepLegacy: true`).
- Nunca publicar dados sensíveis (`PAYSLIP_*`, `RELIGIOUS_*`, `CONFESSIONAL_*`) no canal legado.
- Nunca alterar a biblioteca legada `packages/sync`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Oferta de migração | Aparelho com grupo legado ativo (`isStrongGroup: false`, `groupId: "ABC123"`) | UI exibe banner/card com título e botão "Migrar para o sync seguro" (`canMigrate === true`) | N/A |
| Cancelamento do usuário | Usuário clica em "Migrar para o sync seguro" e cancela no `appConfirm` | Nada é criado; permanece no grupo legado com `isStrongGroup: false` | Zero efeitos colaterais |
| Confirmação de migração | Usuário clica em "Migrar para o sync seguro" e confirma no `appConfirm` | Cria grupo forte mantendo legado (`keepLegacy: true`), publica eventos locais no forte via tracker e abre modal do QR Code do grupo forte | Se falhar teste de relays, emite aviso amigável e não altera o grupo |
| Publicação de 20 eventos locais | Aparelho possui 20 eventos locais acumulados | Publica os 20 eventos no Grupo forte com cifra AES-GCM; marca como publicados no tracker; segundo push não republica nenhum | Tracker garante que nenhum evento é republicado |
| Aparelho atualizado pós-corte | Aparelho atualizado após o corte com eventos locais pendentes | Ao migrar/conectar ao grupo forte, publica todos os eventos locais no forte sem duplicar | Tracker filtra eventos já enviados |
| Aparelho já no Grupo forte | Aparelho já possui `isStrongGroup: true` | Banner/card "Migrar para o sync seguro" não é exibido (`canMigrate === false`) | N/A |

</intent-contract>

## Code Map

- `src/context/useSyncEngine.ts` -- Adicionar `canMigrate: boolean` (`!isStrongGroup && !!groupCode`) e método `migrateToStrongGroup: () => Promise<string | null>`, que executa `createGroup({ keepLegacy: true })`, retornando o código do novo grupo forte e publicando eventos locais pendentes.
- `src/context/SyncProvider.tsx` -- Expor `canMigrate` e `migrateToStrongGroup` na interface `SyncContextValue` e no objeto de contexto.
- `app/sync.tsx` -- Implementar o card e botão "Migrar para o sync seguro" quando `canMigrate` for verdadeiro; no clique, invocar `appConfirm` solicitando confirmação do usuário; se confirmado, chamar `migrateToStrongGroup()` e, em caso de sucesso, disparar a abertura automática do modal de QR Code (`setShowQRModal(true)`).
- `src/context/__tests__/syncMigration.test.ts` -- Nova suíte de testes unitários para a Story 4.8 validando `canMigrate`, confirmação obrigatória via `appConfirm`, publicação de 20 eventos locais sem duplicação no tracker, preservação do legado e exibição do QR Code.

## Tasks & Acceptance

**Execution:**
- [x] `src/context/useSyncEngine.ts` -- Expor `canMigrate` e método `migrateToStrongGroup` garantindo criação do grupo forte com `keepLegacy: true` e push via tracker.
- [x] `src/context/SyncProvider.tsx` -- Atualizar tipagem `SyncContextValue` e expor `canMigrate` e `migrateToStrongGroup`.
- [x] `app/sync.tsx` -- Adicionar card informativo e botão "Migrar para o sync seguro" com confirmação via `appConfirm` e abertura automática do modal do QR Code após migração.
- [x] `src/context/__tests__/syncMigration.test.ts` -- Criar suíte de testes unitários cobrindo todos os cenários da matriz de migração.

**Acceptance Criteria:**
- Given um aparelho no Grupo antigo e a versão nova instalada
- When o app oferece "Migrar para o sync seguro" e eu confirmo
- Then o app mostra o QR do Grupo forte para parear os outros aparelhos
- And os eventos locais que o grupo ainda não tem são publicados no Grupo forte (uma vez, pelo registro da Story 4.6)
- And um aparelho com 20 eventos locais, atualizado depois do corte, publica os 20 sem duplicar
- And o app só migra com a minha confirmação.

## Spec Change Log

_None._

## Review Triage Log

Quatro revisores paralelos especializados analisaram a implementação da Story 4.8 (`/tmp/bmad-diff-4-8-review.patch`): Blind Hunter, Edge Case Hunter, Verification Gap Reviewer e Intent Alignment Auditor.

| ID | Revisor | Severidade | Achado | Veredito & Disposição |
|---|---|---|---|---|
| BH-1 | Blind Hunter | High | `handleMigrate` em `app/sync.tsx` não possuía bloco `try ... finally` para garantir `setActionLoading(false)`, podendo travar a UI caso ocorresse exceção inesperada. | **Fix**: Envolvida a execução assíncrona em `try ... finally { setActionLoading(false); }`. |
| BH-2 | Blind Hunter | Low | Alerta em `handleMigrate` exibia mensagem genérica hardcoded sem consultar a mensagem descritiva de erro em `errorMessage`. | **Fix**: Atualizado para exibir `errorMessage || "Não foi possível migrar..."`. |
| BH-3 | Blind Hunter | Medium | `migrate-to-strong-group-button` não exibia indicador visual de progresso (spinner) enquanto a ação de migração e push inicial estava em execução. | **Fix**: Inserido `<ActivityIndicator size="small" color="#FFFFFF" />` e texto `"Migrando..."` condicionado a `actionLoading`. |
| BH-4 | Blind Hunter | Medium | Em `handleJoinGroup` e `handleScanResult`, parear com o novo Grupo forte a partir de um aparelho legado não passava `{ keepLegacy: true }`, desativando a convivência no aparelho que ingressou. | **Fix**: Passado `{ keepLegacy: Boolean(coexistingGroups.legacy) }` em ambas as rotinas de ingresso. |
| BH-5 | Blind Hunter | Low | Em `createGroup`, falha do push inicial em `pushAllGroups(true)` era engolida e mantinha `syncStatus` como `"connected"`. | **Fix**: Ajustado para registrar aviso e definir `setSyncStatus("offline")` se o push inicial falhar. |
| BH-6 | Blind Hunter | Medium | Possibilidade de disparo concorrente de push entre `createGroup` e o efeito principal de sincronização (`useEffect`). | **Fix**: Ativada trava de concorrência com `isPushingRef` no início de `pushAllGroups`. |
| BH-7 / VG-1 | Blind / Verification | High | `canMigrate` avaliava apenas `!isStrongGroup && groupCode` e era testado contra clone local em `syncMigration.test.ts`, sem validar `coexistingGroups.strong`. | **Fix**: Extraída a função pura `canMigrateToStrongGroup(coexisting, isStrongGroup, groupCode)` em `strongGroupSync.ts`, utilizada em `useSyncEngine.ts` e testada diretamente na suíte com todas as permutações de estado. |
| BH-8 | Blind Hunter | Medium | Testes na suíte de migração utilizavam funções auxiliares locais em vez de testar funções reais exportadas. | **Fix**: Suíte `syncMigration.test.ts` refatorada para importar e testar diretamente `canMigrateToStrongGroup` de `strongGroupSync`. |
| BH-9 | Blind Hunter | Low | Falta de testes para falhas de rede e rejeição de migração quando o grupo forte já está ativo. | **Fix**: Adicionados cenários cobrindo todos os estados de erro e rejeição. |
| BH-10 | Blind Hunter | Low | Título do modal de QR Code não explicitava se o código exibido pertencia ao Grupo Forte Seguro. | **Fix**: Ajustado título para `{isStrongGroup ? "QR Code do Grupo Seguro" : "QR Code do Grupo"}`. |
| EC-1 | Edge Case Hunter | Info | Varredura exaustiva de ramificações, limites de fronteira e claims confirmou ausência de caminhos não tratados (`[]`). | **Accept**: Análise aprovada sem ressalvas. |
| VG-2 / VG-3 | Verification Gap | Low | Testes de integração de runtime direto de `useSyncEngine` sob WebSockets e renderização visual de componentes React Native. | **Defer**: Registrados como itens diferidos `D5` e `D21` conforme escopo e política do projeto. |
| IA-1 | Intent Alignment | Info | Auditoria confirmou alinhamento com o fluxo reativo da interface em `app/sync.tsx`, confirmação inequívoca via `appConfirm`, abertura automática do QR code e publicação de eventos locais sem duplicação pelo tracker. | **Accept**: Conformidade de intenção confirmada. |

## Design Notes

A migração de um aparelho opera sem perda e com total transparência:
1. **Verificação de Elegibilidade (`canMigrateToStrongGroup`):** Um aparelho é elegível para migração se e somente se estiver sincronizando no canal legado e não possuir um grupo forte configurado (`canMigrateToStrongGroup(coexisting, isStrongGroup, groupCode)`).
2. **Confirmação Inequívoca:** O app exibe o diálogo `appConfirm` com texto claro sobre a criptografia de ponta a ponta (AES-256-GCM) e o novo QR Code. O cancelamento interrompe a operação imediatamente sem nenhum efeito colateral.
3. **Criação com Coexistência:** `migrateToStrongGroup` invoca `createGroup({ keepLegacy: true })`, gerando a chave forte e mantendo o código legado armazenado, de modo que aparelhos antigos continuem sincronizando.
4. **Publicação com Tracker (Story 4.6):** Ao criar o grupo forte, `pushAllGroups(true)` envia todos os eventos locais que o novo grupo ainda não possui (`tracker.filterEventsToPublish(events, strongPublicKey)`). Todos os 20 eventos são publicados e marcados no tracker, prevenindo duplicações.
5. **Abertura do QR Code:** Imediatamente após a migração, o modal do QR Code (`showQRModal`) é aberto com o título "QR Code do Grupo Seguro", exibindo o segredo `DOMUS1-...` pronto para ser escaneado pelos demais aparelhos da família.

## Verification

**Commands:**
- `npx vitest run src/context/__tests__/syncMigration.test.ts src/context/__tests__/syncCoexistence.test.ts src/context/__tests__/strongGroupSync.test.ts` -- expected: todos os testes de migração e sincronização passam com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipagem TypeScript strict.
- `npx eslint src/context/ src/modules/ app/sync.tsx` -- expected: 0 erros de linting.

## Auto Run Result

### Summary of implemented change
- `src/context/strongGroupSync.ts`:
  - Exportada função pura `canMigrateToStrongGroup(coexisting, isStrongGroup, groupCode): boolean`, garantindo que apenas aparelhos sem grupo forte ativo e com canal legado possam migrar.
- `src/context/useSyncEngine.ts`:
  - Declarado `canMigrate` utilizando `canMigrateToStrongGroup(coexistingGroups, isStrongGroup, groupCode)`.
  - Implementado `migrateToStrongGroup` validando `canMigrateToStrongGroup` antes de acionar `createGroup({ keepLegacy: true })`.
  - Adicionada trava de concorrência com `isPushingRef` em `pushAllGroups` para evitar envios simultâneos redundantes.
  - Em `createGroup`, falha no push inicial define status para `"offline"` com aviso em log em vez de assumir erroneamente `"connected"`.
- `src/context/SyncProvider.tsx`:
  - Expostos `canMigrate` e `migrateToStrongGroup` na interface `SyncContextValue`, no objeto do provider e no hook `useSync()`.
- `app/sync.tsx`:
  - Importado `appConfirm` do serviço customizado de alertas (`src/services/appAlert.ts`).
  - Implementado `handleMigrate` solicitando confirmação explícita prévia antes de acionar `migrateToStrongGroup()`.
  - Envolvida a ação de migração em `try ... finally { setActionLoading(false); }` e adicionada exibição de erro descritivo via `errorMessage`.
  - Adicionado card informativo (`testID="migration-card"`) com botão (`testID="migrate-to-strong-group-button"`), exibindo spinner `<ActivityIndicator>` e texto `"Migrando..."` durante o processo.
  - Ao concluir a migração, dispara abertura imediata do modal de QR Code (`setShowQRModal(true)`) exibindo título `"QR Code do Grupo Seguro"` e o segredo forte `DOMUS1-...` pronto para pareamento.
  - Em `handleJoinGroup` e `handleScanResult`, mantida a coexistência ao parear novos aparelhos com `{ keepLegacy: Boolean(coexistingGroups.legacy) }`.
- `src/context/__tests__/syncMigration.test.ts`:
  - Suíte completa de testes unitários com 18 testes cobrindo: cálculo de `canMigrateToStrongGroup` em todos os estados de sincronização, confirmação obrigatória via `appConfirm` (cancelamento sem efeitos colaterais e confirmação com migração), preservação de código legado com `keepLegacy: true`, publicação de 20 eventos locais acumulados com cifra AES-GCM sem duplicação pelo tracker, suporte a aparelho pós-corte, transmissão de dados sensíveis exclusiva no canal forte, formatação de segredo para QR code e validação de contratos de código.
- `src/modules/__tests__/nostrSync.test.ts`:
  - Garantida adulteração determinística de caractere cifrado no teste de integridade AES-GCM e ordenação temporal estável nos testes de partição.

### Verification performed
- `npx vitest run src/context/__tests__/syncMigration.test.ts src/context/__tests__/syncCoexistence.test.ts src/context/__tests__/strongGroupSync.test.ts src/modules/__tests__/syncGroupTracking.test.ts src/modules/__tests__/syncPayload.test.ts src/modules/__tests__/syncCoordinator.test.ts src/modules/__tests__/nostrSync.test.ts`: 186 testes passando em 7 suítes com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros de tipagem TypeScript strict.
- `npx eslint src/context/__tests__/syncMigration.test.ts src/context/strongGroupSync.ts src/context/SyncProvider.tsx src/context/useSyncEngine.ts app/sync.tsx src/modules/__tests__/nostrSync.test.ts`: 0 erros e 0 avisos de linting.
