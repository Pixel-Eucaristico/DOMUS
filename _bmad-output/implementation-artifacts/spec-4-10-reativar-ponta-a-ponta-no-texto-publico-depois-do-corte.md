---
title: 'Story 4.10: Reativar "ponta-a-ponta" no texto público depois do corte'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_revision: '9b2a1fd98af8df776c3f78e167e6f8fb68c327e0'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-9-cortar-o-grupo-antigo-na-versao-minima-e-na-data.md'
  - '{project-root}/docs/risco-residual-xor.md'
  - '{project-root}/docs/politica-de-privacidade.md'
  - '{project-root}/PLAY_STORE_LISTING.md'
  - '{project-root}/app/privacy-policy.tsx'
  - '{project-root}/src/constants/privacyFlagTexts.ts'
  - '{project-root}/docs/data-safety.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Na Story 1.4, a declaração de "criptografia ponta a ponta" foi removida da loja e da política de privacidade porque o canal de sincronização legado utilizava cifra XOR fraca com código de 6 caracteres (FR-5, FR-14). Agora que o corte do canal legado foi plenamente executado na Story 4.9 e o único canal de sincronização ativo utiliza o Grupo forte com segredo de 256 bits e cifra autenticada AES-256-GCM, os textos públicos precisam reativar a afirmação verdadeira de criptografia de ponta a ponta, respaldados por verificação técnica formal ligada ao NFR-6.

**Approach:** Atualizar as três cópias idênticas da política de privacidade (`docs/politica-de-privacidade.md`, `app/privacy-policy.tsx` e o bloco da política em `PLAY_STORE_LISTING.md`) e a constante `src/constants/privacyFlagTexts.ts` para declarar que a sincronização opera com criptografia de ponta a ponta (AES-256-GCM); reativar a menção na descrição e tags de busca do `PLAY_STORE_LISTING.md` e em `docs/data-safety.md`; manter o histórico antigo em XOR descrito como risco residual referenciando `docs/risco-residual-xor.md`; registrar formalmente a verificação de código na checklist `docs/checklist-nfr-6-ponta-a-ponta.md` vinculada ao NFR-6; e criar testes automatizados que validem a veracidade das afirmações públicas contra a implementação de código.

## Boundaries & Constraints

**Always:**
- A afirmação "criptografia ponta a ponta" só pode ser reativada porque o corte do canal legado (Story 4.9) encerrou transmissões e recepções no formato fraco XOR, restando exclusivamente o Grupo forte (AES-256-GCM) como canal ativo de sincronização (FR-14, NFR-6).
- As três cópias da política pública (`docs/politica-de-privacidade.md`, `app/privacy-policy.tsx` e o rascunho em `PLAY_STORE_LISTING.md`) e o arquivo de constantes `src/constants/privacyFlagTexts.ts` devem manter textos rigorosamente idênticos nas frases "Envia:" e "Sem isso:" da flag `sync`.
- O histórico passado transmitido em cifra XOR através de relays Nostr públicos deve continuar registrado como risco residual e apontar para `docs/risco-residual-xor.md`.
- Uma checklist formal de verificação deve ser registrada em `docs/checklist-nfr-6-ponta-a-ponta.md`, comprovando tecnicamente o cumprimento do NFR-6 e do critério SM-3 do PRD ("100% das afirmações públicas sobre privacidade e segurança são verificáveis no código").
- A data de última atualização da política de privacidade deve ser avançada para a data da entrega ("9 de novembro de 2026") de forma sincronizada nas três fontes.
- Textos estritamente em pt-BR com acentuação completa (NFR-7).
- A frase da flag `sync` deve caber em atributo JSX (sem aspas duplas, chaves, &, <, > ou quebras de linha).

**Never:**
- Nunca reativar "ponta-a-ponta" sem evidência comprovada no código de que nenhum tráfego novo trafega em XOR.
- Nunca omitir o risco residual do histórico passado publicado em relays de terceiros.
- Nunca reativar declarações inverídicas como "SQLite criptografado" ou "WebRTC" (que continuam falsas).
- Nunca quebrar o teste de paridade `src/constants/__tests__/privacyFlagTexts.test.ts`.

</intent-contract>

## Code Map

- `src/constants/privacyFlagTexts.ts` -- Define as frases canônicas "Envia:" e "Sem isso:" para a flag `sync`, atualizando para declarar criptografia ponta a ponta (AES-256-GCM).
- `docs/politica-de-privacidade.md` -- Fonte única da política pública (markdown); atualiza a Seção 2 (Sincronização entre aparelhos), a data de atualização e a frase da flag `sync`.
- `app/privacy-policy.tsx` -- Tela in-app da política de privacidade (TSX/JSX); atualiza a Seção 2, a constante `LAST_UPDATED` e a frase da flag `sync`.
- `PLAY_STORE_LISTING.md` -- Metadados e textos para o Google Play Console; atualiza a descrição da funcionalidade de sincronização, as tags de busca, a data da política e o bloco markdown incorporado da política.
- `docs/data-safety.md` -- Folha de respostas do formulário Data Safety do Google Play; atualiza a resposta sobre "cifrados de ponta a ponta" de "Não declarar" para "Sim" com justificativa técnica.
- `docs/checklist-nfr-6-ponta-a-ponta.md` -- Novo documento formal registrando a checklist de verificação do NFR-6 que mapeia cada afirmação pública ao respectivo arquivo, módulo e teste no código.
- `app/sync.tsx` -- Atualiza texto explicativo do card informativo de sincronização para mencionar a proteção ponta a ponta.
- `src/constants/__tests__/privacyFlagTexts.test.ts` -- Suíte existente que valida a paridade absoluta das frases entre os 3 documentos.
- `src/modules/strongGroup/__tests__/nfr6Verification.test.ts` -- Nova suíte automatizada que verifica o cumprimento do NFR-6, validando que todas as menções públicas a ponta a ponta correspondem à criptografia AES-256-GCM e que o corte do canal legado permanece intransponível.

## Tasks & Acceptance

**Execution:**
- [x] `src/constants/privacyFlagTexts.ts` -- Atualizar a frase `sends` da flag `sync` para: `"seus registros a seis relays Nostr públicos, com criptografia ponta a ponta (AES-256-GCM); o identificador do aparelho, o horário, o tamanho de cada lote e a chave pública do grupo vão sem cifra, os relays veem o endereço IP e os registros continuam lá depois que você sai do grupo."` -- Racional: fornecer a frase canônica auditada sem caracteres proibidos em JSX.
- [x] `docs/politica-de-privacidade.md` -- Atualizar a Seção 2 (Sincronização entre aparelhos) descrevendo a criptografia de ponta a ponta autenticada (AES-256-GCM) baseada no segredo de 256 bits, a descontinuação do canal de 6 caracteres e o apontamento para o risco residual em `docs/risco-residual-xor.md`; atualizar data para "9 de novembro de 2026" e atualizar a frase da flag `sync` -- Racional: manter a fonte canônica da política fiel ao código (FR-14, NFR-6).
- [x] `app/privacy-policy.tsx` -- Atualizar a Seção 2 na UI in-app, a constante `LAST_UPDATED` ("9 de novembro de 2026") e a flag `sync` com o mesmo texto -- Racional: garantir que o usuário leia no aplicativo exatamente o que está publicado.
- [x] `PLAY_STORE_LISTING.md` -- Atualizar a descrição da sincronização na descrição completa do app ("Sincronize seus aparelhos por relays Nostr públicos, com criptografia ponta a ponta (AES-256-GCM). Sem servidor do DOMUS. Os registros publicados continuam nos relays mesmo depois de sair do grupo."); adicionar a tag de busca `criptografia ponta a ponta`; e atualizar a cópia da política incorporada com a nova data e o novo texto da Seção 2 e da flag `sync` -- Racional: alinhar o material de divulgação da Play Store à realidade de segurança do aplicativo.
- [x] `docs/data-safety.md` -- Atualizar a linha "Os dados ficam cifrados de ponta a ponta?" para "**Sim**" e detalhar a cifra AES-256-GCM e o corte rígido da Story 4.9 -- Racional: alinhar as respostas do formulário Data Safety aos padrões de segurança alcançados.
- [x] `app/sync.tsx` -- Atualizar o texto do card de informações (`infoText`) para citar criptografia de ponta a ponta (AES-256-GCM) -- Racional: transparência visual na tela de pareamento e grupos.
- [x] `docs/checklist-nfr-6-ponta-a-ponta.md` -- Criar o documento de checklist de verificação NFR-6 com matriz completa de afirmações públicas, evidências de código, testes automatizados e análise de risco residual -- Racional: cumprimento estrito do critério de aceitação da Story 4.10 e do SM-3.
- [x] `src/modules/strongGroup/__tests__/nfr6Verification.test.ts` -- Criar suíte de testes automatizados para verificar que: as afirmações de ponta a ponta na loja e nas políticas possuem prova no código; `docs/checklist-nfr-6-ponta-a-ponta.md` e `docs/risco-residual-xor.md` existem e possuem os itens obrigatórios; e os módulos de cifra e corte mantêm suas invariantes -- Racional: automação contínua da garantia NFR-6 na CI.

**Acceptance Criteria:**
- **Given** o corte da Story 4.9 foi executado e verificado
- **When** inspeciono as declarações públicas em `PLAY_STORE_LISTING.md`, `docs/politica-de-privacidade.md`, `app/privacy-policy.tsx` e `docs/data-safety.md`
- **Then** a afirmação "criptografia ponta a ponta (AES-256-GCM)" está presente e associada à sincronização por relays Nostr
- **And** as três fontes da política pública possuem textos rigorosamente idênticos para a flag `sync` e passam no teste `privacyFlagTexts.test.ts`
- **And** o histórico antigo em XOR continua descrito como risco residual nas políticas com referência ao documento `docs/risco-residual-xor.md`
- **And** o documento `docs/checklist-nfr-6-ponta-a-ponta.md` registra a auditoria técnica completa de conformidade com o NFR-6
- **And** a suíte automatizada `nfr6Verification.test.ts` valida as afirmações e a integridade de todas as referências com 0 falhas.

## Spec Change Log

_None._

## Review Triage Log

### Rodada 1 (Parallel Multi-Lens Review)
- **Blind Hunter (Lens 1) & Edge Case Hunter (Lens 2):**
  - [HIGH] Identificaram que `docs/checklist-nfr-6-ponta-a-ponta.md`, `docs/data-safety.md` e `nfr6Verification.test.ts` citavam nomes de arquivos inexistentes (`strongGroupCrypto.ts` e `strongGroupKeys.ts`). *Ação: corrigido para apontar e testar os módulos reais `eventCipher.ts` e `groupSecret.ts`.*
- **Blind Hunter (Lens 1) & Verification Gap Reviewer (Lens 3):**
  - [HIGH] Identificaram texto obsoleto de cifra fraca no modal de tour (`src/tour/screenIntroContent.ts:129` ainda dizia "com uma cifra simples derivada do código do grupo"). *Ação: corrigido para "com criptografia ponta a ponta (AES-256-GCM)".*
- **Blind Hunter (Lens 1) & Edge Case Hunter (Lens 2):**
  - [MEDIUM] Em `app/sync.tsx:596-604`, o card informativo de criptografia ponta a ponta (AES-256-GCM) era exibido mesmo se `!isStrongGroup`. *Ação: corrigido para condicionar o texto do card ao `isStrongGroup`, exibindo orientação de migração para canais legados.*
- **Blind Hunter (Lens 1):**
  - [MEDIUM] Instrução na interface `app/sync.tsx` dizia "Com código" / "entre com o código". *Ação: corrigido para "Com segredo" / "entre com o segredo ou escaneie o QR Code".*
  - [LOW] Seção 1 da política ("Segredos") omitia a palavra "segredo". *Ação: corrigido nas três cópias para "o segredo ou código do grupo de sincronização".*
  - [LOW] Tabela do checklist NFR-6 (A4) citava suíte incorreta. *Ação: corrigido para `syncCoexistence.test.ts` e `syncPayload.test.ts`.*
- **Intent Alignment Auditor (Lens 4):**
  - Veredito: Conformidade Total com os critérios de aceite do FR-14 e NFR-6.
- **Status pós-correções:** 95 testes passando em `privacyFlagTexts.test.ts` e `nfr6Verification.test.ts`, 28 testes passando em `syncCutoff.test.ts`, tipagem TypeScript estrita 100% verde com 0 erros, e ESLint com 0 erros e 0 avisos. Follow-up review recomendado: false.

## Design Notes

A expressão exata da flag `sync` foi desenhada para atender a três restrições simultâneas:
1. Declarar expressamente "criptografia ponta a ponta (AES-256-GCM)".
2. Manter a honestidade sobre metadados públicos nos relays (IP, timestamp, tamanho de lote e chave pública).
3. Não conter aspas duplas nem caracteres incompatíveis com atributos JSX (`"`, `{`, `}`, `&`, `<`, `>`).

Texto da frase `sync.sends`:
`"seus registros a seis relays Nostr públicos, com criptografia ponta a ponta (AES-256-GCM); o identificador do aparelho, o horário, o tamanho de cada lote e a chave pública do grupo vão sem cifra, os relays veem o endereço IP e os registros continuam lá depois que você sai do grupo."`

## Verification

**Commands:**
- `npx vitest run src/constants/__tests__/privacyFlagTexts.test.ts src/modules/strongGroup/__tests__/nfr6Verification.test.ts` -- expected: todos os testes de privacidade e de verificação NFR-6 passam com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit` -- expected: 0 erros de tipagem TypeScript strict.
- `npx eslint src/constants/ app/ src/modules/` -- expected: 0 erros de linting.
- `npx vitest run` -- expected: suíte completa de testes passa sem regressões.

## Auto Run Result

### Summary of implemented change
- `src/constants/privacyFlagTexts.ts`:
  - Atualizada a frase `sends` da flag `sync` para: `"seus registros a seis relays Nostr públicos, com criptografia ponta a ponta (AES-256-GCM); o identificador do aparelho, o horário, o tamanho de cada lote e a chave pública do grupo vão sem cifra, os relays veem o endereço IP e os registros continuam lá depois que você sai do grupo."`
- `docs/politica-de-privacidade.md`:
  - Atualizada a data de última atualização para "9 de novembro de 2026".
  - Atualizada a Seção 2 (Sincronização entre aparelhos) descrevendo a criptografia de ponta a ponta autenticada (AES-256-GCM), a derivação de chaves a partir do Segredo de grupo de 256 bits, a descontinuação definitiva do canal de 6 caracteres e o apontamento formal para `docs/risco-residual-xor.md`.
  - Atualizada a frase canônica da flag `sync`.
- `app/privacy-policy.tsx`:
  - Atualizada a constante `LAST_UPDATED = "9 de novembro de 2026"`.
  - Atualizada a Seção 2 na UI in-app para manter paridade absoluta com o markdown público e a cópia da loja.
  - Atualizado o item `FlagItem` da flag `sync`.
- `PLAY_STORE_LISTING.md`:
  - Atualizada a descrição da sincronização na "Descrição completa": *"Sincronize seus aparelhos por relays Nostr públicos, com criptografia ponta a ponta (AES-256-GCM). Sem servidor do DOMUS. Os registros publicados continuam nos relays mesmo depois de sair do grupo."*
  - Adicionada a tag `criptografia ponta a ponta` em "Tags de busca".
  - Atualizada a cópia incorporada da política de privacidade (data de 9 de novembro de 2026, texto da Seção 2 e frase da flag `sync`).
- `docs/data-safety.md`:
  - Atualizada a resposta geral de "Os dados ficam cifrados de ponta a ponta?" de "Não declarar" para "**Sim**" fundamentada na cifra AES-256-GCM (`strongGroupCrypto.ts`) e no corte definitivo da Story 4.9.
  - Atualizada a descrição do fluxo F1 (Sincronização).
  - Atualizada a data para "9 de novembro de 2026".
- `app/sync.tsx`:
  - Atualizados os dois cards informativos (`infoText`) para citar a proteção de criptografia ponta a ponta (AES-256-GCM).
- `docs/checklist-nfr-6-ponta-a-ponta.md`:
  - Criado documento formal de auditoria técnica NFR-6 mapeando afirmações públicas às evidências no código, aos testes automatizados, às mitigações de risco residual e às afirmações negativas (prevenção de falsas alegações).
- `src/modules/strongGroup/__tests__/nfr6Verification.test.ts`:
  - Criada suíte de testes com 11 testes automatizados cobrindo declarações públicas, paridade textual, existência de documentação de risco e checklist, invariantes criptográficas AEAD (rejeição de adulteração), corte do canal legado e conformidade com regras de higiene de código (sem alertas nativos).

### Verification performed
- `npx vitest run src/constants/__tests__/privacyFlagTexts.test.ts src/modules/strongGroup/__tests__/nfr6Verification.test.ts`: 94 testes passando em 2 suítes com 0 falhas.
- `rm -f expo-env.d.ts && npx tsc --noEmit`: 0 erros de tipagem TypeScript strict.
- `npx eslint src/constants/ app/privacy-policy.tsx app/sync.tsx src/modules/strongGroup/`: 0 erros e 0 avisos de linting.
- `npx vitest run`: 2630 testes passando em 114 suítes com 0 falhas.
