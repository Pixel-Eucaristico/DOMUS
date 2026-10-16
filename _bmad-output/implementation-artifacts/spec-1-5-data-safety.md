---
title: 'Story 1.5: Alinhar o formulário Data safety ao comportamento'
type: 'chore'
created: '2026-10-16'
status: 'in-review'
baseline_commit: 'c6208c854d4ab0b4115680acc13b2b9fe602f140'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/docs/politica-de-privacidade.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O Play Console exige o formulário *Data safety* igual ao comportamento do app (FR-5). Não existe um levantamento: o `PLAY_STORE_LISTING.md` só tem uma tabela de permissões incompleta (sem `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `POST_NOTIFICATIONS`; a linha INTERNET ainda diz "Sincronização P2P"), o adiado D13.

**Approach:** Criar `docs/data-safety.md` como folha de respostas do formulário: cada fluxo que sai do aparelho, com tipo de dado no vocabulário do Play, destino, se é opcional e como o usuário ativa, se vai cifrado em trânsito e o que acontece na exclusão, coerente com `docs/politica-de-privacidade.md`. Corrigir a tabela de permissões do `PLAY_STORE_LISTING.md` (D13) e apontar para o novo arquivo. Preencher o Play Console é do dono (Story 1.6).

## Boundaries & Constraints

**Always:** cada linha tem evidência no código ou na política; o comportamento descrito é o da `dev` atual (com as Stories 12.1 a 12.3 já entregues); pt-BR com acentos; os termos de tipo de dado seguem as categorias do Play (ex.: "Informações financeiras", "Fotos", "Gravações de voz ou som", "IDs do dispositivo ou outros IDs", "Registros de falhas", "Diagnóstico", "Endereço de e-mail").

**Never:** mudar código ou comportamento; mudar a política (se algo divergir, registrar como achado); declarar dado que o app não envia; preencher o Play Console.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fluxo opt-in | IA, voz, Cloud Vision, sync, Drive, Firebase, anúncios | Linha com "Opcional: sim" e onde ativar | N/A |
| Fluxo sem flag | consultas de código de barras, NCM, preços, ícones, SEFAZ | Linha com "Opcional: não" e nota de que a flag vem na Story 12.6 | N/A |
| Divergência com a política | Fluxo na lista e ausente na política (ou o contrário) | Registrado em Implementation Notes; política não muda nesta story | N/A |

**Decisão do dono (16/10/2026):** à pergunta do Play sobre pedido de exclusão de dados, responder **"Não"**: o desenvolvedor não guarda dados em servidor e não consegue apagar os de terceiros; a política explica o reset local e o que não é apagado.

</frozen-after-approval>

## Code Map

- `docs/politica-de-privacidade.md` -- fonte dos fluxos (§2 sync, §3 IA e voz, §4 fotos e SEFAZ, §5 backup e Drive, §6 Firebase e AdMob, §7 consultas); a lista tem de bater com ela
- `app.json` -- `android.permissions`: CAMERA, READ/WRITE_EXTERNAL_STORAGE, USE_BIOMETRIC, USE_FINGERPRINT, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, POST_NOTIFICATIONS; `blockedPermissions`: RECEIVE_BOOT_COMPLETED; plugin do AdMob (ID de publicidade)
- `PLAY_STORE_LISTING.md` -- seção "Permissões justificadas (Data Safety)": tabela a corrigir (D13) e apontar para `docs/data-safety.md`
- Evidências de cada fluxo: ver o Code Map de `spec-1-4-corrigir-loja-e-politica-de-privacidade.md`; mudanças depois dela: o código do grupo não vai mais à IA (12.1), PIN em PBKDF2 (12.3)
- Cifra em trânsito: HTTPS para todos os provedores e `wss://` para os relays (`src/modules/nostrSync.ts:8-15`); os eventos do sync também vão cifrados com a chave do grupo (fraca, declarar)
- Identificadores: `deviceId` do app vai em claro nos relays (`nostrSync.ts:415,422-424`); AdMob usa o ID de publicidade quando há modo de apoio com anúncio

## Tasks & Acceptance

**Execution:**
- [x] `docs/data-safety.md` -- criar: (1) resumo das respostas gerais do formulário (coleta, compartilhamento, cifra em trânsito, exclusão); (2) tabela por fluxo: destino, tipos de dado do Play, finalidade, opcional e como ativar, coletado/compartilhado; (3) tabela de permissões do Android com justificativa -- FR-5
- [x] `PLAY_STORE_LISTING.md` -- substituir a tabela de permissões pela versão completa (D13), igual à de `docs/data-safety.md`, e apontar para o arquivo -- D13
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- marcar o D13 como resolvido por esta story -- rastreio

**Acceptance Criteria:**
- Given `docs/data-safety.md`, when o leio, then há uma linha para relays Nostr, Google Drive, provedores de IA (texto e voz), OCR de terceiros (Cloud Vision), Firebase (Analytics, Crashlytics, Performance), AdMob e as consultas sem flag, cada uma com o dado enviado e o consentimento
- Given o fluxo de IA e OCR, when o leio, then ele cita que fotos de nota fiscal e holerite vão ao provedor escolhido
- Given a lista e `docs/politica-de-privacidade.md`, when os comparo, then nenhum fluxo está em um e falta no outro
- Given a tabela de permissões, when a comparo com `app.json`, then todas as permissões declaradas aparecem com justificativa e nenhuma sobra

## Implementation Notes

- Verificação do orquestrador: permissões do APK de release da CI (run #71) lidas com `pyaxmlparser`; acrescentada a seção "Permissões no APK final" e o achado A6 (`expo-location` sem uso traz localização). Sem `usesCleartextTraffic`: HTTP bloqueado por padrão no target 36.

- `docs/data-safety.md` tem: respostas gerais (coleta sim, cifra em trânsito sim, exclusão "Não" pela decisão do dono, anúncios e ID de publicidade sim, sem isenção de ponta a ponta), 16 fluxos (F1 a F16) com tipo de dado do Play, finalidade, opcional/ativação, coletado/compartilhado e evidência, resumo por tipo de dado e a tabela de permissões.
- Cruzamento com a política: §2→F1; §3→F3, F4; §4→F5, F6, F11; §5→F2 (backup manual citado como não-fluxo); §6→F7 a F10; §7→F12 a F16. §1 e §8/§9 não têm fluxo.
- Compartilhamento: marcado "sim" de forma conservadora para relays (públicos, cifra fraca) e AdMob (anúncios personalizados); IA, Drive, Cloud Vision e SEFAZ usam a isenção de ação iniciada pelo usuário; Firebase a de prestador de serviço. Decisão final do dono na 1.6.
- Permissões: as 8 de `android.permissions` com justificativa, iguais nos dois arquivos (conferido por `diff`); INTERNET saiu da tabela (não está no `app.json`) e foi para uma nota sobre permissões das bibliotecas (INTERNET, ACCESS_NETWORK_STATE, WAKE_LOCK, AD_ID), a conferir no manifesto mesclado do AAB.
- Divergências registradas na seção 5 de `docs/data-safety.md`, sem mudar a política: busca de produto na Amazon/Mercado Livre com código de afiliado ausente da §7; EAN e páginas de desejo tratados como "sem dado pessoal" (opção de declarar "Histórico de compras"); cifra em trânsito depende do bloqueio de HTTP do Android; §6 não cita o ID da instalação do Firebase nem o IP; anúncios personalizados sem consentimento (D9/12.4).
- Tipos de dado do Firebase e do AdMob seguem o que o código chama (`logEvent`, `logScreenView`, `recordError`, anúncios) e as categorias usuais desses SDKs; não verificados no tráfego real.

## Spec Change Log

## Review Triage Log

## Verification

**Manual checks (if no CLI):**
- Comparar cada `android.permission.*` de `app.json` com a tabela de permissões dos dois arquivos
- Comparar cada seção de `docs/politica-de-privacidade.md` com as linhas de fluxo de `docs/data-safety.md`
