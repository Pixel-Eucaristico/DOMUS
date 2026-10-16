---
title: 'Story 1.4: Corrigir a descrição da loja e a política de privacidade'
type: 'chore'
created: '2026-10-16'
status: 'done'
baseline_commit: 'dc9cc08eaf7b90548b9b1433bf988ef1caa7dcff'
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
| Texto publicado diferente | Loja publicada ≠ `PLAY_STORE_LISTING.md` | Vale a suposição do PRD (decisão 1); o dono copia o texto novo ao Console na Story 1.6 | N/A |

**Decisões do dono (16/10/2026):**
1. Assumir que `PLAY_STORE_LISTING.md` é o texto publicado (suposição do PRD); o dono copia o texto corrigido para o Play Console na Story 1.6.
2. `docs/politica-de-privacidade.md` passa a ser a fonte única da política pública; o app e o rascunho do `PLAY_STORE_LISTING.md` dizem o mesmo, e o dono publica o arquivo em `https://pixel-eucaristico.com.br/domus/privacy`.
3. Spec mantida inteira (~1.900 tokens): um objetivo só; o excesso é o mapa de evidências.

</frozen-after-approval>

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
- [x] `docs/politica-de-privacidade.md` -- criar a política pública como fonte única, com as mesmas seções do app -- decisão 2
- [x] `app/privacy-policy.tsx` -- reescrever intro e seções (Dados no aparelho, Sincronização, IA, Câmera e fotos, Backup e Google Drive, Estatísticas e anúncios, Outros serviços, Seus direitos e exclusão) com as evidências -- FR-5
- [x] `PLAY_STORE_LISTING.md` -- corrigir descrição (remover "SQLite criptografado", "ponta-a-ponta", "nenhum dado vai para servidores de terceiros"; sync "cifrado com a chave do grupo"), tags e rascunho da política igual ao app -- FR-5
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- registrar defeitos de código achados (salt do PIN com `Math.random`, anúncios personalizados sem consentimento, código do grupo enviado à IA, auto-backup ignora o interruptor, exportação sem cifra) -- fora do escopo de texto

**Acceptance Criteria:**
- Given os dois textos, when procuro "SQLite criptografado", "ponta-a-ponta", "WebRTC" e "nenhum dado vai para servidores", then não há ocorrência
- Given a política, when a leio, then ela descreve o sync por relays Nostr, diz que eventos publicados continuam nos relays depois de excluir o app ou resetar, e lista IA, fotos, Drive, Firebase, AdMob e os serviços de consulta, cada um com sua condição
- Given `docs/politica-de-privacidade.md`, a tela do app e o rascunho do `PLAY_STORE_LISTING.md`, when os comparo, then dizem o mesmo
- Given o app compilado, when abro a política, then a tela renderiza sem erro de tipo ou lint

## Implementation Notes

- `docs/politica-de-privacidade.md` é a fonte; o rascunho no `PLAY_STORE_LISTING.md` é cópia literal (sem o bloco de nota) e a tela do app tem o mesmo texto (conferido por diff de palavras).
- Seção "Biometria e PIN" do app antigo entrou em "Dados no aparelho"; "Rede e Segurança" saiu (a frase "bloqueia HTTP" não foi verificada e o WebRTC era falso). Contato virou a seção 9.
- O tamanho do código do grupo não é citado (a epic fala em 6 caracteres, mas `app/sync.tsx` aceita até 8).
- Afirmações extras verificadas: SEFAZ pela chave de acesso (WebView), nome do item à IA para classificar (`classifyItem.ts`), tabela NCM baixada do Siscomex, pasta oculta `appDataFolder` no Drive, reset em Sobre › "Resetar aplicativo", Firebase em Sobre › "Analytics & Performance".
- Tags da loja mantidas: "backup criptografado" confere com o código. Linha CAMERA da tabela de permissões passou a citar fotos de notas e holerites; o resto da tabela fica para a Story 1.5.
- Defeitos adiados: D8 a D12 em `deferred-work.md`.
- Verificação do orquestrador: "holerites" saiu da lista de registros guardados nos três textos; o holerite ainda não é registro local (Story 11.4), só é lido pelo chat da IA.
- Auditoria da matriz: as três linhas são de texto, sem teste automatizado possível; cobertas pelo `git grep` da Verificação e pela leitura comparada dos três textos.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| E1/E6 §3 "sempre enviado" omite categorias, volatilidade e perfil e inclui "sua mensagem" no resumo | high | `ConsultantChatUseCase.ts:113-124`: `buildSummaryRequest` (3 categorias com valor e %, volatilidade) e `buildConsultationRequest` (risco, impulso, tendência, preço) saem sem permissão; o resumo não leva a mensagem. **patch** |
| E2 voz só pela ElevenLabs | medium | `app/ai-chat.tsx:355-440`: `audioProvider` padrão `openai`, também Gemini e Qwen para fala e transcrição. **patch** |
| B6 §1 "segredos no armazenamento seguro" | medium | chave do Cloud Vision (`ocrConfigService.ts`) e chave do backup automático (`useAutoBackup.ts:31-46`) em `AsyncStorage` puro. **patch** (o defeito de código já está em D11 e no FR-23) |
| B4/E4 introdução da loja: só IA, sync e Drive enviam dados | medium | SEFAZ, EAN (Open Food Facts/Cosmos), Siscomex, páginas de produto e favicons saem sem opt-in (§4 e §7 da política). **patch** |
| B5 código do grupo à IA sem dizer a consequência | medium | o código é a única chave do sync (`nostrSync.ts:230-251`); quem o tem lê os relays. **patch** |
| B3 fotos da galeria não citadas | low | `NSPhotoLibraryUsageDescription` e `launchImageLibraryAsync` seguem o mesmo caminho do Vision e do Cloud Vision. Correção direta. **patch** |
| B9 rótulo "política completa online" | low | a tela passou a ter a política inteira; troca de texto direta. **patch** |
| B2/E5 tabela de permissões e linha INTERNET incompletas | medium | pré-existente e escopo da Story 1.5 (Data safety). **defer** |
| B7 conteúdo exigido pela LGPD (controlador, encarregado, base legal, transferência internacional, retenção, menores, mudanças) | medium | ausente também na política anterior; a intenção desta story é veracidade, não completude legal. **defer** |
| B1 `NSMicrophoneUsageDescription` "não usa o microfone" | low | iOS não é publicado (PRD §5, não-objetivo); usuário não encontra. rejeitado |
| B8 sem checagem automática de igualdade dos três textos | low | correção exige script novo; sem dano demonstrado nesta entrega. rejeitado |
| B10 spec `in-review` × sprint `in-progress` | false | a etapa 5 do `bmad-build` sincroniza o sprint para `review` ao concluir. |
| B11 Firebase na web | false | `AnalyticsService.ts:16,65` retorna em `Platform.OS === "web"`; nada é inicializado na web. |
| B12 AdMob sem consentimento | low | a política já diz que os anúncios podem ser personalizados; o defeito de código está em D9. rejeitado |
| E3 `git grep` ignora arquivo não rastreado | low | correção seria editar esta spec (regra de triagem); a verificação final usa `grep` comum. rejeitado |
| V (verification-gap) | — | nenhuma lacuna de verificação. |

**Rota:** 7 `patch` (corrigidos pelo implementador), 2 `defer` (D13, D14), 6 rejeitados. Sem `intent_gap` nem `bad_spec`; sem loopback (`review_loop_iteration` = 0).

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: 0 erros
- `npx expo lint` -- expected: sem erro novo
- `git grep -n -iE "SQLite criptografado|ponta-a-ponta|WebRTC" -- app/privacy-policy.tsx PLAY_STORE_LISTING.md docs/politica-de-privacidade.md` -- expected: vazio
