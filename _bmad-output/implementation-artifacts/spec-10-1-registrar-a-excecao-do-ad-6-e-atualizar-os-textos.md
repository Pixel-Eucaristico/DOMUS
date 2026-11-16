---
title: 'Story 10.1: Registrar a exceção do AD-6 e atualizar os textos'
type: 'chore'
created: '2026-11-16'
status: 'done'
baseline_revision: '2b32e5f5a5090ed73274bc5a10e9b69e509c1dce'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'AGENTS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O `AD-6` em `ARCHITECTURE-SPINE.md`, o inventário `docs/inventario-dados.md`, a política de privacidade e o `docs/data-safety.md` ainda afirmam de forma absoluta que nenhum segredo entra em eventos, antes de o Épico 10 implementar o sync opt-in de chaves de IA e OCR.

**Approach:** Documentar explicitamente a exceção do `FR-8c` no `AD-6` (`ARCHITECTURE-SPINE.md`), atualizar o inventário (`docs/inventario-dados.md`) e explicar na política de privacidade (`docs/politica-de-privacidade.md` e `PLAY_STORE_LISTING.md`) e no `docs/data-safety.md` que as chaves de IA e OCR, caso o usuário ative o opt-in, viajam cifradas pelos relays apenas em Grupo forte entre aparelhos nativos — sem alterar nenhum arquivo de código.

## Boundaries & Constraints

**Always:**
- Deixar explícito no `AD-6` (`_bmad-output/planning-artifacts/architecture/architecture-DOMUS-2026-10-15/ARCHITECTURE-SPINE.md`) que chaves de API de IA (`domus_ai_key_*`) e do OCR (`domus_ocr_cloud_vision_api_key`) constituem a única exceção documentada (`FR-8c`): só podem entrar em evento **cifrado** (`AES-256-GCM` com derivação de chave dedicada), **só em Grupo forte**, **só entre aparelhos nativos** (nunca na web) e **só com opt-in explícito por aparelho** (desligado por padrão).
- Atualizar `docs/inventario-dados.md` mantendo a classe `é segredo` para `domus_ocr_cloud_vision_api_key` e `domus_ai_key_*`, descrevendo a exceção `AD-6` / `FR-8c` na coluna `Motivo` sem quebrar `dataInventory.test.ts` nem `settingsSyncGuard.test.ts`.
- Atualizar `docs/politica-de-privacidade.md` (§2), `PLAY_STORE_LISTING.md` (cópia da política §2) e `docs/data-safety.md` (§2 F1) explicando que as chaves de IA e OCR, se o usuário ativar a opção, viajam cifradas pelos relays Nostr.
- Preservar integralmente as strings verificadas por `nfr6Verification.test.ts` e `privacyFlagTexts.test.ts` (incluindo `"Última atualização: 9 de novembro de 2026"` e as frases `"Envia:"` / `"Sem isso:"`).

**Never:**
- Alterar qualquer arquivo de código (`.ts`, `.tsx`, `.js`, `.json`), incluindo `src/`, `app/`, `packages/` e testes.
- Alterar `packages/sync`, `ios/`, `android/` ou `replit.*`.

</intent-contract>

## Code Map

- `_bmad-output/planning-artifacts/architecture/architecture-DOMUS-2026-10-15/ARCHITECTURE-SPINE.md` -- `### AD-6 — Onde mora cada tipo de estado` (linhas 75-84): adicionar exceção documentada do `FR-8c` (chaves de IA e OCR só em evento cifrado, só em Grupo forte, só entre aparelhos nativos e só com opt-in explícito).
- `docs/inventario-dados.md` -- Linhas 30-31 (`domus_ocr_cloud_vision_api_key` e `domus_ai_key_*`): manter classe `é segredo` e acrescentar a exceção `AD-6`/`FR-8c` no motivo.
- `docs/politica-de-privacidade.md` -- `## 2. Sincronização entre aparelhos (opcional)` (linhas 38-56): acrescentar item explicando que, se o usuário ativar a sincronização opcional de chaves (apenas em aparelhos nativos e Grupo forte), as chaves de IA e OCR viajam cifradas ponta a ponta (`AES-256-GCM`) pelos relays Nostr.
- `PLAY_STORE_LISTING.md` -- `## 2. Sincronização entre aparelhos (opcional)` (linhas 142-160): espelhar exatamente o mesmo texto adicionado em `docs/politica-de-privacidade.md` §2.
- `docs/data-safety.md` -- `## 2. Fluxos que saem do aparelho`, linha `F1` (`Sincronização`, linha 32): acrescentar referência ao envio opcional de chaves de API de IA e OCR cifradas com AES-256-GCM quando ativado por opt-in em aparelhos nativos no Grupo forte.

## Tasks & Acceptance

**Execution:**
- `_bmad-output/planning-artifacts/architecture/architecture-DOMUS-2026-10-15/ARCHITECTURE-SPINE.md` -- Registrar no `AD-6` a exceção do `FR-8c` (chaves de IA e OCR só em evento cifrado, só em Grupo forte, só entre aparelhos nativos, só com opt-in) -- Atualiza a regra arquitetural antes da implementação do Épico 10.
- `docs/inventario-dados.md` -- Atualizar o motivo de `domus_ocr_cloud_vision_api_key` e `domus_ai_key_*` descrevendo a exceção `AD-6`/`FR-8c` mantendo `é segredo` -- Mantém o inventário consistente com `AD-6` e os testes de inventário.
- `docs/politica-de-privacidade.md`, `PLAY_STORE_LISTING.md`, `docs/data-safety.md` -- Explicar em §2 e no fluxo `F1` que, se o usuário ativar o opt-in em aparelhos nativos no Grupo forte, as chaves de IA e OCR viajam cifradas pelos relays Nostr, preservando todas as âncoras exigidas por `nfr6Verification.test.ts` e `privacyFlagTexts.test.ts` -- Garante transparência pública sem alterar código.

**Acceptance Criteria:**
- Given `ARCHITECTURE-SPINE.md` (`AD-6`) e `docs/inventario-dados.md`, when inspecionados, then ambos descrevem a exceção do `FR-8c`: chaves de IA e OCR só em evento cifrado, só em Grupo forte, só entre aparelhos nativos e só com opt-in.
- Given `docs/politica-de-privacidade.md`, `PLAY_STORE_LISTING.md` e `docs/data-safety.md`, when inspecionados, then explicam que as chaves, se o usuário ativar, viajam cifradas pelos relays, e todos os testes existentes (`nfr6Verification.test.ts`, `privacyFlagTexts.test.ts`, `dataInventory.test.ts`, `settingsSyncGuard.test.ts`) continuam passando sem alteração de código.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 6 findings — high 0, medium 0, low 4, false 2, maybe-false 0
- findings:
  - `[low]` `[patch]` Definição da classe `é segredo` em `docs/inventario-dados.md:10` não mencionava a exceção `AD-6 / FR-8c` — atualizada com a ressalva explícita.
  - `[false]` `[reject]` Data e Seção 3 em `docs/data-safety.md` — `nfr6Verification.test.ts:100` exige `"Última atualização: 9 de novembro de 2026"` e chaves de API do usuário não são tipo pessoal separado no Play.
  - `[low]` `[patch]` Termo interno `"Grupo forte"` na política pública (`docs/politica-de-privacidade.md` e `PLAY_STORE_LISTING.md`) — substituído por `"grupos com criptografia ponta a ponta via Segredo de grupo de 256 bits"`.
  - `[low]` `[patch]` Ordem dos itens na política ocultava retenção em relays após desligar opt-in — movido para antes da retenção em relays e explicitado que eventos já publicados permanecem mesmo desligando a opção.
  - `[low]` `[patch]` `AD-6` em `ARCHITECTURE-SPINE.md` não explicitava persistência só do ciphertext no log/SQLite e chaves decifradas apenas no `SecureStore` nativo — detalhamento adicionado.
  - `[false]` `[reject]` Escopo `Binds` de `AD-6` (`src/**`) — armazenamento de segredos e opt-in residem em `src/**`.

## Verification

**Commands:**
- `git diff --name-only` -- **passou**: apenas 5 arquivos `.md` de documentação/especificação alterados (nenhum código `.ts`/`.tsx`/`.js`/`.json`).
- `npx vitest run src/modules/strongGroup/__tests__/nfr6Verification.test.ts src/constants/__tests__/privacyFlagTexts.test.ts src/modules/security/__tests__/dataInventory.test.ts src/modules/security/__tests__/settingsSyncGuard.test.ts` -- **passou**: `4` arquivos, `109` testes passando.
- `rm -f expo-env.d.ts && npx eslint . && npx tsc --noEmit` -- **passou**: 0 erros (`eslint`: 0 erros, 13 warnings pré-existentes; `tsc --noEmit`: 0 erros).

## Auto Run Result

- **Story:** `10-1-registrar-a-exceção-do-ad-6-e-atualizar-os-textos`
- **Status:** `done`
- **Resumo:** Exceção do `FR-8c` registrada no `AD-6` (`ARCHITECTURE-SPINE.md`) e no inventário (`docs/inventario-dados.md`); política pública (`docs/politica-de-privacidade.md`, `PLAY_STORE_LISTING.md`) e `docs/data-safety.md` atualizados sem nenhuma alteração de código.
- **Arquivos alterados:**
  - `_bmad-output/planning-artifacts/architecture/architecture-DOMUS-2026-10-15/ARCHITECTURE-SPINE.md` — exceção `FR-8c` no `AD-6`
  - `docs/inventario-dados.md` — classe `é segredo` e motivos de `domus_ocr_cloud_vision_api_key` e `domus_ai_key_*`
  - `docs/politica-de-privacidade.md` e `PLAY_STORE_LISTING.md` — explicação da sincronização opcional cifrada de chaves em §2
  - `docs/data-safety.md` — atualização da linha `F1` (`Sincronização`)
- **Review findings:** 4 entradas `low` corrigidas (patches aplicados), 0 `medium`, 0 `high`, 2 `false` rejeitadas.
- **Follow-up review recommended:** `false` (0 entradas `high`/`medium` corrigidas).
- **Checks:** `git diff --name-only` (somente `.md`), `vitest` (`4 files / 109 tests passed`), `eslint .` (`0 errors`), `tsc --noEmit` (`0 errors`)
