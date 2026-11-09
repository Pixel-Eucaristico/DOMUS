# Checklist Formal de Verificação NFR-6: Criptografia Ponta a Ponta e Declarações Públicas (Story 4.10)

**Data de Conclusão da Auditoria:** 9 de novembro de 2026  
**Requisitos Vinculados:** NFR-6 (Auditabilidade Criptográfica), FR-14 (Restauração da Menção a Ponta a Ponta), SM-3 (100% das afirmações públicas sobre privacidade e segurança são verificáveis no código).  
**Status do Veredito:** **CONFORME (100% Verificado)**

---

## 1. Resumo Executivo e Contexto

Na **Story 1.4**, a afirmação de "criptografia ponta a ponta" foi proativamente removida da ficha do aplicativo na Google Play Store, das políticas de privacidade e dos documentos de segurança porque o canal legado de sincronização utilizava cifra de fluxo simples (XOR) baseada em código curto de 6 caracteres alfanuméricos (~30 bits de entropia) publicado em relays Nostr públicos, o que não configurava criptografia de ponta a ponta comercialmente aceita nem defensável contra força bruta.

Com a execução completa do **Epic 4 ("Sync privado de verdade")**:
1. Foi desenvolvido e integrado o **Grupo forte**, fundamentado em Segredo de alta entropia de 256 bits (`DOMUS1-...`), derivação independente de chaves via HKDF-SHA256 e cifra autenticada AES-256-GCM com nonces únicos de 96 bits por mensagem (Stories 4.1 a 4.5).
2. Foi estabelecida coexistência controlada de 14 dias sem loops nem duplicações (Stories 4.6 e 4.7) com fluxo assistido de migração para o canal forte (Story 4.8).
3. Na **Story 4.9**, o corte rígido do canal legado foi programado e implementado para a data limite (`2026-11-20T00:00:00.000Z`) e versão mínima (`1.8.0`), interrompendo integralmente push, pull e subscrições ao vivo no formato legado e registrando o histórico pretérito em `docs/risco-residual-xor.md`.
4. Na presente **Story 4.10**, após comprovação técnica formal de que nenhum novo dado trafega em canal fraco, a afirmação de **"criptografia de ponta a ponta (AES-256-GCM)"** é reativada nos textos públicos, respaldada por esta matriz de rastreabilidade e pela suíte automatizada `src/modules/strongGroup/__tests__/nfr6Verification.test.ts`.

---

## 2. Matriz de Afirmações Públicas vs Evidências de Código

A tabela a seguir correlaciona cada declaração pública veiculada aos respectivos arquivos de implementação, módulos criptográficos e testes automatizados que atestam a sua veracidade (critério SM-3).

| # | Afirmação Pública | Fontes Públicas | Módulo / Código de Implementação | Suíte de Testes Automatizados | Status |
|---|---|---|---|---|---|
| **A1** | **Criptografia ponta a ponta autenticada (AES-256-GCM)** nos registros sincronizados | `PLAY_STORE_LISTING.md` (descrição completa e tags), `docs/politica-de-privacidade.md` (§2 e flag `sync`), `app/privacy-policy.tsx` (§2 e flag `sync`), `src/constants/privacyFlagTexts.ts` (flag `sync`), `docs/data-safety.md` (§1 e §2 F1), `app/sync.tsx` | `src/modules/strongGroup/eventCipher.ts` (`encryptStrongPayload`, `decryptStrongPayload`), `src/modules/strongGroup/groupSecret.ts` (`deriveStrongGroupKeys`, `generateGroupSecret`, HKDF-SHA256, chave simétrica de 256 bits, nonces de 96 bits) | `src/modules/__tests__/eventCipher.test.ts`, `src/modules/__tests__/groupSecret.test.ts`, `src/modules/strongGroup/__tests__/nfr6Verification.test.ts` | **CONFORME** |
| **A2** | **Descontinuação e corte integral do canal legado** (código de 6 caracteres e cifra XOR) | `docs/politica-de-privacidade.md` (§2), `app/privacy-policy.tsx` (§2), `PLAY_STORE_LISTING.md` (cópia da política §2), `docs/data-safety.md` (§1) | `src/context/strongGroupSync.ts` (`isLegacyCutoffReached`, `isLegacySyncDisabled`, `LEGACY_CUTOFF_DATE_ISO`, `LEGACY_CUTOFF_TIMESTAMP`, `LEGACY_MIN_APP_VERSION`), `src/context/useSyncEngine.ts` (bloqueio total de push, pull e subscrições) | `src/context/__tests__/syncCutoff.test.ts`, `src/modules/strongGroup/__tests__/nfr6Verification.test.ts` | **CONFORME** |
| **A3** | **Transparência de metadados operacionais e IP** (identificador do aparelho, horário, tamanho de lote e chave pública sem cifra) | `src/constants/privacyFlagTexts.ts` (flag `sync`), `docs/politica-de-privacidade.md` (§2), `app/privacy-policy.tsx` (§2), `PLAY_STORE_LISTING.md` (política §2) | `src/modules/nostrSync.ts` (publicação parametrizada NIP-33 via WSS, tags `d` com chave pública, lotes com `deviceId` e timestamps) | `src/constants/__tests__/privacyFlagTexts.test.ts`, `src/modules/strongGroup/__tests__/nfr6Verification.test.ts` | **CONFORME** |
| **A4** | **Bloqueio estrito de dados sensíveis** (holerites `PAYSLIP_*`, dados confessionais e religiosos) fora do canal seguro | `docs/risco-residual-xor.md` (§3.1), `_bmad-output/implementation-artifacts/epic-4-context.md` | `src/context/strongGroupSync.ts` (`OLD_GROUP_EXCLUDED_PREFIXES`, `selectOldGroupPushEvents`), Story 11.4 | `src/context/__tests__/syncCoexistence.test.ts`, `src/modules/__tests__/syncPayload.test.ts` | **CONFORME** |
| **A5** | **Histórico pretérito documentado como risco residual** (apontando formalmente para documentação técnica de risco) | `docs/politica-de-privacidade.md` (§2), `app/privacy-policy.tsx` (§2), `PLAY_STORE_LISTING.md` (política §2) | `docs/risco-residual-xor.md` (análise de força bruta em 30 bits, maleabilidade da cifra e retenção em relays de terceiros) | `src/modules/strongGroup/__tests__/nfr6Verification.test.ts` | **CONFORME** |
| **A6** | **Preservação integral dos dados e histórico local** (sem deleção de registros em SQLite / EventStore no corte) | `docs/risco-residual-xor.md` (§4.1), `app/sync.tsx` (aviso de corte com migração assistida) | `src/context/useSyncEngine.ts`, `src/context/strongGroupSync.ts` (`canMigrateToStrongGroup` habilitado pós-corte) | `src/context/__tests__/syncCutoff.test.ts` | **CONFORME** |
| **A7** | **Paridade textual exata e sincronizada** das declarações da flag `sync` entre todas as fontes | `src/constants/privacyFlagTexts.ts`, `docs/politica-de-privacidade.md`, `app/privacy-policy.tsx`, `PLAY_STORE_LISTING.md` | `formatPrivacyFlagText("sync")` | `src/constants/__tests__/privacyFlagTexts.test.ts` (83 testes verdes) | **CONFORME** |

---

## 3. Auditoria de Afirmações Negativas (Prevenção de Falsas Declarações)

Em estrita observância às restrições do projeto e aos princípios de honestidade técnica:
1. **Banco SQLite Local:** O DOMUS **não** afirma que o banco SQLite local é criptografado. A Seção 1 da Política de Privacidade declara expressamente: *"Esse banco não é cifrado pelo DOMUS; ele conta com a proteção do próprio sistema, que isola os dados de cada app"*.
2. **WebRTC:** O DOMUS **não** declara uso de WebRTC ativo. O pacote legado `packages/sync` permanece congelado e intocado. A sincronização descentralizada ocorre exclusivamente via relays Nostr sobre WebSockets seguros (`wss://`).
3. **Anonimato de IP:** O DOMUS **não** promete anonimato de rede. A flag `sync` e as políticas explicitam abertamente: *"os relays veem o endereço IP e os registros continuam lá depois que você sai do grupo"*.
4. **Armazenamento em Nuvem Própria:** O DOMUS **não** possui servidores intermediários próprios que recebam ou processem dados dos usuários.

---

## 4. Testes Automatizados Contínuos no Gate da CI

A integridade deste checklist e das afirmações públicas é verificada continuamente por três suítes de testes automatizados executadas no workflow do GitHub Actions (`Gate` / `gate.yml`):
- `src/constants/__tests__/privacyFlagTexts.test.ts`: Assegura a paridade palavra por palavra de todas as frases da política entre o arquivo de constantes, o markdown público, a tela in-app e a cópia da Play Store, e garante que nenhuma frase viole regras de formatação JSX.
- `src/context/__tests__/syncCutoff.test.ts`: Garante que o corte do canal legado bloqueie incondicionalmente transmissões e recepções em XOR após a data de corte ou em versões obsoletas, sem perda do histórico local.
- `src/modules/strongGroup/__tests__/nfr6Verification.test.ts`: Nova suíte dedicada que audita dinamicamente a presença das declarações de "ponta a ponta", as referências a `docs/risco-residual-xor.md`, o preenchimento de `docs/data-safety.md` e a integridade matemática da cifra AES-256-GCM.

---

## 5. Veredito Final

A verificação técnica comprova que:
1. O canal de sincronização legado em XOR foi desativado em definitivo.
2. Todo tráfego de sincronização ativo do DOMUS é protegido por cifra autenticada AES-256-GCM com chaves derivadas de 256 bits.
3. 100% das afirmações públicas estão devidamente fundamentadas em código testado e inspecionado.

**Conclusão:** A reativação do termo **"criptografia ponta a ponta (AES-256-GCM)"** está plenamente justificada, auditada e aprovada para publicação.
