---
title: 'Story 9.1: Inventariar e classificar tudo que o app guarda fora do log'
type: 'chore'
created: '2026-11-16'
status: 'done'
baseline_revision: '8d8d3c8fab9ef7279f9ef006497a8cf9ee6412e5'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Persistência não-KV (IndexedDB domus_secure master-v1 e FileSystem domus-autobackup.domusbackup) não é varrida pelo detector
    evidence: >-
      Story 9.1 delimita o inventário às chaves em AsyncStorage e SecureStore/webSecrets; IndexedDB e FileSystem ficam fora do escopo KV atual.
    location: >-
      src/modules/security/infrastructure/webSecrets.ts
    severity: low
  - summary: >-
      Extrator usa regex em vez de AST completo (aninhamento profundo de ${...} e loops indiretos fora de array literal)
    evidence: >-
      Segue o padrão de noSecretInAsyncStorage.test.ts; suficiente para todo o código de produção atual.
    location: >-
      src/modules/security/__tests__/dataInventory.test.ts:127
    severity: low
---

<intent-contract>

## Intent

**Problem:** O app grava ~40 chaves em `AsyncStorage`, `SecureStore` e `webSecrets` fora do log de eventos, mas não existe um inventário classificado nem um teste que impeça o surgimento de novas chaves sem classificação explícita.

**Approach:** Criar `docs/inventario-dados.md` inventariando todas as chaves persistidas fora do log em produção, classificando cada uma como **vira evento**, **usa outro canal**, **não sincroniza** ou **é segredo** com motivo explícito (incluindo permissões de dados da IA como `"não sincroniza (consentimento por aparelho)"`), e adicionar um teste automatizado no Vitest que extrai as chaves usadas no código de produção e falha se alguma estiver ausente ou sem classe válida no inventário.

## Boundaries & Constraints

**Always:**
- Varrer todos os arquivos de produção em `app/`, `src/` e `packages/` (excluindo testes) para `AsyncStorage`, `SecureStore` e `webSecrets`, resolvendo constantes e prefixos dinâmicos usados no código.
- Usar exatamente as quatro classes exigidas: `vira evento`, `usa outro canal`, `não sincroniza` (com nota `(consentimento por aparelho)` para `AIDataPermissions`) e `é segredo`.
- Manter `domus_is_catholic_v1` classificada como `não sincroniza` neste épico (sensível — aguarda criptografia forte do Épico 10) e registrar explicitamente `AIDataPermissions` como `não sincroniza (consentimento por aparelho)`.
- Manter o teste livre de imports de `react-native` para rodar no Vitest.

**Never:**
- Alterar `packages/sync`, `ios/`, `android/` ou `replit.*`.
- Alterar código de produção de persistência ou criar eventos `SETTING_CHANGED` nesta story (escopo das Stories 9.2–9.6).
- Usar `vi.mock("react-native")`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Inventário completo de chaves em produção | Varredura AST/regex sobre `app/`, `src/` e `packages/` para `AsyncStorage`, `SecureStore` e `webSecrets` | Todas as chaves encontradas constam em `docs/inventario-dados.md` com classe válida e motivo não vazio | Teste falha listando exatamente as chaves ausentes ou sem classe |
| Permissões de dados da IA (`AIDataPermissions`) | Conteúdo de `docs/inventario-dados.md` | Consta explicitamente como `não sincroniza (consentimento por aparelho)` | Teste falha se a classificação de consentimento por aparelho estiver ausente |
| Detector detecta nova chave não inventariada | Snippet sintético com `AsyncStorage.setItem("nova_chave_nao_listada", v)` ou `SecureStore.setItemAsync("nova_secreta", v)` | Função detectora reporta `"nova_chave_nao_listada"` / `"nova_secreta"` como não inventariada | Auto-teste unitário falha se o detector deixar escapar |

</intent-contract>

## Code Map

- `src/modules/security/__tests__/noSecretInAsyncStorage.test.ts` -- Referência de varredura de arquivos de produção (`app/`, `src/`, `packages/`) para chamadas de `AsyncStorage` no Vitest sem `react-native`.
- `src/context/syncStorage.ts`, `src/context/strongGroupSync.ts`, `src/context/webEventLogStorage.ts` -- Chaves de sync, `deviceId`, grupo forte e log web (`AsyncStorage` / `SecureStore` / `webSecrets`).
- `src/services/ocrConfigService.ts`, `src/modules/ai/*`, `src/modules/security/*`, `src/modules/backup/*`, `src/modules/notifications/*` -- Chaves de OCR, IA, segurança/PIN, backup/Drive e notificações.
- `src/context/AppStateProvider.tsx`, `src/hooks/useThemePreferences.ts`, `src/context/DemoModeProvider.tsx`, `app/*.tsx`, `app/(tabs)/*.tsx` -- Chaves de tema, som, modo de apoio, religião, onboarding/tour, chat IA, etc.
- `docs/inventario-dados.md` -- Novo documento de inventário classificado (a criar).
- `src/modules/security/__tests__/dataInventory.test.ts` -- Novo teste de integridade do inventário (a criar).

## Tasks & Acceptance

**Execution:**
- `docs/inventario-dados.md` -- Mapear todas as chaves de `AsyncStorage`, `SecureStore` e `webSecrets` usadas no código de produção (`app/`, `src/`, `packages/`), classificando cada uma como `vira evento`, `usa outro canal`, `não sincroniza` ou `é segredo` com motivo claro (e `AIDataPermissions` como `não sincroniza (consentimento por aparelho)`) -- Atende integralmente aos ACs da Story 9.1.
- `src/modules/security/__tests__/dataInventory.test.ts` -- Implementar extrator estático de chaves (`AsyncStorage`, `SecureStore`, `webSecrets`) sobre os arquivos de produção, parser da tabela de `docs/inventario-dados.md`, asserções de cobertura/classificação e auto-teste do detector (para `AsyncStorage` e `SecureStore`) -- Garante em CI que nenhuma nova chave surja fora do inventário.

**Acceptance Criteria:**
- Given todas as chaves em `AsyncStorage`, `SecureStore` e `webSecrets` usadas em `app/`, `src/` e `packages/`, when o teste varre o código e compara com `docs/inventario-dados.md`, then 100% das chaves estão listadas com uma das 4 classes válidas e motivo.
- Given `docs/inventario-dados.md`, when inspeciono a linha das permissões de dados da IA (`AIDataPermissions`), then ela está classificada como `não sincroniza (consentimento por aparelho)`.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 6 findings — high 0, medium 3, low 3, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` Expressões não resolvidas (`resolvedKey === null`, incluindo template literals locais como `warnKey`) eram descartadas — adicionado suporte a `collectTemplatePrefixConstants` e mantidas entradas `null` no extrator + auto-teste em `dataInventory.test.ts`.
  - `[medium]` `[patch]` `globalConsts` misturava constantes locais entre arquivos — restringido a `export const/let/var` para evitar colisões entre arquivos.
  - `[medium]` `[patch]` Faltava escopo na tabela de inventário, checagem de duplicatas e existência de `Origem` — `parseInventoryMarkdown` agora lê apenas `## Inventário Completo`, valida duplicatas e verifica caminhos de `Origem` no disco.
  - `[low]` `[patch]` Faltava `?.` em `secureCallRegex`/`webSecretsRegex` e checagem de chave vazia `""` — corrigido em `dataInventory.test.ts`.
  - `[low]` `[defer]` Persistência não-KV (IndexedDB `domus_secure` e `FileSystem` auto-backup) — fora do escopo KV de `AsyncStorage`/`SecureStore`, registrado em `deferred`.
  - `[low]` `[defer]` Limitações de parser regex vs AST completo — registrado em `deferred`.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx eslint .`: 0 erros (12 warnings pré-existentes fora dos arquivos da story).
- `npx tsc --noEmit`: 0 erros.
- `npx vitest run --maxWorkers=2`: 127 arquivos / 2971 testes passando (incluindo 10 testes em `dataInventory.test.ts`).

## Auto Run Result

- **Resumo:** Criado o inventário completo `docs/inventario-dados.md` classificando todas as chaves de `AsyncStorage`, `SecureStore` e `webSecrets` em produção (`vira evento`, `usa outro canal`, `não sincroniza` / `não sincroniza (consentimento por aparelho)` e `é segredo`), protegido por suíte automatizada em `src/modules/security/__tests__/dataInventory.test.ts`.
- **Arquivos criados:**
  - `docs/inventario-dados.md` — 45 entradas classificadas com armazenamento, origem e motivo.
  - `src/modules/security/__tests__/dataInventory.test.ts` — extrator estático de chaves, validações do inventário (classes, duplicatas, origens, `AIDataPermissions`, `domus_is_catholic_v1`) e auto-testes do detector.
- **Triagem da revisão:** 4 patches aplicados em `dataInventory.test.ts`, 2 itens registrados em `deferred`.
