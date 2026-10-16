---
title: 'Story 1.4: Corrigir a descrição da loja e a política de privacidade'
type: 'chore'
created: '2026-10-16'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/docs/decisoes-do-dono.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A descrição da loja (`PLAY_STORE_LISTING.md`) e a política dentro do app (`app/privacy-policy.tsx`) afirmam o que o código não faz: "SQLite criptografado", sync "ponta-a-ponta" e "via WebRTC", IA que recebe "só métricas agregadas", imagens que "não são transmitidas", "nenhum dado vai para servidores de terceiros", e omitem Firebase, AdMob, Drive automático e relays (FR-5, NFR-6).

**Approach:** Reescrever os dois textos para descrever só o comportamento atual verificado no código, com o mesmo conteúdo nos dois lugares, sem mudar comportamento do app. Defeitos de código achados na verificação viram adiados.

## Boundaries & Constraints

**Always:** cada afirmação tem evidência no código (Code Map); pt-BR com acentos completos (NFR-7); a política do app e o rascunho de política do `PLAY_STORE_LISTING.md` dizem o mesmo; "ponta-a-ponta" não aparece enquanto o Grupo antigo existir (FR-14); seguir `docs/decisoes-do-dono.md` (commits direto na `dev`).

**Never:** mudar comportamento, dependências ou fluxos de dados; tocar `packages/sync`, `replit.*`, `ios/`, `android/`; prometer o que só épicos futuros entregam (Grupo forte, cifra do log da web); editar o Play Console ou o site (é do dono).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Afirmação falsa | Frase sem evidência no código | Removida ou reescrita | N/A |
| Fluxo omitido | Dado sai do aparelho e o texto não diz | Fluxo descrito, com a condição (opt-in, configuração) | N/A |
| Texto publicado diferente | Loja publicada ≠ `PLAY_STORE_LISTING.md` | Ver Open Questions | Registrar diferença |

</frozen-after-approval>

## Open Questions

1. **Texto publicado na loja.** O AC pede comparar com o que está no Play Console, e esta sessão não tem acesso a ele. — (a) o dono cola aqui a descrição publicada atual e eu comparo antes de fechar; (b) assumir a suposição do PRD (`PLAY_STORE_LISTING.md` = publicado) e o dono só copia o texto novo ao Console na Story 1.6.
2. **Política pública (URL).** O app aponta para `https://pixel-eucaristico.com.br/domus/privacy`, que não está no repositório. — (a) criar `docs/politica-de-privacidade.md` como fonte única e o dono publica no site; (b) servir a página pelo `server/` deste repositório (rota nova, fora do escopo de texto e com deploy); (c) só corrigir o app e o rascunho do `PLAY_STORE_LISTING.md`, e o dono atualiza o site à mão.

## Code Map

- `app/privacy-policy.tsx` -- textos das seções e `LAST_UPDATED` ("Março de 2026" → "Outubro de 2026"); só JSX de texto muda
- `PLAY_STORE_LISTING.md:31,57-58,60-61,74,92,104-160` -- descrição completa, tags e rascunho da política
- Evidências (só leitura):
  - SQLite sem cifra: `packages/storage/src/sqliteAdapter.ts:16`; web em texto puro: `src/hooks/useEventStore.ts:79-80`
  - Sync Nostr, 6 relays, XOR com chave do código do grupo: `src/modules/nostrSync.ts:8-15,230-280`; `deviceId` em claro nas tags: `:415,422-424`; WebRTC não ligado (`packages/sync`)
  - Reset só apaga o local; relays mantêm o publicado: `src/hooks/useEventStore.ts:210-220`
  - IA: resumo sempre (saldo, receitas, despesas, poupança, 6 últimas mensagens) e, por permissão (padrão desligado), até 50 transações, contas, emissores de NF, lista de desejos e o código do grupo: `src/modules/ai/application/ConsultantChatUseCase.ts:127-146`, `AIContextBuilder.ts:44-119`; provedores OpenAI, Gemini, Claude, DeepSeek, Qwen, OpenRouter, ElevenLabs (voz): `packages/ai/src/adapters/*`
  - Fotos: Vision envia a foto ao provedor de IA (`packages/ai/src/vision/VisionOCRService.ts:40-86`); Cloud Vision recebe a foto quando há chave e a leitura local tem confiança < 0,6 (`packages/parsers/src/hybridOcrAdapter.ts:66-75,200-215`); nenhuma foto é salva de forma permanente
  - Drive: backup diário automático quando conectado, cifrado AES-256-GCM/PBKDF2 100 mil com chave gerada no aparelho; e-mail guardado no armazenamento seguro: `src/hooks/useAutoBackup.ts:31-110`, `useGoogleDriveBackup.ts:53-87`
  - Backup manual AES-256-GCM/PBKDF2 100 mil com senha do usuário; existe exportação sem cifra: `BackupCryptoService.ts:36-58`, `useBackupRestore.ts:99`
  - Firebase Analytics/Crashlytics/Performance desligados por padrão, opt-in: `firebase.json`, `AnalyticsSettings.ts:15-19`
  - AdMob só nos modos de apoio com anúncio (padrão sem anúncio), anúncios personalizados: `MonetizationSettingsStore.ts:8`, `AppOpenAdHost.tsx:26`
  - Outras saídas: cotação USD/BRL, SEFAZ, Open Food Facts/Cosmos/Siscomex (EAN e NCM dos itens), páginas da lista de desejos (preço), favicons do Google: ver `TokenPricingService.ts:61-92`, `eanLookup.ts:16,48`, `usePriceRefresh.ts:134`

## Tasks & Acceptance

**Execution:**
- [ ] `app/privacy-policy.tsx` -- reescrever intro e seções (Dados no aparelho, Sincronização, IA, Câmera e fotos, Backup e Google Drive, Estatísticas e anúncios, Outros serviços, Seus direitos e exclusão) com as evidências -- FR-5
- [ ] `PLAY_STORE_LISTING.md` -- corrigir descrição (remover "SQLite criptografado", "ponta-a-ponta", "nenhum dado vai para servidores de terceiros"; sync "cifrado com a chave do grupo"), tags e rascunho da política igual ao app -- FR-5
- [ ] `_bmad-output/implementation-artifacts/deferred-work.md` -- registrar defeitos de código achados (salt do PIN com `Math.random`, anúncios personalizados sem consentimento, código do grupo enviado à IA, auto-backup ignora o interruptor, exportação sem cifra) -- fora do escopo de texto

**Acceptance Criteria:**
- Given os dois textos, when procuro "SQLite criptografado", "ponta-a-ponta", "WebRTC" e "nenhum dado vai para servidores", then não há ocorrência
- Given a política, when a leio, then ela descreve o sync por relays Nostr, diz que eventos publicados continuam nos relays depois de excluir o app ou resetar, e lista IA, fotos, Drive, Firebase, AdMob e os serviços de consulta, cada um com sua condição
- Given o app compilado, when abro a política, then a tela renderiza sem erro de tipo ou lint

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: 0 erros
- `npx expo lint` -- expected: sem erro novo
- `git grep -n -iE "SQLite criptografado|ponta-a-ponta|WebRTC" -- app/privacy-policy.tsx PLAY_STORE_LISTING.md` -- expected: vazio
