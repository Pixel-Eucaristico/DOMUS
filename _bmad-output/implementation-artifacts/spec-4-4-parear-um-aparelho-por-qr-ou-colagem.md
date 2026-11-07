---
title: 'Story 4.4: Parear um aparelho por QR ou colagem'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: 'd1f1e5572cae1d5cfe33d5602eb35ed949eca315'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-3-criar-um-grupo-forte-e-mostra-lo-por-qr-e-por-texto.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-1-gerar-o-segredo-de-grupo-forte-e-derivar-as-chaves.md'
  - '{project-root}/src/modules/strongGroup/groupSecret.ts'
  - '{project-root}/src/context/strongGroupSync.ts'
  - '{project-root}/src/context/syncStorage.ts'
  - '{project-root}/src/components/sync/QRScannerModal.tsx'
  - '{project-root}/app/sync.tsx'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** O pareamento de novos aparelhos na tela `app/sync.tsx` e no leitor `QRScannerModal` ainda impõe os limites legados do código fraco de 6 caracteres (`maxLength={8}` no campo de texto e filtro de 4 a 8 caracteres no scanner). Com isso, o usuário não consegue parear outro aparelho lendo o QR Code alfanumérico do Grupo forte nem colando o segredo canônico de 79 caracteres (`DOMUS1-....`), e códigos de 6 caracteres ainda eram aceitos silenciosamente em vez de instruir o usuário a usar o formato seguro.

**Approach:** Atualizar o leitor de QR Code (`QRScannerModal`) e o campo de colagem de `app/sync.tsx` para aceitar o segredo do Grupo forte (com ou sem prefixo `domus://`), eliminando a trava de 8 caracteres. Recusar tentativas de pareamento com o código antigo de 6 caracteres informando mensagem amigável que orienta o uso do QR Code ou do segredo forte do aparelho principal. Em caso de segredo inválido ou truncado, emitir erro claro e nunca gravar dados no armazenamento.

## Boundaries & Constraints

**Always:**
- O leitor de QR Code (`QRScannerModal`) e a entrada de texto aceitam o segredo canônico completo de 79 caracteres (`DOMUS1-...`), normalizando qualquer prefixo `domus://`.
- Códigos legados de 6 caracteres são terminantemente recusados no pareamento novo com mensagem instrutiva em pt-BR orientando o uso do QR Code ou segredo forte.
- Segredos inválidos ou corrompidos disparam erro amigável (`appAlert` ou `errorMessage`) e não salvam nada em `SecureStore` nem em `AsyncStorage`.
- O Segredo forte do grupo é gravado exclusivamente em `SecureStore` (nativo) ou `webSecrets` (web), com garantia de não queda em texto claro para `AsyncStorage`.
- A interface `app/sync.tsx` preserva as regras de rolagem e teclado da Story 13.2 (exatamente 1 `ScrollView` no modal de QR Code, sem conflitos com `KeyboardSheet`).
- Qualquer diálogo de feedback utiliza `appAlert` / `appConfirm`, nunca diálogos nativos do sistema (`Alert.alert`, `window.alert`).
- Todos os textos de interface estão em português do Brasil (pt-BR) com acentos completos.

**Never:**
- Nunca permitir novos pareamentos com o código legado de 6 caracteres.
- Nunca truncar o segredo do Grupo forte no input de texto ou no scanner de QR.
- Nunca gravar segredos inválidos ou corrompidos em nenhum armazenamento local.
- Nunca usar alertas nativos do sistema.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Escaneamento de QR Code com segredo forte válido | Leitor escaneia QR Code contendo `DOMUS1-...` | Fecha o scanner, conecta ao grupo forte, persiste no SecureStore/webSecrets e limpa resquício legado | Sem erro |
| Escaneamento de QR Code com prefixo de URI | Leitor escaneia `domus://DOMUS1-...` | Remove o prefixo `domus://`, valida e conecta com sucesso | Sem erro |
| Colagem do segredo forte no campo de texto | Usuário cola o segredo de 79 caracteres e aciona "Entrar" | Valida checksum, persiste no SecureStore/webSecrets, conecta ao grupo e fecha o formulário | Sem erro |
| Tentativa de entrada com código legado de 6 caracteres | Usuário digita ou escaneia código antigo de 6 caracteres | Rejeita o pareamento e exibe aviso amigável orientando a usar o QR Code do Grupo forte | Exibe aviso explicativo via `appAlert` / `errorMessage` sem salvar nada |
| Segredo com checksum incorreto ou truncado | Entrada iniciando com `DOMUS1` mas corrompida | Rejeita a entrada com mensagem de segredo inválido | `errorMessage` preenchido, nada é salvo |
| Entrada vazia ou contendo apenas espaços | Usuário clica no botão com campo em branco | Bloqueia ação (botão desabilitado ou erro) | Sem alteração de estado |

</intent-contract>

## Code Map

- `src/components/sync/QRScannerModal.tsx` -- Remover filtro obsoleto de 8 caracteres; aceitar segredos `DOMUS1-...` com ou sem prefixo `domus://` e notificar código escaneado.
- `src/context/strongGroupSync.ts` -- Em `resolveJoinSyncGroup`, recusar códigos legados de 6 caracteres com erro explícito ("Códigos de 6 caracteres foram descontinuados. Use o QR Code ou cole o Segredo de 79 caracteres do aparelho principal"); normalizar prefixo `domus://` antes do parsing; manter derivação e persistência estrita do Grupo forte.
- `src/context/useSyncEngine.ts` -- Em `joinGroup`, tratar a mensagem de erro retornada por `resolveJoinSyncGroup` e expor em `errorMessage` para feedback da UI.
- `app/sync.tsx` -- Atualizar o formulário de entrada: remover `maxLength={8}`, ajustar layout do input para acomodar o segredo forte de 79 caracteres em fonte monoespaçada legível, suportar colagem completa e exibir avisos de erro via `appAlert` e `errorMessage`.
- `src/context/__tests__/strongGroupSync.test.ts` -- Testes unitários de `resolveJoinSyncGroup` cobrindo segredo forte, prefixo `domus://`, rejeição de código de 6 caracteres e entradas corrompidas.
- `src/components/sync/__tests__/QRScannerModal.test.ts` -- Testes de processamento do QR Code aceitando `DOMUS1-...` e removendo `domus://`.

## Tasks & Acceptance

**Execution:**
- [x] `src/context/strongGroupSync.ts` -- Atualizar `resolveJoinSyncGroup` para normalizar prefixo `domus://`, rejeitar códigos legados de 6 caracteres com mensagem amigável e validar estritamente o segredo forte de 256 bits via `parseGroupSecret`.
- [x] `src/components/sync/QRScannerModal.tsx` -- Expandir o tratamento de código escaneado para aceitar strings longas do Grupo forte `DOMUS1-...` (com ou sem prefixo `domus://`), eliminando a limitação obsoleta de `length <= 8`.
- [x] `app/sync.tsx` -- Remover `maxLength={8}` do `<TInput>`, ajustar estilo/fonte para aceitar até 100 caracteres de colagem de segredo forte, melhorar feedback de validação e tratar recusa de código antigo com `appAlert`.
- [x] `src/context/__tests__/strongGroupSync.test.ts` -- Atualizar suíte de testes unitários validando a nova regra de recusa de códigos legados no pareamento, aceitação de prefixo `domus://` e preservação da persistência exclusiva em `SecureStore`/`webSecrets`.
- [x] `src/components/sync/__tests__/QRScannerModal.test.ts` -- Criar testes unitários para a lógica de extração e validação de QR Code no scanner.

**Acceptance Criteria:**
- Given a tela `app/sync.tsx` e o leitor de QR Code
- When o usuário escaneia um QR Code ou cola um segredo canônico `DOMUS1-...` (com ou sem prefixo `domus://`)
- Then o aparelho conecta com sucesso ao Grupo forte e persiste o segredo em `SecureStore` (ou `webSecrets`)
- And se o usuário tentar usar um código antigo de 6 caracteres, o pareamento é recusado com mensagem amigável instruindo o uso do QR Code
- And se o segredo for inválido ou truncado, uma mensagem de erro é exibida e nenhum dado é gravado no armazenamento
- And todos os textos estão em português do Brasil (pt-BR) com acentos completos.

## Spec Change Log

_None._

## Review Triage Log

- `patch`: Adicionados retornos antecipados (`return;`) em `handleJoinGroup` e `handleScanResult` em `app/sync.tsx` após emissão de `appAlert` para código legado de 6 caracteres, evitando fall-through indevido para `joinGroup`.
- `patch`: Substituída mensagem hardcoded em `app/sync.tsx` pela constante exportada `LEGACY_CODE_DISCONTINUED_MESSAGE` de `src/context/strongGroupSync.ts`.
- `patch`: Adicionada trava `!normalized.startsWith("DOMUS")` na verificação de 6 caracteres em `strongGroupSync.ts` e `app/sync.tsx` para evitar que prefixos truncados de segredo forte (ex.: `"DOMUS1"`) fossem erroneamente classificados como código legado descontinuado.
- `patch`: Adicionados atributos `autoCorrect={false}` e `spellCheck={false}` ao componente `<TInput>` em `app/sync.tsx` para evitar interferência do corretor do SO em segredos de sincronização.
- `defer`: Testes de execução em tempo de execução para `useSyncEngine` e `app/sync.tsx` catalogados nos itens diferidos de longo prazo D5/D21 devido à limitação do Vitest com módulos nativos do React Native (`expo-camera`, `@react-native-community/netinfo`).
- `defer`: Verificação se o segredo inserido é idêntico ao grupo atual (`isSameGroupSecret`), mantendo a arquitetura atual de reconexão idempotente (fora do escopo estrito da Story 4.4).
- `defer`: Checagem preventiva de conectividade com relays antes de tentar parsing de segredo no `useSyncEngine.ts` (comportamento de arquitetura de rede pré-existente).
- `reject`: Rejeitar antecipadamente no `extractScannedCode` qualquer QR que não seja Domus (rejeitado: o scanner deve repassar strings alfanuméricas de 6 caracteres para permitir que a UI apresente o alerta educativo de descontinuação).
- `reject`: Remover verificação redundante de `domus://` em `handleScanResult` (rejeitado: preservada por programação defensiva na camada de UI).

## Verification

**Commands:**
- `npx vitest run src/context/__tests__/strongGroupSync.test.ts src/components/sync/__tests__/QRScannerModal.test.ts` -- expected: todos os testes de pareamento por QR e colagem passam com 0 falhas.
- `npx vitest run` -- expected: 108+ suítes de teste passando com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipo.
- `npx eslint .` -- expected: 0 erros de linting.

## Auto Run Result

### Summary of implemented change
- Extraído `extractScannedCode` em `src/components/sync/qrScannerUtils.ts` e integrado ao `QRScannerModal.tsx`, eliminando a restrição obsoleta de 8 caracteres (`cleaned.length <= 8`) e normalizando prefixos `domus://` para aceitar o segredo do Grupo forte de 79 caracteres.
- Atualizado `resolveJoinSyncGroup` em `src/context/strongGroupSync.ts` para normalizar prefixos `domus://` (case-insensitive), validar segredos fortes via `parseGroupSecret` e rejeitar terminantemente códigos legados de 6 caracteres com erro explícito instrutivo (`LEGACY_CODE_DISCONTINUED_MESSAGE`), sem gravar nada no armazenamento.
- Em `src/context/useSyncEngine.ts`, propagado o erro específico de `resolveJoinSyncGroup` para `errorMessage` no fluxo de `joinGroup`.
- Em `app/sync.tsx`, removido `maxLength={8}` do `<TInput>`, configurado `maxLength={100}`, aplicada tipografia monoespaçada legível com espaçamento adequado, e adicionado tratamento via `appAlert` para orientar o usuário caso tente inserir ou escanear códigos legados de 6 caracteres. Preservado exatamente 1 `ScrollView` no modal de QR Code.
- Aplicadas correções da revisão adversarial paralela: retornos antecipados em `app/sync.tsx`, constante unificada `LEGACY_CODE_DISCONTINUED_MESSAGE`, discriminação de prefixos `"DOMUS"` truncados e desativação de autocorreção no teclado.
- Criados testes unitários em `src/components/sync/__tests__/QRScannerModal.test.ts` e expandida a suíte em `src/context/__tests__/strongGroupSync.test.ts`.

### Verification performed
- `npx vitest run src/context/__tests__/strongGroupSync.test.ts src/components/sync/__tests__/QRScannerModal.test.ts`: 43 testes passando com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros de tipo.
- `npx eslint .`: 0 erros (13 avisos pré-existentes, nenhum novo).
- `npx vitest run`: 109 suítes de testes passando (2.497+ testes com 0 falhas).
