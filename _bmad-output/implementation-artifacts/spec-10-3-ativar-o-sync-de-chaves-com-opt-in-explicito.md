---
title: 'Story 10.3: Ativar o sync de chaves com opt-in explícito'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_revision: '19b980f5b30860f011371045174b7d42a6c9d21a'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Teste de runtime para a UI de opt-in em app/sync.tsx (visibilidade, carregamento e rollback em erro)
    evidence: |-
      O repositório não possui @testing-library/react-native nem jsdom, e vi.mock("react-native") falha no Vitest (AGENTS.md).
    location: >-
      app/sync.tsx:91-149,641-672
    severity: medium
  - summary: >-
      Resetar domus_key_sync_opt_in_v1 ao sair de um Grupo forte em handleLeaveGroup
    evidence: |-
      Ao sair de um Grupo forte e ingressar em outro posteriormente no mesmo aparelho, domus_key_sync_opt_in_v1 permaneceria true se não for redefinida; avaliar junto à Story 10.6.
    location: >-
      app/sync.tsx:203
    severity: low
---

<intent-contract>

## Intent

**Problem:** As chaves de IA (`domus_ai_key_*`) e OCR (`domus_ocr_cloud_vision_api_key`) ainda não têm um controle explícito por aparelho para o usuário decidir se aceita sincronizá-las cifradas pelo Grupo forte antes de qualquer envio ou recebimento.

**Approach:** Criar o módulo puro `src/modules/strongGroup/keySyncOptIn.ts` para gerenciar a flag local `domus_key_sync_opt_in_v1` em `AsyncStorage` (padrão desligado, bloqueado no navegador e sem eventos de sync), registrar a chave no inventário (`docs/inventario-dados.md`) como `não sincroniza`, e exibir a opção `"Sincronizar minhas chaves de IA e OCR entre meus aparelhos"` com explicação em pt-BR em `app/sync.tsx` exclusivamente em aparelho nativo com Grupo forte ativo.

## Boundaries & Constraints

**Always:**
- O opt-in começa desligado (`false`) em todo aparelho.
- A opção só aparece e só pode ser ativada em aparelho nativo (`Platform.OS !== "web"` / `EXPO_OS !== "web"`) **e** com Grupo forte ativo (`isStrongGroup === true`).
- O texto explicativo visível na opção deve estar em pt-BR com acentos completos e deixar explícito que as chaves viajam cifradas pelos relays públicos, que eventos já publicados não podem ser apagados dos relays, e que a preferência vale apenas para este aparelho.
- O estado do opt-in fica apenas em `AsyncStorage` (`domus_key_sync_opt_in_v1`), nunca vira evento `SETTING_CHANGED`, e o navegador sempre retorna `false` e nunca renderiza nem grava a opção.
- Usar `process.env.EXPO_OS` / injeção de `KeyValueStorage` nos módulos puros para testar em Vitest sem `vi.mock("react-native")`.

**Never:**
- Nunca enviar, cifrar ou importar chaves de IA/OCR nesta story (escopo das Stories 10.4 e 10.5).
- Nunca adicionar `domus_key_sync_opt_in_v1` a `ALLOWED_SETTING_KEYS` nem emitir `SETTING_CHANGED` para ela.
- Nunca exibir ou habilitar o opt-in na web ou no Grupo antigo.
- Nunca usar `Alert.alert`, `window.alert` ou `window.confirm`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Estado inicial | Sem valor salvo em `AsyncStorage` | `getKeySyncOptIn()` retorna `false` | Falha de leitura retorna `false` sem lançar erro |
| Toggle em aparelho nativo | `isWeb: false`, `setKeySyncOptIn(true)` depois `false` | Grava `"true"` / `"false"` em `domus_key_sync_opt_in_v1` e notifica assinantes | Erro de escrita não corrompe cache |
| Valor corrompido | `AsyncStorage` contém `"yes"` ou JSON inválido | `getKeySyncOptIn()` retorna `false` (apenas `"true"` ativa) | Sem erro; trata como desligado |
| Navegador (web) | `isWeb: true` (ou `EXPO_OS === "web"`) | `canShowKeySyncOption` retorna `false`; `getKeySyncOptIn` e `setKeySyncOptIn(true)` retornam `false` sem gravar no storage | No-op seguro |
| Grupo antigo ou desconectado | `isStrongGroup: false`, `isWeb: false` | `canShowKeySyncOption` retorna `false`; card da opção não aparece em `app/sync.tsx` | Sem ação disponível |
| Nativo com Grupo forte | `isStrongGroup: true`, `isWeb: false` | `canShowKeySyncOption` retorna `true`; `app/sync.tsx` exibe o toggle e a explicação em pt-BR | Erro ao salvar mostra feedback com `appAlert` ou reverte estado |

</intent-contract>

## Code Map

- `src/modules/privacy/externalLookups.ts` -- Padrão de referência para flag booleana local em `AsyncStorage` com `KeyValueStorage` injetável, cache em memória e `subscribe*`.
- `src/context/useSyncEngine.ts:107-110` e `src/context/SyncProvider.tsx:16,59,103-109` -- Cálculo e exposição de `isStrongGroup` via `useSync()`.
- `app/sync.tsx:1-45,76-82,380-608` -- Tela de sincronização onde `isAutoSyncEnabled` e `isStrongGroup` são consumidos e o card do opt-in deve ser exibido somente quando `Platform.OS !== "web" && isAutoSyncEnabled && isStrongGroup`.
- `docs/inventario-dados.md:9-55` -- Tabela `## Inventário Completo` validada por `dataInventory.test.ts` e `settingsSyncGuard.test.ts`.
- `src/modules/security/__tests__/dataInventory.test.ts` e `src/modules/security/__tests__/settingsSyncGuard.test.ts` -- Garantem que toda chave `AsyncStorage` de produção consta no inventário e é rejeitada pelo sync de settings.

## Tasks & Acceptance

**Execution:**
- `src/modules/strongGroup/keySyncOptIn.ts` -- Criar módulo puro com `KEY_SYNC_OPT_IN_KEY = "domus_key_sync_opt_in_v1"`, `canShowKeySyncOption({ isStrongGroup, isWeb })`, `getKeySyncOptIn`, `setKeySyncOptIn`, `subscribeKeySyncOptIn` e `resetKeySyncOptInCache`, usando `KeyValueStorage` injetável (padrão `AsyncStorage`) e guarda `process.env.EXPO_OS === "web"` -- Centraliza o estado local do opt-in para a Story 10.3 e reuso pelas Stories 10.4–10.6 sem acoplamento a `react-native`.
- `docs/inventario-dados.md` -- Adicionar a linha de `domus_key_sync_opt_in_v1` (`AsyncStorage`, origem `src/modules/strongGroup/keySyncOptIn.ts`, classe `não sincroniza`) na tabela `## Inventário Completo` -- Mantém 100% de cobertura do inventário e ativa automaticamente a barreira em `settingsSyncGuard.test.ts`.
- `app/sync.tsx` -- Importar `Switch` de `react-native` e os helpers de `src/modules/strongGroup/keySyncOptIn.ts`; carregar e assinar o estado do opt-in em aparelho nativo e renderizar a seção/card `"Sincronizar minhas chaves de IA e OCR entre meus aparelhos"` com `Switch` e explicação em pt-BR (relays públicos, cifragem, impossibilidade de apagar eventos já publicados e escopo por aparelho) somente quando `Platform.OS !== "web" && isAutoSyncEnabled && isStrongGroup` -- Entrega a UI exigida pela Story 10.3 sem expor nada na web nem no Grupo antigo.
- `src/modules/strongGroup/__tests__/keySyncOptIn.test.ts` -- Testar toda a matriz I/O: default `false`, leitura/gravação `"true"`/`"false"`, valor corrompido, erro de storage, bloqueio incondicional na web (`isWeb: true` e `process.env.EXPO_OS = "web"`), e `canShowKeySyncOption` para todas as combinações de `isStrongGroup` e `isWeb` -- Valida os ACs da Story 10.3 em Vitest.

**Acceptance Criteria:**
- Given um aparelho nativo conectado a um Grupo forte, when o usuário abre `app/sync.tsx`, then vê a opção `"Sincronizar minhas chaves de IA e OCR entre meus aparelhos"` inicialmente desligada junto da explicação em pt-BR sobre relays públicos e permanência dos eventos publicados.
- Given um navegador web ou aparelho sem Grupo forte, when a tela `app/sync.tsx` é renderizada ou o store é consultado, then a opção não aparece e o opt-in permanece `false`.
- Given o opt-in ativado ou desativado em um aparelho nativo, when eventos de sync são preparados ou validados, then `domus_key_sync_opt_in_v1` nunca gera evento `SETTING_CHANGED` e permanece restrita ao `AsyncStorage` daquele aparelho.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 11 findings — high 0, medium 4, low 7, false 0, maybe-false 0
- findings:
  - `[low]` `[patch]` `notifyListeners` em `src/modules/strongGroup/keySyncOptIn.ts` não isolava exceções de assinantes — envolvido cada `listener(enabled)` em `try/catch`.
  - `[medium]` `[patch]` `Switch` em `app/sync.tsx` ficava habilitado durante a leitura inicial de `getKeySyncOptIn()` — adicionado estado `keySyncLoading` e `disabled={keySyncSaving || keySyncLoading}`.
  - `[medium]` `[patch]` Caminho `storage === defaultStorage` (`cached`, `pending` e corrida leitura/escrita) sem testes em `src/modules/strongGroup/__tests__/keySyncOptIn.test.ts` — adicionados 5 testes com `vi.mock("@react-native-async-storage/async-storage")`.
  - `[medium]` `[defer]` UI de `app/sync.tsx` (`showKeySyncOption`, `useEffect` e rollback de `handleToggleKeySyncOptIn`) sem teste de runtime — repositório não possui harness de componentes RN no Vitest.
  - `[low]` `[patch]` `showKeySyncOption` em `app/sync.tsx` duplicava `Platform.OS !== "web"` com `isWeb: false` — simplificado para `canShowKeySyncOption({ isStrongGroup, isWeb: Platform.OS === "web" })`.
  - `[medium]` `[patch]` Corrida entre leitura inicial e clique no `Switch` em `app/sync.tsx` (mesma causa raiz de EH-2) — corrigida com `keySyncLoading`.
  - `[low]` `[patch]` `handleToggleKeySyncOptIn` em `app/sync.tsx` sem guarda de reentrância — adicionado `if (keySyncSaving || keySyncLoading) return;`.
  - `[low]` `[patch]` `Switch` em `app/sync.tsx` sem `trackColor.false` nem `accessibilityHint` — adicionados `false: theme.border` e `accessibilityHint`.
  - `[medium]` `[patch]` `defaultStorage` sem cobertura de testes em `keySyncOptIn.test.ts` (mesma causa raiz de VG-1) — corrigida com os 5 testes de `AsyncStorage` mockado.
  - `[medium]` `[defer]` Falta de teste de UI em `app/sync.tsx` (mesma causa raiz de VG-2) — adiado por ausência de harness RN no Vitest.
  - `[low]` `[defer]` `handleLeaveGroup` em `app/sync.tsx` não limpa `domus_key_sync_opt_in_v1` ao sair do grupo — adiado para avaliação junto à Story 10.6.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit && npx vitest run --maxWorkers=2` -- passou após os ajustes da revisão (`eslint`: 0 erros, 14 warnings; `tsc --noEmit`: 0 erros; `vitest`: 135 arquivos, 3058 testes passando).

## Auto Run Result

- **Summary:** Implementado o opt-in local por aparelho para sincronização de chaves de IA e OCR (`domus_key_sync_opt_in_v1`, padrão desligado, restrito a aparelho nativo com Grupo forte e bloqueado na web), com opção e explicação em pt-BR em `app/sync.tsx` e registro no inventário de dados.
- **Files changed:**
  - `src/modules/strongGroup/keySyncOptIn.ts` — módulo puro de estado local (`domus_key_sync_opt_in_v1`), cache/deduplicação em memória e bloqueio na web.
  - `docs/inventario-dados.md` — entrada de `domus_key_sync_opt_in_v1` com classe `não sincroniza`.
  - `app/sync.tsx` — card e `Switch` `"Sincronizar minhas chaves de IA e OCR entre meus aparelhos"` com explicação em pt-BR visível apenas em nativo + Grupo forte.
  - `src/modules/strongGroup/__tests__/keySyncOptIn.test.ts` — 20 testes cobrindo matriz I/O, web guard, `defaultStorage` (`AsyncStorage`), concorrência e isolamento de assinantes.
- **Review breakdown:** 6 itens corrigidos por patch (2 `medium`, 4 `low` agrupados por causa raiz; 0 `high`), 2 itens adiados (`medium` para teste RN de `app/sync.tsx` sem harness no Vitest; `low` para reset em `handleLeaveGroup` na Story 10.6), 0 rejeitados.
- **Follow-up review recommendation:** `true` (2 entradas `medium` corrigidas por patch nesta passagem; risco residual: renderização e interações React Native de `app/sync.tsx` não montadas no Vitest).
- **Verification:** `eslint` (0 erros), `tsc --noEmit` (0 erros) e `vitest run --maxWorkers=2` (135 arquivos, 3058 testes passando).
