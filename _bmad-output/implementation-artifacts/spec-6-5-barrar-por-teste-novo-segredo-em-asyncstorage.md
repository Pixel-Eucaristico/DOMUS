---
title: 'Story 6.5: Barrar por teste novo segredo em AsyncStorage'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_revision: 'c8d2bb77c0a1ec9b6fb98088382000e9cd9a475b'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '_bmad-output/implementation-artifacts/epic-6-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** A regra de ESLint atual em `eslint.config.js` barra apenas variáveis de ambiente `process.env.EXPO_PUBLIC_*` contendo `SECRET`, `PRIVATE` ou `PASSWORD`. Não há barreira automatizada por teste que impeça alguém de voltar a gravar um segredo em texto puro no `AsyncStorage` via `AsyncStorage.setItem` / `multiSet` / `mergeItem` (FR-23, NFR-1).

**Approach:** Criar uma suíte de verificação estática automatizada (`src/modules/security/__tests__/noSecretInAsyncStorage.test.ts`, seguindo o padrão de `src/services/__tests__/noNativeAlert.test.ts`) que varre todo o código de produção (`app/`, `src/`, `packages/`, `components/`, `lib/`, `constants/`) procurando escritas em `AsyncStorage` (`setItem`, `mergeItem`, `multiSet`, inclusive via notação de colchetes, alias de importação e constantes locais resolvidas) cujos identificadores ou valores de chave contenham `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY` (ou `APIKEY`) ou as chaves protegidas do DOMUS (`domus_ocr_cloud_vision_api_key`, `domus_auto_backup_device_key`, `domus_nostr_group_code`, `domus_strong_group_secret_v1`, `domus_events_v1`). O teste deve suportar uma lista estruturada de exceções justificadas (`ALLOWED_EXCEPTIONS` com campo `reason` obrigatório) e passar sem nenhuma exceção (`ALLOWED_EXCEPTIONS.length === 0`) após as Stories 6.1 a 6.4.

## Boundaries & Constraints

**Always:**
- Varrer todos os diretórios de código do app (`app`, `src`, `packages`, `components`, `lib`, `constants`), ignorando arquivos de teste e comentários.
- Detectar chamadas de escrita no `AsyncStorage` (`setItem`, `mergeItem`, `multiSet`) tanto no identificador da chave quanto no literal de string resolvido de constantes no arquivo.
- Barrar chaves contendo `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY` (case-insensitive, incluindo `apiKey` / `APIKEY`) e as chaves sensíveis migradas no Épico 6.
- Exigir que qualquer item em `ALLOWED_EXCEPTIONS` tenha um motivo (`reason`) não-vazio documentado.
- Confirmar que após as Stories 6.1 a 6.4 o código passa com `ALLOWED_EXCEPTIONS` vazia (zero exceções).

**Never:**
- Nunca alterar `packages/sync`, `ios/` ou `android/`.
- Nunca permitir exceção sem motivo escrito (`reason` vazio deve falhar o teste).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Varredura do repositório atual (pós-6.1 a 6.4) | Todos os arquivos de produção do repositório | 0 violações encontradas e `ALLOWED_EXCEPTIONS` vazia | Passa limpo |
| Chamada direta com termo proibido | `AsyncStorage.setItem("user_password", val)` ou `AsyncStorage.setItem(API_KEY, val)` | Detectado como violação | Falha o teste indicando arquivo e chave |
| Constante indireta resolvida | `const K = "domus_secret_v1"; AsyncStorage.setItem(K, val)` | Detectado pela resolução da constante `K` | Falha o teste |
| `multiSet` / `mergeItem` / colchetes / alias | `AsyncStorage.multiSet([[TOKEN_KEY, v]])`, `AsyncStorage["setItem"](SECRET, v)`, alias de import | Detectado como violação | Falha o teste |
| Exceção com motivo escrito vs sem motivo | Entrada em `ALLOWED_EXCEPTIONS` | Permite se `reason` preenchido; falha se `reason` vazio | Garante justificativa escrita |

</intent-contract>

## Code Map

- `src/modules/security/__tests__/noSecretInAsyncStorage.test.ts`:
  - `ALLOWED_EXCEPTIONS`: lista tipada (atualmente vazia `[]`) com validação de `reason` obrigatório.
  - `findSecretWritesInSource(source, filePath, exceptions)`: parser léxico que remove comentários, identifica alias de `AsyncStorage`, coleta constantes string no arquivo, extrai chamadas `setItem` / `mergeItem` / `multiSet` e verifica os termos proibidos.
  - Testes sobre o código real do repositório + auto-testes do detector.

## Tasks & Acceptance

**Execution:**
- `src/modules/security/__tests__/noSecretInAsyncStorage.test.ts` -- Implementar o detector estático e suíte de testes de não-regressão para NFR-1 e FR-23.

**Acceptance Criteria:**
- Given a regra de ESLint só cobre `EXPO_PUBLIC_*`
- When crio um teste que varre o código por chamadas de `AsyncStorage.setItem` cujo nome de chave contenha `PASSWORD`, `SECRET`, `TOKEN` ou `API_KEY`
- Then o teste falha para qualquer ocorrência fora de uma lista de exceções justificadas
- And depois das Stories 6.1 a 6.4 o teste passa sem exceção
- And a lista de exceções, se existir, tem o motivo escrito.

## Spec Change Log

*(Vazio - primeira versão da especificação)*

## Review Triage Log

- **Subagents executados na iteração 1:**
  - Intent Alignment Auditor (`e89b5970-dce3-491b-91b2-4fdca2897843`): Aprovado; apontou ajuste no SHA de `baseline_revision` e sugestão de cobertura de desestruturação de métodos. Aplicados.
  - Blind Hunter Reviewer (`b4c76b00-5b21-45b1-a5d9-06654d7e9d7a`): Apontou suporte a múltiplas declarações de variável com mesmo nome (`Map<string, string[]>`), inicializadores multi-linha/enums, desestruturação/`useAsyncStorage`, propriedades de objeto (`{ storage: AsyncStorage }`) e inclusão de `domus_security_settings_v1`. Todos integrados.
  - Edge Case Hunter Reviewer (`667ad2e9-63af-4c7d-ab6e-14db1557daa1`): Apontou extração individual da chave (1º item de cada tupla) em `multiSet` para evitar falsos positivos no valor e aumento do limite `visited.size < 64`. Aplicados.
  - Verification Gap Reviewer (`fb04a675-f93a-4b64-a40e-e12decc009ca`): Recomendou rastrear parâmetros default (`storage: Pick<typeof AsyncStorage, "setItem"> = AsyncStorage`) e adicionar snippets de auto-teste correspondentes. Aplicados (53 testes aprovados).

## Auto Run Result

- `rm -f expo-env.d.ts && npx vitest run src/modules/security/__tests__/noSecretInAsyncStorage.test.ts`: 53/53 testes aprovados (100%).
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros.
- `npx eslint src/modules/security/__tests__/noSecretInAsyncStorage.test.ts`: 0 erros, 0 avisos.

## Verification

**Commands:**
- `rm -f expo-env.d.ts && npx vitest run src/modules/security/__tests__/noSecretInAsyncStorage.test.ts` -- expected: 100% dos testes aprovados.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros no TypeScript.
- `npx eslint src/modules/security/__tests__/noSecretInAsyncStorage.test.ts` -- expected: 0 erros e 0 avisos.
